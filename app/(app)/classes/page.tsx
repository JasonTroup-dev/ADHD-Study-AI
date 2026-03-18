import React, { JSX } from "react";

export default function Page(): JSX.Element {
    return (
        <main
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                padding: 20,
            }}
        >
            <div
                style={{
                    textAlign: "center",
                    border: "2px dashed #cfcfcf",
                    borderRadius: 12,
                    padding: 40,
                    maxWidth: 640,
                }}
            >
                <h1 style={{ margin: 0 }}>Classes — Placeholder</h1>
                <p style={{ marginTop: 12, color: "#666" }}>This page is under construction.</p>
            </div>
        </main>
    );
}