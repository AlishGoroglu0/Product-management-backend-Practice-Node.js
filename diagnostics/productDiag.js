// diagnostics/productDiag.js
// Product round-trip: create → read → delete, with guaranteed DB-level cleanup.
// Never throws — failures are logged but the function returns normally.

import { ok, bad, head, hit, get } from './_helpers.js';
import db from '../db.js';

export default async function runProductDiag() {
  head('Product round-trip');

  const payload = { name: 'Live Test Widget', price: 9.99, stock: 3, threshold: 1 };
  let testId = null;

  try {
    // 1. Create
    const created = await hit('POST', '/api/products', payload);
    if (created.status === 201 && created.data?.id) {
      testId = created.data.id;
      ok(`POST → 201, created id=${testId}`);
    } else {
      bad(`POST → ${created.status}: ${JSON.stringify(created.data)}`);
    }

    // 2. Read back
    if (testId) {
      const fetched = await hit('GET', `/api/products/${testId}`);
      if (fetched.status === 200 && fetched.data?.id === testId) {
        ok(`GET /:id → found "${testId}"`);
        if (fetched.data.name === payload.name && Number(fetched.data.price) === payload.price) {
          ok(`GET /:id → fields match (name, price)`);
        } else {
          bad(`GET /:id → field mismatch: ${JSON.stringify(fetched.data)}`);
        }
      } else {
        bad(`GET /:id → ${fetched.status}: ${JSON.stringify(fetched.data)}`);
      }

      // 3. Delete via API
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
}