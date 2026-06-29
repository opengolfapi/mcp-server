#!/usr/bin/env bash
# Submit @opengolfapi/mcp-server to the MCP registries. There is no single CLI for ALL of them (the
# ecosystem is fragmented), so this automates what's automatable and prints exact steps for the rest.
#
#   Automated : official MCP registry (mcp-publisher) · awesome-mcp-servers PR (gh)
#   Automatic : Glama (auto-crawls the public GitHub repo — nothing to do)
#   Manual    : Smithery · PulseMCP · mcp.so (web forms — copy below)
#
# Run from mcp-server/:  bash submit.sh
set -euo pipefail
cd "$(dirname "$0")"

NPM="@opengolfapi/mcp-server"
REPO="opengolfapi/mcp-server"
COPY="OpenGolfAPI — Golf for AI Agents. The open data layer for golf: search every US golf course (16,845) free — scorecards, tees, weather, tee advice, nearby. Contribute & own your data via the open OpenShot + Moments standards. Sign players in with a portable OpenGolf identity and run tournaments. Build a whole golf app from a prompt. 14 tools, read-free, MIT."
TAGS="golf golf-data scorecard openshot launch-monitor tournament handicap open-data"

[ -f server.json ] || { echo "❌ run from mcp-server/ (no server.json here)"; exit 1; }
echo "▸ Submitting $NPM ($(node -p "require('./package.json').version"))"
echo

# 1) OFFICIAL MCP REGISTRY — the highest-value, and it has a CLI ───────────────────────────────
echo "1) Official MCP registry (registry.modelcontextprotocol.io)"
if command -v mcp-publisher >/dev/null 2>&1; then
  echo "   mcp-publisher found. Authenticating with GitHub (namespace io.github.opengolfapi/*)…"
  mcp-publisher login github || { echo "   ⚠ login failed — you must own/admin the 'opengolfapi' GitHub org."; }
  echo "   Publishing ./server.json …"
  mcp-publisher publish && echo "   ✅ submitted to the official registry."
else
  echo "   ⚠ mcp-publisher not installed. Install it then re-run:"
  echo "       brew install mcp-publisher        # macOS"
  echo "       # or download from https://github.com/modelcontextprotocol/registry/releases"
fi
echo

# 2) GLAMA — automatic, just verify the repo is public ─────────────────────────────────────────
echo "2) Glama (glama.ai/mcp) — auto-crawls public GitHub MCP repos."
if curl -sf -o /dev/null "https://github.com/$REPO"; then
  echo "   ✅ https://github.com/$REPO is reachable → Glama will index it automatically."
  echo "   (Optional: glama.ai/mcp → search 'opengolf' → Claim to add the listing copy.)"
else
  echo "   ⚠ https://github.com/$REPO not public yet — push the public mirror first (server.json + README)."
fi
echo

# 3) AWESOME-MCP-SERVERS — a one-line PR (semi-automated via gh) ────────────────────────────────
echo "3) awesome-mcp-servers (high-traffic list) — opens a PR via gh."
LINE="- [$REPO](https://github.com/$REPO) 📇 ☁️ - Golf for AI agents: every US course free, plus open contribution, identity & tournaments."
echo "   Line to add (under 🗺️ Location or a Sports category):"
echo "       $LINE"
if [ "${1:-}" = "--pr" ] && command -v gh >/dev/null 2>&1; then
  echo "   Forking + cloning punkpeye/awesome-mcp-servers …"
  tmp=$(mktemp -d); gh repo fork punkpeye/awesome-mcp-servers --clone --fork-name awesome-mcp-servers -- "$tmp/awesome" 2>/dev/null || true
  echo "   ⚠ Auto-editing the right category line is fragile — open the cloned README, paste the line under the best category, then:"
  echo "       cd $tmp/awesome && git checkout -b add-opengolfapi && git commit -am 'Add OpenGolfAPI MCP server' && gh pr create --fill"
else
  echo "   Re-run with --pr (and gh installed) to fork+clone it, or open a PR manually."
fi
echo

# 4) WEB FORMS — Smithery / PulseMCP / mcp.so ──────────────────────────────────────────────────
echo "4) Web forms (no API) — paste the copy below:"
echo "   • Smithery : smithery.ai → Add Server → connect GitHub repo (reads smithery.yaml)"
echo "   • PulseMCP : pulsemcp.com → Submit a Server → npm: $NPM"
echo "   • mcp.so   : mcp.so → Submit → npm: $NPM"
echo
echo "   ── Listing copy ──"
echo "   $COPY"
echo "   Tags: $TAGS"
echo
echo "Done. Re-run after any 'npm publish' — server.json + README regenerate from source (gen-manifest.mjs),"
echo "so a registry re-index always picks up new tools."
