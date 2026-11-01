"""Extrai questões objetivas de cadernos do Cebraspe (PDF público) e cruza com o gabarito definitivo.

    python ferramentas/conteudo/questoes/cebraspe.py CACHE/ SAIDA/ TJ_CE_23_SERVIDOR:TJCE:2023 MP_BA_23_PROMOTOR:MPBA:2023 ...

Cada argumento é  <identificador do concurso em cebraspe.org.br/concursos>:<SIGLA>:<ANO>.
Os arquivos vêm da API pública do próprio site (apis.cebraspe.org.br/cebraspe/eventos/<id>) e do CDN
(cdn.cebraspe.org.br/concursos/<id>/arquivos/). Em cada concurso, "PROVA OBJETIVA - ..." casa com
"GABARITO DEFINITIVO - ..." pelo mesmo sufixo; um cargo junta os conhecimentos gerais (comuns) e os específicos dele.
Gabarito "X" = anulada. Itens Certo/Errado ficam com alternativas C e E (Certo/Errado). Texto-base e figuras não são
extraídos: questões que dependem deles levam "imagem": true para a tela avisar.
"""
import json
import re
import sys
import time
import unicodedata
import urllib.request
from pathlib import Path

import pymupdf

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}
API = "https://apis.cebraspe.org.br/cebraspe/eventos/"
CDN = "https://cdn.cebraspe.org.br/concursos/"
ALT = re.compile(r"^([A-E])\s+(\S.*)$")
LETRAS = "ABCDE"
FIGURA = re.compile(r"(?i)\b(figura|gr[aá]fico|tabela|quadro|imagem|tirinha|charge|fluxograma|planilha)\b")
TEXTO = re.compile(r"Texto\s+([A-Z0-9][A-Z0-9-]*)\s*")


def get(url, arq=None, tentativas=3):
    if arq and arq.exists() and arq.stat().st_size > 500:
        return arq.read_bytes()
    for i in range(tentativas):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                d = r.read()
            if arq:
                arq.write_bytes(d)
            time.sleep(0.25)
            return d
        except Exception:
            time.sleep(2 * (i + 1))
    return None


def sem_acento(t):
    return "".join(c for c in unicodedata.normalize("NFD", t.lower()) if unicodedata.category(c) != "Mn")


def gabarito(pdf):
    """{n: letra}; X = anulada. A página traz a coluna dos números e, em seguida, a das respostas, em blocos de até 20."""
    res = {}
    for pag in pymupdf.open(pdf):
        L = [l.strip() for l in pag.get_text().splitlines() if l.strip()]
        i = 0
        while i < len(L):
            nums = []
            while i < len(L) and re.fullmatch(r"\d{1,3}", L[i]) and L[i] != "0":
                nums.append(int(L[i])); i += 1
            if len(nums) >= 2:
                while i < len(L) and L[i] == "0":   # bloco curto (último): a tabela preenche com zeros antes das respostas
                    i += 1
                letras = []
                while i < len(L) and len(letras) < len(nums) and re.fullmatch(r"[A-EX]", L[i]):
                    letras.append(L[i]); i += 1
                if len(letras) == len(nums):
                    res.update(zip(nums, letras))
                    continue
            i += 1
    return res


def itens_ce(L, disciplina):
    """Prova de itens Certo/Errado: "51 Texto do item." numerados em sequência, com enunciados "Julgue os itens..." entre eles."""
    pos, esp = [], None
    for i, s in enumerate(L):
        m = re.match(r"^(\d{1,3})\s+(\S.*)$", s)
        if not m:
            continue
        n = int(m.group(1))
        if esp is None:
            if any(re.search(r"(?i)\bjulgue", x) for x in L[max(0, i - 6):i]):
                esp = n
            else:
                continue
        if n == esp:
            pos.append((i, n)); esp = n + 1
    out, lead, base = [], "", None
    for k, (i, n) in enumerate(pos):
        fim = pos[k + 1][0] if k + 1 < len(pos) else len(L)
        raw = [x for x in L[i:fim] if not re.fullmatch(r"-- .+ --", x)]
        if not raw:
            continue
        raw[0] = re.sub(r"^\d{1,3}\s+", "", raw[0])
        corpo, novo_lead, nova_base = raw, None, None
        jul = [t for t, x in enumerate(raw) if t > 0 and re.search(r"(?i)\bjulgue", x)]
        if jul:
            s0 = jul[-1]
            while s0 > 1 and not raw[s0 - 1].rstrip().endswith((".", "?", ":", ";")):
                s0 -= 1
            corpo, novo_lead = raw[:s0], " ".join(raw[s0:])
            mh = [t for t, x in enumerate(corpo) if t > 0 and TEXTO.fullmatch(x)]
            if mh:
                h = mh[-1]
                nova_base = (TEXTO.fullmatch(corpo[h]).group(1), " ".join(corpo[h + 1:]))
                corpo = corpo[:h]
        item = re.sub(r"\s+", " ", " ".join(corpo)).strip()
        item = re.sub(r"(\s*Espaço livre)+\s*$", "", item).strip()
        usa_base = base and re.search(rf"(?<![A-Z0-9-]){re.escape(base[0])}(?![A-Z0-9-])", lead)
        pre = (f"Texto {base[0]}\n{re.sub(chr(32) + '+', ' ', base[1])}\n\n" if usa_base else "") + (lead + "\n" if lead else "")
        sem_texto = bool(re.search(r"(?i)\btextos?\s+[A-Z0-9]*\d[A-Z0-9-]*", lead + item)) and not usa_base
        out.append({"n": n, "disciplina": disciplina, "enunciado": pre + item,
                    "alternativas": {"C": "Certo", "E": "Errado"},
                    "imagem": sem_texto or bool(FIGURA.search(lead + item))})
        if novo_lead is not None:
            lead = re.sub(r"\s+", " ", novo_lead).strip()
        if nova_base:
            base = nova_base
    return out


def separar(lin):
    """(linhas do enunciado, {letra: texto}). A alternativa A é a última linha "A ..." precedida de linha em branco que ainda
    tem B, C, D e E depois dela; sem isso, um enunciado que começa com "A medida..." viraria alternativa."""
    idx = {l: [i for i, s in enumerate(lin) if (m := ALT.match(s)) and m.group(1) == l] for l in LETRAS}
    for n in (5, 4):
        candidatas = [i for i in idx["A"] if i == 0 or lin[i - 1] == ""] or idx["A"]
        for a in reversed(candidatas):
            pos = [a]
            for l in LETRAS[1:n]:
                prox = next((i for i in idx[l] if i > pos[-1]), None)
                if prox is None:
                    break
                pos.append(prox)
            if len(pos) == n:
                alts = {}
                for k, ini in enumerate(pos):
                    fim = pos[k + 1] if k + 1 < n else len(lin)
                    alts[LETRAS[k]] = " ".join([ALT.match(lin[ini]).group(2)] + [x for x in lin[ini + 1:fim] if x])
                return [x for x in lin[:a] if x], alts
    return [x for x in lin if x], {}


def caderno(pdf, disciplina):
    doc = pymupdf.open(pdf)
    pags = [p.get_text() for p in doc]
    freq = {}
    for t in pags:
        for s in {l.strip() for l in t.splitlines() if l.strip()}:
            freq[s] = freq.get(s, 0) + 1
    # linhas de alternativa repetem entre questões ("E Todos os itens estão certos."): não são cabeçalho
    cab = {s for s, n in freq.items() if n >= max(3, len(pags) // 2) and not re.fullmatch(r"Quest[ãa]o \d+", s) and not ALT.match(s)}
    L = [l.strip() for t in pags for l in t.splitlines()]
    L = [l for l in L if l not in cab and not re.fullmatch(r"\d{10,}\s*", l) and not re.match(r"(?i)^CEBRASPE\s*[–-]", l)]
    if not any(re.fullmatch(r"Quest[ãa]o \d+", s) for s in L):
        return itens_ce([l for l in L if l], disciplina)
    qs, atual, bases, cod = [], None, {}, None
    for s in L:
        m = re.fullmatch(r"Quest[ãa]o (\d+)", s)
        mt = TEXTO.fullmatch(s)
        if m:
            cod = None
            if atual:
                qs.append(atual)
            atual = {"n": int(m.group(1)), "linhas": []}
        elif re.fullmatch(r"-- .+ --", s):
            cod = None
        elif mt and (atual is None or atual["linhas"]):
            cod = mt.group(1); bases[cod] = []
        elif cod:
            bases[cod].append(s)
        elif atual is not None:
            atual["linhas"].append(s)
    if atual:
        qs.append(atual)
    bases = {c: re.sub(r"\s+", " ", " ".join(v)).strip() for c, v in bases.items() if v}
    out = []
    for q in qs:
        enun, alts = separar(q["linhas"])
        txt = re.sub(r"\s+", " ", " ".join(enun)).strip()
        usados = [c for c in bases if re.search(rf"(?<![A-Z0-9-]){re.escape(c)}(?![A-Z0-9-])", txt)]
        falta = bool(re.search(r"(?i)textos?\s+[A-Z0-9]*\d[A-Z0-9-]*", txt)) and not usados
        corpo = "".join(f"Texto {c}\n{bases[c]}\n\n" for c in usados) + txt
        out.append({"n": q["n"], "disciplina": disciplina, "enunciado": corpo,
                    "alternativas": {k: re.sub(r"\s+", " ", v).strip() for k, v in alts.items()},
                    "imagem": falta or bool(FIGURA.search(txt))})
    return out


def evento(ident, cache):
    d = get(API + ident, cache / f"api-{ident}.json")
    return json.loads(d) if d else None


def chave(rotulo):
    """Rótulo sem 'PROVA OBJETIVA'/'GABARITO DEFINITIVO' e sem pontuação, para casar prova e gabarito."""
    r = sem_acento(rotulo)
    r = re.sub(r"gabarito definitivo|gabarito oficial definitivo|prova objetiva", " ", r)
    return re.sub(r"[^a-z0-9]+", " ", r).strip()


def arquivos(ev):
    """Pares (rótulo do bloco, prova, gabarito) a partir da lista de arquivos do concurso."""
    arqs = ev.get("arquivosGabarito") or []
    provas = [a for a in arqs if re.match(r"(?i)PROVA OBJETIVA|PROVA PREAMBULAR", a["descricaoArquivo"])]
    gabs = {chave(a["descricaoArquivo"]): a for a in arqs if re.match(r"(?i)GABARITO (OFICIAL )?DEFINITIVO", a["descricaoArquivo"])}
    out = []
    for p in provas:
        rot = re.sub(r"(?i)^(PROVA OBJETIVA|PROVA PREAMBULAR)\s*[-–]?\s*", "", p["descricaoArquivo"]).strip()
        g = gabs.get(chave(p["descricaoArquivo"]))
        if g is None and len(gabs) == 1:   # prova objetiva única
            g = next(iter(gabs.values()))
        out.append((rot, p, g))
    return out


def processar(ident, sigla, ano, cache, saida, rel):
    ev = evento(ident, cache)
    if not ev:
        rel.append((ident, "API sem resposta")); return
    pares = arquivos(ev)
    if not pares:
        rel.append((ident, "sem prova objetiva + gabarito definitivo na lista de arquivos")); return
    nome = {}
    for k, c in enumerate(ev.get("eventoCargos") or [], 1):
        txt = str(c.get("area") or c.get("cargoNome") or c.get("nome") or "")
        m = re.match(r"\s*cargo\s*(\d+)\s*[:.-]\s*(.*)", txt, re.I)
        nome[str(int(m.group(1))) if m else str(k)] = (m.group(2) if m else txt).strip()
    feitos = 0
    for rot, p, g in pares:
        # conhecimentos gerais (português, informática...) não são área jurídica: não entram
        if re.search(r"(?i)gerais|b[aá]sicos|comuns", rot) and not re.search(r"(?i)cargo\s*\d", rot):
            continue
        if not g:
            rel.append((ident, f"{rot or 'prova objetiva'}: sem gabarito definitivo")); continue
        pdf = cache / f"{ident}-{p['nomeArquivo']}"
        gp = cache / f"{ident}-{g['nomeArquivo']}"
        if not get(CDN + f"{ident}/arquivos/{p['nomeArquivo']}", pdf) or not get(CDN + f"{ident}/arquivos/{g['nomeArquivo']}", gp):
            rel.append((ident, f"{rot}: download falhou")); continue
        bloco = re.sub(r"(?i)\s*[-–]\s*cargo.*$", "", rot).strip().title() or "Prova Objetiva"
        try:
            qs, gb = caderno(str(pdf), bloco), gabarito(str(gp))
        except Exception as e:
            rel.append((ident, f"{rot}: erro {e}")); continue
        for q in qs:
            q["gabarito"] = gb.get(q["n"], "")
            q["anulada"] = q["gabarito"] == "X"
        # itens Certo/Errado só entram quando o bloco é de conhecimentos específicos: sem rótulo de matéria não dá para
        # separar o que é jurídico (a prova do MPSC 2023, por exemplo, mistura Português nos mesmos itens)
        if qs and set(qs[0]["alternativas"]) == {"C", "E"} and not re.search(r"(?i)espec[ií]ficos", rot):
            rel.append((ident, f"{rot or 'prova objetiva'}: itens Certo/Errado sem separação por disciplina")); continue
        ruim = [q["n"] for q in qs if not q["gabarito"] or len(q["alternativas"]) not in (2, 5)]
        if len(qs) < 5 or len(ruim) > len(qs) * 0.1:
            rel.append((ident, f"{rot or 'prova objetiva'}: {len(qs)} questões, {len(ruim)} problemáticas {ruim[:8]}")); continue
        qs = [q for q in qs if q["n"] not in ruim]   # questão sem alternativas completas ou sem gabarito não é enviada
        cargo = (re.search(r"(?i)cargo\s*(\d+)", rot) or [None, ""])[1]
        titulo = nome.get(cargo) or (next(iter(nome.values())) if len(nome) == 1 else "") or ev.get("eventoNomeCompleto") or ev.get("eventoNomeAbreviado")
        dest = saida / f"{ident.lower()}-{re.sub(r'[^a-z0-9]+', '-', sem_acento(titulo)).strip('-')[:60] or 'prova'}-{cargo or chave(rot).replace(' ', '-') or feitos}.json"
        dest.write_text(json.dumps({"concurso": ident, "orgao": sigla, "banca": "Cebraspe", "ano": int(ano), "cargo": titulo, "tipo": None,
                                    "fonte": f"https://www.cebraspe.org.br/concursos/{ident}", "questoes": qs}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f"  ok {ident} · {titulo} [{rot or 'prova objetiva'}]: {len(qs)} questões, {sum(x['anulada'] for x in qs)} anuladas", flush=True)
        feitos += 1


def main():
    a = sys.argv[1:]
    if len(a) < 3:
        sys.exit(__doc__)
    cache, saida = Path(a[0]), Path(a[1])
    cache.mkdir(parents=True, exist_ok=True)
    saida.mkdir(parents=True, exist_ok=True)
    rel = []
    for arg in a[2:]:
        ident, sigla, ano = arg.split(":")
        processar(ident, sigla, ano, cache, saida, rel)
    print("\nRELATÓRIO (não processados):")
    for r in rel:
        print("  ", *r)


if __name__ == "__main__":
    main()
