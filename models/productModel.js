// models/productModel.js
// Responsibility: talk to the DB. No HTTP, no business rules.

import { all, get, run } from '../db.js';   
import { randomUUID } from 'crypto';

// --- CRUD functions ---

// Get every product.
export const getAllProducts = () => all('SELECT * FROM products');

// Get one product by id (returns undefined if not found).
export const getProductById = (id) =>
  get('SELECT * FROM products WHERE id = ?', [id]);

// Insert a new product. Returns the new row's id.
export const createProduct = async ({ name, price, stock = 0, threshold = 5 }) => {
  const id = randomUUID();
  await run(
    'INSERT INTO products (id, name, price, stock, threshold) VALUES (?, ?, ?, ?, ?)',
    [id, name, price, stock, threshold]
  );
  return id;
};

// Update a product's fields. Returns number of rows changed.
export const updateProduct = async (id, { name, price, stock, threshold }) => {
  const { changes } = await run(
    'UPDATE products SET name = ?, price = ?, stock = ?, threshold = ? WHERE id = ?',
    [name, price, stock, threshold, id]
  );
  return changes;
};

// Delete a product. Returns number of rows deleted.
export const deleteProduct = async (id) => {
  const { changes } = await run('DELETE FROM products WHERE id = ?', [id]);
  return changes;
};
// Reduce stock atomically. Returns number of rows changed.
// 0 means the guard `stock >= qty` failed — not enough stock.
export const decrementStock = async (id, qty) => {
  const { changes } = await run(
    'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
    [qty, id, qty]
  );
  return changes;
};

// Add stock back. Used when voiding or deleting a receipt.
// No guard needed — we trust the caller.
export const incrementStock = async (id, qty) => {
  const { changes } = await run(
    'UPDATE products SET stock = stock + ? WHERE id = ?',
    [qty, id]
  );
  return changes;
};

// --- Image functions ---

// List all images for a product, ordered by sort_order.
export const getImagesByProduct = (productId) =>
  all(
    'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC',
    [productId]
  );

// Count images for a product (used to enforce the max-5 rule).
export const countImagesByProduct = async (productId) => {
  const row = await get(
    'SELECT COUNT(*) AS n FROM product_images WHERE product_id = ?',
    [productId]
  );
  return row.n;
};

// Get one image row by its id.
export const getImageById = (imageId) =>
  get('SELECT * FROM product_images WHERE id = ?', [imageId]);

// Insert a new image row. Returns the new row's id.
export const createImage = async ({ productId, filename, mime, sortOrder = 0 }) => {
  const id = randomUUID();
  await run(
    `INSERT INTO product_images (id, product_id, filename, mime, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, productId, filename, mime, sortOrder, new Date().toISOString()]
  );
  return id;
};

// Delete an image row. Returns number of rows deleted.
export const deleteImage = async (imageId) => {
  const { changes } = await run('DELETE FROM product_images WHERE id = ?', [imageId]);
  return changes;
};