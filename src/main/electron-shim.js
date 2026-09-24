// Electron built-in modules shim for main process
// Uses Module._load to bypass the npm package's index.js and get the real Electron built-ins

const Module = require('module');

console.log('[electron-shim] Attempting to load electron built-in...');

// Clear any cached electron module from npm package
const electronPkgPath = Module._resolveFilename('electron', module, false);
console.log('[electron-shim] electron package path:', electronPkgPath);
if (require.cache[electronPkgPath]) {
  console.log('[electron-shim] Deleting cached electron package');
  delete require.cache[electronPkgPath];
}

// Use Module._load with isMain=false to get the built-in electron module
// This bypasses the npm package's index.js which returns the executable path
const electron = Module._load('electron', module, false);

console.log('[electron-shim] Loaded electron:', typeof electron, electron ? Object.keys(electron) : 'null/undefined');

module.exports = electron;