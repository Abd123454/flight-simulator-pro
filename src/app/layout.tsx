import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flight Simulator Pro — Free Browser Flight Sim",
  description: "A lightweight arcade-style browser flight simulator with real weather, 4 aircraft, 6 missions, and 12 achievements. Built with Three.js + Next.js.",
  keywords: ["flight simulator", "Three.js", "WebGL", "browser game", "F-16", "Boeing 737", "arcade"],
  authors: [{ name: "Abd123454" }],
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Flight Simulator Pro",
    description: "Free browser flight simulator with real weather, 4 aircraft, and dynamic terrain.",
    type: "website",
    siteName: "Flight Simulator Pro",
  },
  twitter: {
    card: "summary_large_image",
    title: "Flight Simulator Pro",
    description: "Free browser flight simulator with real weather, 4 aircraft, and dynamic terrain.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#06b6d4" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
