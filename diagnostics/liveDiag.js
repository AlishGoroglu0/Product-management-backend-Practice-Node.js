// livediag.js
// Thin shim: re-exports the diagnostics registry under the old name.
// Keeps server.js's `import { runLiveTest } from './livediag.js'` working.

export { runAllDiags as runLiveTest } from './diagnostics/index.js';