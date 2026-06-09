import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-7xl font-bold tracking-tight">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">We couldn't find that page.</p>
      <Button asChild className="mt-6"><Link href="/">Back to home</Link></Button>
    </div>
  );
}
