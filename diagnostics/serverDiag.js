// diagnostics/serverDiag.js
// Checks: server is reachable, tables exist, row counts, column shapes.
// Runs read-only checks only. No writes, no cleanup needed.

import { ok, bad, info, head, hit, all, get } from './_helpers.js';

const EXPECTED_TABLES = [
  'products',
  'users',
  'taxes',
  'receipts',
  'receipt_items',
  'receipt_item_taxes',
];

export default async function runServerDiag() {
  // 1. Server reachability
  head('Server');
  const ping = await hit('GET', '/api/products');
  if (ping.status === 200) {
    ok(`GET /api/products → 200 (${Array.isArray(ping.data) ? ping.data.length : '?'} items)`);
  } else {
    bad(`GET /api/products → ${ping.status}: ${JSON.stringify(ping.data)}`);
  }

  const pingUsers = await hit('GET', '/api/users');
  if (pingUsers.status === 200) {
    ok(`GET /api/users → 200 (${Array.isArray(pingUsers.data) ? pingUsers.data.length : '?'} items)`);
  } else {
    bad(`GET /api/users → ${pingUsers.status}: ${JSON.stringify(pingUsers.data)}`);
  }

  const pingReceipts = await hit('GET', '/api/receipts');
  if (pingReceipts.status === 200) {
    ok(`GET /api/receipts → 200 (${Array.isArray(pingReceipts.data) ? pingReceipts.data.length : '?'} items)`);
  } else {
    bad(`GET /api/receipts → ${pingReceipts.status}: ${JSON.stringify(pingReceipts.data)}`);
  }

  // 2. Tables exist
  head('Database tables');
  const tables = await all(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`);
  const names = tables.map((t) => t.name);
  info(`found: ${names.join(', ') || '(none)'}`);

  for (const expected of EXPECTED_TABLES) {
    if (names.includes(expected)) ok(`table "${expected}" exists`);
    else bad(`table "${expected}" MISSING`);
  }

  // 3. Row counts
  head('Row counts');
  for (const t of EXPECTED_TABLES) {
    if (!names.includes(t)) continue;
    const { c } = await get(`SELECT COUNT(*) AS c FROM ${t}`);
    info(`${t}: ${c} row(s)`);
  }

  // 4. Column shapes
  head('Schema shape');
  for (const t of EXPECTED_TABLES) {
    if (!names.includes(t)) continue;
    const cols = await all(`PRAGMA table_info(${t})`);
    info(`${t}: ${cols.map((c) => `${c.name}(${c.type})`).join(', ')}`);
  }
}