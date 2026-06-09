import { Truck, ShieldCheck, RefreshCcw, Headphones } from "lucide-react";

const BADGES = [
  { icon: Truck, title: "Free shipping", subtitle: "On orders over $75" },
  { icon: ShieldCheck, title: "Secure checkout", subtitle: "Stripe + PayPal" },
  { icon: RefreshCcw, title: "30-day returns", subtitle: "Hassle-free" },
  { icon: Headphones, title: "24/7 support", subtitle: "Real humans" },
];

export function TrustBadges() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {BADGES.map(({ icon: Icon, title, subtitle }) => (
        <div key={title} className="flex items-start gap-3 rounded-xl border bg-card p-4">
          <Icon className="h-6 w-6 shrink-0 text-primary" />
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
