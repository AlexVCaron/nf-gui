import { Channel, invoke } from "@tauri-apps/api/core";

export interface LspTransport {
  send(message: Uint8Array): Promise<void>;
  stop(): Promise<void>;
}

export async function startLspTransport(
  onMessage: (message: Uint8Array) => void,
  onStderr: (chunk: Uint8Array) => void,
): Promise<LspTransport> {
  const messageChannel = new Channel<ArrayBuffer>();
  const stderrChannel = new Channel<ArrayBuffer>();
  messageChannel.onmessage = (message) => onMessage(new Uint8Array(message));
  stderrChannel.onmessage = (chunk) => onStderr(new Uint8Array(chunk));

  const sessionId = await invoke<number>("lsp_start", {
    onMessage: messageChannel,
    onStderr: stderrChannel,
  });

  return {
    send: (message) =>
      invoke("lsp_send", { sessionId, message: Array.from(message) }),
    stop: () => invoke("lsp_stop", { sessionId }),
  };
}
