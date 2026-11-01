"""Extrai questões objetivas de cadernos de prova da FGV (PDF público) e cruza com o gabarito definitivo.

    python ferramentas/conteudo/questoes/fgv.py PROVA.pdf GABARITO.pdf "Técnico Judiciário" 1 [--meta chave=valor ...]  > saida.json

PROVA.pdf       caderno Tipo N de UM cargo (baixado da página do concurso em conhecimento.fgv.br/concursos/<slug>)
GABARITO.pdf    gabarito definitivo do concurso (vários cargos e tipos); a seção é escolhida por cargo e tipo
Anuladas ficam com "gabarito": "*" e "anulada": true. Questões com figura/quadro não têm a imagem extraída:
levam "imagem": true para a tela avisar. Requer pymupdf.
"""
import json
import re
import sys
import unicodedata

import pymupdf

LETRAS = "ABCDE"
CAB = re.compile(r"(TRIBUNAL|FGV CONHECIMENTO|PROVA TIPO|PÁGINA \d+|Página \d+ de|CONCURSO PÚBLICO|^\d+\s*$)", re.I)
ALT = re.compile(r"^\(([A-E])\)\s*(.*)")
DISC = re.compile(r"^[A-ZÀ-Ú][A-ZÀ-Ú0-9 ,\-–/.()]{7,90}$")


def sem_acento(t):
    return "".join(c for c in unicodedata.normalize("NFD", t.lower()) if unicodedata.category(c) != "Mn")


def linhas(pdf, ini=0):
    doc = pymupdf.open(pdf)
    out = []
    for p in list(doc)[ini:]:
        out += [l.rstrip() for l in p.get_text().splitlines()]
    return out


def gabarito(pdf, cargo, tipo):
    """{n: letra}; '*' = anulada. Cabeçalho '<cargo> - TIPO n', depois blocos de números e de letras."""
    alvo = re.compile(rf"^{re.escape(sem_acento(cargo))}\s*-?\s*tipo\s*{tipo}\s*$")
    L = [l.strip() for l in linhas(pdf)]
    res, i = {}, 0
    while i < len(L):
        if alvo.match(sem_acento(L[i])):
            i += 1
            while i < len(L) and not re.search(r"(?i)\btipo\s*\d\s*$", L[i]) and not L[i].startswith("(*)"):
                nums = []
                while i < len(L) and re.fullmatch(r"\d{1,3}", L[i]):
                    nums.append(int(L[i])); i += 1
                letras = []
                while i < len(L) and len(letras) < len(nums) and re.fullmatch(r"[A-E]|\(?\*\)?|X", L[i]):
                    letras.append("*" if L[i] in ("(*)", "*", "X") else L[i]); i += 1
                if not nums or len(letras) != len(nums):
                    break
                res.update(zip(nums, letras))
            return res
        i += 1
    return res


TITULO = "\x01"   # marca de linha de título de bloco (disciplina) no texto de uma página


def texto_marcado(pagina):
    """Texto da página, uma linha por linha do PDF; títulos de bloco (fonte grande em negrito) levam a marca TITULO."""
    out = []
    for b in pagina.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            sp = [s for s in l["spans"] if s["text"].strip()]
            if not sp:
                continue
            txt = "".join(s["text"] for s in l["spans"]).strip()
            grande = max(s["size"] for s in sp) >= 11.5 and all("Bold" in s["font"] or s["flags"] & 16 for s in sp)
            out.append((TITULO if grande else "") + txt)
    return "\n".join(out)


def nome_disciplina(t):
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"(?i)^bloco [IVXLC]+\s*[:\-–]?\s*", "", t)
    if t.isupper():
        t = t.title().replace(" E ", " e ").replace(" Do ", " do ").replace(" De ", " de ").replace(" Da ", " da ")
    return t


def caderno(pdf, cargo=""):
    doc = pymupdf.open(pdf)
    pags = [texto_marcado(p) for p in doc]
    # o enunciado começa na primeira página que já traz alternativas; antes vêm capa e instruções
    ini = next((k for k, t in enumerate(pags) if re.search(r"^\(A\)", t, re.M)), 0)
    corpo = pags[ini:]
    # cabeçalho/rodapé de página: linha que se repete em boa parte das páginas (o texto muda de prova para prova)
    freq = {}
    for t in corpo:
        for s in {l.strip() for l in t.splitlines() if l.strip()}:
            freq[s] = freq.get(s, 0) + 1
    limite = max(3, len(corpo) // 2)
    cab = {s for s, n in freq.items() if n >= limite and not ALT.match(s) and not re.fullmatch(r"\d{1,3}", s)}
    L = [l for t in corpo for l in t.splitlines()]
    L = [l for l in L if l.strip() and l.strip() not in cab and not re.match(r"^(TRIBUNAL|FGV CONHECIMENTO|.*P[ÁA]GINA \d+\s*$|-{5,})", l.strip(), re.I)]
    qs, atual, esperado, disc, titulo = [], None, 1, "", []
    L = [l.strip() for l in L]
    for k, s in enumerate(L):
        if s.startswith(TITULO):   # título de bloco (fonte grande em negrito): vale para as questões seguintes
            titulo.append(s[len(TITULO):].strip())
            continue
        if titulo:
            disc = nome_disciplina(" ".join(titulo)); titulo = []
        if re.fullmatch(r"\d{1,3}", s) and int(s) == esperado:
            if atual:
                qs.append(atual)
            atual = {"n": esperado, "disciplina": disc, "linhas": []}
            esperado += 1
            continue
        # título de bloco: linha toda em maiúsculas logo antes do número da próxima questão
        prox = next((x for x in L[k + 1:k + 3] if x), "")
        if DISC.match(s) and s == s.upper() and not ALT.match(s) and re.fullmatch(r"\d{1,3}", prox) and int(prox) == esperado:
            if True:
                disc = s.title().replace(" E ", " e ").replace(" Do ", " do ").replace(" De ", " de ").replace(" Da ", " da ")
            continue
        if atual is not None:
            atual["linhas"].append(s)
    if atual:
        qs.append(atual)
    out = []
    for q in qs:
        enun, alts, cur = [], {}, None
        for s in q["linhas"]:
            m = ALT.match(s)
            if m:
                cur = m.group(1); alts[cur] = m.group(2)
            elif cur:
                alts[cur] += " " + s
            else:
                enun.append(s)
        # erro de diagramação da prova: "C) texto" sem parênteses cai dentro da alternativa anterior
        for k, l in enumerate(LETRAS[:-1]):
            prox = LETRAS[k + 1]
            if l in alts and prox not in alts:
                m = re.search(rf"\s{prox}\)\s+(.*)$", alts[l])
                if m:
                    alts[prox], alts[l] = m.group(1), alts[l][:m.start()]
        txt = re.sub(r"\s+", " ", " ".join(enun)).strip()
        out.append({"n": q["n"], "disciplina": q["disciplina"], "enunciado": txt,
                    "alternativas": {k: re.sub(r"\s+", " ", alts[k]).strip() for k in sorted(alts)},
                    "imagem": bool(re.search(r"(?i)\b(figura|imagem|gr[aá]fico|tirinha|charge|quadro abaixo|tabela abaixo)\b", txt))})
    return out


def main():
    a = [x for x in sys.argv[1:] if not x.startswith("--meta")]
    meta = dict(m.split("=", 1) for m in sys.argv[sys.argv.index("--meta") + 1:]) if "--meta" in sys.argv else {}
    if len(a) < 4:
        sys.exit(__doc__)
    prova, gab, cargo, tipo = a[0], a[1], a[2], int(a[3])
    qs, g = caderno(prova, cargo), gabarito(gab, cargo, tipo)
    for q in qs:
        q["gabarito"] = g.get(q["n"], "")
        q["anulada"] = q["gabarito"] == "*"
    json.dump({**meta, "cargo": cargo, "tipo": tipo, "questoes": qs}, sys.stdout, ensure_ascii=False, indent=1)
    falta = [q["n"] for q in qs if not q["gabarito"]]
    inval = [q["n"] for q in qs if len(q["alternativas"]) != 5]
    print(f"\n{len(qs)} questões; sem gabarito: {falta}; sem 5 alternativas: {inval}", file=sys.stderr)


if __name__ == "__main__":
    main()
