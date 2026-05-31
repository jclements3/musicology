#!/usr/bin/env python3
"""Render licks.abc -> licks.pdf via abcm2ps + ps2pdf.

Each lick is its own short grand-staff tune (RH lick + Somerset LH), so no
bar-splitting is needed — abcm2ps lays the 15 tunes out down the page.
"""
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / 'licks.abc'
OUT_PDF = HERE / 'licks.pdf'
TMP_PS = HERE / '_licks.ps'

FORMAT = [
    '%%scale 0.75',
    '%%measurenb 0',
    '%%titlefont Times-Roman 13',
    '%%composerfont Times-Italic 9',
    '%%musicspace 12',
]


def main():
    abc = SRC.read_text(encoding='utf-8')
    # Inject page-format directives after the leading comment block.
    lines = abc.splitlines()
    inject_at = 0
    for i, ln in enumerate(lines):
        if not ln.startswith('%') and ln.strip():
            inject_at = i
            break
    out = lines[:inject_at] + FORMAT + lines[inject_at:]
    tmp_abc = HERE / '_licks_for_abcm2ps.abc'
    tmp_abc.write_text('\n'.join(out) + '\n', encoding='utf-8')

    res = subprocess.run(
        ['abcm2ps', '-O', str(TMP_PS), str(tmp_abc)],
        capture_output=True, text=True, timeout=60,
    )
    print('abcm2ps stderr (tail):')
    for line in res.stderr.splitlines()[-10:]:
        print(f'  {line}')
    if not TMP_PS.exists():
        print(f'PS not created at {TMP_PS}')
        return
    subprocess.run(['ps2pdf', str(TMP_PS), str(OUT_PDF)], check=True)
    print(f'Wrote {OUT_PDF.name} ({OUT_PDF.stat().st_size} bytes)')
    TMP_PS.unlink()
    tmp_abc.unlink()


if __name__ == '__main__':
    main()
