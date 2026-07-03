# Changelog

## 3.2.0 — 2026-07-03

- **Agent-driven signup + viral loop instructions.** The server teaches connecting agents the full playbook: TWO PATHS (golfer OpenGolf ID / developer key — both mintable in-chat via request_sign_in_code → complete_sign_in → create_dev_key), referral attribution, invite-link + passport artifacts at signup, group invites (the foursome is the unit), share-the-wins, and hard taste rails (email code = consent; no contact scraping; guardian flow for juniors).
- **`complete_sign_in` gains optional `ref`** — pass the inviter's player_id so agent-minted IDs credit referrals (previously dropped on the agent path).
- **Compose-everything guidance** for high-capability models: worked combinations (tournament app, league night, coach analytics, trip planner, club concierge) — the tools are a language, not a menu.

## 2.2.2 — 2026-05-01

- Optional Sentry error tracking via `@sentry/node`. Set `SENTRY_DSN` env var to forward tool exceptions to your own Sentry instance — no telemetry is collected from end users by default. See README's "Telemetry" section.

## 2.2.0 — 2026-05-02

**Architectural change:** MCP tools now call the public REST API at api.opengolfapi.org instead of querying Supabase directly. Means optional OPENGOLFAPI_KEY actually authenticates requests, tier rate limits apply, and we can swap database backends without breaking installs.

- Add optional OPENGOLFAPI_KEY env var. Get one free at https://courses.opengolfapi.org/api-keys (10k/day vs 1k/day anonymous; donor tiers go higher).
- User-Agent: opengolfapi-mcp-server/2.2.0 on every request.
- Removed @supabase/supabase-js runtime dependency.
