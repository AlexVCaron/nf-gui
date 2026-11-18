use crate::lsp_framing::{read_message, write_message};
use std::io::{self, BufReader, Read};
use std::path::Path;
use std::process::{Child, ChildStdin, Command, ExitStatus, Stdio};
use std::sync::mpsc::{self, Receiver, SyncSender, TrySendError};
use std::thread;
use std::time::Duration;

const STDERR_CHUNK_BYTES: usize = 4096;
const STDERR_CHANNEL_CAPACITY: usize = 16;
const MESSAGE_CHANNEL_CAPACITY: usize = 32;

pub struct LspProcess {
    child: Child,
    stdin: ChildStdin,
    messages: Receiver<io::Result<Vec<u8>>>,
    stderr: Receiver<Vec<u8>>,
}

impl LspProcess {
    pub fn launch_server(server_jar: &Path) -> io::Result<Self> {
        let mut command = Command::new("java");
        command.arg("-jar").arg(server_jar);
        command.current_dir(server_jar.parent().unwrap_or_else(|| Path::new(".")));
        command.env_clear();
        if let Some(path) = std::env::var_os("PATH") {
            command.env("PATH", path);
        }
        Self::spawn(&mut command)
    }

    fn spawn(command: &mut Command) -> io::Result<Self> {
        let mut child = command
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;

        let Some(stdin) = child.stdin.take() else {
            return fail_spawn(&mut child, "failed to capture language server stdin");
        };
        let Some(stdout) = child.stdout.take() else {
            return fail_spawn(&mut child, "failed to capture language server stdout");
        };
        let Some(stderr_reader) = child.stderr.take() else {
            return fail_spawn(&mut child, "failed to capture language server stderr");
        };

        let (message_sender, messages) = mpsc::sync_channel(MESSAGE_CHANNEL_CAPACITY);
        if let Err(error) = thread::Builder::new()
            .name("lsp-stdout".into())
            .spawn(move || read_messages(BufReader::new(stdout), message_sender))
        {
            let _ = terminate_child(&mut child);
            return Err(error);
        }

        let (stderr_sender, stderr) = mpsc::sync_channel(STDERR_CHANNEL_CAPACITY);
        if let Err(error) = thread::Builder::new()
            .name("lsp-stderr".into())
            .spawn(move || drain_stderr(stderr_reader, stderr_sender))
        {
            let _ = terminate_child(&mut child);
            return Err(error);
        }

        Ok(Self {
            child,
            stdin,
            messages,
            stderr,
        })
    }

    pub fn send(&mut self, message: &[u8]) -> io::Result<()> {
        write_message(&mut self.stdin, message)
    }

    pub fn receive(&self, timeout: Duration) -> io::Result<Option<Vec<u8>>> {
        match self.messages.recv_timeout(timeout) {
            Ok(Ok(message)) => Ok(Some(message)),
            Ok(Err(error)) => Err(error),
            Err(mpsc::RecvTimeoutError::Timeout) => Err(io::Error::new(
                io::ErrorKind::TimedOut,
                "timed out waiting for LSP message",
            )),
            Err(mpsc::RecvTimeoutError::Disconnected) => Ok(None),
        }
    }

    pub fn try_receive_stderr(&self) -> Option<Vec<u8>> {
        self.stderr.try_recv().ok()
    }

    pub fn try_wait(&mut self) -> io::Result<Option<ExitStatus>> {
        self.child.try_wait()
    }

    pub fn terminate(&mut self) -> io::Result<ExitStatus> {
        terminate_child(&mut self.child)
    }
}

impl Drop for LspProcess {
    fn drop(&mut self) {
        let _ = terminate_child(&mut self.child);
    }
}

fn read_messages<R: io::BufRead>(mut reader: R, sender: SyncSender<io::Result<Vec<u8>>>) {
    loop {
        match read_message(&mut reader) {
            Ok(Some(message)) => {
                if sender.send(Ok(message)).is_err() {
                    break;
                }
            }
            Ok(None) => break,
            Err(error) => {
                let _ = sender.send(Err(error));
                break;
            }
        }
    }
}

fn drain_stderr<R: Read>(mut reader: R, sender: SyncSender<Vec<u8>>) {
    let mut buffer = [0; STDERR_CHUNK_BYTES];
    loop {
        match reader.read(&mut buffer) {
            Ok(0) | Err(_) => break,
            Ok(length) => match sender.try_send(buffer[..length].to_vec()) {
                Ok(()) | Err(TrySendError::Full(_)) => {}
                Err(TrySendError::Disconnected(_)) => break,
            },
        }
    }
}

fn terminate_child(child: &mut Child) -> io::Result<ExitStatus> {
    if let Some(status) = child.try_wait()? {
        return Ok(status);
    }

    match child.kill() {
        Ok(()) => child.wait(),
        Err(error) if error.kind() == io::ErrorKind::InvalidInput => child.wait(),
        Err(error) => Err(error),
    }
}

fn fail_spawn<T>(child: &mut Child, message: &str) -> io::Result<T> {
    let _ = terminate_child(child);
    Err(io::Error::other(message))
}

#[cfg(test)]
mod tests {
    use super::{LspProcess, drain_stderr};
    use std::io::ErrorKind;
    use std::process::Command;
    use std::sync::mpsc;
    use std::time::Duration;

    #[cfg(unix)]
    #[test]
    fn frames_child_stdout_and_terminates_the_child() {
        let mut command = Command::new("cat");
        let mut process = LspProcess::spawn(&mut command).unwrap();

        process.send(b"protocol message").unwrap();
        assert_eq!(
            process.receive(Duration::from_secs(2)).unwrap(),
            Some(b"protocol message".to_vec())
        );

        let status = process.terminate().unwrap();
        assert!(!status.success());
        assert!(process.try_wait().unwrap().is_some());
    }

    #[cfg(unix)]
    #[test]
    fn rejects_child_stdout_that_is_not_a_valid_frame() {
        let mut command = Command::new("printf");
        command.arg("not an LSP frame");
        let process = LspProcess::spawn(&mut command).unwrap();

        let error = process.receive(Duration::from_secs(2)).unwrap_err();
        assert_eq!(error.kind(), ErrorKind::InvalidData);
    }

    #[cfg(unix)]
    #[test]
    fn reports_receive_timeout() {
        let process = LspProcess::spawn(&mut Command::new("cat")).unwrap();

        let error = process
            .receive(Duration::from_millis(1))
            .expect_err("no child output should arrive before a message is sent");
        assert_eq!(error.kind(), ErrorKind::TimedOut);
    }

    #[test]
    fn keeps_stderr_chunks_separate_from_protocol_messages() {
        let (sender, receiver) = mpsc::sync_channel(1);
        drain_stderr(&b"diagnostic output"[..], sender);

        assert_eq!(receiver.recv().unwrap(), b"diagnostic output".to_vec());
    }
}
