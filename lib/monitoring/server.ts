import "server-only";

type MonitoringContext = Record<
  string,
  boolean | number | string | null | undefined
>;

type MonitoringEvent = {
  event: "app.error";
  eventId: string;
  timestamp: string;
  errorType: string;
  context: Record<string, boolean | number | string | null>;
};

const SAFE_LABEL = /[^a-zA-Z0-9_.:/ -]/g;

export async function reportServerError(
  error: unknown,
  context: MonitoringContext,
) {
  const event = createMonitoringEvent(error, context);

  // Vercel Runtime Logs provide the default centralized sink. Deliberately do
  // not include messages, stacks, request bodies, user IDs, or file names.
  console.error(JSON.stringify(event));

  const endpoint = process.env.ERROR_MONITORING_ENDPOINT?.trim();
  if (!endpoint) return;

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.ERROR_MONITORING_TOKEN
          ? { Authorization: `Bearer ${process.env.ERROR_MONITORING_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(event),
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // Monitoring must never mask or extend the original application failure.
  }
}

function createMonitoringEvent(
  error: unknown,
  context: MonitoringContext,
): MonitoringEvent {
  const errorType =
    error instanceof Error ? sanitizeLabel(error.name) : "UnknownError";

  return {
    event: "app.error",
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    errorType,
    context: Object.fromEntries(
      Object.entries(context)
        .filter((entry): entry is [string, boolean | number | string | null] =>
          entry[1] !== undefined,
        )
        .map(([key, value]) => [sanitizeLabel(key), sanitizeContextValue(value)]),
    ),
  };
}

function sanitizeContextValue(value: boolean | number | string | null) {
  if (typeof value !== "string") return value;
  return sanitizeLabel(value);
}

function sanitizeLabel(value: string) {
  return value.replace(SAFE_LABEL, "_").slice(0, 160) || "unknown";
}
