import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Section({
  title,
  subtitle,
  href,
  hrefLabel = "View all",
  children,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="container py-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="hidden items-center gap-1 text-sm font-medium hover:underline md:inline-flex">
            {hrefLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
