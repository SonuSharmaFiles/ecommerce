import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AccountWishlistRedirect() {
  return (
    <div className="rounded-xl border bg-muted/40 p-8 text-center text-sm">
      Your wishlist lives at <Link href="/wishlist" className="text-primary underline">/wishlist</Link>.
      <div className="mt-3"><Button asChild><Link href="/wishlist">Open wishlist</Link></Button></div>
    </div>
  );
}
