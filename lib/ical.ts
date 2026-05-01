/**
 * Generates an iCal string for a list of people's birthdays.
 */
export function generateIcal(people: Array<{ id: string, name: string, birthday: string }>) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Noted//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  for (const person of people) {
    const [year, month, day] = person.birthday.split("-");
    // iCal DATE format is YYYYMMDD
    const dateStr = `${year}${month}${day}`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${person.id}@birthday-gift-finder`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
    lines.push(`SUMMARY:${person.name}'s Birthday`);
    lines.push("RRULE:FREQ=YEARLY");
    lines.push("TRANSP:TRANSPARENT");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // iCal requires CRLF line endings
  return lines.join("\r\n") + "\r\n";
}
