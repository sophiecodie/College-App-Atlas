// The app's Neon client module throws at import without DATABASE_URL. Tests never use it (they run on an
// in-memory PGlite database), and Neon's driver does not connect until a query runs, so a placeholder is safe.
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.APPLICATION_CYCLE ??= "2026-2027";
