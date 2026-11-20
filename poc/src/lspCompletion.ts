export type LspCompletionItem = {
  label: string | { label: string; detail?: string; description?: string };
  kind?: number;
  detail?: string;
  documentation?: string | { kind: string; value: string };
  sortText?: string;
  filterText?: string;
  preselect?: boolean;
  insertText?: string;
  insertTextFormat?: number;
  textEdit?: {
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
    newText: string;
  };
  additionalTextEdits?: Array<{
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
    newText: string;
  }>;
  commitCharacters?: string[];
  deprecated?: boolean;
  tags?: number[];
};

export function normalizeCompletionResult(value: unknown): {
  items: LspCompletionItem[];
  incomplete: boolean;
} {
  const isList = !Array.isArray(value) && isRecord(value);
  const items = Array.isArray(value)
    ? value
    : isList && Array.isArray(value.items)
      ? value.items
      : [];
  return {
    items: items.filter(isCompletionItem),
    incomplete: isList && value.isIncomplete === true,
  };
}

function isCompletionItem(value: unknown): value is LspCompletionItem {
  if (!isRecord(value)) return false;
  return typeof value.label === "string" ||
    (isRecord(value.label) && typeof value.label.label === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
