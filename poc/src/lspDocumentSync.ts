type ContentChange = {
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

export interface SyncableTextModel {
  uri: { toString(): string };
  getVersionId(): number;
  getValue(): string;
  onDidChangeContent(listener: (event: { changes: ContentChange[] }) => void): {
    dispose(): void;
  };
}

type OpenDocument = {
  model: SyncableTextModel;
  lastVersion: number;
  subscription: { dispose(): void };
};

export class LspDocumentSync {
  private readonly documents = new Map<string, OpenDocument>();
  private disposed = false;
  private readonly notify: (method: string, params: unknown) => Promise<void>;
  private readonly changeKind: number;

  constructor(
    notify: (method: string, params: unknown) => Promise<void>,
    changeKind: number,
  ) {
    this.notify = notify;
    this.changeKind = changeKind;
  }

  getModel(uri: string): SyncableTextModel | undefined {
    return this.documents.get(uri)?.model;
  }

  getOpenModels(): SyncableTextModel[] {
    return [...this.documents.values()].map(({ model }) => model);
  }

  async open(model: SyncableTextModel): Promise<void> {
    if (this.disposed) throw new Error("Document synchronization is disposed");
    const uri = model.uri.toString();
    const existing = this.documents.get(uri);
    if (existing) {
      if (existing.model !== model) throw new Error(`A different model is already open for ${uri}`);
      return;
    }

    const document: OpenDocument = {
      model,
      lastVersion: model.getVersionId(),
      subscription: { dispose: () => undefined },
    };
    document.subscription = model.onDidChangeContent(({ changes }) => {
      const version = model.getVersionId();
      if (version <= document.lastVersion) return;
      document.lastVersion = version;
      if (this.changeKind !== 1 && this.changeKind !== 2) return;

      const replaceDocument = this.changeKind === 1 || changes.some(({ range }) => !range);
      const contentChanges = replaceDocument
        ? [{ text: model.getValue() }]
        : changes
            .slice()
            .sort((left, right) => right.rangeOffset - left.rangeOffset)
            .map(({ range, rangeLength, text }) => ({
              range: {
                start: {
                  line: range!.startLineNumber - 1,
                  character: range!.startColumn - 1,
                },
                end: {
                  line: range!.endLineNumber - 1,
                  character: range!.endColumn - 1,
                },
              },
              rangeLength,
              text,
            }));
      void this.notify("textDocument/didChange", {
        textDocument: { uri, version },
        contentChanges,
      }).catch(() => undefined);
    });
    this.documents.set(uri, document);

    try {
      await this.notify("textDocument/didOpen", {
        textDocument: {
          uri,
          languageId: "nextflow",
          version: document.lastVersion,
          text: model.getValue(),
        },
      });
    } catch (error) {
      if (this.documents.get(uri) === document) this.documents.delete(uri);
      document.subscription.dispose();
      throw error;
    }
  }

  async close(model: SyncableTextModel): Promise<boolean> {
    const uri = model.uri.toString();
    const document = this.documents.get(uri);
    if (!document || document.model !== model) return false;
    this.documents.delete(uri);
    document.subscription.dispose();
    await this.notify("textDocument/didClose", { textDocument: { uri } });
    return true;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const { subscription } of this.documents.values()) subscription.dispose();
    this.documents.clear();
  }
}
