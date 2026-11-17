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
import "monaco-editor/min/vs/editor/editor.main.css";
import "@xyflow/react/dist/style.css";
import "./App.css";

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
  const [hasEdits, setHasEdits] = useState(false);

  useEffect(() => {
    if (!editorElement.current) return;

    const editor = monaco.editor.create(editorElement.current, {
      value: sampleSource,
      language: "plaintext",
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
      changeSubscription.dispose();
      editor.dispose();
      editorInstance.current = null;
    };
  }, []);

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
        <button className="reset-button" type="button" onClick={resetSample}>
          Reset sample
        </button>
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
            <span className="panel-meta">Plain text · not connected to a language server</span>
          </div>
          <div className="editor-host" ref={editorElement} />
          <div className="statusbar">
            <span>Prototype buffer · changes are not saved</span>
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
        Prototype only: no files, commands, language server, plugins, or workflows are accessed or run.
      </footer>
    </main>
  );
}

export default App;
