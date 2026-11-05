"""Converte um livro em texto extraído por página ("## Página N") no JSON de e-book do Aprofundamento.

    python3 -I ferramentas/conteudo/livro_paginas.py LIVRO.md CONFIG.json SAIDA.json

É o caminho para os livros que chegam como texto já extraído do PDF (sem os marcadores de fonte que o `pdf2md.py`
usa). O CONFIG.json diz como dividir cada obra e pode ser reaproveitado (ver `livros_paginas.json`, que só traz
títulos de capítulos e regras de limpeza, nunca o texto do livro):

    {"id": "...", "titulo": "...", "subtitulo": "...", "disc": "cr",
     "toc": [7, 13],                      # páginas do sumário impresso (usadas para reconhecer títulos de seção)
     "deslocamento": -2,                  # página do PDF = página impressa + deslocamento
     "capitulos": [{"t": "Noções gerais", "pag": 19}, ...],   # "pag" = página impressa em que o capítulo começa
     "cabecalho": ["criminologia-vol", ...],   # inícios (sem espaços, minúsculos) de linhas de cabeçalho a descartar
     "remover": ["regex de linha a descartar", ...]}

O que o script faz:
- descarta cabeçalhos e rodapés correntes ("Cap. I • ...", "Parte I • ..."), número de página e propaganda da editora;
- une as linhas em parágrafos, refaz as palavras partidas por hífen de quebra de linha e corrige o "0" que o OCR
  deixou no lugar do artigo "o";
- transforma em título (## / ### / ####) a linha numerada que também consta do sumário impresso;
- corta o capítulo no título (o capítulo pode começar no meio da página);
- recusa menção a editora, curso ou plataforma de origem no texto.

O texto e o JSON são material comercial de uso pessoal: NÃO vão para o Git (o repositório é público); só o .bin selado
(`node ferramentas/ajustes/selar_conteudo.mjs conteudo-cifrado/<arquivo>.bin SAIDA.json`).
"""
import json
import re
import sys
import unicodedata
from datetime import date

SHY = "­"
# menção de origem comercial: o script remove a linha (propaganda) ou recusa se sobrar
PROPAGANDA = re.compile(r"jus ?class|jus ?podivm|editora ?jus|conectado|qr ?code|www\.editora|c[óo]digo de acesso|etiqueta da p", re.I)
MANTEM = {"ex", "pós", "pré", "vice", "sócio", "não", "mini", "meio", "além", "sem"}
FIM_FRASE = re.compile(r"[.:;!?)\]”\"…]$")
ITEM = re.compile(r"^(?:Sum[áa]rio:|[a-e]\)|[ivx]+\)|[►•▪◦■□●○–—-]\s|\d+\)|\(\s*[A-Z]{2,}|Gabarito|Quest[ãa]o|Obs\.?:|Aten[çc][ãa]o|Exemplo|Súmula|S[úu]mula|Tema \d)", re.I)


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in s if unicodedata.category(c) != "Mn")).replace("0", "o")


def paginas(texto):
    partes = re.split(r"\n## Página (\d+)\n", texto)
    return {int(partes[i]): partes[i + 1] for i in range(1, len(partes), 2)}


def lixo(s):
    """Linha de ruído do OCR (figuras e diagramação): quase sem letras reais."""
    if len(s) < 8:
        return False
    boas = sum(c.isalnum() or c in " .,;:()-–%/§º°ª\"'“”" for c in s)
    palavras = [w for w in re.findall(r"[A-Za-zÀ-ÿ]+", s) if len(w) >= 3]
    return boas / len(s) < 0.75 or (len(s) >= 12 and not palavras)


def corrente(l, cfg):
    """Cabeçalho/rodapé corrente, número de página ou lixo de diagramação."""
    s = l.strip()
    if not s:
        return False
    n = norm(s)
    if re.fullmatch(r"\d{1,3}|[#\s]{1,8}|[•·\-–—]", s):          # número de página (21, "# # #")
        return True
    if lixo(s):
        return True
    if re.match(r"^(cap\.?\s*[\dIVXLil]+\s*[•.·]|cap\.?\s*\d+\.)", s, re.I):
        return True
    if re.match(r"^parte\s+[IVXLivxl]+\s*[•.·]", s):
        return True
    if any(n.startswith(h) for h in cfg.get("cabecalho", [])):
        return True
    if any(re.search(r, s) for r in cfg.get("remover", [])):
        return True
    return False


def sumario_blob(pgs, ini, fim):
    return norm(" ".join(pgs[k] for k in range(ini, fim + 1) if k in pgs))


def corrigir_ocr(p):
    # "0" no lugar de "o" (artigo): "0 homem", "Segundo 0 autor"; não mexe em "0 a 6 anos" nem em "0,5"
    p = re.sub(r"(?<![\d.,/§º°-])\b0(?= (?!a \d|e \d|\d|%|,|\.)[A-Za-zÀ-ÿ])", "o", p)
    p = re.sub(r"(^|[.:;!?] )o ", lambda m: m.group(1) + "O ", p)
    p = re.sub(r"(?<=[a-zà-ÿ])-\s?-?0(?![\d,.])", "-o", p).replace("- -o", "-o")
    p = p.replace("’", "'")
    return p


def montar_paragrafos(linhas, blob, titulo_nivel):
    """Une as linhas em parágrafos; devolve lista de blocos (str) já em Markdown."""
    blocos, atual = [], ""
    i = 0
    def fecha():
        nonlocal atual
        if atual.strip():
            blocos.append(corrigir_ocr(atual.strip()))
        atual = ""
    while i < len(linhas):
        l = linhas[i].rstrip()
        s = l.strip()
        i += 1
        if not s:
            continue
        # título numerado: "1.2 Texto" ou "1.2." + título na linha seguinte
        m = re.match(r"^([1-9]\d?|[lI](?=\.))((?:\.\d{1,2}){0,4})(\.|(?<=\d)\s)\s*(.*)$", s)
        if m and len(s) < 170:
            num, tit = ("1" if m.group(1) in "lI" else m.group(1)) + m.group(2), m.group(4).strip()
            usado = 0
            if not tit and i < len(linhas):
                tit = linhas[i].strip()
                usado = 1
            if tit and (tit[0].isupper() or tit[0] == "0") and not tit.endswith((",", ";")) and len(norm(tit)) >= 6 and norm(tit)[:18] in blob:
                fecha()
                i += usado
                nivel = min(num.count(".") + 2, 5)
                blocos.append("#" * nivel + f" {num}. {corrigir_ocr(tit.rstrip('.'))}")
                continue
        if s.startswith(SHY):
            s = s[1:]
        novo = False
        if atual:
            if ITEM.match(s):
                novo = True
            elif FIM_FRASE.search(atual) and (s[:1].isupper() or s[:1].isdigit()):
                novo = True
        if novo:
            fecha()
        if atual.endswith(SHY):
            atual = atual[:-1] + s
        elif atual.endswith("-") and s[:1].islower() and re.search(r"[a-zà-ÿ]-$", atual) and atual.rsplit(" ", 1)[-1].lower().rstrip("-") not in MANTEM:
            atual = atual[:-1] + s
        else:
            atual = (atual + " " + s).strip() if atual else s
    fecha()
    return blocos


def corpo_da_pagina(txt, cfg):
    ls = [l for l in txt.split("\n")]
    return [l for l in ls if not corrente(l, cfg)]


def achar_titulo(pgs, p, minimo, titulo):
    """(página, índice da linha) da linha que abre o capítulo, procurando primeiro na página do sumário e perto dela."""
    alvo = norm(titulo)[:16]
    for k in [p, p + 1, p - 1, p - 2, p - 3, p + 2]:
        if k < minimo or k not in pgs:
            continue
        ls = pgs[k].split("\n")
        for j, l in enumerate(ls):
            s = l.strip()
            if len(s) < 3 or len(s) > 90:
                continue
            if re.match(r"^(cap\.?\s*[\dIVXLil]+\s*[•.·]|parte\s+[IVX]+\s*[•.·])", s, re.I):
                continue          # cabeçalho corrente, não é a abertura
            n = norm(s)
            junto = n + (norm(ls[j + 1]) if j + 1 < len(ls) else "")
            if n.startswith(alvo) or (len(n) >= 5 and alvo.startswith(n) and junto.startswith(alvo)):
                return k, j
    return None


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    texto = open(sys.argv[1], encoding="utf-8").read()
    cfg = json.load(open(sys.argv[2], encoding="utf-8"))
    pgs = paginas(texto)
    ult = max(pgs)
    blob = sumario_blob(pgs, cfg["toc"][0], cfg["toc"][1])
    desl = cfg["deslocamento"]
    caps = cfg["capitulos"]
    # onde cada capítulo começa: (página, linha)
    ini = []
    anterior = (cfg["toc"][1], 0)
    for k, c in enumerate(caps):
        p = c["pag"] + desl
        a = achar_titulo(pgs, p, anterior[0], c.get("busca", c["t"]))
        if a is None or a < anterior:
            a = (p, 0)
            print(f"  aviso: título do capítulo {k + 1} não achado, corte no início da página {p}", file=sys.stderr)
        ini.append(a)
        anterior = a
    fim_livro = cfg.get("fim")
    saida = []
    for k, c in enumerate(caps):
        (p0, l0) = ini[k]
        (p1, l1) = ini[k + 1] if k + 1 < len(caps) else ((fim_livro or ult), None)
        linhas = []
        for pg in range(p0, p1 + 1):
            if pg not in pgs:
                continue
            ls = pgs[pg].split("\n")
            if pg == p0:
                ls = ls[l0:]
            if l1 is not None and pg == p1:
                ls = ls[:l1]
            linhas += corpo_da_pagina("\n".join(ls), cfg)
            linhas.append("")
        # tira o título repetido no início (a abertura do capítulo) e propaganda
        linhas = [l for l in linhas if not PROPAGANDA.search(l)]
        blocos = montar_paragrafos(linhas, blob, None)
        # o título do capítulo já está no campo "t": descarta blocos de abertura até o primeiro texto longo ou título de seção
        while blocos and not blocos[0].startswith("#") and len(blocos[0]) < 90 and len(blocos) > 1:
            blocos.pop(0)
        blocos = [b for b in blocos if not b.startswith("Sumário:")]     # resumo de abertura do capítulo (repete os títulos)
        while blocos and blocos[0].startswith("####"):                   # restos do sumário antes do primeiro título
            blocos.pop(0)
        md = "\n\n".join(blocos).strip()
        if len(md) < 120:
            sys.exit(f"capítulo {k + 1} ({c['t']}) ficou sem texto")
        saida.append({"id": f"c{k + 1}", "t": f"{k + 1}. {c['t']}", "md": md})
    for c in saida:
        for x in re.findall(r"[^\n]{0,40}(?:jus ?class|jus ?podivm|editora jus)[^\n]{0,40}", c["md"], re.I):
            print(f"  ATENÇÃO: menção de origem comercial em {c['t']}: {x!r}", file=sys.stderr)
    e = {"id": cfg["id"], "titulo": cfg["titulo"], "subtitulo": cfg["subtitulo"], "disc": cfg["disc"],
         "atualizado": date.today().isoformat(), "caps": saida}
    if cfg.get("grupo"):
        e["grupo"] = cfg["grupo"]
    json.dump(e, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False)
    print(f"{sys.argv[3]}: {len(saida)} capítulos, {sum(len(c['md']) for c in saida):,} caracteres")
    for c in saida:
        print(f"  {c['id']:>4}  {len(c['md']):>8,}  {c['t']}")


if __name__ == "__main__":
    main()
