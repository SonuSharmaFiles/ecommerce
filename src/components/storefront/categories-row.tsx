import Link from "next/link";
import Image from "next/image";

export interface CategoryItem {
  slug: string;
  name: string;
  image_url: string | null;
}

export function CategoriesRow({ categories }: { categories: CategoryItem[] }) {
  if (!categories.length) return null;
  return (
    <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/categories/${c.slug}`}
          className="group relative flex aspect-square flex-col items-center justify-end overflow-hidden rounded-xl border bg-muted p-3 text-center hover:border-foreground"
        >
          {c.image_url ? (
            <Image
              src={c.image_url}
              alt={c.name}
              fill
              sizes="(max-width: 768px) 33vw, 16vw"
              className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20" />
          )}
          <span className="relative z-10 rounded-md bg-background/90 px-2 py-1 text-xs font-medium">
            {c.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
