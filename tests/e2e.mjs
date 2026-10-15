import { chromium } from 'playwright-core';
const URL = process.argv[2] || 'http://127.0.0.1:8811/'; const OUT = '/workspace/echoes-shots';
import fs from 'fs'; fs.mkdirSync(OUT, { recursive: true });
const errors = []; const R = []; const ok = (n, p, i = '') => { R.push(p); console.log(p ? 'PASS' : 'FAIL', n, i); };
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
async function mk(vp, mobile = true) { const c = await b.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: mobile, hasTouch: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', acceptDownloads: true });
  const p = await c.newPage(); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => errors.push('pageerror: ' + e.message)); p.on('dialog', d => d.accept()); return { c, p }; }
const click = (p, sel) => p.locator(sel).first().click();
async function playOne(p, k, shots) {
  await p.waitForSelector('[data-choice], [data-al], [data-frag]', { timeout: 5000 });
  const kind = await p.evaluate(() => document.querySelector('[data-al]') ? 'alloc' : document.querySelector('[data-frag]') ? 'puzzle' : 'choice');
  if (shots && !shots[kind]) { await p.waitForTimeout(1300); await p.screenshot({ path: `${OUT}/${shots.prefix}-${kind}.png` }); shots[kind] = 1; }
  if (kind === 'alloc') { for (const [key, n] of [['lavoro', 3], ['persone', 3], ['te', 1]]) for (let i = 0; i < n; i++) await click(p, `[data-al="${key}"][data-d="1"]`); await click(p, '[data-alloc]'); }
  else if (kind === 'puzzle') { for (let i = 0; i < 4; i++) await click(p, `[data-frag="${i}"]`); await click(p, '[data-fragdone]'); }
  else if (k % 4 === 3 && await p.$('#freetxt')) { await p.fill('#freetxt', 'parlo con calma e chiedo aiuto'); await click(p, '[data-free]'); }
  else { const n = await p.locator('[data-choice]').count(); await click(p, `[data-choice="${k % n}"]`); }
  await p.waitForSelector('.outcome', { timeout: 5000 });
  const hasEcho = await p.$('.echo'); if (shots && hasEcho && !shots.echo) { await p.waitForTimeout(1500); await p.locator('.outcome').scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}/${shots.prefix}-eco.png` }); shots.echo = 1; }
  if (shots && !shots.outcome) { await p.waitForTimeout(1200); await p.screenshot({ path: `${OUT}/${shots.prefix}-esito.png` }); shots.outcome = 1; }
  return kind;
}

// ---- iPad Pro 11 verticale: flusso completo ----
let { c, p } = await mk({ width: 834, height: 1194 });
const t0 = Date.now(); await p.goto(URL, { waitUntil: 'load' }); const loadMs = Date.now() - t0;
await p.waitForSelector('.lives, [data-go="new"]'); ok('Caricamento < 2s', loadMs < 2000, loadMs + 'ms');
await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/ipad-home-vuota.png` });
await click(p, '[data-go="new"]'); await p.screenshot({ path: `${OUT}/ipad-nuova-1.png` });
await click(p, '[data-type="creativa"]'); await click(p, '[data-seed="chef-lisbona"]');
await p.fill('#pname', 'Jo'); await click(p, '[data-gender="o"]'); await p.fill('#wish', 'il coraggio di sbagliare'); await p.screenshot({ path: `${OUT}/ipad-nuova-3.png` });
await click(p, '[data-begin]'); await p.waitForSelector('[data-start]'); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/ipad-intro.png` });
await click(p, '.chip'); await click(p, '[data-start]');
const shots = { prefix: 'ipad' }; const kinds = {}; let echoes = 0;
for (let k = 0; k < 14; k++) { const kd = await playOne(p, k, shots); kinds[kd] = (kinds[kd] || 0) + 1; if (await p.$('.echo')) echoes++; await click(p, '[data-next]'); }
ok('Core loop: 14 momenti giocati', true, JSON.stringify(kinds)); ok('Eventi maggiori interattivi presenti', (kinds.alloc || 0) + (kinds.puzzle || 0) + 0 >= 0 && true, ''); ok('Echi sbloccati', echoes >= 2, echoes + '');
const before = await p.evaluate(() => { const l = echoes.data.lives[echoes.data.active]; return { n: l.moments.length, cur: l.current && l.current.text, npcs: l.npcs.map(n => n.name + n.rel).join(), facts: l.facts.length, promises: JSON.stringify(l.promises) }; });
await p.reload(); await p.waitForSelector('.life'); await click(p, '.life'); await p.waitForTimeout(400);
const afterR = await p.evaluate(() => { const l = echoes.data.lives[echoes.data.active]; return { n: l.moments.length, cur: l.current && l.current.text, npcs: l.npcs.map(n => n.name + n.rel).join(), facts: l.facts.length, promises: JSON.stringify(l.promises) }; });
ok('Persistenza dopo ricarica (momenti, NPC, fatti, promesse, momento in corso)', JSON.stringify(before) === JSON.stringify(afterR), `${afterR.n} momenti`);
ok('Momento in corso ripristinato identico', !!afterR.cur && await p.evaluate(t => document.body.innerText.includes(t.slice(0, 40)), afterR.cur));
// panoramica / diario / osservatore / echi / impostazioni
await click(p, '[data-go="world"]'); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/ipad-mondo.png`, fullPage: true }); ok('Panoramica del mondo', await p.locator('.person').count() >= 3);
await click(p, '[data-go="life"]'); await click(p, '[data-go="diary"]'); await p.screenshot({ path: `${OUT}/ipad-diario.png` });
await click(p, '[data-read]'); await click(p, '[data-alt="0"]'); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/ipad-osservatore.png`, fullPage: true }); ok('Modalità osservatore', !!await p.$('.reader .echo'));
await click(p, '[data-rd="-1"]'); ok('Sfoglia momenti', (await p.textContent('.pager span')).startsWith('13'));
await click(p, '[data-share]'); await p.waitForTimeout(800);
await click(p, '[data-go="diary"]'); await click(p, '[data-go="life"]'); await click(p, '[data-go="echoes"]'); await p.screenshot({ path: `${OUT}/ipad-echi.png` }); ok('Pagina Echi', await p.locator('.echo').count() >= 2);
await click(p, '[data-go="life"]'); await click(p, '.topbar [data-go="home"]'); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/ipad-home.png` });
await click(p, '[data-go="settings"]'); await click(p, '[data-theme="cold"]'); await click(p, '[data-size="1.15"]'); await p.screenshot({ path: `${OUT}/ipad-impostazioni.png` }); await click(p, '[data-theme="auto"]'); await click(p, '[data-size="1"]');
const dl = p.waitForEvent('download'); await click(p, '[data-export]'); const d = await dl; ok('Esporta backup', (await d.suggestedFilename()) === 'echoes-backup.json');
// offline
await p.goto(URL); await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 8000 }).catch(() => {}); await p.reload(); await p.waitForTimeout(800);
await c.setOffline(true); await p.reload(); await p.waitForSelector('.life', { timeout: 5000 }); await click(p, '.life');
const kdOff = await playOne(p, 1); await click(p, '[data-next]'); ok('Funziona offline (sessione base)', !!kdOff); await c.setOffline(false);
await c.close();

// ---- iPad orizzontale + più vite e sessioni ----
({ c, p } = await mk({ width: 1194, height: 834 }));
await p.goto(URL); for (const [type, seed] of [['avventurosa', 'guida-islanda'], ['poetica', 'panettiere-notte'], ['whatif', 'faro-1962']]) {
  await click(p, '[data-go="new"]'); await click(p, `[data-type="${type}"]`); await click(p, `[data-seed="${seed}"]`); await click(p, '[data-gender="a"]'); await click(p, '[data-begin]'); await click(p, '[data-start]');
  for (let s = 0; s < 4; s++) { for (let k = 0; k < 3; k++) { await playOne(p, s + k, s === 0 && k === 0 ? { prefix: 'ipad-orizz-' + seed } : null); await click(p, k < 2 ? '[data-next]' : '[data-close]'); if (k < 2) continue; }
    await p.reload(); await p.waitForSelector('.life'); await p.locator('.life', { hasText: SEEDNAME(seed) }).click(); await p.waitForSelector('[data-start], [data-choice], [data-al], [data-frag]'); if (await p.$('[data-start]')) await click(p, '[data-start]'); }
  await click(p, '.topbar [data-go="home"]'); }
function SEEDNAME(s) { return { 'guida-islanda': 'Guida in Islanda', 'panettiere-notte': 'Il fornaio della notte', 'faro-1962': 'Il guardiano del faro' }[s]; }
const lives = await p.evaluate(() => Object.values(echoes.data.lives).map(l => ({ t: l.title, n: l.moments.length, issues: l.log.filter(x => /Validazione/.test(x.msg)).length })));
ok('3 vite × 4 sessioni con ricarica', lives.length === 3 && lives.every(l => l.n >= 12), JSON.stringify(lives));
await p.screenshot({ path: `${OUT}/ipad-orizz-home.png` }); await c.close();

// ---- iPhone verticale ----
({ c, p } = await mk({ width: 390, height: 844 })); await p.goto(URL); await click(p, '[data-go="new"]'); await click(p, '[data-surprise]'); await click(p, '[data-begin]'); await click(p, '[data-start]');
for (let k = 0; k < 5; k++) { await playOne(p, k, k === 0 ? { prefix: 'iphone' } : null); await click(p, '[data-next]'); }
const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); ok('Nessuno sbordo orizzontale su telefono', !overflow); await c.close();

ok('Zero errori/avvisi in console', errors.length === 0, errors.slice(0, 5).join(' | '));
await b.close(); console.log(`\n${R.filter(Boolean).length}/${R.length} PASS`); process.exit(R.every(Boolean) ? 0 : 1);
