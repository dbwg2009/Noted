import { Resend } from "resend";
import type { DigestUserBlock, ShortlistEntry } from "@/lib/reminders";
import { poundsFromPence } from "@/lib/birthdays";

const FALLBACK_FROM = "Birthday Gift Finder <onboarding@resend.dev>";

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

function priceLabel(entry: ShortlistEntry) {
  const price = poundsFromPence(entry.pricePence);
  if (entry.kind === "suggestion") {
    return price ? `est. ${price}` : "est. price unknown";
  }
  return price ?? "price unknown";
}

function renderShortlistText(shortlist: ShortlistEntry[]) {
  if (shortlist.length === 0) return "  (no shortlist yet — add wishlist items or run Suggest gifts)\n";
  return shortlist
    .map((entry) => {
      const tag = entry.kind === "product" ? "product" : "idea";
      const retailer = entry.retailer ? ` @ ${entry.retailer}` : "";
      const url = entry.url ? `\n     ${entry.url}` : "";
      return `  - [${tag}] ${entry.title}${retailer} (${priceLabel(entry)})${url}`;
    })
    .join("\n");
}

function renderShortlistHtml(shortlist: ShortlistEntry[]) {
  if (shortlist.length === 0) {
    return `<p style="color:#6b7280;font-size:13px;margin:8px 0 0;">No shortlist yet — add wishlist items or run “Suggest gifts”.</p>`;
  }
  return `<ul style="margin:8px 0 0;padding-left:18px;font-size:14px;color:#1f2937;">
${shortlist
  .map((entry) => {
    const tag = entry.kind === "product" ? "Product" : "Idea";
    const retailer = entry.retailer ? ` <span style="color:#6b7280;">@ ${escapeHtml(entry.retailer)}</span>` : "";
    const price = `<span style="color:#6b7280;"> · ${escapeHtml(priceLabel(entry))}</span>`;
    const link = entry.url
      ? `<br/><a href="${escapeHtml(entry.url)}" style="color:#2563eb;font-size:13px;">${escapeHtml(entry.url)}</a>`
      : "";
    return `<li style="margin-bottom:6px;"><strong>${escapeHtml(entry.title)}</strong> <span style="color:#6b7280;font-size:12px;">[${tag}]</span>${retailer}${price}${link}</li>`;
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
  lines.push("---\nSent by Birthday Gift Finder.");
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
    <p style="margin:24px 0 0;font-size:12px;color:#6b7280;">Sent by Birthday Gift Finder. Manage reminders at <a href="${escapeHtml(baseUrl)}" style="color:#2563eb;">${escapeHtml(baseUrl)}</a>.</p>
  </div>
</body></html>`;
}

export async function sendReminderDigest(digest: DigestUserBlock) {
  if (digest.blocks.length === 0) return { skipped: true as const };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");

  const from = process.env.EMAIL_FROM?.trim() || FALLBACK_FROM;
  const baseUrl = process.env.AUTH_URL?.trim() || "http://localhost:3000";

  const subject = digest.blocks.length === 1
    ? `Birthday reminder: ${digest.blocks[0].personName}`
    : `Birthday reminders: ${digest.blocks.length} upcoming`;

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: digest.userEmail,
    subject,
    text: renderDigestText(digest, baseUrl),
    html: renderDigestHtml(digest, baseUrl),
  });

  if (result.error) {
    throw new Error(`Resend: ${result.error.name ?? "error"} - ${result.error.message ?? "unknown"}`);
  }
  return { skipped: false as const, id: result.data?.id ?? null };
}
