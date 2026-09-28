import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ADHD Study AI",
    short_name: "Study AI",
    description:
      "ADHD-friendly planning and AI study tools grounded in your coursework.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f3f4f6",
    theme_color: "#19241f",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
