import { normalizeUrl, splitAliases } from "@/lib/catalog/normalize";

/**
 * NCES IPEDS "Institutional Characteristics: Directory information" (HDyyyy.csv).
 * Public-domain U.S. government data: https://nces.ed.gov/ipeds/datacenter/DataFiles.aspx
 * Code values follow the HD data dictionary (-1/-2/-3 mean not reported / not applicable).
 */
export const IPEDS_SOURCE = "ipeds";

export type DirectoryRecord = {
  unitid: number;
  name: string;
  aliases: string[];
  city: string | null;
  state: string | null;
  country: string;
  institutionLevel: "four_year" | "two_year" | "less_than_two_year" | "unknown";
  control: "public" | "private_nonprofit" | "private_for_profit" | "unknown";
  sector: number | null;
  carnegieBasic: number | null;
  degreeGranting: boolean | null;
  hbcu: boolean | null;
  systemName: string | null;
  opeid: string | null;
  opeid6: string | null;
  isBranchCampus: boolean;
  websiteUrl: string | null;
  admissionsUrl: string | null;
  applicationUrl: string | null;
  isActive: boolean;
  mergedIntoUnitid: number | null;
  offersUndergrad: boolean;
};

function code(value: string | undefined) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function yesNo(value: string | undefined) {
  const parsed = code(value);
  return parsed === 1 ? true : parsed === 2 ? false : null;
}

function text(value: string | undefined) {
  const trimmed = String(value ?? "").trim();
  return trimmed && !/^-[123]$/.test(trimmed) ? trimmed : null;
}

const LEVELS: Record<number, DirectoryRecord["institutionLevel"]> = {
  1: "four_year",
  2: "two_year",
  3: "less_than_two_year",
};

const CONTROLS: Record<number, DirectoryRecord["control"]> = {
  1: "public",
  2: "private_nonprofit",
  3: "private_for_profit",
};

/** Maps one HD row; returns an error string instead of guessing when required fields are missing. */
export function mapIpedsRow(record: Record<string, string>): DirectoryRecord | { error: string } {
  const unitid = code(record.UNITID);
  const name = text(record.INSTNM);
  if (!unitid) {
    return { error: `Missing or invalid UNITID (${record.UNITID || "empty"})` };
  }
  if (!name) {
    return { error: `UNITID ${unitid} has no INSTNM` };
  }

  const opeidRaw = String(record.OPEID ?? "").trim();
  const opeid = /^\d{8}$/.test(opeidRaw) ? opeidRaw : null;
  const deathYear = code(record.DEATHYR);
  const newId = code(record.NEWID);

  return {
    unitid,
    name,
    aliases: splitAliases(record.IALIAS).filter((alias) => alias.toLowerCase() !== name.toLowerCase()),
    city: text(record.CITY),
    state: text(record.STABBR),
    country: "US",
    institutionLevel: LEVELS[code(record.ICLEVEL) ?? -1] ?? "unknown",
    control: CONTROLS[code(record.CONTROL) ?? -1] ?? "unknown",
    sector: code(record.SECTOR),
    carnegieBasic: code(record.C21BASIC),
    degreeGranting: yesNo(record.DEGGRANT),
    hbcu: yesNo(record.HBCU),
    systemName: code(record.F1SYSTYP) === 1 ? text(record.F1SYSNAM) : null,
    opeid,
    opeid6: opeid ? opeid.slice(0, 6) : null,
    // OPEID's last two digits identify additional locations; "00" is the main campus.
    isBranchCampus: opeid ? opeid.slice(6) !== "00" : false,
    websiteUrl: normalizeUrl(record.WEBADDR),
    admissionsUrl: normalizeUrl(record.ADMINURL),
    applicationUrl: normalizeUrl(record.APPLURL),
    isActive: code(record.CYACTIVE) === 1 && deathYear === null,
    mergedIntoUnitid: newId && newId !== unitid ? newId : null,
    offersUndergrad: code(record.UGOFFER) === 1,
  };
}
