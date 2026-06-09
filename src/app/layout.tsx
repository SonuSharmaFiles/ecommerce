import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { APP_NAME, APP_URL } from "@/lib/constants";
import Script from "next/script";
import { organizationSchema, websiteSchema } from "@/lib/schema-org";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: `${APP_NAME} — Premium ecommerce`, template: `%s — ${APP_NAME}` },
  description: "Premium products, fast worldwide delivery, and a buying experience designed for the modern shopper.",
  keywords: ["ecommerce", "shop", "dropshipping", "premium products", "fast delivery"],
  authors: [{ name: APP_NAME }],
  applicationName: APP_NAME,
  generator: "Next.js",
  openGraph: { type: "website", siteName: APP_NAME, url: APP_URL },
  twitter: { card: "summary_large_image", creator: "@shopflow" },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>

        <Script id="schema-org" type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([organizationSchema(), websiteSchema()]) }}
        />
      </body>
    </html>
  );
}
