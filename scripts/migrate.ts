import { readFileSync } from "fs";
import { join } from "path";

const files = ["001_init.sql", "002_rls.sql"];

console.log("Run these SQL files in the Supabase SQL editor, in order:\n");
for (const file of files) {
  const path = join(process.cwd(), "database", "migrations", file);
  console.log(`--- ${file} ---`);
  console.log(readFileSync(path, "utf8"));
  console.log("\n");
}
