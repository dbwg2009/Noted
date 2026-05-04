import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials?: Record<string, any>) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const [userRow] = await db
          .select({ id: users.id, email: users.email, name: users.name, image: users.image, passwordHash: users.passwordHash })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!userRow || !userRow.passwordHash) return null;

        const ok = bcrypt.compareSync(String(credentials.password), userRow.passwordHash);
        if (!ok) return null;

        return { id: userRow.id, email: userRow.email, name: userRow.name, image: userRow.image };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
});
