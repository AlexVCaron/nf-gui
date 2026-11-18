use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{self, Read};
use std::path::Path;

pub const LANGUAGE_SERVER_JAR: &str = "language-server-all.jar";
const LANGUAGE_SERVER_SHA256: &str =
    "e1c5da90c7f0565ba9e64ac3c5b58f1215e315d6bfe4414d62ff2d02749e8887";
const MAX_LANGUAGE_SERVER_BYTES: u64 = 128 * 1024 * 1024;

pub fn verify_language_server(path: &Path) -> io::Result<()> {
    let metadata = fs::symlink_metadata(path)?;
    if !metadata.file_type().is_file() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "language-server resource must be a regular file",
        ));
    }
    if metadata.len() > MAX_LANGUAGE_SERVER_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "language-server resource exceeds the size limit",
        ));
    }

    let actual = hash_file(path)?;
    if actual != LANGUAGE_SERVER_SHA256 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "language-server resource SHA-256 does not match the pinned artifact",
        ));
    }
    Ok(())
}

fn hash_file(path: &Path) -> io::Result<String> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0; 64 * 1024];
    loop {
        let length = file.read(&mut buffer)?;
        if length == 0 {
            break;
        }
        hasher.update(&buffer[..length]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

#[cfg(test)]
mod tests {
    use super::{
        LANGUAGE_SERVER_JAR, LANGUAGE_SERVER_SHA256, MAX_LANGUAGE_SERVER_BYTES, hash_file,
        verify_language_server,
    };
    use std::fs;
    #[cfg(unix)]
    use std::os::unix::fs::symlink;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    struct TestDirectory(PathBuf);

    impl TestDirectory {
        fn new() -> Self {
            let unique = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let path = std::env::temp_dir().join(format!("nf-gui-lsp-{unique}"));
            fs::create_dir(&path).unwrap();
            Self(path)
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn hashes_a_file_with_sha256() {
        let directory = TestDirectory::new();
        let path = directory.0.join("jar");
        fs::write(&path, b"abc").unwrap();

        assert_eq!(
            hash_file(&path).unwrap(),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn rejects_wrong_artifact_digest() {
        let directory = TestDirectory::new();
        let path = directory.0.join("jar");
        fs::write(&path, b"not the language server").unwrap();

        let error = verify_language_server(&path).unwrap_err();
        assert_eq!(error.kind(), std::io::ErrorKind::InvalidData);
    }

    #[test]
    fn rejects_oversized_artifact_before_hashing() {
        let directory = TestDirectory::new();
        let path = directory.0.join(LANGUAGE_SERVER_JAR);
        fs::File::create(&path)
            .unwrap()
            .set_len(MAX_LANGUAGE_SERVER_BYTES + 1)
            .unwrap();

        let error = verify_language_server(&path).unwrap_err();
        assert_eq!(error.kind(), std::io::ErrorKind::InvalidData);
    }

    #[cfg(unix)]
    #[test]
    fn rejects_symlinked_artifact() {
        let directory = TestDirectory::new();
        let target = directory.0.join("target.jar");
        let link = directory.0.join(LANGUAGE_SERVER_JAR);
        fs::write(&target, b"abc").unwrap();
        symlink(target, &link).unwrap();

        let error = verify_language_server(&link).unwrap_err();
        assert_eq!(error.kind(), std::io::ErrorKind::InvalidInput);
    }

    #[test]
    fn pins_expected_artifact_hash_and_size_limit() {
        assert_eq!(
            LANGUAGE_SERVER_SHA256,
            "e1c5da90c7f0565ba9e64ac3c5b58f1215e315d6bfe4414d62ff2d02749e8887"
        );
        assert_eq!(MAX_LANGUAGE_SERVER_BYTES, 128 * 1024 * 1024);
    }
}
