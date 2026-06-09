"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "", slug: "", short_description: "", description: "", base_price: 0, currency: "USD", status: "draft",
  });
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  async function generateWithAI() {
    if (!form.title) { toast.error("Add a product title first."); return; }
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/product-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "AI failed");
      setForm({
        ...form,
        title: json.title ?? form.title,
        short_description: json.short_description ?? form.short_description,
        description: json.description ?? form.description,
        slug: form.slug || (json.title ?? form.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60),
      });
      toast.success("AI generated copy added.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI generation failed");
    } finally {
      setAiBusy(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      toast.success("Product created");
      router.push(`/admin/products/${json.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">New product</h1>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Basic info
            <Button variant="outline" size="sm" onClick={generateWithAI} disabled={aiBusy}>
              <Sparkles className="h-4 w-4" /> {aiBusy ? "Generating…" : "Generate with AI"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="md:col-span-2"><Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>
          <div className="md:col-span-2"><Label>Short description</Label>
            <Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
          </div>
          <div className="md:col-span-2"><Label>Description (HTML)</Label>
            <Textarea rows={8} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div><Label>Base price</Label>
            <Input type="number" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })} />
          </div>
          <div><Label>Currency</Label>
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
