import { requireUser } from "@/lib/api/requireUser";
import { reportServerError } from "@/lib/monitoring/server";
import { getPaddleClient, getPaddlePriceId } from "@/lib/paddle/server";

const SUBSCRIBED_STATUSES = ["active", "past_due", "paused", "trialing"];

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  try {
    const { data: currentSubscription, error: subscriptionError } = await auth.supabase
      .from("billing_subscriptions")
      .select("paddle_customer_id,status")
      .maybeSingle();

    if (subscriptionError) throw subscriptionError;
    if (
      currentSubscription
      && SUBSCRIBED_STATUSES.includes(currentSubscription.status)
    ) {
      return Response.json(
        { error: "You already have a subscription. Manage it from billing." },
        { status: 409 },
      );
    }

    const transaction = await getPaddleClient().transactions.create({
      items: [{ priceId: getPaddlePriceId(), quantity: 1 }],
      customerId: currentSubscription?.paddle_customer_id,
      customData: { supabase_user_id: auth.user.id },
    });

    return Response.json({ transactionId: transaction.id });
  } catch (error) {
    await reportServerError(error, {
      source: "paddle-checkout",
      route: "/api/paddle/checkout",
    });

    return Response.json(
      { error: "Checkout is unavailable right now. Please try again shortly." },
      { status: 503 },
    );
  }
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
