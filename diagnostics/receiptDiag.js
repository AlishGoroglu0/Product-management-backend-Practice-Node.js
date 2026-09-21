// diagnostics/receiptDiag.js
// Receipt round-trip: create product → create receipt → verify totals →
// verify stock decrement → attempt oversell → void → verify restore →
// hard delete → verify gone. Cleans up at the DB level.

import { ok, bad, info, head, hit, get } from './_helpers.js';
import db from '../db.js';

export default async function runReceiptDiag() {
  head('Receipt round-trip');

  const productPayload = {
    name: 'Receipt Test Widget',
    price: 100,
    stock: 30,
    threshold: 1,
  };

  let productId = null;
  let receiptId = null;

  try {
    // --- Setup: create a throwaway product with stock 30 ---
    const createdProduct = await hit('POST', '/api/products', productPayload);
    if (createdProduct.status === 201 && createdProduct.data?.id) {
      productId = createdProduct.data.id;
      ok(`setup: product created id=${productId} (stock=30)`);
    } else {
      bad(`setup: POST /api/products → ${createdProduct.status}: ${JSON.stringify(createdProduct.data)}`);
      return;
    }

    // --- 1. Create receipt for 30 (consumes all stock) ---
    const receiptPayload = {
      region: 'TR',
      currency: 'TRY',
      items: [{ product_id: productId, quantity: 30 }],
    };
    const created = await hit('POST', '/api/receipts', receiptPayload);

    if (created.status !== 201 || !created.data?.id) {
      bad(`POST /api/receipts → ${created.status}: ${JSON.stringify(created.data)}`);
      return;
    }
    receiptId = created.data.id;
    ok(`POST /api/receipts → 201, id=${receiptId}`);

    // --- 2. Verify totals (30 × 100 = 3000 net, 20% VAT = 600 tax, 3600 total) ---
    const r = created.data;
    const expSubtotal = 3000, expTax = 600, expTotal = 3600;
    Number(r.subtotal)  === expSubtotal ? ok(`subtotal = ${r.subtotal}`)   : bad(`subtotal = ${r.subtotal} (expected ${expSubtotal})`);
    Number(r.total_tax) === expTax      ? ok(`total_tax = ${r.total_tax}`) : bad(`total_tax = ${r.total_tax} (expected ${expTax})`);
    Number(r.total)     === expTotal    ? ok(`total = ${r.total}`)         : bad(`total = ${r.total} (expected ${expTotal})`);

    // --- 3. Verify stock was decremented ---
    const afterCreate = await hit('GET', `/api/products/${productId}`);
    if (afterCreate.status === 200 && Number(afterCreate.data?.stock) === 0) {
      ok(`stock decremented to 0`);
    } else {
      bad(`stock after create = ${afterCreate.data?.stock} (expected 0)`);
    }

    // --- 4. Attempt oversell (should fail with 400) ---
    const oversell = await hit('POST', '/api/receipts', {
      region: 'TR',
      currency: 'TRY',
      items: [{ product_id: productId, quantity: 1 }],
    });
    if (oversell.status === 400) {
      ok(`oversell rejected with 400`);
    } else {
      bad(`oversell → ${oversell.status} (expected 400): ${JSON.stringify(oversell.data)}`);
    }

    // --- 5. Void receipt (should restore stock to 30) ---
    const voided = await hit('PATCH', `/api/receipts/${receiptId}/void`);
    if (voided.status === 200 && voided.data?.status === 'void') {
      ok(`PATCH /void → 200, status="void"`);
    } else {
      bad(`PATCH /void → ${voided.status}: ${JSON.stringify(voided.data)}`);
    }

    const afterVoid = await hit('GET', `/api/products/${productId}`);
    if (afterVoid.status === 200 && Number(afterVoid.data?.stock) === 30) {
      ok(`stock restored to 30 after void`);
    } else {
      bad(`stock after void = ${afterVoid.data?.stock} (expected 30)`);
    }

    // --- 6. Void again — should be a no-op, NOT double-restore stock ---
    const voidAgain = await hit('PATCH', `/api/receipts/${receiptId}/void`);
    const afterVoidAgain = await hit('GET', `/api/products/${productId}`);
    if (Number(afterVoidAgain.data?.stock) === 30) {
      ok(`second void did not double-restore stock (still 30)`);
    } else {
      bad(`second void changed stock to ${afterVoidAgain.data?.stock} (expected still 30)`);
    }

    // --- 7. Hard delete the void receipt — should NOT restore stock again ---
    const hardDeleted = await hit('DELETE', `/api/receipts/${receiptId}`);
    if (hardDeleted.status === 204) {
      ok(`DELETE → 204 (hard delete)`);
    } else {
      bad(`DELETE → ${hardDeleted.status}: ${JSON.stringify(hardDeleted.data)}`);
    }

    const afterDelete = await hit('GET', `/api/products/${productId}`);
    if (Number(afterDelete.data?.stock) === 30) {
      ok(`stock unchanged after deleting a void receipt (still 30)`);
    } else {
      bad(`stock after delete = ${afterDelete.data?.stock} (expected 30)`);
    }

    // --- 8. Confirm receipt is gone ---
    const gone = await hit('GET', `/api/receipts/${receiptId}`);
    if (gone.status === 404) {
      ok(`receipt gone after hard delete (404)`);
      receiptId = null;   // cleanup will skip it
    } else {
      bad(`expected 404, got ${gone.status}: ${JSON.stringify(gone.data)}`);
    }
  } catch (err) {
    bad(`round-trip threw: ${err.message}`);
  } finally {
    // Safety net: remove receipt + its children + the test product.
    if (receiptId) {
      try {
        await runSql('DELETE FROM receipt_item_taxes WHERE receipt_item_id IN (SELECT id FROM receipt_items WHERE receipt_id = ?)', [receiptId]);
        await runSql('DELETE FROM receipt_items WHERE receipt_id = ?', [receiptId]);
        await runSql('DELETE FROM receipts WHERE id = ?', [receiptId]);
        ok('cleanup: receipt removed');
      } catch (err) {
        bad(`cleanup error (receipt): ${err.message}`);
      }
    }

    if (productId) {
      try {
        await runSql('DELETE FROM products WHERE id = ?', [productId]);
        const { c } = await get('SELECT COUNT(*) AS c FROM products WHERE id = ?', [productId]);
        if (c === 0) ok('cleanup: product removed');
        else bad(`cleanup: product still present (${c})`);
      } catch (err) {
        bad(`cleanup error (product): ${err.message}`);
      }
    }
  }
}

// Local DB write helper — used only by the safety net.
function runSql(sql, params = []) {
  return new Promise((res, rej) => {
    db.run(sql, params, function (e) {
      if (e) rej(e); else res(this);
    });
  });
}