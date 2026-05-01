import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, people } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateIcal } from "@/lib/ical";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return new Response("Token required", { status: 400 });
  }

  // Validate token and find user
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.icalToken, token))
    .limit(1);

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get people for this user to build the calendar
  const userPeople = await db
    .select({ id: people.id, name: people.name, birthday: people.birthday })
    .from(people)
    .where(eq(people.userId, user.id));

  const ical = generateIcal(userPeople);

  return new Response(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="birthdays.ics"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}
