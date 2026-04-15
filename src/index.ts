#!/usr/bin/env node
/**
 * OpenGolfAPI MCP Server — Free tier.
 *
 * 2 tools: search_courses, get_course
 * Returns only open/free fields.
 *
 * Install: npx @opengolfapi/mcp-server
 * Or connect via: npx tsx mcp-server/opengolf.ts
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://ysbzokxixabqrdogdvqc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FREE_FIELDS = 'id, course_name, latitude, longitude, state, city, course_type, par_total, phone, website, year_built, address, postal_code';

const server = new McpServer({
  name: 'opengolfapi',
  version: '1.0.0',
  description: 'Open database of 17,000+ US golf courses. Free, ODbL licensed. opengolfapi.org',
});

// ── Tool: search_courses ──

server.tool(
  'search_courses',
  'Search golf courses by name, state, or location. Returns basic course info. Free, ODbL licensed data from OpenGolfAPI.',
  {
    lat: z.number().optional().describe('Latitude for geo search'),
    lng: z.number().optional().describe('Longitude for geo search'),
    radius_mi: z.number().optional().default(25).describe('Search radius in miles'),
    query: z.string().optional().describe('Course name search'),
    state: z.string().optional().describe('2-letter US state code'),
    limit: z.number().optional().default(10).describe('Max results'),
  },
  async ({ lat, lng, radius_mi, query: q, state, limit }) => {
    let query = supabase.from('golf_courses').select(FREE_FIELDS);

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
      phone: c.phone,
      website: c.website,
    }));

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          courses,
          total: courses.length,
          source: 'OpenGolfAPI (opengolfapi.org) — ODbL licensed',
          upgrade: 'Tee ratings, climate, weather, booking → golfagi.com/api',
        }, null, 2),
      }],
    };
  }
);

// ── Tool: get_course ──

server.tool(
  'get_course',
  'Get detailed golf course info including scorecard. Free, ODbL licensed. For tee ratings, climate, weather, booking → golfagi.com/api',
  {
    course_id: z.string().describe('Course UUID from search results'),
  },
  async ({ course_id }) => {
    const [courseRes, holesRes] = await Promise.all([
      supabase.from('golf_courses').select(FREE_FIELDS).eq('id', course_id).single(),
      supabase.from('golf_course_holes').select('hole_number, par').eq('course_id', course_id).not('par', 'is', null).order('hole_number'),
    ]);

    if (courseRes.error || !courseRes.data) {
      return { content: [{ type: 'text' as const, text: 'Course not found' }] };
    }

    const c = courseRes.data;
    const scorecard = (holesRes.data ?? []).map(h => ({
      hole: h.hole_number,
      par: h.par,
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
          holes: scorecard.length,
          phone: c.phone,
          website: c.website,
          year_built: c.year_built,
          address: c.address,
          postal_code: c.postal_code,
          scorecard,
          source: 'OpenGolfAPI (opengolfapi.org) — ODbL licensed',
          upgrade: 'Tee ratings, slopes, yardages, climate, weather, nearby hotels, booking → golfagi.com/api',
        }, null, 2),
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
