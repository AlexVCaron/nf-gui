import { useEffect, useRef, useState, type MouseEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import * as monaco from "monaco-editor/editor/editor.api.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import { connectLspEditor, type LspEditorSession } from "./lspEditor";
import "monaco-editor/min/vs/editor/editor.main.css";
import "@xyflow/react/dist/style.css";
import "./App.css";

if (!monaco.languages.getLanguages().some(({ id }) => id === "nextflow")) {
  monaco.languages.register({ id: "nextflow", extensions: [".nf"], aliases: ["Nextflow"] });
}

(
  globalThis as typeof globalThis & {
    MonacoEnvironment: { getWorker: () => Worker };
  }
).MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};

const sampleSource = `nextflow.enable.dsl = 2

params.reads = "data/*.fastq.gz"

process FASTQC {
    input:
    path reads

    output:
    path "*.html"

    script:
    """
    fastqc \${reads}
    """
}

workflow {
    reads = Channel.fromPath(params.reads)
    FASTQC(reads)
}
`;

type WorkspaceSnapshot = {
  name: string;
  rootPath: string;
  documents: Array<{
    relativePath: string;
    absolutePath: string;
    content: string;
  }>;
};

type WorkspaceFile = {
  relativePath: string;
  uri: string;
  model: monaco.editor.ITextModel;
};

const initialNodes: Node[] = [
  {
    id: "source",
    type: "input",
    position: { x: 70, y: 120 },
    data: { label: "FASTQ files" },
  },
  {
    id: "fastqc",
    position: { x: 350, y: 120 },
    data: { label: "FASTQC" },
  },
  {
    id: "reports",
    type: "output",
    position: { x: 630, y: 120 },
    data: { label: "HTML reports" },
  },
];

const initialEdges: Edge[] = [
  { id: "source-fastqc", source: "source", target: "fastqc", animated: false },
  { id: "fastqc-reports", source: "fastqc", target: "reports", animated: false },
];

function blockExternalNavigation(event: MouseEvent<HTMLDivElement>) {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest("a[href]");
  const href = link?.getAttribute("href");
  if (href && new URL(href, window.location.href).origin !== window.location.origin) {
    event.preventDefault();
  }
}

function App() {
  const editorElement = useRef<HTMLDivElement>(null);
  const editorInstance = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const lspSession = useRef<LspEditorSession | null>(null);
  const documentModels = useRef(new Map<string, monaco.editor.ITextModel>());
  const documentBaselines = useRef(new Map<string, string>());
  const workspaceRoot = useRef<string | null>(null);
  const editorGeneration = useRef(0);
  const serverOperationInFlight = useRef(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [activeUri, setActiveUri] = useState("");
  const [hasEdits, setHasEdits] = useState(false);
  const [languageServerStatus, setLanguageServerStatus] = useState<
    "disconnected" | "connecting" | "connected" | "stopping" | "error"
  >("disconnected");
  const [languageServerError, setLanguageServerError] = useState("");

  useEffect(() => {
    if (!editorElement.current) return;
    editorGeneration.current += 1;
    const model = monaco.editor.createModel(
      sampleSource,
      "nextflow",
      monaco.Uri.parse("file:///nf-gui/main.nf"),
    );
    documentModels.current.set(model.uri.toString(), model);
    documentBaselines.current.set(model.uri.toString(), sampleSource);
    setActiveUri(model.uri.toString());

    const editor = monaco.editor.create(editorElement.current, {
      model,
      theme: "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      scrollBeyondLastLine: false,
      wordWrap: "on",
      ariaLabel: "Nextflow source prototype",
    });

    editorInstance.current = editor;
    const changeSubscription = editor.onDidChangeModelContent(() => {
      const activeModel = editor.getModel();
      const activeModelUri = activeModel?.uri.toString();
      setHasEdits(
        Boolean(activeModel && activeModelUri &&
          activeModel.getValue() !== documentBaselines.current.get(activeModelUri)),
      );
    });

    return () => {
      editorGeneration.current += 1;
      void lspSession.current?.stop();
      lspSession.current = null;
      changeSubscription.dispose();
      editor.dispose();
      for (const documentModel of documentModels.current.values()) documentModel.dispose();
      documentModels.current.clear();
      documentBaselines.current.clear();
      editorInstance.current = null;
    };
  }, []);

  async function openWorkspace() {
    if (serverOperationInFlight.current) return;
    serverOperationInFlight.current = true;
    setLanguageServerError("");

    try {
      const hasUnsavedDocuments = [...documentModels.current.entries()].some(
        ([uri, model]) => model.getValue() !== documentBaselines.current.get(uri),
      );
      if (hasUnsavedDocuments &&
          !window.confirm("Opening another workspace will discard unsaved in-memory edits. Continue?")) {
        return;
      }
      const workspace = await invoke<WorkspaceSnapshot | null>("workspace_open");
      if (!workspace) return;
      if (workspace.documents.length === 0) {
        throw new Error("The selected workspace has no Nextflow files");
      }

      editorGeneration.current += 1;
      const existingSession = lspSession.current;
      lspSession.current = null;
      if (existingSession) {
        setLanguageServerStatus("stopping");
        await existingSession.stop();
      }

      const editor = editorInstance.current;
      if (!editor) throw new Error("The source editor is not ready");
      editor.setModel(null);
      for (const model of documentModels.current.values()) model.dispose();
      documentModels.current.clear();
      documentBaselines.current.clear();

      const files = workspace.documents.map(({ relativePath, absolutePath, content }) => {
        const model = monaco.editor.createModel(
          content,
          "nextflow",
          monaco.Uri.file(absolutePath),
        );
        const uri = model.uri.toString();
        documentModels.current.set(uri, model);
        documentBaselines.current.set(uri, content);
        return { relativePath, uri, model };
      });

      workspaceRoot.current = workspace.rootPath;
      setWorkspaceName(workspace.name);
      setWorkspaceFiles(files);
      setActiveUri(files[0].uri);
      editor.setModel(files[0].model);
      setHasEdits(false);
      setLanguageServerStatus("disconnected");
    } catch (error) {
      setLanguageServerError(error instanceof Error ? error.message : "Could not open workspace");
    } finally {
      serverOperationInFlight.current = false;
    }
  }

  function selectDocument(file: WorkspaceFile) {
    const model = documentModels.current.get(file.uri);
    if (!model || !editorInstance.current) return;
    editorInstance.current.setModel(model);
    setActiveUri(file.uri);
    setHasEdits(model.getValue() !== documentBaselines.current.get(file.uri));
    void lspSession.current?.openDocument(model).catch((error: unknown) => {
      setLanguageServerError(
        error instanceof Error ? error.message : "Could not synchronize the selected document",
      );
    });
  }

  async function toggleLanguageServer() {
    if (serverOperationInFlight.current) return;
    serverOperationInFlight.current = true;
    const generation = editorGeneration.current;

    try {
      if (lspSession.current) {
        const session = lspSession.current;
        lspSession.current = null;
        setLanguageServerStatus("stopping");
        await session.stop();
        if (generation === editorGeneration.current) {
          setLanguageServerStatus("disconnected");
          setLanguageServerError("");
        }
        return;
      }

      const model = editorInstance.current?.getModel();
      if (!model) return;
      setLanguageServerStatus("connecting");
      setLanguageServerError("");
      try {
        const session = await connectLspEditor(
          model,
          () => undefined,
          (reason) => {
            if (generation !== editorGeneration.current) return;
            lspSession.current = null;
            setLanguageServerStatus("error");
            setLanguageServerError(`Language server stopped: ${reason}`);
          },
          workspaceRoot.current ?? undefined,
        );
        if (generation !== editorGeneration.current || !session.isActive) {
          await session.stop();
          return;
        }
        lspSession.current = session;
        setLanguageServerStatus("connected");
      } catch (error) {
        if (generation !== editorGeneration.current) return;
        setLanguageServerStatus("error");
        setLanguageServerError(
          error instanceof Error ? error.message : "Could not start the language server",
        );
      }
    } finally {
      serverOperationInFlight.current = false;
    }
  }

  function resetSample() {
    const model = documentModels.current.get("file:///nf-gui/main.nf");
    if (!model) return;
    model.setValue(sampleSource);
    documentBaselines.current.set(model.uri.toString(), sampleSource);
    setHasEdits(false);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">nf</span>
          <div>
            <strong>Nextflow GUI</strong>
            <span className="prototype-label">PROTOTYPE</span>
          </div>
        </div>
        <div className="workspace-title">
          <span className="status-dot" />
          {workspaceName || "Untitled workflow"}
          {hasEdits && <span className="dirty-indicator">Unsaved edits</span>}
        </div>
        <div className="topbar-actions">
          <button
            className="open-workspace-button"
            type="button"
            onClick={() => void openWorkspace()}
            disabled={languageServerStatus === "connecting" || languageServerStatus === "stopping"}
          >
            Open project
          </button>
         <button
           className="language-server-button"
           type="button"
           onClick={() => void toggleLanguageServer()}
           disabled={
             languageServerStatus === "connecting" || languageServerStatus === "stopping"
           }
           title={languageServerError || undefined}
         >
           {languageServerStatus === "connecting"
             ? "Connecting…"
             : languageServerStatus === "stopping"
               ? "Stopping…"
               : languageServerStatus === "connected"
                 ? "Stop language server"
                 : languageServerStatus === "error"
                   ? "Retry language server"
                   : "Connect language server"}
         </button>
         {!workspaceName &&
           <button className="reset-button" type="button" onClick={resetSample}>
             Reset sample
           </button>}
        </div>
      </header>

      <div className="workspace">
        <aside className="file-rail" aria-label="Workspace files">
          <div className="rail-heading">WORKSPACE</div>
          {workspaceFiles.length > 0
            ? workspaceFiles.map((file) => (
                <button
                  className={`file-item${activeUri === file.uri ? " selected" : ""}`}
                  type="button"
                  aria-current={activeUri === file.uri ? "page" : undefined}
                  key={file.uri}
                  onClick={() => selectDocument(file)}
                  title={file.relativePath}
                  disabled={languageServerStatus === "connecting" || languageServerStatus === "stopping"}
                >
                  <span className="file-icon">N</span>
                  <span className="file-name">{file.relativePath}</span>
                  {file.model.getValue() !== documentBaselines.current.get(file.uri) &&
                    <span className="file-dirty" aria-label="Unsaved changes">●</span>}
                </button>
              ))
            : <button
                className="file-item selected"
                type="button"
                aria-current="page"
              >
                <span className="file-icon">N</span> main.nf
              </button>}
          <div className="rail-note">
            {workspaceName ? "Edits stay in memory; files are not saved" : "Local sample only"}
          </div>
        </aside>

        <section className="editor-panel" aria-label="Workflow source">
          <div className="panel-heading">
            <div className="tab active">
              <span className="file-icon">N</span>
              {workspaceFiles.find((file) => file.uri === activeUri)?.relativePath ?? "main.nf"}
            </div>
            <span className="panel-meta" aria-live="polite">
              {languageServerError || (languageServerStatus === "connected"
                ? "Nextflow language server connected"
                : workspaceName
                  ? "Workspace buffer · language server disconnected"
                  : "Sample buffer · language server disconnected")}
            </span>
          </div>
          <div className="editor-host" ref={editorElement} />
          <div className="statusbar">
            <span>
              {languageServerStatus === "connected"
                ? "In-memory document · diagnostics and hover enabled"
                : workspaceName
                  ? "Workspace source · changes are not saved to disk"
                  : "Prototype buffer · changes are not saved"}
            </span>
            <span>UTF-8&nbsp;&nbsp; LF</span>
          </div>
        </section>

        <section className="graph-panel" aria-label="Static workflow graph">
          <div className="panel-heading graph-heading">
            <div>
              <strong>Workflow preview</strong>
              <span className="static-badge">STATIC SAMPLE</span>
            </div>
            <span className="panel-meta">Illustrative only</span>
          </div>
          <div className="graph-canvas" onClickCapture={blockExternalNavigation}>
            <ReactFlow
              nodes={initialNodes}
              edges={initialEdges}
              fitView
              fitViewOptions={{ padding: 0.24 }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
            >
              <Background color="#293241" gap={20} />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
          <div className="graph-note">
            This graph is hard-coded. It does not reflect editor changes or pipeline semantics.
          </div>
        </section>
      </div>

      <footer className="safety-notice">
        <span aria-hidden="true">ⓘ</span>
        No plugins or workflows are run. Workspace edits remain in memory and are not saved.
      </footer>
    </main>
  );
}

export default App;
