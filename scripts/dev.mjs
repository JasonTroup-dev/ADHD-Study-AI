import { readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = getCanonicalDirectory(path.dirname(scriptDirectory));
const nextCli = path.join(
  projectDirectory,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

const result = spawnSync(
  process.execPath,
  [nextCli, "dev", "--webpack", ...process.argv.slice(2)],
  {
    cwd: projectDirectory,
    env: process.env,
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

function getCanonicalDirectory(directory) {
  const parentDirectory = path.dirname(directory);
  const requestedName = path.basename(directory);
  const matchingEntry = readdirSync(parentDirectory, {
    withFileTypes: true,
  }).find(
    (entry) =>
      entry.isDirectory() &&
      entry.name.localeCompare(requestedName, undefined, {
        sensitivity: "accent",
      }) === 0,
  );

  return matchingEntry
    ? path.join(parentDirectory, matchingEntry.name)
    : directory;
}
