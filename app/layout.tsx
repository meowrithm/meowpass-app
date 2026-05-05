import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "MeowPass — Secret Vault",
  description: "E2E encrypted secret management for developers.",
  icons: { icon: "/images/logo-192.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
