import { APP_NAME, APP_URL } from "@/lib/constants";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: APP_NAME,
    url: APP_URL,
    logo: new URL("/logo.png", APP_URL).toString(),
    sameAs: [
      "https://twitter.com/shopflow",
      "https://instagram.com/shopflow",
      "https://facebook.com/shopflow",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      email: "support@shopflow.io",
    },
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: APP_NAME,
    url: APP_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${APP_URL}/products?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(items: { label: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: new URL(item.href, APP_URL).toString(),
    })),
  };
}

interface ProductSchemaInput {
  slug: string;
  title: string;
  description?: string | null;
  image?: string | null;
  sku?: string | null;
  brand?: string | null;
  price: number;
  currency: string;
  inStock: boolean;
  ratingAvg: number;
  ratingCount: number;
}

export function productSchema(p: ProductSchemaInput) {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.description ?? "",
    image: p.image,
    sku: p.sku ?? undefined,
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    offers: {
      "@type": "Offer",
      url: new URL(`/products/${p.slug}`, APP_URL).toString(),
      priceCurrency: p.currency,
      price: p.price.toFixed(2),
      availability: p.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  if (p.ratingCount > 0) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: p.ratingAvg.toFixed(2),
      reviewCount: p.ratingCount,
    };
  }
  return node;
}

export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function reviewSchema(args: {
  productTitle: string;
  author: string;
  rating: number;
  title?: string;
  body?: string;
  date: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: { "@type": "Product", name: args.productTitle },
    author: { "@type": "Person", name: args.author },
    reviewRating: { "@type": "Rating", ratingValue: args.rating, bestRating: 5 },
    name: args.title,
    reviewBody: args.body,
    datePublished: args.date,
  };
}
