type ClientErrorKind =
  | "error-boundary"
  | "global-error-boundary"
  | "uncaught-error"
  | "unhandled-rejection";

export function reportClientError(kind: ClientErrorKind, error?: unknown) {
  const errorType =
    error instanceof Error
      ? error.name.replace(/[^a-zA-Z0-9_. -]/g, "_").slice(0, 80)
      : "UnknownError";

  void fetch("/api/monitoring/client-errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, errorType }),
    keepalive: true,
  }).catch(() => {
    // Error reporting is best-effort and must not create another UI failure.
  });
}
