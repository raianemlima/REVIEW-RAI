"""Extrai os PDFs "Legislação Decodificada" (Decorando a Lei Seca) para o formato de lei seca do app.

    python ferramentas/conteudo/leiseca_decodificada.py SAIDA/ arquivo1.pdf [arquivo2.pdf ...]

Gera um JSON por lei em SAIDA/ (id, nome, curto, disc, fonte, grupos), no mesmo formato de
dados/leiseca/*.json, com campos extras que o leitor de Lei seca entende:

- item de artigo: a, x (texto com "Art. Nº"), g (grifos: [[trecho, classe], ...]), n (questões do artigo),
  rec (concursos recentes), j (jurisprudência correlata), stf (decisões/avisos em destaque)
- itens {q, b} logo depois do artigo: assertivas que as bancas consideraram corretas
  (Doutrina das Bancas e Decorando a Jurisprudência), exibidas em "Como caiu em prova"

Classes de grifo: v/V vermelho claro/escuro (pegadinha), a/A azul claro/escuro (ponto cobrado),
d dourado (caiu dos dois jeitos), m azul-marinho (grifado na íntegra), b negrito sem cor.

Também gera "cartoes": cartões de lacuna nos trechos grifados dos artigos com 4 ou mais questões.

CONTEÚDO PAGO: a saída em claro NUNCA vai para este repositório público. Cifre com
ferramentas/ajustes/cifrar_leiseca.mjs (vira leiseca-cifrada/<id>.bin) e a publicação insere no baralho
(ferramentas/ci/aplicar_leiseca.mjs). A marca d'água com dados pessoais do comprador é descartada na
extração e a saída é conferida para não conter esse tipo de dado. Requer PyMuPDF (pip install pymupdf).
"""
import json
import re
import sys
from pathlib import Path

import pymupdf

COR_GRIFO = {"bc3048": "v", "9e1028": "V", "2869ad": "a", "0a3f78": "A", "94600c": "d", "0b2e59": "m"}
CABECALHOS = {
    "JURISPRUDÊNCIACORRELATA": "jur",
    "DECORANDOAJURISPRUDÊNCIA": "djur",
    "DECORANDOADOUTRINADASBANCAS": "dout",
}
ESTRUTURA = re.compile(r"^(LIVRO|PARTE|TÍTULO|CAPÍTULO|SEÇÃO|SUBSEÇÃO|ATO DAS DISPOSIÇÕES|DISPOSIÇÕES)\b")
NIVEL = {"LIVRO": 0, "PARTE": 0, "TÍTULO": 1, "CAPÍTULO": 2, "SEÇÃO": 3, "SUBSEÇÃO": 4}
MARCA_DAGUA = re.compile(r"uid:|cpfCnpj:|email:|Baixado por", re.I)
INICIO_LINHA = re.compile(r"^(?:[IVXLC]+\s*[-–—]|[a-z]\)|\d+\.\s|§|Parágrafo único|Art\.)")

# id, nome, curto e disciplina (resolvida no baralho pelo nome canônico na inserção)
LEIS = [
    # leis específicas antes dos códigos: o título e a 1ª página de uma lei podem citar um código
    (r"Execução Penal|7\.?210", "lep-dls", "Lei de Execução Penal · Lei 7.210/1984 · Decodificada", "LEP (curso)", "@execucao penal"),
    (r"Criança e do Adolescente|8\.?069", "eca-dls", "Estatuto da Criança e do Adolescente · Lei 8.069/1990 · Decodificado", "ECA (curso)", "@crianca"),
    (r"Maria da Penha|11\.?340", "lmp-dls", "Lei Maria da Penha · Lei 11.340/2006 · Decodificada", "Maria da Penha (curso)", "@penal"),
    (r"Lei de Drogas|11\.?343", "drogas-dls", "Lei de Drogas · Lei 11.343/2006 · Decodificada", "Drogas (curso)", "@penal"),
    (r"Defesa do Consumidor|8\.?078", "cdc-dls", "Código de Defesa do Consumidor · Lei 8.078/1990 · Decodificado", "CDC (curso)", "@consumidor"),
    (r"14\.?133", "l14133-dls", "Lei 14.133/2021 · Licitações e Contratos · Decodificada", "Lei 14.133 (curso)", "@administrativo"),
    (r"8\.?429", "lia-dls", "Lei 8.429/1992 · Improbidade Administrativa · Decodificada", "LIA (curso)", "@administrativo"),
    (r"8\.?112", "l8112-dls", "Lei 8.112/1990 · Servidores Públicos Federais · Decodificada", "Lei 8.112 (curso)", "@administrativo"),
    (r"Idosa|10\.?741", "idoso-dls", "Estatuto da Pessoa Idosa · Lei 10.741/2003 · Decodificado", "Idoso (curso)", "@direitos humanos"),
    (r"Desarmamento|10\.?826", "desarm-dls", "Estatuto do Desarmamento · Lei 10.826/2003 · Decodificado", "Desarmamento (curso)", "@penal"),
    (r"Constituição Federal", "cf-dls", "Constituição Federal · Decodificada", "CF (curso)", "@constitucional"),
    (r"Processo Civil", "cpc-dls", "Código de Processo Civil · Decodificado", "CPC (curso)", "@processo civil"),
    (r"Processo Penal", "cpp-dls", "Código de Processo Penal · Decodificado", "CPP (curso)", "@processo penal"),
    (r"Código Penal", "cp-dls", "Código Penal · Decodificado", "CP (curso)", "@penal"),
    (r"Código Civil", "cc-dls", "Código Civil · Decodificado", "CC (curso)", "@civil"),
]


def junta_espacadas(t):
    """'C A P Í T U L O I I' -> 'CAPÍTULO II'."""
    partes = t.split(" ")
    if len(partes) > 3 and sum(len(p) == 1 for p in partes) >= len(partes) * 0.7:
        palavras, atual = [], ""
        for p in t.split("  ") if "  " in t else [t]:
            palavras.append(p.replace(" ", ""))
        txt = " ".join(palavras)
        txt = re.sub(r"^(LIVRO|PARTE|TÍTULO|CAPÍTULO|SEÇÃO|SUBSEÇÃO)([IVXLC]+(?:-[A-Z])?|ÚNIC[OA])$", r"\1 \2", txt)
        return txt
    return t


def cor(s):
    return f'{s["color"]:06x}'


def spans_da_pagina(pg):
    out = []
    for b in pg.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            for s in l["spans"]:
                t = s["text"]
                if not t.strip() or MARCA_DAGUA.search(t):
                    continue
                x0, y0, x1, y1 = s["bbox"]
                if y0 > 805:                      # rodapé e numeração de página
                    continue
                if t.strip() == "A N O TA Ç Õ E S":
                    continue
                out.append({"t": t, "x": x0, "y": (y0 + y1) / 2, "sz": round(s["size"], 1), "c": cor(s), "f": s["font"]})
    return out


def rotulo_dispositivo(s):
    """'§ 1º', 'Parágrafo único.', 'II -', 'a)': rótulos em fonte própria, com linha de base um pouco abaixo do texto."""
    return s["f"].startswith("ArchivoSemiBold") and 8.3 <= s["sz"] <= 9.5 and 62 <= s["x"] < 140


def linhas(spans):
    """Agrupa spans em linhas pela altura; spans da margem esquerda (rótulo ART.) ficam em linhas próprias.
    Rótulos de parágrafo e inciso entram no início da linha de texto mais próxima."""
    rotulos = [s for s in spans if rotulo_dispositivo(s)]
    spans = [s for s in spans if not rotulo_dispositivo(s)]
    for r in rotulos:
        alvo = min((s for s in spans if texto_lei(s) and s["x"] > r["x"] and abs(s["y"] - r["y"]) < 7),
                   key=lambda s: (abs(s["y"] - r["y"]), s["x"]), default=None)
        if alvo:
            r["y"] = alvo["y"]
        spans.append(r)
    spans.sort(key=lambda s: (round(s["y"]), s["x"]))
    res = []
    for s in spans:
        margem = s["x"] < 62
        if res and not margem and not res[-1]["margem"] and abs(res[-1]["y"] - s["y"]) < 3.2:
            res[-1]["s"].append(s)
        else:
            res.append({"y": s["y"], "margem": margem, "s": [s]})
    for l in res:
        l["s"].sort(key=lambda s: s["x"])
        l["txt"] = "".join(s["t"] for s in l["s"]).strip()
    res.sort(key=lambda l: (round(l["y"]), 0 if l["margem"] else 1))
    return res


def texto_lei(sp):
    return 9.8 <= sp["sz"] <= 11.2 and sp["f"].startswith("Literata")


def classe(sp):
    c = COR_GRIFO.get(sp["c"])
    if c:
        return c
    if "Bold" in sp["f"] and sp["c"] == "333333":
        return "b"
    return ""


class Extrator:
    def __init__(self, meta):
        self.id, self.nome, self.curto, self.disc = meta
        self.grupos = []
        self.itens = None
        self.art = None
        self.bloco = None          # jur | djur | dout | stf | stats | cab
        self.proc = ""
        self.cab_pend = None
        self.comecou = False
        self.ultimo_label = False

    # ---- estrutura ----
    def novo_grupo(self, nome):
        self.itens = []
        self.grupos.append({"nome": nome, "itens": self.itens})

    def garante_grupo(self):
        if self.itens is None:
            self.novo_grupo(self.nome)

    def fecha_art(self):
        a = self.art
        if a:
            a["x"] = re.sub(r"[ \t]+", " ", a["x"]).replace(" \n", "\n").strip()
            segs = []
            for t, c in a.pop("_g"):
                if segs and segs[-1][1] == c:
                    segs[-1][0] += t
                else:
                    segs.append([t, c])
            # um grifo quebrado em duas linhas volta a ser um trecho só (o espaço da quebra fica dentro dele)
            juntos = []
            for t, c in segs:
                if len(juntos) >= 2 and c and juntos[-2][1] == c and not juntos[-1][1] and not juntos[-1][0].strip():
                    espaco = juntos.pop()[0]
                    juntos[-1][0] += espaco + t
                elif juntos and juntos[-1][1] == c:
                    juntos[-1][0] += t
                else:
                    juntos.append([t, c])
            segs = juntos
            if any(c for _, c in segs):
                txt = "".join(t for t, _ in segs)
                txt = re.sub(r"[ \t]+", " ", txt).replace(" \n", "\n").strip()
                if txt == a["x"]:
                    a["g"] = [[re.sub(r"[ \t]+", " ", t), c] for t, c in segs]
                    # o texto do primeiro trecho começa após o strip; corrige espaços nas bordas
                    a["g"][0][0] = a["g"][0][0].lstrip()
                    a["g"][-1][0] = a["g"][-1][0].rstrip()
                    if "".join(t for t, _ in a["g"]).replace(" \n", "\n") != a["x"]:
                        a.pop("g")
            for k in ("j", "stf"):
                if not a.get(k):
                    a.pop(k, None)
                else:
                    for it in a[k]:
                        for kk in list(it):
                            if isinstance(it[kk], str):
                                it[kk] = re.sub(r"\s+", " ", it[kk]).strip()
            qs = a.pop("_qs")
            for q in qs:
                q["q"] = re.sub(r"\s+", " ", q["q"]).strip()
            self.itens.append({k: v for k, v in a.items() if v not in ("", None)})
            self.itens.extend(q for q in qs if q["q"])
        self.art = None
        self.bloco = None

    def novo_art(self, num=None):
        """Abre o artigo no rótulo 'ART.' da margem; o número (logo abaixo) pode chegar depois da 1ª linha."""
        self.fecha_art()
        self.garante_grupo()
        self.art = {"a": "", "x": "", "_g": [], "n": None, "rec": "", "j": [], "stf": [], "_qs": []}
        self.ultimo_label = False
        if num:
            self.numera(num)

    def numera(self, num):
        n = num.replace("°", "º").replace("–", "-").strip().rstrip(".")
        self.art["a"] = re.sub(r"º", "", n).strip()
        rot = f"Art. {n}" if "º" in n else f"Art. {n}."
        self.art["x"] = rot + " " + self.art["x"]
        self.art["_g"].insert(0, [rot + " ", ""])

    def add_lei(self, linha, nova_linha):
        if not self.art:
            return
        sep = "\n" if nova_linha else " "
        if self.ultimo_label:
            sep = ""
        self.ultimo_label = False
        if self.art["x"] and not self.art["x"].endswith((" ", "\n")):
            self.art["x"] += sep
            self.art["_g"].append([sep, ""])
        ant = None
        for sp in linha["s"]:
            t = sp["t"]
            if ant is not None and rotulo_dispositivo(ant) and not t.startswith(" ") and not ant["t"].endswith(" "):
                t = " " + t
            ant = sp
            self.art["x"] += t
            self.art["_g"].append([t, classe(sp) if texto_lei(sp) else ""])

    # ---- leitura ----
    def processa(self, doc):
        for pg in doc:
            for l in linhas(spans_da_pagina(pg)):
                self.linha(l)
        self.fecha_art()
        return self.saida()

    def linha(self, l):
        s0, txt = l["s"][0], l["txt"]
        compacto = txt.replace(" ", "").upper()
        # rótulo do artigo na margem: "A R T." e o número logo abaixo
        if l["margem"]:
            if isinstance(self.cab_pend, dict):
                self.emite_cabecalho()
            if compacto.startswith("ART.") and len(compacto) > 4:
                self.comecou = True
                self.novo_art(compacto[4:])
            elif compacto == "ART.":
                self.comecou = True
                self.novo_art()
            elif self.art is not None and not self.art["a"] and s0["sz"] >= 10:
                self.numera(txt.replace(" ", ""))
            return
        juntado = junta_espacadas(txt)
        # títulos, capítulos e seções
        if s0["sz"] < 8 and ESTRUTURA.match(juntado) and s0["c"] in ("ad5a0a", "6a625b"):
            self.comecou = True
            self.fecha_art()
            if isinstance(self.cab_pend, dict):
                self.emite_cabecalho()
            nivel = NIVEL.get(juntado.split(" ")[0], 1)
            self.cab_pend = {"h": juntado, "nivel": nivel, "nome": ""}
            return
        if not self.comecou:
            return
        if isinstance(self.cab_pend, dict):
            if s0["f"].startswith("Literata") and s0["sz"] > 10.6 and not texto_lei(s0) or (s0["f"].startswith("Literata-SemiBold") and s0["sz"] >= 11.5):
                self.cab_pend["nome"] = (self.cab_pend["nome"] + " " + txt).strip()
                return
            if re.match(r"^\d+ quest", txt) and s0["sz"] < 7.5 and "Recentes" not in txt:
                return
            self.emite_cabecalho()
        # cabeçalhos dos blocos de apoio
        if compacto in CABECALHOS or compacto.split("ASSERTIVAS")[0].split("COMOOJULGADO")[0] in CABECALHOS:
            chave = compacto.split("ASSERTIVAS")[0].split("COMOOJULGADO")[0]
            self.bloco = CABECALHOS[chave]
            return
        if s0["sz"] < 6.2 and txt.isupper() and s0["c"] in ("a3182b", "0a4f8f", "ad5a0a") and not re.match(r"^\d", txt):
            self.bloco = "stf"
            if self.art is not None:
                self.art["stf"].append({"t": txt.capitalize().replace(" stf", " STF"), "x": ""})
            return
        # estatística do artigo: "N questões · Recentes: ..."
        m = re.match(r"^(\d+)\s+quest(?:ão|ões)\b(.*)$", txt)
        if m and 6.3 <= s0["sz"] <= 7 and s0["x"] < 90:
            if self.art is not None:
                self.art["n"] = int(m.group(1))
                self.art["rec"] = re.sub(r"^\s*·\s*Recentes:\s*", "", m.group(2))
            self.bloco = "stats"
            return
        if self.bloco == "stats" and 6.3 <= s0["sz"] <= 7 and not texto_lei(s0):
            if self.art is not None:
                self.art["rec"] = (self.art["rec"] + " " + txt).strip()
            return
        if texto_lei(s0) or rotulo_dispositivo(s0):
            self.bloco = None
            nova = bool(INICIO_LINHA.match(txt)) or rotulo_dispositivo(s0)
            self.add_lei(l, nova)
            return
        if self.art is None:
            return
        a = self.art
        if self.bloco == "stf":
            if a["stf"]:
                a["stf"][-1]["x"] += " " + txt
            return
        if self.bloco == "jur":
            if s0["c"] == "ffffff" and s0["sz"] < 6:
                a["j"].append({"t": s0["t"].strip(), "tit": "", "x": "", "ref": ""})
                resto = l["s"][1:]
            else:
                resto = l["s"]
            if not a["j"]:
                a["j"].append({"t": "", "tit": "", "x": "", "ref": ""})
            j = a["j"][-1]
            for sp in resto:
                if sp["sz"] < 7 and sp["t"].strip().startswith("("):
                    j["ref"] += sp["t"]
                elif j["ref"] and sp["sz"] < 7:
                    j["ref"] += sp["t"]
                elif sp["c"] == "1f7396" and "SemiBold" in sp["f"] and not j["x"]:
                    j["tit"] += sp["t"]
                else:
                    j["x"] += sp["t"]
            j["x"] += " "
            return
        if self.bloco in ("djur", "dout"):
            if s0["c"] == "ffffff" and s0["sz"] < 6:
                self.proc = (s0["t"].strip() + " " + "".join(s["t"] for s in l["s"][1:])).strip()
                return
            if txt.startswith("■"):
                banca = txt.lstrip("■ ").strip()
                if self.bloco == "djur" and self.proc:
                    banca += " · julgado: " + self.proc
                a["_qs"].append({"q": "", "b": banca})
                return
            if a["_qs"] and s0["sz"] < 7.5 and not a["_qs"][-1]["q"]:
                a["_qs"][-1]["b"] += " " + txt          # banca/cargo quebrado em duas linhas
                return
            if a["_qs"]:
                a["_qs"][-1]["q"] += " " + txt
            return

    def emite_cabecalho(self):
        c = self.cab_pend
        self.cab_pend = None
        h = c["h"] + (" · " + c["nome"] if c["nome"] else "")
        if c["nivel"] <= 1 and (self.itens is None or self.itens or len(self.grupos) == 0):
            self.novo_grupo(h if c["nivel"] <= 1 else self.nome)
        else:
            self.garante_grupo()
        self.itens.append({"h": h})

    def saida(self):
        grupos = [g for g in self.grupos if any("a" in i for i in g["itens"])]
        return {"id": self.id, "nome": self.nome, "curto": self.curto, "disc": self.disc, "completa": True,
                "fonte": "Decorando a Lei Seca · Legislação Decodificada (material adquirido pela titular do app, uso pessoal)",
                "grupos": grupos, "cartoes": cartoes_de(self.curto, grupos)}


PRIORIDADE = {"V": 0, "d": 1, "v": 2, "A": 3}
PORQUE = {
    "V": "Pegadinha mais cobrada do artigo: a banca troca este trecho para tornar a assertiva falsa.",
    "v": "Pegadinha: a banca já trocou este trecho para tornar a assertiva falsa.",
    "d": "Caiu dos dois jeitos: trocado em assertivas falsas e exigido em assertivas corretas.",
    "A": "Ponto mais cobrado do artigo em assertivas corretas.",
}


def cartoes_de(curto, grupos, minimo=4, por_artigo=2):
    """Cartões de lacuna nos trechos grifados (pegadinha, caiu dos dois jeitos, ponto mais cobrado) dos artigos
    com pelo menos `minimo` questões. A frente mostra a linha do dispositivo com o trecho em branco."""
    out = []
    for gi, g in enumerate(grupos):
        for it in g["itens"]:
            if "a" not in it or (it.get("n") or 0) < minimo or not it.get("g"):
                continue
            usados, pos, linhas_x = 0, 0, it["x"].split("\n")
            alvos = []
            for t, c in it["g"]:
                if c in PRIORIDADE and 3 <= len(t.strip()) <= 90:
                    alvos.append((PRIORIDADE[c], pos, t.strip(), c))
                pos += len(t)
            for _, p, trecho, c in sorted(alvos)[:por_artigo]:
                ini = it["x"].rfind("\n", 0, p) + 1
                fim = it["x"].find("\n", p)
                linha = it["x"][ini:fim if fim >= 0 else len(it["x"])]
                if trecho not in linha or len(linha) > 600:
                    continue
                rot = "Art. " + it["a"] + ("º" if it["a"].isdigit() and int(it["a"]) < 10 else "")
                frente = f"{curto}, {rot}: complete a lacuna.\n{linha.replace(trecho, '______', 1)}"
                out.append({"g": gi, "a": it["a"], "origem": f"{curto}, art. {it['a']}", "tema": f"art. {it['a']}",
                            "frente": frente, "verso": f"{trecho}\n\n{linha}",
                            "porque": f"{PORQUE[c]} {it['n']} questões sobre o artigo de 2022 a 2026."})
                usados += 1
    return out


def meta_de(titulo, capa=""):
    """Reconhece a lei pelo título do PDF; só sem acerto no título olha o começo da 1ª página."""
    for texto in (titulo, capa):
        for pad, *meta in LEIS:
            if re.search(pad, texto, re.I):
                return meta
    raise SystemExit(f"não reconheci a lei pelo título: {titulo!r}")


def confere_sem_dados_pessoais(s):
    for pad in (r"uid:[0-9a-f-]{8,}", r"cpfCnpj", r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b(?!\s*/)", r"[\w.+-]+@[\w-]+\.[\w.]+"):
        m = re.search(pad, s)
        if m:
            raise SystemExit(f"a saída contém algo que parece dado pessoal ({pad}); nada foi gravado")


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    saida = Path(sys.argv[1])
    saida.mkdir(parents=True, exist_ok=True)
    for arq in sys.argv[2:]:
        doc = pymupdf.open(arq)
        titulo = (doc.metadata or {}).get("title") or Path(arq).stem
        dados = Extrator(meta_de(titulo, doc[0].get_text()[:400])).processa(doc)
        texto = json.dumps(dados, ensure_ascii=False)
        confere_sem_dados_pessoais(texto)
        arts = [i for g in dados["grupos"] for i in g["itens"] if "a" in i]
        qs = sum(1 for g in dados["grupos"] for i in g["itens"] if "q" in i)
        (saida / f'{dados["id"]}.json').write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f'{dados["id"]}: {len(dados["grupos"])} grupos, {len(arts)} artigos, {qs} assertivas, '
              f'{sum(1 for a in arts if a.get("g"))} com grifos, {sum(len(a.get("j", [])) for a in arts)} julgados, '
              f'{len(dados["cartoes"])} cartões')


if __name__ == "__main__":
    main()
