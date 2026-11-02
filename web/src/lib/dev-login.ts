/** The test-student sign-in exists only when explicitly enabled outside production. */
export function devLoginEnabled() {
  return process.env.ATLAS_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production";
}

export const DEV_STUDENT = {
  email: "student@collegeatlas.local",
  name: "Test Student",
};
