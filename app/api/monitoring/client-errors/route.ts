import { reportServerError } from "@/lib/monitoring/server";

const ALLOWED_KINDS = new Set([
  "error-boundary",
  "global-error-boundary",
  "uncaught-error",
  "unhandled-rejection",
]);

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 4_096) {
    return Response.json({ error: "Payload too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!isClientError(body)) {
    return Response.json({ error: "Invalid error report." }, { status: 400 });
  }

  await reportServerError(new Error(body.errorType), {
    source: "browser",
    kind: body.kind,
    clientErrorType: body.errorType,
  });

  return new Response(null, { status: 204 });
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function isClientError(
  body: unknown,
): body is { kind: string; errorType: string } {
  if (typeof body !== "object" || body === null) return false;

  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.kind === "string"
    && ALLOWED_KINDS.has(candidate.kind)
    && typeof candidate.errorType === "string"
    && candidate.errorType.length <= 80
    && /^[a-zA-Z0-9_. -]+$/.test(candidate.errorType)
  );
}
