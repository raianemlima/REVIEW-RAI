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
    for href in re.findall(r'href="([^"]*gabarito[^"]*\.pdf)"', html, re.I):
        if re.search(r"(?i)definitivo", href) and not re.search(r"(?i)preliminar|comunicado", href):
            gabs.append(href if href.startswith("http") else BASE + href)
    return list(dict.fromkeys(provas)), list(dict.fromkeys(gabs))


def cabecalhos(gab):
    cab = []
    for l in fgv.linhas(gab):
        m = re.match(r"^\s*(.+?)\s*-?\s*TIPO\s+1\s*$", l, re.I)
        if m:
            cab.append(re.sub(r"\s+", " ", m.group(1)).strip(" -–"))
    return list(dict.fromkeys(cab))


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
        gabpdfs = [p for p in (baixar(u, cache / f"gab-{slug}-{i}.pdf") for i, u in enumerate(gabs)) if p]
        heads = [(g, h) for g in gabpdfs for h in cabecalhos(g)]
        print(f"{slug}: {len(provas)} cadernos Tipo 1, {len(gabs)} gabaritos definitivos, {len(heads)} seções", flush=True)
        for url, nome in provas:
            pdf = baixar(url, cache / f"{slug}-{nome}.pdf")
            # casa só pelo que distingue o cargo (Direito, Contabilidade...); "analista" sozinho não basta
            esp = toks(nome) - GENERICAS
            ok_extra = {"nivel", "medio", "superior"} | ({"direito"} if "oficial" in toks(nome) else set())

            compacto = re.sub(r"[^a-z]", "", "".join(c for c in unicodedata.normalize("NFD", nome.lower()) if unicodedata.category(c) != "Mn"))

            def pontos(h):
                th = toks(h)
                if esp:
                    # todas as palavras que distinguem o cargo no gabarito precisam estar no nome do arquivo
                    # ("Engenheiro Eletricista" não casa com "engenheiro-civil" só por causa de "engenheiro")
                    sp = th - GENERICAS
                    return len(sp) if sp and all(x in compacto for x in sp) else 0
                # cargo sem especialidade (Técnico, Oficial de Justiça): o título do gabarito não pode trazer outra especialidade
                return 1 if (th - toks(nome)) <= ok_extra and len(th & toks(nome)) >= 1 else 0

            cand = sorted(((pontos(h), -len(toks(h) - toks(nome)), g, h) for g, h in heads), reverse=True)
            if not pdf or not cand or cand[0][0] == 0:
                rel.append((slug, nome, "sem seção de gabarito correspondente"))
                continue
            _, _, g, h = cand[0]
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
            dest = saida / f"{slug}-{re.sub(r'[^a-z0-9]+', '-', nome.lower()).strip('-')}.json"
            dest.write_text(json.dumps({"concurso": slug, "orgao": sigla, "banca": "FGV", "ano": int(ano), "cargo": h, "tipo": 1,
                                        "fonte": f"{BASE}/concursos/{slug}", "questoes": qs}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            print(f"  ok {nome} <- {h}: {len(qs)} questões, {sum(q['anulada'] for q in qs)} anuladas, {len(ruim)} problemáticas", flush=True)
    print("\nRELATÓRIO (não processados):")
    for r in rel:
        print("  ", *r)


if __name__ == "__main__":
    main()
