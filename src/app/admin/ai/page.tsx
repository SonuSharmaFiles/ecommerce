"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function AdminAIPage() {
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function generate(endpoint: string, body: unknown) {
    setLoading(true); setResult("");
    try {
      const res = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setResult(JSON.stringify(json, null, 2));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <header><h1 className="font-display text-3xl font-bold">AI tools</h1>
        <p className="text-sm text-muted-foreground">Generate product copy, SEO metadata, and FAQ content.</p>
      </header>

      <Tabs defaultValue="copy">
        <TabsList>
          <TabsTrigger value="copy">Product copy</TabsTrigger>
          <TabsTrigger value="seo">SEO metadata</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="copy" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Generate product copy</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Label>Product title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Wireless Bluetooth Earbuds Pro" />
              <Button onClick={() => generate("/api/ai/product-description", { title })} disabled={loading || !title}>
                <Sparkles className="h-4 w-4" /> Generate
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Generate SEO metadata</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Label>Topic</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. best smart LED strip lights" />
              <Button onClick={() => generate("/api/ai/seo", { topic: title })} disabled={loading || !title}>
                <Sparkles className="h-4 w-4" /> Generate
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faq" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Generate FAQ</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Label>Topic</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              <Button onClick={() => generate("/api/ai/faq", { title })} disabled={loading || !title}>
                <Sparkles className="h-4 w-4" /> Generate
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {result && (
        <Card>
          <CardHeader><CardTitle>Result</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={result} readOnly rows={14} className="font-mono text-xs" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
