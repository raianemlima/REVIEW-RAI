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


# cabeçalhos de seção do gabarito: "Cargo - TIPO 1", "Cargo – Tipo 1", "Cargo - PROVA TIPO 1", "Cargo – PROVA 1",
# "Cargo - 1 - Turno Tarde" (o número é o tipo da prova)
CAB_GAB = [
    re.compile(r"^(?P<c>.+?)\s*[-–]\s*(?:prova\s+tipo|prova|tipo)\s*(?P<t>\d)\s*(?:[-–]\s*turno\s+\S+)?\s*$", re.I),
    re.compile(r"^(?P<c>.+?)\s*[-–]\s*(?P<t>\d)\s*[-–]\s*turno\s+\S+\s*$", re.I),
]
RESP = r"[A-E]|\(?\*\)?|X"


def cabecalho_gab(linha):
    if len(linha) > 150:
        return None
    for r in CAB_GAB:
        m = r.match(linha)
        if m:
            return re.sub(r"\s+", " ", m.group("c")).strip(" -–"), int(m.group("t"))
    return None


def _letra(t):
    return "*" if t in ("(*)", "*", "X") else t


def _ler_secao(tk):
    """{n: letra} de uma seção. Dois layouts: pares alternados (n, letra, n, letra...) ou blocos de números seguidos
    dos blocos de letras (a tabela em colunas, com zeros de preenchimento nos blocos curtos)."""
    res = {}
    if len(tk) >= 2 and re.fullmatch(r"\d{1,3}", tk[0]) and re.fullmatch(RESP, tk[1]):
        i = 0
        while i + 1 < len(tk):
            if re.fullmatch(r"\d{1,3}", tk[i]) and re.fullmatch(RESP, tk[i + 1]):
                res[int(tk[i])] = _letra(tk[i + 1]); i += 2
            else:
                i += 1
        return res
    i = 0
    while i < len(tk):
        nums = []
        while i < len(tk) and re.fullmatch(r"\d{1,3}", tk[i]) and tk[i] != "0":
            nums.append(int(tk[i])); i += 1
        while i < len(tk) and tk[i] == "0" and nums:
            i += 1
        letras = []
        while i < len(tk) and len(letras) < len(nums) and re.fullmatch(RESP, tk[i]):
            letras.append(_letra(tk[i])); i += 1
        if nums and len(letras) == len(nums):
            res.update(zip(nums, letras))
        elif not nums:
            i += 1
        else:
            break
    return res


def secoes(pdf):
    """{(cargo sem acento, tipo): (cargo, {n: letra})} de todas as seções do gabarito."""
    sec, atual = {}, None
    for l in (x.strip() for x in linhas(pdf)):
        if not l:
            continue
        h = cabecalho_gab(l)
        if h:
            atual = (sem_acento(h[0]), h[1])
            sec.setdefault(atual, [h[0], []])
        elif atual:
            sec[atual][1].append(l)
    return {k: (v[0], _ler_secao(v[1])) for k, v in sec.items()}


def gabarito(pdf, cargo, tipo):
    """{n: letra}; '*' = anulada."""
    s = secoes(pdf).get((sem_acento(cargo), tipo))
    return dict(s[1]) if s else {}


TITULO = "\x01"   # marca de linha de título de bloco (disciplina) no texto de uma página
NUMERO = "\x02"   # marca de linha só com número em negrito (número de questão; um "2" solto no meio do texto não é)


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
            negrito = all("Bold" in s["font"] or s["flags"] & 16 for s in sp)
            out.append((TITULO if grande else NUMERO if negrito and re.fullmatch(r"\d{1,3}", txt) else "") + txt)
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
    usa_negrito = any(s.startswith(NUMERO) for s in L)

    def numero(s):
        if s.startswith(NUMERO):
            s = s[len(NUMERO):]
        elif usa_negrito:
            return None
        return int(s) if re.fullmatch(r"\d{1,3}", s) else None

    for k, s in enumerate(L):
        if s.startswith(TITULO):   # título de bloco (fonte grande em negrito): vale para as questões seguintes
            titulo.append(s[len(TITULO):].strip())
            continue
        if titulo:
            disc = nome_disciplina(" ".join(titulo)); titulo = []
        if numero(s) == esperado:
            if atual:
                qs.append(atual)
            atual = {"n": esperado, "disciplina": disc, "linhas": []}
            esperado += 1
            continue
        # título de bloco: linha toda em maiúsculas logo antes do número da próxima questão
        prox = next((x for x in L[k + 1:k + 3] if x), "")
        if DISC.match(s) and s == s.upper() and not ALT.match(s) and numero(prox) == esperado:
            if True:
                disc = s.title().replace(" E ", " e ").replace(" Do ", " do ").replace(" De ", " de ").replace(" Da ", " da ")
            continue
        if atual is not None:
            atual["linhas"].append(s.lstrip(NUMERO))
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
