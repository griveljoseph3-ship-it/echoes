# ECHOES — La Vita Che Non Hai Vissuto

Gioco narrativo per telefono e iPad (PWA, in italiano). Ogni giorno vivi un momento della vita che avresti potuto avere se avessi fatto una scelta diversa. L'universo si ricorda di tutto.

**Gioca:** https://griveljoseph3-ship-it.github.io/echoes/ (su iPad: Condividi → Aggiungi alla schermata Home, poi funziona anche offline).

## Struttura
- `js/engine.js` — Stato del Mondo (JSON per vita), generazione dei Momenti, risoluzione, memoria, promesse, Eventi Maggiori ogni 3–5 momenti, Echi, validazione e riparazione della coerenza, log delle decisioni.
- `js/content.js`, `js/situations.js` — contenuti scritti a mano: 12 semi di vita su 6 tipi (sez. 7.1), 13 situazioni, 4 Eventi Maggiori (scelta etica, gestione risorse, puzzle narrativo, crocevia), epiloghi, echi, stagioni e festività reali.
- `js/narrator.js` — livello Narratore intercambiabile: `OfflineNarrator` (sempre attivo) e `RemoteNarrator` (adattatore per un LLM lato server, con i prompt della sez. 4.1, validazione delle risposte e ripiego automatico offline dopo 3 s).
- `js/storage.js` — salvataggio su doppio slot (principale + backup), migrazione, export/import.
- `js/art.js` — illustrazioni ad acquerello generative, coerenti per vita/luogo/ora. `js/audio.js` — ambient generato, suoni minimi, voce narrante opzionale e dettatura.
- `sw.js` — offline.

## Test
- `node tests/sim.mjs 50` — 12 vite × 2 forme × 50 sessioni consecutive (≈3.500 momenti), con serializzazione JSON tra una sessione e l'altra: controlla testi rotti, preposizioni, persone uscite dalla storia che ricompaiono, oggetti persi riusati, promesse incoerenti, fatti persi, nomi duplicati, ritmo degli Eventi Maggiori.
- `node tests/e2e.mjs` — Chromium headless su iPad verticale/orizzontale e iPhone: partite complete, ricarica, persistenza, panoramica, diario, osservatore, echi, condivisione, impostazioni, export, offline, zero errori in console.

## Narratore AI su server (futuro)
La chiave API **non deve mai** stare nel client. Serve un piccolo endpoint (es. Cloudflare Worker / Vercel) che riceve `{ system, user }`, chiama il modello con la chiave salvata lato server, e restituisce JSON `{ text, choices: [{ label, hint, tag, ok: {text, eff, fact}, ko: {...} }] }`. Nelle Impostazioni si incolla l'indirizzo https dell'endpoint. Se non risponde entro 3 s, o contraddice lo stato, il gioco usa il narratore offline.
