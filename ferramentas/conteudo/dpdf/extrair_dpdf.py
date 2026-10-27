"""Extrai o Anexo I (Conhecimentos Básicos + Cargo 1) do Edital nº 1 – DPDF/2026.

Uso: python3 -I extrair_dpdf.py <pasta-com-p1..p21.txt> <saida.json>
Gera o programa no contrato de arquivos/cronograma-conteudo.js, sem completar
conteúdo por memória: o texto de cada tópico vem do PDF convertido.
"""
import json
import re
import sys
import unicodedata

PASTA, SAIDA = sys.argv[1], sys.argv[2]
PRIMEIRA_PAGINA_DODF = 38  # p1 do PDF = página 39 do DODF nº 199

RODAPE = re.compile(r"PÁGINA \d+ Diário Oficial do Distrito Federal Nº 199, SEGUNDA-FEIRA, 26 DE OUTUBRO DE 2026\s*Documento assinado digitalmente, original em https://www\.dodf\.df\.gov\.br")

# Quebra de página no texto corrido: rodapé de uma página + cabeçalho da seguinte.
QUEBRA = re.compile(r"Documento assinado digitalmente, original em https://www\.dodf\.df\.gov\.br\s*(?:PÁGINA \d+\s*Diário Oficial do Distrito Federal(?: Nº 199, SEGUNDA-FEIRA, 26 DE OUTUBRO DE 2026)?)?")


def limpar(texto):
    texto = texto.replace("­", "")
    linhas = [l.strip() for l in texto.splitlines()]
    out = ""
    for l in linhas:
        if not l:
            continue
        if out.endswith("-"):
            out += l
        else:
            out += (" " if out else "") + l
    out = RODAPE.sub(" ", out)
    out = QUEBRA.sub(" ", out)
    return re.sub(r"\s+", " ", out).strip()


paginas = {}
for p in range(1, 22):
    with open(f"{PASTA}/p{p}.txt", encoding="utf-8") as f:
        paginas[p + PRIMEIRA_PAGINA_DODF] = limpar(f.read())

completo = limpar("\n".join(open(f"{PASTA}/p{p}.txt", encoding="utf-8").read() for p in range(1, 22)))
inicio = completo.index("ANEXO I – DO CONTEÚDO PROGRAMÁTICO")
fim = completo.index("(*) As Resoluções do Conselho Superior", inicio)
anexo = completo[inicio:fim]

BASICOS = [
    ("lingua_portuguesa", "Língua Portuguesa", []),
    ("lodf_lc_828_2010", "Lei Orgânica do Distrito Federal e Lei Complementar Distrital nº 828/2010", ["direito_institucional_defensoria_publica"]),
    ("regime_juridico_servidores_df", "Regime Jurídico dos Servidores Públicos do Distrito Federal", ["direito_administrativo"]),
    ("distrito_federal_politica_mulheres", "Conhecimentos Acerca do Distrito Federal e da Política para Mulheres", []),
    ("lei_maria_da_penha", "Lei Maria da Penha", []),
    ("nocoes_informatica", "Noções de Informática", []),
    ("nocoes_primeiros_socorros", "Noções de Primeiros Socorros", []),
]
ESPECIFICOS = [
    ("direito_constitucional", "Direito Constitucional", ["direito_constitucional"]),
    ("direito_administrativo", "Direito Administrativo", ["direito_administrativo"]),
    ("direito_civil", "Direito Civil", ["direito_civil"]),
    ("direito_processual_civil", "Direito Processual Civil", ["direito_processual_civil"]),
    ("direito_penal", "Direito Penal", ["direito_penal"]),
    ("direito_processual_penal", "Direito Processual Penal", ["direito_processual_penal"]),
    ("direito_da_crianca_e_adolescente", "Direito da Criança e do Adolescente", ["direito_da_crianca_e_adolescente"]),
    ("direito_do_consumidor", "Direito do Consumidor", ["direito_do_consumidor"]),
    ("direitos_difusos_e_coletivos", "Direitos Difusos e Coletivos", ["direitos_difusos_e_coletivos"]),
    ("direitos_humanos", "Direitos Humanos", ["direitos_humanos"]),
    ("direito_institucional_defensoria_publica", "Normas Institucionais da Defensoria Pública e da Defensoria Pública do Distrito Federal", ["direito_institucional_defensoria_publica"]),
]

# Recortes: cada rubrica vai do seu título até o título da próxima.
cargo1 = anexo.index("Cargo 1: Analista de Apoio à Assistência Judiciária - Área: Direito e Legislação")
basicos_txt = anexo[anexo.index("Conhecimentos Básicos (para todos os cargos)"):anexo.index("Conhecimentos Específicos por Cargo")]
especificos_txt = anexo[cargo1:]


def recortar(texto, lista):
    posicoes = []
    cursor = 0
    for _, nome, _ in lista:
        alvo = nome + ": 1 "
        i = texto.index(alvo, cursor)
        posicoes.append(i)
        cursor = i + len(alvo)
    partes = []
    for k, (rid, nome, can) in enumerate(lista):
        ini = posicoes[k] + len(nome) + 2
        fim_ = posicoes[k + 1] if k + 1 < len(lista) else len(texto)
        corpo = texto[ini:fim_].strip()
        corpo = re.sub(r"\(\*\*\).*$", "", corpo).strip()
        partes.append((rid, nome, can, corpo))
    return partes


lacunas = []
TOKEN = re.compile(r"(?<![\d.,/º])(\d{1,2}) (?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])")


def itens(rid, corpo):
    esperado, cortes = 1, []
    for m in TOKEN.finditer(corpo):
        n = int(m.group(1))
        if n == esperado:
            cortes.append((m.start(), n, n))
            esperado += 1
        elif rid == "direito_penal" and esperado == 28 and n == 42:
            cortes.append((m.start(), n, 28))
            lacunas.append("Em DIREITO PENAL, o item que ocupa a posição 28 (Lei Federal nº 7.716/1989) está numerado como 42 no Anexo I; o texto foi mantido com a numeração original e o tópico recebeu a posição 28.")
            esperado = 29
    resultado = []
    for k, (ini, impresso, pos) in enumerate(cortes):
        fim_ = cortes[k + 1][0] if k + 1 < len(cortes) else len(corpo)
        resultado.append((pos, corpo[ini:fim_].strip()))
    return resultado


LEI = re.compile(
    r"(?:Lei(?: Complementar)?(?: Federal| Distrital)?|Decreto(?: Federal| Distrital)?|Resolução do CNJ|Emenda à Lei Orgânica do Distrito Federal)"
    r" nº [\d.]+(?:/\d{4})?"
)


def norm(s):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", s)).strip()


def pagina_de(trecho):
    alvo = norm(trecho)[:60]
    for pg in sorted(paginas):
        if alvo in paginas[pg]:
            return pg
    # trecho quebrado entre páginas: procura o início curto
    for pg in sorted(paginas):
        if alvo[:25] in paginas[pg]:
            return pg
    return None


def titulo_de(texto):
    sem_num = re.sub(r"^\d+ ", "", texto)
    m = re.search(r" \d+\.\d+(?:\.\d+)* (?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])", sem_num)
    t = sem_num[: m.start()] if m else sem_num
    if len(t) > 160:
        p = t.find(". ")
        t = t[: p + 1] if 0 < p < 160 else t[:157].rstrip() + "…"
    return t.strip()


disciplinas, ultima_pagina = [], 52
for idx, (rid, nome, can, corpo) in enumerate(recortar(basicos_txt, BASICOS) + recortar(especificos_txt, ESPECIFICOS), start=1):
    topicos = []
    for pos, texto in itens(rid, corpo):
        pg = pagina_de(texto) or ultima_pagina
        ultima_pagina = pg
        leis = list(dict.fromkeys(m.group(0) for m in LEI.finditer(texto)))
        topicos.append({
            "id": f"d{idx:03d}_t{pos:03d}",
            "titulo": titulo_de(texto),
            "texto": texto,
            "pagina": f"DODF nº 199, p. {pg}",
            "leis": leis,
            "juris": [],
        })
    disciplinas.append({"id": rid, "nome": nome.upper(), "topicos": topicos, "canonicais": can})

programa = {
    "id": "df-2026",
    "fonte": "Edital nº 1 – DPDF, de 26/10/2026 (DODF nº 199, pp. 39–59) · Analista de Apoio à Assistência Judiciária – Direito e Legislação",
    "fonteUrl": "https://www.access.org.br",
    "cargo": "servidor",
    "plano": "plano-dpdf-2026.html",
    "lacunas": lacunas + [
        "Cargo de servidor (Analista de Apoio à Assistência Judiciária – Especialidade Direito e Legislação), não de Defensor(a) Público(a). O programa fica fora do relatório de frequência dos editais de Defensor.",
        "Foram extraídos somente os Conhecimentos Básicos (comuns a todos os cargos) e os Conhecimentos Específicos do Cargo 1; os demais cargos (Contabilidade e Informática) não foram incluídos.",
        "A nota (**) do Anexo I informa que a LODF e a LC Distrital nº 828/2010 serão cobradas com maior aprofundamento nos Conhecimentos Específicos do Cargo 1 (Normas Institucionais) do que nos Conhecimentos Básicos.",
        "As Resoluções do CSDPDF nº 224/2020 e nº 271/2023 estão indicadas pelo edital em https://www.defensoria.df.gov.br/legislacao/resolucoes-do-conselho-superior/.",
        "Marco temporal (itens 17.8 a 17.11): legislação vigente e jurisprudência pacificada do STF, tribunais superiores e TJDFT publicadas até 26/10/2026.",
        "A fonteUrl aponta para a página da banca indicada no item 1.6; o documento oficial é a publicação no DODF.",
    ],
    "disciplinas": disciplinas,
}

with open(SAIDA, "w", encoding="utf-8") as f:
    json.dump(programa, f, ensure_ascii=False, indent=1)

for d in disciplinas:
    print(f"{d['id']:45s} {len(d['topicos']):3d}  {d['topicos'][-1]['titulo'][:60]}")
print("total", sum(len(d["topicos"]) for d in disciplinas), "lacunas", len(programa["lacunas"]))
