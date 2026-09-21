// models/receiptModel.js
// Responsibility: talk to the DB. No HTTP, no business rules.

import { all, get, run, transaction } from '../db.js';
import { randomUUID } from 'crypto';

// --- Receipt header --------------------------------------------------

export const createReceiptHeader = async ({
  currency,
  subtotal,
  total_tax,
  total,
  status = 'finalized',
}) => {
  const id = randomUUID();
  const created_at = new Date().toISOString();

  await run(
    `INSERT INTO receipts (id, created_at, currency, subtotal, total_tax, total, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, created_at, currency, subtotal, total_tax, total, status]
  );

  return id;
};

export const getReceiptById = (id) =>
  get('SELECT * FROM receipts WHERE id = ?', [id]);

export const getAllReceipts = () =>
  all('SELECT * FROM receipts ORDER BY created_at DESC');

export const updateReceiptStatus = async (id, status) => {
  const { changes } = await run(
    'UPDATE receipts SET status = ? WHERE id = ?',
    [status, id]
  );
  return changes;
};

// --- Receipt items ---------------------------------------------------

export const createReceiptItem = async ({
  receipt_id,
  product_id,
  product_name,
  unit_price,
  quantity,
  line_net,
  line_tax,
}) => {
  const id = randomUUID();
  await run(
    `INSERT INTO receipt_items
       (id, receipt_id, product_id, product_name, unit_price, quantity, line_net, line_tax)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, receipt_id, product_id, product_name, unit_price, quantity, line_net, line_tax]
  );
  return id;
};

export const getReceiptItems = (receipt_id) =>
  all('SELECT * FROM receipt_items WHERE receipt_id = ?', [receipt_id]);

// --- Receipt item taxes ----------------------------------------------

export const createReceiptItemTax = async ({
  receipt_item_id,
  tax_id,
  rate_snapshot,
  amount,
}) => {
  const id = randomUUID();
  await run(
    `INSERT INTO receipt_item_taxes
       (id, receipt_item_id, tax_id, rate_snapshot, amount)
     VALUES (?, ?, ?, ?, ?)`,
    [id, receipt_item_id, tax_id, rate_snapshot, amount]
  );
  return id;
};

export const getReceiptItemTaxes = (receipt_item_id) =>
  all('SELECT * FROM receipt_item_taxes WHERE receipt_item_id = ?', [receipt_item_id]);

// --- Tax definitions -------------------------------------------------

export const getTaxesByRegion = (region) =>
  all('SELECT * FROM taxes WHERE region = ?', [region]);

export const getTaxById = (id) =>
  get('SELECT * FROM taxes WHERE id = ?', [id]);

// --- Composite write (transactional) ---------------------------------
// Writes header + all items + all item taxes inside ONE transaction.
// If any insert throws, everything rolls back — no half-written receipts.

export const createFullReceipt = async ({ header, items, itemTaxes, stockChanges }) => {
  return transaction(async () => {
    const receipt_id = await createReceiptHeader(header);

    for (let i = 0; i < items.length; i++) {
      const item_id = await createReceiptItem({ ...items[i], receipt_id });

      const taxesForItem = itemTaxes[i];
      for (const tax of taxesForItem) {
        await createReceiptItemTax({ ...tax, receipt_item_id: item_id });
      }
    }

    // Apply stock decrements. If any fails, the whole transaction rolls back.
    for (const change of stockChanges) {
      const { changes } = await run(
        'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
        [change.quantity, change.product_id, change.quantity]
      );
      if (changes === 0) {
        const err = new Error(
          `Stock changed during receipt creation — not enough for product ${change.product_id}`
        );
        err.status = 409;
        throw err;
      }
    }

    return receipt_id;
  });
};

// Void a receipt + restore stock. All in one transaction.
export const voidReceipt = async (id) => {
  return transaction(async () => {
    const items = await getReceiptItems(id);
    for (const item of items) {
      if (!item.product_id) continue;
      await run(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }
    await run('UPDATE receipts SET status = ? WHERE id = ?', ['void', id]);
  });
};

// Delete a receipt. If `restoreStock` is true, add back the item quantities first.
export const deleteReceiptWithRestore = async (id, restoreStock) => {
  return transaction(async () => {
    if (restoreStock) {
      const items = await getReceiptItems(id);
      for (const item of items) {
        if (!item.product_id) continue;
        await run(
          'UPDATE products SET stock = stock + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
    }
    await run('DELETE FROM receipts WHERE id = ?', [id]);
  });
};
export const deleteReceiptById = async (id) => {
  const { changes } = await run('DELETE FROM receipts WHERE id = ?', [id]);
  return changes;   // 0 = not found, 1 = deleted
};