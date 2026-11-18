import * as monaco from "monaco-editor/editor/editor.api.js";
import { startLspTransport, type LspTransport } from "./lspTransport";
import { LspRpcClient } from "./lspProtocol";

type ServerCapabilities = {
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
  contents?: string | { kind: string; value: string } | Array<string | { kind: string; value: string }>;
  range?: LspDiagnostic["range"];
};

export interface LspEditorSession {
  stop(): Promise<void>;
}

export async function connectLspEditor(
  model: monaco.editor.ITextModel,
  onStderr: (chunk: Uint8Array) => void,
): Promise<LspEditorSession> {
  let client: LspRpcClient | undefined;
  let transport: LspTransport | undefined;
  const uri = model.uri.toString();
  const removeDiagnostics = () => monaco.editor.setModelMarkers(model, "nextflow-lsp", []);

  try {
    transport = await startLspTransport(
      (message) => client?.receive(message),
      onStderr,
    );
    client = new LspRpcClient(transport.send);

    const removeDiagnosticListener = client.onNotification(
      "textDocument/publishDiagnostics",
      (params) => {
        if (!isRecord(params) || params.uri !== uri || !Array.isArray(params.diagnostics)) return;
        const diagnostics = params.diagnostics.filter(isDiagnostic);
        monaco.editor.setModelMarkers(
          model,
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
    await client.notify("textDocument/didOpen", {
      textDocument: {
        uri,
        languageId: "nextflow",
        version: model.getVersionId(),
        text: model.getValue(),
      },
    });

    const changeKind = typeof capabilities.textDocumentSync === "number"
      ? capabilities.textDocumentSync
      : capabilities.textDocumentSync?.change ?? 0;
    const changeSubscription = model.onDidChangeContent((event) => {
      if (changeKind !== 1 && changeKind !== 2) return;
      const replaceDocument = changeKind === 1 || event.changes.some((change) => !change.range);
      const contentChanges = replaceDocument
        ? [{ text: model.getValue() }]
        : event.changes
            .slice()
            .sort((left, right) => right.rangeOffset - left.rangeOffset)
            .map((change) => ({
              range: {
                start: {
                  line: change.range!.startLineNumber - 1,
                  character: change.range!.startColumn - 1,
                },
                end: {
                  line: change.range!.endLineNumber - 1,
                  character: change.range!.endColumn - 1,
                },
              },
              rangeLength: change.rangeLength,
              text: change.text,
            }));
      void client?.notify("textDocument/didChange", {
        textDocument: { uri, version: model.getVersionId() },
        contentChanges,
      }).catch(() => undefined);
    });

    const hoverProvider = capabilities.hoverProvider
      ? monaco.languages.registerHoverProvider("nextflow", {
          provideHover: async (_hoverModel, position, token) => {
            const controller = new AbortController();
            const cancellation = token.onCancellationRequested(() => controller.abort());
            try {
              const result = await client?.request(
                "textDocument/hover",
                {
                  textDocument: { uri },
                  position: { line: position.lineNumber - 1, character: position.column - 1 },
                },
                { signal: controller.signal },
              ) as LspHover | null | undefined;
              if (!result?.contents) return null;
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

    let stopped = false;
    return {
      stop: async () => {
        if (stopped) return;
        stopped = true;
        changeSubscription.dispose();
        hoverProvider?.dispose();
        removeDiagnosticListener();
        removeDiagnostics();
        try {
          await client?.notify("textDocument/didClose", { textDocument: { uri } });
          await client?.request("shutdown", null, { timeoutMs: 2_000 });
          await client?.notify("exit", null);
        } catch {
          await client?.notify("exit", null).catch(() => undefined);
        } finally {
          client?.close();
          await transport?.stop().catch(() => undefined);
        }
      },
    };
  } catch (error) {
    client?.close();
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
