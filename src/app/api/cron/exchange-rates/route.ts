import { NextResponse } from "next/server";
import { refreshRatesFromExternalAPI } from "@/lib/currency";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rates = await refreshRatesFromExternalAPI();
  return NextResponse.json({ ok: true, rates });
}
