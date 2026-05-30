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

  // ---- sung solfa cue (voiced timbre + spoken syllables) -------------------
  // A single voiced "aah" tone: a sawtooth (rich harmonics) shaped by three
  // bandpass formants so it reads as a voice, not a piano/MIDI tone, plus a
  // little vibrato. Used for the pitched part of the solfa cue.
  function voice(c, freq, t0, dur) {
    const master = c.createGain();
    master.connect(c.destination);
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(0.55, t0 + 0.06);
    master.gain.setValueAtTime(0.55, Math.max(t0 + 0.06, t0 + dur - 0.12));
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t0);

    // vibrato
    const vib = c.createOscillator();
    const vibg = c.createGain();
    vib.frequency.value = 5.5;
    vibg.gain.value = freq * 0.012;
    vib.connect(vibg); vibg.connect(osc.frequency);

    // darker "ah" vowel formants (F1/F2/F3) for a baritone-ish timbre
    const formants = [[620, 1.0], [1050, 0.55], [2450, 0.28]];
    formants.forEach(([f, gv]) => {
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 8;
      const fg = c.createGain(); fg.gain.value = gv;
      osc.connect(bp); bp.connect(fg); fg.connect(master);
    });

    osc.start(t0); osc.stop(t0 + dur + 0.05);
    vib.start(t0); vib.stop(t0 + dur + 0.05);
  }

  // Speak a solfa syllable, roughly tracking the note's pitch, via the browser
  // speech engine (the in-app equivalent of Android TextToSpeech).
  function speak(text, midi) {
    const synth = global.speechSynthesis;
    if (!synth || !global.SpeechSynthesisUtterance) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.85; u.volume = 1.0;
      // map midi -> a coarse speaking pitch (clamped to the engine's 0..2 range)
      u.pitch = Math.max(0.4, Math.min(1.8, (midi - 60) / 16 + 1));
      synth.speak(u);
    } catch (e) {}
  }

  // Play a sung solfa cue: seq is [{midi, syllable}, ...], sung in order.
  // Each note gets a voiced tone; the syllable is spoken at its onset.
  function playSolfa(seq, opts) {
    const c = ac();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    if (global.speechSynthesis) { try { global.speechSynthesis.cancel(); } catch (e) {} }
    const dur = (opts && opts.dur) || 0.62;
    const gap = (opts && opts.gap) || 0.14;
    const now = c.currentTime;
    (seq || []).forEach((ev, i) => {
      const t0 = now + i * (dur + gap);
      voice(c, midiToFreq(ev.midi), t0, dur);
      if (ev.syllable) {
        const delayMs = Math.max(0, (t0 - c.currentTime) * 1000);
        setTimeout(() => speak(ev.syllable, ev.midi), delayMs);
      }
    });
  }

  function stopSolfa() {
    if (global.speechSynthesis) { try { global.speechSynthesis.cancel(); } catch (e) {} }
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

  global.Audio2 = { playChord, blip, playSolfa, stopSolfa };
})(window);
