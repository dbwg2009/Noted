import { NextResponse } from "next/server";
import { runDailyReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function checkAuth(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Without a CRON_SECRET configured we refuse to run the route at all,
    // so a misconfigured deployment can't be triggered by anyone.
    return false;
  }
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;
  return false;
}

async function handle(request: Request) {
  if (!checkAuth(request)) return unauthorized();
  const result = await runDailyReminders();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
