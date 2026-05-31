# ii-V-I Altered-Dominant Licks — RH licks + Somerset LH

15 Jens Larsen **ii-V-I "altered dominant" licks** arranged for harp as a
**grand staff**: the lick in the **right hand**, a **Somerset left-hand
accompaniment pattern** underneath.

## Contents

| file | what |
|------|------|
| `rh01.png` … `rh15.png` | the source guitar-TAB image of each lick (extracted from `../15-II-V-I-licks-Altered-Dominants.pdf`) |
| `generate_licks.py` | builds `licks.abc` from the transcribed pitches + LH patterns — **edit here** |
| `licks.abc` | the 15 grand-staff tunes (RH + LH) |
| `print_licks_pdf.py` | renders `licks.abc` → `licks.pdf` (abcm2ps + ps2pdf) |
| `licks.pdf` | engraved output |

Regenerate with `python3 generate_licks.py && python3 print_licks_pdf.py`.

## How it's built

Every lick is the same 3-bar ii-V-I in C:

- **bar 1 — Dm7** (8 eighth notes, D-dorian)
- **bar 2 — G7alt** (8 eighth notes, G altered scale + the odd chromatic
  passing tone)
- **bar 3 — Cmaj7** (the resolution, a whole note)

Pitches are written at **treble ("guitar written") pitch** so the lines sit in a
comfortable harp register (correct pitch classes and intervals; sounding pitch on
guitar is an octave lower).

### The Somerset left hand

The left hand reuses the **Somerset pattern library** catalogued in
`../romanescaEb/romanescaEb.abc` — there the `V:2` / `LHxx` voices are progressive
left-hand textures (root, octave, root-fifth-octave, block triad, broken fifths,
arpeggio…) written under Canon-in-D violins over an E♭ Pachelbel ground. Here the
violins are dropped and **only the LH patterns are kept**, re-voiced onto
Dm7 → G7alt → Cmaj7. Each lick is assigned one pattern (cycling LH00, LH01, … — see
the title of each tune); the final bar always lands on a held Cmaj7 chord. Swap in
any other Somerset pattern by editing `PATTERNS`/the assignment in
`generate_licks.py`.

## Caveat — best-effort transcription

The right-hand pitches were read from the **low-resolution TAB images** in the
source PDF (no OCR was available), then validated bar-by-bar against the expected
harmony (Dm7 / G7alt / Cmaj7). They are accurate to the best of that process but
**should be checked against the original PDF**. Notes worth a second look:

- **Lick 5, bar 1** — the three middle notes (read as D4 B3 C4) could instead be a
  string higher (G4 E4 F4); both fit D-dorian.
- **Lick 11, bar 1** — a wide intervallic / fourths line that opens on a low F2.
- A few bar-2 lines pass through a **C natural over G7alt** (licks 6, 8, 11, 14) —
  read as deliberate chromatic passing tones, kept as-is.
