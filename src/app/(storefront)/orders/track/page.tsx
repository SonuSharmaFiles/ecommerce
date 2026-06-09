"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OrderResult {
  order_number: string;
  status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  events?: { status: string; message: string | null; created_at: string }[];
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null); setOrder(null);
    try {
      const res = await fetch(`/api/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Not found");
      setOrder(await res.json());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lookup failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="mb-6 font-display text-3xl font-bold">Track your order</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="order_number">Order number</Label>
              <Input id="order_number" required value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="SF-2026-000123" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="email">Email used at checkout</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Looking up…" : "Track order"}
              </Button>
            </div>
          </form>
          {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
        </CardContent>
      </Card>

      {order && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Order {order.order_number}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium capitalize">{order.status.replace(/_/g, " ")}</span></div>
            {order.carrier && <div className="flex justify-between"><span className="text-muted-foreground">Carrier</span><span>{order.carrier}</span></div>}
            {order.tracking_number && <div className="flex justify-between"><span className="text-muted-foreground">Tracking</span><span>{order.tracking_number}</span></div>}
            {order.tracking_url && <a href={order.tracking_url} className="text-primary underline" target="_blank" rel="noreferrer">Track shipment</a>}
            {order.events && order.events.length > 0 && (
              <div className="pt-2">
                <h3 className="mb-2 font-semibold">Timeline</h3>
                <ul className="space-y-2">
                  {order.events.map((e, i) => (
                    <li key={i} className="border-l-2 border-muted pl-3">
                      <div className="font-medium capitalize">{e.status.replace(/_/g, " ")}</div>
                      {e.message && <div className="text-muted-foreground">{e.message}</div>}
                      <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
