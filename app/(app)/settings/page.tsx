import React, { JSX } from "react";

export default function SettingsPage(): JSX.Element {
    return (
        <main
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "2rem",
                boxSizing: "border-box",
                fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
                color: "#111827",
                background: "linear-gradient(180deg,#f8fafc,#ffffff)"
            }}
        >
            <div style={{ textAlign: "center", maxWidth: 640 }}>
                <h1 style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>Settings</h1>
                <p style={{ margin: 0, color: "#6b7280" }}>This is a placeholder page for application settings.</p>
            </div>
        </main>
    );
}