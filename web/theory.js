/* theory.js — music-theory engine for the Roman Numeral Chord Trainer.
 *
 * Everything here is key-agnostic: chords are built from scale degrees, so the
 * same function works in any key signature. Roman numerals are derived from the
 * scale degree + the triad/seventh quality, which is exactly the skill the game
 * trains ("what is this chord's roman numeral, regardless of the key?").
 *
 * Loaded as a classic script — exposes a global `Theory` object.
 */
(function (global) {
  'use strict';

  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
  const NAT_MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];
  const HARM_MINOR_STEPS = [0, 2, 3, 5, 7, 8, 11];

  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  // Curated key lists with sane enharmonic spelling.
  const MAJOR_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
  const MINOR_KEYS = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D', 'G', 'C', 'F', 'Bb', 'Eb'];

  function accValue(acc) {
    let v = 0;
    for (const ch of acc) { if (ch === '#') v++; else if (ch === 'b') v--; }
    return v;
  }
  function accString(n) {
    if (n > 0) return '#'.repeat(n);
    if (n < 0) return 'b'.repeat(-n);
    return '';
  }

  // Build a 7-note scale for `tonic` ("C", "F#", "Bb", ...) using semitone steps.
  // Returns [{letter, acc, name, pc}] with correct note spelling for any key.
  function buildScale(tonic, steps) {
    const tonicLetter = tonic[0];
    const tonicAcc = tonic.slice(1);
    const startIdx = LETTERS.indexOf(tonicLetter);
    const tonicPc = (LETTER_PC[tonicLetter] + accValue(tonicAcc) + 120) % 12;
    const scale = [];
    for (let i = 0; i < 7; i++) {
      const letter = LETTERS[(startIdx + i) % 7];
      const naturalPc = LETTER_PC[letter];
      const targetPc = (tonicPc + steps[i]) % 12;
      const diff = ((targetPc - naturalPc + 18) % 12) - 6; // -6..+5 semitones
      const acc = accString(diff);
      scale.push({ letter, acc, name: letter + acc, pc: targetPc });
    }
    return scale;
  }

  // Pretty note name using unicode accidentals.
  function fmtNote(name) {
    return name.replace(/##/g, '×').replace(/#/g, '♯').replace(/bb/g, '𝄫').replace(/b/g, '♭');
  }

  function triadQuality(rootPc, thirdPc, fifthPc) {
    const t = (thirdPc - rootPc + 12) % 12;
    const f = (fifthPc - rootPc + 12) % 12;
    if (t === 4 && f === 7) return 'maj';
    if (t === 3 && f === 7) return 'min';
    if (t === 3 && f === 6) return 'dim';
    if (t === 4 && f === 8) return 'aug';
    return 'other';
  }

  function seventhType(triad, rootPc, seventhPc) {
    const s = (seventhPc - rootPc + 12) % 12;
    if (triad === 'maj' && s === 11) return 'maj7';
    if (triad === 'maj' && s === 10) return 'dom7';
    if (triad === 'min' && s === 10) return 'min7';
    if (triad === 'min' && s === 11) return 'minMaj7';
    if (triad === 'dim' && s === 10) return 'halfDim7';
    if (triad === 'dim' && s === 9) return 'dim7';
    if (triad === 'aug' && s === 11) return 'augMaj7';
    if (triad === 'aug' && s === 10) return 'aug7';
    return 'other7';
  }

  // Roman-numeral label for a scale degree (0-based) given the chord quality.
  function romanLabel(degree, triad, sev) {
    const base = ROMAN[degree];
    const upper = (triad === 'maj' || triad === 'aug');
    let r = upper ? base : base.toLowerCase();
    if (!sev) {
      if (triad === 'dim') r += '°';
      else if (triad === 'aug') r += '+';
      return r;
    }
    switch (sev) {
      case 'maj7': return base + 'maj7';
      case 'dom7': return base + '7';
      case 'min7': return base.toLowerCase() + '7';
      case 'minMaj7': return base.toLowerCase() + 'maj7';
      case 'halfDim7': return base.toLowerCase() + 'ø7';
      case 'dim7': return base.toLowerCase() + '°7';
      case 'augMaj7': return base + '+maj7';
      case 'aug7': return base + '+7';
      default: return r + '7';
    }
  }

  // Build the chord on scale `degree` (0-based). seventh => add the 7th.
  // Notes are returned with ascending MIDI numbers (close position, root ~C4).
  function buildChord(scale, degree, seventh) {
    const idxs = seventh ? [0, 2, 4, 6] : [0, 2, 4];
    const tones = idxs.map((off) => scale[(degree + off) % 7]);
    const rootPc = tones[0].pc;
    const tri = triadQuality(tones[0].pc, tones[1].pc, tones[2].pc);
    const sev = seventh ? seventhType(tri, rootPc, tones[3].pc) : null;

    // Assign ascending MIDI, root near C4 (60).
    let prevMidi = 60 + ((rootPc - 0 + 12) % 12);
    if (prevMidi > 67) prevMidi -= 12; // keep it from sitting too high
    const midis = [];
    let last = -Infinity;
    tones.forEach((t, i) => {
      let m = (i === 0) ? prevMidi : last + (((t.pc - tones[i - 1].pc) % 12) + 12) % 12;
      if (i > 0 && m <= last) m += 12;
      midis.push(m);
      last = m;
    });

    return {
      degree,
      roman: romanLabel(degree, tri, sev),
      triad: tri,
      seventh: sev,
      notes: tones.map((t) => t.name),
      noteNames: tones.map((t) => fmtNote(t.name)),
      midis,
    };
  }

  // All diatonic chords of a key at a given extension level.
  function diatonicChords(scale, seventh) {
    const out = [];
    for (let d = 0; d < 7; d++) out.push(buildChord(scale, d, seventh));
    return out;
  }

  function makeKey(tonic, mode, harmonic) {
    let steps;
    if (mode === 'major') steps = MAJOR_STEPS;
    else steps = harmonic ? HARM_MINOR_STEPS : NAT_MINOR_STEPS;
    const scale = buildScale(tonic, steps);
    return {
      tonic, mode, harmonic: mode === 'minor' && harmonic,
      scale,
      label: fmtNote(tonic) + ' ' + mode,
    };
  }

  global.Theory = {
    MAJOR_KEYS, MINOR_KEYS, ROMAN,
    buildScale, buildChord, diatonicChords, makeKey, fmtNote,
  };
})(window);
