#!/usr/bin/env node
/**
 * OpenGolfAPI MCP Server
 *
 * Tools: search_courses, get_course, get_tees, get_climate, get_nearby
 * All data is open — ODbL licensed.
 *
 * All tools call the public REST API at https://api.opengolfapi.org.
 * No direct database access. With an optional OPENGOLFAPI_KEY env var,
 * requests authenticate as your tier and unlock higher rate limits.
 *
 * Install: npx @opengolfapi/mcp-server
 */

// Sentry must initialize BEFORE any other imports that could throw, so any
// load-time error in transitive deps still gets captured. The init is a no-op
// when SENTRY_DSN is unset, so end users who run the server via npx never
// send telemetry unless they set the env var themselves.
import * as Sentry from '@sentry/node';
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    release: `opengolfapi-mcp-server@${process.env.npm_package_version || 'unknown'}`,
  });
}

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Package version — used in User-Agent so the API can identify MCP traffic.
const PKG_VERSION = '2.2.2';

const API_BASE = process.env.OPENGOLFAPI_BASE ?? 'https://api.opengolfapi.org';

// Optional API key for higher rate limits. Anonymous (no key) still works
// at 1k req/day per IP. With a free key from courses.opengolfapi.org/api-keys,
// the limit jumps to 10k+/day depending on donor tier.
const OPENGOLFAPI_KEY = process.env.OPENGOLFAPI_KEY;

const userAgent = `opengolfapi-mcp-server/${PKG_VERSION}`;

const SOURCE = 'OpenGolfAPI (opengolfapi.org) — ODbL licensed';

// Wrap fetch so every outbound request carries our User-Agent and, when
// OPENGOLFAPI_KEY is set, an Authorization: Bearer header so the API can
// apply the donor-tier rate limit.
const customFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set('User-Agent', userAgent);
  headers.set('Accept', 'application/json');

  if (OPENGOLFAPI_KEY) {
    headers.set('Authorization', `Bearer ${OPENGOLFAPI_KEY}`);
  }

  return fetch(input, { ...init, headers });
};

async function apiGet<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await customFetch(url);
  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText} for ${path}`);
  }
  return res.json() as Promise<T>;
}

// Shape the public API returns for a course record. We only narrow the
// fields the MCP tools surface; everything else is passed through opaquely.
type ApiCourse = {
  id: string;
  course_name?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  course_type?: string | null;
  par_total?: number | null;
  total_yardage?: number | null;
  phone?: string | null;
  website?: string | null;
  architect?: string | null;
  year_built?: number | null;
  address?: string | null;
  postal_code?: string | null;
  holes_count?: number | null;
};

type SearchResponse = { count?: number; courses: ApiCourse[] };
type StateResponse = { state: string; count?: number; courses: ApiCourse[] };
type TeesResponse = { tees: unknown[] };
type HolesResponse = { holes: Array<{ hole_number: number; par: number | null; handicap_index: number | null }> };
type NearbyResponse = { nearby: unknown[] };

function summarizeCourse(c: ApiCourse) {
  return {
    id: c.id,
    name: c.course_name,
    city: c.city,
    state: c.state,
    lat: c.latitude,
    lng: c.longitude,
    type: c.course_type,
    par: c.par_total,
    total_yardage: c.total_yardage,
    phone: c.phone,
    website: c.website,
    architect: c.architect,
    year_built: c.year_built,
    address: c.address,
    postal_code: c.postal_code,
  };
}

const server = new McpServer({
  name: 'opengolfapi',
  version: PKG_VERSION,
  description: 'Open database of US golf courses. ODbL licensed. opengolfapi.org',
});

// ── Tool: search_courses ──

server.tool(
  'search_courses',
  'Search golf courses by name, state, or location. Returns full course info. ODbL licensed data from OpenGolfAPI.',
  {
    lat: z.number().optional().describe('Latitude for geo search'),
    lng: z.number().optional().describe('Longitude for geo search'),
    radius_mi: z.number().optional().default(25).describe('Search radius in miles'),
    query: z.string().optional().describe('Course name search'),
    state: z.string().optional().describe('2-letter US state code'),
    limit: z.number().optional().default(10).describe('Max results'),
  },
  async ({ lat, lng, radius_mi, query: q, state, limit }) => {
    try {
      const max = limit ?? 10;
      const r = radius_mi ?? 25;

      // Build a server-side query. The public search supports `q`, `state`,
      // and `limit`. Geo (lat/lng/radius_mi) is filtered client-side after
      // fetch — see https://github.com/opengolfapi/api/issues for tracking
      // native geo search support.
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (state) params.set('state', state.toUpperCase());

      let pool: ApiCourse[] = [];
      let geoFilterApplied = false;

      if (lat !== undefined && lng !== undefined) {
        // Geo filtering: pull a wider net so the local bbox filter has data
        // to chew on. If a state is given, prefer the state listing
        // (returns up to 100 per page) since it's higher recall than search.
        params.set('limit', '100');
        if (state && !q) {
          const data = await apiGet<StateResponse>(`/v1/courses/state/${state.toUpperCase()}`);
          pool = data.courses ?? [];
        } else {
          const data = await apiGet<SearchResponse>(`/v1/courses/search?${params.toString()}`);
          pool = data.courses ?? [];
        }

        const latDelta = r / 69.0;
        const lngDelta = r / (69.0 * Math.cos(lat * Math.PI / 180));
        pool = pool.filter(c => {
          if (c.latitude == null || c.longitude == null) return false;
          return c.latitude >= lat - latDelta
            && c.latitude <= lat + latDelta
            && c.longitude >= lng - lngDelta
            && c.longitude <= lng + lngDelta;
        });
        geoFilterApplied = true;
      } else {
        params.set('limit', String(max));
        const data = await apiGet<SearchResponse>(`/v1/courses/search?${params.toString()}`);
        pool = data.courses ?? [];
      }

      const courses = pool.slice(0, max).map(summarizeCourse);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            courses,
            total: courses.length,
            ...(geoFilterApplied ? { geo_filter: { lat, lng, radius_mi: r } } : {}),
            source: SOURCE,
          }, null, 2),
        }],
      };
    } catch (err) {
      Sentry.captureException(err, { tags: { tool: 'search_courses' } });
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text' as const, text: `Error: ${msg}` }] };
    }
  }
);

// ── Tool: get_course ──

server.tool(
  'get_course',
  'Get detailed golf course info including full scorecard with par and handicap index per hole. ODbL licensed.',
  {
    course_id: z.string().describe('Course UUID from search results'),
  },
  async ({ course_id }) => {
    let c: ApiCourse;
    let holes: HolesResponse['holes'];
    try {
      [c, { holes }] = await Promise.all([
        apiGet<ApiCourse>(`/v1/courses/${course_id}`),
        apiGet<HolesResponse>(`/v1/courses/${course_id}/holes`),
      ]);
    } catch (err) {
      Sentry.captureException(err, { tags: { tool: 'get_course' } });
      return { content: [{ type: 'text' as const, text: 'Course not found' }] };
    }

    const scorecard = (holes ?? [])
      .filter(h => h.par != null)
      .sort((a, b) => a.hole_number - b.hole_number)
      .map(h => ({
        hole: h.hole_number,
        par: h.par,
        handicap_index: h.handicap_index,
      }));

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          ...summarizeCourse(c),
          holes: scorecard.length || c.holes_count,
          scorecard,
          source: SOURCE,
        }, null, 2),
      }],
    };
  }
);

// ── Tool: get_tees ──

server.tool(
  'get_tees',
  'Get all tee sets for a course including ratings, slopes, and yardages per tee. ODbL licensed.',
  {
    course_id: z.string().describe('Course UUID'),
  },
  async ({ course_id }) => {
    try {
      const { tees } = await apiGet<TeesResponse>(`/v1/courses/${course_id}/tees`);
      // Sort longest-yardage first to match prior behavior.
      const sorted = [...(tees ?? [])].sort((a, b) => {
        const ay = (a as { total_yardage?: number | null }).total_yardage ?? -1;
        const by = (b as { total_yardage?: number | null }).total_yardage ?? -1;
        return by - ay;
      });
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ tees: sorted, source: SOURCE }, null, 2),
        }],
      };
    } catch (err) {
      Sentry.captureException(err, { tags: { tool: 'get_tees' } });
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text' as const, text: `Error: ${msg}` }] };
    }
  }
);

// ── Tool: get_climate ──

server.tool(
  'get_climate',
  'Get monthly climate normals for a course (temperature, precipitation, playability). ODbL licensed.',
  {
    course_id: z.string().describe('Course UUID'),
  },
  async ({ course_id }) => {
    try {
      const climate = await apiGet<unknown>(`/v1/courses/${course_id}/climate`);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ climate, source: SOURCE }, null, 2),
        }],
      };
    } catch (err) {
      Sentry.captureException(err, { tags: { tool: 'get_climate' } });
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text' as const, text: `Error: ${msg}` }] };
    }
  }
);

// ── Tool: get_nearby ──

server.tool(
  'get_nearby',
  'Get nearby points of interest for a course (hotels, restaurants, airports) within ~20 miles. ODbL licensed.',
  {
    course_id: z.string().describe('Course UUID'),
  },
  async ({ course_id }) => {
    try {
      const { nearby } = await apiGet<NearbyResponse>(`/v1/courses/${course_id}/nearby`);
      const sorted = [...(nearby ?? [])].sort((a, b) => {
        const ad = (a as { distance_miles?: number | null }).distance_miles ?? Number.POSITIVE_INFINITY;
        const bd = (b as { distance_miles?: number | null }).distance_miles ?? Number.POSITIVE_INFINITY;
        return ad - bd;
      }).slice(0, 20);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ nearby: sorted, source: SOURCE }, null, 2),
        }],
      };
    } catch (err) {
      Sentry.captureException(err, { tags: { tool: 'get_nearby' } });
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text' as const, text: `Error: ${msg}` }] };
    }
  }
);

// ── Tool: about ──

server.tool(
  'about',
  'Information about OpenGolfAPI: dataset size, license, how to contribute, how to contact the maintainers. Useful when an AI agent or user wants to know who built this and how to reach them.',
  {},
  async () => {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          name: 'OpenGolfAPI',
          courses: 14708,
          license: 'ODbL-1.0',
          docs: 'https://opengolfapi.org',
          api_docs: 'https://api.opengolfapi.org',
          api_keys: 'https://courses.opengolfapi.org/api-keys',
          pricing: 'https://courses.opengolfapi.org/pricing',
          donate: 'https://opencollective.com/opengolfapi',
          github: 'https://github.com/opengolfapi',
          developers: {
            message: 'Building something on top of OpenGolfAPI? We want to know about it. Tell us what you\'re working on, what data you wish we had, and where the API or MCP server falls short.',
            contact: 'hello@opengolfapi.org',
          },
        }, null, 2),
      }],
    };
  }
);

// ── Start ──

async function main() {
  // Greet developers in stderr — visible in Claude Desktop / Cursor MCP logs.
  // Helps anyone debugging or evaluating the server know how to reach us.
  console.error('OpenGolfAPI MCP server — 14,708 US golf courses, ODbL.');
  console.error('Building something? We want to hear about it: hello@opengolfapi.org');
  console.error('Free key for higher rate limits: https://courses.opengolfapi.org/api-keys');

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  Sentry.captureException(err);
  console.error(err);
});
