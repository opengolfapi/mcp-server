# Changelog

## 2.2.0 — 2026-05-02

**Architectural change:** MCP tools now call the public REST API at api.opengolfapi.org instead of querying Supabase directly. Means optional OPENGOLFAPI_KEY actually authenticates requests, tier rate limits apply, and we can swap database backends without breaking installs.

- Add optional OPENGOLFAPI_KEY env var. Get one free at https://courses.opengolfapi.org/api-keys (10k/day vs 1k/day anonymous; donor tiers go higher).
- User-Agent: opengolfapi-mcp-server/2.2.0 on every request.
- Removed @supabase/supabase-js runtime dependency.
