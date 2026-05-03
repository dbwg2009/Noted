import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { verificationTokens, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").toLowerCase().trim();
    const token = String(body.token ?? "");
    const password = String(body.password ?? "");

    if (!email || !token || !password) return NextResponse.json({ error: "missing" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "password_too_short" }, { status: 400 });

    const rows = await db.select().from(verificationTokens).where(eq(verificationTokens.identifier, email));
    const row = rows.find((r) => r.token === token && new Date(r.expires) > new Date());
    if (!row) return NextResponse.json({ error: "invalid_or_expired" }, { status: 400 });

    const hash = bcrypt.hashSync(password, 10);
    await db.update(users).set({ passwordHash: hash }).where(eq(users.email, email));

    // remove any matching tokens for this identifier
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
