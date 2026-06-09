import type { Metadata } from "next";
import { APP_NAME, APP_URL } from "@/lib/constants";

interface BuildMetadataArgs {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  noindex?: boolean;
  keywords?: string[];
  type?: "website" | "article" | "product";
}

export function buildMetadata(args: BuildMetadataArgs): Metadata {
  // Root layout adds " — ShopFlow" via template; pass the bare title here.
  const title = args.title;
  const description = args.description ?? `${APP_NAME} — premium products, fast shipping.`;
  const url = args.path ? new URL(args.path, APP_URL).toString() : APP_URL;
  const ogImage = args.image
    ? new URL(args.image, APP_URL).toString()
    : new URL("/opengraph-image", APP_URL).toString();

  return {
    title,
    description,
    keywords: args.keywords,
    alternates: { canonical: url },
    openGraph: {
      title, description, url,
      siteName: APP_NAME,
      type: args.type === "product" ? "website" : args.type ?? "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title, description, images: [ogImage],
    },
    robots: args.noindex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  };
}
