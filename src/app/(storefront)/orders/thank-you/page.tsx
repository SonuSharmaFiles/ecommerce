import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function ThankYouPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  return (
    <Suspense fallback={<div />}>
      <Inner promise={searchParams} />
    </Suspense>
  );
}

async function Inner({ promise }: { promise: Promise<{ orderId?: string }> }) {
  const { orderId } = await promise;
  return (
    <div className="container max-w-xl py-20 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
      <h1 className="mt-4 font-display text-3xl font-bold">Thank you for your order!</h1>
      <p className="mt-2 text-muted-foreground">
        We've sent you a confirmation email{orderId ? ` for order #${orderId.slice(0, 8)}` : ""}.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button asChild><Link href="/account/orders">View my orders</Link></Button>
        <Button asChild variant="outline"><Link href="/products">Keep shopping</Link></Button>
      </div>
    </div>
  );
}
