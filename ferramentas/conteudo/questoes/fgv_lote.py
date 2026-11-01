"""Processa um ou mais concursos da FGV de uma vez: baixa os cadernos Tipo 1 e o gabarito definitivo da página
do concurso e gera um JSON por cargo.

    python ferramentas/conteudo/questoes/fgv_lote.py CACHE/ SAIDA/ tjrr24:TJRR:2024 tjmtservidor:TJMT:2024 ...

Cada argumento é  <slug da página em conhecimento.fgv.br/concursos>:<SIGLA>:<ANO>.
Só entram cargos em que o caderno Tipo 1 e a seção do gabarito casam; o resto vai para o relatório final.
"""
import json
import re
import sys
import time
import unicodedata
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fgv  # noqa: E402

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}
BASE = "https://conhecimento.fgv.br"


def baixar(url, arq):
    if arq.exists() and arq.stat().st_size > 2000:
        return arq
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                arq.write_bytes(r.read())
            time.sleep(0.3)
            return arq
        except Exception:
            time.sleep(2 * (i + 1))
    return None


GENERICAS = {"cns", "cnm", "cnmt", "analista", "tecnico", "oficial", "justica", "judiciario", "area", "apoio", "especialidade", "medio", "superior", "nivel"}


def toks(t):
    t = "".join(c for c in unicodedata.normalize("NFD", t.lower()) if unicodedata.category(c) != "Mn")
    return {x for x in re.findall(r"[a-z]{2,}", t) if x not in {"tipo", "pdf", "cargo", "de", "da", "do", "das", "dos", "em", "na", "no", "ao"}}


def pagina(slug, cache):
    arq = cache / f"pag-{slug}.html"
    if not baixar(f"{BASE}/concursos/{slug}", arq):
        return ""
    return arq.read_text(encoding="utf-8", errors="replace")


def principais(html):
    """(provas Tipo 1: [(url, nome)], gabaritos definitivos: [url])"""
    provas, gabs = [], []
    for href, rot in re.findall(r'<a [^>]*href="([^"]+\.pdf)"[^>]*>\s*([^<]{1,160})', html):
        url = href if href.startswith("http") else BASE + href
        if re.fullmatch(r"(?i)tipo\s*1(\s*[-–].*)?", rot.strip()) or re.search(r"(?i)(t01|tipo-?1)\b.*\.pdf$", href):
            provas.append((url, url.rsplit("/", 1)[-1][:-4]))
    # qualquer arquivo de gabarito; se é o definitivo/oficial (e não o preliminar) decide o conteúdo, em eh_definitivo()
    for href in re.findall(r'href="([^"]*gabarito[^"]*\.pdf)"', html, re.I):
        if not re.search(r"(?i)preliminar|recurso|comunicado|aviso|prazo|errata|discursiv|dissertativ|resultado", href.rsplit("/", 1)[-1]):
            gabs.append(href if href.startswith("http") else BASE + href)
    return list(dict.fromkeys(provas)), list(dict.fromkeys(gabs))


def eh_definitivo(pdf, url=""):
    """Gabarito definitivo/oficial: o nome do arquivo ou a capa dizem isso, e a capa nunca diz "preliminar"."""
    try:
        doc = fgv.pymupdf.open(str(pdf))
        txt = fgv.sem_acento(doc[0].get_text()[:900]) if len(doc) else ""
    except Exception:
        return False
    if "preliminar" in txt:
        return False
    return bool(re.search(r"definitiv|oficial", fgv.sem_acento(url.rsplit("/", 1)[-1]))) or bool(re.search(r"definitiv|gabarito oficial", txt))


def cabecalhos(gab):
    return list(dict.fromkeys(cargo for (_, tipo), (cargo, _) in fgv.secoes(gab).items() if tipo == 1))


def main():
    a = sys.argv[1:]
    if len(a) < 3:
        sys.exit(__doc__)
    cache, saida = Path(a[0]), Path(a[1])
    cache.mkdir(parents=True, exist_ok=True)
    saida.mkdir(parents=True, exist_ok=True)
    rel = []
    for arg in a[2:]:
        slug, sigla, ano = arg.split(":")
        html = pagina(slug, cache)
        provas, gabs = principais(html)
        # versões retificadas (v2, v3...) valem mais que o original: a mais nova vem por último e ganha o desempate
        gabs.sort(key=lambda u: int((re.search(r"_v(\d+)", u) or [0, 0])[1]))
        gabpdfs = [p for u in gabs if (p := baixar(u, cache / ("gab-" + slug + "-" + re.sub(r"[^A-Za-z0-9._-]", "_", u.rsplit("/", 1)[-1])))) and eh_definitivo(p, u)]
        heads = [(g, h) for g in gabpdfs for h in cabecalhos(g)]
        print(f"{slug}: {len(provas)} cadernos Tipo 1, {len(gabpdfs)}/{len(gabs)} gabaritos definitivos, {len(heads)} seções", flush=True)
        ign = {sigla.lower(), re.sub(r"\d+", "", slug)}   # "Promotor ... do MPMT": a sigla do órgão não distingue cargo

        def casar(nome):
            """(gabarito, cargo do gabarito, palavras do caderno que sobram) ou None."""
            # casa só pelo que distingue o cargo (Direito, Contabilidade...); "analista" sozinho não basta
            esp = toks(nome) - GENERICAS
            ok_extra = {"nivel", "medio", "superior"} | ({"direito"} if "oficial" in toks(nome) else set())
            compacto = re.sub(r"[^a-z]", "", "".join(c for c in unicodedata.normalize("NFD", nome.lower()) if unicodedata.category(c) != "Mn"))

            def pontos(h):
                th = toks(h)
                if esp:
                    # todas as palavras que distinguem o cargo no gabarito precisam estar no nome do arquivo
                    # ("Engenheiro Eletricista" não casa com "engenheiro-civil" só por causa de "engenheiro")
                    sp = th - GENERICAS - ign
                    return len(sp) if sp and all(x in compacto for x in sp) else 0
                # cargo sem especialidade (Técnico, Oficial de Justiça): o título do gabarito não pode trazer outra especialidade
                return 1 if (th - toks(nome)) <= ok_extra and len(th & toks(nome)) >= 1 else 0

            cand = sorted(((pontos(h), -len(toks(h) - toks(nome)), g, h) for g, h in heads), reverse=True)
            if len(provas) == 1 and len({h for _, h in heads}) == 1:   # um caderno e um cargo no gabarito: só pode ser ele
                cand = [(1, 0, heads[0][0], heads[0][1])]
            if not cand or cand[0][0] == 0:
                return None
            _, _, g, h = cand[0]
            return g, h, len(esp - (toks(h) - GENERICAS - ign) - ign)

        casos = {nome: casar(nome) for _, nome in provas}
        menor = {}
        for c in casos.values():
            if c:
                menor[(c[0], c[1])] = min(menor.get((c[0], c[1]), 99), c[2])
        for url, nome in provas:
            pdf = baixar(url, cache / f"{slug}-{nome}.pdf")
            c = casos[nome]
            if not pdf or not c:
                rel.append((slug, nome, "sem seção de gabarito correspondente"))
                continue
            g, h, extra = c
            if extra > menor[(g, h)]:   # ex.: "Promotor - Grupo 1" e "Promotor" casam com a mesma seção: só o caderno sem especialização a mais
                rel.append((slug, nome, f"outro caderno casa melhor com a seção '{h}'"))
                continue
            try:
                qs, gb = fgv.caderno(str(pdf), h), fgv.gabarito(str(g), h, 1)
            except Exception as e:  # PDF fora do padrão
                rel.append((slug, nome, f"erro: {e}"))
                continue
            for q in qs:
                q["gabarito"] = gb.get(q["n"], "")
                q["anulada"] = q["gabarito"] == "*"
            ruim = [q["n"] for q in qs if not q["gabarito"] or len(q["alternativas"]) != 5]
            if len(gb) != len(qs):
                rel.append((slug, nome, f"{len(qs)} questões no caderno e {len(gb)} no gabarito de '{h}'"))
                continue
            if len(qs) < 10 or len(ruim) > len(qs) * 0.1:
                rel.append((slug, nome, f"{len(qs)} questões, {len(ruim)} problemáticas"))
                continue
            qs = [q for q in qs if q["n"] not in ruim]   # questão sem 5 alternativas ou sem gabarito não é enviada
            dest = saida / f"{slug}-{re.sub(r'[^a-z0-9]+', '-', nome.lower()).strip('-')}.json"
            dest.write_text(json.dumps({"concurso": slug, "orgao": sigla, "banca": "FGV", "ano": int(ano), "cargo": h, "tipo": 1,
                                        "fonte": f"{BASE}/concursos/{slug}", "questoes": qs}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            print(f"  ok {nome} <- {h}: {len(qs)} questões, {sum(q['anulada'] for q in qs)} anuladas, {len(ruim)} descartadas {ruim[:6]}", flush=True)
    print("\nRELATÓRIO (não processados):")
    for r in rel:
        print("  ", *r)


if __name__ == "__main__":
    main()
