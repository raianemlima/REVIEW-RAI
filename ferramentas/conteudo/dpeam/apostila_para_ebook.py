"""Converte a apostila e os quadros comparativos da DPE/AM (Markdown) em e-books do Aprofundamento.

    python3 -I apostila_para_ebook.py --perfil apostila --mapa mapa-apostila.json APOSTILA.md SAIDA.json
    python3 -I apostila_para_ebook.py --perfil quadros QUADROS.md SAIDA.json
    python3 -I apostila_para_ebook.py --perfil lc80 LC80.md SAIDA.json

Depois: node ferramentas/ajustes/selar_conteudo.mjs conteudo-cifrado/dpeam-estudo.bin apostila.json quadros.json lc80.json
O Markdown e o JSON de saída são material de estudo de uso pessoal: NÃO vão para o Git (o repositório é público);
só o .bin selado vai. Mantenha-os fora do repositório (ou em ferramentas/conteudo/dados/ebooks/, que é ignorada).

O que o conversor faz, porque o renderizador do Aprofundamento (ebMd, em app-src.txt) só aceita uma sintaxe curta:
- um capítulo por "## ": o primeiro "##" (o subtítulo) vira o subtítulo do e-book e, com a abertura, o capítulo
  "Apresentação", que começa por um aviso do app sobre o marco temporal da prova (item 13.2 do edital);
- "###" desce para "##" (o app mostra "##" como h3, e o sumário do capítulo lista os títulos até h4);
- tira o que o app não renderiza: logo (<img>), <span> oculto com todas as notas, "⁂" e as linhas de sublinhados;
- notas "[^1_12]" viram "[12]" (adjacentes se juntam: "[9, 11]") e as definições vão para o capítulo
  "Fontes consultadas", em ordem numérica, em texto simples (o app não torna links clicáveis);
- escapes de Markdown são resolvidos (o app não os remove): "\\*" vira "∗" e "\\|" vira "/";
- separador de tabela "| :-- |" vira "| --- |": o app só reconhece 3 ou mais traços;
- recusa tabela com número de colunas diferente do cabeçalho, nota sem definição e sobra de marcação.

Com --mapa, resolve cada assunto do Cronograma (id do tópico no catálogo) em [capítulo, posição do título no
capítulo, 1], o formato que o app usa para abrir o e-book no ponto certo; o título é achado pelo texto e a
conversão falha se o capítulo ou o título não existir (âncora quebrada).
"""
import argparse
import json
import re
import sys

GRUPO = "Apostila DPE/AM"
DISC = "pi"  # Defensoria Pública e princípios institucionais
ATUALIZADO = "2026-11-05"
PERFIS = {
    "apostila": {"id": "dpeam-apostila-cg", "titulo": "Apostila de estudo — DPE/AM"},
    "quadros": {"id": "dpeam-quadros", "titulo": "Quadros comparativos DPE/AM"},
    "lc80": {"id": "dpeam-lc80", "titulo": "LC nº 80/1994 e a DPE-AM"},
}
AVISO = (
    "> **Aviso do app (marco temporal):** o edital da DPE/AM só cobra a legislação e a jurisprudência vigentes até a data "
    "da sua publicação (item 13.2 do Edital nº 01/2026). Antes de memorizar as alterações de 2026 citadas neste material, "
    "como as da LC nº 288/2026 e da Lei nº 8.345/2026, confira se a publicação delas é anterior a essa data."
)
AVISO_NOTAS = " As notas [n] remetem ao capítulo “Fontes consultadas”."
PROIBIDO = ["[^", "<img", "<span", "<div", "⁂", "perplexity", "Raiane", "____", "\\"]


def falha(msg):
    print(f"erro: {msg}", file=sys.stderr)
    sys.exit(1)


def limpar(texto):
    """Tira o que o app não renderiza e separa as definições das notas."""
    linhas, notas = [], {}
    for l in texto.replace("\r\n", "\n").split("\n"):
        s = l.strip()
        if re.match(r"^<img\b", s) or re.match(r'^<span style="display:none">.*</span>$', s) or re.match(r"^<div[^>]*>\s*⁂\s*</div>$", s):
            continue
        if re.fullmatch(r"_{3,}", s):
            continue
        m = re.match(r"^\[\^(?:\d+_)?(\d+)\]:\s*(.+)$", s)
        if m:
            notas[int(m.group(1))] = m.group(2)
            continue
        linhas.append(l)
    return linhas, notas


def desescapar(t):
    t = t.replace("\\*", "∗").replace("\\|", "/")
    return re.sub(r"\\([\\`_{}\[\]()#+\-.!&%$<>~\"'])", r"\1", t)


def referencias(t):
    t = re.sub(r"\[\^(?:\d+_)?(\d+)\]", r"[\1]", t)
    return re.sub(r"(?:\[\d+\]){2,}", lambda m: "[" + ", ".join(re.findall(r"\d+", m.group(0))) + "]", t)


def celulas(l):
    s = l.strip()
    s = s[1:] if s.startswith("|") else s
    s = s[:-1] if s.endswith("|") else s
    return s.split("|")


def normalizar_tabelas(linhas, titulo):
    """Separador com 3+ traços (exigência do app) e colunas consistentes."""
    ehsep = lambda l: l.strip().startswith("|") and all(re.fullmatch(r"\s*:?-+:?\s*", c) for c in celulas(l))
    out, i = [], 0
    while i < len(linhas):
        l = linhas[i]
        if l.strip().startswith("|") and i + 1 < len(linhas) and ehsep(linhas[i + 1]):
            n = len(celulas(l))
            out.append(l)
            out.append("| " + " | ".join(["---"] * n) + " |")
            i += 2
            while i < len(linhas) and linhas[i].strip().startswith("|"):
                if len(celulas(linhas[i])) != n:
                    falha(f"tabela com {n} colunas no cabeçalho e {len(celulas(linhas[i]))} numa linha, no capítulo \"{titulo}\": {linhas[i].strip()[:80]}")
                out.append(linhas[i])
                i += 1
            continue
        out.append(l)
        i += 1
    return out


def baixar_titulos(linhas):
    return [re.sub(r"^#(#{2,5}\s)", r"\1", l) for l in linhas]


def titulos(md):
    """Títulos do capítulo na ordem em que o app numera as âncoras (eb<cap>-<k>)."""
    return [re.sub(r"\*+", "", m.group(2)).strip() for m in (re.match(r"^(#{2,6})\s+(.*)$", l) for l in md.split("\n")) if m]


def secoes(linhas):
    h1 = [i for i, l in enumerate(linhas) if re.match(r"^# ", l)]
    if len(h1) != 1:
        falha(f"esperava um único título \"# \", achei {len(h1)}")
    corpo = linhas[:h1[0]] + linhas[h1[0] + 1:]
    partes, atual = [], None
    for l in corpo:
        m = re.match(r"^## (.*)$", l)
        if m:
            atual = [m.group(1).strip(), []]
            partes.append(atual)
        elif atual is not None:
            atual[1].append(l)
        elif l.strip():
            falha(f"texto antes do primeiro \"##\": {l.strip()[:60]}")
    if len(partes) < 2:
        falha("o material precisa de um subtítulo (primeiro \"##\") e de ao menos um capítulo")
    return partes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--perfil", choices=sorted(PERFIS), default="apostila")
    ap.add_argument("--mapa")
    ap.add_argument("entrada")
    ap.add_argument("saida")
    a = ap.parse_args()
    perfil = PERFIS[a.perfil]
    if a.perfil == "apostila" and not a.mapa:
        falha("o perfil apostila exige --mapa (assuntos do Cronograma -> capítulo/título)")

    linhas, notas = limpar(open(a.entrada, encoding="utf-8").read())
    partes = secoes(linhas)
    usadas = set()
    for _, corpo in partes:
        for m in re.finditer(r"\[\^(?:\d+_)?(\d+)\]", "\n".join(corpo)):
            usadas.add(int(m.group(1)))
    for n in sorted(usadas - set(notas)):
        falha(f"nota [{n}] sem definição")

    subtitulo = partes[0][0]
    caps = []
    for k, (titulo, corpo) in enumerate(partes):
        texto = "\n".join(baixar_titulos(normalizar_tabelas([desescapar(referencias(l)) for l in corpo], titulo))).strip("\n")
        if k == 0:
            texto = re.sub(r"(?m)^Raiane,\s*(\S)", lambda m: m.group(1).upper(), texto)
            titulo = "Apresentação"
            texto = AVISO + (AVISO_NOTAS if notas else "") + "\n\n" + texto
        caps.append({"id": f"c{len(caps) + 1}", "t": titulo, "md": texto.strip("\n") + "\n"})
    if notas:
        fonte = "Notas de fonte do material original, em ordem numérica. Os endereços não são clicáveis no app: copie o endereço para conferir a norma na fonte oficial e a data de cada alteração.\n\n"
        fonte += "\n".join(f"- [{n}] {desescapar(notas[n])}" for n in sorted(notas)) + "\n"
        caps.append({"id": f"c{len(caps) + 1}", "t": "Fontes consultadas", "md": fonte})

    ebook = {"id": perfil["id"], "titulo": perfil["titulo"], "subtitulo": subtitulo, "disc": DISC, "grupo": GRUPO, "atualizado": ATUALIZADO, "caps": caps}

    mapeados = 0
    if a.mapa:
        mapa = json.load(open(a.mapa, encoding="utf-8"))
        resolvido = {}
        for topico, alvo in mapa["itens"].items():
            achados = [i for i, c in enumerate(caps) if c["t"] == alvo["cap"]]
            if len(achados) != 1:
                falha(f"{topico}: capítulo \"{alvo['cap']}\" {'não encontrado' if not achados else 'ambíguo'}")
            ci = achados[0]
            ts = titulos(caps[ci]["md"])
            if not ts:
                falha(f"{topico}: o capítulo \"{alvo['cap']}\" não tem títulos internos para ancorar")
            if alvo.get("titulo") is None:
                k = 0
            else:
                ks = [j for j, t in enumerate(ts) if t == alvo["titulo"]]
                if len(ks) != 1:
                    falha(f"{topico}: título \"{alvo['titulo']}\" {'não encontrado' if not ks else 'ambíguo'} no capítulo \"{alvo['cap']}\"")
                k = ks[0]
            resolvido[topico] = [ci, k, 1]
        ebook["editais"] = {mapa["edital"]: resolvido}
        mapeados = len(resolvido)

    conteudo = "\n".join([ebook["titulo"], ebook["subtitulo"]] + [c["t"] + "\n" + c["md"] for c in caps])
    for p in PROIBIDO:
        if p in conteudo:
            falha(f"sobrou \"{p}\" no resultado")
    saida = json.dumps(ebook, ensure_ascii=False, indent=1)
    with open(a.saida, "w", encoding="utf-8") as f:
        f.write(saida)
    tabelas = sum(1 for c in caps for l in c["md"].split("\n") if re.match(r"^\| --- ", l))
    print(f"{perfil['id']}: {len(caps)} capítulos, {sum(len(titulos(c['md'])) for c in caps)} títulos, {tabelas} tabelas, {len(notas)} notas, {mapeados} assuntos ligados ao Cronograma")


main()
