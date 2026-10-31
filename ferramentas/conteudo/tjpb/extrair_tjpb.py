"""Extrai do Edital nº 01/2026 do TJPB (Anexo I) o programa de Analista Judiciário – Área Judiciária.

    python ferramentas/conteudo/tjpb/extrair_tjpb.py edital-retificado-tjpb.pdf saida/tjpb.json

Uma rubrica por disciplina do quadro do item 10.8.3 e um tópico por item numerado do Anexo I, com o
localizador da página impressa no cabeçalho do edital. Não completa texto por memória: o que estiver no
PDF entra como está, sem os cabeçalhos de página. Requer PyMuPDF (pip install pymupdf).
"""
import json
import re
import sys

import pymupdf

FONTE = "Edital nº 01/2026 – TJPB (retificado em 29/10/2026), Anexo I · Analista Judiciário – Área Judiciária"
CABECALHO = re.compile(r"TRIBUNAL DE JUSTIÇA DO ESTADO DA PARAÍBA \| CONCURSO PÚBLICO 2026\s*\n\s*\n?\s*(\d+)\s*\n")
MAIUSC = "A-ZÁÉÍÓÚÂÊÔÃÕÇ"

# (id, nome, canonicais, início no texto, fim no texto, modo de divisão)
RUBRICAS = [
    ("lingua_portuguesa", "LÍNGUA PORTUGUESA", [], "LÍNGUA PORTUGUESA", "ÉTICA E GESTÃO NO SERVIÇO PÚBLICO", "num"),
    ("etica_gestao_servico_publico", "ÉTICA E GESTÃO NO SERVIÇO PÚBLICO", ["direito_administrativo"],
     "ÉTICA E GESTÃO NO SERVIÇO PÚBLICO", "NOÇÕES DE INFORMÁTICA E PROTEÇÃO DE DADOS", "cab"),
    ("informatica_protecao_dados", "NOÇÕES DE INFORMÁTICA E PROTEÇÃO DE DADOS", [],
     "NOÇÕES DE INFORMÁTICA E PROTEÇÃO DE DADOS", "CARGO: ANALISTA CONTABILIDADE", "cab"),
    ("direito_constitucional", "DIREITO CONSTITUCIONAL", ["direito_constitucional"],
     "Direito Constitucional - ", "Direito Administrativo - ", "num"),
    ("direito_administrativo", "DIREITO ADMINISTRATIVO", ["direito_administrativo"],
     "Direito Administrativo - ", "Direito Civil e Direito do Consumidor - ", "num"),
    ("direito_civil_consumidor", "DIREITO CIVIL E DIREITO DO CONSUMIDOR", ["direito_civil", "direito_do_consumidor"],
     "Direito Civil e Direito do Consumidor - ", "Direito Processual Civil - ", "num"),
    ("direito_processual_civil", "DIREITO PROCESSUAL CIVIL", ["direito_processual_civil", "direitos_difusos_e_coletivos"],
     "Direito Processual Civil - ", "Direito Penal - ", "num"),
    ("direito_penal", "DIREITO PENAL", ["direito_penal", "legislacao_penal_extravagante"],
     "Direito Penal - ", "Direito Processual Penal - ", "num"),
    ("direito_processual_penal", "DIREITO PROCESSUAL PENAL", ["direito_processual_penal", "execucao_penal"],
     "Direito Processual Penal - ", "Direitos Humanos e Tutela Coletiva - ", "num"),
    ("direitos_humanos_tutela_coletiva", "DIREITOS HUMANOS E TUTELA COLETIVA", ["direitos_humanos", "direitos_difusos_e_coletivos"],
     "Direitos Humanos e Tutela Coletiva - ", "CARGO: ANALISTA CONTADOR", "num"),
]

LEI = re.compile(
    r"(?:Lei Complementar|Decreto-Lei|Decreto|Lei) nº [\d.]+/\d{4}"
    r"|Resoluç(?:ão|ões) (?:CNJ|TJPB) nº \d+/\d{4}(?:,? (?:e )?nº \d+/\d{4})*"
    r"|Código (?:de Processo Civil|de Processo Penal|Penal|Civil|de Defesa do Consumidor|de Trânsito Brasileiro)"
    r"|Lei de Introdução às Normas do Direito Brasileiro|Lei de Execução Penal|Constituição Federal de 1988"
)


def texto_paginas(pdf):
    """Texto corrido do Anexo I com marcadores ⟦p.N⟧ no lugar do cabeçalho de cada página."""
    doc = pymupdf.open(pdf)
    partes = []
    for pg in doc:
        t = pg.get_text()
        m = CABECALHO.search(t)
        n = m.group(1) if m else str(pg.number + 1)
        if m:
            t = t[:m.start()] + t[m.end():]
        partes.append(f" ⟦p.{n}⟧ " + t)
    corrido = re.sub(r"\s+", " ", " ".join(partes))
    i = corrido.index("ANEXO I – CONTEÚDO PROGRAMÁTICO")
    i = corrido.rindex("⟦p.", 0, i)          # mantém o marcador da página onde o Anexo I começa
    return corrido[i:corrido.index("ANEXO II – REQUISITOS")]


def pagina_em(texto, pos):
    ps = list(re.finditer(r"⟦p\.(\d+)⟧", texto[:pos]))
    return int(ps[-1].group(1)) if ps else None


def limpa(t):
    return re.sub(r"\s+", " ", re.sub(r"⟦p\.\d+⟧", " ", t)).strip()


def divide_numerado(corpo):
    """Itens de primeiro nível 1, 2, 3...: o próximo número esperado precisa vir seguido de maiúscula."""
    pos, k, cortes = 0, 1, []
    while True:
        # o número abre o item quando vem depois de um ponto final (ou no início); a letra pode ser minúscula
        m = re.compile(rf"(?:(?<=\. )|(?<=⟧ )|(?<=^)|(?<=^ )){k}\.?\s*(?=[A-Za-zÀ-ÿ])").search(corpo, pos)
        if not m:
            break
        cortes.append(m.start())
        pos, k = m.end(), k + 1
    return [(cortes[i], corpo[cortes[i]:(cortes[i + 1] if i + 1 < len(cortes) else len(corpo))]) for i in range(len(cortes))]


def divide_cabecalhos(corpo):
    """Blocos 'Título: N.1 ...' (Ética e Informática); a lei citada sozinha no fim vira um item próprio."""
    marcas = [m.start() for m in re.finditer(rf"(?:(?<=\. )|(?<=⟧ )|(?<=^)|(?<=^ ))[{MAIUSC}][^:.]{{3,90}}:\s*\d\.1\b", corpo)]
    lei_final = re.search(r"(?<=\. )Lei nº 13\.709/2018[^.]*\.?\s*$", corpo)
    if lei_final:
        marcas.append(lei_final.start())
    return [(marcas[i], corpo[marcas[i]:(marcas[i + 1] if i + 1 < len(marcas) else len(corpo))]) for i in range(len(marcas))]


def titulo_de(txt):
    t = re.sub(r"^\d+\.?\s*", "", txt)
    t = re.split(r"\s\d+\.\d+\.?\s", t)[0]
    t = re.split(r"(?<=[a-zçãõéíóúâêô)])\.\s", t)[0]
    t = t.strip().rstrip(":;,. -")
    return t + "."


def leis_de(txt):
    vistos = []
    for m in LEI.finditer(txt):
        s = m.group(0)
        if s.startswith("Resoluç"):
            orgao = "CNJ" if "CNJ" in s else "TJPB"
            for num in re.findall(r"\d+/\d{4}", s):
                item = f"Resolução {orgao} nº {num}"
                if item not in vistos:
                    vistos.append(item)
        elif s not in vistos:
            vistos.append(s)
    return vistos


def extrair(pdf):
    anexo = texto_paginas(pdf)
    judiciario = anexo.index("CARGO: ANALISTA JURÍDICO")
    especificos = anexo.index("CARGO: ANALISTA JUDICIÁRIO")
    disciplinas = []
    for n, (rid, nome, canon, ini, fim, modo) in enumerate(RUBRICAS, 1):
        base = judiciario if n <= 3 else especificos
        a = anexo.index(ini, base) + len(ini)
        b = anexo.index(fim, a)
        corpo = anexo[a:b]
        pedacos = divide_numerado(corpo) if modo == "num" else divide_cabecalhos(corpo)
        if not pedacos:
            raise SystemExit(f"não achei itens em {nome}")
        topicos = []
        # a rubrica de Constitucional abre com "Constituição Federal de 1988": vale para todos os seus itens
        geral = leis_de(corpo[:pedacos[0][0]])
        for t, (pos, pedaco) in enumerate(pedacos, 1):
            texto = limpa(pedaco)
            topicos.append({
                "id": f"d{n:03d}_t{t:03d}",
                "titulo": titulo_de(texto),
                "texto": texto,
                "pagina": f"Edital nº 01/2026, p. {pagina_em(anexo, a + pos + 12) or pagina_em(anexo, a)}",
                "leis": geral + [x for x in leis_de(texto) if x not in geral],
                "juris": [],
            })
        disciplinas.append({"id": rid, "nome": nome, "canonicais": canon, "topicos": topicos})
    return {
        "id": "tjpb-2026",
        "fonte": FONTE,
        "fonteUrl": "https://conhecimento.fgv.br/concursos/tjpb26",
        "cargo": "servidor",
        "plano": "plano-tjpb-2026.html",
        "lacunas": [
            "Cargo de servidor (Analista Judiciário – Área Judiciária, nível superior em Direito), não de Defensor(a) Público(a). O programa fica fora do relatório de frequência dos editais de Defensor.",
            "Foram extraídos o Módulo I (Língua Portuguesa; Ética e Gestão no Serviço Público; Noções de Informática e Proteção de Dados) e o Módulo II da Área Judiciária. As especialidades de TI e Contabilidade não foram incluídas.",
            "O item 10.8.3 fixa 40 questões de Conhecimentos Específicos sem dividir entre as sete disciplinas; a distribuição sugerida no Cronograma é igual entre elas e serve só para orientar o tempo.",
            "Prova objetiva (60 questões, 1 ponto cada) e discursiva (1 estudo de caso de 30 linhas, 40 pontos) em 24/01/2027, das 13h às 18h, em João Pessoa (itens 10.1, 10.6 e 10.7). Nota final = objetiva + discursiva (item 12.1).",
            "A 1ª retificação (23/10/2026) mudou a carga horária para 30 horas semanais, encerrou a isenção em 27/10/2026 e corrigiu o corte da objetiva para 60% (item 10.12).",
            "O Anexo I manda considerar súmulas, recursos repetitivos e a jurisprudência dominante dos tribunais superiores, e admite cobrar alterações legislativas posteriores ao edital.",
            "A Resolução CNJ nº 230 aparece no edital como 230/2021; o número foi mantido como impresso.",
        ],
        "disciplinas": disciplinas,
    }


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    programa = extrair(sys.argv[1])
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        json.dump(programa, f, ensure_ascii=False, indent=1)
    for d in programa["disciplinas"]:
        print(f'{d["id"]}: {len(d["topicos"])} tópicos')
