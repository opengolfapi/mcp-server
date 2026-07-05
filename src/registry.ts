// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE CANONICAL OPENGOLF MCP TOOL REGISTRY (refactor R3, 2026-07-04)
// ONE source of truth consumed by BOTH servers:
//   · npm  @opengolfapi/mcp-server (stdio)          — mcp-server/src/index.ts
//   · hosted mcp.opengolfapi.org (streamable HTTP)  — mcp-worker/src/index.ts
// Adding a tool HERE adds it everywhere. Tool-count parity is structural, not smoke-tested.
// Transport-agnostic contract: JSON-Schema inputs, run(args, key) -> string. HTTP is injected.
// ═══════════════════════════════════════════════════════════════════════════════════════════

export type Json = Record<string, any>;
export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Json;
  run: (args: Json, key?: string) => Promise<string>;
}
export interface HttpCtx {
  apiGet: (path: string, key?: string) => Promise<Json>;
  apiPost: (path: string, body: Json, key?: string) => Promise<Json>;
  apiBase: string;
  /** raw fetch for the few tools that set bespoke headers (X-OpenGolf-Token etc.) */
  rawFetch: typeof fetch;
}

export const NEED_KEY = 'Set an OpenGolfAPI key (Authorization: Bearer ogapi_…) to contribute. Get a free key at https://opengolfapi.org/developer';
export const str = (d: string) => ({ type: 'string' as const, description: d });
export const num = (d: string) => ({ type: 'number' as const, description: d });

export function buildTools(ctx: HttpCtx): ToolDef[] {
  const { apiGet, apiPost, apiBase: API_BASE, rawFetch } = ctx;
  const fetch = rawFetch; // tools below reference fetch/API_BASE by these names
  const apiDelete = async (path: string, key?: string): Promise<Json> => {
    const r = await rawFetch(`${API_BASE}${path}`, { method: 'DELETE', headers: { Accept: 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) } });
    const t = await r.text();
    if (!r.ok) return { error: `${r.status}: ${t.slice(0, 300)}` };
    return t ? JSON.parse(t) : {};
  };
  const TOOLS: ToolDef[] = [

    {
      name: 'search_courses',
      description: 'Search US golf courses by name, US state, or location (lat/lng + radius). Returns matching courses with location, type, par. Free, ODbL data.',
      inputSchema: { type: 'object', properties: {
        query: str('Course name to search'), state: str('2-letter US state code'),
        lat: num('Latitude for radius search (with lng)'), lng: num('Longitude (with lat)'),
        radius_mi: num('Radius in miles (default 25)'), limit: num('Max results (default 10)') } },
      run: async (a) => {
        const qs = new URLSearchParams();
        if (a.query) qs.set('q', a.query); if (a.state) qs.set('state', a.state);
        if (a.lat != null) qs.set('lat', String(a.lat)); if (a.lng != null) qs.set('lng', String(a.lng));
        qs.set('radius_mi', String(a.radius_mi ?? 25)); qs.set('limit', String(a.limit ?? 10));
        return JSON.stringify(await apiGet(`/api/v1/courses/search?${qs}`), null, 2);
      },
    },
    {
      name: 'get_course',
      description: 'Full detail for one course by id: scorecard (par + handicap per hole), tees, location, contact, nearby. Free.',
      inputSchema: { type: 'object', required: ['id'], properties: { id: str('OpenGolfAPI course id') } },
      run: async (a) => JSON.stringify(await apiGet(`/api/v1/courses/${encodeURIComponent(a.id)}`), null, 2),
    },
    {
      name: 'get_tees',
      description: 'All tee sets for a course with ratings, slopes, and yardages. Free.',
      inputSchema: { type: 'object', required: ['id'], properties: { id: str('OpenGolfAPI course id') } },
      run: async (a) => JSON.stringify(await apiGet(`/api/v1/courses/${encodeURIComponent(a.id)}/tees`), null, 2),
    },
    {
      name: 'get_weather',
      description: 'Live weather forecast for a course location (Weather.gov). Free.',
      inputSchema: { type: 'object', required: ['id'], properties: { id: str('OpenGolfAPI course id') } },
      run: async (a) => JSON.stringify(await apiGet(`/api/v1/courses/${encodeURIComponent(a.id)}/weather`), null, 2),
    },
    {
      name: 'get_climate',
      description: 'Monthly climate normals + best months to play for a course. Free.',
      inputSchema: { type: 'object', required: ['id'], properties: { id: str('OpenGolfAPI course id') } },
      run: async (a) => JSON.stringify(await apiGet(`/api/v1/courses/${encodeURIComponent(a.id)}/climate`), null, 2),
    },
    {
      name: 'get_nearby',
      description: 'Nearby hotels, restaurants, and other courses for a course. Free.',
      inputSchema: { type: 'object', required: ['id'], properties: { id: str('OpenGolfAPI course id') } },
      run: async (a) => JSON.stringify(await apiGet(`/api/v1/courses/${encodeURIComponent(a.id)}/nearby`), null, 2),
    },
    {
      name: 'log_shot',
      description: 'Contribute a golf shot to the open OpenShot standard (any launch monitor). Requires a key. Units: speed mph, angles deg, spin rpm, distance yds.',
      inputSchema: { type: 'object', properties: {
        ball_speed: num('Ball speed, mph'), launch_angle: num('Vertical launch (VLA), deg'),
        azimuth: num('Horizontal launch (HLA), deg, +=right'), back_spin: num('Backspin, rpm'),
        side_spin: num('Sidespin, rpm, +=right'), carry: num('Carry, yds'), total: num('Total distance, yds'),
        club: str("Club, e.g. '7i' or 'driver'"), device_model: str("Launch monitor, e.g. 'garmin_r10'"),
        course_id: str('Course id, if known'), hole: num('Hole number 1-18'), player_id: str('Your pseudonymous player id') } },
      run: async (a, key) => {
        if (!key) return NEED_KEY;
        const shot: Json = { api_version: '0', device: { model: a.device_model, shot_number: 1 },
          ball: { speed: a.ball_speed, launch_angle: a.launch_angle, azimuth: a.azimuth, back_spin: a.back_spin, side_spin: a.side_spin, carry: a.carry, total: a.total },
          club: a.club ? { selected: a.club } : undefined,
          context: { course_id: a.course_id, hole: a.hole, player_id: a.player_id } };
        return JSON.stringify(await apiPost('/api/v1/shots', shot, key), null, 2);
      },
    },
    {
      name: 'submit_moment',
      description: 'Contribute an Open Connect event from any sensor/wearable/phone. The whole sensor spectrum rides through here — type-specific data goes in `payload`. Requires a key.',
      inputSchema: { type: 'object', required: ['moment_type'], properties: {
        moment_type: { type: 'string', enum: ['shot', 'breadcrumb', 'pin', 'presence', 'condition', 'tee', 'green', 'motion', 'swing', 'putt', 'biometric', 'club', 'score'], description: 'Event kind. breadcrumb/tee/green=GPS points; pin/condition=course sightings; presence=live location (find fellow golfers); motion/swing/putt/biometric/club/score=sensor events.' },
        lat: num('GPS latitude'), lng: num('GPS longitude'), accuracy_m: num('GPS accuracy in meters'),
        recorded_at: str('ISO 8601 timestamp the event happened'), course_id: str('Course id'), hole: num('Hole 1-18'),
        player_id: str('Your pseudonymous player id'), session_id: str('Session id (one round/range session)'),
        device: str("Source device, e.g. 'apple_watch', 'hackmotion', 'arccos'"), note: str('Free-text detail'),
        payload: { type: 'object', description: "Type-specific sensor data. swing:{tempo,wrist_angle,plane,speed_profile}; putt:{speed,path,face,roll_pct,distance}; biometric:{heart_rate,exertion,steps}; club:{club,event,specs}; score:{strokes,putts,penalties}; motion:{accel,gyro,sample_hz}; presence:{visibility}." } } },
      run: async (a, key) => {
        if (!key) return NEED_KEY;
        const m: Json = { moment_type: a.moment_type, lat: a.lat, lng: a.lng, accuracy_m: a.accuracy_m, recorded_at: a.recorded_at,
          course_id: a.course_id, hole: a.hole, player_id: a.player_id, session_id: a.session_id,
          device: a.device ? { model: a.device } : undefined, note: a.note, payload: a.payload };
        return JSON.stringify(await apiPost('/api/v1/moments', m, key), null, 2);
      },
    },
    {
      name: 'get_my_shots',
      description: 'Read back your own contributed shots by player or session. Requires a key.',
      inputSchema: { type: 'object', properties: { player_id: str('Your player id'), session_id: str('Session id'), limit: num('Max results') } },
      run: async (a, key) => {
        if (!key) return NEED_KEY;
        if (!a.player_id && !a.session_id) return 'Provide player_id or session_id.';
        const qs = new URLSearchParams();
        if (a.player_id) qs.set('player', a.player_id); if (a.session_id) qs.set('session', a.session_id);
        if (a.limit) qs.set('limit', String(a.limit));
        return JSON.stringify(await apiGet(`/api/v1/shots?${qs}`, key), null, 2);
      },
    },
    {
      name: 'get_my_moments',
      description: 'Read back your own contributed moments (breadcrumbs, swings, putts, conditions…) by player, session, or type. Requires a key.',
      inputSchema: { type: 'object', properties: {
        player_id: str('Your player id'), session_id: str('Session id'),
        type: str('Filter to one moment_type'), limit: num('Max results') } },
      run: async (a, key) => {
        if (!key) return NEED_KEY;
        if (!a.player_id && !a.session_id) return 'Provide player_id or session_id.';
        const qs = new URLSearchParams();
        if (a.player_id) qs.set('player', a.player_id); if (a.session_id) qs.set('session', a.session_id);
        if (a.type) qs.set('type', a.type); if (a.limit) qs.set('limit', String(a.limit));
        return JSON.stringify(await apiGet(`/api/v1/moments?${qs}`, key), null, 2);
      },
    },
    {
      name: 'propose_correction',
      description: 'Propose a fix to a course FACT field (phone, website, address, architect, year_built, course_name, city, postal_code, course_type). Our AI reviews it (approve/reject/needs_info). Requires a key. Geometry is not correctable here.',
      inputSchema: { type: 'object', required: ['course_id', 'field', 'proposed_value'], properties: {
        course_id: str('OpenGolfAPI course id'),
        field: { type: 'string', enum: ['phone', 'website', 'address', 'architect', 'year_built', 'course_name', 'city', 'postal_code', 'course_type'], description: 'Which fact to correct' },
        proposed_value: str('The corrected value'),
        evidence_url: str('A source URL backing the correction (improves approval odds)'),
        note: str('Why this is correct') } },
      run: async (a, key) => {
        if (!key) return NEED_KEY;
        const body: Json = { course_id: a.course_id, field: a.field, proposed_value: a.proposed_value, evidence_url: a.evidence_url, note: a.note };
        return JSON.stringify(await apiPost('/api/v1/corrections', body, key), null, 2);
      },
    },
    {
      name: 'respond_to_review',
      description: 'Respond to a correction that came back as needs_info — add a source or explanation and re-open it for review. Requires a key.',
      inputSchema: { type: 'object', required: ['correction_id'], properties: {
        correction_id: str('The correction id from propose_correction'),
        evidence_url: str('A source URL'), note: str('Your answer to the reviewer') } },
      run: async (a, key) => {
        if (!key) return NEED_KEY;
        return JSON.stringify(await apiPost(`/api/v1/corrections/${encodeURIComponent(a.correction_id)}/respond`, { evidence_url: a.evidence_url, note: a.note }, key), null, 2);
      },
    },
    {
      name: 'get_correction',
      description: 'Check the status/verdict of a correction you proposed (approved | rejected | needs_info | applied). Requires a key.',
      inputSchema: { type: 'object', required: ['correction_id'], properties: { correction_id: str('The correction id') } },
      run: async (a, key) => {
        if (!key) return NEED_KEY;
        return JSON.stringify(await apiGet(`/api/v1/corrections/${encodeURIComponent(a.correction_id)}`, key), null, 2);
      },
    },
    {
      name: 'how_to_build',
      description: 'The safe playbook for building on OpenGolfAPI and contributing data the right way. Call this once before contributing.',
      inputSchema: { type: 'object', properties: {} },
      run: async () =>
        'BUILD ON OPENGOLFAPI — the safe playbook:\n' +
        '1. READ free, no key: search_courses, get_course, get_tees, get_weather, get_climate, get_nearby.\n' +
        '2. CONTRIBUTE: get a free key (opengolfapi.org/developer), send it as Authorization: Bearer ogapi_….\n' +
        '3. THE SIGNAL PRINCIPLE — send what you have. Breadcrumbs are the floor (phone GPS via submit_moment); ' +
        'richer signals (swing, putt, club, score) are additive and free to send. Emitting any signal is strictly dominant.\n' +
        '4. DO IT SAFELY: use a PSEUDONYMOUS player_id (never real names/PII); set dedup_key for idempotency ' +
        '(safe re-sends, backfill); only send biometric or precise live-location with EXPLICIT user consent; ' +
        'default presence visibility to private.\n' +
        '5. COURSE MISSING? Create it from name + GPS — it triggers our enrichment crawl and is human-reviewed before going live.\n' +
        '6. BRIDGE AN EXISTING APP: map your fields to the catalogs (/api/v1/moments/fields, /api/v1/openshot/fields) and POST. ' +
        'Batch + dedup_key let you backfill your whole history AND stream new rounds safely. Or ask your AI to write the adapter from /openapi.json.\n' +
        'You become a recognized member of the commons by contributing — every signal makes the shared data better for every golfer.',
    },
    {
      name: 'get_passport',
      description: 'FREE (public, no key). Any golfer\'s shareable record — display name, OpenGolf Member #, courses played, rounds, trophies, referrals. Show a player\'s golf resume in your app.',
      inputSchema: { type: 'object', required: ['player_id'], properties: { player_id: { type: 'string', description: 'Golfer OpenGolf ID (ogid_...)' } } },
      run: async (a: Json) => JSON.stringify(await apiGet(`/passport/${encodeURIComponent(String(a.player_id))}?format=json`), null, 2),
    },
    {
      name: 'record_referral',
      description: 'Record that one user referred another (a REFERRED_BY edge) — build YOUR app\'s invite loop on the shared graph, namespaced to your app. Needs a key.',
      inputSchema: { type: 'object', required: ['new_user', 'referrer'], properties: { new_user: { type: 'string', description: 'Invitee player id' }, referrer: { type: 'string', description: 'Referrer player id' }, namespace: { type: 'string', description: 'Your app namespace' } } },
      run: async (a: Json, key?: string) => JSON.stringify(await apiPost('/api/v1/relationships', { from_type: 'player', from_id: a.new_user, to_type: 'player', to_id: a.referrer, rel_type: 'REFERRED_BY', namespace: a.namespace ?? '' }, key), null, 2),
    },
    {
      name: 'get_referrals',
      description: 'How many golfers a user has referred (+ the list) — the viral-loop metric for your app. Needs a key.',
      inputSchema: { type: 'object', required: ['player_id'], properties: { player_id: { type: 'string', description: 'Referrer player id' } } },
      run: async (a: Json, key?: string) => { const r = await apiGet(`/api/v1/relationships?to_id=${encodeURIComponent(String(a.player_id))}&rel_type=REFERRED_BY`, key); const edges = (r as any).relationships ?? []; return JSON.stringify({ player: a.player_id, referrals: edges.length, referred: edges.map((e: any) => e.from_id) }, null, 2); },
    },
    {
      name: 'about',
      description: 'What OpenGolfAPI is and how to use this MCP server.',
      inputSchema: { type: 'object', properties: {} },
      run: async () => JSON.stringify({
        name: 'OpenGolfAPI',
        what: 'The open data + standards platform for golf — every US course, free forever (ODbL). Like Wikipedia/OSM for golf.',
        license: 'ODbL-1.0',
        docs: 'https://opengolfapi.org',
        api_docs: 'https://api.opengolfapi.org',
        openapi: 'https://api.opengolfapi.org/openapi.json',
        stats_live: 'https://api.opengolfapi.org/v1/stats',
        dev_signup: 'https://opengolfapi.org/developer',
        golfer_signup: 'https://opengolfapi.org/id',
        donate: 'https://opencollective.com/opengolfapi',
        github: 'https://github.com/opengolfapi',
        developers: {
          message: "Building on OpenGolfAPI? We want to know. Tell us what you're making and what data you wish we had.",
          contact: 'info@opengolfapi.org',
        },
      }, null, 2),
    },
    // ── Sign in + dev key — the signup funnel (3.2.0 agent playbook), WebCrypto edition ──
    {
      name: 'request_sign_in_code',
      description: 'Start "Sign in with OpenGolf" for a person: emails them a 6-digit code. No API key needed. They read you the code, then call complete_sign_in.',
      inputSchema: { type: 'object', required: ['email'], properties: { email: str("the person's email"), client_id: str('your app/agent name (default mcp-remote)') } },
      run: async (a) => {
        const r = await apiPost('/oauth/start', { email: a.email, client_id: a.client_id || 'mcp-remote' });
        return r.sent ? 'Code emailed. Ask them for the 6-digit code, then call complete_sign_in.' : 'Email delivery not configured.';
      },
    },
    {
      name: 'complete_sign_in',
      description: "Finish sign-in: exchange the 6-digit code for their OpenGolf ID + access token (use as X-OpenGolf-Token to act as them). Pass ref=<inviter player_id> when another player's invite brought them — it credits the referral.",
      inputSchema: { type: 'object', required: ['email', 'code'], properties: { email: str('email'), code: str('6-digit code'), scopes: str('OAuth scopes (default identity)'), client_id: str('app/agent name'), ref: str("inviter's player_id (ogid_…) — always pass when known") } },
      run: async (a) => {
        const vbytes = crypto.getRandomValues(new Uint8Array(32));
        const b64u = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const verifier = b64u(vbytes);
        const challenge = b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
        const cid = a.client_id || 'mcp-remote', redirect = 'https://mcp.opengolfapi.org/callback';
        const cr = await apiPost('/oauth/code', { email: a.email, otp: a.code, client_id: cid, redirect_uri: redirect, scope: a.scopes || 'identity', code_challenge: challenge, ref: a.ref || undefined });
        const code = cr.redirect ? new URL(cr.redirect).searchParams.get('code') : null;
        if (!code) return `Sign-in failed: ${cr.error || 'invalid or expired code'}`;
        const tok = await apiPost('/oauth/token', { grant_type: 'authorization_code', code, client_id: cid, redirect_uri: redirect, code_verifier: verifier });
        if (!tok.id_token) return `Token exchange failed: ${tok.error || ''}`;
        const sub = JSON.parse(atob(String(tok.id_token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub;
        return `Signed in ✓\nplayer_id (sub): ${sub}\naccess_token (send as X-OpenGolf-Token): ${tok.access_token}\ninvite link: https://opengolfapi.org/id?ref=${sub}\npassport: https://api.opengolfapi.org/passport/${sub}`;
      },
    },
    {
      name: 'create_dev_key',
      description: 'Mint a developer API key bound to an OpenGolf ID (sign in first via request_sign_in_code → complete_sign_in). Returns the key ONCE. First-party rail: no OpenGolf ID, no key.',
      inputSchema: { type: 'object', required: ['opengolf_token', 'email'], properties: { opengolf_token: str('access_token from complete_sign_in'), email: str('the SAME email used to sign in'), name: str('key label') } },
      run: async (a) => {
        const r = await fetch(API_BASE + '/api/v1/developer/keys', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-OpenGolf-Token': String(a.opengolf_token) }, body: JSON.stringify({ email: a.email, name: a.name, accept_terms: true }) });
        return await r.text();
      },
    },

    // ── PARITY PORT (2026-07-04): the 27 npm-only tools — hosted is the web door and must be the full surface ──
    { name: 'sign_in_with_opengolf', description: 'Derive a user\'s OpenGolf ID deterministically from their email (sub = ogid_ + sha256(lower(trim(email)))[:16]) — one line, no redirect. For a VERIFIED session token use request_sign_in_code → complete_sign_in.',
      inputSchema: { type: 'object', required: ['email'], properties: { email: str("the user's email") } },
      run: async (a) => {
        const norm = String(a.email).trim().toLowerCase();
        const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm));
        const hex = [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
        return JSON.stringify({ sub: 'ogid_' + hex.slice(0, 16), note: 'Deterministic identity — wire it in BY DEFAULT. Verified token: request_sign_in_code → complete_sign_in.' }, null, 2);
      } },
    { name: 'register_webhook', description: 'Register an https URL for your domain events (HMAC-signed deliveries, owner-scoped). Requires your key (Authorization: Bearer ogapi_…).',
      inputSchema: { type: 'object', required: ['url'], properties: { url: str('https endpoint'), events: { type: 'array', items: { type: 'string' }, description: "event filter, default ['*']" } } },
      run: async (a, key) => { if (!key) return NEED_KEY; return JSON.stringify(await apiPost('/api/v1/webhooks', { url: a.url, events: a.events }, key), null, 2); } },
    { name: 'create_tournament_invite', description: 'Create a shareable invite (QR/link); everyone who redeems it joins the SAME event/session. max_uses caps size (foursome=4). Requires key.',
      inputSchema: { type: 'object', properties: { event_id: str('Event id'), session_id: str('Session id'), max_uses: num('Group cap (default 8)'), ttl_seconds: num('Lifetime seconds') } },
      run: async (a, key) => { if (!key) return NEED_KEY; return JSON.stringify(await apiPost('/api/v1/join/mint', a, key), null, 2); } },
    { name: 'join_tournament', description: 'Redeem an invite token — the player joins the group/event. Requires key.',
      inputSchema: { type: 'object', required: ['token', 'player_id'], properties: { token: str('Invite token'), player_id: str('Joining player id'), display_name: str('Display name') } },
      run: async (a, key) => { if (!key) return NEED_KEY; return JSON.stringify(await apiPost('/api/v1/join/redeem', a, key), null, 2); } },
    { name: 'list_game_formats', description: 'Every OpenMatch scoring format. GROSS scoring is free & keyless.',
      inputSchema: { type: 'object', properties: {} },
      run: async () => JSON.stringify(await apiGet('/api/v1/compute'), null, 2) },
    { name: 'score_round', description: 'Score a round in any format — GROSS, FREE, no key. players:[{player_id,holes:{"1":4}}] or entries:[{player_id,hole,value}]; holes:[{hole,par,stroke_index?}].',
      inputSchema: { type: 'object', required: ['format'], properties: { format: str('stroke|stableford|match_play|skins|scramble|best_ball|foursomes|nassau|quota|ryder_cup|ctp|longest_drive|greenies|bingo_bango_bongo|wolf'), players: { type: 'array', items: {}, description: 'stroke formats' }, entries: { type: 'array', items: {}, description: 'shot formats' }, holes: { type: 'array', items: {} }, teams: { type: 'array', items: {} }, rules: { type: 'object' } } },
      run: async (a) => { const b: Json = {}; for (const k of ['players','entries','holes','teams','rules']) if (a[k]) b[k] = a[k]; return JSON.stringify(await apiPost(`/api/v1/compute/${encodeURIComponent(a.format)}`, b), null, 2); } },
    { name: 'link_dev_key', description: 'Confirm your OpenGolf ID on an EXISTING key. Sign in first; pass that access_token + the key.',
      inputSchema: { type: 'object', required: ['opengolf_token', 'api_key'], properties: { opengolf_token: str('access_token from complete_sign_in'), api_key: str('existing ogapi_ key') } },
      run: async (a) => { const r = await fetch(API_BASE + '/api/v1/developer/keys/link', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-OpenGolf-Token': String(a.opengolf_token), 'X-API-Key': String(a.api_key) }, body: '{}' }); return await r.text(); } },
    { name: 'list_dev_keys', description: 'List the keys owned by your OpenGolf ID (prefixes only). Needs access_token from complete_sign_in.',
      inputSchema: { type: 'object', required: ['opengolf_token'], properties: { opengolf_token: str('access_token') } },
      run: async (a) => { const r = await fetch(API_BASE + '/api/v1/developer/keys', { headers: { 'X-OpenGolf-Token': String(a.opengolf_token) } }); return await r.text(); } },
    { name: 'get_profile', description: "A player's public OpenGolf ID card — name, avatar, links, prefs. Free.",
      inputSchema: { type: 'object', required: ['player_id'], properties: { player_id: str('Player id (sub)') } },
      run: async (a) => JSON.stringify(await apiGet(`/api/v1/join/profile/${encodeURIComponent(a.player_id)}`), null, 2) },
    { name: 'update_profile', description: "Edit a player's self-asserted profile fields (derived facts can't be set). Requires key (claimed players need their grant).",
      inputSchema: { type: 'object', required: ['player_id'], properties: { player_id: str('sub'), display_name: str('Name'), avatar_url: str('Avatar URL'), bio: str('Bio'), home_course_id: str('Home course'), bucket_list: { type: 'array', items: { type: 'string' } } } },
      run: async (a, key) => { if (!key) return NEED_KEY; const r = await fetch(API_BASE + '/api/v1/join/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(a) }); return await r.text(); } },
    { name: 'get_awards', description: "A player's OpenAwards — derived trophies + course passport. Requires key.",
      inputSchema: { type: 'object', required: ['player_id'], properties: { player_id: str('sub') } },
      run: async (a, key) => { if (!key) return NEED_KEY; return JSON.stringify(await apiGet(`/api/v1/awards/players/${encodeURIComponent(a.player_id)}`, key), null, 2); } },
    { name: 'set_beacon', description: 'Broadcast a consented, EXPIRING presence/availability beacon (present|available|open). Requires key.',
      inputSchema: { type: 'object', required: ['player_id', 'mode'], properties: { player_id: str('sub'), mode: str('present|available|open'), course_id: str('Course'), region: str('Region'), note: str('Note'), visibility: str('public|group|friends'), ttl_seconds: num('TTL') } },
      run: async (a, key) => { if (!key) return NEED_KEY; return JSON.stringify(await apiPost('/api/v1/join/beacon', a, key), null, 2); } },
    { name: 'find_beacons', description: 'Discover ACTIVE public beacons (find-my-group / matchmaking). Requires key.',
      inputSchema: { type: 'object', properties: { course_id: str('Course'), region: str('Region'), mode: str('Mode') } },
      run: async (a, key) => { if (!key) return NEED_KEY; const q = new URLSearchParams(); for (const k of ['course_id','region','mode']) if (a[k]) q.set(k, a[k]); return JSON.stringify(await apiGet(`/api/v1/join/beacons${q.toString() ? `?${q}` : ''}`, key), null, 2); } },
    { name: 'record_consent', description: "Record a player's consent grant (auditable, revocable). Requires key.",
      inputSchema: { type: 'object', required: ['player_id', 'scopes'], properties: { player_id: str('sub'), scopes: { type: 'array', items: { type: 'string' }, description: 'e.g. ["corpus","share_scores"]' }, granted_to: str('Grantee'), revoke: { type: 'boolean', description: 'Revoke instead' } } },
      run: async (a, key) => { if (!key) return NEED_KEY; return JSON.stringify(await apiPost('/api/v1/join/consent', a, key), null, 2); } },
    { name: 'create_competition', description: 'Create a Competition (any OpenMatch format). Requires key.',
      inputSchema: { type: 'object', required: ['name'], properties: { name: str('Name'), type: str('Format'), course_id: str('Course'), holes: { type: 'array', items: { type: 'number' } }, format_config: { type: 'object' } } },
      run: async (a, key) => { if (!key) return NEED_KEY; return JSON.stringify(await apiPost('/api/v1/competitions', a, key), null, 2); } },
    { name: 'list_competitions', description: 'List Competitions (free). Filter org/course/status.',
      inputSchema: { type: 'object', properties: { org: str('Org'), course: str('Course'), status: str('open|closed|finalized') } },
      run: async (a) => { const q = new URLSearchParams(); for (const k of ['org','course','status']) if (a[k]) q.set(k, a[k]); return JSON.stringify(await apiGet(`/api/v1/competitions${q.toString() ? `?${q}` : ''}`), null, 2); } },
    { name: 'get_competition', description: 'A Competition + live gross standings (free).',
      inputSchema: { type: 'object', required: ['competition_id'], properties: { competition_id: str('Competition id') } },
      run: async (a) => JSON.stringify(await apiGet(`/api/v1/competitions/${encodeURIComponent(a.competition_id)}`), null, 2) },
    { name: 'record_attempt', description: 'Record an Attempt (score or side-game value). Idempotent. Requires key.',
      inputSchema: { type: 'object', required: ['competition_id', 'player_id'], properties: { competition_id: str('Competition'), player_id: str('Player'), hole: num('Hole'), strokes: num('Strokes'), value: num('Side-game value'), team_id: str('Team') } },
      run: async (a, key) => { if (!key) return NEED_KEY; const { competition_id, ...body } = a; return JSON.stringify(await apiPost(`/api/v1/competitions/${encodeURIComponent(competition_id)}/attempt`, body, key), null, 2); } },
    { name: 'finalize_competition', description: 'Finalize — run the kernel, store the gross Result. Requires key.',
      inputSchema: { type: 'object', required: ['competition_id'], properties: { competition_id: str('Competition id') } },
      run: async (a, key) => { if (!key) return NEED_KEY; return JSON.stringify(await apiPost(`/api/v1/competitions/${encodeURIComponent(a.competition_id)}/finalize`, {}, key), null, 2); } },
    { name: 'broadcast_feed', description: 'OpenBroadcast P1 — ONE typed feed for a session: broadcast-worthy items (score/side_game/money/award/condition) in ascending (recorded_at, seq) order, each with template narration (headline<=60/ticker<=80). Money appears only via settled records. Replaces stitching moments+results+live_state. Requires key + session access (participant or compute).',
      inputSchema: { type: 'object', required: ['session_id'], properties: { session_id: str('Session id'), since: str('ISO cursor — items after this recorded_at'), kinds: str('csv filter: score,side_game,money,award,condition,standing,system'), limit: num('max items (<=500)') } },
      run: async (a, key) => { if (!key) return NEED_KEY; const q = new URLSearchParams(); for (const k of ['since','kinds','limit']) if (a[k] != null) q.set(k, String(a[k])); return JSON.stringify(await apiGet(`/api/v1/sessions/${encodeURIComponent(a.session_id)}/feed${q.toString() ? `?${q}` : ''}`, key), null, 2); } },
    { name: 'get_handicap', description: "OpenIndex (beta) — a player's estimated handicap computed from real, notarized rounds (every score stamped when it happened; verifiable by anyone). Not official — provable. Reading your OWN is free with your key; player_id must be the ogid_… form.",
      inputSchema: { type: 'object', required: ['player_id'], properties: { player_id: str('OpenGolf ID (ogid_…)') } },
      run: async (a, key) => { if (!key) return NEED_KEY; return JSON.stringify(await apiGet(`/api/v1/players/${encodeURIComponent(a.player_id)}/handicap`, key), null, 2); } },
    { name: 'list_webhooks', description: 'List your active webhook subscriptions. Requires key.',
      inputSchema: { type: 'object', properties: {} },
      run: async (_a, key) => { if (!key) return NEED_KEY; return JSON.stringify(await apiGet('/api/v1/webhooks', key), null, 2); } },
    { name: 'remove_webhook', description: 'Deactivate one of your webhook subscriptions by id (audit row kept). Requires key.',
      inputSchema: { type: 'object', required: ['subscription_id'], properties: { subscription_id: str('Subscription id') } },
      run: async (a, key) => { if (!key) return NEED_KEY; return JSON.stringify(await apiDelete(`/api/v1/webhooks/${encodeURIComponent(a.subscription_id)}`, key), null, 2); } },
    { name: 'list_orgs', description: 'Public directory of verified orgs (free).',
      inputSchema: { type: 'object', properties: { type: str('course|tour|club|sponsor') } },
      run: async (a) => { const q = a.type ? `?type=${encodeURIComponent(a.type)}` : ''; return JSON.stringify(await apiGet(`/api/v1/orgs${q}`), null, 2); } },
    { name: 'mint_asset', description: "Mint an Asset (trophy/badge/stamp/coupon/membership) into the owner's trophy case + chain. Requires key.",
      inputSchema: { type: 'object', required: ['type', 'name'], properties: { type: str('trophy|badge|passport|coupon|membership|collectible'), name: str('Name'), owner: str('Recipient sub'), org_id: str('Org'), metadata: { type: 'object' } } },
      run: async (a, key) => { if (!key) return NEED_KEY; return JSON.stringify(await apiPost('/api/v1/assets/mint', a, key), null, 2); } },
    { name: 'file_claim', description: 'File a Claim in the trust ledger (ownership/attestation/identity/record/correction). Requires key.',
      inputSchema: { type: 'object', required: ['claim_type', 'subject'], properties: { claim_type: str('Type'), subject: str('e.g. course:<id>'), statement: str('Statement'), target_id: str('Target') } },
      run: async (a, key) => { if (!key) return NEED_KEY; return JSON.stringify(await apiPost('/api/v1/claims', a, key), null, 2); } },
    { name: 'list_claims', description: 'List Claims (free). Filter claimant/subject/status.',
      inputSchema: { type: 'object', properties: { claimant: str('Claimant'), subject: str('Subject'), status: str('Status') } },
      run: async (a) => { const q = new URLSearchParams(); for (const k of ['claimant','subject','status']) if (a[k]) q.set(k, a[k]); return JSON.stringify(await apiGet(`/api/v1/claims${q.toString() ? `?${q}` : ''}`), null, 2); } },
    { name: 'post_beta', description: 'Drop local course knowledge ("beta") on a hole — the AI-caddie\'s fuel. Requires key.',
      inputSchema: { type: 'object', required: ['course_id', 'text'], properties: { course_id: str('Course'), text: str('The knowledge'), hole: num('Hole'), category: str('general|wind|green|hazard|tee|pin|approach') } },
      run: async (a, key) => { if (!key) return NEED_KEY; return JSON.stringify(await apiPost('/api/v1/beta', a, key), null, 2); } },
    { name: 'get_beta', description: 'Read local course knowledge for a course/hole (free).',
      inputSchema: { type: 'object', required: ['course'], properties: { course: str('Course id'), hole: num('Hole') } },
      run: async (a) => { const q = new URLSearchParams({ course: a.course }); if (a.hole !== undefined) q.set('hole', String(a.hole)); return JSON.stringify(await apiGet(`/api/v1/beta?${q}`), null, 2); } },
    { name: 'get_my_chain', description: 'Export YOUR tamper-evident OpenGolf Chain + checkpoints. Requires key (own-read free).',
      inputSchema: { type: 'object', properties: {} },
      run: async (_a, key) => { if (!key) return NEED_KEY; return JSON.stringify(await apiGet('/api/v1/me/chain', key), null, 2); } },
    { name: 'verify_chain', description: 'Verify a Chain export (public, no key) — recomputes links + checkpoint; reports tampering and where.',
      inputSchema: { type: 'object', required: ['export'], properties: { export: { type: 'object', description: 'export from get_my_chain' } } },
      run: async (a) => JSON.stringify(await apiPost('/api/v1/me/chain/verify', a.export), null, 2) },

  ];
  return TOOLS;
}
