#!/usr/bin/env node
// La Masia — servidor local (zero dependências)
// Uso: node server.mjs  →  http://localhost:4870

import http from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const PORT = process.env.PORT || 4870;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

async function ensureData() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
}

async function readState() {
  await ensureData();
  if (!existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(await readFile(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

// escrita atômica: escreve num tmp e renomeia
async function writeState(obj) {
  await ensureData();
  const tmp = STATE_FILE + '.tmp';
  await writeFile(tmp, JSON.stringify(obj, null, 2), 'utf8');
  await rename(tmp, STATE_FILE);
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...CORS });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 2e6) reject(new Error('payload grande demais')); });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

/* escudos de clubes — busca no TheSportsDB e cacheia em data/badges/ */
const badgeMiss = new Map();

async function handleBadge(url, res) {
  const team = (url.searchParams.get('team') || '').trim();
  if (!team) return send(res, 400, '{"error":"team obrigatório"}');
  const slug = team.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const dir = path.join(DATA_DIR, 'badges');
  const file = path.join(dir, slug + '.png');

  if (existsSync(file)) return send(res, 200, await readFile(file), 'image/png');
  if (badgeMiss.has(slug)) return send(res, 404, 'sem escudo', 'text/plain; charset=utf-8');

  try {
    const search = async (name) => {
      const r = await fetch('https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=' + encodeURIComponent(name), { signal: AbortSignal.timeout(8000) });
      const j = await r.json();
      const teams = ((j && j.teams) || []).filter((t) => t.strSport === 'Soccer');
      return teams.length ? (teams[0].strBadge || teams[0].strTeamBadge) : null;
    };
    let badge = await search(team);
    if (!badge && /-/.test(team)) badge = await search(team.replace(/-/g, ' '));
    if (!badge) throw new Error('não encontrado');

    let ir = await fetch(badge + '/small', { signal: AbortSignal.timeout(8000) });
    if (!ir.ok) ir = await fetch(badge, { signal: AbortSignal.timeout(8000) });
    if (!ir.ok) throw new Error('imagem indisponível');

    const buf = Buffer.from(await ir.arrayBuffer());
    await mkdir(dir, { recursive: true });
    await writeFile(file, buf);
    send(res, 200, buf, 'image/png');
  } catch {
    badgeMiss.set(slug, true);
    send(res, 404, 'sem escudo', 'text/plain; charset=utf-8');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

  if (url.pathname === '/api/badge' && req.method === 'GET') return handleBadge(url, res);

  if (url.pathname === '/api/state') {
    if (req.method === 'GET') return send(res, 200, JSON.stringify(await readState()));
    if (req.method === 'PUT') {
      try {
        const obj = JSON.parse(await readBody(req));
        await writeState(obj);
        return send(res, 200, '{"ok":true}');
      } catch (e) {
        return send(res, 400, JSON.stringify({ ok: false, error: String(e) }));
      }
    }
    return send(res, 405, '{"error":"method not allowed"}');
  }

  // estáticos
  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  file = path.normalize(file).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(PUBLIC, file);
  if (!full.startsWith(PUBLIC)) return send(res, 403, 'forbidden', 'text/plain');
  try {
    const buf = await readFile(full);
    send(res, 200, buf, MIME[path.extname(full)] || 'application/octet-stream');
  } catch {
    send(res, 404, 'não encontrado', 'text/plain; charset=utf-8');
  }
});

server.listen(PORT, () => {
  console.log(`\n  ⚽ La Masia rodando em  http://localhost:${PORT}\n`);
  console.log(`  dados persistidos em   ${STATE_FILE}\n`);
});
