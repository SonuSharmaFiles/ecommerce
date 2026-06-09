import Link from "next/link";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="mt-32 border-t bg-muted/30">
      <div className="container py-16">
        <div className="grid grid-cols-2 gap-12 md:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="font-display text-xl font-bold">{APP_NAME}</Link>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Premium products, fast worldwide delivery, and a buying experience designed for the modern shopper.
            </p>
            <form action="/api/newsletter" method="post" className="mt-6 flex max-w-sm gap-2">
              <Input type="email" name="email" placeholder="you@email.com" required />
              <Button type="submit">Subscribe</Button>
            </form>
          </div>

          <FooterCol title={t("company")}
            links={[
              { href: "/about", label: t("about") },
              { href: "/contact", label: t("contact") },
              { href: "/careers", label: t("careers") },
              { href: "/blog", label: "Blog" },
            ]}
          />

          <FooterCol title={t("support")}
            links={[
              { href: "/help", label: "Help center" },
              { href: "/orders/track", label: t("track") },
              { href: "/returns", label: t("returns") },
              { href: "/shipping", label: t("shipping_info") },
              { href: "/faq", label: t("faq") },
            ]}
          />

          <FooterCol title={t("legal")}
            links={[
              { href: "/privacy", label: t("privacy") },
              { href: "/terms", label: t("terms") },
              { href: "/cookies", label: "Cookies" },
              { href: "/accessibility", label: "Accessibility" },
            ]}
          />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Stripe</span><span>PayPal</span><span>Visa</span><span>Mastercard</span><span>Apple Pay</span><span>Google Pay</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map((l) => (
          <li key={l.href}><Link href={l.href} className="hover:text-foreground">{l.label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
