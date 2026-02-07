import fs from 'fs';
import path from 'path';

// Since node_modules are missing in this environment, we cannot use 'vite' package to resolve config.
// We fall back to robust regex checking of the file content.

const viteConfigPath = path.resolve('vite.config.ts');
const tauriConfigPath = path.resolve('src-tauri/tauri.conf.json');

console.log(`Checking ${viteConfigPath}...`);
const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');

// Check for strictPort: true with flexible whitespace
const strictPortRegex = /strictPort\s*:\s*true/;
if (!strictPortRegex.test(viteConfig)) {
  console.error('FAIL: vite.config.ts does not have strictPort: true');
  process.exit(1);
}

// Check for port: 1420 with flexible whitespace
const portRegex = /port\s*:\s*1420/;
if (!portRegex.test(viteConfig)) {
  console.error('FAIL: vite.config.ts does not have port: 1420');
  process.exit(1);
}

console.log(`Checking ${tauriConfigPath}...`);
const tauriConfig = fs.readFileSync(tauriConfigPath, 'utf-8');
let tauriJson;
try {
  tauriJson = JSON.parse(tauriConfig);
} catch (e) {
  console.error('FAIL: Could not parse tauri.conf.json');
  process.exit(1);
}

const devUrl = tauriJson.build?.devUrl;
if (devUrl !== 'http://localhost:1420') {
  console.error(`FAIL: tauri.conf.json devUrl is ${devUrl}, expected http://localhost:1420`);
  process.exit(1);
}

console.log('PASS: Configuration verified correctly (regex & JSON check).');
