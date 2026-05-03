import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").toLowerCase().trim();
    const password = String(body.password ?? "");
    const name = body.name ? String(body.name) : null;

    if (!email || !password) {
      return NextResponse.json({ error: "email and password required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "password must be at least 8 characters" }, { status: 400 });
    }

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return NextResponse.json({ error: "user_exists" }, { status: 409 });

    const hash = bcrypt.hashSync(password, 10);
    const [created] = await db.insert(users).values({ email, name, passwordHash: hash }).returning();

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
