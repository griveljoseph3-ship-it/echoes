import { chromium } from 'playwright-core'; import fs from 'fs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' }); const svg = fs.readFileSync('icons/icon.svg', 'utf8');
for (const s of [180, 192, 512]) { const src = s === 180 ? svg.replace('rx="112"', 'rx="0"') : svg; const p = await b.newPage({ viewport: { width: s, height: s } }); await p.setContent(`<style>body{margin:0}</style>${src.replace('<svg ', `<svg width="${s}" height="${s}" `)}`); await p.screenshot({ path: `icons/icon-${s}.png`, omitBackground: true }); }
await b.close();
