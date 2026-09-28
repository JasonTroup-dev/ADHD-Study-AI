import { Check, CreditCard, Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import BillingActions from "./BillingActions";

type BillingPageProps = {
  searchParams: Promise<{ _ptxn?: string; checkout?: string }>;
};

const SUBSCRIBED_STATUSES = ["active", "past_due", "paused", "trialing"];

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const [{ _ptxn: paymentLinkTransaction, checkout }, supabase] = await Promise.all([
    searchParams,
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: subscription } = user
    ? await supabase
        .from("billing_subscriptions")
        .select(
          "next_billed_at,paddle_customer_id,scheduled_change,status",
        )
        .maybeSingle()
    : { data: null };

  const subscribed = subscription
    ? SUBSCRIBED_STATUSES.includes(subscription.status)
    : false;
  const environment =
    process.env.PADDLE_ENVIRONMENT?.trim().toLowerCase() === "production"
      ? "production"
      : "sandbox";

  return (
    <div className="min-h-full bg-gray-100">
      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:py-10">
        <p className="text-sm font-semibold text-blue-700">Account</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight text-gray-950">
          Billing
        </h1>
        <p className="mt-2 max-w-2xl text-base text-gray-600">
          Keep your plan and payment details in one calm, predictable place.
        </p>

        {checkout === "success" ? (
          <div
            role="status"
            className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            Checkout completed. Paddle is confirming your subscription; this page will reflect it after the webhook arrives.
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden" aria-labelledby="plan-heading">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Sparkles className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="plan-heading" className="text-lg font-semibold text-gray-950">
                    ADHD Study AI Pro
                  </h2>
                  <p className="text-sm text-gray-500">
                    Subscription checkout and receipts are handled securely by Paddle.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div>
                <p className="text-sm font-medium text-gray-500">Current status</p>
                <p className="mt-1 text-2xl font-semibold capitalize text-gray-950">
                  {subscription?.status.replace("_", " ") ?? "Free"}
                </p>
                {subscription?.next_billed_at ? (
                  <p className="mt-2 text-sm text-gray-600">
                    Next billing date: {formatDate(subscription.next_billed_at)}
                  </p>
                ) : null}
                {subscription?.scheduled_change ? (
                  <p className="mt-1 text-sm text-amber-700">
                    Scheduled change: {subscription.scheduled_change}
                  </p>
                ) : null}
              </div>

              <BillingActions
                clientToken={process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() || null}
                email={user?.email ?? ""}
                environment={environment}
                initialTransactionId={getTransactionId(paymentLinkTransaction)}
                paddleCustomerId={subscription?.paddle_customer_id ?? null}
                subscribed={subscribed}
              />
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <CreditCard className="size-6 text-emerald-700" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-gray-950">Handled by Paddle</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
              {[
                "Tax calculation and compliant receipts",
                "Secure payment-method updates",
                "Self-service cancellation and invoices",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-1 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function getTransactionId(value: string | undefined) {
  return value && /^txn_[a-z0-9]{26}$/.test(value) ? value : null;
}
