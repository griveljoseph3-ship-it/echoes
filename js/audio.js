// Colonna sonora ambient generata (Web Audio), effetti minimi e diegetici, voce narrante opzionale.
let ac = null, master = null, bed = null, on = false;
const MODES = { warm: [220, 277.2, 329.6], rose: [196, 246.9, 293.7], cold: [261.6, 329.6, 392], slate: [174.6, 220, 261.6], sage: [196, 261.6, 329.6], dusk: [207.7, 261.6, 311.1] };
function ctx() { if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination); } if (ac.state === 'suspended') ac.resume(); return ac; }
export function startAmbient(hue = 'warm', sea = false) {
  const a = ctx(); if (!a) return; stopBed(); on = true;
  const out = a.createGain(); out.gain.value = 0; out.connect(master); const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(out);
  const nodes = [];
  (MODES[hue] || MODES.warm).forEach((f, i) => { for (const det of [-4, 5]) { const o = a.createOscillator(); o.type = i === 0 ? 'sine' : 'triangle'; o.frequency.value = f / 2; o.detune.value = det; const g = a.createGain(); g.gain.value = 0.05 / (i + 1);
    const l = a.createOscillator(); l.frequency.value = 0.05 + i * 0.03; const lg = a.createGain(); lg.gain.value = 0.03 / (i + 1); l.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(lp); o.start(); l.start(); nodes.push(o, l); } });
  if (sea) { const n = a.createBufferSource(); const b = a.createBuffer(1, a.sampleRate * 4, a.sampleRate); const d = b.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { last = (last + (Math.random() * 2 - 1) * 0.02) * 0.995; d[i] = last * 3; } n.buffer = b; n.loop = true;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; const g = a.createGain(); g.gain.value = 0.35; const l = a.createOscillator(); l.frequency.value = 0.09; const lg = a.createGain(); lg.gain.value = 0.25; l.connect(lg); lg.connect(g.gain); n.connect(f); f.connect(g); g.connect(out); n.start(); l.start(); nodes.push(n, l); }
  out.gain.setTargetAtTime(1, a.currentTime, 2); master.gain.setTargetAtTime(0.6, a.currentTime, 1.5);
  bed = { out, nodes };
}
function stopBed() { if (!bed || !ac) return; const b = bed; bed = null; b.out.gain.setTargetAtTime(0, ac.currentTime, 0.6); setTimeout(() => b.nodes.forEach(n => { try { n.stop(); } catch {} }), 2500); }
export function stopAmbient() { on = false; stopBed(); }
export function chime(kind = 'soft') {
  const a = ac; if (!a || !on) return; const t = a.currentTime;
  const notes = kind === 'echo' ? [659.3, 880, 1318.5] : kind === 'major' ? [392, 493.9] : [880];
  notes.forEach((f, i) => { const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = a.createGain(); g.gain.setValueAtTime(0, t + i * 0.12); g.gain.linearRampToValueAtTime(0.06, t + i * 0.12 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 2.2); o.connect(g); g.connect(master); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 2.4); });
}
export function speak(text) {
  if (!('speechSynthesis' in window)) return false; speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = 'it-IT'; u.rate = 0.92; u.pitch = 0.95;
  const v = speechSynthesis.getVoices().filter(v => v.lang && v.lang.startsWith('it')); const pref = v.find(x => /Alice|Federica|Luca|Paola|Google/i.test(x.name)) || v[0]; if (pref) u.voice = pref;
  speechSynthesis.speak(u); return true;
}
export function stopSpeak() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
export function canListen() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
export function listen(onText, onEnd) { const R = window.SpeechRecognition || window.webkitSpeechRecognition; if (!R) return null; const r = new R(); r.lang = 'it-IT'; r.interimResults = false; r.maxAlternatives = 1; r.onresult = e => onText(e.results[0][0].transcript); r.onend = () => onEnd && onEnd(); r.onerror = () => onEnd && onEnd(); r.start(); return r; }
