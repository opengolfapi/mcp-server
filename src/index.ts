#!/usr/bin/env node
/**
 * OpenGolfAPI MCP Server (npm, stdio) — THIN CONSUMER of the canonical registry (refactor R3).
 * ALL tools live in ./registry.ts — one source of truth shared with the hosted worker
 * (mcp.opengolfapi.org). Add tools THERE; both servers pick them up. Parity is structural.
 * Install: npx @opengolfapi/mcp-server · optional OPENGOLFAPI_KEY unlocks contribute/identity tools.
 */
import * as Sentry from '@sentry/node';
const DEFAULT_SENTRY_DSN = 'https://2cb261cd86bbfe9e105309d3c2edbced@o4511071885000704.ingest.us.sentry.io/4511345201315840';
const SENTRY_DSN_ACTIVE = process.env.OPENGOLFAPI_DISABLE_TELEMETRY ? '' : (process.env.SENTRY_DSN || DEFAULT_SENTRY_DSN);
if (SENTRY_DSN_ACTIVE) Sentry.init({ dsn: SENTRY_DSN_ACTIVE, tracesSampleRate: 0.1, release: `opengolfapi-mcp-server@${process.env.npm_package_version || 'unknown'}` });

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { buildTools, SERVER_INSTRUCTIONS, type Json } from './registry.js';

const PKG_VERSION = '3.3.4';
const API_BASE = process.env.OPENGOLFAPI_BASE ?? 'https://api.opengolfapi.org';
const OPENGOLFAPI_KEY = process.env.OPENGOLFAPI_KEY;
const userAgent = `opengolfapi-mcp-server/${PKG_VERSION}`;

const customFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set('User-Agent', userAgent);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  return fetch(input, { ...init, headers });
};
async function apiGet(path: string, key?: string): Promise<Json> {
  const r = await customFetch(API_BASE + path, { headers: key ? { Authorization: `Bearer ${key}` } : {} });
  const t = await r.text();
  if (!r.ok) throw new Error(`API ${r.status}: ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : {};
}
async function apiPost(path: string, body: Json, key?: string): Promise<Json> {
  const r = await customFetch(API_BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) }, body: JSON.stringify(body) });
  const t = await r.text();
  if (!r.ok) throw new Error(`API ${r.status}: ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : {};
}

const TOOLS = buildTools({ apiGet, apiPost, apiBase: API_BASE, rawFetch: customFetch });


const server = new Server(
  { name: 'opengolfapi', version: PKG_VERSION },
  { capabilities: { tools: {} }, instructions: SERVER_INSTRUCTIONS },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = TOOLS.find((t) => t.name === req.params.name);
  if (!tool) return { content: [{ type: 'text' as const, text: `Unknown tool: ${req.params.name}` }], isError: true };
  try {
    const text = await tool.run((req.params.arguments as Json) || {}, OPENGOLFAPI_KEY);
    return { content: [{ type: 'text' as const, text }] };
  } catch (e) {
    Sentry.captureException(e, { tags: { tool: req.params.name } });
    return { content: [{ type: 'text' as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
  }
});

async function main() {
  console.error('OpenGolfAPI MCP server — the open platform for golf (ODbL).');
  console.error('Building something? info@opengolfapi.org · Free key: https://opengolfapi.org/developer');
  await server.connect(new StdioServerTransport());
}
main().catch((err) => { Sentry.captureException(err); console.error(err); });
