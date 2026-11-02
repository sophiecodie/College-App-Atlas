/** Guest accounts let people try CollegeAtlas without signing in. Their data is stored like any user's. */
export const GUEST_EMAIL_DOMAIN = "guest.collegeatlas.app";

export function isGuestEmail(email: string | null | undefined) {
  return Boolean(email) && String(email).toLowerCase().endsWith(`@${GUEST_EMAIL_DOMAIN}`);
}

export function guestEnabled(env = process.env) {
  return env.GUEST_ACCESS !== "false";
}
