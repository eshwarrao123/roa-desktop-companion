"use strict";
// Test: does the Electron runtime intercept require('electron')?
console.log("[test] process.type:", process.type);
console.log("[test] process.versions.electron:", process.versions.electron);

// The Electron runtime patches Module._resolveFilename to intercept 'electron'
// But if node_modules/electron exists, CJS resolution may find it first
// In Electron main process, process.type should be 'browser'
// In an Electron context, require('electron') should return the API

const Module = require('module');
const origResolve = Module._resolveFilename;
console.log("[test] Module._resolveFilename is patched:", origResolve.toString().includes('electron'));

const e = require("electron");
console.log("[test] electron type:", typeof e);
if (typeof e === 'object' && e.app) {
  console.log("[test] SUCCESS");
  e.app.quit();
} else {
  console.log("[test] FAIL - got:", String(e).substring(0, 100));
  process.exit(1);
}
