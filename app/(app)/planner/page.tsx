export const metadata = {
    title: "Planner",
};

export default function Page() {
    return (
        <main
            style={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                padding: "2rem",
                background: "linear-gradient(180deg,#fff,#f6f8fb)",
            }}
        >
            <div style={{ textAlign: "center", maxWidth: 720 }}>
                <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.5rem" }}>Planner</h1>
                <p style={{ margin: 0, color: "#556", lineHeight: 1.4 }}>
                    Placeholder page — content coming soon.
                </p>
            </div>
        </main>
    );
}