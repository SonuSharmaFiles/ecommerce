import Stripe from "stripe";

let cached: Stripe | undefined;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY missing");
  cached = new Stripe(key, {
    apiVersion: "2025-02-24.acacia" as never,
    typescript: true,
    appInfo: { name: "ShopFlow", version: "1.0.0" },
  });
  return cached;
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export interface CreateIntentArgs {
  orderId: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export async function createPaymentIntent(args: CreateIntentArgs) {
  const stripe = getStripe();
  return stripe.paymentIntents.create({
    amount: Math.round(args.amount * 100),
    currency: args.currency.toLowerCase(),
    receipt_email: args.customerEmail,
    automatic_payment_methods: { enabled: true },
    metadata: { orderId: args.orderId, ...args.metadata },
  });
}

export async function refundPaymentIntent(intentId: string, amount?: number) {
  const stripe = getStripe();
  return stripe.refunds.create({
    payment_intent: intentId,
    amount: amount ? Math.round(amount * 100) : undefined,
  });
}
