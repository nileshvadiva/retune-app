import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Retune — one signal, every station",
  description: "Turn one transcript into platform-native posts for Twitter, LinkedIn, and Reels.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
