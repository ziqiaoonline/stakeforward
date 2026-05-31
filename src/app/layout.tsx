import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StakeForward — Onchain Commitment Device",
  description:
    "Stake ETH on goals that matter. Pick a verifier you trust. Get it back when you ship — or forfeit it if you don't.",
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
