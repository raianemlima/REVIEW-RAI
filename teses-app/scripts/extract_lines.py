"""Extrai linhas classificadas (estilo) do PDF via pdftohtml -xml (poppler)."""
import re, subprocess, html, sys

def lines_from_pdf(pdf):
    xml = subprocess.run(["pdftohtml","-xml","-i","-q","-stdout",pdf],capture_output=True,check=True).stdout.decode("utf8")
    fs = {}
    out = []
    for pn, pg in enumerate(re.split(r"<page ", xml)[1:], 1):
        for m in re.findall(r'<fontspec id="(\d+)" size="(\d+)" family="([^"]*)" color="([^"]*)"', pg):
            fs[m[0]] = (int(m[1]), m[2].split("+")[-1], m[3])
        rows = {}
        for top, left, fid, t in re.findall(r'<text top="(\d+)" left="(\d+)"[^>]*font="(\d+)">(.*?)</text>', pg):
            txt = html.unescape(re.sub(r"<[^>]+>", "", t))
            if not txt.strip():
                continue
            rows.setdefault(int(top)//4, []).append((int(left), fs[fid], txt))
        for k in sorted(rows):
            segs = sorted(rows[k], key=lambda s: s[0])
            text = "".join(s[2] for s in segs)
            size, fam, color = segs[0][1]
            out.append({"page": pn, "size": size, "fam": fam, "color": color.lower(), "text": re.sub(r"\s+", " ", text).strip()})
    return out

def classify(l):
    s, f, c, t = l["size"], l["fam"], l["color"], l["text"]
    if c == "#c83e43" and s == 19: return "title"
    if c == "#c83e43" and s in (18, 21, 36): return "heading"
    if c == "#c00000" and s in (14,15) and t.startswith("http"): return "url"
    if c == "#c00000" and s in (14,15,17) and re.match(r"^[a-z0-9\-_%.=?&/]+$", t) : return "url_cont"
    return "body"
