import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { StructuredData } from "./structured-data";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export function generateMetadata(): Metadata {
  return {
    title: "Flight Simulator Pro — Free Browser Flight Sim",
    description: "A lightweight arcade-style browser flight simulator with real weather, 4 aircraft, 6 missions, and 12 achievements.",
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
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#06b6d4" />
        <meta property="og:image" content="/og-image.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <StructuredData />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
