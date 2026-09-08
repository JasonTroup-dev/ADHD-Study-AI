"use client";

import type { Environments } from "@paddle/paddle-js";
import { ExternalLink, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type BillingActionsProps = {
  clientToken: string | null;
  email: string;
  environment: Environments;
  initialTransactionId: string | null;
  paddleCustomerId: string | null;
  subscribed: boolean;
};

export default function BillingActions({
  clientToken,
  email,
  environment,
  initialTransactionId,
  paddleCustomerId,
  subscribed,
}: BillingActionsProps) {
  const [pendingAction, setPendingAction] = useState<"checkout" | "portal" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const openedTransaction = useRef<string | null>(null);

  const openPaddleCheckout = useCallback(
    async (transactionId: string) => {
      if (!clientToken) {
        setError("Paddle checkout has not been configured yet.");
        return;
      }

      setPendingAction("checkout");
      setError(null);

      try {
        const { initializePaddle } = await import("@paddle/paddle-js");
        const paddle = await initializePaddle({
          environment,
          token: clientToken,
          pwCustomer: paddleCustomerId ? { id: paddleCustomerId } : {},
        });

        if (!paddle) throw new Error("Paddle.js could not be loaded.");

        paddle.Checkout.open({
          transactionId,
          ...(paddleCustomerId ? {} : { customer: { email } }),
          settings: {
            allowLogout: false,
            displayMode: "overlay",
            successUrl: `${window.location.origin}/billing?checkout=success`,
            theme: "light",
          },
        });
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Checkout could not be opened.",
        );
      } finally {
        setPendingAction(null);
      }
    },
    [clientToken, email, environment, paddleCustomerId],
  );

  useEffect(() => {
    if (
      initialTransactionId
      && openedTransaction.current !== initialTransactionId
    ) {
      openedTransaction.current = initialTransactionId;
      void openPaddleCheckout(initialTransactionId);
    }
  }, [initialTransactionId, openPaddleCheckout]);

  async function startCheckout() {
    if (!clientToken) {
      setError("Paddle checkout has not been configured yet.");
      return;
    }

    setPendingAction("checkout");
    setError(null);

    try {
      const response = await fetch("/api/paddle/checkout", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; transactionId?: string }
        | null;

      if (!response.ok || !payload?.transactionId) {
        throw new Error(payload?.error || "Checkout could not be started.");
      }

      await openPaddleCheckout(payload.transactionId);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Checkout could not be started.",
      );
      setPendingAction(null);
    }
  }

  async function openPortal() {
    setPendingAction("portal");
    setError(null);

    try {
      const response = await fetch("/api/paddle/portal", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; url?: string }
        | null;

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || "Billing management could not be opened.");
      }

      window.location.assign(payload.url);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Billing management could not be opened.",
      );
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-3">
      {subscribed ? (
        <Button
          type="button"
          disabled={pendingAction !== null}
          onClick={() => void openPortal()}
        >
          {pendingAction === "portal" ? (
            <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <ExternalLink aria-hidden="true" />
          )}
          {pendingAction === "portal" ? "Opening…" : "Manage in Paddle"}
        </Button>
      ) : (
        <Button
          type="button"
          disabled={pendingAction !== null || !clientToken}
          onClick={() => void startCheckout()}
        >
          {pendingAction === "checkout" ? (
            <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : null}
          {pendingAction === "checkout" ? "Starting checkout…" : "Choose Pro"}
        </Button>
      )}

      {error ? (
        <p role="alert" className="max-w-md text-sm leading-6 text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
