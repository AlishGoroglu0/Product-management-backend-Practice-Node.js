// diagnostics/index.js
// Registry of all diag modules. Call by name, or run all.
//
// Usage:
//   import { runDiag, runAllDiags, DIAG_NAMES } from './diagnostics/index.js';
//   await runDiag('receipt');                    // one
//   await runAllDiags();                         // all, in order
//   await runAllDiags(['server', 'receipt']);    // a subset

import runServerDiag  from './serverDiag.js';
import runProductDiag from './productDiag.js';
import runUserDiag    from './userDiag.js';
import runReceiptDiag from './receiptDiag.js';

// --- Registry --------------------------------------------------------
// Order here is the order runAllDiags() uses.
// Keys are short names you'll use from the console / server.js.

const REGISTRY = {
  server:  runServerDiag,
  product: runProductDiag,
  user:    runUserDiag,
  receipt: runReceiptDiag,
};

// --- Public API ------------------------------------------------------

export const DIAG_NAMES = Object.keys(REGISTRY);

// Run a single diag by short name.
export async function runDiag(name) {
  const fn = REGISTRY[name];
  if (!fn) {
    console.log(`  ❌ unknown diag: "${name}" (available: ${DIAG_NAMES.join(', ')})`);
    return;
  }
  await fn();
}

// Run several diags — or all, if no list is given.
export async function runAllDiags(which = DIAG_NAMES) {
  console.log('\n🧪 ============ LIVE DIAG START ============');

  for (const name of which) {
    if (!REGISTRY[name]) {
      console.log(`  ❌ skipping unknown: "${name}"`);
      continue;
    }
    await REGISTRY[name]();
  }

  console.log('🧪 ============ LIVE DIAG END ============\n');
}