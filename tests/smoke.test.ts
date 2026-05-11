import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';

// Smoke test: spawn the built MCP server, send MCP initialize + tools/list,
// assert it responds with the expected tools.

function rpc(send: (msg: object) => void, msg: object, id: number) {
  send({ jsonrpc: '2.0', id, ...msg });
}

async function withServer<T>(fn: (rpcCall: (method: string, params?: object) => Promise<unknown>) => Promise<T>): Promise<T> {
  const proc = spawn('node', ['dist/index.js'], { stdio: ['pipe', 'pipe', 'pipe'] });
  const pending = new Map<number, (v: unknown) => void>();
  let buf = '';
  proc.stdout.on('data', (chunk: Buffer) => {
    buf += chunk.toString();
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        const r = JSON.parse(line) as { id?: number; result?: unknown; error?: unknown };
        if (r.id != null && pending.has(r.id)) {
          pending.get(r.id)!(r.result ?? r.error);
          pending.delete(r.id);
        }
      } catch { /* ignore stderr-piped lines */ }
    }
  });
  let nextId = 1;
  const rpcCall = (method: string, params?: object): Promise<unknown> => new Promise(resolve => {
    const id = nextId++;
    pending.set(id, resolve);
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params: params ?? {} }) + '\n');
  });
  try {
    await rpcCall('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '0.0.0' } });
    return await fn(rpcCall);
  } finally {
    proc.kill();
  }
}

describe('MCP server', () => {
  it('responds to tools/list with the expected tools', async () => {
    const result = await withServer(async rpc => {
      return await rpc('tools/list');
    });
    const tools = (result as { tools: Array<{ name: string }> }).tools.map(t => t.name).sort();
    expect(tools).toContain('search_courses');
    expect(tools).toContain('get_course');
    expect(tools).toContain('about');
  }, 15000);

  it('tools/call about returns dataset metadata', async () => {
    const result = await withServer(async rpc => {
      return await rpc('tools/call', { name: 'about', arguments: {} });
    });
    const content = (result as { content: Array<{ text: string }> }).content[0].text;
    const parsed = JSON.parse(content);
    expect(parsed.name).toBe('OpenGolfAPI');
    expect(parsed.developers.contact).toContain('@opengolfapi.org');
  }, 15000);
});
