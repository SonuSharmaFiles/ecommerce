import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { buildMetadata } from "@/lib/seo";
import Image from "next/image";

export const revalidate = 300;

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();
  const { data: post } = await supabase.from("blog_posts").select("title, excerpt, seo_title, seo_description, cover_image_url").eq("slug", slug).maybeSingle();
  if (!post) return buildMetadata({ title: "Blog post", noindex: true });
  return buildMetadata({
    title: post.seo_title ?? post.title,
    description: post.seo_description ?? post.excerpt ?? undefined,
    image: post.cover_image_url ?? undefined,
    path: `/blog/${slug}`,
    type: "article",
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("*, author:profiles(full_name, avatar_url)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!post) notFound();

  return (
    <article className="container max-w-3xl py-12">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-bold tracking-tight">{post.title}</h1>
        {post.excerpt && <p className="mt-3 text-lg text-muted-foreground">{post.excerpt}</p>}
        <div className="mt-4 text-sm text-muted-foreground">
          {post.author && <span>By {(post.author as { full_name?: string }).full_name ?? "Editor"} · </span>}
          {post.published_at && new Date(post.published_at).toLocaleDateString()}
        </div>
      </header>
      {post.cover_image_url && (
        <div className="relative mb-8 aspect-video overflow-hidden rounded-xl">
          <Image src={post.cover_image_url} alt={post.title} fill className="object-cover" />
        </div>
      )}
      <div className="prose prose-neutral max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: post.body_html ?? `<p>${(post.body_markdown ?? "").replace(/\n/g, "<br/>")}</p>` }}
      />
    </article>
  );
}
