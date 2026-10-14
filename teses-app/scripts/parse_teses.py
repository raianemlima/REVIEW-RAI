#!/usr/bin/env python3
"""Converte o PDF 'Teses de Repercussão Geral e Recursos Repetitivos' em JSON estruturado.

Uso: python3 scripts/parse_teses.py caminho/do/arquivo.pdf [saida_dir]
Requer: poppler-utils (pdftohtml). Sem dependências Python externas.
"""
import json, re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from extract_lines import lines_from_pdf

def classify(l):
    s, c, t = l["size"], l["color"], l["text"]
    if s == 36 and l["fam"].startswith("Noto") : return "chap"
    if c == "#c83e43" and s == 19: return "title"
    if c == "#c83e43" and s in (18, 21): return "heading"
    if c == "#c00000" and ("http" in t or re.fullmatch(r"[A-Za-z0-9\-_%.=?&/:]+", t)): return "url"
    return "body"

def dehyph_join(parts):
    out = ""
    for p in parts:
        if out.endswith("-") and len(out) > 1 and out[-2].isalpha() and p[:1].islower():
            out = out[:-1] + p
        else:
            out = (out + " " + p).strip()
    return out

SRC = re.compile(r"^(STF|STJ)\b[.,]")
# Abreviações que terminam em ponto mas não encerram parágrafo (ex.: "art.\n201").
ABBR = re.compile(r"(?:^|[\s(])(?:arts?|incs?|n|nº|al|p|pp|fls?|Min|Rel|Des|Dr|Dra|Sr|Sra|cf|ex|v\.g|i\.e|e\.g)\.$", re.I)

def paragraphs(lines):
    """Junta linhas em parágrafos. Citações (STF./STJ.) viram parágrafo próprio e só
    terminam quando fecham parênteses (Info/Tema), para não quebrar em 'Rel.' ou 'Min.'."""
    paras, cur = [], []
    for t in lines:
        in_src = bool(cur) and bool(SRC.match(cur[0]))
        if cur:
            if in_src:
                if re.search(r"\)\.?$", cur[-1]):
                    paras.append(dehyph_join(cur)); cur = []
            elif SRC.match(t) or (re.search(r"[.:;!?”\"]$", cur[-1]) and not ABBR.search(cur[-1]) and re.match(r"^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9“\"(]", t)):
                paras.append(dehyph_join(cur)); cur = []
        cur.append(t)
    if cur: paras.append(dehyph_join(cur))
    return [p for p in paras if p.strip()]

def main(pdf, outdir="data"):
    L = lines_from_pdf(pdf)
    chapter = section = sub = None
    chapters, sections, subs = [], [], []
    teses = []
    cur = None
    pending_head = None   # heading em montagem (pode quebrar em 2 linhas)
    chap_buf = []

    def flush_thesis():
        nonlocal cur
        if cur: teses.append(cur); cur = None

    def commit_head(h):
        nonlocal chapter, section, sub
        m3 = re.match(r"^(\d+)\.(\d+)\.(\d+)\.\s*(.*)$", h)
        m2 = re.match(r"^(\d+)\.(\d+)\.\s*(.*)$", h)
        if m3:
            sub = {"num": f"{m3[1]}.{m3[2]}.{m3[3]}", "titulo": m3[4].strip()}; subs.append(sub)
        elif m2:
            section = {"num": f"{m2[1]}.{m2[2]}", "titulo": m2[3].strip()}; sections.append(section); sub = None

    started = False
    for l in L:
        k = classify(l)
        t = l["text"]
        if k == "chap":
            if l["page"] < 7: continue
            if t.startswith("Cap."):
                flush_thesis(); chap_buf = [t]; started = True
                chapter = {"num": int(re.search(r"\d+", t)[0]), "titulo": ""}; chapters.append(chapter)
                section = sub = None
            elif started and chap_buf:
                chapter["titulo"] = (chapter["titulo"] + " " + t).strip()
            continue
        if not started: continue
        if k == "heading":
            if t.startswith("TESES DE REPERCUSS"): continue
            if re.match(r"^\d+\.\d+", t):
                flush_thesis()
                pending_head = t
                commit_head(t)
            elif pending_head is not None:   # continuação da linha anterior
                pending_head = pending_head + " " + t
                target = sub if (sub and re.match(r"^\d+\.\d+\.\d+", pending_head)) else section
                if target is not None:
                    target["titulo"] = dehyph_join([target["titulo"], t])
            elif chapter is not None and not section:
                chapter["titulo"] = (chapter["titulo"] + " " + t).strip()
            continue
        if k == "title":
            if cur and not cur["_body"] and not cur["_url"]:
                cur["titulo"] = dehyph_join([cur["titulo"], t])
            else:
                flush_thesis()
                cur = {"capitulo": chapter["num"] if chapter else None,
                       "secao": section["num"] if section else None,
                       "subsecao": sub["num"] if sub else None,
                       "titulo": t, "_body": [], "_url": [], "pagina": l["page"]}
            continue
        if cur is None:
            # texto solto logo após cabeçalho (sem título de tese)
            cur = {"capitulo": chapter["num"] if chapter else None,
                   "secao": section["num"] if section else None,
                   "subsecao": sub["num"] if sub else None,
                   "titulo": None, "_body": [], "_url": [], "pagina": l["page"]}
        if k == "url": cur["_url"].append(t)
        else:
            if cur["_url"]:  # texto após URL => continua a mesma tese (ex.: ressalvas), mantém
                pass
            cur["_body"].append(t)
    flush_thesis()

    # pós-processamento
    out = []
    for i, th in enumerate(teses, 1):
        body = []
        for ln in th["_body"]:
            body += [x for x in re.split(r"(?<=[.)”\"]) (?=(?:STF|STJ)[.,] (?:Plenário|Pleno|Corte|[1-6]ª|Primeira|Segunda|Terceira|Quarta|Quinta|Sexta|Turma|Seção|Decisão))", ln) if x]
        paras = paragraphs(body)
        fontes = [p for p in paras if SRC.match(p)]
        texto = [p for p in paras if p not in fontes]
        urls = "".join(th["_url"])
        links = re.findall(r"https?://[^\s]+?(?=https?://|$)", urls)
        links = [u.rstrip("?") for u in links]
        full = " ".join(fontes)
        info = sorted({int(x) for x in re.findall(r"Info(?:s)?\s*(\d+)", full)})
        temas = re.findall(r"Tema\s*(?:n\.?º\s*)?(\d[\d.]*)", full)
        tribunais = sorted({m for m in re.findall(r"\b(STF|STJ)\b", " ".join(f[:4] for f in fontes))})
        out.append({"id": i, "capitulo": th["capitulo"], "secao": th["secao"], "subsecao": th["subsecao"],
                    "pagina": th["pagina"], "titulo": th["titulo"], "texto": "\n\n".join(texto),
                    "fontes": fontes, "tribunais": tribunais, "temas": temas, "info": info,
                    "link_dizerodireito": next((u for u in links if "dizerodireito" in u), None),
                    "link_oficial": next((u for u in links if "dizerodireito" not in u), None)})
    os.makedirs(outdir, exist_ok=True)
    estrutura = {"capitulos": chapters, "secoes": sections, "subsecoes": subs}
    json.dump({"estrutura": estrutura, "teses": out}, open(os.path.join(outdir, "teses.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    with open(os.path.join(outdir, "teses.jsonl"), "w", encoding="utf8") as f:
        for r in out: f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"capítulos={len(chapters)} seções={len(sections)} subseções={len(subs)} teses={len(out)}")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "data")
