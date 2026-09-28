import { ImageResponse } from "next/og";

export const alt = "ADHD Study AI — less overwhelm, more clarity";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#fffaf0",
          color: "#19241f",
          display: "flex",
          height: "100%",
          padding: "72px",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "3px solid #19241f",
            borderRadius: "42px",
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "58px 64px",
          }}
        >
          <div style={{ alignItems: "center", display: "flex", gap: "18px" }}>
            <div
              style={{
                alignItems: "center",
                background: "#19241f",
                borderRadius: "999px",
                color: "#fffaf0",
                display: "flex",
                fontSize: 22,
                fontWeight: 700,
                height: 68,
                justifyContent: "center",
                width: 68,
              }}
            >
              AI
            </div>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>
              ADHD Study AI
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 76,
                fontWeight: 700,
                letterSpacing: "-4px",
                lineHeight: 1.02,
                maxWidth: 920,
              }}
            >
              Less overwhelm. More clarity.
            </div>
            <div
              style={{
                color: "#4d5d54",
                display: "flex",
                fontSize: 30,
                marginTop: 28,
              }}
            >
              Plans, study guides, flashcards, and focused next steps.
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
