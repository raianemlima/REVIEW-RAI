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


def montar_paragrafos(linhas, blob, livres=False):
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
            if tit and (tit[0].isupper() or tit[0] == "0") and not tit.endswith((",", ";")) and len(norm(tit)) >= 6 and ((norm(tit)[:18] in blob) or (livres and "." in num and len(s) < 120 and not tit.endswith("."))):
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


def achar_sequencial(pgs, desde, ult, titulo, minimo):
    alvo = norm(titulo)
    for k in range(max(desde, minimo), ult + 1):
        if k not in pgs:
            continue
        for j, l in enumerate(pgs[k].split("\n")):
            s = re.sub(r"^\d+(\.\d+)*\.?\s*", "", l.strip())
            if 3 < len(s) <= 110 and norm(s) == alvo[:len(norm(s))] and len(norm(s)) >= min(len(alvo), 14) and not corrente(s, {}):
                return k, j
    return None


def sem_lista_de_abertura(linhas):
    """Tira a lista de itens (resumo do capítulo) que abre o capítulo, até o 1º título "N.1 MAIÚSCULAS" ou o 1º parágrafo de prosa."""
    def maiuscula(t):
        letras = [c for c in t if c.isalpha()]
        return bool(letras) and sum(c.isupper() for c in letras) / len(letras) > 0.6
    cabeca = [l.strip() for l in linhas[:220]]
    if not any(re.search(r"\b\d{1,2}\.\d{1,2}\b", l) for l in cabeca[:12]):
        return linhas                     # não abre com lista de itens
    for i, s in enumerate(cabeca):
        if re.match(r"^\d{1,2}\.1\.?\s+\S", s) and maiuscula(s):
            return linhas[i:]
        if len(s) >= 70 and not re.search(r"\d\.\d", s) and s[:1].isalpha() and not s.startswith("Sumário"):
            return linhas[i:]
    return linhas


PALAVRA = re.compile(r"[(“\"‘]?(?:[a-zà-ú]+|[A-ZÀ-Ú][a-zà-ú]+|[A-ZÀ-Ú]{2,})(?:-[A-Za-zÀ-ú]+)?[)”\"’]?[.,;:!?]?\)?")


def boa(w):
    """Palavra plausível: sem símbolos de ruído do OCR; siglas, hifens e barras valem."""
    w = w.strip("()“”\"‘’.,;:!?[]")
    if not w or not re.search(r"[A-Za-zÀ-ÿ]", w):
        return True
    if re.search(r"[_|~^<>{}\\@#$%&*=¬■□♦]", w) or re.search(r"[A-Za-zÀ-ÿ]\d|\d[A-Za-zÀ-ÿ]{2,}", w):
        return False
    if w.islower() and len(w) > 3 and not re.search(r"[aeiouáéíóúâêôãõày]", w):
        return False
    return len(w) <= 28 and not re.search(r"[a-zà-ÿ][A-ZÀ-Ý][a-zà-ÿ]", w)


def numero_impresso(ls, cfg):
    """Número de página impresso, lido do cabeçalho/rodapé (primeiras e últimas linhas); None se não houver."""
    cand = [l.strip() for l in ls if l.strip()]
    for l in cand[:3] + cand[-3:]:
        m = re.fullmatch(r"(\d{1,4})\.?", l) or re.fullmatch(r"(\d)\s(\d)\s?(\d)?", l)
        if m:
            return int("".join(g for g in m.groups() if g))
        if corrente(l, cfg) or any(norm(l).startswith(h) for h in cfg.get("cabecalho", [])):
            m = re.match(r"^(\d{1,4})\s+\D", l) or re.search(r"\D\s(\d{1,4})$", l)
            if m:
                return int(m.group(1))
    return None


def modo_paginas(pgs, cfg, ini, caps, ult, saida):
    """Saída página a página (formato do montar_livro.py da biblioteca de citações): texto de cada página com o número impresso."""
    de = ini[0][0]
    ate = cfg.get("fim") or ult
    blob = sumario_blob(pgs, cfg["toc"][0], cfg["toc"][1])
    brutas = {}
    for k in range(de, ate + 1):
        if k not in pgs:
            continue
        ls = pgs[k].split("\n")
        corpo = [l for l in ls if not PROPAGANDA.search(l)]
        blocos = montar_paragrafos(corpo_da_pagina("\n".join(corpo), cfg), blob, cfg.get("titulos_livres", False))
        texto = "\n\n".join(re.sub(r"^#+\s+", "", b) for b in blocos).strip()
        brutas[k] = (numero_impresso(ls, cfg), texto)
    from collections import Counter
    difs = Counter(n - k for k, (n, _) in brutas.items() if n is not None)
    if not difs:
        sys.exit("nenhum número de página impresso reconhecido")
    desl, vezes = difs.most_common(1)[0]
    print(f"  deslocamento página impressa - página do PDF: {desl:+d} (confere em {vezes} de {len(brutas)} páginas)", file=sys.stderr)
    sem_numero = vezes < 5
    if sem_numero:
        print("  AVISO: o texto não traz número de página impresso; as páginas saem como [n] da digitalização (confira no livro antes de citar)", file=sys.stderr)
    paginas, descartadas = [], 0
    for k, (n, texto) in sorted(brutas.items()):
        if len(texto) < 60:
            descartadas += 1
            continue
        pal = [w for w in re.findall(r"\S+", texto) if re.search(r"[A-Za-zÀ-ú]", w)]
        ruins = sum(1 for w in pal if not boa(w))
        conf = round(max(0, 100 - 6 * 100 * ruins / len(pal))) if pal else 0
        if conf < 60:
            descartadas += 1
            continue
        duv = sorted({w.strip("()“”\"‘’.,;:!?") for w in re.findall(r"\S+", texto) if re.search(r"[A-Za-zÀ-ú]{2}", w) and not boa(w)} - {""})[:60]
        p = {"n": k, "impressa": None if sem_numero else str(k + desl), "texto": texto, "notas": "", "duvidas": duv, "confianca": conf}
        if not sem_numero and n != k + desl:
            p["deduzida"] = True
        paginas.append(p)
    json.dump({"arquivo": cfg["id"], "paginas": paginas}, open(saida, "w", encoding="utf-8"), ensure_ascii=False)
    nomes = [] if sem_numero else [[i + 1, c["t"], ini[i][0] + desl] for i, c in enumerate(caps)]
    json.dump(nomes, open(saida + ".capitulos.json", "w", encoding="utf-8"), ensure_ascii=False)
    media = sum(p["confianca"] for p in paginas) / len(paginas)
    print(f"{saida}: {len(paginas)} páginas ({descartadas} descartadas por pouco texto ou leitura ruim), confiança média {media:.0f}%, {sum(p['confianca'] < 85 for p in paginas)} abaixo de 85%")


def main():
    if len(sys.argv) not in (4, 5):
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
        if "pdf" in c:                      # página do PDF dada à mão: o capítulo começa no início dela
            ini.append((c["pdf"], 0))
            anterior = ini[-1]
            continue
        if "pag" not in c:                  # sem página: primeira linha-título depois do capítulo anterior
            a = achar_sequencial(pgs, anterior[0] + (1 if k else 0), ult, c.get("busca", c["t"]), cfg.get("busca_de", 0))
            if a is None:
                print(f"  aviso: título do capítulo {k + 1} ({c['t']}) não achado; o texto fica no capítulo anterior", file=sys.stderr)
                ini.append(None)
                continue
            ini.append(a)
            anterior = a
            continue
        p = c["pag"] + desl
        a = achar_titulo(pgs, p, anterior[0], c.get("busca", c["t"]))
        if a is None or a < anterior:
            a = (p, 0)
            print(f"  aviso: título do capítulo {k + 1} não achado, corte no início da página {p}", file=sys.stderr)
        ini.append(a)
        anterior = a
    caps = [c for c, a in zip(caps, ini) if a is not None]
    ini = [a for a in ini if a is not None]
    if len(sys.argv) == 5 and sys.argv[4] == "--paginas":
        return modo_paginas(pgs, cfg, ini, caps, ult, sys.argv[3])
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
        if cfg.get("abertura_lista"):
            linhas = sem_lista_de_abertura(linhas)
        # tira o título repetido no início (a abertura do capítulo) e propaganda
        linhas = [l for l in linhas if not PROPAGANDA.search(l)]
        blocos = montar_paragrafos(linhas, blob, cfg.get("titulos_livres", False))
        # o título do capítulo já está no campo "t": descarta blocos de abertura até o primeiro texto longo ou título de seção
        while blocos and not blocos[0].startswith("#") and len(blocos[0]) < 90 and len(blocos) > 1:
            blocos.pop(0)
        # abertura do capítulo: resumo de itens ("Sumário: 1.1 ... - 1.2 ..."), restos de sumário e títulos soltos
        def abertura(b):
            return (b.startswith(("Sumário:", "####")) or (len(b) < 1800 and len(re.findall(r"\b\d{1,2}\.\d{1,2}", b)) >= 3 and not b.startswith("##")))
        while blocos and abertura(blocos[0]):
            blocos.pop(0)
        blocos = [b for b in blocos if not b.startswith("Sumário:")]
        md = "\n\n".join(blocos).strip()
        if len(md) < 120:
            if cfg.get("tolerar_vazios"):
                print(f"  aviso: capítulo '{c['t']}' ficou sem texto e foi omitido", file=sys.stderr)
                continue
            sys.exit(f"capítulo {k + 1} ({c['t']}) ficou sem texto")
        saida.append({"id": f"c{len(saida) + 1}", "t": f"{len(saida) + 1}. {c['t']}", "md": md})
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
