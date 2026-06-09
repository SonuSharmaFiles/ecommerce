import Script from "next/script";

export function JsonLd({ data, id }: { data: unknown; id: string }) {
  return (
    <Script
      id={id}
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
