"""Converte um e-book em PDF (texto corrido, títulos nos marcadores do PDF) para Markdown.

    python pdf2md.py ENTRADA.pdf SAIDA.md "Título do documento" [pagina_inicial pagina_final]

- títulos: hierarquia dos marcadores do PDF (nível 1 do PDF = "###"); capítulos pelo cabeçalho de página ("NOME • N")
- parágrafos: linhas do PDF unidas (recuo da primeira linha, espaçamento vertical e marcadores "a)", "1.", "•" abrem parágrafo)
- negrito e itálico preservados; cabeçalho, rodapé e sumário impresso (pontilhado) removidos
- caixas de destaque ("ATENÇÃO", "QUESTÕES DE CONCURSO", "GABARITO COMENTADO") viram citações (>)
- tabelas de dados viram tabelas Markdown; imagens não são extraídas (contagem no relatório final)
"""
import re
import sys
import unicodedata

import pymupdf

TOPO, BASE = 40, 790          # faixa útil da página (cabeçalho e rodapé ficam fora)
INICIO_PARAGRAFO = re.compile(r"^(?:[a-eA-E]\)|\d{1,3}[\.\)]\s|[IVX]{1,4}\s*[–-]\s|•|-\s|–\s)")
FIM_DE_FRASE = (".", "!", "?", ":", ";", ")", "”", '"')


def norm(t):
    t = "".join(c for c in unicodedata.normalize("NFD", t.lower()) if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


def negrito(s):
    return bool(s["flags"] & 16) or "Bold" in s["font"] or "bold" in s["font"]


def italico(s):
    return bool(s["flags"] & 2) or "Italic" in s["font"] or "Oblique" in s["font"]


class Linha:
    __slots__ = ("x0", "y0", "y1", "tam", "runs", "texto", "neg")

    def __init__(self, l):
        sp = [s for s in l["spans"] if s["text"].strip()]
        self.x0, self.y0, _, self.y1 = l["bbox"]
        self.tam = max(s["size"] for s in sp)
        self.runs = [(s["text"], negrito(s), italico(s)) for s in l["spans"]]
        self.texto = "".join(r[0] for r in self.runs).strip()
        self.neg = all(negrito(s) for s in sp)


def md_inline(runs):
    """Junta runs de mesmo estilo e escreve **negrito** / *itálico* com os espaços fora dos marcadores."""
    juntos = []
    for t, b, i in runs:
        if juntos and not t.strip():          # espaço entre linhas herda o estilo vizinho
            juntos[-1][0] += t
        elif juntos and tuple(juntos[-1][1:]) == (b, i):
            juntos[-1][0] += t
        else:
            juntos.append([t, b, i])
    out = []
    for t, b, i in juntos:
        t = re.sub(r"([*_`\\])", r"\\\1", t)
        miolo = t.strip()
        if not miolo or not (b or i):
            out.append(t)
            continue
        m = "***" if b and i else "**" if b else "*"
        out.append(t[:len(t) - len(t.lstrip())] + m + miolo + m + t[len(t.rstrip()):])
    return re.sub(r"[ \t]+", " ", "".join(out)).strip()


class Fluxo:
    """Monta parágrafos a partir de linhas em ordem de leitura. Pode atravessar páginas."""

    def __init__(self):
        self.par = None
        self.saida = []

    def fechar(self):
        if self.par:
            txt = md_inline(self.par["runs"])
            if txt:
                if txt.startswith("•"):
                    txt = "- " + txt.lstrip("• ").strip()
                self.saida.append(txt)
            self.par = None

    def novo(self, ln, tamanho_ref):
        p = self.par
        if p is None:
            return True
        if ln.y0 - p["y0"] > ln.tam * 1.75 and ln.y0 > p["y0"]:
            return True
        if INICIO_PARAGRAFO.match(ln.texto):
            return True
        if (ln.x0 - p["base"]) >= 25 and (p["x0"] - p["base"]) < 12:
            return True
        # linha toda em negrito logo depois de uma frase completa (ou o inverso, depois de um título curto): parágrafo novo
        if ln.neg != p["neg"] and p["texto"].rstrip().endswith(FIM_DE_FRASE + ("?",)) and (ln.neg or len(p["texto"]) < 90):
            return True
        if ln.neg != p["neg"] and p["neg"] and len(p["texto"]) < 90:
            return True
        if ln.neg and ln.x0 > p["base"] + 80 and len(ln.texto) < 70:
            return True
        return False

    def add(self, ln, base, topo_de_pagina=False):
        if self.par is not None and topo_de_pagina:
            # continuação de página: só abre parágrafo novo se o anterior acabou e este começa como início de frase
            p = self.par
            fim = p["texto"].rstrip().endswith(FIM_DE_FRASE)
            abre = (ln.x0 - base) >= 25 or INICIO_PARAGRAFO.match(ln.texto) or ln.neg != p["neg"] or p["neg"]
            if not (abre or (fim and ln.texto[:1].isupper())):
                self.continuar(ln)
                return
            self.fechar()
        elif self.novo(ln, base):
            self.fechar()
        if self.par is None:
            self.par = {"runs": [], "texto": "", "y0": ln.y0, "x0": ln.x0, "base": base, "neg": ln.neg}
        self.continuar(ln)

    def continuar(self, ln):
        p = self.par
        # palavra composta/hifenizada quebrada no fim da linha: "político-" + "jurídico"
        if p["texto"].endswith("-") and ln.texto[:1].islower() and len(p["texto"]) > 1 and p["texto"][-2].isalpha():
            p["runs"] = p["runs"][:-1] + [(p["runs"][-1][0].rstrip(), p["runs"][-1][1], p["runs"][-1][2])] if p["runs"] else []
        else:
            p["runs"].append((" ", False, False))
        p["runs"].extend(ln.runs)
        p["texto"] = (p["texto"] + " " + ln.texto).strip() if not p["texto"].endswith("-") else p["texto"] + ln.texto
        p["y0"], p["x0"] = ln.y0, ln.x0
        p["neg"] = p["neg"] and ln.neg


def caixa_para_citacao(linhas):
    """Linhas de uma caixa de destaque -> bloco de citação (primeira linha em negrito curta = título)."""
    if not linhas:
        return ""
    base = min(l.x0 for l in linhas)
    f = Fluxo()
    for l in linhas:
        f.add(l, base)
    f.fechar()
    blocos = f.saida
    if not blocos:
        return ""
    partes = []
    if blocos[0].startswith("**") and len(blocos[0]) < 90 and len(blocos) > 1:
        partes.append("> " + blocos[0])
        blocos = blocos[1:]
    for b in blocos:
        partes.append(">\n> " + b.replace("\n", "\n> ") if partes else "> " + b.replace("\n", "\n> "))
    return "\n".join(partes)


def tabela_md(rows):
    rows = [[(c or "").replace("\n", " ").strip() for c in r] for r in rows if any((c or "").strip() for c in r)]
    if not rows:
        return ""
    n = max(len(r) for r in rows)
    rows = [r + [""] * (n - len(r)) for r in rows]
    uteis = [j for j in range(n) if any(r[j] for r in rows)]
    rows = [[r[j] for j in uteis] for r in rows]
    n = len(uteis)
    esc = lambda c: c.replace("|", "\\|")
    out = ["| " + " | ".join(esc(c) for c in rows[0]) + " |", "|" + "---|" * n]
    out += ["| " + " | ".join(esc(c) for c in r) + " |" for r in rows[1:]]
    return "\n".join(out)


def converter(pdf, saida, titulo, ini=None, fim=None):
    doc = pymupdf.open(pdf)
    toc = doc.get_toc()
    entradas = [{"nivel": lv, "titulo": t, "pag": p, "norm": norm(t), "usada": False} for lv, t, p in toc if norm(t)]
    primeira = (toc[0][2] - 1) if toc else 0
    capitulos, ordem = {}, []           # número -> título; e (número, primeira seção) na ordem do sumário impresso
    atual = None
    for p in doc:
        for l in p.get_text().splitlines():
            m = re.match(r"^\s*CAP[ÍI]TULO\s+(\d+)\.?\s*(.+?)\s*\.{4,}", l)
            if m:
                capitulos[int(m.group(1))] = re.sub(r"\s+", " ", m.group(2)).strip()
                atual = [int(m.group(1)), None]
                ordem.append(atual)
            elif atual and atual[1] is None and re.search(r"\.{4,}", l):
                m2 = re.match(r"^\s*(\d+[\.\)].*?)\s*\.{4,}", l)
                if m2:
                    atual[1] = norm(m2.group(1))
    # a página onde cada capítulo começa: o primeiro marcador do PDF com o mesmo título da primeira seção do capítulo
    pos, marcados = 0, set()
    for n, primeira_secao in ordem:
        if not primeira_secao:
            continue
        for k in range(pos, len(entradas)):
            if entradas[k]["norm"] == primeira_secao:
                entradas[k]["cap"] = n
                marcados.add(n)
                pos = k + 1
                break
    f = Fluxo()
    blocos = [f"# {titulo}", ""]
    ultimo_cap, n_img, nao_achadas, emitidos = None, 0, 0, set()
    paginas = range(ini or 0, fim or len(doc))

    def esvaziar():
        f.fechar()
        for b in f.saida:
            blocos.extend([b, ""])
        f.saida = []

    for pno in paginas:
        page = doc[pno]
        n_img += sum(1 for b in page.get_text("dict")["blocks"] if b["type"] == 1 and b["bbox"][1] > TOPO and b["bbox"][3] < BASE)
        linhas, cab = [], ""
        for b in page.get_text("dict", sort=True)["blocks"]:
            if b["type"] != 0:
                continue
            for l in b["lines"]:
                if not any(s["text"].strip() for s in l["spans"]):
                    continue
                ln = Linha(l)
                if ln.y0 < TOPO:
                    cab += " " + ln.texto
                elif ln.tam >= 20:
                    continue
                elif ln.y0 < BASE and not re.search(r"\.{5,}", ln.texto):
                    linhas.append(ln)
        # capítulo pelo cabeçalho "NOME • N"
        if pno >= primeira:
            m = re.search(r"([^•]+?)\s*•\s*(\d+)\s*$", cab.strip())
            if m and int(m.group(2)) != ultimo_cap:
                n = int(m.group(2))
                ultimo_cap = n
                if n not in marcados and n not in emitidos:
                    esvaziar()
                    emitidos.add(n)
                    blocos.append(f"## Capítulo {n} — {capitulos.get(n, m.group(1).strip().title())}"); blocos.append("")
        # caixas e tabelas
        caixas = []
        try:
            for t in page.find_tables().tables:
                rows = t.extract()
                cheias = max((sum(1 for c in r if c and c.strip()) for r in rows), default=0)
                dentro = [l for l in linhas if t.bbox[0] - 3 <= (l.x0 + 2) <= t.bbox[2] and t.bbox[1] - 3 <= (l.y0 + l.y1) / 2 <= t.bbox[3] + 3]
                caixas.append((t.bbox[1], "citacao" if cheias <= 1 else "tabela", dentro, rows))
        except Exception:
            pass
        usadas = {id(l) for _, _, d, _ in caixas for l in d}
        livres = [l for l in linhas if id(l) not in usadas]
        base = min((l.x0 for l in livres), default=57)
        elementos = sorted([(l.y0, "linha", l) for l in livres] + [(y, k, (d, r)) for y, k, d, r in caixas], key=lambda e: e[0])
        # títulos: o menor trecho de linhas que reproduz o título do marcador, nesta página ou ao lado
        if any(e.get("cap") and e["cap"] not in emitidos and e["pag"] - 1 == pno for e in entradas):
            esvaziar()   # capítulo novo nesta página: o que estava pendente é do capítulo anterior e precisa ser gravado antes
        inicio_pagina = len(blocos)
        cand = [e for e in entradas if not e["usada"] and abs(e["pag"] - 1 - pno) <= 1]
        i, primeiro = 0, True
        while i < len(elementos):
            y, tipo, obj = elementos[i]
            if tipo == "linha":
                achou = None
                for e in cand:
                    if e["usada"]:
                        continue
                    acum = ""
                    for k in range(0, 4):
                        if i + k >= len(elementos) or elementos[i + k][1] != "linha":
                            break
                        acum = (acum + " " + elementos[i + k][2].texto).strip()
                        if norm(acum) == e["norm"]:
                            achou = (e, k + 1); break
                        if len(norm(acum)) > len(e["norm"]):
                            break
                    if achou:
                        break
                if achou:
                    e, n = achou
                    e["usada"] = True
                    esvaziar()
                    if e.get("cap") and e["cap"] not in emitidos:
                        emitidos.add(e["cap"])
                        blocos += [f"## Capítulo {e['cap']} — {capitulos.get(e['cap'], '')}", ""]
                    blocos += ["#" * (e["nivel"] + 2) + " " + re.sub(r"\s+", " ", e["titulo"]).strip(), ""]
                    i += n; primeiro = False
                    continue
                f.add(obj, base, topo_de_pagina=primeiro)
                primeiro = False
            else:
                esvaziar()
                dentro, rows = obj
                txt = caixa_para_citacao(dentro) if tipo == "citacao" else tabela_md(rows)
                if txt:
                    blocos += [txt, ""]
                primeiro = False
            i += 1
        for e in entradas:
            if e.get("cap") and e["cap"] not in emitidos and e["pag"] - 1 <= pno:
                emitidos.add(e["cap"])   # o título que abre o capítulo não foi reconhecido no texto: o capítulo entra no começo desta página
                blocos[inicio_pagina:inicio_pagina] = [f"## Capítulo {e['cap']} — {capitulos.get(e['cap'], '')}", ""]
    esvaziar()
    nao_achadas = sum(1 for e in entradas if not e["usada"] and (ini is None or ini <= e["pag"] - 1 < (fim or len(doc))))
    # sumário gerado dos marcadores (sem números de página), logo depois do título
    sumario = ["## Sumário", ""] + ["  " * (lv - 1) + "- " + re.sub(r"\s+", " ", t).strip() for lv, t, _ in toc if ini is None] + [""]
    texto = "\n".join(blocos[:2] + (sumario if ini is None else []) + blocos[2:])
    texto = re.sub(r"\n{3,}", "\n\n", texto).strip() + "\n"
    open(saida, "w", encoding="utf-8", newline="\n").write(texto)
    for e in entradas:
        if not e["usada"] and (ini is None or ini <= e["pag"] - 1 < (fim or len(doc))):
            print(f"  título de marcador não reconhecido no texto (pág. {e['pag']}): {e['titulo'][:90]}")
    print(f"{len(paginas)} páginas -> {len(texto):,} caracteres; títulos dos marcadores não encontrados no texto: {nao_achadas}/{len(entradas)}; imagens ignoradas: {n_img}")


if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) < 3:
        sys.exit(__doc__)
    converter(a[0], a[1], a[2], int(a[3]) if len(a) > 3 else None, int(a[4]) if len(a) > 4 else None)
