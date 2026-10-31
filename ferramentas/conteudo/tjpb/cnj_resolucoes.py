"""Converte resoluções do CNJ (página oficial em atos.cnj.jus.br) para o formato de lei seca do app.

    curl -s -o r351.html https://atos.cnj.jus.br/atos/detalhar/3557
    python ferramentas/conteudo/tjpb/cnj_resolucoes.py ferramentas/conteudo/dados/leiseca-publica r351.html [...]

Usa o texto compilado da própria página do CNJ: o trecho revogado ou alterado vem tachado (<s>) e é descartado;
as notas "(redação dada pela Resolução ...)" ficam. Os considerandos e os anexos não entram. Texto oficial do CNJ,
de domínio público: a saída pode ficar no repositório e é publicada no baralho por ferramentas/ci/aplicar_leiseca.mjs.
"""
import html
import json
import re
import sys
from pathlib import Path

# número -> (id, nome, curto); a disciplina é resolvida no baralho pelo nome na publicação
RESOLUCOES = {
    "351": ("res-cnj-351", "Resolução CNJ nº 351/2020 · Assédio moral, assédio sexual e discriminação", "Res. CNJ 351"),
    # a Res. 230/2016, citada no edital do TJPB como "230/2021", foi revogada pela Res. 401/2021, que a substituiu
    "401": ("res-cnj-401", "Resolução CNJ nº 401/2021 · Acessibilidade e inclusão de pessoas com deficiência (substituiu a Res. 230/2016)", "Res. CNJ 401"),
    "400": ("res-cnj-400", "Resolução CNJ nº 400/2021 · Política de sustentabilidade do Poder Judiciário", "Res. CNJ 400"),
    "363": ("res-cnj-363", "Resolução CNJ nº 363/2021 · LGPD nos tribunais", "Res. CNJ 363"),
}
ESTRUTURA = re.compile(r"^(LIVRO|PARTE|TÍTULO|CAPÍTULO|SEÇÃO|SUBSEÇÃO|DISPOSIÇÕES)\b", re.I)
ARTIGO = re.compile(r"^Art\.\s*(\d+)\s*[º°o]?\s*(?:-\s*([A-Z]))?\s*\.?\s+")


def texto(p):
    p = re.sub(r"<(s|strike|del)\b[^>]*>.*?</\1\s*>", " ", p, flags=re.S | re.I)
    p = re.sub(r"<br\s*/?>", " ", p, flags=re.I)
    p = html.unescape(re.sub(r"<[^>]+>", " ", p))
    p = re.sub(r"\s+", " ", p.replace("\xa0", " ")).strip()
    # "Art. 1 o" e "§ 2 o" (o sobrescrito na página) -> "Art. 1º" e "§ 2º"
    p = re.sub(r"^(Art\.|§)\s*(\d+)\s+o\s", lambda m: f"{m.group(1)} {m.group(2)}º ", p)
    return re.sub(r"(§|\b[Aa]rt\.)\s*(\d+)\s+o\s+(?=(deste|desta|do|da|e)\b|[,;])", lambda m: f"{m.group(1)} {m.group(2)}º ", p)


def converter(caminho):
    pagina = Path(caminho).read_text(encoding="utf-8", errors="replace")
    m = re.search(r"Resolução\s+Nº\s*(\d+)\s+de\s+(\d{2}/\d{2}/\d{4})", texto(pagina))
    if not m or m.group(1) not in RESOLUCOES:
        raise SystemExit(f"{caminho}: não reconheci uma das resoluções previstas ({', '.join(RESOLUCOES)}).")
    num, data = m.groups()
    rid, nome, curto = RESOLUCOES[num]
    paras = re.findall(r"<p\b([^>]*)>(.*?)</p>", pagina, flags=re.S | re.I)
    itens, art, iniciou, cab = [], None, False, None
    for attrs, corpo in paras:
        t = texto(corpo)
        if not t:
            continue
        if not iniciou:
            iniciou = t.upper().startswith("RESOLVE")
            continue
        if re.match(r"^(ANEXO|Ministr[oa]\b|Presidente\b)", t) or re.fullmatch(r"[A-ZÁÉÍÓÚÂÊÔÃÕÇ .]{6,}", t) and not ESTRUTURA.match(t) and art and "center" not in attrs:
            break
        centro = "center" in attrs
        if centro and ESTRUTURA.match(t):
            cab = {"h": t.upper()}
            itens.append(cab)
            art = None
            continue
        if centro and cab is not None and art is None and not ARTIGO.match(t):
            cab["h"] += " · " + t[:1].upper() + t[1:].lower()
            continue
        ma = ARTIGO.match(t)
        if ma:
            n = ma.group(1) + ("-" + ma.group(2) if ma.group(2) else "")
            art = {"a": n, "x": t}
            itens.append(art)
            cab = None
            continue
        if art is not None:
            art["x"] += "\n" + t
    if not any("a" in i for i in itens):
        raise SystemExit(f"{caminho}: nenhum artigo encontrado.")
    return {"id": rid, "nome": nome, "curto": curto, "disc": "@administrativo", "completa": True,
            "fonte": f"Texto compilado da Resolução CNJ nº {num}, de {data}, em atos.cnj.jus.br (consultado em 31/10/2026)",
            "grupos": [{"nome": nome, "itens": itens}]}


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    saida = Path(sys.argv[1])
    saida.mkdir(parents=True, exist_ok=True)
    for arq in sys.argv[2:]:
        d = converter(arq)
        (saida / f'{d["id"]}.json').write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
        arts = [i for i in d["grupos"][0]["itens"] if "a" in i]
        print(f'{d["id"]}: {len(arts)} artigos (do {arts[0]["a"]} ao {arts[-1]["a"]})')
