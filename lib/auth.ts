import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/db/schema";

const allowedEmail = process.env.ALLOWED_EMAIL?.toLowerCase().trim();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Single-user mode: only ALLOWED_EMAIL may sign in.
      if (!allowedEmail) return false;
      return user.email?.toLowerCase() === allowedEmail;
    },
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
  },
});
