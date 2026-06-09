"use client";

import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { formatPrice } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function CheckoutPage() {
  const lines = useCartStore((s) => s.lines);
  const currency = useUIStore((s) => s.currency);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "", full_name: "", phone: "",
    line1: "", line2: "", city: "", state: "", postal_code: "", country: "US",
  });

  const subtotal = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const shipping = subtotal >= 75 ? 0 : subtotal > 0 ? 7.5 : 0;
  const total = subtotal + shipping;

  if (lines.length === 0) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Your cart is empty</h1>
        <Button asChild className="mt-4"><a href="/products">Browse products</a></Button>
      </div>
    );
  }

  async function placeOrder(provider: "stripe" | "paypal") {
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          shipping: {
            full_name: form.full_name,
            phone: form.phone,
            line1: form.line1,
            line2: form.line2,
            city: form.city,
            state: form.state,
            postal_code: form.postal_code,
            country: form.country,
          },
          billing_same_as_shipping: true,
          shipping_method: "standard",
          lines: lines.map((l) => ({
            product_id: l.product_id,
            variant_id: l.variant_id,
            quantity: l.quantity,
            unit_price: l.unit_price,
            title: l.title,
            image: l.image,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Order failed");
      const { orderId } = await res.json();

      const payRes = await fetch(`/api/payments/${provider}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (!payRes.ok) throw new Error((await payRes.json()).error ?? "Payment init failed");
      const payJson = await payRes.json();

      if (provider === "stripe") {
        router.push(`/checkout/pay?orderId=${orderId}&clientSecret=${payJson.clientSecret}`);
      } else {
        window.location.href = payJson.approveUrl;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  function field<K extends keyof typeof form>(name: K) {
    return {
      value: form[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [name]: e.target.value }),
    };
  }

  return (
    <div className="container grid grid-cols-1 gap-8 py-10 lg:grid-cols-[1fr_400px]">
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <h1 className="font-display text-3xl font-bold">Checkout</h1>

        <Card>
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" required type="email" {...field("email")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Shipping address</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" required {...field("full_name")} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...field("phone")} />
            </div>
            <div>
              <Label htmlFor="country">Country (2-letter)</Label>
              <Input id="country" required maxLength={2} {...field("country")} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="line1">Address</Label>
              <Input id="line1" required {...field("line1")} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="line2">Apt, suite (optional)</Label>
              <Input id="line2" {...field("line2")} />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" required {...field("city")} />
            </div>
            <div>
              <Label htmlFor="state">State / region</Label>
              <Input id="state" {...field("state")} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="postal_code">Postal code</Label>
              <Input id="postal_code" required {...field("postal_code")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="stripe">
              <TabsList>
                <TabsTrigger value="stripe">Card</TabsTrigger>
                <TabsTrigger value="paypal">PayPal</TabsTrigger>
              </TabsList>
              <TabsContent value="stripe" className="pt-4">
                <p className="text-sm text-muted-foreground">
                  Pay with Visa, Mastercard, Amex, Apple Pay, Google Pay, or Link via Stripe.
                </p>
                <Button
                  disabled={submitting} size="lg" className="mt-4 w-full"
                  onClick={() => placeOrder("stripe")}
                >
                  {submitting ? "Processing…" : `Pay ${formatPrice(total, currency)}`}
                </Button>
              </TabsContent>
              <TabsContent value="paypal" className="pt-4">
                <p className="text-sm text-muted-foreground">Pay securely with your PayPal account.</p>
                <Button
                  disabled={submitting} size="lg" variant="secondary" className="mt-4 w-full"
                  onClick={() => placeOrder("paypal")}
                >
                  {submitting ? "Processing…" : "Pay with PayPal"}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </form>

      <aside>
        <Card className="sticky top-20">
          <CardHeader><CardTitle>Order summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-2">
              {lines.map((l) => (
                <li key={l.id} className="flex justify-between text-sm">
                  <span className="flex-1 truncate">{l.quantity}× {l.title}</span>
                  <span>{formatPrice(l.unit_price * l.quantity, currency)}</span>
                </li>
              ))}
            </ul>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(subtotal, currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? "Free" : formatPrice(shipping, currency)}</span></div>
            <Separator />
            <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatPrice(total, currency)}</span></div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
