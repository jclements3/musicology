#!/usr/bin/env python3
import os
KEYS_ORDER=["C","G","D","A","E","F","Bb","Eb"]
KEYS={"C":["C","D","E","F","G","A","B"],"G":["G","A","B","C","D","E","F#"],
"D":["D","E","F#","G","A","B","C#"],"A":["A","B","C#","D","E","F#","G#"],
"E":["E","F#","G#","A","B","C#","D#"],"F":["F","G","A","Bb","C","D","E"],
"Bb":["Bb","C","D","Eb","F","G","A"],"Eb":["Eb","F","G","Ab","Bb","C","D"]}
TRI=["","m","m","","","m","°"]; SEV=["Δ","m7","m7","Δ","7","m7","ø7"]
# (label, kind, offset)  kind: 'tri','sev','quartal'
SHAPES=[("33","tri",0,None),("34","tri",2,None),("43","tri",4,None),("44","quartal",0,"q"),
("333","sev",0,None),("332","sev",2,None),("323","sev",4,None),("233","sev",6,None),
("444","quartal",0,"q4")]
HEX={"33":"531","34":"853","43":"A85","44":"741","333":"7531","332":"8753","323":"A875","233":"CA87","444":"A741"}
def chord(sc,bass,kind,off,qsuf):
    if kind=="quartal": return sc[bass]+qsuf
    rd=(bass-off)%7
    name=sc[rd]+(SEV if kind=="sev" else TRI)[rd]
    return name if off==0 else name+"/"+sc[bass]
def fix(n): return n.replace("#","♯").replace("b","♭")
def table(kn,sc):
    rows=["{\\mono\\bfseries %s} & & 1 & 2 & 3 & 4 & 5 & 6 & 7 \\\\"%fix(kn)]
    for lab,kind,off,qsuf in SHAPES:
        cells=" & ".join(fix(chord(sc,d,kind,off,qsuf)) for d in range(7))
        rows.append("{\\mono %s} & {\\mono %s} & %s \\\\"%(lab,HEX[lab],cells))
    return "\\begin{tabular}{@{}L@{\\hskip 2pt}H@{\\hskip 3pt}DDDDDDD@{}}\n"+"\n".join(rows)+"\n\\end{tabular}"
blocks="\n\n".join("\\noindent%s\\par\\vspace{VGAP}"%table(k,KEYS[k]) for k in KEYS_ORDER)
FS=os.environ.get("FS","9.5"); LEAD=os.environ.get("LEAD","11.8")
DW=os.environ.get("DW","44"); LW=os.environ.get("LW","18"); HW=os.environ.get("HW","26")
ARRST=os.environ.get("ARRST","1.12"); VGAP=os.environ.get("VGAP","0.12em")
doc=r"""\documentclass{article}
\usepackage[letterpaper,landscape,margin=0.4in]{geometry}
\usepackage{fontspec}\usepackage{array}\usepackage{multicol}
\setmainfont{DejaVu Serif}
\newfontfamily\mono{DejaVu Sans Mono}[Scale=0.8]
\newcolumntype{D}{>{\centering\arraybackslash}p{DWpt}}
\newcolumntype{L}{>{\raggedright\arraybackslash}p{LWpt}}
\newcolumntype{H}{>{\centering\arraybackslash}p{HWpt}}
\setlength{\parindent}{0pt}\setlength{\columnsep}{0.3in}\setlength{\tabcolsep}{0pt}
\renewcommand{\arraystretch}{ARRST}\pagestyle{empty}
\begin{document}
\fontsize{FS}{LEAD}\selectfont
\begin{multicols}{2}
"""+blocks+"\n\\end{multicols}\n\\end{document}\n"
for k,v in [("DW",DW),("LW",LW),("HW",HW),("ARRST",ARRST),("VGAP",VGAP),("FS",FS),("LEAD",LEAD)]:
    doc=doc.replace(k,v)
open("mkq.tex","w").write(doc); print("ok DW=%s FS=%s"%(DW,FS))
