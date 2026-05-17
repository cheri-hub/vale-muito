import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(rootDir, "src/lib/supabase/database.types.ts");
const projectId = process.env.SUPABASE_PROJECT_ID;
const args = ["supabase@latest", "gen", "types", "typescript", "--schema", "public"];

if (projectId) {
  args.push("--project-id", projectId);
} else {
  args.push("--local");
}

const result = spawnSync("npx", args, {
  cwd: rootDir,
  encoding: "utf8",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

if (!result.stdout.includes("export type Database") && !result.stdout.includes("export interface Database")) {
  process.stderr.write("Supabase CLI did not return a Database type. Existing types were not overwritten.\n");
  process.exit(1);
}

writeFileSync(outputPath, result.stdout);
process.stdout.write(`Generated ${outputPath}\n`);