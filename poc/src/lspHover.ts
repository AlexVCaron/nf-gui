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

export async function resolveHoverContents<T>(
  diagnosticContents: readonly T[],
  requestServerHover: (signal: AbortSignal) => Promise<readonly T[]>,
  cancellationSignal: AbortSignal,
  timeoutMs: number,
): Promise<T[]> {
  if (diagnosticContents.length > 0) return [...diagnosticContents];
  if (cancellationSignal.aborted) return [];

  const requestController = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let onCancel: (() => void) | undefined;
  const cancelledOrTimedOut = new Promise<T[]>((resolve) => {
    onCancel = () => {
      requestController.abort();
      resolve([]);
    };
    cancellationSignal.addEventListener("abort", onCancel, { once: true });
    timeout = setTimeout(() => {
      requestController.abort();
      resolve([]);
    }, timeoutMs);
  });

  try {
    return [...await Promise.race([
      requestServerHover(requestController.signal),
      cancelledOrTimedOut,
    ])];
  } catch {
    return [];
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    if (onCancel) cancellationSignal.removeEventListener("abort", onCancel);
  }
}
