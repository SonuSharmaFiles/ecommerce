"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Image from "next/image";

interface ImportResult {
  externalId: string;
  title: string;
  basePrice: number;
  currency: string;
  imageUrls: string[];
}

export default function ImportProductsPage() {
  const [provider, setProvider] = useState("cj");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ImportResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);

  async function search() {
    setLoading(true);
    try {
      const res = await fetch(`/api/dropshipping/search?provider=${provider}&q=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Search failed");
      setResults(json.products);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed");
    } finally { setLoading(false); }
  }

  async function importProduct(externalId: string) {
    setImporting(externalId);
    try {
      const res = await fetch("/api/dropshipping/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, externalId, markupPercent: 80 }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Import failed");
      toast.success("Imported as draft");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally { setImporting(null); }
  }

  return (
    <div className="space-y-6">
      <header><h1 className="font-display text-3xl font-bold">Import from suppliers</h1></header>

      <Card>
        <CardHeader><CardTitle>Search</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_120px]">
          <div>
            <Label>Query</Label>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="bluetooth earbuds, LED strip…" />
          </div>
          <div>
            <Label>Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cj">CJ Dropshipping</SelectItem>
                <SelectItem value="autods">AutoDS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={search} disabled={loading}>{loading ? "…" : "Search"}</Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {results.map((p) => (
            <Card key={p.externalId}>
              <CardContent className="flex gap-3 pt-6">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                  {p.imageUrls[0] && <Image src={p.imageUrls[0]} alt={p.title} fill className="object-cover" sizes="80px" />}
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="line-clamp-2 text-sm font-medium">{p.title}</div>
                  <div className="text-sm text-muted-foreground">{p.currency} {p.basePrice.toFixed(2)}</div>
                  <Button
                    size="sm" className="mt-auto self-start"
                    onClick={() => importProduct(p.externalId)}
                    disabled={importing === p.externalId}
                  >
                    {importing === p.externalId ? "Importing…" : "Import"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
