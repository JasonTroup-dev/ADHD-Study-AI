import { createAdminClient } from "@/lib/supabase/admin";
import { reportServerError } from "@/lib/monitoring/server";
import { getPaddleClient, getPaddleWebhookSecret } from "@/lib/paddle/server";
import {
  isPaddleSubscriptionEvent,
  parsePaddleSubscriptionEvent,
} from "@/lib/paddle/subscriptionEvent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("paddle-signature");
  if (!signature) {
    return Response.json({ error: "Missing Paddle signature." }, { status: 400 });
  }

  const rawBody = await request.text();

  try {
    const event = await getPaddleClient().webhooks.unmarshal(
      rawBody,
      getPaddleWebhookSecret(),
      signature,
    );

    if (!isPaddleSubscriptionEvent(event.eventType)) {
      return Response.json({ received: true });
    }

    const subscription = parsePaddleSubscriptionEvent(event.data);
    if (!subscription) {
      return Response.json(
        { error: "Unsupported subscription payload." },
        { status: 422 },
      );
    }

    const admin = createAdminClient();
    let userId = subscription.userId;

    if (!userId) {
      const { data: existing, error: lookupError } = await admin
        .from("billing_subscriptions")
        .select("user_id")
        .eq("paddle_subscription_id", subscription.subscriptionId)
        .maybeSingle();

      if (lookupError) throw lookupError;
      userId = existing?.user_id ?? null;
    }

    if (!userId) {
      return Response.json(
        { error: "Subscription is missing its Supabase user mapping." },
        { status: 422 },
      );
    }

    const { data: processed, error } = await admin.rpc(
      "process_paddle_subscription_event",
      {
        p_customer_id: subscription.customerId,
        p_event_id: event.eventId,
        p_event_type: event.eventType,
        p_next_billed_at: subscription.nextBilledAt,
        p_occurred_at: event.occurredAt,
        p_price_id: subscription.priceId,
        p_scheduled_change: subscription.scheduledChange,
        p_status: subscription.status,
        p_subscription_id: subscription.subscriptionId,
        p_user_id: userId,
      },
    );

    if (error) throw error;

    return Response.json({ received: true, processed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isSignatureError = /signature/i.test(message);

    if (!isSignatureError) {
      await reportServerError(error, {
        source: "paddle-webhook",
        route: "/api/paddle/webhook",
      });
    }

    return Response.json(
      { error: isSignatureError ? "Invalid Paddle signature." : "Webhook processing failed." },
      { status: isSignatureError ? 400 : 500 },
    );
  }
}
