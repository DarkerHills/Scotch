import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Scotch — Retail operations", template: "%s · Scotch" },
  description: "Interactive demo of Scotch's retail operations: inventory, suppliers, purchase orders, analytics, smart ordering and online sales. All data is fictional.",
};

export const viewport: Viewport = {
  themeColor: "#0b4627",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
