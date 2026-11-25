import assert from "node:assert/strict";
import test from "node:test";
import { LspDocumentSync, type SyncableTextModel } from "../src/lspDocumentSync.ts";

type Change = {
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  } | null;
  rangeOffset: number;
  rangeLength: number;
  text: string;
};

class FakeModel implements SyncableTextModel {
  version = 1;
  value: string;
  readonly uri: { toString(): string };
  private readonly listeners = new Set<(event: { changes: Change[] }) => void>();

  constructor(uri: { toString(): string }, initialValue: string) {
    this.uri = uri;
    this.value = initialValue;
  }

  getVersionId() {
    return this.version;
  }

  getValue() {
    return this.value;
  }

  onDidChangeContent(listener: (event: { changes: Change[] }) => void) {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  }

  change(value: string, changes: Change[]) {
    this.value = value;
    this.version += 1;
    for (const listener of this.listeners) listener({ changes });
  }

  get listenerCount() {
    return this.listeners.size;
  }
}

const rangedChange = (offset: number, text: string): Change => ({
  range: {
    startLineNumber: 1,
    startColumn: offset + 1,
    endLineNumber: 1,
    endColumn: offset + 1,
  },
  rangeOffset: offset,
  rangeLength: 0,
  text,
});

test("opens distinct document URIs, syncs versions, and closes only the matching model", async () => {
  const messages: Array<{ method: string; params: any }> = [];
  const sync = new LspDocumentSync(async (method, params) => {
    messages.push({ method, params });
  }, 2);
  const first = new FakeModel({ toString: () => "file:///workspace/main.nf" }, "main");
  const second = new FakeModel({ toString: () => "file:///workspace/modules/helper.nf" }, "helper");

  await sync.open(first);
  await sync.open(second);
  await sync.open(first);
  assert.deepEqual(messages.slice(0, 2).map(({ method }) => method), [
    "textDocument/didOpen",
    "textDocument/didOpen",
  ]);
  assert.equal(sync.getModel(first.uri.toString()), first);
  assert.equal(sync.getModel(second.uri.toString()), second);

  first.change("main!", [rangedChange(4, "!")]);
  assert.deepEqual(messages[2], {
    method: "textDocument/didChange",
    params: {
      textDocument: { uri: first.uri.toString(), version: 2 },
      contentChanges: [{
        range: {
          start: { line: 0, character: 4 },
          end: { line: 0, character: 4 },
        },
        rangeLength: 0,
        text: "!",
      }],
    },
  });
  assert.equal(await sync.close(first), true);
  assert.equal(await sync.close(first), false);
  assert.deepEqual(messages[3], {
    method: "textDocument/didClose",
    params: { textDocument: { uri: first.uri.toString() } },
  });
  assert.equal(first.listenerCount, 0);
  assert.equal(sync.getModel(first.uri.toString()), undefined);
  assert.equal(sync.getModel(second.uri.toString()), second);
  sync.dispose();
});

test("rejects a second model for an already-open URI", async () => {
  const sync = new LspDocumentSync(async () => undefined, 2);
  const first = new FakeModel({ toString: () => "file:///workspace/main.nf" }, "one");
  const duplicate = new FakeModel({ toString: () => "file:///workspace/main.nf" }, "two");
  await sync.open(first);
  await assert.rejects(sync.open(duplicate), /different model is already open/);
  assert.equal(sync.getOpenModels().length, 1);
  assert.equal(duplicate.listenerCount, 0);
  sync.dispose();
});

test("uses full-document sync when required and suppresses changes when unsupported", async () => {
  const fullMessages: Array<{ method: string; params: any }> = [];
  const fullSync = new LspDocumentSync(async (method, params) => {
    fullMessages.push({ method, params });
  }, 1);
  const fullModel = new FakeModel({ toString: () => "file:///workspace/full.nf" }, "start");
  await fullSync.open(fullModel);
  fullModel.change("replacement", [rangedChange(0, "replacement")]);
  assert.deepEqual(fullMessages[1].params.contentChanges, [{ text: "replacement" }]);
  fullSync.dispose();

  const noneMessages: string[] = [];
  const noneSync = new LspDocumentSync(async (method) => {
    noneMessages.push(method);
  }, 0);
  const noneModel = new FakeModel({ toString: () => "file:///workspace/none.nf" }, "start");
  await noneSync.open(noneModel);
  noneModel.change("changed", [rangedChange(0, "changed")]);
  assert.deepEqual(noneMessages, ["textDocument/didOpen"]);
  noneSync.dispose();
});

test("disposes all model listeners and rejects later opens", async () => {
  const sync = new LspDocumentSync(async () => undefined, 2);
  const model = new FakeModel({ toString: () => "file:///workspace/main.nf" }, "main");
  await sync.open(model);
  sync.dispose();
  assert.equal(model.listenerCount, 0);
  assert.equal(sync.getOpenModels().length, 0);
  await assert.rejects(sync.open(model), /disposed/);
});

test("reports synchronous change-notification failures and stops sending deltas", async () => {
  const failures: unknown[] = [];
  const messages: string[] = [];
  const sync = new LspDocumentSync((method) => {
    messages.push(method);
    if (method === "textDocument/didChange") throw new Error("message too large");
    return Promise.resolve();
  }, 2, (error) => failures.push(error));
  const model = new FakeModel({ toString: () => "file:///workspace/main.nf" }, "main");
  await sync.open(model);

  model.change("first change", [rangedChange(4, "!")]);
  model.change("second change", [rangedChange(5, "!")]);
  assert.deepEqual(messages, ["textDocument/didOpen", "textDocument/didChange"]);
  assert.equal(failures.length, 1);
  assert.match(String(failures[0]), /message too large/);
  assert.equal(model.listenerCount, 0);
  sync.dispose();
});

test("reports rejected change-notification promises and stops later deltas", async () => {
  const failures: unknown[] = [];
  const messages: string[] = [];
  const sync = new LspDocumentSync((method) => {
    messages.push(method);
    return method === "textDocument/didChange"
      ? Promise.reject(new Error("IPC send failed"))
      : Promise.resolve();
  }, 2, (error) => failures.push(error));
  const model = new FakeModel({ toString: () => "file:///workspace/main.nf" }, "main");
  await sync.open(model);

  model.change("first change", [rangedChange(4, "!")]);
  await new Promise<void>((resolve) => setImmediate(resolve));
  model.change("second change", [rangedChange(5, "!")]);
  assert.deepEqual(messages, ["textDocument/didOpen", "textDocument/didChange"]);
  assert.equal(failures.length, 1);
  assert.match(String(failures[0]), /IPC send failed/);
  assert.equal(model.listenerCount, 0);
  sync.dispose();
});
