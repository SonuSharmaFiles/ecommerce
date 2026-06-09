import Link from "next/link";
import { getCategoryTree } from "@/lib/products";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 600;
export const metadata = buildMetadata({ title: "Categories", path: "/categories" });

export default async function CategoriesPage() {
  const all = await getCategoryTree();
  const tops = all.filter((c) => !c.parent_id);

  return (
    <div className="container py-10">
      <h1 className="mb-6 font-display text-3xl font-bold">Shop by category</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {tops.map((c) => (
          <Link
            key={c.id}
            href={`/categories/${c.slug}`}
            className="aspect-square rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
          >
            <h2 className="text-lg font-semibold">{c.name}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
