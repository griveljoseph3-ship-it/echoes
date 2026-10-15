import { createLife, nextMoment, resolve } from '../js/engine.js';
const st = createLife({ seedId: process.argv[2] || 'chef-lisbona', g: 'o', now: 1700000001234 });
for (let i = 0; i < 9; i++) { const m = nextMoment(st, i === 2 ? 'oggi ho pensato a un viaggio' : '');
  console.log(`\n=== ${m.i + 1} [${m.sitId}] giorno ${m.day} ${m.part} ${m.title || ''}\n${m.pre}\n${m.scene || ''}\n${m.text}`); m.choices.forEach((c, j) => console.log(`  ${j + 1}. ${c.label} (${c.hint})`));
  const r = m.kind === 'risorse' ? resolve(st, { alloc: { lavoro: 3, persone: 3, te: 1 } }) : m.kind === 'puzzle' ? resolve(st, { order: [0,1,2,3] }) : resolve(st, { choice: i % m.choices.length });
  console.log(`-> ${r.record.chosen}\n${r.record.outcome}\n~ ${r.record.epilogue}`); if (r.echo) console.log(`** ${r.echo.title}: ${r.echo.text}`); }
console.log(JSON.stringify({ npcs: st.npcs.map(n => [n.name, n.rel, n.memories.length]), promises: st.promises, facts: st.facts.map(f => f.text) }, null, 1));
