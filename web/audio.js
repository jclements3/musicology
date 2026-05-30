/* audio.js — tiny Web Audio chord player for ear-training feedback. */
(function (global) {
  'use strict';

  let ctx = null;
  function ac() {
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    return ctx;
  }

  function midiToFreq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  // Play a list of MIDI notes as a soft, slightly arpeggiated chord.
  function playChord(midis, opts) {
    const c = ac();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    const now = c.currentTime;
    const dur = (opts && opts.dur) || 1.1;
    const master = c.createGain();
    master.gain.value = 0.0001;
    master.connect(c.destination);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.5, now + 0.02);

    midis.forEach((m, i) => {
      const t0 = now + i * 0.05;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'triangle';
      osc.frequency.value = midiToFreq(m);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.28, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.1);
    });
    master.gain.setValueAtTime(0.5, now + dur);
    master.gain.exponentialRampToValueAtTime(0.0001, now + dur + 0.3);
  }

  // Short blip for correct/incorrect feedback.
  function blip(ok) {
    const c = ac();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    const now = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(ok ? 660 : 200, now);
    if (ok) osc.frequency.exponentialRampToValueAtTime(990, now + 0.12);
    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.connect(g); g.connect(c.destination);
    osc.start(now); osc.stop(now + 0.22);
  }

  global.Audio2 = { playChord, blip };
})(window);
