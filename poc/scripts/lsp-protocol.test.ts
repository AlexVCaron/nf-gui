import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeLspBody,
  decodeLspMessage,
  encodeLspMessage,
  frameLspBody,
  LspRpcClient,
} from "../src/lspProtocol.ts";

function frame(message: unknown): Uint8Array {
  const body = new TextEncoder().encode(JSON.stringify(message));
  const header = new TextEncoder().encode(`Content-Length: ${body.byteLength}\r\n\r\n`);
  const bytes = new Uint8Array(header.byteLength + body.byteLength);
  bytes.set(header);
  bytes.set(body, header.byteLength);
  return bytes;
}

test("encodes and decodes UTF-8 JSON-RPC messages by byte length", () => {
  const message = { jsonrpc: "2.0", method: "test", params: { text: "é" } } as const;
  assert.deepEqual(decodeLspMessage(encodeLspMessage(message)), message);
});

test("converts framed RPC messages to IPC bodies and back without changing bytes", () => {
  const body = new TextEncoder().encode(JSON.stringify({
    jsonrpc: "2.0",
    method: "initialize",
    params: { clientInfo: { name: "nf-gui" } },
  }));
  const frame = encodeLspMessage(JSON.parse(new TextDecoder().decode(body)));
  assert.deepEqual(decodeLspBody(frame), body);
  assert.deepEqual(frameLspBody(decodeLspBody(frame)), frame);
});

test("rejects malformed, duplicate, mismatched and non-JSON-RPC frames", () => {
  for (const input of [
    new TextEncoder().encode("Content-Length: 1\r\nContent-Length: 1\r\n\r\nx"),
    new TextEncoder().encode("Content-Length: 2\r\n\r\n{}"),
    frame({ jsonrpc: "1.0", method: "invalid" }),
  ]) {
    assert.throws(() => decodeLspMessage(input));
  }
});

test("correlates responses and dispatches notifications", async () => {
  let sent: Uint8Array | undefined;
  const client = new LspRpcClient(async (value) => { sent = value; });
  let notification: unknown;
  client.onNotification("textDocument/publishDiagnostics", (params) => {
    notification = params;
  });

  const response = client.request("initialize", {});
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.ok(sent);
  const request = decodeLspMessage(sent);
  client.receive(frame({ jsonrpc: "2.0", id: request.id, result: { capabilities: {} } }));
  assert.deepEqual(await response, { capabilities: {} });

  client.receive(frame({
    jsonrpc: "2.0",
    method: "textDocument/publishDiagnostics",
    params: { uri: "file:///sample.nf", diagnostics: [] },
  }));
  assert.deepEqual(notification, { uri: "file:///sample.nf", diagnostics: [] });
  client.close();
});

test("serializes writes so concurrent document notifications retain order", async () => {
  const methods: string[] = [];
  let releaseFirst: () => void = () => {};
  let startFirst: () => void = () => {};
  const firstStarted = new Promise<void>((resolve) => { startFirst = resolve; });
  const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
  const client = new LspRpcClient(async (value) => {
    const message = decodeLspMessage(value);
    methods.push(message.method!);
    if (message.method === "first") {
      startFirst();
      await firstGate;
    }
  });

  const first = client.notify("first", {});
  const second = client.notify("second", {});
  await firstStarted;
  assert.deepEqual(methods, ["first"]);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(methods, ["first", "second"]);
  client.close();
});

test("rejects pending requests on cancellation, timeout, and close", async () => {
  const sent: Uint8Array[] = [];
  const client = new LspRpcClient(async (value) => { sent.push(value); }, 20);
  const controller = new AbortController();
  const cancelled = client.request("hover", {}, { signal: controller.signal });
  controller.abort();
  await assert.rejects(cancelled, /cancelled/);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(decodeLspMessage(sent.at(-1)!).method, "$/cancelRequest");

  await assert.rejects(client.request("slow", {}), /timed out/);
  const pending = client.request("pending", {});
  client.close();
  await assert.rejects(pending, /closed/);
});
