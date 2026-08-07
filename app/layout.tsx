import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "katex/dist/katex.min.css";
import "./globals.css";

import { getSiteUrl } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: "ADHD Study AI",
  description:
    "AI-powered study tools that make planning, learning, and follow-through feel more manageable.",
  applicationName: "ADHD Study AI",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "ADHD Study AI",
    title: "ADHD Study AI",
    description:
      "Turn class material into clear study plans, guides, flashcards, and focused next steps.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "ADHD Study AI — less overwhelm, more clarity",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ADHD Study AI",
    description:
      "Turn class material into clear study plans, guides, flashcards, and focused next steps.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
