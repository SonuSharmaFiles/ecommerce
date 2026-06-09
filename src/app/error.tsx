"use client";

import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-4xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
