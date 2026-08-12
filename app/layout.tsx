import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Retune — AI Content Repurposing for Podcasters & YouTubers",
  description:
    "Retune is an AI-powered content repurposing tool that turns any podcast or video transcript into a LinkedIn post, Twitter thread, and Reel script in under 60 seconds. Try 3 tunes free, no card required.",

  keywords: [
    "content repurposing tool",
    "podcast to social media content",
    "AI content repurposing",
    "turn podcast into LinkedIn post",
    "podcast transcript to Twitter thread",
    "repurpose video content",
  ],

  metadataBase: new URL("https://retuneai.in"),

  openGraph: {
    title: "Retune — AI Content Repurposing for Podcasters & YouTubers",
    description:
      "Turn any podcast or video transcript into a LinkedIn post, Twitter thread, and Reel script in under 60 seconds.",
    url: "https://retuneai.in",
    siteName: "Retune",
    images: [
      {
        url: "https://retuneai.in/logo.png",
        width: 512,
        height: 512,
        alt: "Retune Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Retune — AI Content Repurposing for Podcasters & YouTubers",
    description:
      "Turn any podcast or video transcript into a LinkedIn post, Twitter thread, and Reel script in under 60 seconds.",
    images: ["https://retuneai.in/logo.png"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}