// Salvataggio robusto: doppio slot (principale + backup), versioning, export/import.
import { migrate, validate } from './engine.js';
const KEY = 'echoes:v1', BAK = 'echoes:v1:bak';
const empty = () => ({ v: 1, lives: {}, order: [], active: null, settings: { audio: true, voice: false, size: 1, theme: 'auto', narrator: 'offline', endpoint: '' } });
let mem = null;
function parse(raw) { try { const d = JSON.parse(raw); return d && d.lives ? d : null; } catch { return null; } }
export function load() {
  let d = null; try { d = parse(localStorage.getItem(KEY)) || parse(localStorage.getItem(BAK)); } catch {}
  d = d || empty(); const e = empty(); d.settings = { ...e.settings, ...(d.settings || {}) }; d.order = (d.order || []).filter(id => d.lives[id]);
  for (const id of Object.keys(d.lives)) { const st = migrate(d.lives[id]); if (!st) { delete d.lives[id]; continue; } validate(st); if (!d.order.includes(id)) d.order.push(id); }
  mem = d; return d;
}
export function save(d = mem) {
  mem = d; const s = JSON.stringify(d);
  try { const prev = localStorage.getItem(KEY); if (prev) localStorage.setItem(BAK, prev); localStorage.setItem(KEY, s); return true; }
  catch (e) { // quota piena: alleggerisci i log e riprova
    for (const st of Object.values(d.lives)) { st.log = st.log.slice(-50); }
    try { localStorage.removeItem(BAK); localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; }
  }
}
export function exportJSON(d = mem) { return JSON.stringify({ app: 'echoes', exported: new Date().toISOString(), data: d }, null, 1); }
export function importJSON(text) { const o = JSON.parse(text); const d = o && o.data && o.data.lives ? o.data : o && o.lives ? o : null; if (!d) throw new Error('File non valido'); localStorage.setItem(KEY, JSON.stringify(d)); return load(); }
