const MAX_LSP_BODY_BYTES = 8 * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export type JsonRpcMessage = {
  jsonrpc: "2.0";
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  signal?: AbortSignal;
  abort?: () => void;
};

export function encodeLspMessage(message: JsonRpcMessage): Uint8Array {
  const body = encoder.encode(JSON.stringify(message));
  if (body.byteLength > MAX_LSP_BODY_BYTES) {
    throw new Error("LSP message exceeds the configured size limit");
  }

  const header = encoder.encode(`Content-Length: ${body.byteLength}\r\n\r\n`);
  const frame = new Uint8Array(header.byteLength + body.byteLength);
  frame.set(header);
  frame.set(body, header.byteLength);
  return frame;
}

export function decodeLspMessage(frame: Uint8Array): JsonRpcMessage {
  const delimiter = findHeaderDelimiter(frame);
  if (delimiter < 0 || delimiter > 8 * 1024) {
    throw new Error("Invalid LSP message header");
  }

  const header = decoder.decode(frame.subarray(0, delimiter));
  let contentLength: number | undefined;
  for (const line of header.split("\r\n")) {
    const [name, ...values] = line.split(":");
    if (!name || values.length === 0) throw new Error("Malformed LSP message header");
    if (name.toLowerCase() !== "content-length") continue;
    if (contentLength !== undefined) throw new Error("Duplicate Content-Length header");
    const value = values.join(":").trim();
    if (!/^\d+$/.test(value)) throw new Error("Invalid Content-Length header");
    contentLength = Number(value);
  }

  if (contentLength === undefined || contentLength > MAX_LSP_BODY_BYTES) {
    throw new Error("Missing or oversized Content-Length header");
  }

  const bodyStart = delimiter + 4;
  if (frame.byteLength - bodyStart !== contentLength) {
    throw new Error("LSP message body length does not match Content-Length");
  }

  const message: unknown = JSON.parse(decoder.decode(frame.subarray(bodyStart)));
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    throw new Error("Invalid JSON-RPC message");
  }
  const rpc = message as JsonRpcMessage;
  if (rpc.jsonrpc !== "2.0") throw new Error("Unsupported JSON-RPC version");
  return rpc;
}

export class LspRpcClient {
  private nextId = 1;
  private closed = false;
  private readonly pending = new Map<number | string, PendingRequest>();
  private readonly listeners = new Map<string, Set<(params: unknown) => void>>();

  constructor(
    private readonly sendFrame: (frame: Uint8Array) => Promise<void>,
    private readonly requestTimeoutMs = 15_000,
  ) {}

  request(
    method: string,
    params: unknown,
    options: { signal?: AbortSignal; timeoutMs?: number } = {},
  ): Promise<unknown> {
    if (this.closed) return Promise.reject(new Error("LSP client is closed"));

    const id = this.nextId++;
    const timeoutMs = options.timeoutMs ?? this.requestTimeoutMs;
    return new Promise((resolve, reject) => {
      const pending: PendingRequest = {
        resolve,
        reject,
        timeout: setTimeout(() => {
          this.rejectPending(id, new Error(`LSP request timed out: ${method}`));
          void this.notify("$/cancelRequest", { id }).catch(() => undefined);
        }, timeoutMs),
        signal: options.signal,
      };
      pending.abort = () => {
        this.rejectPending(id, new Error("LSP request cancelled"));
        void this.notify("$/cancelRequest", { id }).catch(() => undefined);
      };
      this.pending.set(id, pending);

      if (options.signal?.aborted) {
        pending.abort();
        return;
      }
      options.signal?.addEventListener("abort", pending.abort, { once: true });

      void this.sendFrame(encodeLspMessage({ jsonrpc: "2.0", id, method, params }))
        .catch((error: unknown) => {
          this.rejectPending(
            id,
            error instanceof Error ? error : new Error("Failed to send LSP request"),
          );
        });
    });
  }

  notify(method: string, params: unknown): Promise<void> {
    if (this.closed) return Promise.reject(new Error("LSP client is closed"));
    return this.sendFrame(encodeLspMessage({ jsonrpc: "2.0", method, params }));
  }

  onNotification(method: string, listener: (params: unknown) => void): () => void {
    const listeners = this.listeners.get(method) ?? new Set();
    listeners.add(listener);
    this.listeners.set(method, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(method);
    };
  }

  receive(frame: Uint8Array): void {
    if (this.closed) return;
    const message = decodeLspMessage(frame);
    if (message.method) {
      if (message.id !== undefined) {
        void this.sendFrame(encodeLspMessage({
          jsonrpc: "2.0",
          id: message.id,
          error: { code: -32601, message: "Client request method not supported" },
        })).catch(() => undefined);
        return;
      }
      for (const listener of this.listeners.get(message.method) ?? []) {
        listener(message.params);
      }
      return;
    }

    if (message.id === undefined) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    if (message.error) {
      this.rejectPending(
        message.id,
        new Error(`LSP error ${message.error.code}: ${message.error.message}`),
      );
    } else {
      this.resolvePending(message.id, message.result);
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const [id] of this.pending) {
      this.rejectPending(id, new Error("LSP client closed"));
    }
    this.listeners.clear();
  }

  private resolvePending(id: number | string, value: unknown): void {
    const pending = this.takePending(id);
    pending?.resolve(value);
  }

  private rejectPending(id: number | string, error: Error): void {
    const pending = this.takePending(id);
    pending?.reject(error);
  }

  private takePending(id: number | string): PendingRequest | undefined {
    const pending = this.pending.get(id);
    if (!pending) return undefined;
    clearTimeout(pending.timeout);
    if (pending.abort) pending.signal?.removeEventListener("abort", pending.abort);
    this.pending.delete(id);
    return pending;
  }
}

function findHeaderDelimiter(frame: Uint8Array): number {
  for (let index = 0; index <= frame.byteLength - 4; index += 1) {
    if (
      frame[index] === 13 &&
      frame[index + 1] === 10 &&
      frame[index + 2] === 13 &&
      frame[index + 3] === 10
    ) {
      return index;
    }
  }
  return -1;
}
