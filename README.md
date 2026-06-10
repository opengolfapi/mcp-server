# @opengolfapi/mcp-server

Open MCP server for AI agents to query the OpenGolfAPI dataset (14,708 US golf courses). All data is ODbL licensed and open.

All requests go through the public API at https://api.opengolfapi.org. With an optional `OPENGOLFAPI_KEY`, requests authenticate as your tier and unlock higher rate limits.

## Install

```bash
npm install -g @opengolfapi/mcp-server
```

## Configure

Add to your MCP client config:

```json
{
  "mcpServers": {
    "opengolfapi": {
      "command": "opengolfapi-mcp"
    }
  }
}
```

## API keys (optional)

### Optional: higher rate limits with a free key

Without a key, the MCP server uses anonymous access (1,000 requests/day per IP).

Get a free key at https://courses.opengolfapi.org/api-keys (~30 seconds, no card),
then set:

```bash
export OPENGOLFAPI_KEY=ogapi_yourkeyhere
```

In Claude Desktop's MCP config, add the env var to the server entry:

```json
{
  "mcpServers": {
    "opengolfapi": {
      "command": "npx",
      "args": ["@opengolfapi/mcp-server"],
      "env": { "OPENGOLFAPI_KEY": "ogapi_yourkeyhere" }
    }
  }
}
```

Donor tiers raise the daily limit further (10k / 50k / 250k / 1M).

## Tools

- `search_courses(query, state?, lat?, lng?, radius_mi?)` — find courses by name, state, or location
- `get_course(id)` — full course record with scorecard (par + handicap index per hole)
- `get_tees(id)` — all tee sets with ratings, slopes, and yardages
- `get_climate(id)` — monthly climate normals for the course location
- `get_nearby(id)` — nearby POIs (hotels, restaurants, airports)

## Telemetry

This server reports unhandled errors to the OpenGolfAPI Sentry project by default so the maintainers can catch bugs that hit real users. **No request bodies, no API keys, no PII** — only stack traces of exceptions thrown inside the server process. Quotas and sampling live in the Sentry project config; the DSN is an ingest endpoint, not a secret.

To opt out completely:

```
OPENGOLFAPI_DISABLE_TELEMETRY=1 npx @opengolfapi/mcp-server
```

To send to your own Sentry project instead (overrides the default DSN):

```
SENTRY_DSN=https://your-dsn@sentry.io/... npx @opengolfapi/mcp-server
```

Example MCP config:

```json
{
  "mcpServers": {
    "opengolfapi": {
      "command": "npx",
      "args": ["@opengolfapi/mcp-server"],
      "env": {
        "OPENGOLFAPI_KEY": "ogapi_yourkeyhere"
      }
    }
  }
}
```

## License

MIT
