// ECHOES — Motore del Narratore offline + Stato del Mondo.
import { NAMES, LOOKS, TRAITS, TYPES, PALETTES, SEEDS, PARTS, LIGHT, SEASON_LINES, FESTIVE, INPUT_THEMES, EPILOGUES, ECHO_LINES } from './content.js';
import { SITUATIONS, MAJORS } from './situations.js';

export const VERSION = 1;
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];

// RNG deterministico salvato nello stato (stessa vita = stessa coerenza dopo un ricaricamento)
function rnd(st) { let t = (st.rs = (st.rs + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const pickFrom = (st, arr) => arr[Math.floor(rnd(st) * arr.length)];

export function seasonOf(d = new Date()) { const m = d.getMonth(); return m < 2 || m === 11 ? 'inverno' : m < 5 ? 'primavera' : m < 8 ? 'estate' : 'autunno'; }
export function partOfHour(h) { return h < 12 ? 'mattina' : h < 18 ? 'pomeriggio' : h < 22 ? 'sera' : 'notte'; }

// Preposizioni articolate: "a il mercato" -> "al mercato"
const PREP = { a: { il: 'al', lo: 'allo', la: 'alla', "l'": "all'", i: 'ai', gli: 'agli', le: 'alle' }, di: { il: 'del', lo: 'dello', la: 'della', "l'": "dell'", i: 'dei', gli: 'degli', le: 'delle' }, in: { il: 'nel', lo: 'nello', la: 'nella', "l'": "nell'", i: 'nei', gli: 'negli', le: 'nelle' }, da: { il: 'dal', lo: 'dallo', la: 'dalla', "l'": "dall'", i: 'dai', gli: 'dagli', le: 'dalle' }, su: { il: 'sul', lo: 'sullo', la: 'sulla', "l'": "sull'", i: 'sui', gli: 'sugli', le: 'sulle' } };
export function fixPrep(t) {
  if (typeof t !== 'string') return t;
  return t.replace(/(^|[^\p{L}'])(a|A|di|Di|in|In|da|Da|su|Su) (?:(il|lo|la|i|gli|le) |(l'))/gu, (m, pre, p, art, ap) => {
    const a = art || ap; const low = p.toLowerCase(); let r = PREP[low][a]; if (p[0] !== low[0]) r = cap(r);
    return pre + r + (ap ? '' : ' ');
  });
}
function deepFix(o) { if (typeof o === 'string') return fixPrep(o); if (Array.isArray(o)) return o.map(deepFix); if (o && typeof o === 'object') { const r = {}; for (const k in o) r[k] = deepFix(o[k]); return r; } return o; }

// ---------- Creazione di una Vita ----------
export function createLife({ seedId, playerName = '', g = 'o', wish = '', now = Date.now(), seed } = {}) {
  const s = SEEDS.find(x => x.id === seedId) || SEEDS[0];
  const st = { v: VERSION, id: 'v' + now.toString(36) + Math.floor(Math.random() * 1e4).toString(36), rs: seed ?? (now & 0x7fffffff),
    seedId: s.id, type: s.type, typeLabel: TYPES[s.type].label, hue: TYPES[s.type].hue, title: s.title, city: s.city, names: s.names, art: s.art, nucleus: s.nucleus.slice(),
    player: { name: playerName.trim().slice(0, 24), g: g === 'a' ? 'a' : 'o' }, wish: wish.trim().slice(0, 140),
    divergence: s.divergence, divergenceShort: shortDiv(s), work: { ...s.work }, places: s.places.slice(), sensory: s.sensory.slice(),
    npcs: [], object: s.object ? { ...s.object, gone: false } : null, facts: [], promises: [], fails: [], successes: [],
    stats: { skill: 2, res: 1, mood: 0, impact: 0 }, flags: {}, moments: [], echoes: [], day: 1, part: partOfHour(new Date(now).getHours()),
    nextMajorAt: 3 + Math.floor(Math.random() * 3), recent: {}, current: null, log: [], created: now, updated: now, sessions: 0, playMs: 0 };
  s.cast.forEach((p, i) => st.npcs.push(makeNpc(st, { ...p, id: 'n' + i })));
  s.facts.forEach(f => addFact(st, f));
  for (const p of s.cast) if (p.promise) { const n = st.npcs.find(x => x.name === p.name); st.promises.push({ id: 'p' + st.promises.length, by: n.id, to: 'tu', text: p.promise, made: 0, due: 3, status: 'aperta' }); }
  log(st, `Vita creata: ${s.title}`);
  return st;
}
function shortDiv(s) { return { 'chef-lisbona': 'quel sì detto a una cucina di Lisbona', 'pittrice-trieste': 'quel treno preso con una valigia di tele', 'musicista-berlino': 'quel furgone partito per Berlino', 'fratello-paese': 'quella volta che sei rimasto per tuo fratello', 'guida-islanda': 'quel biglietto di sola andata per l\'Islanda', 'marinaio-patagonia': 'quella nave salpata da Genova', 'ricercatrice': 'quel dottorato che hai scelto al posto dello stipendio', 'startup-torino': 'quel contratto in banca strappato', 'postino-isola': 'quella domanda spedita per un\'isola', 'panettiere-notte': 'quel "insegnami" detto a un vecchio fornaio', 'faro-1962': 'quel faro accettato su un\'isola', 'citta-sogni': 'quella città dove i ricordi si regalano' }[s.id] || 'la scelta diversa'; }
function makeNpc(st, p) {
  const tr = TRAITS[Math.floor(rnd(st) * TRAITS.length)];
  return { id: p.id, role: p.role, name: p.name, g: p.g, job: p.job, story: p.story, look: p.look || pickFrom(st, LOOKS.filter(l => !st.npcs.some(n => n.look === l)).concat(st.npcs.length >= LOOKS.length ? LOOKS : [])), trait: tr, rel: p.role === 'lontano' ? 0 : 1, memories: [], gone: false, fixed: !!p.fixed, met: p.role !== 'nuovo' ? 0 : -1, seen: -9 };
}
const NEW_JOBS = [ ['una donna che ripara orologi', 'f', 'ha smesso di portarne uno il giorno in cui ha capito che il tempo non si aggiusta'], ['un ragazzo che vende fiori all\'angolo', 'm', 'mette da parte ogni moneta per un viaggio di cui non parla'], ['un\'insegnante di danza in pensione', 'f', 'balla ancora ogni sera, da sola, in cucina'], ['un tassista notturno', 'm', 'conosce i segreti di metà città e non ne ha mai detto uno'], ['una fotografa di passaggio', 'f', 'fotografa solo le cose che stanno per sparire'], ['un vecchio che gioca a scacchi da solo', 'm', 'aspetta da anni l\'avversario giusto'], ['una studentessa di architettura', 'f', 'disegna le case come vorrebbe che fossero, non come sono'], ['un medico in pensione', 'm', 'ha salvato centinaia di persone e non si perdona l\'unica che ha perso'] ];

// ---------- Contesto per i template ----------
function ctx(st) {
  const c = { st, w: st.work, o: st.player.g, _place: null, _new: null, lastPlace: null };
  c.pick = arr => pickFrom(st, arr);
  c.npc = id => st.npcs.find(n => n.id === id || n.role === id);
  c.n = role => role === 'nuovo' ? c._new : st.npcs.find(n => n.role === role && !n.gone);
  c.place = () => c._place || (c._place = c.pick(st.places));
  c.placeShort = (mark) => { if (mark) { const opts = st.places.filter(x => x !== c._place); return (c.lastPlace = c.pick(opts)); } return c.place(); };
  c.ol = () => st.object && st.object.g === 'f' ? 'la' : 'lo'; c.oe = () => st.object && st.object.g === 'f' ? 'a' : 'o';
  c.home = () => (c._place = 'casa');
  c._usedS = new Set(); c.sense = (capd) => { let pool = st.sensory.filter(x => !c._usedS.has(x)); if (!pool.length) pool = st.sensory; const s = c.pick(pool); c._usedS.add(s); return capd ? cap(s) : s; };
  c.light = () => c.pick(LIGHT[st.part]);
  c.since = m => Math.max(1, st.moments.length - m);
  c.duePromise = () => st.promises.find(p => p.by === 'tu' && p.status === 'aperta' && p.due <= st.moments.length && c.npc(p.to) && !c.npc(p.to).gone);
  c.lastFail = () => { const f = st.fails.filter(x => !x.cleared).slice(-1)[0]; return f ? f.text : null; };
  c.bestFriend = () => st.npcs.filter(n => !n.gone && n.role !== 'critico').sort((a, b) => b.rel - a.rel)[0] || st.npcs.find(n => !n.gone);
  c.bestFriendName = () => c.bestFriend()?.name || 'qualcuno';
  c.bestFriendRole = () => c.bestFriend()?.role || 'amico';
  c.metNew = () => st.npcs.find(n => n.role.startsWith('nuovo') && !n.gone && n.met >= 0 && st.moments.length - n.seen >= 2);
  c.newNpc = () => {
    const used = new Set(st.npcs.map(n => n.name)); const pool = NAMES[st.names] || NAMES.it;
    const opts = NEW_JOBS.filter(j => !st.npcs.some(n => n.job === j[0])); const j = opts.length ? c.pick(opts) : c.pick(NEW_JOBS);
    const names = pool[j[1]].filter(n => !used.has(n)); const name = names.length ? c.pick(names) : c.pick(NAMES.it[j[1]].filter(n => !used.has(n)));
    const k = st.npcs.filter(n => n.role.startsWith('nuovo')).length + 1;
    c._new = makeNpc(st, { id: 'n' + st.npcs.length, role: 'nuovo' + k, name, g: j[1], job: j[0], story: j[2] });
    return c._new;
  };
  return c;
}

// ---------- Utility di stato ----------
function addFact(st, text) { if (!text) return; if (st.facts.some(f => f.text === text)) return; st.facts.push({ m: st.moments.length, text }); }
function log(st, msg) { st.log.push({ t: Date.now(), m: st.moments.length, msg }); if (st.log.length > 300) st.log.splice(0, st.log.length - 300); }
function advancePart(st, force) {
  if (force) { if (PARTS.indexOf(force) < PARTS.indexOf(st.part)) st.day++; st.part = force; return; }
  const i = PARTS.indexOf(st.part); if (i >= PARTS.length - 1) { st.part = 'mattina'; st.day++; } else st.part = PARTS[i + 1];
}
export function tone(st) { return st.stats.mood >= 2 ? 'alto' : st.stats.mood <= -2 ? 'basso' : 'medio'; }

function intro(st, c, input, sit) {
  const lines = []; const d = new Date(); const key = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  if (st.moments.length === 0) lines.push(st.divergence);
  if (FESTIVE[key] && !st.flags['fest' + key + d.getFullYear()]) { lines.push(FESTIVE[key]); st.flags['fest' + key + d.getFullYear()] = 1; }
  else if (st.moments.length % 6 === 1) lines.push(c.pick(SEASON_LINES[seasonOf(d)]));
  if (input) { const th = INPUT_THEMES.find(t => t.re.test(input)); lines.push(th ? th.line : `Oggi ti porti dentro un pensiero: «${input.slice(0, 80)}». Anche qui, in qualche modo, ti segue.`); }
  // richiamo alla memoria: un successo passato (mai su NPC scomparsi)
  if (!input && st.successes.length && rnd(st) < 0.3 && sit.sitId !== 'promessa') { const s = st.successes[st.successes.length - 1]; if (!st.npcs.some(n => n.gone && s.text.includes(n.name))) lines.push(`Ti torna in mente che ${s.text}, e ti dà coraggio.`); }
  return lines.join(' ');
}

// ---------- Generazione del Momento (Passo 2) ----------
export function nextMoment(st, input = '') {
  if (st.current) return st.current;
  const c = ctx(st);
  const isMajor = st.moments.length >= st.nextMajorAt;
  let m;
  if (isMajor) {
    const used = st.moments.filter(x => x.major).map(x => x.sitId);
    let pool = MAJORS.filter(M => M.req(c));
    const fresh = pool.filter(M => !used.slice(-2).includes(M.id)); if (fresh.length) pool = fresh;
    const pref = pool.find(M => M.id === 'crocevia'); const M = pref && rnd(st) < 0.6 ? pref : pool[Math.floor(rnd(st) * pool.length)];
    const b = M.build(c);
    m = { major: true, kind: M.id === 'risorse' ? 'risorse' : M.id === 'puzzle' ? 'puzzle' : 'scelta', sitId: M.id, title: b.title, text: b.text, place: c._place || st.work.placeName,
      choices: (b.choices || []).map(ch => ({ label: ch.label, hint: ch.hint, tag: ch.tag, res: ch.res })), alloc: b.alloc || null, puzzle: b.puzzle ? { pieces: b.puzzle.pieces, order: shuffle(st, b.puzzle.pieces.map((_, i) => i)) } : null, onDone: b.onDone || null };
  } else {
    const due = c.duePromise();
    let pool = SITUATIONS.filter(S => { try { return S.req(c) && (st.recent[S.id] === undefined || st.moments.length - st.recent[S.id] > S.cool); } catch { return false; } });
    if (due) pool = pool.filter(S => S.id === 'promessa');
    if (!pool.length) pool = SITUATIONS.filter(S => S.id === 'opera' || S.id === 'gioia');
    const th = input ? INPUT_THEMES.find(t => t.re.test(input)) : null;
    const weight = S => S.w * (th && ((th.tag === 'relazione' && /aiuto|lontano|incontro|ritorno/.test(S.id)) || (th.tag === 'lavoro' && /opera|critico|soldi/.test(S.id)) || (th.tag === 'creazione' && /opera|gioia/.test(S.id)) || (th.tag === 'sé' && /notte|fallimento/.test(S.id)) || (th.tag === 'avventura' && /incontro|notte|gioia/.test(S.id))) ? 3 : 1);
    const tot = pool.reduce((a, S) => a + weight(S), 0); let r = rnd(st) * tot; let S = pool[0];
    for (const x of pool) { r -= weight(x); if (r <= 0) { S = x; break; } }
    const b = S.build(c);
    if (b.forcePart) advancePart(st, b.forcePart);
    m = { major: false, sitId: S.id, text: b.text, place: b.place || c._place || st.work.placeName, choices: b.choices.map(ch => ({ label: ch.label, hint: ch.hint, tag: ch.tag, npc: ch.npc, bonus: ch.bonus || 0, ok: ch.ok, ko: ch.ko })),
      npcs: b.npcs || [], newNpc: b.newNpc || null, onShow: b.onShow || null, keepPromiseOf: b.keepPromiseOf || null, promiseId: b.promiseId || null };
  }
  m.pre = intro(st, c, input, m);
  if (!m.major && m.sitId !== 'notte') { const pl = m.place === 'casa' ? 'Casa' : cap(m.place); m.scene = `${pl}, ${st.part === 'notte' ? 'di notte' : 'di ' + st.part}. ${c.light()} ${cap(c.sense())}.`; } else m.scene = '';
  m.input = input || '';
  m.day = st.day; m.part = st.part; m.i = st.moments.length; m.imagePrompt = imagePrompt(st, m);
  m = deepFix(m);
  // Coerenza: un momento non deve mai citare persone uscite dalla tua vita
  const goneNames = st.npcs.filter(n => n.gone).map(n => n.name);
  if (goneNames.some(nm => (m.pre + m.text).includes(nm))) { log(st, `Rigenerato ${m.sitId}: citava una persona assente`); st.recent[m.sitId] = st.moments.length; return nextMoment(st, input); }
  st.current = m; st.updated = Date.now();
  log(st, `Momento ${m.i + 1} generato: ${m.sitId}${m.major ? ' (Evento Maggiore)' : ''}`);
  return m;
}
function shuffle(st, a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } if (a.every((v, i) => v === i)) [a[0], a[1]] = [a[1], a[0]]; return a; }
function imagePrompt(st, m) { return `Illustrazione ad acquerello delicato, atmosfera intima e poetica, ${st.city}, ${m.place}, ${m.part}, palette ${st.hue}, nessun testo, nessun volto in primo piano.`; }

// ---------- Risoluzione (Passo 4) ----------
const FREE_TAGS = [ ['relazione', /parl|chied|abbracc|aiut|chiam|insieme|scriv[io] a|dir[eg]l|ascolt|bacia|ringrazi/i], ['rischio', /rischi|prov|osa|nuov|tutto|subito|scapp|corr|accett|mostr/i], ['sicuro', /aspett|prudent|classic|calma|niente|normale|solito|lavor/i], ['sé', /pens|scriv|da sol|cammin|riflet|dorm|no\b|rifiut|lasci/i] ];
export function classifyFree(text, choices) { for (const [tag, re] of FREE_TAGS) { if (re.test(text)) { const i = choices.findIndex(c => c.tag === tag); if (i >= 0) return i; } } return 0; }

function odds(st, ch) {
  const base = ch.tag === 'rischio' ? 0.47 : ch.tag === 'sicuro' ? 0.78 : 0.62;
  const npc = ch.npc ? st.npcs.find(n => n.role === ch.npc) : null;
  return clamp(base + st.stats.skill * 0.02 + st.stats.mood * 0.02 + (npc ? npc.rel * 0.035 : 0) + (ch.bonus || 0) * 0.1, 0.15, 0.93);
}

export function resolve(st, { choice = 0, free = '', alloc = null, order = null } = {}) {
  const m = st.current; if (!m) throw new Error('Nessun momento in corso');
  const c = ctx(st); let out, ok = true, chosenLabel, idx = -1;
  if (m.newNpc && !st.npcs.some(n => n.id === m.newNpc.id)) { const n = { ...m.newNpc, met: st.moments.length }; st.npcs.push(n); }
  if (m.onShow) st.flags[m.onShow] = 1;
  if (m.keepPromiseOf) { const k = c.n(m.keepPromiseOf); const p = k && st.promises.find(p => p.by === k.id && p.status === 'aperta'); if (p) { p.status = 'mantenuta'; log(st, `${k.name} ha mantenuto la promessa`); } }
  if (m.major) {
    const M = MAJORS.find(x => x.id === m.sitId); const save = st.rs; const b = M.build(c); st.rs = save;
    if (m.kind === 'risorse') { const a = sanitizeAlloc(alloc, m.alloc); out = b.resolve(a); chosenLabel = `Lavoro ${a.lavoro} · Persone ${a.persone} · Te ${a.te}`; }
    else if (m.kind === 'puzzle') { ok = Array.isArray(order) && order.every((v, i) => v === i); out = b.resolve(ok); chosenLabel = ok ? 'Ricomposto' : 'Non ricomposto'; }
    else { const ch = m.choices[clamp(choice | 0, 0, m.choices.length - 1)]; out = ch.res; chosenLabel = ch.label; }
    if (m.onDone) st.flags[m.onDone] = 1;
  } else {
    idx = clamp(choice | 0, 0, m.choices.length - 1); if (free) idx = classifyFree(free, m.choices);
    const ch = m.choices[idx]; chosenLabel = free ? `«${free.slice(0, 120)}»` : ch.label;
    ok = rnd(st) < odds(st, ch); out = ok ? ch.ok : ch.ko;
    if (free) out = { ...out, text: `Fai a modo tuo: «${free.slice(0, 120)}». ` + out.text };
  }
  apply(st, out, m);
  const ep = pickFrom(st, EPILOGUES[tone(st)]);
  const rec = { i: m.i, day: m.day, part: m.part, sitId: m.sitId, major: m.major, title: m.title || null, place: m.place, pre: m.pre, text: m.text, input: m.input,
    choices: m.choices.map(x => x.label), chosen: chosenLabel, free: !!free, ok, outcome: fixPrep(out.text), epilogue: ep, ts: Date.now(), imagePrompt: m.imagePrompt, mood: st.stats.mood,
    alts: m.major ? (m.choices || []).filter(x => x.label !== chosenLabel).map(x => ({ label: x.label, text: fixPrep(x.res?.text || '') })) : m.choices.map((x, j) => j === idx ? null : { label: x.label, text: x.ok?.text || '' }).filter(Boolean) };
  st.moments.push(rec); st.recent[m.sitId] = rec.i;
  (m.npcs || []).forEach(id => { const n = c.npc(id); if (n) n.seen = rec.i; }); if (m.newNpc) { const n = c.npc(m.newNpc.id); if (n) n.seen = rec.i; }
  if (m.major) st.nextMajorAt = st.moments.length + 3 + Math.floor(rnd(st) * 3);
  st.current = null; if (!m.major || true) advancePart(st);
  // Echi ai traguardi
  let echo = null; const milestone = m.major || out.echoBoost || [1, 6, 12, 20, 30, 45].includes(st.moments.length) || (out.keep && st.promises.filter(p => p.status === 'mantenuta' && p.by === 'tu').length === 1);
  if (milestone) echo = makeEcho(st, rec);
  log(st, `Scelta: ${chosenLabel} → ${ok ? 'riuscita' : 'non riuscita'}`);
  st.updated = Date.now();
  return { record: rec, echo, ok };
}
function sanitizeAlloc(a, spec) { const r = { lavoro: 0, persone: 0, te: 0 }; let tot = 0; for (const k of Object.keys(r)) { r[k] = clamp((a && a[k]) | 0, 0, spec.total); tot += r[k]; } while (tot > spec.total) { const k = Object.keys(r).sort((x, y) => r[y] - r[x])[0]; r[k]--; tot--; } return r; }

function apply(st, out, m) {
  const e = out.eff || {}; const roleMap = r => r === 'nuovo' && m.newNpc ? m.newNpc.role : r;
  for (const k of ['skill', 'res', 'mood', 'impact']) if (e[k]) st.stats[k] = clamp(st.stats[k] + e[k], k === 'res' ? -5 : k === 'mood' ? -6 : 0, k === 'mood' ? 6 : 20);
  for (const [r, v] of Object.entries(e.rel || {})) { const n = st.npcs.find(x => x.role === roleMap(r) && !x.gone); if (n) n.rel = clamp(n.rel + v, -6, 10); }
  for (const [r, t] of Object.entries(out.mem || {})) { const n = st.npcs.find(x => x.role === roleMap(r) && !x.gone); if (n) { n.memories.push({ m: st.moments.length, text: fixPrep(t) }); if (n.memories.length > 40) n.memories.shift(); } }
  if (out.fact) addFact(st, fixPrep(out.fact));
  if (out.flag) st.flags[out.flag] = 1;
  if (out.success) st.successes.push({ m: st.moments.length, text: fixPrep(out.success) });
  if (out.fail) st.fails.push({ m: st.moments.length, text: fixPrep(out.fail), cleared: false });
  if (out.clearFail) { const f = st.fails.filter(x => !x.cleared).slice(-1)[0]; if (f) f.cleared = true; }
  if (out.promise) { const n = st.npcs.find(x => x.role === roleMap(out.promise.to) && !x.gone); if (n && !st.promises.some(p => p.by === 'tu' && p.to === n.id && p.status === 'aperta')) st.promises.push({ id: 'p' + st.promises.length, by: 'tu', to: n.id, text: fixPrep(out.promise.text), made: st.moments.length, due: st.moments.length + 1 + out.promise.due, status: 'aperta' }); }
  const P = id => st.promises.find(p => p.id === id);
  if (out.keep && P(out.keep)) P(out.keep).status = 'mantenuta';
  if (out.brk && P(out.brk)) P(out.brk).status = 'rotta';
  if (out.delay && P(out.delay)) { const p = P(out.delay); p.delays = (p.delays || 0) + 1; p.due = st.moments.length + 3; if (p.delays >= 2) { p.status = 'rotta'; addFact(st, `Hai lasciato scadere la promessa: ${p.text}`); } }
  if (out.objectGone && st.object && !st.object.gone) { st.object.gone = true; st.object.fate = out.objectGone; addFact(st, `${cap(st.object.name)}: ${out.objectGone}`); }
  // Chi viene ferito troppo esce dalla tua vita (mai i legami fissi)
  for (const n of st.npcs) if (!n.gone && !n.fixed && n.rel <= -5) { n.gone = true; addFact(st, `${n.name} si è allontanat${n.g === 'f' ? 'a' : 'o'} dalla tua vita`); st.promises.forEach(p => { if (p.status === 'aperta' && (p.to === n.id || p.by === n.id)) p.status = 'sospesa'; }); log(st, `${n.name} è uscito dalla storia`); }
}

function makeEcho(st, rec) {
  const live = st.npcs.filter(n => !n.gone);
  const s = { ol: st.object && st.object.g === 'f' ? 'la' : 'lo', city: st.city, sense: pickFrom(st, st.sensory), obj: st.object ? st.object.name : 'una fotografia', npc: (pickFrom(st, live) || st.npcs[0]).name, place: pickFrom(st, st.places), did: (rec.chosen || '').replace(/^«|»$/g, '').toLowerCase().replace(/^(.)/, x => x) };
  const used = st.echoes.map(e => e.tpl); let idx = ECHO_LINES.findIndex((_, i) => !used.includes(i)); if (idx < 0) idx = Math.floor(rnd(st) * ECHO_LINES.length);
  const e = { n: st.echoes.length, title: 'Eco ' + (ROMAN[st.echoes.length] || st.echoes.length + 1), tpl: idx, text: fixPrep(ECHO_LINES[idx](s)), from: rec.i, ts: Date.now() };
  st.echoes.push(e); log(st, `Eco sbloccato: ${e.title}`); return e;
}

// ---------- Validazione e riparazione dello stato ----------
export function validate(st) {
  const issues = [];
  const names = st.npcs.map(n => n.name); if (new Set(names).size !== names.length) issues.push('nomi duplicati');
  for (const p of st.promises) { if (!['aperta', 'mantenuta', 'rotta', 'sospesa'].includes(p.status)) issues.push('promessa con stato invalido'); const t = p.by === 'tu' ? p.to : p.by; const n = st.npcs.find(x => x.id === t); if (!n) issues.push('promessa verso NPC inesistente'); else if (n.gone && p.status === 'aperta') { p.status = 'sospesa'; issues.push('riparato: promessa aperta verso NPC assente'); } }
  if (st.current) { const gone = st.npcs.filter(n => n.gone).map(n => n.name); if (gone.some(nm => (st.current.text + st.current.pre).includes(nm))) { st.current = null; issues.push('riparato: momento con NPC assente rigenerato'); } }
  for (const k of ['skill', 'res', 'mood', 'impact']) if (!Number.isFinite(st.stats[k])) { st.stats[k] = 0; issues.push('riparato: statistica non valida'); }
  if (issues.length) log(st, 'Validazione: ' + issues.join('; '));
  return issues;
}
export function migrate(st) { if (!st || typeof st !== 'object') return null; if (!st.v) st.v = 1; st.log ||= []; st.echoes ||= []; st.flags ||= {}; st.recent ||= {}; st.playMs ||= 0; return st; }

// ---------- Viste per UI e condivisione ----------
export function summary(st) {
  const best = st.npcs.filter(n => !n.gone).sort((a, b) => b.rel - a.rel)[0];
  const lines = [`Nella mia vita alternativa sono ${st.title.toLowerCase().replace(/^il |^la |^una |^un /, m => m)}`];
  return { title: st.title, line: `Nella mia vita alternativa: ${st.title}. Giorno ${st.day}. ${best ? 'Accanto a me c\'è ' + best.name + '.' : ''}`.trim(), best };
}
export function moodWord(st) { const m = st.stats.mood; return m >= 4 ? 'luminoso' : m >= 2 ? 'sereno' : m >= -1 ? 'in bilico' : m >= -3 ? 'inquieto' : 'ferito'; }
export function relWord(r) { return r >= 7 ? 'legame profondo' : r >= 4 ? 'fiducia' : r >= 2 ? 'affetto' : r >= 0 ? 'conoscenza' : r >= -2 ? 'distanza' : 'ferita'; }
export { SEEDS, TYPES, PALETTES };
