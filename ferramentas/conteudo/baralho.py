"""Ferramentas de conteúdo do app (baralho em texto puro, fora do repositório).

  python baralho.py extrair fonte.html pasta/     # DECK -> JSONs editáveis (um por disciplina)
  python baralho.py montar  pasta/ fonte.html     # JSONs -> DECK dentro do fonte.html
  python baralho.py conferir fonte.html [--prefixo ls-] [--disc cv] [--limite 50] [--saida relatorio.csv]
                                                  # confere cartões de lei seca com o texto do Planalto

Depois de editar: SENHA='...' node build.mjs fonte.html index.html  (na raiz do repositório)
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "mcp-planalto"))

DECK_RE = re.compile(r"^const DECK = (\{.*\});$", re.M)


def ler_deck(fonte: Path) -> tuple[str, dict, re.Match]:
    html = fonte.read_text(encoding="utf-8")
    m = DECK_RE.search(html)
    if not m:
        sys.exit("const DECK não encontrado em " + str(fonte))
    return html, json.loads(m.group(1)), m


def extrair(fonte: Path, pasta: Path) -> None:
    _, deck, _ = ler_deck(fonte)
    (pasta / "cartoes").mkdir(parents=True, exist_ok=True)
    por_disc: dict[str, list] = {}
    for c in deck["cartoes"]:
        por_disc.setdefault(c["disc"], []).append(c)
    for disc, cs in por_disc.items():
        (pasta / "cartoes" / f"{disc}.json").write_text(json.dumps(cs, ensure_ascii=False, indent=1), encoding="utf-8")
    resto = {k: v for k, v in deck.items() if k != "cartoes"}
    resto["_ordem_disc"] = list(por_disc)
    resto["_ordem_ids"] = [c["id"] for c in deck["cartoes"]]  # preserva a ordem original
    (pasta / "deck_resto.json").write_text(json.dumps(resto, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(deck['cartoes'])} cartões em {len(por_disc)} arquivos -> {pasta}")


def montar(pasta: Path, fonte: Path) -> None:
    html, _, m = ler_deck(fonte)
    resto = json.loads((pasta / "deck_resto.json").read_text(encoding="utf-8"))
    ordem = resto.pop("_ordem_disc", [])
    pos = {i: n for n, i in enumerate(resto.pop("_ordem_ids", []))}
    arqs = sorted((pasta / "cartoes").glob("*.json"), key=lambda p: (ordem.index(p.stem) if p.stem in ordem else 999, p.stem))
    cartoes, ids = [], set()
    for p in arqs:
        for c in json.loads(p.read_text(encoding="utf-8")):
            for campo in ("id", "disc", "tema", "frente", "verso"):
                if not c.get(campo):
                    sys.exit(f"{p.name}: cartão sem '{campo}': {c.get('id')}")
            if c["id"] in ids:
                sys.exit(f"id repetido: {c['id']}")
            ids.add(c["id"])
            cartoes.append(c)
    cartoes.sort(key=lambda c: pos.get(c["id"], len(pos)))  # novos cartões vão para o fim (sort é estável)
    deck = {"versao": resto.pop("versao", ""), "disciplinas": resto.pop("disciplinas"), "cartoes": cartoes, **resto}
    novo = "const DECK = " + json.dumps(deck, ensure_ascii=False) + ";"
    fonte.write_text(html[: m.start()] + novo + html[m.end():], encoding="utf-8")
    print(f"{len(cartoes)} cartões gravados em {fonte}")


# --- conferência com o Planalto -------------------------------------------------

ORIGEM_RE = re.compile(r"^(?P<lei>.+?),\s*arts?\.\s*(?P<art>\d+(?:\.\d{3})*\s*[º°o]?(?:\s*-\s*[A-Z]{1,2}\b)?)", re.I)
APELIDOS = {"LC 80/94": "LC 80", "LEI MARIA DA PENHA": "MARIA DA PENHA", "LEI 11.343/06": "DROGAS",
            "ESTATUTO DA PESSOA COM DEFICIENCIA": "EPD", "LEI 12.594/2012": "SINASE", "LEI 12.850/13": "ORG CRIM"}


def _lei_da_origem(lei: str) -> str:
    import planalto as P
    chave = P._sem_acento(lei).upper().strip()
    return APELIDOS.get(chave, lei)


def _texto_do_cartao(c: dict) -> str:
    """Reconstrói o trecho legal: preenche as lacunas da frente com as respostas do verso."""
    verso = re.sub(r"\([^)]*art\.[^)]*\)", "", c["verso"])
    if c.get("tipo") == "pegadinha":
        return re.sub(r"^(CERTO|ERRADO)\.?\s*", "", verso, flags=re.I)
    frente = re.sub(r"^[^:]{0,60}art\.[^:]*:\s*", "", c["frente"])
    if "____" in frente:
        respostas = [r.strip(" .") for r in re.split(r";", verso) if r.strip(" .")]
        for r in respostas:
            frente = frente.replace("____", r, 1)
        return frente
    return frente + " " + verso


def conferir(fonte: Path, prefixo: str, disc: str | None, limite: int, saida: Path) -> None:
    import planalto as P
    _, deck, _ = ler_deck(fonte)
    alvo = [c for c in deck["cartoes"] if c["id"].startswith(prefixo) and (not disc or c["disc"] == disc)]
    alvo = [c for c in alvo if ORIGEM_RE.match(c.get("origem", ""))][: limite or None]
    leis: dict[str, tuple] = {}
    linhas = []
    for i, c in enumerate(alvo, 1):
        m = ORIGEM_RE.match(c["origem"])
        lei, art = _lei_da_origem(m["lei"]), m["art"]
        if lei not in leis:
            try:
                leis[lei] = P.carregar(lei)
            except Exception as e:  # noqa: BLE001
                leis[lei] = e
        carga = leis[lei]
        linha = {"id": c["id"], "origem": c["origem"], "url": "", "veredito": "", "cobertura": "", "ausentes": "", "frente": c["frente"][:160]}
        if isinstance(carga, Exception):
            linha["veredito"] = "norma não aberta: " + str(carga).splitlines()[-1][:120]
        else:
            _, url, arts = carga
            linha["url"] = url
            a = P.achar_artigo(arts, art)
            if not a:
                linha["veredito"] = "artigo não encontrado (revogado ou número errado?)"
            else:
                r = P.comparar(_texto_do_cartao(c), a.texto)
                linha["cobertura"] = r["cobertura"]
                linha["ausentes"] = " ".join(r["ausentes"][:12])
                linha["veredito"] = "confere" if r["cobertura"] >= 0.9 else "revisar" if r["cobertura"] >= 0.7 else "provável divergência"
        linhas.append(linha)
        print(f"[{i}/{len(alvo)}] {c['id']} {c['origem']}: {linha['veredito']}", file=sys.stderr)
    with saida.open("w", newline="", encoding="utf-8-sig") as f:  # utf-8-sig abre certo no Excel
        w = csv.DictWriter(f, fieldnames=list(linhas[0]) if linhas else ["id"], delimiter=";")
        w.writeheader()
        w.writerows(linhas)
    from collections import Counter
    print(Counter(l["veredito"].split(":")[0] for l in linhas).most_common(), "->", saida)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("extrair"); e.add_argument("fonte", type=Path); e.add_argument("pasta", type=Path)
    mo = sub.add_parser("montar"); mo.add_argument("pasta", type=Path); mo.add_argument("fonte", type=Path)
    c = sub.add_parser("conferir"); c.add_argument("fonte", type=Path)
    c.add_argument("--prefixo", default="ls-"); c.add_argument("--disc"); c.add_argument("--limite", type=int, default=0)
    c.add_argument("--saida", type=Path, default=Path("relatorio_conferencia.csv"))
    a = ap.parse_args()
    if a.cmd == "extrair":
        extrair(a.fonte, a.pasta)
    elif a.cmd == "montar":
        montar(a.pasta, a.fonte)
    else:
        conferir(a.fonte, a.prefixo, a.disc, a.limite, a.saida)


if __name__ == "__main__":
    main()
