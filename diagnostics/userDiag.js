// diagnostics/userDiag.js
// User round-trip: create → read → update → verify → delete, with guaranteed DB-level cleanup.
// Never throws — failures are logged but the function returns normally.

import { ok, bad, head, hit, get } from './_helpers.js';
import db from '../db.js';

export default async function runUserDiag() {
  head('User round-trip');

  const payload = {
    name: 'Live Test User',
    authName: 'Product User',
    canEdit: 0,
    canCreate: 0,
    canDelete: 0,
  };
  let testId = null;

  try {
    // 1. Create
    const created = await hit('POST', '/api/users', payload);
    if (created.status === 201 && created.data?.id) {
      testId = created.data.id;
      ok(`POST → 201, created id=${testId}`);
    } else {
      bad(`POST → ${created.status}: ${JSON.stringify(created.data)}`);
    }

    if (!testId) return;

    // 2. Read back and check fields
    const fetched = await hit('GET', `/api/users/${testId}`);
    if (fetched.status === 200 && fetched.data?.id === testId) {
      ok(`GET /:id → found "${testId}"`);
      const u = fetched.data;
      if (u.name === payload.name && u.authName === payload.authName) {
        ok(`GET /:id → fields match (name="${u.name}", authName="${u.authName}")`);
      } else {
        bad(`GET /:id → field mismatch: ${JSON.stringify(u)}`);
      }
    } else {
      bad(`GET /:id → ${fetched.status}: ${JSON.stringify(fetched.data)}`);
    }

    // 3. Update
    const updatedPayload = {
      name: 'Live Test User (updated)',
      authName: 'Master User',
      canEdit: 1,
      canCreate: 1,
      canDelete: 1,
    };
    const updated = await hit('PUT', `/api/users/${testId}`, updatedPayload);
    if (updated.status === 200) {
      ok(`PUT → ${updated.status}`);
    } else {
      bad(`PUT → ${updated.status}: ${JSON.stringify(updated.data)}`);
    }

    // 4. Verify update persisted
    const afterUpdate = await hit('GET', `/api/users/${testId}`);
    if (
      afterUpdate.status === 200 &&
      afterUpdate.data?.authName === 'Master User' &&
      Number(afterUpdate.data?.canEdit) === 1
    ) {
      ok('PUT verified: authName and canEdit persisted');
    } else {
      bad(`PUT verification failed: ${JSON.stringify(afterUpdate.data)}`);
    }

    // 5. Delete via API
    const deleted = await hit('DELETE', `/api/users/${testId}`);
    if (deleted.status === 200 || deleted.status === 204) {
      ok(`DELETE → ${deleted.status}`);
    } else {
      bad(`DELETE → ${deleted.status}: ${JSON.stringify(deleted.data)}`);
    }
  } catch (err) {
    bad(`round-trip threw: ${err.message}`);
  } finally {
    // Safety net: remove the row at the DB level, no matter what happened.
    if (testId) {
      try {
        await new Promise((res, rej) =>
          db.run('DELETE FROM users WHERE id = ?', [testId], (e) => (e ? rej(e) : res()))
        );
        const { c } = await get('SELECT COUNT(*) AS c FROM users WHERE id = ?', [testId]);
        if (c === 0) ok('cleanup confirmed: no leftover test row');
        else bad(`cleanup FAILED: ${c} row(s) still present for id=${testId}`);
      } catch (err) {
        bad(`cleanup error: ${err.message}`);
      }
    }
  }
}