import * as monaco from "monaco-editor/editor/editor.api.js";
import { startLspTransport, type LspTransport } from "./lspTransport";
import { LspRpcClient } from "./lspProtocol";
import { normalizeCompletionResult, type LspCompletionItem } from "./lspCompletion";
import { isCurrentDiagnosticsNotification } from "./lspDiagnostics";
import { LspDocumentSync, type SyncableTextModel } from "./lspDocumentSync";

type ServerCapabilities = {
  completionProvider?: { triggerCharacters?: string[] } | boolean;
  hoverProvider?: boolean | object;
  textDocumentSync?: number | { openClose?: boolean; change?: number };
};

type LspDiagnostic = {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  message: string;
  severity?: number;
  source?: string;
  code?: string | number;
};

type LspHover = {
  contents?: string | { kind?: string; language?: string; value: string } |
    Array<string | { kind?: string; language?: string; value: string }>;
  range?: LspDiagnostic["range"];
};

export interface LspEditorSession {
  readonly isActive: boolean;
  openDocument(model: monaco.editor.ITextModel): Promise<void>;
  closeDocument(model: monaco.editor.ITextModel): Promise<void>;
  stop(): Promise<void>;
}

export async function connectLspEditor(
  model: monaco.editor.ITextModel,
  onStderr: (chunk: Uint8Array) => void,
  onExit: (reason: string) => void,
): Promise<LspEditorSession> {
  let client: LspRpcClient | undefined;
  let transport: LspTransport | undefined;
  let removeDiagnosticListener: () => void = () => {};
  let documents: LspDocumentSync | undefined;
  let hoverProvider: monaco.IDisposable | undefined;
  let completionProvider: monaco.IDisposable | undefined;
  let stopped = false;
  let stopping = false;
  let exitReported = false;
  const removeDiagnostics = (target: monaco.editor.ITextModel) =>
    monaco.editor.setModelMarkers(target, "nextflow-lsp", []);
  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    hoverProvider?.dispose();
    hoverProvider = undefined;
    completionProvider?.dispose();
    completionProvider = undefined;
    removeDiagnosticListener();
    for (const openModel of documents?.getOpenModels() ?? [model]) {
      removeDiagnostics(openModel as monaco.editor.ITextModel);
    }
    documents?.dispose();
    client?.close();
  };
  const reportExit = (reason: string) => {
    if (exitReported) return;
    exitReported = true;
    cleanup();
    onExit(reason);
  };
  const failSession = (error: unknown) => {
    if (stopped || stopping) return;
    const reason = error instanceof Error ? error.message : "Document synchronization failed";
    cleanup();
    void transport?.stop().catch(() => undefined).finally(() => reportExit(reason));
  };

  try {
    transport = await startLspTransport(
      (message) => client?.receive(message),
      onStderr,
      (reason) => {
        if (stopping) return;
        reportExit(reason);
      },
    );
    if (stopped) throw new Error("Language server exited during startup");
    client = new LspRpcClient(transport.send);

    removeDiagnosticListener = client.onNotification(
      "textDocument/publishDiagnostics",
      (params) => {
        if (!isRecord(params) || typeof params.uri !== "string") return;
        const target = documents?.getModel(params.uri) as monaco.editor.ITextModel | undefined;
        if (
          !target ||
          !isCurrentDiagnosticsNotification(params, params.uri, target.getVersionId())
        ) return;
        const diagnostics = params.diagnostics.filter(isDiagnostic);
        monaco.editor.setModelMarkers(
          target,
          "nextflow-lsp",
          diagnostics.map((diagnostic) => ({
            severity: markerSeverity(diagnostic.severity),
            message: diagnostic.message,
            source: diagnostic.source,
            code: diagnostic.code === undefined ? undefined : String(diagnostic.code),
            startLineNumber: diagnostic.range.start.line + 1,
            startColumn: diagnostic.range.start.character + 1,
            endLineNumber: diagnostic.range.end.line + 1,
            endColumn: diagnostic.range.end.character + 1,
          })),
        );
      },
    );

    const initialized = await client.request("initialize", {
      processId: null,
      clientInfo: { name: "nf-gui-poc", version: "0.1.0" },
      locale: "en",
      rootUri: null,
      capabilities: {
        textDocument: {
          completion: {
            completionItem: { snippetSupport: true, documentationFormat: ["markdown", "plaintext"] },
          },
          hover: { dynamicRegistration: false, contentFormat: ["markdown", "plaintext"] },
          publishDiagnostics: { relatedInformation: true },
          synchronization: { dynamicRegistration: false, didSave: false },
        },
        workspace: { workspaceFolders: false },
      },
      trace: "off",
    });
    const capabilities = isRecord(initialized) && isRecord(initialized.capabilities)
      ? initialized.capabilities as ServerCapabilities
      : {};

    await client.notify("initialized", {});
    const changeKind = typeof capabilities.textDocumentSync === "number"
      ? capabilities.textDocumentSync
      : capabilities.textDocumentSync?.change ?? 0;
    documents = new LspDocumentSync(
      (method, params) => client!.notify(method, params),
      changeKind,
      failSession,
    );
    await documents.open(model);
    if (stopped) throw new Error("Language server exited during startup");

    hoverProvider = capabilities.hoverProvider
      ? monaco.languages.registerHoverProvider("nextflow", {
          provideHover: async (hoverModel, position, token) => {
            const hoverUri = hoverModel.uri.toString();
            if (documents?.getModel(hoverUri) !== hoverModel) return null;
            const requestedVersion = hoverModel.getVersionId();
            const controller = new AbortController();
            const cancellation = token.onCancellationRequested(() => controller.abort());
            try {
              const result = await client?.request(
                "textDocument/hover",
                {
                  textDocument: { uri: hoverUri },
                  position: { line: position.lineNumber - 1, character: position.column - 1 },
                },
                { signal: controller.signal },
              ) as LspHover | null | undefined;
              if (!result?.contents || hoverModel.getVersionId() !== requestedVersion) return null;
              return {
                contents: normalizeHoverContents(result.contents),
                range: result.range ? toMonacoRange(result.range) : undefined,
              };
            } catch {
              return null;
            } finally {
              cancellation.dispose();
            }
          },
        })
      : undefined;

    const completionCapability = capabilities.completionProvider;
    completionProvider = completionCapability
      ? monaco.languages.registerCompletionItemProvider("nextflow", {
          triggerCharacters:
            typeof completionCapability === "object"
              ? completionCapability.triggerCharacters
              : undefined,
          provideCompletionItems: async (completionModel, position, context, token) => {
            const completionUri = completionModel.uri.toString();
            if (documents?.getModel(completionUri) !== completionModel) return { suggestions: [] };
            const requestedVersion = completionModel.getVersionId();
            const controller = new AbortController();
            const cancellation = token.onCancellationRequested(() => controller.abort());
            try {
              const result = await client?.request(
                "textDocument/completion",
                {
                  textDocument: { uri: completionUri },
                  position: { line: position.lineNumber - 1, character: position.column - 1 },
                  context: {
                    triggerKind: context.triggerKind + 1,
                    triggerCharacter: context.triggerCharacter,
                  },
                },
                { signal: controller.signal },
              );
              if (completionModel.getVersionId() !== requestedVersion) return { suggestions: [] };
              const { items, incomplete } = normalizeCompletionResult(result);
              const word = completionModel.getWordUntilPosition(position);
              const defaultRange = new monaco.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn,
              );
              return {
                suggestions: items.map((item) => toMonacoCompletion(item, defaultRange)),
                incomplete,
              };
            } catch {
              return { suggestions: [] };
            } finally {
              cancellation.dispose();
            }
          },
        })
      : undefined;

    return {
      get isActive() {
        return !stopped && !stopping;
      },
      openDocument: async (documentModel) => {
        if (stopped || stopping || !documents) throw new Error("Language server session is inactive");
        await documents.open(documentModel as SyncableTextModel);
      },
      closeDocument: async (documentModel) => {
        if (!documents) return;
        if (await documents.close(documentModel as SyncableTextModel)) {
          removeDiagnostics(documentModel);
        }
      },
      stop: async () => {
        if (stopped || stopping) return;
        stopping = true;
        hoverProvider?.dispose();
        hoverProvider = undefined;
        completionProvider?.dispose();
        completionProvider = undefined;
        removeDiagnosticListener();
        removeDiagnosticListener = () => undefined;
        for (const openModel of documents?.getOpenModels() ?? [model]) {
          removeDiagnostics(openModel as monaco.editor.ITextModel);
        }
        try {
          for (const openModel of documents?.getOpenModels() ?? [model]) {
            await documents?.close(openModel as SyncableTextModel);
          }
          await client?.request("shutdown", null, { timeoutMs: 2_000 });
          await client?.notify("exit", null);
        } catch {
          await client?.notify("exit", null).catch(() => undefined);
        } finally {
          cleanup();
          await transport?.stop().catch(() => undefined);
        }
      },
    };
  } catch (error) {
    cleanup();
    await transport?.stop().catch(() => undefined);
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDiagnostic(value: unknown): value is LspDiagnostic {
  if (!isRecord(value) || typeof value.message !== "string" || !isRecord(value.range)) return false;
  const { start, end } = value.range;
  return isPosition(start) && isPosition(end);
}

function isPosition(value: unknown): value is { line: number; character: number } {
  return isRecord(value) &&
    Number.isInteger(value.line) && Number.isInteger(value.character) &&
    (value.line as number) >= 0 && (value.character as number) >= 0;
}

function markerSeverity(severity?: number): monaco.MarkerSeverity {
  switch (severity) {
    case 1: return monaco.MarkerSeverity.Error;
    case 2: return monaco.MarkerSeverity.Warning;
    case 3: return monaco.MarkerSeverity.Info;
    case 4: return monaco.MarkerSeverity.Hint;
    default: return monaco.MarkerSeverity.Info;
  }
}

function toMonacoRange(range: LspDiagnostic["range"]): monaco.Range {
  return new monaco.Range(
    range.start.line + 1,
    range.start.character + 1,
    range.end.line + 1,
    range.end.character + 1,
  );
}

function normalizeHoverContents(
  contents: NonNullable<LspHover["contents"]>,
): monaco.IMarkdownString[] {
  const items = Array.isArray(contents) ? contents : [contents];
  return items.map((item) => ({
    value: typeof item === "string" ? item : item.value,
    isTrusted: false,
    supportHtml: false,
  }));
}

function toMonacoCompletion(
  item: LspCompletionItem,
  defaultRange: monaco.Range,
): monaco.languages.CompletionItem {
  const label = typeof item.label === "string" ? item.label : item.label.label;
  const completion: monaco.languages.CompletionItem = {
    label: typeof item.label === "string" ? item.label : {
      label,
      detail: item.label.detail,
      description: item.label.description,
    },
    kind: completionKind(item.kind),
    insertText: item.textEdit?.newText ?? item.insertText ?? label,
    range: item.textEdit ? toMonacoRange(item.textEdit.range) : defaultRange,
    detail: item.detail,
    documentation: item.documentation
      ? typeof item.documentation === "string"
        ? { value: item.documentation, isTrusted: false, supportHtml: false }
        : { value: item.documentation.value, isTrusted: false, supportHtml: false }
      : undefined,
    sortText: item.sortText,
    filterText: item.filterText,
    preselect: item.preselect,
    commitCharacters: item.commitCharacters,
    tags: item.deprecated || item.tags?.includes(1)
      ? [monaco.languages.CompletionItemTag.Deprecated]
      : undefined,
    insertTextRules: item.insertTextFormat === 2
      ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      : undefined,
    additionalTextEdits: item.additionalTextEdits?.map((edit) => ({
      range: toMonacoRange(edit.range),
      text: edit.newText,
    })),
  };
  return completion;
}

function completionKind(kind?: number): monaco.languages.CompletionItemKind {
  const kinds: Record<number, monaco.languages.CompletionItemKind> = {
    1: monaco.languages.CompletionItemKind.Text,
    2: monaco.languages.CompletionItemKind.Method,
    3: monaco.languages.CompletionItemKind.Function,
    4: monaco.languages.CompletionItemKind.Constructor,
    5: monaco.languages.CompletionItemKind.Field,
    6: monaco.languages.CompletionItemKind.Variable,
    7: monaco.languages.CompletionItemKind.Class,
    8: monaco.languages.CompletionItemKind.Interface,
    9: monaco.languages.CompletionItemKind.Module,
    10: monaco.languages.CompletionItemKind.Property,
    11: monaco.languages.CompletionItemKind.Unit,
    12: monaco.languages.CompletionItemKind.Value,
    13: monaco.languages.CompletionItemKind.Enum,
    14: monaco.languages.CompletionItemKind.Keyword,
    15: monaco.languages.CompletionItemKind.Snippet,
    16: monaco.languages.CompletionItemKind.Color,
    17: monaco.languages.CompletionItemKind.File,
    18: monaco.languages.CompletionItemKind.Reference,
    19: monaco.languages.CompletionItemKind.Folder,
    20: monaco.languages.CompletionItemKind.EnumMember,
    21: monaco.languages.CompletionItemKind.Constant,
    22: monaco.languages.CompletionItemKind.Struct,
    23: monaco.languages.CompletionItemKind.Event,
    24: monaco.languages.CompletionItemKind.Operator,
    25: monaco.languages.CompletionItemKind.TypeParameter,
  };
  return (kind && kinds[kind]) || monaco.languages.CompletionItemKind.Text;
}
