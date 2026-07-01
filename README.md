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

## Tools

<!-- TOOLS:START (auto-generated from src by gen-manifest.mjs — do not edit by hand) -->
_41 tools:_

- `search_courses` — Search golf courses by name, state, or location. Returns full course info. ODbL licensed data from OpenGolfAPI.
- `get_course` — Get detailed golf course info including full scorecard with par and handicap index per hole. ODbL licensed.
- `get_tees` — Get all tee sets for a course including ratings, slopes, and yardages per tee. ODbL licensed.
- `get_climate` — Get monthly climate normals for a course (temperature, precipitation, playability). ODbL licensed.
- `get_nearby` — Get nearby points of interest for a course (hotels, restaurants, airports) within ~20 miles. ODbL licensed.
- `about` — Information about OpenGolfAPI: dataset size, license, how to contribute, how to contact the maintainers. Useful when an AI agent or user wants to know who built this and how to reach them.
- `log_shot` — Contribute a golf shot to OpenGolfAPI (your own data + the open corpus). Requires OPENGOLFAPI_KEY.
- `submit_moment` — Contribute a Moment from any sensor/wearable/phone. The whole sensor spectrum rides through here — type-specific data goes in `payload`. Requires OPENGOLFAPI_KEY.
- `register_webhook` — Register an https URL to receive OpenGolf domain events (e.g. session_settlement, event_settlement) the instant they happen — no polling. Requires OPENGOLFAPI_KEY. Each delivery is HMAC-signed (X-OG-Signature); verify the record content_hash where present. Owner-scoped: you only receive your own events.
- `get_my_shots` — Read back your own contributed shots (by player or session). Requires OPENGOLFAPI_KEY.
- `get_my_moments` — Read back your own contributed moments (breadcrumbs, swings, putts, conditions…) by player, session, or type. Requires OPENGOLFAPI_KEY.
- `sign_in_with_opengolf` — Sign up / sign in a player with their PORTABLE OpenGolf identity — one player_id across every golf app, with handicap + history attached. Ties an email (used only as a hashed claim key, never stored raw) to the player_id and returns a verification token to send the player. Requires OPENGOLFAPI_KEY.
- `create_tournament_invite` — Create a shareable invite (QR/link) for an INDIVIDUAL tournament or round. Everyone who redeems the same invite joins the SAME event/session = the group, linked. max_uses caps the size (foursome=4). Requires OPENGOLFAPI_KEY.
- `join_tournament` — Join a player into a tournament/round by redeeming its invite token. The player lands in the shared event = part of the field. Handicap is optional: gross by default (no handicap needed); if the player has one it auto-applies for net. Requires OPENGOLFAPI_KEY.
- `request_sign_in_code` — Start "Sign in with OpenGolf" for a player: emails them a 6-digit code. No API key needed — the email authenticates them. They read you the code, then call complete_sign_in.
- `complete_sign_in` — Finish "Sign in with OpenGolf": exchange the player's 6-digit code for their OpenGolf ID access token + portable player_id. Use the returned access_token as the X-OpenGolf-Token header to act AS the player, within whatever scopes you were granted. scopes: space-separated (default "identity").
- `list_game_formats` — List every OpenMatch scoring format (stroke, stableford, match_play, skins, scramble, best_ball, nassau, ctp, longest_drive, greenies, wolf, …). GROSS scoring is free & keyless — score any game, no key needed.
- `score_round` — Score a round in any format — GROSS, FREE, no key. players: [{player_id, holes:{"1":4,...}}] for stroke formats, or entries:[{player_id,hole,value}] for shot formats (ctp/longest_drive/greenies). holes: [{hole,par,stroke_index?}]. Returns standings (gross). Send gross strokes — no key needed.
- `create_dev_key` — Sign up to build: mint an API key bound to your OpenGolf ID. Requires an OpenGolf ID access_token (from complete_sign_in) + the SAME email you signed in with. No OpenGolf ID, no key. Returns the key ONCE. Scope = read + contribute + keyless gross scoring.
- `link_dev_key` — Confirm your OpenGolf ID on an EXISTING (legacy) key — the simple "add my ID" step. Sign in with the email the key was issued under, then call this with that access_token + the api_key. Verifies + keeps the key and its scopes. (We don't revoke legacy keys — they just confirm their ID.)
- `list_dev_keys` — List the API keys owned by your OpenGolf ID (prefixes only — never the secret). Requires an OpenGolf ID access_token from complete_sign_in.
- `get_profile` — Read a player's public OpenGolf ID card — display name, avatar, links, home course, golf prefs, bucket list. Apps render it as a player card. Requires OPENGOLFAPI_KEY.
- `update_profile` — Edit a player's OpenGolf ID profile — self-asserted fields (display_name, avatar_url, bio, links, home_course_id, bucket_list, preferred_formats…). Derived facts (handicap/stats) cannot be set here. A claimed player needs their grant. Requires OPENGOLFAPI_KEY.
- `get_awards` — A player's OpenAwards — earned trophies (aces/eagles/birdies/broke-X/money/streaks/loyalty, all derived + unfakeable), organizer-granted custom awards, and the course passport (distinct courses played + logos). Requires OPENGOLFAPI_KEY.
- `set_beacon` — Broadcast a player's consented, EXPIRING presence/availability beacon: mode=present (playing now) | available (looking for a game) | open (discoverable). Scoped (course/region), visibility-tiered, auto-expires. Powers find-my-group / matchmaking. Requires OPENGOLFAPI_KEY.
- `find_beacons` — Discover ACTIVE public beacons (players broadcasting presence/availability) — for find-my-group / matchmaking. Filter by course_id, region, mode. Requires OPENGOLFAPI_KEY.
- `record_consent` — Record a player's consent grant in the consent ledger (app→OpenGolf; the app is the controller). Body: player_id + scopes[] (e.g. corpus, share_scores, gps). Auditable + revocable. Requires OPENGOLFAPI_KEY.
- `create_competition` — Create a Competition — a contest wrapper over OpenMatch (any format: stroke, scramble, CTP, long-drive, skins…). Free + gross. Returns the competition id used for attempts/finalize. Requires OPENGOLFAPI_KEY.
- `list_competitions` — List Competitions (free). Filter by org, course, or status (open|closed|finalized).
- `get_competition` — Get a Competition + its live gross standings (free; runs the format kernel on demand).
- `record_attempt` — Record an Attempt in a Competition (a score for stroke formats, a side-game value for shot formats). Idempotent. Requires OPENGOLFAPI_KEY.
- `finalize_competition` — Finalize a Competition — run the format kernel over its attempts and store the gross Result. Requires OPENGOLFAPI_KEY.
- `list_orgs` — List Organizations — the public directory of verified orgs (courses, tours, clubs, sponsors) (free).
- `mint_asset` — Mint an Asset — the generalized collectible/credential (trophy, badge, course-passport stamp, coupon, membership). Lands in the owner's trophy case + chain. Requires OPENGOLFAPI_KEY.
- `file_claim` — File a Claim in the trust ledger (ownership, attestation, identity, record, correction). Lifecycle open→accepted→disputed→verified. Reads are free. Requires OPENGOLFAPI_KEY to file.
- `list_claims` — List Claims from the trust ledger (free). Filter by claimant, subject, or status.
- `post_beta` — Drop local course knowledge ("beta") on a hole — the AI-caddie's fuel (wind, green slope, hazards, the smart play). Raw contribution is free. Requires OPENGOLFAPI_KEY.
- `get_beta` — Read raw local course knowledge ("beta") for a course/hole (free). The community's notes on how to play it.
- `get_my_chain` — Export YOUR OpenGolf Chain — your verifiable, tamper-evident self-sovereign record (every round, shot, trophy) + its signed, Bitcoin-anchored checkpoints. Own-read is free. Requires OPENGOLFAPI_KEY.
- `verify_chain` — Verify an OpenGolf Chain export (public tool, no key). Recomputes the hash links + (optionally) the checkpoint signature and Merkle root; reports any tampering and where.
- `how_to_build` — The safe playbook for building on OpenGolfAPI and contributing data the right way. Call once before contributing.
<!-- TOOLS:END -->

## The bigger ecosystem — two front doors
Agents come through this MCP; **sensors/devices** come through **OpenGolf Connect** (one open connector streaming shots from any launch monitor — R10, MLM2PRO, Uneekor, SkyTrak, Foresight — into `POST /v1/shots`). Both write to the same open commons. → https://opengolfapi.org/connect

## Learn more
- **Full AI-coder guide:** https://api.opengolfapi.org/llms-full.txt
- Machine spec (OpenAPI 3.1): https://api.opengolfapi.org/openapi.json
- OpenShot field catalog: https://api.opengolfapi.org/api/v1/openshot/fields
- Moments field catalog: https://api.opengolfapi.org/api/v1/moments/fields

MIT licensed. Course data ODbL. Shots CC0.
