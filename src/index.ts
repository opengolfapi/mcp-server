#!/usr/bin/env node
/**
 * OpenGolfAPI MCP Server
 *
 * Tools: search_courses, get_course, get_tees, get_climate, get_nearby
 * All data is open — ODbL licensed.
 *
 * Install: npx @opengolfapi/mcp-server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Package version — used in User-Agent so the API can identify MCP traffic.
const PKG_VERSION = '2.2.0';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://zeskurqlsgvmahzmmsmd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

// Optional API key for higher rate limits. Anonymous (no key) still works
// at 1k req/day per IP. With a free key from courses.opengolfapi.org/api-keys,
// the limit jumps to 10k+/day depending on donor tier.
const OPENGOLFAPI_KEY = process.env.OPENGOLFAPI_KEY;

const userAgent = `opengolfapi-mcp-server/${PKG_VERSION}`;

// Wrap fetch so every outbound request carries our User-Agent. For requests
// to api.opengolfapi.org specifically, also attach Authorization: Bearer
// when OPENGOLFAPI_KEY is set so the API can apply the donor-tier rate limit.
//
// We deliberately do NOT attach the OpenGolfAPI bearer to Supabase URLs —
// PostgREST treats `Authorization` as the user JWT for RLS and would reject
// an `ogapi_...` token. Supabase's own apikey/anon headers are managed by
// the SDK and left untouched.
const customFetch: typeof fetch = (input, init) => {
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : input.url;

  const headers = new Headers(init?.headers);
  headers.set('User-Agent', userAgent);

  if (OPENGOLFAPI_KEY && url.includes('api.opengolfapi.org')) {
    headers.set('Authorization', `Bearer ${OPENGOLFAPI_KEY}`);
  }

  return fetch(input, { ...init, headers });
};

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: {
    headers: { 'User-Agent': userAgent },
    fetch: customFetch,
  },
});

const server = new McpServer({
  name: 'opengolfapi',
  version: PKG_VERSION,
  description: 'Open database of 14,708 US golf courses. ODbL licensed. opengolfapi.org',
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
    let query = supabase.from('golf_courses').select('*');

    if (q) query = query.ilike('course_name', `%${q}%`);
    if (state) query = query.eq('state', state.toUpperCase());

    if (lat !== undefined && lng !== undefined) {
      const r = radius_mi ?? 25;
      const latDelta = r / 69.0;
      const lngDelta = r / (69.0 * Math.cos(lat * Math.PI / 180));
      query = query
        .gte('latitude', lat - latDelta).lte('latitude', lat + latDelta)
        .gte('longitude', lng - lngDelta).lte('longitude', lng + lngDelta);
    }

    const { data } = await query.limit(limit ?? 10);

    const courses = (data ?? []).map((c: Record<string, unknown>) => ({
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
    }));

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          courses,
          total: courses.length,
          source: 'OpenGolfAPI (opengolfapi.org) — ODbL licensed',
        }, null, 2),
      }],
    };
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
    const [courseRes, holesRes] = await Promise.all([
      supabase.from('golf_courses').select('*').eq('id', course_id).single(),
      supabase.from('golf_course_holes').select('hole_number, par, handicap_index').eq('course_id', course_id).not('par', 'is', null).order('hole_number'),
    ]);

    if (courseRes.error || !courseRes.data) {
      return { content: [{ type: 'text' as const, text: 'Course not found' }] };
    }

    const c = courseRes.data as Record<string, unknown>;
    const scorecard = (holesRes.data ?? []).map(h => ({
      hole: h.hole_number,
      par: h.par,
      handicap_index: h.handicap_index,
    }));

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          id: c.id,
          name: c.course_name,
          city: c.city,
          state: c.state,
          lat: c.latitude,
          lng: c.longitude,
          type: c.course_type,
          par: c.par_total,
          total_yardage: c.total_yardage,
          holes: scorecard.length,
          phone: c.phone,
          website: c.website,
          architect: c.architect,
          year_built: c.year_built,
          address: c.address,
          postal_code: c.postal_code,
          scorecard,
          source: 'OpenGolfAPI (opengolfapi.org) — ODbL licensed',
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
    const { data, error } = await supabase
      .from('golf_course_tees')
      .select('*')
      .eq('course_id', course_id)
      .order('total_yardage', { ascending: false });

    if (error) {
      return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ tees: data ?? [], source: 'OpenGolfAPI (opengolfapi.org) — ODbL licensed' }, null, 2),
      }],
    };
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
    const { data, error } = await supabase
      .from('golf_course_climate')
      .select('*')
      .eq('course_id', course_id)
      .maybeSingle();

    if (error) {
      return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ climate: data, source: 'OpenGolfAPI (opengolfapi.org) — ODbL licensed' }, null, 2),
      }],
    };
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
    const { data, error } = await supabase
      .from('golf_course_nearby')
      .select('*')
      .eq('course_id', course_id)
      .order('distance_miles')
      .limit(20);

    if (error) {
      return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ nearby: data ?? [], source: 'OpenGolfAPI (opengolfapi.org) — ODbL licensed' }, null, 2),
      }],
    };
  }
);

// ── Start ──

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
