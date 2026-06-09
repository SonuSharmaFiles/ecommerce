"use client";

import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCartStore } from "@/stores/cart-store";
import { APP_URL } from "@/lib/constants";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

export default function PayPage() {
  return (
    <Suspense fallback={<div className="container py-20 text-center">Loading…</div>}>
      <PayInner />
    </Suspense>
  );
}

function PayInner() {
  const sp = useSearchParams();
  const clientSecret = sp.get("clientSecret");
  const orderId = sp.get("orderId");

  if (!clientSecret || !stripePromise) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Stripe is not configured</h1>
        <p className="mt-2 text-muted-foreground">
          Add <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> and <code>STRIPE_SECRET_KEY</code> to your environment.
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-xl py-10">
      <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
        <PayForm orderId={orderId!} />
      </Elements>
    </div>
  );
}

function PayForm({ orderId }: { orderId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const clearCart = useCartStore((s) => s.setLines);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${APP_URL}/orders/thank-you?orderId=${orderId}` },
      redirect: "if_required",
    });
    if (result.error) {
      setError(result.error.message ?? "Payment failed");
      setSubmitting(false);
      return;
    }
    clearCart([]);
    router.push(`/orders/thank-you?orderId=${orderId}`);
  }

  return (
    <Card>
      <CardHeader><CardTitle>Complete your payment</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <PaymentElement />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={!stripe || submitting} size="lg" className="w-full">
            {submitting ? "Processing…" : "Pay now"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
