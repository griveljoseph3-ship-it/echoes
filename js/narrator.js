// Livello "Narratore" intercambiabile.
// OfflineNarrator: motore locale (sempre disponibile, funziona offline).
// RemoteNarrator: adattatore per un futuro LLM lato server. La chiave API NON sta mai nel client:
// il client chiama un TUO endpoint (es. /api/echoes) che aggiunge la chiave lato server.
import { nextMoment, resolve, validate } from './engine.js';

// Template di prompt obbligatori (sez. 4.1 del documento)
export const SYSTEM_PROMPT = `Sei il Game Master di ECHOES. Mantieni coerenza assoluta con lo Stato del Mondo fornito. Genera sempre in stile letterario concreto, emotivo, mai generico. Rispondi in italiano (o lingua del giocatore). Limita ogni momento a 150-250 parole. Offri sempre 2-4 scelte significative. Aggiorna mentalmente lo stato dopo ogni interazione.
Regole aggiuntive: non nominare mai persone con "gone": true; non contraddire "facts"; ricorda le "promises" aperte e falle tornare quando "due" è raggiunto; niente cliché ("un brivido lungo la schiena", "il destino", "tutto cambiò"). Rispondi SOLO con JSON valido nel formato richiesto.`;
export function userPrompt(st, input) {
  const view = { vita: st.title, nucleo: st.nucleus, citta: st.city, divergenza: st.divergence, giorno: st.day, momento: st.part,
    personaggi: st.npcs.map(n => ({ id: n.id, nome: n.name, ruolo: n.job, carattere: n.trait.t, aspetto: n.look, storia: n.story, relazione: n.rel, gone: n.gone, memoria: n.memories.slice(-5).map(m => m.text) })),
    fatti: st.facts.map(f => f.text), promesse: st.promises.filter(p => p.status === 'aperta'), oggetto: st.object, fallimenti: st.fails.filter(f => !f.cleared).map(f => f.text), statistiche: st.stats };
  const last = st.moments[st.moments.length - 1];
  return `Stato attuale: ${JSON.stringify(view)}\nUltimo momento: ${last ? last.text + ' → ' + last.chosen + ' → ' + last.outcome : '(nessuno)'}\nInput del giocatore: ${input || '(nessuno)'}\nGenera il prossimo momento, le conseguenze e le nuove scelte. Formato: {"text": string, "choices": [{"label": string, "hint": string, "tag": "rischio"|"sicuro"|"relazione"|"sé", "ok": {"text": string, "eff": {"skill"?: n, "res"?: n, "mood"?: n, "impact"?: n, "rel"?: {"<ruolo>": n}}, "fact"?: string}, "ko": {...}}]}`;
}

export class OfflineNarrator {
  name = 'offline';
  async moment(st, input) { return nextMoment(st, input); }
  async resolve(st, action) { return resolve(st, action); }
}

export class RemoteNarrator {
  name = 'remoto';
  constructor(endpoint, fallback = new OfflineNarrator(), timeoutMs = 3000) { this.endpoint = endpoint; this.fallback = fallback; this.timeoutMs = timeoutMs; }
  async moment(st, input) {
    if (st.current || !this.endpoint || !navigator.onLine) return this.fallback.moment(st, input);
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), this.timeoutMs);
      const r = await fetch(this.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system: SYSTEM_PROMPT, user: userPrompt(st, input) }), signal: ctl.signal });
      clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(); const m = this.check(st, j);
      // Il momento remoto passa dallo stesso motore di risoluzione (effetti, memoria, promesse restano coerenti)
      st.current = { major: false, sitId: 'remoto', pre: '', scene: '', text: m.text, place: st.work.placeName, choices: m.choices, npcs: [], input, day: st.day, part: st.part, i: st.moments.length, imagePrompt: '' };
      return st.current;
    } catch (e) { st.log.push({ t: Date.now(), m: st.moments.length, msg: 'Narratore remoto non disponibile, uso offline: ' + e.message }); return this.fallback.moment(st, input); }
  }
  check(st, j) { // validazione: niente persone assenti, 2-4 scelte, testi presenti
    if (!j || typeof j.text !== 'string' || !Array.isArray(j.choices) || j.choices.length < 2 || j.choices.length > 4) throw new Error('risposta non valida');
    const gone = st.npcs.filter(n => n.gone).map(n => n.name); if (gone.some(g => j.text.includes(g))) throw new Error('contraddizione: persona assente');
    j.choices = j.choices.map(c => ({ label: String(c.label).slice(0, 90), hint: String(c.hint || '').slice(0, 40), tag: c.tag || 'sicuro', ok: { text: String(c.ok?.text || ''), eff: c.ok?.eff || {} , fact: c.ok?.fact }, ko: { text: String(c.ko?.text || c.ok?.text || ''), eff: c.ko?.eff || {} } }));
    return j;
  }
  async resolve(st, action) { const r = resolve(st, action); validate(st); return r; }
}
export function makeNarrator(settings) { return settings.narrator === 'remoto' && settings.endpoint ? new RemoteNarrator(settings.endpoint) : new OfflineNarrator(); }
