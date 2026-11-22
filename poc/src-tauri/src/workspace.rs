use serde::Serialize;
#[cfg(unix)]
use std::fs;
#[cfg(unix)]
use std::io::{self, Read};
#[cfg(unix)]
use std::path::{Path, PathBuf};
#[cfg(unix)]
use tauri_plugin_dialog::DialogExt;

const MAX_FILES: usize = 256;
const MAX_DEPTH: usize = 12;
const MAX_DIRECTORY_ENTRIES: usize = 20_000;
const MAX_FILE_BYTES: u64 = 1024 * 1024;
const MAX_TOTAL_BYTES: u64 = 16 * 1024 * 1024;
const IGNORED_DIRECTORIES: &[&str] = &[".git", ".nextflow", "node_modules", "target", "work"];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceDocument {
    relative_path: String,
    absolute_path: String,
    content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSnapshot {
    name: String,
    root_path: String,
    documents: Vec<WorkspaceDocument>,
}

#[tauri::command]
pub fn workspace_open(app: tauri::AppHandle) -> Result<Option<WorkspaceSnapshot>, String> {
    #[cfg(unix)]
    {
        let Some(selection) = app.dialog().file().blocking_pick_folder() else {
            return Ok(None);
        };
        let selected_path = selection
            .into_path()
            .map_err(|error| format!("Could not resolve selected workspace folder: {error}"))?;

        read_workspace(&selected_path).map(Some)
    }
    #[cfg(not(unix))]
    {
        let _ = app;
        Err("Workspace opening is not available on this platform yet".to_owned())
    }
}

#[cfg(unix)]
fn read_workspace(selected_path: &Path) -> Result<WorkspaceSnapshot, String> {
    let root = selected_path
        .canonicalize()
        .map_err(|error| format!("Could not open selected workspace: {error}"))?;
    let metadata = fs::symlink_metadata(&root)
        .map_err(|error| format!("Could not inspect selected workspace: {error}"))?;
    if !metadata.is_dir() {
        return Err("The selected workspace is not a directory".to_owned());
    }
    let root_directory = open_workspace_root(&root)
        .map_err(|error| format!("Could not securely open selected workspace: {error}"))?;

    let mut paths = Vec::new();
    let mut entry_count = 0;
    collect_nextflow_files(&root, &root, 0, &mut entry_count, &mut paths)?;
    paths.sort();

    let mut total_bytes = 0_u64;
    let mut documents = Vec::with_capacity(paths.len());
    for relative_path in paths {
        let path = root.join(&relative_path);
        let file = open_workspace_file(&root, &root_directory, &relative_path)
            .map_err(|error| format!("Could not securely read {}: {error}", path.display()))?;
        let metadata = file
            .metadata()
            .map_err(|error| format!("Could not inspect {}: {error}", path.display()))?;
        if !metadata.is_file() {
            continue;
        }
        if metadata.len() > MAX_FILE_BYTES {
            return Err(format!(
                "{} exceeds the {} KiB workspace-file limit",
                path.display(),
                MAX_FILE_BYTES / 1024
            ));
        }
        let mut content = String::new();
        let mut bounded_file = file.take(MAX_FILE_BYTES + 1);
        bounded_file
            .read_to_string(&mut content)
            .map_err(|error| format!("Could not read {} as UTF-8: {error}", path.display()))?;
        if content.len() as u64 > MAX_FILE_BYTES {
            return Err(format!(
                "{} exceeds the {} KiB workspace-file limit",
                path.display(),
                MAX_FILE_BYTES / 1024
            ));
        }
        total_bytes = total_bytes.saturating_add(content.len() as u64);
        if total_bytes > MAX_TOTAL_BYTES {
            return Err("The selected workspace exceeds the 16 MiB source limit".to_owned());
        }
        let relative_path = relative_path
            .to_str()
            .ok_or_else(|| format!("{} is not a UTF-8 path", path.display()))?
            .replace('\\', "/");
        let absolute_path = path
            .to_str()
            .ok_or_else(|| format!("{} is not a UTF-8 path", path.display()))?
            .to_owned();
        documents.push(WorkspaceDocument {
            relative_path,
            absolute_path,
            content,
        });
    }

    if documents.is_empty() {
        return Err("No Nextflow .nf files were found in the selected workspace".to_owned());
    }

    let name = root
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Nextflow workspace")
        .to_owned();
    let root_path = root
        .to_str()
        .ok_or_else(|| "The selected workspace path is not UTF-8".to_owned())?
        .to_owned();
    Ok(WorkspaceSnapshot {
        name,
        root_path,
        documents,
    })
}

#[cfg(unix)]
fn collect_nextflow_files(
    root: &Path,
    directory: &Path,
    depth: usize,
    entry_count: &mut usize,
    files: &mut Vec<PathBuf>,
) -> Result<(), String> {
    if depth > MAX_DEPTH {
        return Err(format!(
            "The workspace contains directories nested deeper than {MAX_DEPTH} levels"
        ));
    }

    let mut entries = Vec::new();
    for entry in fs::read_dir(directory)
        .map_err(|error| format!("Could not list {}: {error}", directory.display()))?
    {
        *entry_count += 1;
        if *entry_count > MAX_DIRECTORY_ENTRIES {
            return Err(format!(
                "The selected workspace contains more than {MAX_DIRECTORY_ENTRIES} entries"
            ));
        }
        entries.push(entry.map_err(|error| format!("Could not read workspace entries: {error}"))?);
    }
    entries.sort_by_key(|entry| entry.file_name());

    for entry in entries {
        let file_name = entry.file_name();
        let name = file_name.to_string_lossy();
        if name.starts_with('.') {
            continue;
        }
        let file_type = entry
            .file_type()
            .map_err(|error| format!("Could not inspect {}: {error}", entry.path().display()))?;
        if file_type.is_symlink() {
            continue;
        }

        let path = entry.path();
        if file_type.is_dir() {
            if IGNORED_DIRECTORIES.contains(&name.as_ref()) {
                continue;
            }
            collect_nextflow_files(root, &path, depth + 1, entry_count, files)?;
        } else if file_type.is_file() && path.extension().is_some_and(|extension| extension == "nf")
        {
            let canonical = path
                .canonicalize()
                .map_err(|error| format!("Could not resolve {}: {error}", path.display()))?;
            if !canonical.starts_with(root) {
                continue;
            }
            files.push(
                path.strip_prefix(root)
                    .map_err(|_| "A workspace file escaped the selected folder".to_owned())?
                    .to_path_buf(),
            );
            if files.len() > MAX_FILES {
                return Err(format!(
                    "The selected workspace contains more than {MAX_FILES} Nextflow files"
                ));
            }
        }
    }
    Ok(())
}

#[cfg(unix)]
fn open_workspace_root(root: &Path) -> io::Result<fs::File> {
    use std::ffi::CString;
    use std::os::fd::{AsRawFd, FromRawFd};
    use std::os::unix::ffi::OsStrExt;

    let mut directory = fs::File::open("/")?;
    for component in root.components() {
        if let std::path::Component::Normal(name) = component {
            let name = CString::new(name.as_bytes())
                .map_err(|_| io::Error::new(io::ErrorKind::InvalidInput, "invalid path"))?;
            let descriptor = unsafe {
                libc::openat(
                    directory.as_raw_fd(),
                    name.as_ptr(),
                    libc::O_RDONLY | libc::O_CLOEXEC | libc::O_DIRECTORY | libc::O_NOFOLLOW,
                )
            };
            if descriptor < 0 {
                return Err(io::Error::last_os_error());
            }
            directory = unsafe { fs::File::from_raw_fd(descriptor) };
        } else if component != std::path::Component::RootDir {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "invalid root path",
            ));
        }
    }
    Ok(directory)
}

#[cfg(unix)]
fn open_workspace_file(
    _root: &Path,
    root_directory: &fs::File,
    relative_path: &Path,
) -> io::Result<fs::File> {
    use std::ffi::CString;
    use std::os::fd::{AsRawFd, FromRawFd};
    use std::os::unix::ffi::OsStrExt;

    let mut components = relative_path.components().peekable();
    let mut parent = root_directory.try_clone()?;
    loop {
        let Some(std::path::Component::Normal(name)) = components.next() else {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "invalid workspace-relative path",
            ));
        };
        let name = CString::new(name.as_bytes())
            .map_err(|_| io::Error::new(io::ErrorKind::InvalidInput, "invalid path"))?;
        let is_directory = components.peek().is_some();
        let flags = libc::O_RDONLY
            | libc::O_CLOEXEC
            | libc::O_NOFOLLOW
            | if is_directory {
                libc::O_DIRECTORY
            } else {
                libc::O_NONBLOCK
            };
        let descriptor = unsafe { libc::openat(parent.as_raw_fd(), name.as_ptr(), flags) };
        if descriptor < 0 {
            return Err(io::Error::last_os_error());
        }
        let opened = unsafe { fs::File::from_raw_fd(descriptor) };
        if !is_directory {
            return Ok(opened);
        }
        parent = opened;
    }
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static NEXT_TEMP_ID: AtomicU64 = AtomicU64::new(1);

    struct TestDirectory(PathBuf);

    impl TestDirectory {
        fn new() -> Self {
            let path = std::env::temp_dir().join(format!(
                "nf-gui-workspace-test-{}-{}",
                std::process::id(),
                NEXT_TEMP_ID.fetch_add(1, Ordering::Relaxed)
            ));
            fs::create_dir_all(&path).unwrap();
            Self(path)
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn reads_nextflow_sources_and_ignores_hidden_and_generated_directories() {
        let directory = TestDirectory::new();
        fs::create_dir_all(directory.0.join("modules")).unwrap();
        fs::create_dir_all(directory.0.join(".git")).unwrap();
        fs::create_dir_all(directory.0.join("work")).unwrap();
        fs::write(directory.0.join("main.nf"), "workflow {}").unwrap();
        fs::write(directory.0.join("modules/qc.nf"), "process QC {}").unwrap();
        fs::write(directory.0.join(".git/hidden.nf"), "hidden").unwrap();
        fs::write(directory.0.join("work/generated.nf"), "generated").unwrap();
        fs::write(directory.0.join("nextflow.config"), "process {}").unwrap();

        let workspace = read_workspace(&directory.0).unwrap();

        assert_eq!(workspace.documents.len(), 2);
        assert_eq!(workspace.documents[0].relative_path, "main.nf");
        assert_eq!(workspace.documents[1].relative_path, "modules/qc.nf");
    }

    #[test]
    fn rejects_empty_workspaces_and_non_utf8_sources() {
        let directory = TestDirectory::new();
        assert!(
            read_workspace(&directory.0)
                .unwrap_err()
                .contains("No Nextflow")
        );

        fs::write(directory.0.join("invalid.nf"), [0xff, 0xfe]).unwrap();
        assert!(
            read_workspace(&directory.0)
                .unwrap_err()
                .contains("as UTF-8")
        );
    }

    #[test]
    fn enforces_source_size_limits() {
        let directory = TestDirectory::new();
        fs::write(
            directory.0.join("large.nf"),
            vec![b'a'; MAX_FILE_BYTES as usize + 1],
        )
        .unwrap();

        assert!(
            read_workspace(&directory.0)
                .unwrap_err()
                .contains("file limit")
        );
    }

    #[test]
    fn enforces_directory_entry_limit_before_collecting_the_tree() {
        let directory = TestDirectory::new();
        fs::write(directory.0.join("main.nf"), "workflow {}").unwrap();
        let mut entry_count = MAX_DIRECTORY_ENTRIES;
        let error = collect_nextflow_files(
            &directory.0,
            &directory.0,
            0,
            &mut entry_count,
            &mut Vec::new(),
        )
        .unwrap_err();

        assert!(error.contains("entries"));
    }

    #[cfg(unix)]
    #[test]
    fn does_not_follow_symlinked_files_or_directories() {
        use std::ffi::CString;
        use std::os::unix::fs::symlink;
        use std::os::unix::ffi::OsStrExt;

        let directory = TestDirectory::new();
        let outside = TestDirectory::new();
        fs::write(outside.0.join("secret.nf"), "private").unwrap();
        symlink(outside.0.join("secret.nf"), directory.0.join("linked.nf")).unwrap();
        symlink(&outside.0, directory.0.join("linked-directory")).unwrap();
        fs::write(directory.0.join("main.nf"), "workflow {}").unwrap();

        let workspace = read_workspace(&directory.0).unwrap();

        assert_eq!(workspace.documents.len(), 1);
        assert_eq!(workspace.documents[0].relative_path, "main.nf");

        let root = directory.0.canonicalize().unwrap();
        let root_directory = open_workspace_root(&root).unwrap();
        assert!(open_workspace_file(&root, &root_directory, Path::new("linked.nf")).is_err());
        assert!(
            open_workspace_file(
                &root,
                &root_directory,
                Path::new("linked-directory/secret.nf")
            )
            .is_err()
        );

        let fifo_path = directory.0.join("pipe.nf");
        let fifo_name = CString::new(fifo_path.as_os_str().as_bytes()).unwrap();
        assert_eq!(unsafe { libc::mkfifo(fifo_name.as_ptr(), 0o600) }, 0);
        let fifo = open_workspace_file(&root, &root_directory, Path::new("pipe.nf")).unwrap();
        assert!(!fifo.metadata().unwrap().is_file());
    }
}
