# Publishing @opengolfapi/mcp-server (v2.0.0)

This folder is now a complete, publishable package: `package.json`, `tsconfig.json`, `README.md`,
the source (`index.ts`, `db.ts`, `opengolf.ts`), and a `node` shebang on the entry.

## What's new in v2.0.0
- Geometry **removed** from the free tools (moat stays paid/OpenGolfGeo).
- **Two-way:** added `log_shot`, `submit_moment` (contribute) + `get_my_shots` (read back).
- Renamed server `golfagi` → `opengolfapi`; agent-facing CTA in the server instructions.
- AI-attractive description + keywords; README cross-links OpenGolf Connect + the sensor API.

## Publish — two ways

### A) You run it (interactive)
```bash
cd mcp-server          # (or the public opengolfapi/mcp-server repo if you keep them separate)
npm install
npm login              # interactive
npm publish --access public
```

### B) Let CI / the agent publish it (token, non-interactive)
1. npmjs.com → **Access Tokens → Generate New Token → Automation**.
2. Put it in `.env` as `NPM_TOKEN=npm_xxx` (gitignored).
3. Then:
   ```bash
   cd mcp-server
   npm install
   echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc
   npm publish --access public
   ```

`prepublishOnly` runs `npm run build` (tsc → `dist/`), and `bin` points at `dist/index.js`, so
`npx -y @opengolfapi/mcp-server` just works after publish.

## Then
- Submit to registries agents browse: **smithery.ai/new** and **mcp.run** (server name `OpenGolfAPI`, repo `github.com/opengolfapi/mcp-server`).
- If you keep a separate public mirror repo, sync these files into it first, then publish from there.
