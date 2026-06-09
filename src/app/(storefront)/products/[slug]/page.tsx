import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "@/lib/products";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { ProductGrid } from "@/components/storefront/product-grid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Star, Truck, ShieldCheck, RefreshCcw, Share2 } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/storefront/json-ld";
import { breadcrumbSchema, faqSchema, productSchema } from "@/lib/schema-org";
import { Section } from "@/components/storefront/section";
import type { Currency } from "@/lib/constants";

export const revalidate = 60;

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return buildMetadata({ title: "Product", noindex: true });
  return buildMetadata({
    title: product.seo_title ?? product.title,
    description: product.seo_description ?? product.short_description ?? undefined,
    path: `/products/${product.slug}`,
    image: (product.product_images?.[0]?.url as string) ?? undefined,
    keywords: product.seo_keywords ?? undefined,
    type: "product",
  });
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id);
  const images = (product.product_images ?? []).sort(
    (a: { position: number }, b: { position: number }) => a.position - b.position
  );
  const inStockVariants = (product.product_variants ?? []).filter(
    (v: { is_active: boolean; inventory_quantity: number }) => v.is_active && v.inventory_quantity > 0
  );
  const inStock = inStockVariants.length > 0 || !(product.product_variants?.length);

  const brand = product.brand as { name?: string } | null;
  const currency = product.currency as Currency;

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/products" },
    { label: product.title, href: `/products/${product.slug}` },
  ];

  return (
    <>
      <div className="container py-6">
        <Breadcrumbs items={crumbs} />
      </div>

      <div className="container grid grid-cols-1 gap-12 pb-12 lg:grid-cols-2">
        <ProductGallery
          images={images.map((i: { url: string; alt_text: string | null }) => ({
            url: i.url, alt_text: i.alt_text,
          }))}
          title={product.title}
        />

        <div className="flex flex-col gap-5">
          <div>
            {brand?.name && (
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {brand.name}
              </span>
            )}
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{product.title}</h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              {Number(product.rating_avg) > 0 && (
                <>
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.round(Number(product.rating_avg))
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </span>
                  <span>
                    {Number(product.rating_avg).toFixed(1)} · {product.rating_count} reviews
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div className="text-3xl font-bold">
              {formatPrice(Number(product.base_price), currency)}
            </div>
            {product.compare_at_price && Number(product.compare_at_price) > Number(product.base_price) && (
              <>
                <div className="text-lg text-muted-foreground line-through">
                  {formatPrice(Number(product.compare_at_price), currency)}
                </div>
                <Badge variant="destructive">
                  -{Math.round(
                    ((Number(product.compare_at_price) - Number(product.base_price)) /
                      Number(product.compare_at_price)) * 100
                  )}%
                </Badge>
              </>
            )}
          </div>

          {product.short_description && (
            <p className="text-balance text-muted-foreground">{product.short_description}</p>
          )}

          <div className="flex items-center gap-2 text-sm">
            {inStock ? (
              <Badge variant="success">In stock</Badge>
            ) : (
              <Badge variant="destructive">Out of stock</Badge>
            )}
            <span className="text-muted-foreground">Ships within 1–3 business days</span>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <AddToCartButton
              product={{
                id: product.id,
                slug: product.slug,
                title: product.title,
                base_price: Number(product.base_price),
                image: images[0]?.url ?? null,
              }}
              inStock={inStock}
            />
            <Button variant="outline" size="lg" className="flex-1">
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border bg-muted/30 p-3 text-xs">
            <div className="flex flex-col items-center gap-1 text-center"><Truck className="h-5 w-5" /> Free over $75</div>
            <div className="flex flex-col items-center gap-1 text-center"><ShieldCheck className="h-5 w-5" /> Secure checkout</div>
            <div className="flex flex-col items-center gap-1 text-center"><RefreshCcw className="h-5 w-5" /> 30-day returns</div>
          </div>
        </div>
      </div>

      <div className="container pb-12">
        <Tabs defaultValue="description">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            {product.product_specifications && product.product_specifications.length > 0 && (
              <TabsTrigger value="specs">Specifications</TabsTrigger>
            )}
            {product.product_faqs && product.product_faqs.length > 0 && (
              <TabsTrigger value="faq">FAQ</TabsTrigger>
            )}
            <TabsTrigger value="reviews">Reviews ({product.rating_count})</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-4">
            <article
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: product.description ?? "<p>No description yet.</p>" }}
            />
          </TabsContent>

          {product.product_specifications && product.product_specifications.length > 0 && (
            <TabsContent value="specs" className="mt-4">
              <dl className="grid grid-cols-1 divide-y rounded-md border">
                {product.product_specifications.map(
                  (s: { id: string; name: string; value: string }) => (
                    <div key={s.id} className="grid grid-cols-3 gap-4 p-3 text-sm">
                      <dt className="font-medium text-muted-foreground">{s.name}</dt>
                      <dd className="col-span-2">{s.value}</dd>
                    </div>
                  )
                )}
              </dl>
            </TabsContent>
          )}

          {product.product_faqs && product.product_faqs.length > 0 && (
            <TabsContent value="faq" className="mt-4">
              <Accordion type="single" collapsible className="max-w-3xl">
                {product.product_faqs.map(
                  (faq: { id: string; question: string; answer: string }) => (
                    <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger>{faq.question}</AccordionTrigger>
                      <AccordionContent>{faq.answer}</AccordionContent>
                    </AccordionItem>
                  )
                )}
              </Accordion>
            </TabsContent>
          )}

          <TabsContent value="reviews" className="mt-4">
            <p className="text-sm text-muted-foreground">
              Reviews are loaded asynchronously after purchase.
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {related.length > 0 && (
        <Section title="You might also like">
          <ProductGrid products={related} />
        </Section>
      )}

      <JsonLd
        id="schema-product"
        data={productSchema({
          slug: product.slug,
          title: product.title,
          description: product.description,
          image: images[0]?.url ?? null,
          sku: product.sku,
          brand: brand?.name ?? null,
          price: Number(product.base_price),
          currency: product.currency,
          inStock,
          ratingAvg: Number(product.rating_avg),
          ratingCount: product.rating_count,
        })}
      />
      <JsonLd id="schema-breadcrumbs" data={breadcrumbSchema(crumbs)} />
      {product.product_faqs && product.product_faqs.length > 0 && (
        <JsonLd
          id="schema-faq"
          data={faqSchema(
            product.product_faqs.map((f: { question: string; answer: string }) => ({
              q: f.question, a: f.answer,
            }))
          )}
        />
      )}
    </>
  );
}
