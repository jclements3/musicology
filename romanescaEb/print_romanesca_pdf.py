#!/usr/bin/env python3
"""Generate a portrait PDF of romanescaEb.abc using abcm2ps + ps2pdf.

Splits each 12-bar music line into two 6-bar systems so the page width
fills with exactly 6 measures per line. Output: romanescaEb.pdf.

Preprocessing mirrors canonEb/print_drill_pdf.py:
- Strip %%nowrap (abcjsharp-only)
- Convert inline [V:N name="X"] → [V:N] "^X" annotation
- Override %%scale for portrait sizing
And adds the 12→6+6 split, interleaving V:1/V:2 chunks pairwise so each
grand-staff system gets matched treble and bass halves.
"""
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / 'romanescaEb.abc'
OUT_PDF = HERE / 'romanescaEb.pdf'
TMP_ABC = HERE / '_romanescaEb_for_abcm2ps.abc'
TMP_PS = HERE / '_romanescaEb.ps'


def _parse_voice_line(line):
    """Match `[V:N name="X"] body`. Returns (voice, label_or_empty, body) or None."""
    m = re.match(r'^\[(V:\d+)(?:\s+name="([^"]*)")?\]\s*(.*)$', line)
    if not m:
        return None
    voice, label, body = m.groups()
    return voice, label or '', body


def _split_bars(body):
    """Split a music body on bar lines into bar contents.
    Trailing `|]` or `|` is stripped — the caller re-adds the terminator."""
    body = body.rstrip()
    if body.endswith('|]'):
        body = body[:-2].rstrip()
    elif body.endswith('|'):
        body = body[:-1].rstrip()
    return [b.strip() for b in body.split('|') if b.strip()]


CHORD_TO_ROMAN = {
    'E♭': 'I',
    'B♭': 'V',
    'Cm': 'vi',
    'Gm': 'iii',
    'A♭': 'IV',
    'Fm': 'ii',
    'D°': 'vii°',
}


def _romanize(s):
    # Longest first so 'E♭' beats 'E', etc.
    for chord in sorted(CHORD_TO_ROMAN, key=len, reverse=True):
        s = s.replace(f'"{chord}"', f'"{CHORD_TO_ROMAN[chord]}"')
    return s


def preprocess(abc, bars_per_line=6):
    abc = _romanize(abc)
    out_lines = []
    pending_v1 = None
    pairs = []   # list of (v1_line_or_None, v2_line_or_None)

    for line in abc.splitlines():
        s = line.strip()
        if s.startswith('%%nowrap'):
            continue
        if s.startswith('%%scale'):
            out_lines.append('%%scale 0.55')
            out_lines.append('%%measurenb 1')
            out_lines.append('%%measurefont Times-Roman 7')
            continue
        if line.startswith('[V:1'):
            if pending_v1 is not None:
                pairs.append((pending_v1, None))
            pending_v1 = line
            continue
        if line.startswith('[V:2'):
            pairs.append((pending_v1, line))
            pending_v1 = None
            continue
        if pending_v1 is not None:
            pairs.append((pending_v1, None))
            pending_v1 = None
        out_lines.append(line)

    if pending_v1 is not None:
        pairs.append((pending_v1, None))

    for v1, v2 in pairs:
        v1_p = _parse_voice_line(v1) if v1 else None
        v2_p = _parse_voice_line(v2) if v2 else None
        v1_bars = _split_bars(v1_p[2]) if v1_p else []
        v2_bars = _split_bars(v2_p[2]) if v2_p else []
        n_bars = max(len(v1_bars), len(v2_bars))

        if n_bars <= bars_per_line:
            # Short line — keep original body verbatim so end barlines
            # like |] are preserved.
            for parsed, src in ((v1_p, v1), (v2_p, v2)):
                if not parsed:
                    continue
                voice, label, body = parsed
                label_str = f' "^{label}"' if label else ''
                out_lines.append(f'[{voice}]{label_str} {body}')
            continue

        for chunk_start in range(0, n_bars, bars_per_line):
            chunk_end = chunk_start + bars_per_line
            is_first = chunk_start == 0
            for parsed, bars in ((v1_p, v1_bars), (v2_p, v2_bars)):
                if not parsed:
                    continue
                voice, label, _body = parsed
                chunk = bars[chunk_start:chunk_end]
                if not chunk:
                    continue
                label_str = f' "^{label}"' if label and is_first else ''
                out_lines.append(f'[{voice}]{label_str} ' + ' | '.join(chunk) + ' |')

    return '\n'.join(out_lines) + '\n'


def main():
    abc = SRC.read_text(encoding='utf-8')
    abc = preprocess(abc, bars_per_line=8)
    TMP_ABC.write_text(abc, encoding='utf-8')
    print(f'Wrote {TMP_ABC.name}')

    # Default portrait (no -l). -O outputs PostScript.
    res = subprocess.run(
        ['abcm2ps', '-O', str(TMP_PS), str(TMP_ABC)],
        capture_output=True, text=True, timeout=30,
    )
    print('abcm2ps stderr:')
    for line in res.stderr.splitlines()[-8:]:
        print(f'  {line}')
    if not TMP_PS.exists():
        print(f'PS not created at {TMP_PS}')
        return

    subprocess.run(['ps2pdf', str(TMP_PS), str(OUT_PDF)], check=True)
    print(f'Wrote {OUT_PDF.name} ({OUT_PDF.stat().st_size} bytes)')

    TMP_ABC.unlink()
    TMP_PS.unlink()


if __name__ == '__main__':
    main()
