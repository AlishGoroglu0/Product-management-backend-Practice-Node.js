// diagnostics/_helpers.js
// Shared utilities for all diag modules.
// This is the ONLY file in diagnostics/ that imports db.js.

import { all as dbAll, get as dbGet } from '../db.js';

// --- Console formatting ----------------------------------------------

export const ok   = (msg) => console.log(`  ✅ ${msg}`);
export const bad  = (msg) => console.log(`  ❌ ${msg}`);
export const info = (msg) => console.log(`  ℹ️  ${msg}`);
export const head = (msg) => console.log(`\n=== ${msg} ===`);

// --- DB access (re-exported so diags import from one place) ----------

export const all = dbAll;
export const get = dbGet;

// --- HTTP helper -----------------------------------------------------
// Calls the local server, returns { status, data }.
// Never throws — network errors come back as { status: 'ERR', data: msg }.

export async function hit(method, path, body) {
  const url = `http://localhost:3000${path}`;
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: res.status, data };
  } catch (err) {
    return { status: 'ERR', data: err.message };
  }
}