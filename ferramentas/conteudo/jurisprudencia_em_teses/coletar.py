"""Coleta a Jurisprudência em Teses do STJ (texto oficial público) e gera JSON para a aba "Teses STJ".

    python ferramentas/conteudo/jurisprudencia_em_teses/coletar.py CACHE/ SAIDA/

- Índice:   https://processo.stj.jus.br/SCON/jt/toc.jsp   (filtrado por ramo: 'DIREITO X' INPATH(MAT))
- Edição:   https://processo.stj.jus.br/SCON/jt/doc.jsp?&b=TEMA&p=true&l=20&i=<k>&ordenacao=MAT,@NUM,-@DOCN&h=true

CACHE guarda o HTML baixado (fora do repositório, para não rebaixar). SAIDA recebe indice.json (uma linha por
edição, sem as teses) e um arquivo por ramo (ramo-<slug>.json) com as edições completas: cada tese traz o
enunciado e os julgados paradigma agrupados por tipo (Acórdãos, Decisões Monocráticas...). O STJ publica o
texto sem marca d'água nem dado pessoal. Requer beautifulsoup4 e lxml.
"""
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup

BASE = "https://processo.stj.jus.br/SCON/jt/"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}
ORD = "ordenacao=MAT,@NUM,-@DOCN&h=true"
RAMOS = ["DIREITO ADMINISTRATIVO", "DIREITO DO CONSUMIDOR", "DIREITO PENAL E PROCESSUAL PENAL", "DIREITO PROCESSUAL CIVIL",
         "DIREITO TRIBUTÁRIO", "DIREITO CIVIL", "DIREITO DA PROPRIEDADE INTELECTUAL", "DIREITOS HUMANOS",
         "DIREITO DA CRIANÇA E DO ADOLESCENTE", "DIREITO PROCESSUAL PENAL", "DIREITO AMBIENTAL", "DIREITO EMPRESARIAL",
         "DIREITO REGISTRAL", "ORIENTAÇÕES JURISPRUDENCIAIS", "DIREITO PENAL", "DIREITO PREVIDENCIÁRIO"]


def baixar(url, arq, tentativas=4):
    if arq.exists() and arq.stat().st_size > 2000:
        return arq.read_bytes()
    for i in range(tentativas):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                dados = r.read()
            arq.write_bytes(dados)
            time.sleep(0.25)
            return dados
        except Exception:
            time.sleep(2 * (i + 1))
    return None


def limpa(t):
    return re.sub(r"\s+", " ", (t or "").replace("\xa0", " ")).strip()


def slug(t):
    t = unicodedata.normalize("NFD", t.lower())
    return re.sub(r"[^a-z0-9]+", "-", "".join(c for c in t if unicodedata.category(c) != "Mn")).strip("-")


def iso(br):
    m = re.search(r"(\d{2})/(\d{2})/(\d{4})", br or "")
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else ""


def ramos_das_edicoes(cache):
    """número da edição -> ramo, pelo filtro por matéria do índice."""
    mapa = {}
    for ramo in RAMOS:
        q = urllib.parse.quote(f"'{ramo}' INPATH(MAT)", encoding="latin-1")
        arq = cache / f"toc-{slug(ramo)}.html"
        h = baixar(f"{BASE}toc.jsp?livre={q}&b=TEMA&p=true&l=400&i=1&{ORD}", arq)
        if not h:
            sys.exit(f"não consegui o índice de {ramo}")
        for n in re.findall(r"EDIÇÃO N\. (\d+)", h.decode("latin-1")):
            mapa.setdefault(int(n), ramo)
    return mapa


def parse_edicao(html):
    s = BeautifulSoup(html, "lxml")
    v = s.select_one(".blocoVerbete")
    if not v:
        return None
    num = int(v.select_one("input[name=edicao]")["value"])
    datas = [limpa(d.get_text()) for d in v.select(".clsData")]
    ed = {"edicao": num, "titulo": limpa(v.select_one(".clsVerbete").get_text()),
          "ate": iso(datas[0]) if datas else "", "data": iso(datas[1]) if len(datas) > 1 else "", "teses": []}
    for t in s.select(".clsTemasJT"):
        txt = limpa(t.select_one(".clsSubmitPesquisaTema").get_text(" "))
        m = re.match(r"(\d+)\)\s*(.*)", txt)
        tese = {"n": int(m.group(1)) if m else len(ed["teses"]) + 1, "texto": m.group(2) if m else txt, "julgados": {}}
        extra = [c for c in t.get("class", []) if c not in ("clsTemasJT", "redacaoAtual")]
        if extra:
            tese["situacao"] = " ".join(extra)
        col = t.select_one(".collapse")
        secao = "Julgados"
        for el in (col.find_all(["h4", "div"], recursive=False) if col else []):
            if el.name == "h4":
                secao = limpa(el.get_text())
            elif "clsJulgadosJT" in (el.get("class") or []):
                itens = [limpa(d.get_text(" ")) for d in el.find_all("div", recursive=False)] or [limpa(el.get_text(" "))]
                itens = [re.sub(r"\s+,", ",", i) for i in itens if i]
                if itens:
                    tese["julgados"].setdefault(secao, []).extend(itens)
        ed["teses"].append(tese)
    return ed if ed["teses"] else None


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    cache, saida = Path(sys.argv[1]), Path(sys.argv[2])
    cache.mkdir(parents=True, exist_ok=True)
    saida.mkdir(parents=True, exist_ok=True)
    ramo_de = ramos_das_edicoes(cache)
    print("edições com ramo:", len(ramo_de), flush=True)
    eds, vazias = {}, 0
    for k in range(1, 400):
        arq = cache / f"doc{k:03d}.html"
        h = baixar(f"{BASE}doc.jsp?&b=TEMA&p=true&l=20&i={k}&{ORD}", arq)
        ed = parse_edicao(h.decode("latin-1")) if h else None
        if ed is None:
            arq.unlink(missing_ok=True)
            vazias += 1
            if vazias >= 3 and eds:
                break
            continue
        vazias = 0
        ed["ramo"] = ramo_de.get(ed["edicao"], "")
        eds[ed["edicao"]] = ed
        print(k, ed["edicao"], ed["ramo"], len(ed["teses"]), flush=True)
    por_ramo = {}
    for ed in eds.values():
        por_ramo.setdefault(ed["ramo"] or "SEM RAMO", []).append(ed)
    indice = []
    for ramo, lst in sorted(por_ramo.items()):
        lst.sort(key=lambda e: e["edicao"])
        arq = f"ramo-{slug(ramo)}.json"
        (saida / arq).write_text(json.dumps(lst, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
        for e in lst:
            indice.append({"edicao": e["edicao"], "titulo": e["titulo"], "ramo": ramo, "data": e["data"], "ate": e["ate"],
                           "teses": len(e["teses"]), "julgados": sum(len(v) for t in e["teses"] for v in t["julgados"].values()),
                           "arquivo": arq})
    indice.sort(key=lambda x: x["edicao"])
    (saida / "indice.json").write_text(json.dumps(indice, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
    print("pronto:", len(indice), "edições,", sum(i["teses"] for i in indice), "teses,", sum(i["julgados"] for i in indice), "julgados")


if __name__ == "__main__":
    main()
