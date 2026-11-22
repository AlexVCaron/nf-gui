use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

const MAX_FILES: usize = 256;
const MAX_DEPTH: usize = 12;
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
    let Some(selection) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };
    let selected_path = selection
        .into_path()
        .map_err(|error| format!("Could not resolve selected workspace folder: {error}"))?;

    read_workspace(&selected_path).map(Some)
}

fn read_workspace(selected_path: &Path) -> Result<WorkspaceSnapshot, String> {
    let root = selected_path
        .canonicalize()
        .map_err(|error| format!("Could not open selected workspace: {error}"))?;
    let metadata = fs::symlink_metadata(&root)
        .map_err(|error| format!("Could not inspect selected workspace: {error}"))?;
    if !metadata.is_dir() {
        return Err("The selected workspace is not a directory".to_owned());
    }

    let mut paths = Vec::new();
    collect_nextflow_files(&root, &root, 0, &mut paths)?;
    paths.sort();

    let mut total_bytes = 0_u64;
    let mut documents = Vec::with_capacity(paths.len());
    for path in paths {
        let metadata = fs::symlink_metadata(&path)
            .map_err(|error| format!("Could not inspect {}: {error}", path.display()))?;
        if !metadata.is_file() || metadata.file_type().is_symlink() {
            continue;
        }
        if metadata.len() > MAX_FILE_BYTES {
            return Err(format!(
                "{} exceeds the {} KiB workspace-file limit",
                path.display(),
                MAX_FILE_BYTES / 1024
            ));
        }
        total_bytes = total_bytes.saturating_add(metadata.len());
        if total_bytes > MAX_TOTAL_BYTES {
            return Err("The selected workspace exceeds the 16 MiB source limit".to_owned());
        }

        let content = fs::read_to_string(&path)
            .map_err(|error| format!("Could not read {} as UTF-8: {error}", path.display()))?;
        let relative_path = path
            .strip_prefix(&root)
            .map_err(|_| "A workspace file escaped the selected folder".to_owned())?
            .to_string_lossy()
            .replace('\\', "/");
        documents.push(WorkspaceDocument {
            relative_path,
            absolute_path: path.to_string_lossy().into_owned(),
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
    Ok(WorkspaceSnapshot {
        name,
        root_path: root.to_string_lossy().into_owned(),
        documents,
    })
}

fn collect_nextflow_files(
    root: &Path,
    directory: &Path,
    depth: usize,
    files: &mut Vec<PathBuf>,
) -> Result<(), String> {
    if depth > MAX_DEPTH {
        return Err(format!(
            "The workspace contains directories nested deeper than {MAX_DEPTH} levels"
        ));
    }

    let mut entries = fs::read_dir(directory)
        .map_err(|error| format!("Could not list {}: {error}", directory.display()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Could not read workspace entries: {error}"))?;
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
            collect_nextflow_files(root, &path, depth + 1, files)?;
        } else if file_type.is_file()
            && path.extension().is_some_and(|extension| extension == "nf")
        {
            let canonical = path
                .canonicalize()
                .map_err(|error| format!("Could not resolve {}: {error}", path.display()))?;
            if canonical != path || !canonical.starts_with(root) {
                continue;
            }
            files.push(canonical);
            if files.len() > MAX_FILES {
                return Err(format!(
                    "The selected workspace contains more than {MAX_FILES} Nextflow files"
                ));
            }
        }
    }
    Ok(())
}

#[cfg(test)]
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
        assert!(read_workspace(&directory.0).unwrap_err().contains("No Nextflow"));

        fs::write(directory.0.join("invalid.nf"), [0xff, 0xfe]).unwrap();
        assert!(read_workspace(&directory.0).unwrap_err().contains("as UTF-8"));
    }

    #[cfg(unix)]
    #[test]
    fn does_not_follow_symlinked_files_or_directories() {
        use std::os::unix::fs::symlink;

        let directory = TestDirectory::new();
        let outside = TestDirectory::new();
        fs::write(outside.0.join("secret.nf"), "private").unwrap();
        symlink(outside.0.join("secret.nf"), directory.0.join("linked.nf")).unwrap();
        symlink(&outside.0, directory.0.join("linked-directory")).unwrap();
        fs::write(directory.0.join("main.nf"), "workflow {}").unwrap();

        let workspace = read_workspace(&directory.0).unwrap();

        assert_eq!(workspace.documents.len(), 1);
        assert_eq!(workspace.documents[0].relative_path, "main.nf");
    }
}
