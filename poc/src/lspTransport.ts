import { Channel, invoke } from "@tauri-apps/api/core";
import { decodeLspBody, frameLspBody } from "./lspProtocol";

export interface LspTransport {
  send(message: Uint8Array): Promise<void>;
  stop(): Promise<void>;
}

export async function startLspTransport(
  onMessage: (message: Uint8Array) => void,
  onStderr: (chunk: Uint8Array) => void,
  onExit: (reason: string) => void,
): Promise<LspTransport> {
  const messageChannel = new Channel<ArrayBuffer>();
  const stderrChannel = new Channel<ArrayBuffer>();
  messageChannel.onmessage = (body) => onMessage(frameLspBody(new Uint8Array(body)));
  stderrChannel.onmessage = (chunk) => onStderr(new Uint8Array(chunk));
  const exitChannel = new Channel<string>();
  exitChannel.onmessage = onExit;

  const sessionId = await invoke<number>("lsp_start", {
    onMessage: messageChannel,
    onStderr: stderrChannel,
    onExit: exitChannel,
  });

  return {
    send: (message) =>
      invoke("lsp_send", {
        sessionId,
        message: Array.from(decodeLspBody(message)),
      }),
    stop: () => invoke("lsp_stop", { sessionId }),
  };
}
