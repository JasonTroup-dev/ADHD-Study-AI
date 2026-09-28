import { describe, expect, it } from "vitest";

import {
  isPaddleSubscriptionEvent,
  parsePaddleSubscriptionEvent,
} from "@/lib/paddle/subscriptionEvent";

const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("Paddle subscription events", () => {
  it("recognizes lifecycle events", () => {
    expect(isPaddleSubscriptionEvent("subscription.created")).toBe(true);
    expect(isPaddleSubscriptionEvent("subscription.updated")).toBe(true);
    expect(isPaddleSubscriptionEvent("transaction.completed")).toBe(false);
  });

  it("extracts the trusted subscription fields", () => {
    expect(
      parsePaddleSubscriptionEvent({
        id: "sub_123",
        customerId: "ctm_123",
        status: "active",
        nextBilledAt: "2026-09-29T00:00:00Z",
        customData: { supabase_user_id: USER_ID },
        items: [{ price: { id: "pri_123" } }],
        scheduledChange: { action: "cancel" },
      }),
    ).toEqual({
      customerId: "ctm_123",
      nextBilledAt: "2026-09-29T00:00:00Z",
      priceId: "pri_123",
      scheduledChange: "cancel",
      status: "active",
      subscriptionId: "sub_123",
      userId: USER_ID,
    });
  });

  it("does not trust malformed user metadata", () => {
    const parsed = parsePaddleSubscriptionEvent({
      id: "sub_123",
      customerId: "ctm_123",
      status: "trialing",
      customData: { supabase_user_id: "not-a-uuid" },
      items: [],
    });

    expect(parsed?.userId).toBeNull();
  });

  it("rejects unsupported subscription states", () => {
    expect(
      parsePaddleSubscriptionEvent({
        id: "sub_123",
        customerId: "ctm_123",
        status: "unknown",
      }),
    ).toBeNull();
  });
});
