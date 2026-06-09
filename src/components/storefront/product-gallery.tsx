"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, title }: { images: { url: string; alt_text?: string | null }[]; title: string }) {
  const [active, setActive] = useState(0);
  if (!images.length) {
    return <div className="aspect-square rounded-xl border bg-muted" />;
  }

  return (
    <div className="grid grid-cols-[80px_1fr] gap-3">
      <div className="flex flex-col gap-2 overflow-y-auto">
        {images.map((img, i) => (
          <button
            key={img.url}
            onClick={() => setActive(i)}
            className={cn(
              "relative aspect-square overflow-hidden rounded-md border bg-muted transition-all",
              i === active ? "border-primary" : "hover:border-foreground/30"
            )}
            aria-label={`View image ${i + 1}`}
          >
            <Image src={img.url} alt={img.alt_text ?? title} fill sizes="80px" className="object-cover" />
          </button>
        ))}
      </div>
      <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
        <Image
          src={images[active].url}
          alt={images[active].alt_text ?? title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          className="object-cover"
        />
      </div>
    </div>
  );
}
