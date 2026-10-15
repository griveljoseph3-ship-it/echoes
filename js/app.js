import { createLife, nextMoment, resolve as _r, validate, summary, moodWord, relWord, SEEDS, TYPES, PALETTES } from './engine.js';
import { load, save, exportJSON, importJSON } from './storage.js';
import { makeNarrator } from './narrator.js';
import { paint } from './art.js';
import { startAmbient, stopAmbient, chime, speak, stopSpeak, canListen, listen } from './audio.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');
let D = load();
const ui = { view: 'home', sel: {}, phase: 'intro', result: null, notes: [], busy: false, sessionStart: Date.now(), reader: 0, puzzle: [], alloc: null, lastPaint: '' };
window.echoes = { get data() { return D; }, ui, reload: () => { D = load(); go('home'); } }; // per i test

const I = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5C4.7 20 4 19.3 4 18.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5z"/></svg>',
  world: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 2.6 14.6 0 17M12 3.5c-2.6 2.4-2.6 14.6 0 17"/></svg>',
  echo: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.5"/><path d="M7.5 7.5a6.4 6.4 0 000 9M16.5 7.5a6.4 6.4 0 010 9M4.6 4.6a10.5 10.5 0 000 14.8M19.4 4.6a10.5 10.5 0 010 14.8"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7.5 7.5L12 3l4.5 4.5M5 13v6.5c0 .8.7 1.5 1.5 1.5h11c.8 0 1.5-.7 1.5-1.5V13"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
};
const life = () => D.lives[D.active];
const narrator = () => makeNarrator(D.settings);
function persist() { if (!save(D)) toast('Spazio pieno: esporta un backup dalle impostazioni'); }
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); }
function theme(st) {
  const hue = D.settings.theme !== 'auto' ? D.settings.theme : st ? st.hue : 'warm'; const p = PALETTES[hue] || PALETTES.warm; const r = document.documentElement.style;
  r.setProperty('--bg', p.bg); r.setProperty('--ink', p.ink); r.setProperty('--soft', p.soft); r.setProperty('--accent', p.accent); r.setProperty('--fs', D.settings.size);
  $('meta[name=theme-color]').setAttribute('content', p.bg); return p;
}
const palOf = st => PALETTES[D.settings.theme !== 'auto' ? D.settings.theme : st.hue] || PALETTES.warm;
function go(v, extra = {}) { Object.assign(ui, { view: v }, extra); render(); window.scrollTo(0, 0); }
const top = (title, left = 'home', right = '') => `<div class="topbar"><button class="icon" data-go="${left}" aria-label="Indietro">${I.back}</button><div class="title">${esc(title)}</div><div class="icons">${right || '<span class="icon"></span>'}</div></div>`;
const g = (st, m, f) => st.player.g === 'a' ? f : m;

function render() {
  const st = life(); theme(ui.view === 'home' || ui.view === 'new' ? null : st);
  if (ui.view !== 'life') stopSpeak();
  const v = { home, new: newLife, life: lifeView, world, diary, reader, echoes, settings }[ui.view] || home;
  app.innerHTML = v(st); after();
}

// ---------- Home ----------
function home() {
  const lives = D.order.map(id => D.lives[id]).filter(Boolean);
  return `<div class="screen">
    <div class="wordmark">Echoes</div>
    <h1>La vita che non hai vissuto</h1>
    <p class="lede">Ogni giorno vivi un momento della vita che avresti potuto avere, se avessi scelto diversamente. L'universo si ricorda di tutto. Tu decidi cosa succede dopo.</p>
    <div class="hero"><canvas data-paint="home" data-kind="dusk" data-hue="warm" data-part="sera"></canvas></div>
    ${lives.length ? `<h2>Le tue vite</h2><div class="lives">${lives.map(l => `<button class="life" data-open="${l.id}"><canvas data-paint="${l.id}-thumb" data-kind="${l.art}" data-hue="${l.hue}" data-part="${l.part}"></canvas><div><div class="t">${esc(l.title)}</div><div class="s">${esc(l.typeLabel)} · giorno ${l.day} · ${l.moments.length} moment${l.moments.length === 1 ? 'o' : 'i'}${l.echoes.length ? ' · ' + l.echoes.length + ' ech' + (l.echoes.length === 1 ? 'o' : 'i') : ''}</div><div class="s">${l.current ? 'Un momento ti aspetta' : l.moments.length ? 'Ultimo: ' + esc(l.moments[l.moments.length - 1].chosen).slice(0, 60) : 'Ancora da cominciare'}</div></div></button>`).join('')}</div>` : ''}
    <div class="row" style="margin-top:20px"><button class="btn" data-go="new">${lives.length ? 'Inizia un\'altra vita' : 'Inizia la tua prima vita'}</button>${lives.some(l => l.echoes.length) ? '<button class="btn ghost" data-go="echoes">Rileggi i tuoi echi</button>' : ''}<button class="icon" data-go="settings" aria-label="Impostazioni">${I.gear}</button></div>
    <p class="footer">Le tue vite restano su questo dispositivo, private. Funziona anche senza connessione.</p></div>`;
}

// ---------- Nuova vita ----------
function newLife() {
  const s = ui.sel;
  if (!s.type) return `${top('Nuova vita')}<div class="screen"><div class="wordmark">Passo 1 di 3</div><h1>Che vita avresti potuto avere?</h1><p class="lede">Scegli il Nucleo della tua vita alternativa. Darà il tono a tutto il resto.</p>
    <div class="grid">${Object.entries(TYPES).map(([k, t]) => `<button class="opt" data-type="${k}"><div class="h"><span class="swatch" style="background:${PALETTES[t.hue].accent}"></span>${esc(t.label)}</div><div>${esc(t.hint)}</div></button>`).join('')}</div>
    <button class="btn ghost" data-surprise>Sorprendimi</button></div>`;
  if (!s.seed) return `${top('Nuova vita', 'new-back')}<div class="screen"><div class="wordmark">Passo 2 di 3 · ${esc(TYPES[s.type].label)}</div><h1>Dove ti ha portato quella scelta?</h1>
    <div class="grid">${SEEDS.filter(x => x.type === s.type).map(x => `<button class="opt" data-seed="${x.id}"><div class="h">${esc(x.city)}</div><h3>${esc(x.title)}</h3><div class="muted small">${esc(x.divergence)}</div></button>`).join('')}</div></div>`;
  const seed = SEEDS.find(x => x.id === s.seed);
  return `${top('Nuova vita', 'seed-back')}<div class="screen"><div class="wordmark">Passo 3 di 3</div><h1>${esc(seed.title)}</h1><p class="lede">${esc(seed.divergence)}</p>
    <label class="f" for="pname">Come ti chiamano, in questa vita? (facoltativo, resta solo qui)</label><input id="pname" class="field" maxlength="24" placeholder="Puoi lasciarlo vuoto" value="${esc(s.name || '')}" autocomplete="off">
    <label class="f">Il tuo Sé Alternativo è</label><div class="seg" role="group"><button data-gender="o" class="${s.g !== 'a' ? 'on' : ''}">stanco, felice…</button><button data-gender="a" class="${s.g === 'a' ? 'on' : ''}">stanca, felice…</button></div>
    <label class="f" for="wish">Cosa speri di trovare in questa vita? (facoltativo)</label><input id="wish" class="field" maxlength="140" placeholder="es. il coraggio di sbagliare" value="${esc(s.wish || '')}" autocomplete="off">
    <div class="row" style="margin-top:28px"><button class="btn accent" data-begin>Entra in questa vita</button></div></div>`;
}

// ---------- Vita: il core loop ----------
function lifeView(st) {
  if (!st) return home();
  const m = st.current; const r = ui.result; const pal = palOf(st);
  const icons = `<button class="icon" data-go="diary" aria-label="Diario">${I.book}</button><button class="icon" data-go="world" aria-label="Il tuo mondo">${I.world}</button><button class="icon" data-go="echoes" aria-label="Echi">${I.echo}</button><button class="icon" data-sound aria-label="Audio">${D.settings.audio ? I.sound : I.mute}</button>`;
  const shown = r ? r.record : m; const part = shown ? shown.part : st.part;
  const ctx = `<div class="aside-ctx">${esc(st.city)} · giorno ${shown ? shown.day : st.day} · ${esc(part)}<br>${esc(moodWord(st))}</div>`;
  let body = '';
  if (ui.phase === 'intro' && !m && !r) {
    const first = !st.moments.length;
    body = `<div class="meta">${esc(st.city)} · giorno ${st.day} · ${esc(st.part)}</div>
      <h1 style="font-size:calc(34px*var(--fs))">${first ? esc(st.title) : 'Bentornat' + st.player.g}</h1>
      <p class="p ${first ? '' : 'pre'}">${first ? esc(st.divergence) : esc(recap(st))}</p>
      <label class="f" for="daily">Cosa ti porti dentro, oggi? <span class="muted">(facoltativo)</span></label>
      <div class="free"><input id="daily" class="field" maxlength="120" placeholder="es. oggi ho pensato a un viaggio" autocomplete="off">${canListen() ? `<button class="icon" data-mic="daily" aria-label="Parla">${I.mic}</button>` : ''}</div>
      <div class="chips">${['un viaggio', 'una persona che mi manca', 'una paura', 'voglio creare qualcosa', 'niente di speciale'].map(c => `<button class="chip" data-fill="daily">${c}</button>`).join('')}</div>
      <div class="row" style="margin-top:24px"><button class="btn accent" data-start>${first ? 'Vivi il primo momento' : 'Vivi il momento di oggi'}</button></div>`;
  } else if (ui.busy) {
    body = `<div class="loader" aria-label="Il Narratore sta scrivendo"><i></i><i></i><i></i></div>`;
  } else if (m && !r) {
    body = momentHTML(st, m);
  } else if (r) {
    body = `<div class="settled">${momentHTML(st, { ...r.moment, done: true, picked: r.pickedIdx })}</div>` + outcomeHTML(st, r);
  }
  return `${top(st.title, 'home', icons)}<div class="life-view" data-pinch><div class="stage"><div class="art"><canvas data-paint="${st.id}-${shown ? shown.i : 'x'}" data-kind="${st.art}" data-hue="${D.settings.theme !== 'auto' ? D.settings.theme : st.hue}" data-part="${part}"></canvas>${ctx}</div><div class="story ${r ? 'settled-wrap' : ''}">${body}</div></div></div>`;
}
function recap(st) {
  const last = st.moments[st.moments.length - 1]; const open = st.promises.filter(p => p.status === 'aperta' && p.by === 'tu');
  const parts = []; if (last) parts.push(`L'ultima volta: ${last.chosen.replace(/^«|»$/g, '').toLowerCase()}.`);
  if (open.length) { const n = st.npcs.find(x => x.id === open[0].to); parts.push(`Hai ancora una promessa con ${n.name}.`); }
  return parts.join(' ') || 'La tua vita alternativa ti aspettava.';
}
function momentHTML(st, m) {
  const meta = `${esc(st.city)} · giorno ${m.day} · ${esc(m.part)}`;
  let h = `<div class="meta">${meta}</div>${m.major ? `<div class="badge">Evento maggiore</div><h2 style="margin-top:0">${esc(m.title)}</h2>` : ''}`;
  if (m.pre) h += `<p class="p pre">${esc(m.pre)}</p>`;
  if (m.scene) h += `<p class="p scene" style="animation-delay:.15s">${esc(m.scene)}</p>`;
  h += `<p class="p" style="animation-delay:.3s">${esc(m.text)}</p>`;
  if (m.kind === 'risorse' && m.alloc) {
    if (m.done) return h;
    const a = ui.alloc || (ui.alloc = { lavoro: 0, persone: 0, te: 0 }); const used = a.lavoro + a.persone + a.te; const left = m.alloc.total - used;
    h += `<div class="alloc">${m.alloc.keys.map(k => `<div class="arow"><div><div>${esc(k.label)}</div><div class="dots">${Array.from({ length: m.alloc.total }, (_, i) => `<span class="dot ${i < a[k.k] ? 'on' : ''}"></span>`).join('')}</div></div><div class="step"><button data-al="${k.k}" data-d="-1" aria-label="meno">−</button><button data-al="${k.k}" data-d="1" aria-label="più" ${left ? '' : 'disabled'}>+</button></div></div>`).join('')}</div>
      <p class="muted small sans">${left ? `Ti restano ${left} giorn${left === 1 ? 'o' : 'i'} da assegnare.` : 'La settimana è piena.'}</p><button class="btn accent" data-alloc ${left ? 'disabled' : ''}>Vivi la settimana</button>`;
    return h;
  }
  if (m.kind === 'puzzle' && m.puzzle) {
    if (m.done) return h;
    const seq = ui.puzzle; h += `<div class="seq" aria-label="Il tuo ordine">${seq.length ? seq.map(i => `<div>${esc(m.puzzle.pieces[i])}</div>`).join('') : '<span class="muted small sans">Tocca i frammenti nell\'ordine giusto</span>'}</div>
      <div class="frags">${m.puzzle.order.map(i => `<button class="frag ${seq.includes(i) ? 'used' : ''}" data-frag="${i}">${esc(m.puzzle.pieces[i])}</button>`).join('')}</div>
      <div class="row"><button class="btn ghost" data-fragreset ${seq.length ? '' : 'disabled'}>Ricomincia</button><button class="btn accent" data-fragdone ${seq.length === m.puzzle.pieces.length ? '' : 'disabled'}>Leggi il ricordo</button></div>`;
    return h;
  }
  h += `<div class="choices ${m.done ? 'done' : ''}">${m.choices.map((c, i) => `<button class="choice ${m.picked === i ? 'picked' : ''}" data-choice="${i}" style="animation-delay:${.45 + i * .1}s">${esc(c.label)}${c.hint ? `<span class="hint">${esc(c.hint)}</span>` : ''}</button>`).join('')}</div>`;
  if (!m.done && !m.major) h += `<div class="free"><input id="freetxt" class="field" maxlength="120" placeholder="Oppure scrivi tu cosa fai…" autocomplete="off" enterkeyhint="send">${canListen() ? `<button class="icon" data-mic="freetxt" aria-label="Parla">${I.mic}</button>` : ''}<button class="btn" data-free aria-label="Fai">Fai</button></div>
    <div class="chips">${suggest(st, m).map(s => `<button class="chip" data-fill="freetxt">${esc(s)}</button>`).join('')}</div>`;
  return h;
}
function suggest(st, m) { const n = st.npcs.filter(x => !x.gone && (m.npcs || []).includes(x.id))[0] || st.npcs.find(x => !x.gone); return [n ? `parlo con ${n.name}` : 'aspetto', 'aspetto e osservo', 'provo qualcosa di nuovo']; }
function outcomeHTML(st, r) {
  const tired = Date.now() - ui.sessionStart > 10 * 60 * 1000;
  return `<div class="outcome"><p class="p">${esc(r.record.outcome)}</p>${r.notes.length ? `<div class="notes">${r.notes.map((n, i) => `<div class="note" style="animation-delay:${.4 + i * .15}s">${esc(n)}</div>`).join('')}</div>` : ''}
    <p class="p epi" style="animation-delay:.7s">${esc(r.record.epilogue)}</p>
    ${r.echo ? `<div class="echo"><div class="h">Hai sbloccato un eco · ${esc(r.echo.title)}</div><p style="margin:.5em 0 0">${esc(r.echo.text)}</p></div>` : ''}
    <div class="row" style="margin-top:22px"><button class="btn accent" data-next>Continua</button><button class="btn ghost" data-close>Salva e chiudi</button><button class="icon" data-share="${r.record.i}" aria-label="Condividi un frammento">${I.share}</button></div>
    ${tired ? `<div class="gentle">Il giorno si sta chiudendo. Puoi continuare, oppure lasciare che questa vita respiri fino a domani.</div>` : ''}</div>`;
}
function snapshot(st) { return { rel: Object.fromEntries(st.npcs.map(n => [n.id, n.rel])), mem: Object.fromEntries(st.npcs.map(n => [n.id, n.memories.length])), gone: st.npcs.filter(n => n.gone).map(n => n.id), ids: st.npcs.map(n => n.id), pr: Object.fromEntries(st.promises.map(p => [p.id, p.status])), facts: st.facts.length, obj: st.object?.gone };
}
function diffNotes(st, b) {
  const out = []; const ag = n => n.g === 'f' ? 'a' : 'o';
  for (const n of st.npcs) {
    if (!b.ids.includes(n.id)) { out.push(`${n.name} entra nella tua vita.`); continue; }
    if (n.gone && !b.gone.includes(n.id)) { out.push(`${n.name} è uscit${ag(n)} dalla tua vita.`); continue; }
    const d = n.rel - b.rel[n.id]; if (d >= 2) out.push(`${n.name} si sente più vicin${ag(n)} a te.`); else if (d <= -2) out.push(`Qualcosa si è incrinato con ${n.name}.`);
    else if (n.memories.length > b.mem[n.id]) out.push(`${n.name} se lo ricorderà.`);
  }
  for (const p of st.promises) { const was = b.pr[p.id]; const who = st.npcs.find(x => x.id === (p.by === 'tu' ? p.to : p.by)); if (!was && p.status === 'aperta') out.push(`Hai promesso a ${who.name} di ${p.text}.`); else if (was === 'aperta' && p.status === 'mantenuta') out.push(p.by === 'tu' ? 'Promessa mantenuta.' : `${who.name} ha mantenuto la sua promessa.`); else if (was === 'aperta' && p.status === 'rotta') out.push('Una promessa si è spezzata.'); }
  if (st.object?.gone && !b.obj) out.push(`${st.object.name[0].toUpperCase() + st.object.name.slice(1)} non è più con te.`);
  return out.slice(0, 3);
}
async function startMoment(input = '') {
  const st = life(); ui.busy = true; ui.result = null; ui.alloc = null; ui.puzzle = []; render();
  const t0 = performance.now(); await narrator().moment(st, input); st.sessions += 0; ui.busy = false; ui.phase = 'moment'; persist();
  await new Promise(r => setTimeout(r, Math.max(0, 450 - (performance.now() - t0)))); render();
  if (st.current.major) chime('major'); if (D.settings.voice) speak([st.current.pre, st.current.scene, st.current.text].filter(Boolean).join(' '));
}
async function act(action, pickedIdx) {
  const st = life(); if (!st.current || ui.busy) return; const m = st.current; const b = snapshot(st);
  const res = await narrator().resolve(st, action); validate(st);
  ui.result = { ...res, moment: m, pickedIdx, notes: diffNotes(st, b) }; ui.phase = 'outcome'; persist(); render();
  chime(res.echo ? 'echo' : 'soft'); if (D.settings.voice) speak(res.record.outcome + ' ' + res.record.epilogue);
  setTimeout(() => $('.outcome')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
}

// ---------- Panoramica del mondo (pinch) ----------
function world(st) {
  const pr = st.promises; const label = { aperta: 'aperta', mantenuta: 'mantenuta', rotta: 'rotta', sospesa: 'sospesa' };
  const places = [...new Set(st.moments.map(m => m.place))];
  return `${top('Il tuo mondo', 'life')}<div class="screen" data-pinchout>
    <div class="wordmark">${esc(st.typeLabel)} · ${esc(st.nucleus.join(' + '))}</div><h1>${esc(st.title)}</h1>
    <p class="lede">${esc(st.divergence)}</p><p class="muted">Giorno ${st.day}. Il tuo Sé Alternativo è ${esc(moodWord(st))}.${st.player.name ? ' Qui ti chiamano ' + esc(st.player.name) + '.' : ''}${st.wish ? ' Speri di trovare: ' + esc(st.wish) + '.' : ''}</p>
    <h2>Le persone</h2><div class="people">${st.npcs.map(n => `<div class="card person ${n.gone ? 'gone' : ''}"><div class="rel">${n.gone ? 'uscit' + (n.g === 'f' ? 'a' : 'o') + ' dalla tua vita' : relWord(n.rel)}</div><h3>${esc(n.name)}</h3><div class="muted small">${esc(n.job)}</div><div class="bar"><i style="width:${Math.max(4, (n.rel + 6) / 16 * 100)}%"></i></div><div class="small">${esc(n.look[0].toUpperCase() + n.look.slice(1))}. ${n.memories.length ? 'Ricorda che ' + esc(n.memories[n.memories.length - 1].text) + '.' : 'Non avete ancora una storia insieme.'}</div></div>`).join('')}</div>
    <h2>Promesse</h2>${pr.length ? `<ul class="clean">${pr.map(p => { const w = st.npcs.find(x => x.id === (p.by === 'tu' ? p.to : p.by)); return `<li><span class="tag">${label[p.status]}</span>${p.by === 'tu' ? 'Hai promesso a ' + esc(w.name) : esc(w.name) + ' ha promesso'} di ${esc(p.text)}</li>`; }).join('')}</ul>` : '<p class="muted">Nessuna promessa, per ora.</p>'}
    ${st.object ? `<h2>Oggetti che ricordano</h2><ul class="clean"><li><span class="tag">${st.object.gone ? 'perduto' : 'con te'}</span>${esc(st.object.name)} — ${esc(st.object.gone ? st.object.fate : st.object.desc)}</li></ul>` : ''}
    <h2>Fatti stabiliti</h2><ul class="clean">${st.facts.slice().reverse().map(f => `<li>${esc(f.text)}</li>`).join('')}</ul>
    ${places.length ? `<h2>Luoghi vissuti</h2><p>${places.map(esc).join(' · ')}</p>` : ''}
    <p class="footer">Suggerimento: su iPad avvicina due dita sulla storia per aprire questa panoramica, allontanale per tornare.</p></div>`;
}

// ---------- Diario + modalità Osservatore ----------
function diary(st) {
  return `${top('Diario', 'life')}<div class="screen"><div class="wordmark">${esc(st.title)}</div><h1>I tuoi momenti</h1>
    ${st.moments.length ? st.moments.slice().reverse().map(m => `<button class="entry" data-read="${m.i}"><div class="s">giorno ${m.day} · ${esc(m.part)}${m.major ? ' · evento maggiore' : ''}</div><div>${esc((m.title ? m.title + ' — ' : '') + m.chosen.replace(/^«|»$/g, ''))}</div></button>`).join('') : '<p class="muted">Non hai ancora vissuto nessun momento.</p>'}</div>`;
}
function reader(st) {
  const m = st.moments[ui.reader]; if (!m) return diary(st); const alt = ui.alt;
  return `${top('Momento ' + (m.i + 1), 'diary', `<button class="icon" data-share="${m.i}" aria-label="Condividi">${I.share}</button>`)}<div class="screen reader" data-swipe>
    <div class="meta">${esc(st.city)} · giorno ${m.day} · ${esc(m.part)}</div>${m.title ? `<div class="badge">Evento maggiore</div><h2 style="margin-top:0">${esc(m.title)}</h2>` : ''}
    ${m.pre ? `<p class="p pre">${esc(m.pre)}</p>` : ''}<p class="p">${esc(m.text)}</p>
    <p class="p"><span class="tag">hai scelto</span>${esc(m.chosen)}</p><p class="p">${esc(m.outcome)}</p><p class="p epi">${esc(m.epilogue)}</p>
    ${m.alts && m.alts.length ? `<div class="outcome"><div class="wordmark">Modalità osservatore</div><p class="muted small">Rivivi questo momento con un'altra scelta. Sarà solo un eco possibile: la tua vita non cambia.</p>
      <div class="choices">${m.alts.map((a, i) => `<button class="choice ${alt === i ? 'picked' : ''}" data-alt="${i}">${esc(a.label)}</button>`).join('')}</div>${alt != null && m.alts[alt] ? `<div class="echo"><div class="h">Un eco possibile</div><p style="margin:.5em 0 0">${esc(m.alts[alt].text)}</p></div>` : ''}</div>` : ''}
    <div class="pager"><button class="btn ghost" data-rd="-1" ${m.i > 0 ? '' : 'disabled'}>‹ Prima</button><span>${m.i + 1} / ${st.moments.length}</span><button class="btn ghost" data-rd="1" ${m.i < st.moments.length - 1 ? '' : 'disabled'}>Dopo ›</button></div>
    <p class="footer">Scorri a destra o a sinistra per sfogliare.</p></div>`;
}
function echoes(st) {
  const all = ui.view === 'echoes' && (!st || ui.allEchoes) ? D.order.map(id => D.lives[id]).filter(Boolean) : [st];
  const list = all.flatMap(l => l.echoes.map(e => ({ ...e, life: l.title })));
  return `${top('Echi', st && !ui.allEchoes ? 'life' : 'home')}<div class="screen"><div class="wordmark">Le versioni di te</div><h1>Echi</h1><p class="lede">Frammenti delle vite che si toccano. Si sbloccano quando la tua storia raggiunge un punto importante.</p>
    ${list.length ? list.slice().reverse().map(e => `<div class="echo"><div class="h">${esc(e.title)} · ${esc(e.life)}</div><p style="margin:.5em 0 0">${esc(e.text)}</p></div>`).join('') : '<p class="muted">Nessun eco, ancora. Continua a vivere.</p>'}</div>`;
}

// ---------- Impostazioni ----------
function settings(st) {
  const s = D.settings;
  return `${top('Impostazioni', st && ui.from === 'life' ? 'life' : 'home')}<div class="screen"><h1>Impostazioni</h1>
    <label class="f">Colori</label><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr))"><button class="opt ${s.theme === 'auto' ? 'sel' : ''}" data-theme="auto">Secondo la vita</button>${Object.entries(PALETTES).map(([k, p]) => `<button class="opt ${s.theme === k ? 'sel' : ''}" data-theme="${k}"><span class="swatch" style="background:${p.accent}"></span>${{ warm: 'Caldo', rose: 'Rosa', cold: 'Freddo', slate: 'Ardesia', sage: 'Salvia', dusk: 'Crepuscolo' }[k]}</button>`).join('')}</div>
    <label class="f">Dimensione del testo</label><div class="seg">${[[0.9, 'Piccolo'], [1, 'Normale'], [1.15, 'Grande']].map(([v, l]) => `<button data-size="${v}" class="${s.size == v ? 'on' : ''}">${l}</button>`).join('')}</div>
    <label class="f">Musica ambient</label><div class="seg"><button data-audio="1" class="${s.audio ? 'on' : ''}">Accesa</button><button data-audio="0" class="${!s.audio ? 'on' : ''}">Spenta</button></div>
    <label class="f">Voce narrante (sintesi del dispositivo)</label><div class="seg"><button data-voice="1" class="${s.voice ? 'on' : ''}">Accesa</button><button data-voice="0" class="${!s.voice ? 'on' : ''}">Spenta</button></div>
    <label class="f">Narratore avanzato (server)</label><p class="muted small">Il narratore offline è sempre attivo. In futuro potrai collegare un server tuo che genera i momenti con un'intelligenza artificiale: la chiave resta sul server, mai qui.</p>
    <input class="field" id="endpoint" placeholder="https://tuo-server/api/echoes" value="${esc(s.endpoint)}" autocomplete="off"><div class="row" style="margin-top:10px"><button class="btn ghost" data-endpoint>${s.narrator === 'remoto' ? 'Aggiorna' : 'Attiva'}</button>${s.narrator === 'remoto' ? '<button class="btn ghost" data-offline>Torna solo offline</button>' : ''}</div>
    <h2>Salvataggi</h2><p class="muted small">Tutto è salvato automaticamente su questo dispositivo, con una copia di sicurezza. Puoi anche esportare un file.</p>
    <div class="row"><button class="btn ghost" data-export>Esporta backup</button><label class="btn ghost" for="imp">Importa backup</label><input type="file" id="imp" accept="application/json,.json" hidden></div>
    ${st ? `<h2>Questa vita</h2><button class="btn ghost" data-del>Elimina “${esc(st.title)}”</button>` : ''}
    <h2>Privacy</h2><p class="muted small">Nessun account, nessun tracciamento, nessuna pubblicità. Le tue vite sono private e restano sul dispositivo. I frammenti condivisi non contengono il tuo nome.</p></div>`;
}

// ---------- Condivisione sicura: Frammento ----------
async function share(i) {
  const st = life(); const m = st.moments[i]; if (!m) return; const pal = palOf(st);
  const c = document.createElement('canvas'); paint(c, { seed: st.id + '-' + i, palette: pal, kind: st.art, part: m.part, w: 540, h: 675, dpr: 2 });
  const x = c.getContext('2d'); x.setTransform(2, 0, 0, 2, 0, 0); x.fillStyle = pal.bg; x.globalAlpha = .82; x.fillRect(30, 300, 480, 330); x.globalAlpha = 1;
  let quote = (m.outcome.match(/[^.!?]+[.!?]+/g) || [m.outcome]).slice(0, 2).join(' ').trim(); if (st.player.name) quote = quote.split(st.player.name).join('');
  x.fillStyle = pal.ink; x.font = 'italic 22px Iowan Old Style, Palatino, Georgia, serif'; const words = quote.split(' '); let line = '', y = 350; const lines = [];
  for (const w of words) { if (x.measureText(line + w).width > 420) { lines.push(line); line = ''; } line += w + ' '; } lines.push(line);
  lines.slice(0, 8).forEach(l => { x.fillText(l.trim(), 60, y); y += 32; });
  x.font = '13px -apple-system, Helvetica, sans-serif'; x.fillStyle = pal.soft; x.fillText(`Nella mia vita alternativa: ${st.title}`, 60, 590); x.fillText('E C H O E S  ·  la vita che non hai vissuto', 60, 612);
  const blob = await new Promise(r => c.toBlob(r, 'image/png')); const file = new File([blob], 'echoes-frammento.png', { type: 'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: 'Un frammento della mia vita alternativa · ECHOES' }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'echoes-frammento.png'; document.body.appendChild(a); a.click(); a.remove(); toast('Frammento salvato');
}

// ---------- Eventi ----------
function after() {
  document.querySelectorAll('canvas[data-paint]').forEach(cv => { const key = cv.dataset.paint; const pal = PALETTES[cv.dataset.hue] || PALETTES.warm;
    requestAnimationFrame(() => { try { paint(cv, { seed: key, palette: pal, kind: cv.dataset.kind, part: cv.dataset.part }); } catch (e) { console.warn(e); } }); });
  const f = $('#freetxt'); if (f) f.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('[data-free]').click(); } });
  const d = $('#daily'); if (d) d.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('[data-start]').click(); } });
  const imp = $('#imp'); if (imp) imp.addEventListener('change', async () => { try { D = importJSON(await imp.files[0].text()); toast('Backup importato'); go('home'); } catch { toast('File non valido'); } });
}
function ensureAudio() { const st = life(); if (D.settings.audio && st && ui.view === 'life') startAmbient(D.settings.theme !== 'auto' ? D.settings.theme : st.hue, st.art === 'sea'); else stopAmbient(); }
app.addEventListener('click', async e => {
  const t = e.target.closest('button, [data-go]'); if (!t || t.disabled) return; const ds = t.dataset; const st = life();
  if (ds.go) { const v = ds.go;
    if (v === 'new-back') return go('new', { sel: {} }); if (v === 'seed-back') return go('new', { sel: { type: ui.sel.type } });
    if (v === 'new') return go('new', { sel: {} }); if (v === 'echoes') return go('echoes', { allEchoes: ui.view === 'home' });
    if (v === 'settings') return go('settings', { from: ui.view }); if (v === 'home') { stopAmbient(); persist(); }
    if (v === 'life') { go('life'); return ensureAudio(); } return go(v); }
  if (ds.open) { D.active = ds.open; ui.phase = D.lives[ds.open].current ? 'moment' : 'intro'; ui.result = null; ui.sessionStart = Date.now(); D.lives[ds.open].sessions++; persist(); go('life'); return ensureAudio(); }
  if (ds.type) return go('new', { sel: { type: ds.type } });
  if ('surprise' in ds) { const s = SEEDS[Math.floor(Math.random() * SEEDS.length)]; return go('new', { sel: { type: s.type, seed: s.id } }); }
  if (ds.seed) return go('new', { sel: { ...ui.sel, seed: ds.seed } });
  if (ds.gender) { ui.sel.name = $('#pname').value; ui.sel.wish = $('#wish').value; ui.sel.g = ds.gender; return render(); }
  if ('begin' in ds) { const nst = createLife({ seedId: ui.sel.seed, playerName: $('#pname').value, g: ui.sel.g || 'o', wish: $('#wish').value }); D.lives[nst.id] = nst; D.order.unshift(nst.id); D.active = nst.id; nst.sessions = 1; persist(); ui.phase = 'intro'; ui.result = null; ui.sessionStart = Date.now(); go('life'); return ensureAudio(); }
  if (ds.fill) { const el = $('#' + ds.fill); el.value = t.textContent; el.focus(); return; }
  if (ds.mic) { const el = $('#' + ds.mic); t.style.color = 'var(--accent)'; listen(txt => { el.value = txt; }, () => { t.style.color = ''; }); return; }
  if ('start' in ds) { const v = $('#daily').value.trim(); return startMoment(/niente di speciale/.test(v) ? '' : v); }
  if (ds.choice != null && st?.current) { t.classList.add('picked'); t.parentElement.classList.add('done'); await new Promise(r => setTimeout(r, 380)); return act({ choice: +ds.choice }, +ds.choice); }
  if ('free' in ds) { const v = $('#freetxt').value.trim(); if (!v) { $('#freetxt').focus(); return toast('Scrivi cosa fai, oppure scegli un\'opzione'); } return act({ free: v }, -1); }
  if (ds.al) { const k = ds.al, dv = +ds.d; const m = st.current; const a = ui.alloc; const used = a.lavoro + a.persone + a.te; if (dv > 0 && used >= m.alloc.total) return; a[k] = Math.max(0, a[k] + dv); return render(); }
  if ('alloc' in ds) return act({ alloc: ui.alloc }, -1);
  if (ds.frag != null) { if (!ui.puzzle.includes(+ds.frag)) ui.puzzle.push(+ds.frag); return render(); }
  if ('fragreset' in ds) { ui.puzzle = []; return render(); }
  if ('fragdone' in ds) return act({ order: ui.puzzle }, -1);
  if ('next' in ds) { ui.result = null; return startMoment(''); }
  if ('close' in ds) { persist(); stopAmbient(); toast('Salvato. La tua vita ti aspetta.'); return go('home', { result: null }); }
  if (ds.share != null) return share(+ds.share);
  if (ds.read != null) return go('reader', { reader: +ds.read, alt: null });
  if (ds.rd) { ui.reader = Math.max(0, Math.min(st.moments.length - 1, ui.reader + +ds.rd)); ui.alt = null; return render(); }
  if (ds.alt != null) { ui.alt = +ds.alt; return render(); }
  if ('sound' in ds) { D.settings.audio = !D.settings.audio; persist(); ensureAudio(); return render(); }
  if (ds.theme) { D.settings.theme = ds.theme; persist(); return render(); }
  if (ds.size) { D.settings.size = +ds.size; persist(); return render(); }
  if (ds.audio) { D.settings.audio = ds.audio === '1'; persist(); return render(); }
  if (ds.voice) { D.settings.voice = ds.voice === '1'; persist(); if (D.settings.voice) speak('La voce narrante è accesa.'); else stopSpeak(); return render(); }
  if ('endpoint' in ds) { const u = $('#endpoint').value.trim(); if (!/^https:\/\//.test(u)) return toast('Serve un indirizzo https://'); D.settings.endpoint = u; D.settings.narrator = 'remoto'; persist(); toast('Narratore avanzato attivo, con riserva offline'); return render(); }
  if ('offline' in ds) { D.settings.narrator = 'offline'; persist(); return render(); }
  if ('export' in ds) { const b = new Blob([exportJSON(D)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'echoes-backup.json'; document.body.appendChild(a); a.click(); a.remove(); return toast('Backup esportato'); }
  if ('del' in ds) { if (!confirm(`Eliminare per sempre “${st.title}”? Non si può annullare.`)) return; delete D.lives[st.id]; D.order = D.order.filter(x => x !== st.id); D.active = null; persist(); return go('home'); }
});

// Pinch per la panoramica (iPad) e swipe nel diario
let pinch = null, swipe = null;
const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
document.addEventListener('touchstart', e => { if (e.touches.length === 2) pinch = { d: dist(e.touches), done: false }; else if (e.touches.length === 1 && ui.view === 'reader') swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
document.addEventListener('touchmove', e => { if (!pinch || e.touches.length !== 2 || pinch.done) return; const r = dist(e.touches) / pinch.d;
  if (ui.view === 'life' && r < 0.7) { pinch.done = true; go('world'); } else if (ui.view === 'world' && r > 1.35) { pinch.done = true; go('life'); } }, { passive: true });
document.addEventListener('touchend', e => { if (e.touches.length < 2) pinch = null; if (swipe && ui.view === 'reader') { const t = e.changedTouches[0]; const dx = t.clientX - swipe.x, dy = t.clientY - swipe.y; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) { const st = life(); const n = ui.reader + (dx < 0 ? 1 : -1); if (n >= 0 && n < st.moments.length) { ui.reader = n; ui.alt = null; render(); } } swipe = null; } });
document.addEventListener('gesturestart', e => { if (ui.view === 'life' || ui.view === 'world') e.preventDefault(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { persist(); stopAmbient(); stopSpeak(); } else if (ui.view === 'life') ensureAudio(); });
window.addEventListener('pagehide', () => persist());
let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => after(), 250); });

if (D.active && D.lives[D.active] && D.lives[D.active].current) { ui.phase = 'moment'; }
render();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
