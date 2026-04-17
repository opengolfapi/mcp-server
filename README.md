# @opengolfapi/mcp-server

Open MCP server for AI agents to query the OpenGolfAPI dataset (16,908 US golf courses). All data is ODbL licensed and open.

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

## Tools

- `search_courses(query, state?, lat?, lng?, radius_mi?)` — find courses by name, state, or location
- `get_course(id)` — full course record with scorecard (par + handicap index per hole)
- `get_tees(id)` — all tee sets with ratings, slopes, and yardages
- `get_climate(id)` — monthly climate normals for the course location
- `get_nearby(id)` — nearby POIs (hotels, restaurants, airports)

## License

MIT
