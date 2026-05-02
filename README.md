# @opengolfapi/mcp-server

Open MCP server for AI agents to query the OpenGolfAPI dataset (14,708 US golf courses). All data is ODbL licensed and open.

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

## License

MIT
