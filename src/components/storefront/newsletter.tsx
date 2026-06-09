"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function NewsletterCTA() {
  const t = useTranslations("home");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success("Thanks for subscribing!");
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to subscribe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="container py-16">
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-accent/30 p-8 md:p-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">{t("newsletter_title")}</h2>
          <p className="mt-3 text-muted-foreground">{t("newsletter_subtitle")}</p>
          <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md gap-2">
            <Input
              type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com" className="h-11"
            />
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "…" : t("newsletter_cta")}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">No spam. Unsubscribe anytime.</p>
        </div>
      </div>
    </section>
  );
}
