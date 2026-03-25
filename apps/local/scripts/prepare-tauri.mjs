import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const appRoot = join(__dirname, "..");

const standaloneRoot = join(appRoot, ".next", "standalone");
const staticRoot = join(appRoot, ".next", "static");
const publicRoot = join(appRoot, "public");
const outRoot = join(appRoot, "next-server");

function findServerDir(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name === "server.js") return dir;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const found = findServerDir(join(dir, entry.name));
    if (found) return found;
  }

  return null;
}

if (!existsSync(standaloneRoot)) {
  throw new Error("Missing .next/standalone. Run `npm run build` first.");
}

const serverDir = findServerDir(standaloneRoot);
if (!serverDir) {
  throw new Error("Could not find server.js inside .next/standalone.");
}

if (existsSync(outRoot)) rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });

cpSync(serverDir, outRoot, { recursive: true });

if (existsSync(staticRoot)) {
  const outStatic = join(outRoot, ".next", "static");
  mkdirSync(dirname(outStatic), { recursive: true });
  cpSync(staticRoot, outStatic, { recursive: true });
}

if (existsSync(publicRoot) && statSync(publicRoot).isDirectory()) {
  cpSync(publicRoot, join(outRoot, "public"), { recursive: true });
}

console.log(`[prepare:tauri] Standalone server copied to ${outRoot}`);
