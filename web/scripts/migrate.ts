import { connectDatabase } from "../src/db/connect";
import { runMigrations } from "../src/db/migrator";

async function main() {
  const connection = await connectDatabase();
  try {
    console.log(`Migrating ${connection.label}`);
    const result = await runMigrations(connection, { log: (line) => console.log(`  ${line}`) });
    console.log(
      result.applied.length > 0
        ? `Applied ${result.applied.length} migration(s): ${result.applied.join(", ")}`
        : "Database is already up to date.",
    );
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
