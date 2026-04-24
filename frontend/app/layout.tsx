import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EchoShield | AI PR & Crisis Management Copilot",
  description: "An autonomous multi-agent system that monitors social media sentiment and generates legally-sound corporate responses in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-zinc-950 text-zinc-50 min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
