"""Cartões "Certo ou errado" a partir de estudos em Markdown, e inserção deles no baralho (fora do repositório).

  python estudo_md.py cartoes estudo.md --id slug --tema "Título" [--disc dh] [--abr nucleo_comum] [--fonte "..."] [--saida pasta/]
      Lê as "Questão N" comentadas (título, afirmação em negrito, "Certo."/"Errado." + comentário) e as tabelas
      "Afirmação | Avaliação" e grava <saida>/<slug>.json com cartões prontos para o baralho.
  python estudo_md.py inserir pasta_do_baralho/ cartoes.json [cartoes2.json ...]
      Acrescenta (ou atualiza, pelo id) os cartões em <pasta>/cartoes/<disc>.json. Repetir o comando não duplica nada.

O texto dos estudos e os cartões gerados ficam em ferramentas/conteudo/dados/ebooks/ (ignorada pelo Git: o repositório é público).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
SAIDA_PADRAO = AQUI / "dados" / "ebooks" / "cartoes"

QUESTAO = re.compile(r"^#{2,5}\s+Quest[ãa]o\s+\d+\s*$", re.I)
VEREDITO = re.compile(r"^\W*(Cert[oa]|Errad[oa]|Corret[oa]|Incorret[oa])\b\W*(.*)$", re.I | re.S)


def limpar(t: str) -> str:
    """Tira links, negrito/itálico e remissões numéricas [n]; mantém o texto."""
    t = re.sub(r"\[([^\]]+)\]\((?:https?://|#)[^)\s]*\)", r"\1", t)
    t = re.sub(r"\s*\[\d+\](?:\[\d+\])*", "", t)
    t = t.replace("**", "").replace("__", "")
    t = re.sub(r"(?<![\w*])\*(?!\s)(.+?)\*(?![\w*])", r"\1", t)
    t = t.strip().strip("“”\"").strip()
    return re.sub(r"\s+", " ", t)


def veredito(texto: str) -> tuple[str, str] | None:
    """('CERTO'|'ERRADO', comentário) a partir de 'Errado. ...', 'Errada: ...', 'Correta.' etc."""
    m = VEREDITO.match(limpar_marcas(texto))
    if not m:
        return None
    v = m.group(1).lower()
    comentario = limpar(m.group(2))
    return ("CERTO" if v.startswith(("cert", "corret")) else "ERRADO"), comentario[:1].upper() + comentario[1:]


def limpar_marcas(t: str) -> str:
    return t.replace("**", "").strip()


def questoes(linhas: list[str]) -> list[tuple[str, str, str]]:
    out, i = [], 0
    while i < len(linhas):
        if not QUESTAO.match(linhas[i].strip()):
            i += 1
            continue
        i += 1
        corpo: list[str] = []
        while i < len(linhas) and not re.match(r"^#{1,5}\s", linhas[i]):
            if linhas[i].strip():
                corpo.append(linhas[i].strip())
            i += 1
        if len(corpo) < 2:
            continue
        v = veredito(" ".join(corpo[1:]))
        if v:
            out.append((limpar(corpo[0]), v[0], v[1]))
    return out


def pegadinhas(linhas: list[str]) -> list[tuple[str, str, str]]:
    out, i = [], 0
    celulas = lambda l: [c.strip() for c in l.strip().strip("|").split("|")]
    while i < len(linhas):
        cab = celulas(linhas[i]) if linhas[i].lstrip().startswith("|") else []
        if len(cab) == 2 and cab[0].lower().startswith("afirma") and cab[1].lower().startswith("avalia"):
            i += 2
            while i < len(linhas) and linhas[i].lstrip().startswith("|"):
                c = celulas(linhas[i])
                v = veredito(c[1]) if len(c) >= 2 else None
                if v:
                    out.append((limpar(c[0]), v[0], v[1]))
                i += 1
            continue
        i += 1
    return out


def gerar(md: str, eid: str, tema: str, disc: str, abr: str, fonte: str, prefixo: str, peso: int, inc: int) -> tuple[list[dict], list[str]]:
    linhas = md.replace("\r\n", "\n").split("\n")
    itens = [("q", *x) for x in questoes(linhas)] + [("p", *x) for x in pegadinhas(linhas)]
    cartoes, vistos, avisos = [], set(), []
    cont = {"q": 0, "p": 0}
    for tipo, afirmacao, vered, comentario in itens:
        chave = re.sub(r"\W", "", afirmacao.lower())
        if not afirmacao or chave in vistos:
            avisos.append(f"repetida ou vazia, ignorada: {afirmacao[:70]}")
            continue
        vistos.add(chave)
        cont[tipo] += 1
        cartoes.append({
            "id": f"{prefixo}-{eid}-{tipo}{cont[tipo]:02d}", "disc": disc, "tema": tema, "tipo": "pegadinha",
            "frente": "Certo ou errado: " + afirmacao, "verso": vered, "porque": comentario,
            "origem": tema, "abr": abr, "peso": peso, "inc": inc, "fonte": fonte,
        })
    return cartoes, avisos


def cmd_cartoes(a: argparse.Namespace) -> None:
    md = Path(a.arquivo).read_text(encoding="utf-8-sig")
    cartoes, avisos = gerar(md, a.id, a.tema, a.disc, a.abr, a.fonte, a.prefixo, a.peso, a.inc)
    if not cartoes:
        sys.exit("nenhuma questão ou pegadinha encontrada em " + a.arquivo)
    saida = Path(a.saida) if a.saida else SAIDA_PADRAO
    saida.mkdir(parents=True, exist_ok=True)
    destino = saida / f"{a.id}.json"
    destino.write_text(json.dumps(cartoes, ensure_ascii=False, indent=1), encoding="utf-8")
    q = sum(1 for c in cartoes if "-q" in c["id"])
    print(f"{destino}: {len(cartoes)} cartões ({q} de questões, {len(cartoes) - q} de pegadinhas)")
    for av in avisos:
        print("aviso:", av)


def cmd_inserir(a: argparse.Namespace) -> None:
    pasta = Path(a.pasta)
    resto = pasta / "deck_resto.json"
    discs = {d["id"] for d in json.loads(resto.read_text(encoding="utf-8")).get("disciplinas", [])} if resto.exists() else None
    novos: dict[str, dict[str, dict]] = {}
    for arq in a.cartoes:
        for c in json.loads(Path(arq).read_text(encoding="utf-8")):
            for campo in ("id", "disc", "tema", "frente", "verso"):
                if not c.get(campo):
                    sys.exit(f"{arq}: cartão sem '{campo}': {c.get('id')}")
            if discs is not None and c["disc"] not in discs:
                sys.exit(f"{arq}: disciplina desconhecida no baralho: {c['disc']}")
            novos.setdefault(c["disc"], {})[c["id"]] = c
    (pasta / "cartoes").mkdir(parents=True, exist_ok=True)
    todos_ids = set()
    for p in (pasta / "cartoes").glob("*.json"):
        todos_ids |= {c["id"] for c in json.loads(p.read_text(encoding="utf-8"))}
    for disc, por_id in novos.items():
        alvo = pasta / "cartoes" / f"{disc}.json"
        atuais = json.loads(alvo.read_text(encoding="utf-8")) if alvo.exists() else []
        ja = {c["id"] for c in atuais}
        for i in por_id:
            if i in todos_ids and i not in ja:
                sys.exit(f"id já existe em outra disciplina: {i}")
        add = upd = 0
        for c in atuais:
            if c["id"] in por_id:
                novo = por_id.pop(c["id"])
                c.clear(); c.update(novo); upd += 1
        for c in por_id.values():
            atuais.append(c); add += 1
        alvo.write_text(json.dumps(atuais, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"{alvo}: {add} novos, {upd} atualizados, {len(atuais)} no total")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("cartoes")
    c.add_argument("arquivo"); c.add_argument("--id", required=True); c.add_argument("--tema", required=True)
    c.add_argument("--disc", default="dh"); c.add_argument("--abr", default="nucleo_comum")
    c.add_argument("--fonte", default="Pesquisa de estudo (conferir nas fontes oficiais)"); c.add_argument("--prefixo", default="ps")
    c.add_argument("--peso", type=int, default=3); c.add_argument("--inc", type=int, default=3); c.add_argument("--saida")
    c.set_defaults(fn=cmd_cartoes)
    i = sub.add_parser("inserir")
    i.add_argument("pasta"); i.add_argument("cartoes", nargs="+")
    i.set_defaults(fn=cmd_inserir)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
