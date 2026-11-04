import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutonomOS // AI company orchestration platform",
  description: "Plans work, delegates tasks, coordinates agents and tracks outcomes across marketing, sales, intelligence and operations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
