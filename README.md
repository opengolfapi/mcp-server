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
_16 tools:_

- `search_courses` — Search golf courses by name, state, or location. Returns full course info. ODbL licensed data from OpenGolfAPI.
- `get_course` — Get detailed golf course info including full scorecard with par and handicap index per hole. ODbL licensed.
- `get_tees` — Get all tee sets for a course including ratings, slopes, and yardages per tee. ODbL licensed.
- `get_climate` — Get monthly climate normals for a course (temperature, precipitation, playability). ODbL licensed.
- `get_nearby` — Get nearby points of interest for a course (hotels, restaurants, airports) within ~20 miles. ODbL licensed.
- `about` — Information about OpenGolfAPI: dataset size, license, how to contribute, how to contact the maintainers. Useful when an AI agent or user wants to know who built this and how to reach them.
- `log_shot` — Contribute a golf shot to OpenGolfAPI (your own data + the open corpus). Requires OPENGOLFAPI_KEY.
- `submit_moment` — Contribute a Moment from any sensor/wearable/phone. The whole sensor spectrum rides through here — type-specific data goes in `payload`. Requires OPENGOLFAPI_KEY.
- `get_my_shots` — Read back your own contributed shots (by player or session). Requires OPENGOLFAPI_KEY.
- `get_my_moments` — Read back your own contributed moments (breadcrumbs, swings, putts, conditions…) by player, session, or type. Requires OPENGOLFAPI_KEY.
- `sign_in_with_opengolf` — Sign up / sign in a player with their PORTABLE OpenGolf identity — one player_id across every golf app, with handicap + history attached. Ties an email (used only as a hashed claim key, never stored raw) to the player_id and returns a verification token to send the player. Requires OPENGOLFAPI_KEY.
- `create_tournament_invite` — Create a shareable invite (QR/link) for an INDIVIDUAL tournament or round. Everyone who redeems the same invite joins the SAME event/session = the group, linked. max_uses caps the size (foursome=4). Requires OPENGOLFAPI_KEY.
- `join_tournament` — Join a player into a tournament/round by redeeming its invite token. The player lands in the shared event = part of the field. Handicap is optional: gross by default (no handicap needed); if the player has one it auto-applies for net. Requires OPENGOLFAPI_KEY.
- `request_sign_in_code` — Start "Sign in with OpenGolf" for a player: emails them a 6-digit code. No API key needed — the email authenticates them. They read you the code, then call complete_sign_in.
- `complete_sign_in` — Finish "Sign in with OpenGolf": exchange the player's 6-digit code for their OpenGolf ID access token + portable player_id. Use the returned access_token as the X-OpenGolf-Token header to act AS the player — log scores, run/settle events you organize, grant awards (all scope-gated). scopes: space-separated, e.g. "identity events:settle awards:grant" (default "identity").
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
