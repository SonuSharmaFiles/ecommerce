import { NextResponse } from "next/server";
import { clearDevSession } from "@/lib/dev-auth";

export async function POST() {
  await clearDevSession();
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}
