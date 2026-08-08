/**
 * Direct upload to Cloudflare Pages via REST API (when wrangler fetch fails locally).
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... node scripts/cloudflare-pages-upload.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const projectName = process.env.CF_PAGES_PROJECT || "mahalyerp";
const root = resolve(process.cwd(), process.env.CF_UPLOAD_DIR || "release/cloudflare-upload");

if (!token || !accountId) {
  console.error("Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID");
  process.exit(1);
}

function walk(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, base));
    else out.push("/" + relative(base, full).replace(/\\/g, "/"));
  }
  return out;
}

function hashFile(path) {
  const buf = readFileSync(path);
  return createHash("sha256").update(buf).digest("hex");
}

const paths = walk(root);
const manifest = {};
for (const webPath of paths) {
  const diskPath = join(root, webPath.slice(1).replace(/\//g, "\\"));
  manifest[webPath] = hashFile(diskPath);
}

const form = new FormData();
form.append("manifest", JSON.stringify(manifest));
for (const webPath of paths) {
  const diskPath = join(root, webPath.slice(1).replace(/\//g, "\\"));
  const blob = new Blob([readFileSync(diskPath)]);
  form.append(manifest[webPath], blob, webPath.slice(1));
}

const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments`;
const res = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
const json = await res.json();
if (!json.success) {
  console.error(JSON.stringify(json, null, 2));
  process.exit(1);
}
const dep = json.result;
console.log("DEPLOY_OK");
console.log("URL:", dep.url || `https://${projectName}.pages.dev`);
console.log("ID:", dep.id);
