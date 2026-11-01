"""Transforma um e-book em Markdown (saída do pdf2md.py) no JSON do Aprofundamento (Biblioteca › Aprofundamento).

    python ferramentas/conteudo/ebook_md.py LIVRO.md id disc "Título" "Subtítulo" SAIDA.json

- cada "## Capítulo N — NOME" vira um capítulo do app (id cN); o que vem antes do capítulo 1 só entra se tiver
  "APRESENTAÇÃO" (capa, ficha, sumário e "sobre o autor" ficam de fora: o app já tem navegação por capítulo);
- títulos internos descem um nível ("###" -> "##"), porque o renderizador do Aprofundamento mostra "##" como h3 e só
  lista no sumário do capítulo os títulos até h4;
- o renderizador não remove barras de escape: "\\*" vira "∗", "\\_" e "\\`" voltam ao caractere, "\\|" em tabela vira "/".

Depois: node ferramentas/ajustes/selar_conteudo.mjs conteudo-cifrado/<arquivo>.bin SAIDA.json
O JSON e o Markdown são material de curso: NÃO vão para o Git (o repositório é público); só o .bin selado vai.
"""
import json
import re
import sys
from datetime import date

PEQUENAS = {"a", "as", "o", "os", "e", "de", "da", "das", "do", "dos", "em", "na", "nas", "no", "nos", "ao", "aos", "à", "às", "por", "para", "com", "sem", "sob", "ou", "um", "uma"}
SIGLAS = {"CPP", "CPC", "CP", "CF", "STF", "STJ", "ECA", "CNJ", "OAB", "EC", "CC", "LEP", "LGPD", "DPE", "MP", "TJ", "CRFB", "ADI", "ADC", "ADPF", "ADO", "RE", "HC", "CDC", "CLT", "ADCT", "TSE", "TCU", "CNMP", "DF", "II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII", "CPM", "LC", "ONU", "OEA", "CIDH", "DUDH", "CADH", "SUS"}


def bonito(t):
    """CAIXA ALTA do sumário -> Título normal (siglas e algarismos romanos mantidos)."""
    if not t.isupper():
        return t
    out = []
    for i, w in enumerate(t.split(" ")):
        nucleo = re.sub(r"^\W+|\W+$", "", w)
        if nucleo in SIGLAS:
            out.append(w)
        elif i and nucleo.lower() in PEQUENAS:
            out.append(w.lower())
        else:
            out.append(w[:1] + w[1:].lower() if not w[:1].isalpha() else w.capitalize())
    return " ".join(out)


def limpar(md):
    md = re.sub(r"(?m)^#(#{2,5})\s", lambda m: m.group(1) + " ", md)            # ### -> ##, #### -> ###, ...
    md = md.replace("\\*", "∗").replace("\\_", "_").replace("\\`", "`").replace("\\\\", "\\")
    md = "\n".join(l.replace("\\|", "/") if l.lstrip().startswith("|") else l for l in md.split("\n"))
    md = re.sub(r"(?m)^\d{1,3}\s*$", "", md)                                      # número solto (nota de rodapé/página)
    return re.sub(r"\n{3,}", "\n\n", md).strip()


def montar(md, eid, disc, titulo, subtitulo):
    linhas = md.replace("\r\n", "\n").split("\n")
    marcas = [(i, int(m.group(1)), m.group(2).strip()) for i, l in enumerate(linhas) if (m := re.match(r"^## Capítulo (\d+) — (.*)$", l))]
    if not marcas:
        sys.exit("nenhum '## Capítulo N — NOME' no Markdown (rode o pdf2md.py antes)")
    caps = []
    antes = linhas[:marcas[0][0]]
    ap = next((i for i, l in enumerate(antes) if re.match(r"^\*\*APRESENTA[ÇC][ÃA]O\*\*$", l.strip())), None)
    su = next((i for i, l in enumerate(antes) if re.match(r"^\*\*SUM[ÁA]RIO\*\*$", l.strip())), None)
    if ap is not None:
        txt = limpar("\n".join(antes[ap + 1:su if su is not None and su > ap else len(antes)]))
        if txt:
            caps.append({"id": "c0", "t": "Apresentação", "md": txt})
    # restos do sumário impresso (linhas sem pontilhado) vão até o primeiro parágrafo de verdade; o que vem depois é do capítulo 1
    miolo = []
    if su is not None:
        resto = antes[su + 1:]
        ini = next((i for i, l in enumerate(resto) if len(l) > 150 and not l.lstrip().startswith(("*", "|", ">")) and not re.search(r"\s\d{1,3}\s*$", l)), None)
        miolo = resto[ini:] if ini is not None else []
    for k, (i, n, nome) in enumerate(marcas):
        fim = marcas[k + 1][0] if k + 1 < len(marcas) else len(linhas)
        txt = limpar("\n".join(linhas[i + 1:fim]))
        if not txt and k == 0 and miolo:
            txt = limpar("\n".join(miolo))   # o texto do capítulo 1 veio antes do primeiro marcador do PDF
        if not txt:
            sys.exit(f"capítulo {n} sem texto")
        caps.append({"id": f"c{n}", "t": f"{n}. {bonito(nome)}", "md": txt})
    return {"id": eid, "titulo": titulo, "subtitulo": subtitulo, "disc": disc, "atualizado": date.today().isoformat(), "caps": caps}


if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) != 6:
        sys.exit(__doc__)
    e = montar(open(a[0], encoding="utf-8").read(), a[1], a[2], a[3], a[4])
    json.dump(e, open(a[5], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{a[5]}: {len(e['caps'])} capítulos, {sum(len(c['md']) for c in e['caps']):,} caracteres")
    for c in e["caps"]:
        print(f"  {c['id']:>4}  {len(c['md']):>8,}  {c['t']}")
