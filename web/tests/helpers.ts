import { connectDatabase, type AtlasConnection } from "../src/db/connect";
import { runMigrations } from "../src/db/migrator";
import { readCsvRecords } from "../src/lib/catalog/csv";
import { type DirectoryRecord, mapIpedsRow } from "../src/lib/catalog/ipeds";
import type { FetchResult } from "../src/lib/ingest/fetcher";

/** A fresh in-memory Postgres with every migration applied. */
export async function freshDatabase(): Promise<AtlasConnection> {
  const connection = await connectDatabase({ pgliteDir: "memory://" });
  await runMigrations(connection);
  return connection;
}

export async function createUser(connection: AtlasConnection, email: string) {
  const [row] = await connection.query<{ id: string }>("insert into users (email) values ($1) returning id", [email]);
  return row!.id;
}

const IPEDS_HEADER =
  "UNITID,INSTNM,IALIAS,CITY,STABBR,OPEID,WEBADDR,ADMINURL,APPLURL,SECTOR,ICLEVEL,CONTROL,UGOFFER,DEGGRANT,HBCU,CYACTIVE,DEATHYR,NEWID,C21BASIC,F1SYSTYP,F1SYSNAM";

export type IpedsFixtureRow = Partial<Record<string, string>> & { UNITID: string; INSTNM: string };

export function ipedsCsv(rows: IpedsFixtureRow[]) {
  const columns = IPEDS_HEADER.split(",");
  const defaults: Record<string, string> = {
    IALIAS: " ",
    CITY: "Somewhere",
    STABBR: "MA",
    OPEID: "00100000",
    WEBADDR: "www.example.edu/",
    ADMINURL: "https://www.example.edu/admissions",
    APPLURL: " ",
    SECTOR: "2",
    ICLEVEL: "1",
    CONTROL: "2",
    UGOFFER: "1",
    DEGGRANT: "1",
    HBCU: "2",
    CYACTIVE: "1",
    DEATHYR: "-2",
    NEWID: "-2",
    C21BASIC: "15",
    F1SYSTYP: "2",
    F1SYSNAM: "-2",
  };
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [IPEDS_HEADER, ...rows.map((row) => columns.map((column) => quote(row[column] ?? defaults[column] ?? "")).join(","))].join(
    "\r\n",
  );
}

export async function directoryRecords(csv: string) {
  const records: DirectoryRecord[] = [];
  for await (const { record } of readCsvRecords([csv])) {
    const mapped = mapIpedsRow(record);
    if (!("error" in mapped)) records.push(mapped);
  }
  return records;
}

/** Page loader backed by a URL → text map; missing URLs behave like a 404. */
export function fakePages(pages: Record<string, string>) {
  return async (url: string): Promise<FetchResult> =>
    url in pages
      ? { url, ok: true, status: 200, contentType: "text/html", text: pages[url]!, byteLength: pages[url]!.length, error: null, blockedByRobots: false }
      : { url, ok: false, status: 404, contentType: null, text: "", byteLength: 0, error: "HTTP 404 (HTTP error)", blockedByRobots: false };
}
