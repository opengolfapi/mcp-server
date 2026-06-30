/**
 * Keep the discoverability surface in sync with the CODE — single source of truth = the server.tool()
 * calls in index.ts. Regenerates server.json (tools + version) and the README tool list. Runs on
 * prepublish, so a published package can never advertise a stale tool set. Add a tool → it shows up
 * everywhere automatically.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(dir, 'src', 'index.ts'), 'utf8');
const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));

// extract every server.tool('name', 'description', …)
const tools = [...src.matchAll(/server\.tool\(\s*'([a-z_]+)',\s*'((?:[^'\\]|\\.)*)'/g)]
  .map((m) => ({ name: m[1], description: m[2].replace(/\\'/g, "'") }));
if (!tools.length) { console.error('gen-manifest: found 0 tools — aborting (regex drift?)'); process.exit(1); }

// CORE DISCIPLINE: nothing paid/gated/geo is ever public. Fail the build if the public MCP calls a gated
// path. The OPEN standard includes GROSS scoring (/compute, free+keyless) + dev signup (/developer); the
// MOAT stays out: settlement, events, geometry/geo, ads, the engine catalog (surface), corpus stats.
const calls = [...src.matchAll(/api(?:Get|Post)[^(]*\(\s*[`'"]([^`'"]+)/g)].map((m) => m[1]);
const gated = calls.filter((p) => /\/(events|geo|ads|surface)\b|settle|players\/[^/]*\/stats/.test(p));   // compute(gross)/developer/awards/profile/beacon are OPEN
if (gated.length) { console.error('gen-manifest: PUBLIC MCP calls GATED paths — paid/gated must NEVER be public:', gated.join(', '), '\nAborting.'); process.exit(1); }

// TEXT footprint gate — the moat brand/recipe must NEVER appear in any shipped STRING (instructions, tool
// descriptions, README). Catches prose leaks the call-path check can't (this is the class that shipped in a
// stale copy: an instructions line naming the paid layer). "Remove entirely," not "soften."
const FORBIDDEN = /opengolfgeo|golfagi\.com|plays[-\s]?like|strokes[-\s]?gained|\bpaid\b/i;
const srcHit = src.match(FORBIDDEN);
if (srcHit) { console.error(`gen-manifest: FOOTPRINT LEAK in src/index.ts ("${srcHit[0]}") — geo/paid must NEVER be public. Aborting.`); process.exit(1); }

// VERSION single-source — the in-code handshake (PKG_VERSION) flows from package.json, so it can never drift
// from the published version (the bug that let a stale copy report an old version).
const idxPath = join(dir, 'src', 'index.ts');
const idxSynced = src.replace(/const PKG_VERSION = '[^']*';/, `const PKG_VERSION = '${pkg.version}';`);
if (idxSynced !== src) writeFileSync(idxPath, idxSynced);

// 1) server.json — keep version in sync (the official MCP registry schema is strict: no `tools` field,
//    camelCase only). Tools live in the README (below) + are introspected from the package at runtime.
const sjPath = join(dir, 'server.json');
const sj = JSON.parse(readFileSync(sjPath, 'utf8'));
sj.version = pkg.version;
if (sj.packages?.[0]) sj.packages[0].version = pkg.version;
writeFileSync(sjPath, JSON.stringify(sj, null, 2) + '\n');

// 2) README — tool list between markers
const rmPath = join(dir, 'README.md');
let rm = readFileSync(rmPath, 'utf8');
const list = tools.map((t) => `- \`${t.name}\` — ${t.description}`).join('\n');
const block = `<!-- TOOLS:START (auto-generated from src by gen-manifest.mjs — do not edit by hand) -->\n_${tools.length} tools:_\n\n${list}\n<!-- TOOLS:END -->`;
rm = rm.replace(/<!-- TOOLS:START[\s\S]*?<!-- TOOLS:END -->/, block);
writeFileSync(rmPath, rm);

console.log(`gen-manifest: synced ${tools.length} tools → server.json + README (v${pkg.version})`);
