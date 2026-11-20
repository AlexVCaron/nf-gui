use crate::lsp_artifact::{LANGUAGE_SERVER_JAR, verify_language_server};
use crate::lsp_process::LspProcess;
use std::io;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::ipc::{Channel, InvokeResponseBody};
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager, State};

const RECEIVE_INTERVAL: Duration = Duration::from_millis(50);

#[derive(Default)]
pub struct LspState {
    active: Arc<Mutex<Option<ActiveLsp>>>,
    next_session: AtomicU64,
}

struct ActiveLsp {
    id: u64,
    process: Arc<Mutex<LspProcess>>,
}

impl LspState {
    pub fn stop(&self, session_id: u64) -> Result<(), String> {
        let session = self
            .active
            .lock()
            .map_err(|_| "language server state is unavailable".to_owned())?
            .take_if(|session| session.id == session_id)
            .ok_or_else(|| "language server session is no longer active".to_owned())?;
        session
            .process
            .lock()
            .map_err(|_| "language server process is unavailable".to_owned())?
            .terminate()
            .map(|_| ())
            .map_err(|error| error.to_string())
    }

    pub fn stop_active(&self) {
        let session = self.active.lock().ok().and_then(|mut active| active.take());
        if let Some(session) = session {
            if let Ok(mut process) = session.process.lock() {
                let _ = process.terminate();
            }
        }
    }
}

#[tauri::command]
pub fn lsp_start(
    app: AppHandle,
    on_message: Channel<InvokeResponseBody>,
    on_stderr: Channel<InvokeResponseBody>,
    on_exit: Channel<String>,
    state: State<'_, LspState>,
) -> Result<u64, String> {
    let mut active = state
        .active
        .lock()
        .map_err(|_| "language server state is unavailable".to_owned())?;
    if active.is_some() {
        return Err("a language server session is already active".to_owned());
    }

    let jar_path = app
        .path()
        .resolve(
            PathBuf::from("artifacts").join(LANGUAGE_SERVER_JAR),
            BaseDirectory::Resource,
        )
        .map_err(|error| error.to_string())?;
    verify_language_server(&jar_path).map_err(|error| error.to_string())?;

    let process = Arc::new(Mutex::new(
        LspProcess::launch_server(&jar_path).map_err(|error| error.to_string())?,
    ));
    let session_id = state.next_session.fetch_add(1, Ordering::Relaxed) + 1;
    *active = Some(ActiveLsp {
        id: session_id,
        process: Arc::clone(&process),
    });
    drop(active);

    let active = Arc::clone(&state.active);
    let worker_process = Arc::clone(&process);
    let spawn_result = thread::Builder::new()
        .name("lsp-channel".into())
        .spawn(move || {
            stream_process(
                worker_process,
                active,
                session_id,
                on_message,
                on_stderr,
                on_exit,
            )
        });
    if let Err(error) = spawn_result {
        if let Ok(mut active) = state.active.lock() {
            active.take_if(|session| session.id == session_id);
        }
        if let Ok(mut process) = process.lock() {
            let _ = process.terminate();
        }
        return Err(error.to_string());
    }

    Ok(session_id)
}

#[tauri::command]
pub fn lsp_send(
    session_id: u64,
    message: Vec<u8>,
    state: State<'_, LspState>,
) -> Result<(), String> {
    let active = state
        .active
        .lock()
        .map_err(|_| "language server state is unavailable".to_owned())?;
    let session = active
        .as_ref()
        .filter(|session| session.id == session_id)
        .ok_or_else(|| "language server session is no longer active".to_owned())?;
    session
        .process
        .lock()
        .map_err(|_| "language server process is unavailable".to_owned())?
        .send(&message)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn lsp_stop(session_id: u64, state: State<'_, LspState>) -> Result<(), String> {
    state.stop(session_id)
}

fn stream_process(
    process: Arc<Mutex<LspProcess>>,
    active: Arc<Mutex<Option<ActiveLsp>>>,
    session_id: u64,
    on_message: Channel<InvokeResponseBody>,
    on_stderr: Channel<InvokeResponseBody>,
    on_exit: Channel<String>,
) {
    let mut exit_reason = "language server stream stopped".to_owned();
    loop {
        let message = {
            let Ok(process) = process.lock() else {
                break;
            };
            match process.receive(RECEIVE_INTERVAL) {
                Ok(Some(message)) => Some(Ok(message)),
                Ok(None) => Some(Err("language server closed stdout".to_owned())),
                Err(error) if error.kind() == io::ErrorKind::TimedOut => None,
                Err(error) => Some(Err(error.to_string())),
            }
        };

        match message {
            Some(Ok(message)) => {
                if on_message.send(InvokeResponseBody::Raw(message)).is_err() {
                    exit_reason = "language server message channel closed".to_owned();
                    break;
                }
            }
            Some(Err(error)) => {
                exit_reason = error.to_string();
                let _ = on_stderr.send(InvokeResponseBody::Raw(exit_reason.as_bytes().to_vec()));
                break;
            }
            None => {}
        }

        let stderr = process
            .lock()
            .ok()
            .and_then(|process| process.try_receive_stderr());
        if let Some(stderr) = stderr
            && on_stderr.send(InvokeResponseBody::Raw(stderr)).is_err()
        {
            break;
        }

        let exited = process
            .lock()
            .ok()
            .and_then(|mut process| process.try_wait().ok().flatten())
            .is_some();
        if exited {
            exit_reason = "language server process exited".to_owned();
            let _ = on_stderr.send(InvokeResponseBody::Raw(exit_reason.as_bytes().to_vec()));
            break;
        }
    }

    if let Ok(mut process) = process.lock() {
        let _ = process.terminate();
    }
    if let Ok(mut active) = active.lock()
        && active
            .as_ref()
            .is_some_and(|current| current.id == session_id)
    {
        active.take();
    }
    let _ = on_exit.send(exit_reason);
}
