export function isCurrentDiagnosticsNotification(
  params: unknown,
  uri: string,
  documentVersion: number,
): params is { uri: string; diagnostics: unknown[]; version?: number } {
  if (!isRecord(params) || params.uri !== uri || !Array.isArray(params.diagnostics)) {
    return false;
  }
  if (params.version === undefined) return true;
  return Number.isSafeInteger(params.version) &&
    (params.version as number) >= 0 &&
    params.version === documentVersion;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
