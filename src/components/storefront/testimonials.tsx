import { Star } from "lucide-react";

const TESTIMONIALS = [
  { name: "Maya R.", title: "Verified buyer", quote: "Genuinely the smoothest checkout I've used. Order arrived in 3 days.", rating: 5 },
  { name: "Aarav S.", title: "Verified buyer", quote: "Customer support actually helps. Got a refund in under 24 hours.", rating: 5 },
  { name: "Lena K.", title: "Verified buyer", quote: "Quality matches the photos. I'll be buying again.", rating: 5 },
];

export function Testimonials() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {TESTIMONIALS.map((t) => (
        <figure key={t.name} className="rounded-xl border bg-card p-6">
          <div className="mb-3 flex">
            {Array.from({ length: t.rating }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <blockquote className="text-sm leading-relaxed">"{t.quote}"</blockquote>
          <figcaption className="mt-4 text-sm">
            <div className="font-medium">{t.name}</div>
            <div className="text-muted-foreground">{t.title}</div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
