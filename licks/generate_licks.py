#!/usr/bin/env python3
"""Generate licks.abc — 15 Jens Larsen ii-V-I "altered dominant" licks as the
RIGHT HAND, each paired with a Somerset LEFT-HAND accompaniment pattern.

The right-hand melodies were transcribed from the guitar TAB in
../15-II-V-I-licks-Altered-Dominants.pdf (each lick = 2 bars of eighth notes over
Dm7 then G7alt, resolving to a Cmaj7 whole note). Pitches are written at treble
("guitar written") pitch so they sit in a comfortable harp register.

The left hand reuses the Somerset pattern library catalogued in
../romanescaEb/romanescaEb.abc (the V:2 / "LHxx" voices). Those patterns were
written over an Eb Pachelbel ground with Canon-in-D violins in the right hand;
here the violins are dropped and only the LH patterns are kept, re-voiced onto
this Dm7 - G7alt - Cmaj7 (ii-V-I in C) harmony. Each lick is assigned a Somerset
pattern (cycling LH00..LH04 etc.); the final bar always lands on a held Cmaj7.

Run:  python3 generate_licks.py   ->  writes licks.abc
Then: python3 print_licks_pdf.py  ->  writes licks.pdf
"""
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE / 'licks.abc'

# ---------------------------------------------------------------------------
# Right-hand transcriptions.  Each lick = (m1[8 notes], m2[8 notes], m3[1 note])
# as MIDI numbers at written treble pitch.  m1 over Dm7, m2 over G7alt,
# m3 = whole-note resolution over Cmaj7.
# ---------------------------------------------------------------------------
LICKS = [
    # Lick 1
    ([50,53,57,60,62,57,62,67], [68,65,61,63,61,56,58,56], [55]),
    # Lick 2
    ([53,57,60,62,64,62,60,57], [59,65,70,67,68,75,71,68], [74]),
    # Lick 3
    ([72,69,67,62,64,65,67,64], [67,63,59,56,61,58,55,53], [52]),
    # Lick 4
    ([50,52,53,55,53,57,64,62], [53,59,63,65,68,67,71,75], [74]),
    # Lick 5
    ([52,55,62,59,60,69,72,76], [75,71,68,70,71,73,70,68], [67]),
    # Lick 6
    ([53,57,60,64,62,67,72,69], [68,72,70,63,67,65,63,63], [55]),
    # Lick 7
    ([50,52,53,55,57,60,59,57], [56,59,63,61,65,68,67,65], [64]),
    # Lick 8
    ([50,53,57,60,64,67,65,64], [72,67,63,70,65,61,58,61], [60]),
    # Lick 9
    ([69,67,62,65,62,57,60,57], [53,55,56,58,59,65,70,68], [67]),
    # Lick 10
    ([57,60,64,67,65,64,62,60], [59,63,67,70,71,73,70,68], [67]),
    # Lick 11
    ([41,48,52,57,60,62,64,67], [68,71,72,68,67,63,63,59], [62]),
    # Lick 12
    ([67,55,60,65,62,64,65,62], [61,53,58,61,59,63,67,67], [64]),
    # Lick 13
    ([62,67,72,65,69,74,67,71], [68,65,67,68,65,61,58,56], [55]),
    # Lick 14
    ([57,65,72,69,65,62,64,67], [72,68,63,70,65,61,60,58], [52]),
    # Lick 15
    ([50,55,60,65,62,64,65,67], [68,73,75,77,77,79,77,75], [76]),
]

# ---------------------------------------------------------------------------
# MIDI -> ABC token (flat spelling; these lines live in C major / G altered).
# ---------------------------------------------------------------------------
FLAT = {0:('C',''),1:('D','_'),2:('D',''),3:('E','_'),4:('E',''),5:('F',''),
        6:('G','_'),7:('G',''),8:('A','_'),9:('A',''),10:('B','_'),11:('B','')}

def tok(midi):
    pc = midi % 12
    octv = midi // 12 - 1            # C4 (60) -> octave 4
    letter, acc = FLAT[pc]
    if octv >= 5:
        s = letter.lower() + "'" * (octv - 5)
    else:
        s = letter.upper() + "," * (4 - octv)
    return acc + s

def beam8(notes):
    """8 eighth notes -> two beamed groups of 4 (group = concatenated, no spaces)."""
    g1 = ''.join(tok(n) for n in notes[:4])
    g2 = ''.join(tok(n) for n in notes[4:])
    return f"{g1} {g2}"

# ---------------------------------------------------------------------------
# Left-hand Somerset patterns, re-voiced onto each chord.
# Pool roles: r2 = root (low), f2 = fifth above it, t3 = third, r3 = octave root.
# ---------------------------------------------------------------------------
DM = {'r2':'D,,', 'f2':'A,,', 't3':'F,', 'r3':'D,'}   # Dm7  (D F A)
G7 = {'r2':'G,,', 'f2':'D,',  't3':'B,', 'r3':'G,'}   # G7   (G B D)
CM = {'r2':'C,,', 'f2':'G,,', 't3':'E,', 'r3':'C,'}   # Cmaj7(C E G)

PATTERNS = [
    ("LH00 root",              lambda c: f"{c['r2']}8"),
    ("LH01 octave",            lambda c: f"[{c['r2']}{c['r3']}]8"),
    ("LH02 root-fifth-octave", lambda c: f"{c['r2']}2 {c['f2']}2 {c['r3']}4"),
    ("LH03 block triad",       lambda c: f"[{c['r2']}{c['f2']}{c['t3']}]8"),
    ("LH04 root-fifth-third",  lambda c: f"{c['r2']}2 {c['f2']}2 {c['t3']}4"),
    ("LH06 broken fifths",     lambda c: ' '.join([c['r2'],c['f2'],c['t3'],c['f2'],
                                                    c['r2'],c['f2'],c['t3'],c['f2']])),
    ("arpeggio up",            lambda c: f"{c['r2']}2 {c['t3']}2 {c['f2']}2 {c['r3']}2"),
    ("pendulum root-fifth",    lambda c: f"{c['r2']}2 {c['f2']}2 {c['r2']}2 {c['f2']}2"),
    ("root+fifth halves",      lambda c: f"{c['r2']}4 {c['f2']}4"),
    ("root-fifth-third + rest",lambda c: f"{c['r2']}2 {c['f2']}2 {c['t3']}2 z2"),
]

def final_chord(c):
    """Held tonic chord, whole note, for the resolution bar."""
    return f"[{c['r2']}{c['f2']}{c['t3']}{c['r3']}]8"

# ---------------------------------------------------------------------------
def tune(n, lick):
    m1, m2, m3 = lick
    pname, pfn = PATTERNS[(n - 1) % len(PATTERNS)]
    rh = (f'[V:1] "Dm7" {beam8(m1)} | "G7alt" {beam8(m2)} | '
          f'"Cmaj7" {tok(m3[0])}8 |]')
    lh = f'[V:2] {pfn(DM)} | {pfn(G7)} | {final_chord(CM)} |]'
    return "\n".join([
        f"X:{n}",
        f"T:Lick {n} — ii-V-I altered dominant  (LH: {pname})",
        "C:R.H. Jens Larsen  ·  L.H. Somerset pattern",
        "M:4/4",
        "L:1/8",
        "Q:1/4=120",
        "%%score {1 | 2}",
        "K:C",
        "V:1 clef=treble",
        "V:2 clef=bass",
        rh,
        lh,
        "",
    ])

def main():
    header = [
        "% 15 II-V-I altered-dominant licks (Jens Larsen) for harp.",
        "% Right hand = the lick; left hand = a Somerset accompaniment pattern",
        "% (from ../romanescaEb/romanescaEb.abc), re-voiced onto Dm7-G7alt-Cmaj7.",
        "% Generated by generate_licks.py -- edit there, not here.",
        "",
    ]
    out = "\n".join(header) + "\n".join(tune(i + 1, lk) for i, lk in enumerate(LICKS))
    OUT.write_text(out, encoding="utf-8")
    print(f"Wrote {OUT.name} ({len(LICKS)} licks)")

if __name__ == "__main__":
    main()
