// Fase 1: test di coerenza su molte sessioni consecutive per ogni seme
import { createLife, nextMoment, resolve, validate, SEEDS } from '../js/engine.js';
const SESS = +process.argv[2] || 50; let errs = 0, moments = 0, majors = 0, words = [], echoes = 0;
const bad = (s, msg) => { errs++; if (errs < 40) console.log('ERR', s, msg); };
const inputs = ['', '', '', 'oggi ho pensato a un viaggio', 'ho litigato con mia madre', 'mi sento solo', 'voglio creare musica', 'ho paura della verifica'];
for (const seed of SEEDS) {
  for (const g of ['o', 'a']) {
    let st = createLife({ seedId: seed.id, g, now: 1700000000000 + seed.id.length * 977 + (g === 'a' ? 5 : 0) });
    let lastMajor = 0;
    for (let s = 0; s < SESS; s++) {
      st = JSON.parse(JSON.stringify(st)); // simulazione chiusura/riapertura: tutto deve sopravvivere al JSON
      const n = 2 + (s % 3);
      for (let k = 0; k < n; k++) {
        const input = inputs[(s * 7 + k) % inputs.length];
        const gone = st.npcs.filter(x => x.gone).map(x => x.name);
        const m = nextMoment(st, input); moments++;
        const all = m.pre + ' ' + m.text + ' ' + m.choices.map(c => c.label + ' ' + (c.ok?.text || '') + (c.ko?.text || '') + (c.res?.text || '')).join(' ');
        if (/undefined|null|NaN|\$\{|\[object/.test(all)) bad(seed.id, 'token rotto: ' + all.match(/.{30}(undefined|null|NaN|\$\{|\[object).{10}/)?.[0]);
        if (/\b[Aa] (il|lo|la|i|gli|le) |\b[Dd]i (il|lo|i|gli) |\b[Ii]n (il|lo|la) /.test(all)) bad(seed.id, 'preposizione: ' + all.match(/.{20}\b([Aa]|[Dd]i|[Ii]n) (il|lo|la|i|gli|le) .{15}/)?.[0]);
        if (gone.some(nm => (m.pre + m.text).includes(nm))) bad(seed.id, 'cita NPC assente');
        if (m.object === undefined && st.object?.gone && m.sitId === 'oggetto') bad(seed.id, 'oggetto perso riusato');
        if (!m.major && (m.choices.length < 2 || m.choices.length > 4)) bad(seed.id, 'numero scelte ' + m.choices.length);
        words.push((m.pre + ' ' + m.text).split(/\s+/).length);
        let r;
        if (m.kind === 'risorse') r = resolve(st, { alloc: { lavoro: (s % 4) + 1, persone: 2, te: 7 - (s % 4) - 3 } });
        else if (m.kind === 'puzzle') r = resolve(st, { order: s % 2 ? [0, 1, 2, 3] : m.puzzle.order });
        else if ((s + k) % 5 === 4) r = resolve(st, { free: 'parlo con calma e chiedo aiuto' });
        else r = resolve(st, { choice: (s * 3 + k) % m.choices.length });
        if (m.major) { majors++; const gap = st.moments.length - lastMajor; if (lastMajor && (gap < 4 || gap > 6)) bad(seed.id, 'distanza evento maggiore ' + gap); lastMajor = st.moments.length; }
        if (r.echo) echoes++;
        if (/undefined|NaN|\$\{/.test(r.record.outcome + r.record.epilogue)) bad(seed.id, 'esito rotto');
        const iss = validate(st).filter(x => !x.startsWith('riparato')); if (iss.length) bad(seed.id, iss.join(','));
        // promesse mantenute non devono riaprirsi
        for (const p of st.promises) if (p.status === 'aperta' && p.by === 'tu' && st.npcs.find(x => x.id === p.to)?.gone) bad(seed.id, 'promessa aperta verso assente');
      }
    }
    // fatti stabiliti iniziali devono essere tutti ancora presenti
    for (const f of seed.facts) if (!st.facts.some(x => x.text === f)) bad(seed.id, 'fatto perso ' + f);
    const names = st.npcs.map(n => n.name); if (new Set(names).size !== names.length) bad(seed.id, 'nomi duplicati');
  }
}
words.sort((a, b) => a - b);
console.log(JSON.stringify({ seeds: SEEDS.length, sessionsPerLife: SESS, moments, majors, echoes, wordsMedian: words[words.length >> 1], wordsMin: words[0], wordsMax: words[words.length - 1], errors: errs }));
process.exit(errs ? 1 : 0);
