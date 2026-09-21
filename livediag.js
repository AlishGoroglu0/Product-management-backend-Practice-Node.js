// livediag.js
// Startup smoke/diagnostic: pings the API and inspects the DB.
// Self-cleaning: guaranteed to remove its own test rows, even on failure.

import db from './db.js';

// --- tiny helpers -----------------------------------------------------
const ok   = (msg) => console.log(`  ✅ ${msg}`);
const bad  = (msg) => console.log(`  ❌ ${msg}`);
const info = (msg) => console.log(`  ℹ️  ${msg}`);
const head = (msg) => console.log(`\n=== ${msg} ===`);

// Promise wrappers around sqlite3
const all = (sql, params = []) =>
  new Promise((res, rej) => db.all(sql, params, (e, r) => (e ? rej(e) : res(r))));
const get = (sql, params = []) =>
  new Promise((res, rej) => db.get(sql, params, (e, r) => (e ? rej(e) : res(r))));

// --- HTTP helper ------------------------------------------------------
async function hit(method, path, body) {
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

// --- the diagnostic ---------------------------------------------------
export async function runLiveTest() {
  console.log('\n🧪 ============ LIVE DIAG START ============');

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

  // 2. DB tables
  head('Database tables');
  const tables = await all(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`);
  const names = tables.map((t) => t.name);
  info(`found: ${names.join(', ') || '(none)'}`);
  for (const expected of ['products', 'users']) {
    if (names.includes(expected)) ok(`table "${expected}" exists`);
    else bad(`table "${expected}" MISSING`);
  }

  // 3. Row counts
  head('Row counts');
  for (const t of ['products', 'users']) {
    if (!names.includes(t)) continue;
    const { c } = await get(`SELECT COUNT(*) AS c FROM ${t}`);
    info(`${t}: ${c} row(s)`);
  }

  // 4. Column shapes
  head('Schema shape');
  for (const t of ['products', 'users']) {
    if (!names.includes(t)) continue;
    const cols = await all(`PRAGMA table_info(${t})`);
    info(`${t}: ${cols.map((c) => `${c.name}(${c.type})`).join(', ')}`);
  }

  // 5. Round-trip: create → read → delete, with guaranteed cleanup
  head('Product round-trip');
  const payload = { name: 'Live Test Widget', price: 9.99, stock: 3, threshold: 1 };
  let testId = null;

  try {
    const created = await hit('POST', '/api/products', payload);
    if (created.status === 201 && created.data?.id) {
      testId = created.data.id;
      ok(`POST → 201, created id=${testId}`);
    } else {
      bad(`POST → ${created.status}: ${JSON.stringify(created.data)}`);
    }

    if (testId) {
      const fetched = await hit('GET', `/api/products/${testId}`);
      if (fetched.status === 200 && fetched.data?.id === testId) {
        ok(`GET /:id → found "${testId}"`);
      } else {
        bad(`GET /:id → ${fetched.status}: ${JSON.stringify(fetched.data)}`);
      }

      const deleted = await hit('DELETE', `/api/products/${testId}`);
      if (deleted.status === 200 || deleted.status === 204) {
        ok(`DELETE → ${deleted.status}`);
      } else {
        bad(`DELETE → ${deleted.status}: ${JSON.stringify(deleted.data)}`);
      }
    }
  } catch (err) {
    bad(`round-trip threw: ${err.message}`);
  } finally {
    // Safety net: remove the row at the DB level, no matter what happened.
    if (testId) {
      try {
        await new Promise((res, rej) =>
          db.run('DELETE FROM products WHERE id = ?', [testId], (e) => (e ? rej(e) : res()))
        );
        const { c } = await get('SELECT COUNT(*) AS c FROM products WHERE id = ?', [testId]);
        if (c === 0) ok('cleanup confirmed: no leftover test row');
        else bad(`cleanup FAILED: ${c} row(s) still present for id=${testId}`);
      } catch (err) {
        bad(`cleanup error: ${err.message}`);
      }
    }
  }

  // 6. User round-trip: create → read → update → delete, with guaranteed cleanup
  head('User round-trip');
  const userPayload = {
    name: 'Live Test User',
    authName: 'Product User',
    canEdit: 0,
    canCreate: 0,
    canDelete: 0,
  };
  let testUserId = null;

  try {
    const created = await hit('POST', '/api/users', userPayload);
    if (created.status === 201 && created.data?.id) {
      testUserId = created.data.id;
      ok(`POST → 201, created id=${testUserId}`);
    } else {
      bad(`POST → ${created.status}: ${JSON.stringify(created.data)}`);
    }

    if (testUserId) {
      const fetched = await hit('GET', `/api/users/${testUserId}`);
      if (fetched.status === 200 && fetched.data?.id === testUserId) {
        ok(`GET /:id → found "${testUserId}"`);
        const u = fetched.data;
        if (u.name === userPayload.name && u.authName === userPayload.authName) {
          ok(`GET /:id → fields match (name="${u.name}", authName="${u.authName}")`);
        } else {
          bad(`GET /:id → field mismatch: ${JSON.stringify(u)}`);
        }
      } else {
        bad(`GET /:id → ${fetched.status}: ${JSON.stringify(fetched.data)}`);
      }

      const updatedPayload = {
        name: 'Live Test User (updated)',
        authName: 'Master User',
        canEdit: 1,
        canCreate: 1,
        canDelete: 1,
      };
      const updated = await hit('PUT', `/api/users/${testUserId}`, updatedPayload);
      if (updated.status === 200) {
        ok(`PUT → ${updated.status} (${JSON.stringify(updated.data)})`);
      } else {
        bad(`PUT → ${updated.status}: ${JSON.stringify(updated.data)}`);
      }

      const afterUpdate = await hit('GET', `/api/users/${testUserId}`);
      if (
        afterUpdate.status === 200 &&
        afterUpdate.data?.authName === 'Master User' &&
        Number(afterUpdate.data?.canEdit) === 1
      ) {
        ok('PUT verified: authName and canEdit persisted');
      } else {
        bad(`PUT verification failed: ${JSON.stringify(afterUpdate.data)}`);
      }

      const deleted = await hit('DELETE', `/api/users/${testUserId}`);
      if (deleted.status === 200 || deleted.status === 204) {
        ok(`DELETE → ${deleted.status}`);
      } else {
        bad(`DELETE → ${deleted.status}: ${JSON.stringify(deleted.data)}`);
      }
    }
  } catch (err) {
    bad(`round-trip threw: ${err.message}`);
  } finally {
    // Safety net: remove the row at the DB level, no matter what happened.
    if (testUserId) {
      try {
        await new Promise((res, rej) =>
          db.run('DELETE FROM users WHERE id = ?', [testUserId], (e) => (e ? rej(e) : res()))
        );
        const { c } = await get('SELECT COUNT(*) AS c FROM users WHERE id = ?', [testUserId]);
        if (c === 0) ok('cleanup confirmed: no leftover test row');
        else bad(`cleanup FAILED: ${c} row(s) still present for id=${testUserId}`);
      } catch (err) {
        bad(`cleanup error: ${err.message}`);
      }
    }
  }

  console.log('🧪 ============ LIVE DIAG END ============\n');
}