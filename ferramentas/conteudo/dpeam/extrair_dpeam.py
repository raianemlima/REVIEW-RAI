"""Extrai o Anexo II (Conhecimentos Gerais + cargo R) do Edital nº 01/2026 da DPE/AM (FCC).

Uso: python3 -I extrair_dpeam.py <edital.pdf> <saida.json>
Requer `pdftotext` (poppler). Usa `-layout`: sem ele o poppler apaga o hífen no fim da linha
("DPE-" + "AM" virava "DPEAM") e comeria o hífen de compostos como "pós-capitalista". Gera o programa no contrato de arquivos/cronograma-conteudo.js
sem completar conteúdo por memória: o texto de cada tópico vem do PDF.

Páginas físicas do PDF: Conhecimentos Gerais na p. 30; cargo R (Analista Jurídico de Defensoria –
Ciência Jurídica) nas pp. 43 a 47. O número impresso no rodapé reinicia no Anexo II e por isso
não serve de localizador; o localizador é a página do arquivo PDF.
"""
import json
import re
import subprocess
import sys
import unicodedata

PDF, SAIDA = sys.argv[1], sys.argv[2]
PAGINA_GERAIS = 30
PAGINAS_CARGO_R = range(43, 48)
MAIUSCULA = "A-ZÁÉÍÓÚÂÊÔÃÕÇ"


def pagina(n):
    saida = subprocess.run(["pdftotext", "-layout", "-f", str(n), "-l", str(n), PDF, "-"], check=True, capture_output=True, text=True).stdout
    linhas = [l.strip() for l in saida.replace("\f", "").replace("­", "").splitlines()]
    while linhas and not linhas[-1]:
        linhas.pop()
    if linhas and re.fullmatch(r"\d{1,2}", linhas[-1]):  # número de página do rodapé
        linhas.pop()
    return [l for l in linhas if l]


def juntar(linhas):
    texto = ""
    for l in linhas:
        texto += l if texto.endswith("-") else (" " if texto else "") + l
    return re.sub(r"\s+", " ", texto).strip()


# ---- Conhecimentos Gerais (p. 30) -------------------------------------------------------------
gerais = juntar(pagina(PAGINA_GERAIS))
g_ini = gerais.index("CONHECIMENTOS GERAIS – PARA TODOS OS CARGOS")
gerais = gerais[g_ini: gerais.index("CONHECIMENTOS ESPECÍFICOS", g_ini)]

# ---- Cargo R (pp. 43 a 47), com o deslocamento de cada página no texto corrido ---------------
corrido, limites = "", []
for n in PAGINAS_CARGO_R:
    trecho = juntar(pagina(n))
    limites.append((len(corrido) + (1 if corrido else 0), n))
    corrido += (" " if corrido else "") + trecho
r_ini = corrido.index("R - ANALISTA JURÍDICO DE DEFENSORIA – CIÊNCIA JURÍDICA")
cargo_r = corrido[r_ini:]


def pagina_do_offset(deslocamento):
    atual = limites[0][1]
    for inicio, n in limites:
        if deslocamento >= inicio:
            atual = n
    return atual


GERAIS = [
    ("lingua_portuguesa", "Língua Portuguesa", "LÍNGUA PORTUGUESA:", []),
    ("legislacao_defensoria", "Legislação da Defensoria", "LEGISLAÇÃO DA DEFENSORIA:", ["direito_institucional_defensoria_publica"]),
    ("conhecimentos_juridicos_institucionais", "Conhecimentos Jurídicos e Institucionais", "CONHECIMENTOS JURÍDICOS E INSTITUCIONAIS:",
     ["direito_institucional_defensoria_publica", "direito_antidiscriminatorio"]),
]
ESPECIFICOS = [
    ("direito_constitucional", "Direito Constitucional", "DIREITO CONSTITUCIONAL:", ["direito_constitucional"]),
    ("direito_administrativo", "Direito Administrativo", "DIREITO ADMINISTRATIVO:", ["direito_administrativo"]),
    ("direito_civil", "Direito Civil", "DIREITO CIVIL:", ["direito_civil"]),
    ("direito_processual_civil", "Direito Processual Civil", "DIREITO PROCESSUAL CIVIL:", ["direito_processual_civil"]),
    ("direito_penal", "Direito Penal", "DIREITO PENAL:", ["direito_penal"]),
    ("direito_processual_penal", "Direito Processual Penal", "DIREITO PROCESSUAL PENAL:", ["direito_processual_penal"]),
    ("direitos_humanos", "Direitos Humanos", "DIREITOS HUMANOS:", ["direitos_humanos"]),
    ("direito_crianca_idoso_pcd_mulher", "Direito da Criança e do Adolescente, do Idoso, da Pessoa com Deficiência e da Mulher",
     "DIREITO DA CRIANÇA E DO ADOLESCENTE, DO IDOSO, DA PESSOA COM DEFICIÊNCIA E DA MULHER.",
     ["direito_da_crianca_e_adolescente", "direito_pessoas_idosas_deficiencia"]),
]


def recortar(texto, lista, inicio_busca=0):
    """Cada rubrica vai do seu rótulo até o rótulo da próxima; devolve (offset do corpo, corpo)."""
    posicoes, cursor = [], inicio_busca
    for _, _, rotulo, _ in lista:
        i = texto.index(rotulo, cursor)
        posicoes.append(i)
        cursor = i + len(rotulo)
    partes = []
    for k, (_, _, rotulo, _) in enumerate(lista):
        ini = posicoes[k] + len(rotulo)
        fim = posicoes[k + 1] if k + 1 < len(lista) else len(texto)
        partes.append((ini + (len(texto[ini:]) - len(texto[ini:].lstrip())), texto[ini:fim].strip()))
    return partes


# Repetições e saltos de numeração que o próprio edital traz; qualquer outra quebra de sequência é erro.
REPETIDOS = {("direito_processual_civil", 6)}
PULADOS = {("direito_processual_civil", 13)}
TOKEN = re.compile(rf"(?<![\d.,/º])(\d{{1,2}})\. (?=[{MAIUSCULA}])")


def itens_numerados(rid, corpo):
    esperado, ultimo, usados, cortes = 1, 0, set(), []
    for m in TOKEN.finditer(corpo):
        n = int(m.group(1))
        if n == esperado:
            cortes.append(m.start()); ultimo = n; esperado = n + 1
        elif n == ultimo and (rid, n) in REPETIDOS and (rid, n) not in usados:
            cortes.append(m.start()); usados.add((rid, n))
        elif n == esperado + 1 and (rid, esperado) in PULADOS:
            cortes.append(m.start()); ultimo = n; esperado = n + 1
    resultado = []
    for k, ini in enumerate(cortes):
        fim = cortes[k + 1] if k + 1 < len(cortes) else len(corpo)
        resultado.append((ini, corpo[ini:fim].strip()))
    return resultado


# Frase = ponto + espaço + maiúscula; "n.º", "arts. 5º" e "nº 80/1994" não quebram.
FRASE = re.compile(rf"(?<=\.)\s+(?=[{MAIUSCULA}])")


def frases(corpo):
    resultado, cursor = [], 0
    for m in FRASE.finditer(corpo):
        resultado.append((cursor, corpo[cursor:m.start()].strip()))
        cursor = m.end()
    resultado.append((cursor, corpo[cursor:].strip()))
    return [(i, t) for i, t in resultado if t]


SECOES_DCA = ["Criança e Adolescente.", "Idoso.", "Pessoa com deficiência.", "Mulher."]


def secoes(corpo):
    cortes, cursor = [], 0
    for s in SECOES_DCA:
        i = corpo.index(s, cursor)
        cortes.append(i); cursor = i + len(s)
    return [(ini, corpo[ini: cortes[k + 1] if k + 1 < len(cortes) else len(corpo)].strip()) for k, ini in enumerate(cortes)]


def desdobrar_penal(item):
    """Item 9 do Direito Penal: pena + crimes em espécie + legislação penal especial (texto literal)."""
    a = item.index("Crimes em espécie.")
    b = item.index("Legislação Penal Especial:")
    return [(0, item[:a].strip()), (a, item[a:b].strip()), (b, item[b:].strip())]


LEI = re.compile(
    r"(?:Lei(?: Complementar)?(?: Federal| Estadual)?|Decreto(?:-Lei)?(?: Federal)?|Emenda Constitucional)"
    r" (?:n\.?[ºo°]?\.? ?)?[\d.]*\d(?:/\d{2,4})?"
)


def titulo_de(texto):
    t = re.sub(rf"^\d+\.\s+", "", texto)
    t = re.split(r"\s\d+\.\d+(?:\.\d+)*\.?\s", t, maxsplit=1)[0]  # o título termina antes do primeiro subitem (1.1, 2.3…)
    m = re.match(r"^([^:]{3,120}):", t)
    if m:
        t = m.group(1)
    else:
        m = re.search(rf"\.\s+(?=[{MAIUSCULA}])", t)
        t = t[: m.start()] if m else t.rstrip(".")
    t = t.rstrip(". ").strip()
    if len(t) > 160:
        t = t[:157].rsplit(" ", 1)[0] + "…"
    return t


lacunas = []
disciplinas = []
idx = 0


def montar(rid, nome, canonicais, partes, pg_de):
    global idx
    idx += 1
    topicos = []
    for pos, (offset, texto) in enumerate(partes, start=1):
        topicos.append({
            "id": f"d{idx:03d}_t{pos:03d}",
            "titulo": titulo_de(texto) if rid != "direito_crianca_idoso_pcd_mulher" else texto.split(".")[0],
            "texto": texto,
            "pagina": f"Edital nº 01/2026 – DPE/AM, Anexo II, PDF p. {pg_de(offset)}",
            "leis": list(dict.fromkeys(m.group(0).strip() for m in LEI.finditer(texto))),
            "juris": [],
        })
    disciplinas.append({"id": rid, "nome": nome.upper(), "topicos": topicos, "canonicais": canonicais})


# Conhecimentos Gerais: sem numeração; uma frase do edital por tópico.
g_partes = recortar(gerais, GERAIS)
for (rid, nome, rotulo, canonicais), (_, corpo) in zip(GERAIS, g_partes):
    montar(rid, nome, canonicais, frases(corpo), lambda _o: PAGINA_GERAIS)

# Cargo R: itens numerados; o último bloco, por seção rotulada.
e_partes = recortar(cargo_r, ESPECIFICOS)
for (rid, nome, rotulo, canonicais), (ini_corpo, corpo) in zip(ESPECIFICOS, e_partes):
    base = r_ini + ini_corpo
    if rid == "direito_crianca_idoso_pcd_mulher":
        partes = secoes(corpo)
    else:
        partes = itens_numerados(rid, corpo)
        if rid == "direito_penal":
            ultimo_off, ultimo = partes[-1]
            partes = partes[:-1] + [(ultimo_off + o, t) for o, t in desdobrar_penal(ultimo)]
    montar(rid, nome, canonicais, partes, lambda o, b=base: pagina_do_offset(b + o))

programa = {
    "id": "am-2026-servidor",
    "fonte": "Edital nº 01/2026 – DPE/AM (VI Concurso de servidores, FCC), Anexo II · Analista Jurídico de Defensoria – Ciência Jurídica (cargo R)",
    "fonteUrl": "https://www.concursosfcc.com.br",
    "cargo": "servidor",
    "plano": "plano-dpeam-2026.html",
    "lacunas": [
        "Cargo de servidor (Analista Jurídico de Defensoria – Ciência Jurídica, código R), não de Defensor(a) Público(a). O programa fica fora do relatório de frequência dos editais de Defensor.",
        "Foram extraídos os Conhecimentos Gerais (comuns a todos os cargos) e os Conhecimentos Específicos do cargo R; os programas dos demais cargos (A a Q) não foram incluídos.",
        "O Anexo II não numera os Conhecimentos Gerais nem o bloco de Direito da Criança e do Adolescente, do Idoso, da Pessoa com Deficiência e da Mulher: cada tópico de Conhecimentos Gerais é uma frase do edital, e o último bloco segue as quatro seções rotuladas pelo próprio edital. A divisão é editorial; o texto é o do edital.",
        "Em DIREITO PROCESSUAL CIVIL o item 6 aparece duas vezes (\"Processo: pressupostos processuais…\" e \"Sujeitos do processo…\") e a numeração pula do item 12 para o 14 (não há item 13). O texto foi mantido com a numeração impressa e os tópicos seguem a ordem do edital.",
        "Em DIREITO PENAL o item 9 reúne teoria da pena, crimes em espécie e legislação penal especial; foi desdobrado em três tópicos (pena; crimes em espécie; legislação penal especial) com o texto literal do edital, para caber em blocos de estudo.",
        "O Anexo II cita a Lei de Drogas como \"Lei nº 15.343/06\" e o abuso de autoridade como \"Lei nº 16.869/2019\"; as normas com esses nomes são a Lei nº 11.343/2006 e a Lei nº 13.869/2019, o que indica erro material do edital. O texto foi mantido como impresso; confirme em eventual retificação.",
        "Marco temporal (Anexo II, observação 1, e item 13.2): vale a legislação e a jurisprudência vigentes até a data de publicação do edital; alterações posteriores não são objeto de prova. A data exata de publicação não consta do texto recebido (arquivo revisado em 30/10/2026; impugnação em 03 e 04/11/2026).",
        "Anexo II, observação 2: mesmo quando o conteúdo programático coincide entre cargos, as provas têm níveis de complexidade diferentes conforme as atribuições de cada cargo.",
        "A fonteUrl aponta para o site da banca (FCC), indicado no edital; o documento oficial é o Edital nº 01/2026 da DPE/AM.",
    ],
    "disciplinas": disciplinas,
}

with open(SAIDA, "w", encoding="utf-8") as f:
    json.dump(programa, f, ensure_ascii=False, indent=1)

for d in disciplinas:
    print(f"{d['id']:42s} {len(d['topicos']):3d}  p.{d['topicos'][0]['pagina'][-2:]}-{d['topicos'][-1]['pagina'][-2:]}  {d['topicos'][-1]['titulo'][:50]}")
print("total", sum(len(d["topicos"]) for d in disciplinas), "lacunas", len(programa["lacunas"]))
