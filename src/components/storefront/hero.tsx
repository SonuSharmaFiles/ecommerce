import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b">
      <div className="container grid grid-cols-1 items-center gap-12 py-16 md:grid-cols-2 md:py-24">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-success" />
            New drops every week
          </div>
          <h1 className="text-balance font-display text-5xl font-bold tracking-tight md:text-6xl">
            Premium products.<br />
            <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Fast delivery worldwide.
            </span>
          </h1>
          <p className="max-w-md text-balance text-lg text-muted-foreground">
            Shop the world's most-loved brands with confidence. Free shipping over $75. Hassle-free returns.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/products">Shop now <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/deals">Today's deals</Link>
            </Button>
          </div>
          <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
            <div><span className="text-2xl font-bold text-foreground">50k+</span><br/>Customers</div>
            <div><span className="text-2xl font-bold text-foreground">4.8</span><br/>Avg rating</div>
            <div><span className="text-2xl font-bold text-foreground">200+</span><br/>Brands</div>
          </div>
        </div>
        <div className="relative aspect-square max-h-[520px]">
          <div className="absolute -right-12 -top-12 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <Image
            src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=80"
            alt="Featured collection"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="rounded-3xl object-cover"
          />
        </div>
      </div>
    </section>
  );
}
