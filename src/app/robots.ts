import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/auth/", "/account/", "/checkout/", "/cart/"] },
    ],
    sitemap: new URL("/sitemap.xml", APP_URL).toString(),
    host: APP_URL,
  };
}
