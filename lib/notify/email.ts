import { Resend } from "resend";
import type { DigestUserBlock, ShortlistEntry } from "@/lib/reminders";

const FALLBACK_FROM = "Noted <onboarding@resend.dev>";

export function fromAddress(specificEnvKey: string): string {
  const val =
    process.env[specificEnvKey]?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    FALLBACK_FROM;
  return val.replace(/^["']|["']$/g, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function describeLead(leadDays: number) {
  if (leadDays === 0) return "today";
  if (leadDays === 1) return "tomorrow";
  return `in ${leadDays} days`;
}

function renderShortlistText(shortlist: ShortlistEntry[]) {
  if (shortlist.length === 0) return `  (no shortlist yet — add wishlist items or run Suggest gifts)\n`;
  return shortlist
    .map((entry) => {
      const tag = entry.kind === "product" ? "product" : "idea";
      const retailer = entry.retailer ? ` @ ${entry.retailer}` : "";
      return `  - [${tag}] ${entry.title}${retailer}`;
    })
    .join("\n");
}

function renderShortlistHtml(shortlist: ShortlistEntry[]) {
  if (shortlist.length === 0) {
    return `<p style="color:#6b7280;font-size:13px;margin:8px 0 0;">No shortlist yet — add wishlist items or run "Suggest gifts".</p>`;
  }
  return `<ul style="margin:8px 0 0;padding-left:18px;font-size:14px;color:#1f2937;">
${shortlist
  .map((entry) => {
    const tag = entry.kind === "product" ? "Product" : "Idea";
    const retailer = entry.retailer ? ` <span style="color:#6b7280;">@ ${escapeHtml(entry.retailer)}</span>` : "";
    return `<li style="margin-bottom:6px;"><strong>${escapeHtml(entry.title)}</strong> <span style="color:#6b7280;font-size:12px;">[${tag}]</span>${retailer}</li>`;
  })
  .join("\n")}
</ul>`;
}

export function renderDigestText(digest: DigestUserBlock, baseUrl: string) {
  const lines: string[] = [];
  lines.push("Birthday reminders\n");
  for (const block of digest.blocks) {
    lines.push(
      `• ${block.personName}${block.relationship ? ` (${block.relationship})` : ""} — birthday on ${block.targetDate}, ${describeLead(block.leadDays)}.`,
    );
    lines.push(renderShortlistText(block.shortlist));
    lines.push(`  Open: ${baseUrl}/people/${block.personId}\n`);
  }
  lines.push("---\nSent by Noted.");
  return lines.join("\n");
}

export function renderDigestHtml(digest: DigestUserBlock, baseUrl: string) {
  const blocks = digest.blocks
    .map(
      (block) => `
<section style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:16px;background:#fff;">
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;">
    <h2 style="margin:0;font-size:18px;color:#111827;">${escapeHtml(block.personName)}</h2>
    <span style="font-size:13px;color:#6b7280;">${block.relationship ? escapeHtml(block.relationship) + " · " : ""}birthday ${describeLead(block.leadDays)} (${escapeHtml(block.targetDate)})</span>
  </div>
  ${renderShortlistHtml(block.shortlist)}
  <p style="margin:12px 0 0;font-size:13px;"><a href="${escapeHtml(baseUrl)}/people/${block.personId}" style="color:#2563eb;">Open ${escapeHtml(block.personName)}'s page →</a></p>
</section>`,
    )
    .join("\n");

  return `<!doctype html>
<html><body style="margin:0;background:#f9fafb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:24px auto;padding:0 16px;">
    <h1 style="margin:0 0 16px;font-size:20px;">🎂 Birthday reminders</h1>
    ${blocks}
    <p style="margin:24px 0 0;font-size:12px;color:#6b7280;">Sent by Noted. Manage reminders at <a href="${escapeHtml(baseUrl)}" style="color:#2563eb;">${escapeHtml(baseUrl)}</a>.</p>
  </div>
</body></html>`;
}

type SiteWidePersonEntry = {
  id: string;
  name: string;
  relationship: string | null;
};

function renderSiteWideText(
  occasionName: string,
  lead: string,
  people: SiteWidePersonEntry[],
  baseUrl: string,
) {
  const lines: string[] = [];
  lines.push(`${occasionName} is ${lead}.\n`);
  if (people.length > 0) {
    lines.push("You've got to get gifts for:");
    for (const p of people) {
      const rel = p.relationship ? ` (${p.relationship})` : "";
      lines.push(`  • ${p.name}${rel} — ${baseUrl}/people/${p.id}`);
    }
  } else {
    lines.push("Everyone has been excluded from this occasion.");
  }
  lines.push("\n---\nSent by Noted.");
  return lines.join("\n");
}

function renderSiteWideHtml(
  occasionName: string,
  lead: string,
  people: SiteWidePersonEntry[],
  baseUrl: string,
) {
  const peopleHtml =
    people.length === 0
      ? `<p style="color:#6b7280;font-size:14px;">Everyone has been excluded from this occasion.</p>`
      : `<ul style="margin:12px 0 0;padding-left:18px;font-size:14px;color:#1f2937;">
${people
  .map((p) => {
    const rel = p.relationship ? ` <span style="color:#6b7280;">(${escapeHtml(p.relationship)})</span>` : "";
    return `<li style="margin-bottom:8px;"><a href="${escapeHtml(baseUrl)}/people/${p.id}" style="color:#111827;font-weight:600;">${escapeHtml(p.name)}</a>${rel}</li>`;
  })
  .join("\n")}
</ul>`;

  return `<!doctype html>
<html><body style="margin:0;background:#f9fafb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:24px auto;padding:0 16px;">
    <h1 style="margin:0 0 8px;font-size:20px;">🎁 ${escapeHtml(occasionName)} is ${escapeHtml(lead)}</h1>
    <p style="margin:0 0 4px;font-size:15px;color:#374151;">You've got to get gifts for:</p>
    ${peopleHtml}
    <p style="margin:24px 0 0;font-size:12px;color:#6b7280;">Sent by Noted. Manage occasions at <a href="${escapeHtml(baseUrl)}/settings" style="color:#2563eb;">${escapeHtml(baseUrl)}/settings</a>.</p>
  </div>
</body></html>`;
}

export async function sendSiteWideOccasionEmail(
  userEmail: string,
  occasionName: string,
  leadDays: number,
  people: SiteWidePersonEntry[],
) {
  if (people.length === 0) return { skipped: true as const };

  const baseUrl = process.env.AUTH_URL?.trim() || "http://localhost:3000";
  const lead = describeLead(leadDays);
  const subject = `${occasionName} ${lead} — gift reminder`;
  const id = await sendViaResend(
    userEmail,
    subject,
    renderSiteWideText(occasionName, lead, people, baseUrl),
    renderSiteWideHtml(occasionName, lead, people, baseUrl),
    fromAddress("EMAIL_FROM_REMINDERS"),
  );
  return { skipped: false as const, id };
}

async function sendViaResend(to: string, subject: string, text: string, html: string, from: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({ from, to, subject, text, html });
  if (result.error) {
    throw new Error(`Resend: ${result.error.name ?? "error"} - ${result.error.message ?? "unknown"}`);
  }
  return result.data?.id ?? null;
}


export async function sendGroupGiftInvite(toEmail: string, groupTitle: string, inviteToken: string, registered: boolean) {
  const baseUrl = process.env.AUTH_URL?.trim() || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/gift-groups/invite/${inviteToken}`;
  // Registered users land on the invite page; unregistered go to sign-up first
  const ctaUrl = registered
    ? inviteUrl
    : `${baseUrl}/login/register?callbackUrl=${encodeURIComponent(inviteUrl)}`;
  const ctaLabel = registered ? "Accept invite" : "Get started";
  const subtext = registered
    ? "Log in to Noted to accept or decline."
    : "Create a free Noted account to accept or decline.";
  const subject = `You have been invited to a group gift: ${groupTitle}`;
  const text = `You've been invited to contribute to "${groupTitle}" on Noted.\n\n${subtext}\n${ctaUrl}\n\nThis link expires in 30 days.\n\n---\nSent by Noted.`;
  const html = `<!doctype html>
<html><body style="margin:0;background:#f9fafb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:24px auto;padding:0 16px;">
    <h1 style="margin:0 0 12px;font-size:20px;">You have been invited to a group gift</h1>
    <p style="font-size:15px;margin:0 0 8px;">You've been invited to contribute to <strong>${escapeHtml(groupTitle)}</strong> on Noted.</p>
    <p style="font-size:14px;color:#6b7280;margin:0 0 20px;">${escapeHtml(subtext)}</p>
    <p style="margin:0 0 24px;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">${escapeHtml(ctaLabel)} →</a></p>
    <p style="font-size:12px;color:#6b7280;margin:0;">This link expires in 30 days. Sent by Noted.</p>
  </div>
</body></html>`;
  return sendViaResend(toEmail, subject, text, html, fromAddress("EMAIL_FROM_INVITES"));
}

export async function sendReminderDigest(digest: DigestUserBlock) {
  if (digest.blocks.length === 0) return { skipped: true as const };

  const baseUrl = process.env.AUTH_URL?.trim() || "http://localhost:3000";
  const subject = digest.blocks.length === 1
    ? `Birthday reminder: ${digest.blocks[0].personName}`
    : `Birthday reminders: ${digest.blocks.length} upcoming`;

  const id = await sendViaResend(
    digest.userEmail,
    subject,
    renderDigestText(digest, baseUrl),
    renderDigestHtml(digest, baseUrl),
    fromAddress("EMAIL_FROM_REMINDERS"),
  );
  return { skipped: false as const, id };
}
