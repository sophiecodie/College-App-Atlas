/**
 * Curation helper: fetches official admissions pages politely and prints what a curator needs to write
 * a manifest (data/admissions/<cycle>/*.json). It never writes to the database.
 *
 *   npm run catalog:curate -- --url https://admissions.example.edu/apply --grep "words|deadline"
 *   npm run catalog:curate -- --unitids 166027,130794 --links      # start from IPEDS admissions URLs
 */
import { connectDatabase } from "../src/db/connect";
import { PoliteFetcher } from "../src/lib/ingest/fetcher";

function argValue(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const LINK_PATTERN = /essay|supplement|writing|question|deadline|dates|first-year|freshman|apply|application-requirements|how-to-apply/i;

function extractLinks(html: string, base: string) {
  const links = new Map<string, string>();
  for (const match of html.matchAll(/<a\b[^>]*href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = match[2]!.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    try {
      const url = new URL(match[1]!, base);
      if (url.host === new URL(base).host && (LINK_PATTERN.test(url.pathname) || LINK_PATTERN.test(label))) {
        links.set(url.toString(), label.slice(0, 60));
      }
    } catch {
      // ignore malformed hrefs
    }
  }
  return [...links.entries()].slice(0, 25);
}

async function main() {
  const fetcher = new PoliteFetcher();
  const grep = argValue("--grep");
  const targets: Array<{ label: string; url: string }> = [];
  process.argv.forEach((arg, index) => {
    const url = process.argv[index + 1];
    if (arg === "--url" && url) targets.push({ label: url, url });
  });

  const unitids = argValue("--unitids");
  if (unitids) {
    const connection = await connectDatabase();
    const rows = await connection.query<{ ipeds_unitid: number; name: string; admissions_url: string | null; website_url: string | null }>(
      "select ipeds_unitid, name, admissions_url, website_url from colleges where ipeds_unitid = any($1::int[])",
      [unitids.split(",").map(Number)],
    );
    await connection.close();
    for (const row of rows) {
      const url = row.admissions_url ?? row.website_url;
      if (url) targets.push({ label: `${row.ipeds_unitid} ${row.name}`, url });
      else console.log(`${row.ipeds_unitid} ${row.name}: no admissions URL in IPEDS`);
    }
  }

  await Promise.all(
    targets.map(async (target) => {
      const result = await fetcher.fetchPage(target.url, { keepHtml: true });
      const lines = [`== ${target.label} — ${result.finalUrl ?? result.url} — ${result.ok ? `HTTP ${result.status}` : result.error}`];
      if (result.ok && process.argv.includes("--links") && result.html) {
        for (const [url, label] of extractLinks(result.html, result.finalUrl ?? result.url)) lines.push(`   link: ${label} → ${url}`);
      }
      if (result.ok && grep) {
        const pattern = new RegExp(grep, "i");
        for (const line of result.text.split("\n")) {
          if (pattern.test(line) && line.length < 900) lines.push(`   | ${line}`);
        }
      }
      if (result.ok && process.argv.includes("--text")) lines.push(result.text);
      console.log(lines.join("\n"));
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
