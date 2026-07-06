# @opengolfapi/mcp-server

**Golf, for AI agents — the open data layer for golf.** Give your assistant every US golf course (16,845), free, and let it contribute back, sign players in, and run tournaments. Build a whole golf app from a prompt.

[OpenGolfAPI](https://opengolfapi.org) is a community-owned commons. One free key, and your agent can read the world's golf data and write to four open standards.

---

## The standards (the whole story)

OpenGolfAPI is built on open, composable protocols — implement one or all:

| Standard | What it is | You use it to… |
|---|---|---|
| **OpenShot** | A CC0 shape for a launch-monitor shot — one schema every device maps to (Trackman, GSPro, Garmin, …). | Ingest shots from any monitor/sim → `log_shot`. |
| **Moments** | The universal event ingest — *any* sensor signal (GPS breadcrumb, swing, putt, club, score, pin, condition, presence) as one flexible event. | Send whatever signal you have → `submit_moment`. |
| **OpenJoin** | Signed, scoped, **expiring** join tokens. One QR/link → everyone who redeems lands in the same round/tournament = the group, linked. | Onboard a foursome or a whole tournament in one tap → `create_tournament_invite` / `join_tournament`. |
| **OpenGolf ID** | A portable golf identity — *"Sign in with OpenGolf."* One pseudonymous `player_id` across **every** app; handicap + history follow the player everywhere (engines fold by `player_id`, so a claimed identity's cross-app record just exists). | Give a player one identity the whole ecosystem shares → `sign_in_with_opengolf`. |

**The big idea:** every shot, moment, and round contributed makes the shared commons better for everyone — a true two-way data layer. Read is free; contributing is how you earn your place in the standard.

---

## What your agent gets

- **Read (free, no key):** search & compare courses · full scorecards (par / handicap / yardages) · hazards · live weather & climate · nearby places · tee advice.
- **Contribute (free key):** `log_shot`, `submit_moment` → write to the open standards · `get_my_shots` → read your own data back.
- **Identity & tournaments (free key):** `sign_in_with_opengolf` (portable ID) · `create_tournament_invite` + `join_tournament` (run an event — **handicaps optional**, gross or net).

A great golf app is an afternoon, not a year.

## Install (MCP client config)
```json
{
  "mcpServers": {
    "opengolfapi": {
      "command": "npx",
      "args": ["-y", "@opengolfapi/mcp-server"],
      "env": {
        "OPENGOLFAPI_KEY": "<free, optional — enables contributing, identity & tournaments>"
      }
    }
  }
}
```
Get a free `OPENGOLFAPI_KEY` at https://courses.opengolfapi.org/api-keys. Read tools work with **no key**.

> **Claude Desktop:** the config file is `claude_desktop_config.json` (Settings → Developer → Edit Config). **Claude Code:** `claude mcp add opengolfapi -- npx -y @opengolfapi/mcp-server`. **Going keyless?** Delete the whole `env` block — every read tool works without it (do NOT paste the placeholder as a key).

**First prompt to try:** *"Find golf courses near Chicago and show me the hardest one."*

**Which score tool when:** casual one-shot scoring → `score_round` · leagues/tournaments (scores arrive over time, standings matter) → `create_competition` → `record_attempt` → `finalize_competition` · streaming devices/live apps → `submit_moment`. Canonical domain model: https://api.opengolfapi.org/api/v1/model

## Tools

<!-- TOOLS:START (auto-generated from src by gen-manifest.mjs — do not edit by hand) -->
_54 tools:_

- `search_courses` — Search US golf courses by name, US state, or location (lat/lng + radius). Returns matching courses with location, type, par. Free, ODbL data.
- `get_course` — Full detail for one course by id: scorecard (par + handicap per hole), tees, location, contact, nearby. Free.
- `get_tees` — All tee sets for a course with ratings, slopes, and yardages. Free.
- `get_weather` — Live weather forecast for a course location (Weather.gov). Free.
- `get_climate` — Monthly climate normals + best months to play for a course. Free.
- `get_nearby` — Nearby hotels, restaurants, and other courses for a course. Free.
- `log_shot` — Contribute a golf shot to the open OpenShot standard (any launch monitor). Requires a key. Units: speed mph, angles deg, spin rpm, distance yds.
- `submit_moment` — Contribute an Open Connect event from any sensor/wearable/phone. The whole sensor spectrum rides through here — type-specific data goes in `payload`. Requires a key.
- `get_my_shots` — Read back your own contributed shots by player or session. Requires a key.
- `get_my_moments` — Read back your own contributed moments (breadcrumbs, swings, putts, conditions…) by player, session, or type. Requires a key.
- `propose_correction` — Propose a fix to a course FACT field (phone, website, address, architect, year_built, course_name, city, postal_code, course_type). Our AI reviews it (approve/reject/needs_info). Requires a key. Geometry is not correctable here.
- `respond_to_review` — Respond to a correction that came back as needs_info — add a source or explanation and re-open it for review. Requires a key.
- `get_correction` — Check the status/verdict of a correction you proposed (approved | rejected | needs_info | applied). Requires a key.
- `how_to_build` — The safe playbook for building on OpenGolfAPI and contributing data the right way. Call this once before contributing.
- `get_passport` — FREE (public, no key). Any golfer's shareable record — display name, OpenGolf Member #, courses played, rounds, trophies, referrals. Show a player's golf resume in your app.
- `record_referral` — Record that one user referred another (a REFERRED_BY edge) — build YOUR app's invite loop on the shared graph, namespaced to your app. Needs a key.
- `get_referrals` — How many golfers a user has referred (+ the list) — the viral-loop metric for your app. Needs a key.
- `about` — What OpenGolfAPI is and how to use this MCP server.
- `request_sign_in_code` — Start "Sign in with OpenGolf" for a person: emails them a 6-digit code. No API key needed. They read you the code, then call complete_sign_in.
- `complete_sign_in` — Finish sign-in: exchange the 6-digit code for their OpenGolf ID + access token (use as X-OpenGolf-Token to act as them). Pass ref=<inviter player_id> when another player's invite brought them — it credits the referral.
- `create_dev_key` — Mint a developer API key bound to an OpenGolf ID (sign in first via request_sign_in_code → complete_sign_in). Returns the key ONCE. First-party rail: no OpenGolf ID, no key.
- `sign_in_with_opengolf` — Derive a user's OpenGolf ID deterministically from their email (sub = ogid_ + sha256(lower(trim(email)))[:16]) — one line, no redirect. For a VERIFIED session token use request_sign_in_code → complete_sign_in.
- `register_webhook` — Register an https URL for your domain events (HMAC-signed deliveries, owner-scoped). Requires your key (Authorization: Bearer ogapi_…).
- `create_tournament_invite` — Create a shareable invite (QR/link); everyone who redeems it joins the SAME event/session. max_uses caps size (foursome=4). Requires key.
- `join_tournament` — Redeem an invite token — the player joins the group/event. Requires key.
- `list_game_formats` — Every OpenMatch scoring format. GROSS scoring is free & keyless.
- `score_round` — Score a round in any format — GROSS, FREE, no key. players:[{player_id,holes:{"1":4}}] or entries:[{player_id,hole,value}]; holes:[{hole,par,stroke_index?}].
- `plays_like` — Effective distance — THE canonical "plays like" number (wind/elevation/temp/altitude), factors itemized. FREE, no key. Pair with get_conditions for live wind.
- `get_conditions` — LIVE weather at a course (temp/wind/precip, forecast-model, 15-min cache). FREE. Feeds plays_like.
- `link_dev_key` — Confirm your OpenGolf ID on an EXISTING key. Sign in first; pass that access_token + the key.
- `list_dev_keys` — List the keys owned by your OpenGolf ID (prefixes only). Needs access_token from complete_sign_in.
- `get_profile` — A player's public OpenGolf ID card — name, avatar, links, prefs. Free.
- `update_profile` — Edit a player's self-asserted profile fields (derived facts can't be set). Requires key (claimed players need their grant).
- `get_awards` — A player's OpenAwards — derived trophies + course passport. Requires key.
- `set_beacon` — Broadcast a consented, EXPIRING presence/availability beacon (present|available|open). Requires key.
- `find_beacons` — Discover ACTIVE public beacons (find-my-group / matchmaking). Requires key.
- `record_consent` — Record a player's consent grant (auditable, revocable). Requires key.
- `create_competition` — Create a Competition (any OpenMatch format). Requires key.
- `list_competitions` — List Competitions (free). Filter org/course/status.
- `get_competition` — A Competition + live gross standings (free).
- `record_attempt` — Record an Attempt (score or side-game value). Idempotent. Requires key.
- `finalize_competition` — Finalize — run the kernel, store the gross Result. Requires key.
- `broadcast_feed` — OpenBroadcast P1 — ONE typed feed for a session: broadcast-worthy items (score/side_game/money/award/condition) in ascending (recorded_at, seq) order, each with template narration (headline<=60/ticker<=80). Money appears only via settled records. Replaces stitching moments+results+live_state. Requires key + session access (participant or compute).
- `get_handicap` — OpenIndex (beta) — a player's estimated handicap computed from real, notarized rounds (every score stamped when it happened; verifiable by anyone). Not official — provable. Reading your OWN is free with your key; player_id must be the ogid_… form.
- `list_webhooks` — List your active webhook subscriptions. Requires key.
- `remove_webhook` — Deactivate one of your webhook subscriptions by id (audit row kept). Requires key.
- `list_orgs` — Public directory of verified orgs (free).
- `mint_asset` — Mint an Asset (trophy/badge/stamp/coupon/membership) into the owner's trophy case + chain. Requires key.
- `file_claim` — File a Claim in the trust ledger (ownership/attestation/identity/record/correction). Requires key.
- `list_claims` — List Claims (free). Filter claimant/subject/status.
- `post_beta` — Drop local course knowledge ("beta") on a hole — the AI-caddie's fuel. Requires key.
- `get_beta` — Read local course knowledge for a course/hole (free).
- `get_my_chain` — Export YOUR tamper-evident OpenGolf Chain + checkpoints. Requires key (own-read free).
- `verify_chain` — Verify a Chain export (public, no key) — recomputes links + checkpoint; reports tampering and where.
<!-- TOOLS:END -->

## The bigger ecosystem — two front doors
Agents come through this MCP; **sensors/devices** come through **OpenGolf Connect** (one open connector streaming shots from any launch monitor — R10, MLM2PRO, Uneekor, SkyTrak, Foresight — into `POST /v1/shots`). Both write to the same open commons. → https://opengolfapi.org/connect

## Learn more
- **Full AI-coder guide:** https://api.opengolfapi.org/llms-full.txt
- Machine spec (OpenAPI 3.1): https://api.opengolfapi.org/openapi.json
- OpenShot field catalog: https://api.opengolfapi.org/api/v1/openshot/fields
- Moments field catalog: https://api.opengolfapi.org/api/v1/moments/fields

MIT licensed. Course data ODbL. Shots CC0.
