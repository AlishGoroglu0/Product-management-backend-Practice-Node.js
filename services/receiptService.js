// services/receiptService.js
// Responsibility: business rules for receipts. No HTTP, no SQL.

import * as models from '../models/receiptModel.js';
import * as productModels from '../models/productModel.js';
import { DEFAULT_TAX_REGION } from '../config/taxConfig.js';

// --- Helpers ---------------------------------------------------------

const round2 = (n) => Math.round(n * 100) / 100;

const buildError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// --- Read operations -------------------------------------------------

export const getAllReceipts = async () => {
  return await models.getAllReceipts();
};

export const getReceiptById = async (id) => {
  const header = await models.getReceiptById(id);
  if (!header) throw buildError('Receipt not found', 404);

  const items = await models.getReceiptItems(id);

  const itemsWithTaxes = [];
  for (const item of items) {
    const taxes = await models.getReceiptItemTaxes(item.id);
    itemsWithTaxes.push({ ...item, taxes });
  }

  return { ...header, items: itemsWithTaxes };
};

// --- Write operations ------------------------------------------------

export const createReceipt = async ({ items, currency = 'TRY', region }) => {
  // 1. Basic shape check
  if (!Array.isArray(items) || items.length === 0) {
    throw buildError('items must be a non-empty array', 400);
  }

  // 2. Aggregate needed quantity per product (handles same product on multiple lines)
  const needed = {};
  for (const line of items) {
    if (!line.product_id || typeof line.product_id !== 'string') {
      throw buildError('each item needs a product_id', 400);
    }
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw buildError('each item needs quantity > 0 (integer)', 400);
    }
    needed[line.product_id] = (needed[line.product_id] || 0) + line.quantity;
  }

  // 3. Resolve taxes for the region
  const chosenRegion = region || DEFAULT_TAX_REGION;
  const taxDefs = await models.getTaxesByRegion(chosenRegion);
  if (taxDefs.length === 0) {
    throw buildError(`No tax rules configured for region "${chosenRegion}"`, 400);
  }

  // 4. Fetch every needed product once, and check stock
  const productCache = {};
  for (const [productId, qtyNeeded] of Object.entries(needed)) {
    const product = await productModels.getProductById(productId);
    if (!product) {
      throw buildError(`Product not found: ${productId}`, 404);
    }
    if (product.stock < qtyNeeded) {
      throw buildError(
        `Not enough stock for "${product.name}": need ${qtyNeeded}, have ${product.stock}`,
        400
      );
    }
    productCache[productId] = product;
  }

  // 5. Build line data using cached products
  const headerItems = [];
  const itemTaxes = [];
  let subtotal = 0;
  let totalTax = 0;

  for (const line of items) {
    const product = productCache[line.product_id];

    const unit_price = product.price;
    const line_net = round2(unit_price * line.quantity);

    let line_tax = 0;
    const taxesForThisItem = [];
    for (const tax of taxDefs) {
      const amount = round2(line_net * tax.rate);
      line_tax += amount;
      taxesForThisItem.push({
        tax_id: tax.id,
        rate_snapshot: tax.rate,
        amount,
      });
    }
    line_tax = round2(line_tax);

    headerItems.push({
      product_id: product.id,
      product_name: product.name,
      unit_price,
      quantity: line.quantity,
      line_net,
      line_tax,
    });
    itemTaxes.push(taxesForThisItem);

    subtotal += line_net;
    totalTax += line_tax;
  }

  subtotal = round2(subtotal);
  totalTax = round2(totalTax);
  const total = round2(subtotal + totalTax);

  // 6. Persist
const header = { currency, subtotal, total_tax: totalTax, total };
const stockChanges = Object.entries(needed).map(([product_id, quantity]) => ({
  product_id,
  quantity,
}));
const receipt_id = await models.createFullReceipt({
  header,
  items: headerItems,
  itemTaxes,
  stockChanges,
});

  return await getReceiptById(receipt_id);
};

export const voidReceipt = async (id) => {
  const existing = await models.getReceiptById(id);
  if (!existing) throw buildError('Receipt not found', 404);
  if (existing.status === 'void') return await getReceiptById(id);

  await models.voidReceipt(id);
  return await getReceiptById(id);
};

export const deleteReceipt = async (id) => {
  const existing = await models.getReceiptById(id);
  if (!existing) throw buildError('Receipt not found', 404);

  const shouldRestore = existing.status !== 'void';
  await models.deleteReceiptWithRestore(id, shouldRestore);

  return { deleted: true, id };
};