#!/usr/bin/env python3
"""
bSmart Works — spec extractor.

Regenerates the Markdown mirrors in docs/ from the canonical .docx specs, so the
content is readable and diffable in-repo (every AI tool reads Markdown, not .docx).
Stdlib only — no pip installs. Run from the repo root:

    python3 scripts/extract-specs.py

The .docx files in docs/ remain the source of truth; this only refreshes the .md mirrors.
"""
import sys
import zipfile
import datetime
import xml.etree.ElementTree as ET
from pathlib import Path

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
NS = {"w": W[1:-1]}
TODAY = datetime.date.today().isoformat()

# (docx path, output .md path, human title)
JOBS = [
    ("docs/specifications/05-Capability-Map-Expansion-v3_5.docx",
     "docs/specifications/05-capability-map-v3.5.md", "Capability Map Expansion v3.5"),
    ("docs/specifications/06-Complete-Iteration-Guide.docx",
     "docs/specifications/06-iteration-guide.md", "Complete Iteration Guide"),
    ("docs/specifications/07-Tech-Stack-and-Architecture.docx",
     "docs/specifications/07-tech-stack-architecture.md", "Tech Stack & Architecture"),
    ("docs/brand/Works-Brand-and-Identity.docx",
     "docs/brand/brand-and-identity.md", "Brand & Identity"),
]


def para_text(p):
    parts = []
    for node in p.iter():
        if node.tag == W + "t" and node.text:
            parts.append(node.text)
        elif node.tag == W + "br":
            parts.append("\n")
        elif node.tag == W + "tab":
            parts.append(" ")
    return "".join(parts).strip()


def style_of(p):
    ppr = p.find("w:pPr", NS)
    if ppr is None:
        return ""
    ps = ppr.find("w:pStyle", NS)
    return ps.get(W + "val") if ps is not None else ""


def is_list(p):
    ppr = p.find("w:pPr", NS)
    return ppr is not None and ppr.find("w:numPr", NS) is not None


def cell_paras(tc):
    out = []
    for p in tc.findall("w:p", NS):
        t = para_text(p)
        if t:
            out.extend(t.split("\n"))
    return [s.strip() for s in out if s.strip()]


def extract(xml_bytes):
    root = ET.fromstring(xml_bytes)
    body = root.find("w:body", NS)
    out = []
    for el in body:
        tag = el.tag.split("}")[-1]
        if tag == "p":
            txt = para_text(el)
            if not txt:
                continue
            st = style_of(el).lower()
            if "title" in st:        out.append(("h1", txt))
            elif "heading1" in st:   out.append(("h2", txt))
            elif "heading2" in st:   out.append(("h3", txt))
            elif "heading3" in st:   out.append(("h4", txt))
            elif "heading" in st:    out.append(("h5", txt))
            elif is_list(el):        out.append(("li", txt))
            else:                    out.append(("p", txt))
        elif tag == "tbl":
            rows = [[cell_paras(c) for c in r.findall("w:tc", NS)]
                    for r in el.findall("w:tr", NS)]
            if not rows:
                continue
            ncol = max(len(r) for r in rows)
            if ncol == 1:  # single-column table = callout box -> blockquote
                for r in rows:
                    for cell in r:
                        for line in cell:
                            out.append(("quote", line))
                    out.append(("quote", ""))
            else:
                trows = [[" ".join(c) if c else "" for c in r] + [""] * (ncol - len(r))
                         for r in rows]
                out.append(("thead", trows[0]))
                for r in trows[1:]:
                    out.append(("trow", r))

    md, prev = [], None
    def gap():
        if md:
            md.append("")
    for kind, val in out:
        if kind == "h1": gap(); md.append(f"# {val}")
        elif kind == "h2": gap(); md.append(f"## {val}")
        elif kind == "h3": gap(); md.append(f"### {val}")
        elif kind == "h4": gap(); md.append(f"#### {val}")
        elif kind == "h5": gap(); md.append(f"##### {val}")
        elif kind == "li":
            if prev != "li": gap()
            md.append(f"- {val}")
        elif kind == "p": gap(); md.append(val)
        elif kind == "quote":
            if prev != "quote": gap()
            md.append(f"> {val}" if val else ">")
        elif kind == "thead":
            gap()
            md.append("| " + " | ".join(val) + " |")
            md.append("| " + " | ".join(["---"] * len(val)) + " |")
        elif kind == "trow":
            md.append("| " + " | ".join(c.replace("\n", " ") for c in val) + " |")
        prev = kind
    text = "\n".join(md)
    while "\n\n\n" in text:
        text = text.replace("\n\n\n", "\n\n")
    return text


def header(origin, title):
    return (
        f"<!-- AUTO-EXTRACTED from {origin} on {TODAY}. Source of truth = the .docx in the\n"
        f"     same folder. Regenerate with: python3 scripts/extract-specs.py -->\n\n"
        f"> **Provenance:** machine-extracted from `{origin}` ({title}).\n"
        f"> This Markdown mirror exists so every AI tool and teammate can read/diff the spec in-repo.\n"
        f"> Where this spec and the **code** disagree, the code is canonical — "
        f"see [`/CLAUDE.md`](../../CLAUDE.md) (⚠️ flags).\n\n---\n\n"
    )


def main():
    root = Path(__file__).resolve().parent.parent
    rc = 0
    for docx_rel, md_rel, title in JOBS:
        docx = root / docx_rel
        if not docx.exists():
            print(f"  MISSING  {docx_rel}", file=sys.stderr); rc = 1; continue
        with zipfile.ZipFile(docx) as z:
            xml = z.read("word/document.xml")
        md = header(docx.name, title) + extract(xml)
        (root / md_rel).write_text(md, encoding="utf-8")
        print(f"  wrote    {md_rel}  ({len(md)} bytes)")
    return rc


if __name__ == "__main__":
    sys.exit(main())
