import { requireUser } from "@/lib/api/requireUser";
import { reportServerError } from "@/lib/monitoring/server";
import { getPaddleClient } from "@/lib/paddle/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  try {
    const { data: subscription, error } = await auth.supabase
      .from("billing_subscriptions")
      .select("paddle_customer_id,paddle_subscription_id")
      .maybeSingle();

    if (error) throw error;
    if (!subscription) {
      return Response.json(
        { error: "No Paddle subscription was found for this account." },
        { status: 404 },
      );
    }

    const session = await getPaddleClient().customerPortalSessions.create(
      subscription.paddle_customer_id,
      [subscription.paddle_subscription_id],
    );

    return Response.json({ url: session.urls.general.overview });
  } catch (error) {
    await reportServerError(error, {
      source: "paddle-portal",
      route: "/api/paddle/portal",
    });

    return Response.json(
      { error: "Billing management is unavailable. Please try again shortly." },
      { status: 503 },
    );
  }
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
