#!/usr/bin/env node
/**
 * Moves oldest dated changelog entries from CHANGELOG.md to CHANGELOG-legacy.md
 * when CHANGELOG.md exceeds MAX_LINES. Newest entries stay at the top of CHANGELOG.md.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHANGELOG = path.join(ROOT, "CHANGELOG.md");
const LEGACY = path.join(ROOT, "CHANGELOG-legacy.md");
const MAX_LINES = 300;
const TARGET_LINES = 250;
const DATED_HEADING = /^## \[\d{4}-\d{2}-\d{2}\]/;

function lines(s) {
  return s.split("\n").length;
}

function walkOutsideFences(lineObjs) {
  let inFence = false;
  const out = [];
  for (let i = 0; i < lineObjs.length; i++) {
    const line = lineObjs[i].text;
    if (line.trim().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) out.push({ i, line });
  }
  return out;
}

function main() {
  const raw = fs.readFileSync(CHANGELOG, "utf8");
  const lineList = raw.split("\n").map((text, i) => ({ i, text }));

  if (lines(raw) <= MAX_LINES) {
    console.log(`CHANGELOG.md has ${lines(raw)} lines (limit ${MAX_LINES}). No archive needed.`);
    return;
  }

  const outside = walkOutsideFences(lineList);
  let firstEntryLineIdx = -1;
  for (const { i, line } of outside) {
    if (DATED_HEADING.test(line)) {
      firstEntryLineIdx = i;
      break;
    }
  }
  if (firstEntryLineIdx === -1) {
    console.error("No dated entries (## [YYYY-MM-DD]) found outside code fences.");
    process.exit(1);
  }

  const preamble = lineList.slice(0, firstEntryLineIdx).map((x) => x.text);
  const entryRegion = lineList.slice(firstEntryLineIdx).map((x) => x.text);

  const blocks = [];
  let cur = [];
  for (const line of entryRegion) {
    if (DATED_HEADING.test(line) && cur.length > 0) {
      blocks.push(cur);
      cur = [line];
    } else {
      cur.push(line);
    }
  }
  if (cur.length) blocks.push(cur);

  if (blocks.length < 2) {
    console.warn("Only one entry block; cannot auto-archive. Shorten manually or raise limits.");
    return;
  }

  const kept = [...blocks];
  const archived = [];

  function renderedMain() {
    const body = kept.map((b) => b.join("\n")).join("\n\n");
    return [...preamble, body].join("\n") + "\n";
  }

  while (lines(renderedMain()) > TARGET_LINES && kept.length > 1) {
    archived.unshift(kept.pop());
  }

  if (lines(renderedMain()) > MAX_LINES && kept.length === 1) {
    console.warn(
      `Single remaining entry still ${lines(renderedMain())} lines (>${MAX_LINES}). Manual edit required.`,
    );
    return;
  }

  if (archived.length === 0) {
    console.log("No blocks archived (unexpected).");
    return;
  }

  const archivedText = archived.map((b) => b.join("\n")).join("\n\n---\n\n");
  let legacyRaw = "";
  if (fs.existsSync(LEGACY)) {
    legacyRaw = fs.readFileSync(LEGACY, "utf8");
  } else {
    legacyRaw = `# Changelog (legacy — archived from CHANGELOG.md)

Older entries are moved here when CHANGELOG.md grows past ${MAX_LINES} lines. See CHANGELOG.md for recent work.

`;
  }

  const sep = "\n---\n";
  const splitIdx = legacyRaw.indexOf(sep);
  let newLegacy;
  if (splitIdx === -1) {
    newLegacy = `${legacyRaw.trimEnd()}${sep}\n\n${archivedText}\n`;
  } else {
    const head = legacyRaw.slice(0, splitIdx).trimEnd();
    const body = legacyRaw.slice(splitIdx + sep.length).replace(/^\n+/, "");
    newLegacy = `${head}${sep}\n\n${archivedText}\n\n---\n\n${body}`;
  }

  fs.writeFileSync(CHANGELOG, renderedMain(), "utf8");
  fs.writeFileSync(LEGACY, newLegacy, "utf8");

  console.log(
    `Archived ${archived.length} entr${archived.length === 1 ? "y" : "ies"} to CHANGELOG-legacy.md; CHANGELOG.md now ${lines(renderedMain())} lines.`,
  );
}

main();
