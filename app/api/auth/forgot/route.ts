import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { Resend } from "resend";
import { db } from "@/db";
import { verificationTokens } from "@/db/schema";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").toLowerCase().trim();
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(verificationTokens).values({ identifier: email, token, expires });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ ok: true });

    const resend = new Resend(apiKey);
    const baseUrl = process.env.AUTH_URL?.replace(/\/$/, "") || "http://localhost:3000";
    const from = process.env.EMAIL_FROM?.trim() || "Noted <onboarding@resend.dev>";
    const resetUrl = `${baseUrl}/login/reset?token=${token}&email=${encodeURIComponent(email)}`;

    await resend.emails.send({
      from,
      to: email,
      subject: "Reset your Noted password",
      text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
      html: `<p>Reset your password by clicking the link below (expires in 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
