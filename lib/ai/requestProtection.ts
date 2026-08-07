import { createHash } from "node:crypto";

import type { createClient } from "@/lib/supabase/server";

export type AIQuotaKey =
  | "chat"
  | "chat_files"
  | "flashcards"
  | "study_guides";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

type QuotaResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset_at: string;
};

export function createSafetyIdentifier(userId: string) {
  return createHash("sha256")
    .update(`adhd-study-ai:${userId}`)
    .digest("hex");
}

export async function enforceAIQuota(
  supabase: ServerSupabaseClient,
  quota: AIQuotaKey,
): Promise<Response | null> {
  try {
    const { data, error } = await supabase.rpc("consume_ai_quota", {
      requested_quota: quota,
    });

    if (error || !isQuotaResult(data)) {
      return quotaUnavailableResponse(error ?? data);
    }

    if (data.allowed) return null;

    const resetAt = Date.parse(data.reset_at);
    const retryAfterSeconds = Number.isFinite(resetAt)
      ? Math.max(1, Math.ceil((resetAt - Date.now()) / 1_000))
      : 60;

    return Response.json(
      {
        error:
          "You have reached the hourly limit for this feature. Try again later.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(data.limit),
          "X-RateLimit-Remaining": String(data.remaining),
          "X-RateLimit-Reset": data.reset_at,
        },
      },
    );
  } catch (error) {
    return quotaUnavailableResponse(error);
  }
}

function quotaUnavailableResponse(error: unknown) {
  console.error("AI quota check failed:", error);
  return Response.json(
    { error: "Usage limits could not be checked. Try again shortly." },
    { status: 503 },
  );
}

function isQuotaResult(value: unknown): value is QuotaResult {
  if (!isRecord(value)) return false;

  return (
    typeof value.allowed === "boolean"
    && typeof value.limit === "number"
    && Number.isInteger(value.limit)
    && value.limit > 0
    && typeof value.remaining === "number"
    && Number.isInteger(value.remaining)
    && value.remaining >= 0
    && typeof value.reset_at === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
