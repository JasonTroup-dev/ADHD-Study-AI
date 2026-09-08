"use client";

import { Check, Link2, LoaderCircle, Share2, Unlink } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type ShareResponse = {
  isShared?: boolean;
  shareUrl?: string;
  error?: string;
};

export default function PracticeQuizShareButton({
  quizId,
  initiallyShared,
  initialShareUrl,
}: {
  quizId: string;
  initiallyShared: boolean;
  initialShareUrl: string;
}) {
  const [isShared, setIsShared] = useState(initiallyShared);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enableAndCopy() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      let shareUrl = initialShareUrl;
      if (!isShared) {
        const response = await fetch(`/api/practice-quiz/sets/${quizId}/share`, {
          method: "POST",
        });
        const result = (await response.json()) as ShareResponse;
        if (!response.ok || !result.shareUrl) {
          throw new Error(result.error || "Could not create a share link.");
        }
        shareUrl = result.shareUrl;
        setIsShared(true);
      }

      if (navigator.share) {
        try {
          await navigator.share({ title: "Practice quiz", url: shareUrl });
          return;
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === "AbortError") return;
        }
      }

      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : "Could not share this quiz.");
    } finally {
      setBusy(false);
    }
  }

  async function stopSharing() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/practice-quiz/sets/${quizId}/share`, {
        method: "DELETE",
      });
      const result = (await response.json()) as ShareResponse;
      if (!response.ok) throw new Error(result.error || "Could not stop sharing.");
      setIsShared(false);
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : "Could not stop sharing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button type="button" variant="outline" onClick={enableAndCopy} disabled={busy}>
        {busy ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : copied ? (
          <Check aria-hidden="true" />
        ) : isShared ? (
          <Link2 aria-hidden="true" />
        ) : (
          <Share2 aria-hidden="true" />
        )}
        {copied ? "Link copied" : isShared ? "Share again" : "Share quiz"}
      </Button>
      {isShared ? (
        <Button type="button" variant="ghost" onClick={stopSharing} disabled={busy}>
          <Unlink aria-hidden="true" />
          Stop sharing
        </Button>
      ) : null}
      {error ? <p className="w-full text-right text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
