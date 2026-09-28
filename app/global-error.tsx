"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/monitoring/client";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    reportClientError("global-error-boundary", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main
          style={{
            alignItems: "center",
            display: "flex",
            fontFamily: "system-ui, sans-serif",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
          }}
        >
          <div style={{ maxWidth: "520px", textAlign: "center" }}>
            <h1>ADHD Study AI hit a snag</h1>
            <p>Your saved work is still safe. Refresh the page to try again.</p>
            <button type="button" onClick={() => window.location.reload()}>
              Refresh page
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
