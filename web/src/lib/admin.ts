/**
 * Catalog administrators are listed in ADMIN_EMAILS (comma-separated). Nobody is an admin by default.
 */
export function adminEmails(raw = process.env.ADMIN_EMAILS) {
  return new Set(
    String(raw ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined, raw = process.env.ADMIN_EMAILS) {
  return Boolean(email) && adminEmails(raw).has(String(email).trim().toLowerCase());
}
