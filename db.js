// db.js
// Single responsibility: open the sqlite3 connection and initialize the schema.

import sqlite3 from 'sqlite3';
import { TAX_PRESETS } from './config/taxConfig.js';
import { randomUUID } from 'crypto';

// --- 1. Schema definitions --------------------------------------------
const SCHEMA = [
  {
    name: 'products',
    sql: `
      CREATE TABLE IF NOT EXISTS products (
        id        TEXT    PRIMARY KEY,
        name      TEXT    NOT NULL,
        price     REAL    NOT NULL,
        stock     INTEGER NOT NULL DEFAULT 0,
        threshold INTEGER NOT NULL DEFAULT 5
      )
    `,
  },
  {
    name: 'users',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id         TEXT    PRIMARY KEY,
        name       TEXT    NOT NULL,
        authName   TEXT    NOT NULL,
        canEdit    INTEGER NOT NULL DEFAULT 0,
        canCreate  INTEGER NOT NULL DEFAULT 0,
        canDelete  INTEGER NOT NULL DEFAULT 0
      )
    `,
  },
  {
    name: 'taxes',
    sql: `
      CREATE TABLE IF NOT EXISTS taxes (
        id     TEXT PRIMARY KEY,
        name   TEXT NOT NULL,
        rate   REAL NOT NULL,
        region TEXT NOT NULL
      )
    `,
  },
  {
    name: 'receipts',
    sql: `
      CREATE TABLE IF NOT EXISTS receipts (
        id         TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        currency   TEXT NOT NULL DEFAULT 'TRY',
        subtotal   REAL NOT NULL DEFAULT 0,
        total_tax  REAL NOT NULL DEFAULT 0,
        total      REAL NOT NULL DEFAULT 0,
        status     TEXT NOT NULL DEFAULT 'finalized'
      )
    `,
  },
  {
    name: 'receipt_items',
    sql: `
      CREATE TABLE IF NOT EXISTS receipt_items (
        id           TEXT PRIMARY KEY,
        receipt_id   TEXT NOT NULL,
        product_id   TEXT,
        product_name TEXT NOT NULL,
        unit_price   REAL NOT NULL,
        quantity     INTEGER NOT NULL,
        line_net     REAL NOT NULL,
        line_tax     REAL NOT NULL,
        FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      )
    `,
  },
  {
    name: 'receipt_item_taxes',
    sql: `
      CREATE TABLE IF NOT EXISTS receipt_item_taxes (
        id              TEXT PRIMARY KEY,
        receipt_item_id TEXT NOT NULL,
        tax_id          TEXT NOT NULL,
        rate_snapshot   REAL NOT NULL,
        amount          REAL NOT NULL,
        FOREIGN KEY (receipt_item_id) REFERENCES receipt_items(id) ON DELETE CASCADE,
        FOREIGN KEY (tax_id)          REFERENCES taxes(id)
      )
    `,
  },
    {
    name: 'product_images',
    sql: `
      CREATE TABLE IF NOT EXISTS product_images (
        id         TEXT    PRIMARY KEY,
        product_id TEXT    NOT NULL,
        filename   TEXT    NOT NULL,
        mime       TEXT    NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT    NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `,
  },
];

// --- 2. Promise wrappers around sqlite3 callbacks ---------------------
export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

// --- 3. Open the connection (wrapped in a promise so we can await) ----
const db = await new Promise((resolve, reject) => {
  const conn = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
      console.error('❌ Failed to open database:', err.message);
      return reject(err);
    }
    console.log('✅ Connected to SQLite database.');
    resolve(conn);
  });
});

// --- 4. Enable sane defaults -----------------------------------------
await run('PRAGMA foreign_keys = ON');
await run('PRAGMA journal_mode = WAL');

// --- 5. Initialize schema before the module finishes loading ---------
for (const { name, sql } of SCHEMA) {
  try {
    await run(sql);
    console.log(`✅ table ready: ${name}`);
  } catch (err) {
    console.error(`❌ failed to create table "${name}":`, err.message);
    throw err;
  }
}

// --- 5b. Seed taxes if the table is empty -----------------------------
const taxCount = await new Promise((resolve, reject) => {
  db.get('SELECT COUNT(*) AS n FROM taxes', (err, row) => {
    if (err) reject(err); else resolve(row.n);
  });
});

if (taxCount === 0) {
  for (const [region, list] of Object.entries(TAX_PRESETS)) {
    for (const tax of list) {
      await run(
        'INSERT INTO taxes (id, name, rate, region) VALUES (?, ?, ?, ?)',
        [randomUUID(), tax.name, tax.rate, region]
      );
    }
  }
  console.log('✅ taxes seeded');
} else {
  console.log(`✅ taxes already present (${taxCount} rows)`);
}

// --- 2b. Transaction helper ------------------------------------------
export async function transaction(fn) {
  await run('BEGIN');
  try {
    const result = await fn();
    await run('COMMIT');
    return result;
  } catch (err) {
    await run('ROLLBACK');
    throw err;
  }
}

// --- 6. Export the connection ----------------------------------------
export default db;