"""Coleta os Informativos do STF e do STJ (texto oficial público) e gera JSON para a aba Informativos.

    python ferramentas/conteudo/informativos/coletar.py CACHE/ SAIDA/ [--desde 2024-01-01]

- STF: https://www.stf.jus.br/arquivo/informativo/documento/informativo<N>.htm
- STJ: https://processo.stj.jus.br/jurisprudencia/externo/informativo/?acao=pesquisarumaedicao&livre=<NNNN>

CACHE guarda o HTML baixado (fora do repositório, para não rebaixar). SAIDA recebe um JSON por tribunal e
ano (stf-2024.json, stj-2025.json...) e o indice.json. Os dois tribunais publicam texto oficial, sem marca
d'água nem dado pessoal. Requer beautifulsoup4 e lxml.
"""
import json
import re
import sys
import time
import urllib.request
from datetime import date
from pathlib import Path

from bs4 import BeautifulSoup

UA = {"User-Agent": "Mozilla/5.0"}
MESES = {m: i + 1 for i, m in enumerate(
    "janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro".split())}
DATA_EXT = re.compile(r"(\d{1,2})º? de (\w+) (?:de )?(\d{4})", re.I)


def baixar(url, arq, tentativas=3):
    if arq.exists() and arq.stat().st_size > 2000:
        return arq.read_bytes()
    for i in range(tentativas):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                dados = r.read()
            arq.write_bytes(dados)
            time.sleep(0.3)
            return dados
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            time.sleep(2 * (i + 1))
        except Exception:
            time.sleep(2 * (i + 1))
    return None


def data_iso(txt):
    m = DATA_EXT.search(txt or "")
    if not m or m.group(2).lower() not in MESES:
        return ""
    return date(int(m.group(3)), MESES[m.group(2).lower()], int(m.group(1))).isoformat()


def limpa(t):
    return re.sub(r"\s+", " ", (t or "").replace("\xa0", " ")).strip()


# ---------------------------------------------------------------- STJ
def parse_stj(html, n):
    s = BeautifulSoup(html, "lxml")
    blocos = s.select(".clsInformativoBlocoItem")
    if not blocos:
        return None
    ed = {"tribunal": "STJ", "info": n, "data": "", "itens": []}
    atual, orgao = None, ""
    for b in blocos:
        t = b.select_one(".clsInformativoTitulo")
        if t:  # a página traz outras edições (destaques); cada bloco diz a sua
            tit = limpa(t.get_text(" "))
            m = re.match(r"Informativo\s*n[ºo°]\.?\s*(\d+)", tit)
            atual = int(m.group(1)) if m else None
            if atual == n and not ed["data"]:
                ed["data"] = data_iso(tit)
        if atual != n:
            continue
        og = b.select_one(".clsInformativoOrgaojulgador")
        if og:
            orgao = limpa(og.get_text(" ")).title()
        it = {"orgao": orgao}
        rotulo = None
        for lin in b.select(".divLinha"):
            lab = lin.select_one(".clsInformativoLabel")
            txt = lin.select_one(".clsInformativoTexto, .clsInformativoTextoFormatado")
            if lab and limpa(lab.get_text(" ")):
                rotulo = limpa(lab.get_text(" "))
                if txt is None:
                    continue
            if txt is None or rotulo is None:
                continue
            valor = limpa(txt.get_text(" "))
            chave = {"Processo": "processo", "Ramo do Direito": "ramo", "Tema": "tema", "Destaque": "tese",
                     "Informações do Inteiro Teor": "resumo", "Informações Adicionais": "adicionais"}.get(rotulo)
            if chave and valor:
                it[chave] = it[chave] + (" | " if chave == "adicionais" else " ") + valor if chave in it else valor
        if it.get("tema") or it.get("tese"):
            ed["itens"].append(it)
    return ed if ed["itens"] else None


def coleta_stj(cache, desde, parar_apos_falhas=3):
    eds, n, falhas = [], 920, 0
    # procura a edição mais nova descendo até achar uma que exista
    while n > 700:
        arq = cache / f"stj{n:04d}.html"
        h = baixar(f"https://processo.stj.jus.br/jurisprudencia/externo/informativo/?acao=pesquisarumaedicao&livre={n:04d}", arq)
        ed = parse_stj(h.decode("latin-1"), n) if h else None
        if ed is None:
            arq.unlink(missing_ok=True)
            if eds:
                falhas += 1
                if falhas >= parar_apos_falhas:
                    break
            n -= 1
            continue
        falhas = 0
        if ed["data"] and ed["data"] < desde:
            break
        eds.append(ed)
        print("STJ", n, ed["data"], len(ed["itens"]), flush=True)
        n -= 1
    return eds


# ---------------------------------------------------------------- STF
ORGAO = re.compile(r"^\d+(?:\.\d+)?\s+(PLENÁRIO|PRIMEIRA TURMA|SEGUNDA TURMA|TURMAS?)\s*$", re.I)
FIM_CORPO = re.compile(r"^\d+(?:\.\d+)?\s+(INOVAÇÕES NORMATIVAS|PLENÁRIO VIRTUAL EM EVIDÊNCIA|ÍNDICE|SESSÕES|AGENDA|CLIPPING|REPERCUSSÃO GERAL EM EVIDÊNCIA)", re.I)
ODS = re.compile(r"^ODS:\s*[\d, e]+?\s*(?=[A-ZÀ-Ú“]|$)")
RAMO = re.compile(r"^(DIREITO|DIREITOS|SISTEMA|PROCESSO|ADMINISTRAÇÃO|ASSUNTOS|ORDEM|TRIBUTAÇÃO)\b[^a-zçãõáéíóú]*$")
FECHA = re.compile(r"(relator|relatora|rel\.|redator).{0,200}(julgamento|julgado|j\.|sessão)|(julgamento (finalizado|iniciado|em)|julgado em)\b", re.I)


def parse_stf(html_bytes, n):
    t = html_bytes.decode("cp1252", errors="replace")
    s = BeautifulSoup(t, "lxml")
    ps = [limpa(p.get_text(" ")) for p in s.body.find_all("p")] if s.body else []
    ps = [p for p in ps if p]
    if len(ps) < 20:
        return None
    topo = " ".join(ps[:6])
    m = re.search(r"Data de divulga[çc][ãa]o:\s*(.+?)(?:\s{2}|$)", topo)
    data = data_iso(m.group(1)) if m else data_iso(topo)
    ed = {"tribunal": "STF", "info": n, "data": data, "itens": []}
    # corpo: o sumário vem antes; o corpo começa na seção (órgão) que precede o 1º cabeçalho de ramo em maiúsculas
    prim = next((i for i, p in enumerate(ps) if p.isupper() and p.startswith("DIREITO") and " – " in p), None)
    if prim is None:
        return ed
    antes = [i for i in range(prim) if ORGAO.match(ps[i])]
    ini = antes[-1] if antes else prim
    orgao, ramo = "", ""
    atual = None
    modo = None

    def fecha():
        nonlocal atual
        if atual and atual.get("titulo") and "Nenhum caso foi selecionado" not in atual["titulo"]:
            atual["resumo"] = " ".join(atual.pop("_res", [])).strip()
            atual["notas"] = atual.pop("_notas", [])
            atual.pop("_fechado", None)
            atual.pop("_aberto", None)
            for k in ("tese", "resumo"):
                if not atual.get(k):
                    atual.pop(k, None)
            ed["itens"].append(atual)
        atual = None

    for p in ps[ini:]:
        up = p.upper()
        if FIM_CORPO.match(p) or up.startswith("INOVAÇÕES NORMATIVAS"):
            fecha()
            break
        mo = ORGAO.match(p)
        if mo:
            fecha()
            orgao = {"PLENÁRIO": "Plenário", "PRIMEIRA TURMA": "Primeira Turma", "SEGUNDA TURMA": "Segunda Turma"}.get(mo.group(1).upper(), "Turmas")
            continue
        if p == "Sumário" or p.upper() == "SUMÁRIO":
            continue
        if p.isupper() and up.startswith("DIREITO") and len(p) < 400:
            if atual is None or atual.get("_aberto") is False or atual.get("_res") or atual.get("_fechado"):
                fecha()
            ramo = p
            continue
        if atual is None:
            if len(p) < 400 and not p.endswith(":"):
                atual = {"orgao": orgao, "ramo": ramo, "titulo": p, "_res": [], "_notas": []}
                modo = "res"
            continue
        if p in ("Tese fixada:", "Tese fixada") or p.startswith("Tese fixada:") and len(p) < 20:
            modo = "tese"
            continue
        if p in ("Resumo:", "Resumo"):
            modo = "res"
            continue
        if re.match(r"^\(\d+\)", p):
            atual["_notas"].append(p)
            continue
        if modo == "tese":
            atual["tese"] = (atual.get("tese", "") + " " + p).strip()
            continue
        if FECHA.search(p) and len(p) < 600 and len(atual["_res"]) >= 1 and not p.startswith("“"):
            atual["fecho"] = p
            atual["_fechado"] = True
            fecha()
            continue
        p = ODS.sub("", p).strip()
        if p:
            atual["_res"].append(p)
    fecha()
    return ed


def coleta_stf(cache, desde):
    eds, n, falhas = [], 1260, 0
    while n > 1000:
        arq = cache / f"stf{n}.htm"
        h = baixar(f"https://www.stf.jus.br/arquivo/informativo/documento/informativo{n}.htm", arq)
        ed = parse_stf(h, n) if h else None
        if ed is None:
            arq.unlink(missing_ok=True)
            if eds:
                falhas += 1
                if falhas >= 3:
                    break
            n -= 1
            continue
        falhas = 0
        if ed["data"] and ed["data"] < desde:
            break
        eds.append(ed)
        print("STF", n, ed["data"], len(ed["itens"]), flush=True)
        n -= 1
    return eds


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    desde = "2024-01-01"
    if "--desde" in sys.argv:
        desde = sys.argv[sys.argv.index("--desde") + 1]
        args = [a for a in args if a != desde]
    if len(args) != 2:
        sys.exit(__doc__)
    cache, saida = Path(args[0]), Path(args[1])
    cache.mkdir(parents=True, exist_ok=True)
    saida.mkdir(parents=True, exist_ok=True)
    indice = []
    for nome, fn in (("stf", coleta_stf), ("stj", coleta_stj)):
        eds = fn(cache, desde)
        por_ano = {}
        for e in eds:
            por_ano.setdefault((e["data"] or "0000")[:4], []).append(e)
        for ano, lst in por_ano.items():
            lst.sort(key=lambda e: -e["info"])
            (saida / f"{nome}-{ano}.json").write_text(json.dumps(lst, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
            indice.append({"tribunal": nome.upper(), "ano": ano, "edicoes": len(lst), "itens": sum(len(e["itens"]) for e in lst),
                           "de": min(e["info"] for e in lst), "ate": max(e["info"] for e in lst), "arquivo": f"{nome}-{ano}.json"})
    (saida / "indice.json").write_text(json.dumps(sorted(indice, key=lambda x: (x["tribunal"], x["ano"])), ensure_ascii=False, indent=1), encoding="utf8")
    print("pronto:", sum(i["itens"] for i in indice), "itens")


if __name__ == "__main__":
    main()
