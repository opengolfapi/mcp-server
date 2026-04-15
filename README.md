# @opengolfapi/mcp-server

Free MCP server for AI agents to query the OpenGolfAPI dataset (16,908 US golf courses).

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

- `search_courses(query, state?)` — find courses by name + state
- `get_course(id)` — full free-tier course record with scorecard

For premium data (per-tee ratings, climate, nearby POIs, booking links), see **[GolfAGI](https://golfagi.com)**.

## License

MIT
