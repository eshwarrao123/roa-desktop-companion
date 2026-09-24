// scripts/dev.cjs
// Ensures ELECTRON_RUN_AS_NODE is not inherited (e.g., from VS Code's terminal)
// which would cause Electron to run as a plain Node.js process.
delete process.env.ELECTRON_RUN_AS_NODE;

const { execSync } = require('child_process');
const path = require('path');

try {
  execSync('npx electron-vite dev', {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    env: process.env,
  });
} catch (e) {
  process.exit(e.status || 1);
}
