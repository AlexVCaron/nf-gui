import { useEffect, useRef, useState, type MouseEvent } from "react";
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

monaco.languages.register({ id: "nextflow", extensions: [".nf"], aliases: ["Nextflow"] });

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
  const editorGeneration = useRef(0);
  const [hasEdits, setHasEdits] = useState(false);
  const [languageServerStatus, setLanguageServerStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
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
      setHasEdits(editor.getValue() !== sampleSource);
    });

    return () => {
      editorGeneration.current += 1;
      void lspSession.current?.stop();
      lspSession.current = null;
      changeSubscription.dispose();
      editor.dispose();
      model.dispose();
      editorInstance.current = null;
    };
  }, []);

  async function toggleLanguageServer() {
    if (lspSession.current) {
      const session = lspSession.current;
      lspSession.current = null;
      await session.stop();
      setLanguageServerStatus("disconnected");
      setLanguageServerError("");
      return;
    }

    const model = editorInstance.current?.getModel();
    if (!model) return;
    const generation = editorGeneration.current;
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
      );
      if (generation !== editorGeneration.current) {
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
  }

  function resetSample() {
    editorInstance.current?.setValue(sampleSource);
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
          Untitled workflow
          {hasEdits && <span className="dirty-indicator">Unsaved prototype edits</span>}
        </div>
        <div className="topbar-actions">
         <button
           className="language-server-button"
           type="button"
           onClick={() => void toggleLanguageServer()}
           disabled={languageServerStatus === "connecting"}
           title={languageServerError || undefined}
         >
           {languageServerStatus === "connecting"
             ? "Connecting…"
             : languageServerStatus === "connected"
               ? "Stop language server"
               : languageServerStatus === "error"
                 ? "Retry language server"
                 : "Connect language server"}
         </button>
         <button className="reset-button" type="button" onClick={resetSample}>
           Reset sample
         </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="file-rail" aria-label="Prototype workspace files">
          <div className="rail-heading">WORKSPACE</div>
          <button className="file-item selected" type="button" aria-current="page">
            <span className="file-icon">N</span> main.nf
          </button>
          <div className="rail-note">Local sample only</div>
        </aside>

        <section className="editor-panel" aria-label="Workflow source">
          <div className="panel-heading">
            <div className="tab active"><span className="file-icon">N</span> main.nf</div>
            <span className="panel-meta" aria-live="polite">
              {languageServerError || (languageServerStatus === "connected"
                ? "Nextflow language server connected"
                : "Sample buffer · language server disconnected")}
            </span>
          </div>
          <div className="editor-host" ref={editorElement} />
          <div className="statusbar">
            <span>
              {languageServerStatus === "connected"
                ? "Unsaved sample buffer · diagnostics and hover enabled"
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
        Sample workspace only: no project files are opened and no plugins or workflows are run.
      </footer>
    </main>
  );
}

export default App;
