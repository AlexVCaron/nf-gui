export type HoverPosition = {
  lineNumber: number;
  column: number;
};

export type HoverDiagnostic = {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
};

export function diagnosticsAtPosition<T extends HoverDiagnostic>(
  diagnostics: readonly T[],
  position: HoverPosition,
): T[] {
  return diagnostics.filter((diagnostic) => {
    if (position.lineNumber < diagnostic.startLineNumber ||
        position.lineNumber > diagnostic.endLineNumber) return false;
    if (position.lineNumber === diagnostic.startLineNumber &&
        position.column < diagnostic.startColumn) return false;
    if (position.lineNumber === diagnostic.endLineNumber &&
        position.column > diagnostic.endColumn) return false;
    return true;
  });
}
