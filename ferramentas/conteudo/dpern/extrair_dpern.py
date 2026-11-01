"""Extrai da Resolução nº 344/2025 do CSDPE/RN (regulamento do III Concurso de Defensor Público do RN, DOE nº 15.871,
de 15/03/2025) o programa do Anexo I e o quadro da prova objetiva, no formato do Cronograma.

    python ferramentas/conteudo/dpern/extrair_dpern.py resolucao-344.pdf saida/rn-2025.json

O PDF publicado no DOE perde texto em TODA virada de página (a diagramação cortou o fim de cada página; o trecho não
existe no arquivo, nem como texto nem como imagem). O script não completa nada por memória: cada item numerado que
aparece entra como está; item cortado leva a marca "[início ausente no PDF do DOE]" ou "[final ausente no PDF do DOE]";
itens que sumiram por inteiro ficam listados nas lacunas. O carimbo "CERTIFICADO DIGITALMENTE", que o PDF mistura às
letras do texto, é descartado pela fonte (Arial Bold). Requer PyMuPDF (pip install pymupdf).
"""
import json
import re
import sys

import pymupdf

FONTE = "Resolução nº 344/2025 do CSDPE/RN (DOE nº 15.871, 15/03/2025), Anexo I · III Concurso de Defensor Público do RN"
CAB = re.compile(r"^(DEFENSORIA PÚBLICA|Ano XCII • Nº 15871|Natal, 15 de março de 2025)$")
INI_AUSENTE, FIM_AUSENTE = "[início ausente no PDF do DOE] ", " [final ausente no PDF do DOE]"

# id, nome, canônicos, grupo do quadro, cabeçalho no Anexo I (None = o cabeçalho caiu numa quebra de página),
# texto que marca o começo quando o cabeçalho sumiu (primeira linha visível depois da quebra)
DISCIPLINAS = [
    ("direito_constitucional", "DIREITO CONSTITUCIONAL", ["direito_constitucional"], "I", "DIREITO CONSTITUCIONAL", None),
    ("direito_administrativo", "DIREITO ADMINISTRATIVO", ["direito_administrativo"], "I", None, "economia mista e fundação privada."),
    ("principios_institucionais", "PRINCÍPIOS INSTITUCIONAIS DA DEFENSORIA PÚBLICA", ["direito_institucional_defensoria_publica"], "I", "PRINCÍPIOS INSTITUCIONAIS DA DEFENSORIA PÚBLICA", None),
    ("direito_penal", "DIREITO PENAL", ["direito_penal", "legislacao_penal_extravagante"], "II", "DIREITO PENAL", None),
    ("direito_processual_penal", "DIREITO PROCESSUAL PENAL", ["direito_processual_penal"], "II", "DIREITO PROCESSUAL PENAL", None),
    ("execucao_penal", "DIREITO DA EXECUÇÃO PENAL", ["execucao_penal"], "II", "DIREITO DA EXECUÇÃO PENAL", None),
    ("direito_civil", "DIREITO CIVIL", ["direito_civil"], "III", None, "fungíveis e consumíveis."),
    ("direito_processual_civil", "DIREITO PROCESSUAL CIVIL", ["direito_processual_civil"], "III", None, "impugnação das decisões judiciais:"),
    ("direito_do_consumidor", "DIREITO DO CONSUMIDOR", ["direito_do_consumidor"], "III", "DIREITO DO CONSUMIDOR", None),
    ("direitos_humanos", "DIREITOS HUMANOS", ["direitos_humanos"], "IV", "DIREITOS HUMANOS", None),
    ("direitos_difusos_coletivos", "DIREITOS DIFUSOS E COLETIVOS", ["direitos_difusos_e_coletivos"], "IV", "DIREITOS DIFUSOS E COLETIVOS", None),
    ("direito_crianca_adolescente", "DIREITO DA CRIANÇA E DO ADOLESCENTE", ["direito_da_crianca_e_adolescente"], "IV", None, "CONANDA 169)."),
]
LEI = re.compile(r"(?:Lei Complementar(?: Federal| Estadual)?|Decreto-Lei|Decreto(?: Federal)?|Lei(?: Federal| Estadual)?)"
                 r" n[º°.]?\s*[\d.]+(?:/\d{2,4})?|Resolução(?: CNJ)? (?:n[º°.]?\s*)?[\d.]+/\d{2,4}(?: do (?:CNJ|Conselho Nacional de Justiça|CNPCP|CONANDA))?")


def linhas(pdf):
    """[(página, texto)] na ordem de leitura, sem cabeçalho do DOE nem o carimbo da assinatura."""
    out = []
    for i, pg in enumerate(pymupdf.open(pdf)):
        L = []
        for b in pg.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                if abs(l["dir"][0] - 1) > 0.01:
                    continue
                t = "".join(s["text"] for s in l["spans"] if not s["font"].startswith("Arial-Bold")).strip()
                if t and not CAB.match(t):
                    L.append((l["bbox"][1], l["bbox"][0], t))
        out += [(i + 1, t) for _, _, t in sorted(L)]
    return out


def anexo(pdf):
    """Texto corrido do Anexo I com ⟦Q⟧ em cada virada de página e ⟦p.N⟧ para localizar os itens."""
    ls = linhas(pdf)
    a = next(k for k, (_, t) in enumerate(ls) if t.startswith("Anexo I da Resolução"))
    # a página de assinaturas (título em Arial Bold, descartado) começa com "O documento acima foi proposto..."
    b = next((k for k, (_, t) in enumerate(ls) if k > a and re.match(r"PROTOCOLO DE ASSINATURAS|O documento acima foi proposto", t)), len(ls))
    partes, pag = [], None
    for p, t in ls[a:b]:
        if p != pag:
            partes.append((" ⟦Q⟧ " if pag else "") + f"⟦p.{p}⟧ ")
            pag = p
        partes.append(t)
    s = " ".join(partes)
    s = re.sub(r"(\w)- (\w)", r"\1-\2", s)          # "Público- Geral" → "Público-Geral"
    return re.sub(r"\s+", " ", s)


def fatias(s):
    """Divide o Anexo I nas 12 disciplinas, na ordem em que aparecem."""
    pos = []
    for d in DISCIPLINAS:
        cab, inicio = d[4], d[5]
        if cab:
            m = re.search(rf"{re.escape(cab)}(?=\s*(?:⟦[^⟧]*⟧\s*)*1\.)", s)   # o cabeçalho vem antes do item 1
            if not m:
                raise SystemExit(f"cabeçalho não encontrado: {cab}")
            pos.append((m.start(), m.end(), d))
        else:
            k = s.index(inicio)
            pos.append((k, k, d))
    pos.sort(key=lambda x: x[0])
    for i, (ini, corpo, d) in enumerate(pos):
        fim = pos[i + 1][0] if i + 1 < len(pos) else len(s)
        yield d, s[corpo:fim], cab_ausente(d)


def cab_ausente(d):
    return d[4] is None


def itens(corpo, depois_de_quebra=False):
    """Itens de primeiro nível ("N. Texto"): aceita o próximo número; depois de uma quebra de página, aceita salto."""
    marcas, prev, quebra = [], 0, depois_de_quebra
    for m in re.finditer(r"⟦Q⟧|(?<![\d.])(\d{1,2})\.(?!\d)\s*(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ(\"“])", corpo):
        if m.group(0) == "⟦Q⟧":
            quebra = True
            continue
        n = int(m.group(1))
        if n == prev + 1 or (quebra and n > prev):
            marcas.append((m.start(), n))
            prev, quebra = n, False
    return marcas


def limpa(t):
    t = re.sub(r"⟦p\.\d+⟧", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def pagina(corpo, pos, padrao):
    ps = re.findall(r"⟦p\.(\d+)⟧", corpo[:pos + 1])
    return int(ps[-1]) if ps else padrao


def titulo_de(t, num=None):
    if t.startswith(INI_AUSENTE):
        resto = t[len(INI_AUSENTE):].split(". ")[0].rstrip(".")
        resto = (resto[:90].rsplit(" ", 1)[0] + "…") if len(resto) > 90 else resto
        return (f"{num}. " if num else "") + f"[início ausente no PDF] {resto}"
    fim = FIM_AUSENTE.strip() in t
    t = re.sub(r"^\d+\.\s*", "", t)
    t = re.split(r"(?<=[a-zçãõéíóúâêô)])\.\s", t)[0]
    t = t.replace(FIM_AUSENTE.strip(), "").strip().rstrip(":;,. -")
    t = (t[:140].rsplit(" ", 1)[0] + "…") if len(t) > 140 else t + "."
    return t + (" [final ausente no PDF]" if fim else "")


def leis_de(t):
    vistos = []
    for m in LEI.finditer(t):
        s = re.sub(r"\s+", " ", m.group(0)).replace("n.", "nº").replace("n°", "nº")
        if s not in vistos:
            vistos.append(s)
    return vistos


def extrair(pdf):
    s = anexo(pdf)
    pag0 = int(re.match(r"⟦p\.(\d+)⟧", s).group(1))
    disciplinas, faltas = [], []
    for n, (d, corpo, sem_cab) in enumerate(fatias(s), 1):
        rid, nome, canon, grupo = d[0], d[1], d[2], d[3]
        pagina_corpo = pagina(s, s.index(corpo[:60]), pag0)
        corpo = f"⟦p.{pagina_corpo}⟧ " + corpo
        marcas = itens(corpo, sem_cab)
        topicos, ausentes, corte = [], [], []
        # trecho antes do primeiro número visível: fim de um item cujo começo caiu na quebra de página
        k0 = marcas[0][0] if marcas else len(corpo)
        antes = limpa(corpo[:k0].replace("⟦Q⟧", " "))
        primeiro = marcas[0][1] if marcas else 1
        esperado = 1
        if antes and sem_cab:
            num = primeiro - 1
            ausentes += list(range(1, num))
            topicos.append((num, INI_AUSENTE + antes, pagina(corpo, 0, pagina_corpo)))
            esperado = num + 1
        for i, (pos, num) in enumerate(marcas):
            fim = marcas[i + 1][0] if i + 1 < len(marcas) else len(corpo)
            trecho = corpo[pos:fim]
            ausentes += list(range(esperado, num))
            esperado = num + 1
            if "⟦Q⟧" in trecho:
                a, b = trecho.split("⟦Q⟧", 1)
                prox = marcas[i + 1][1] if i + 1 < len(marcas) else None
                ok_a = limpa(a)
                topicos.append((num, ok_a + FIM_AUSENTE, pagina(corpo, pos, pagina_corpo)))
                resto = limpa(b)
                if resto and prox is not None and prox - 1 > num:
                    # depois da quebra vem o fim do item anterior ao próximo número visível
                    ausentes += list(range(num + 1, prox - 1))
                    topicos.append((prox - 1, INI_AUSENTE + resto, pagina(corpo, corpo.index("⟧", corpo.index("⟦p.", pos + len(a))), pagina_corpo)))
                    esperado = prox
                elif prox is None:
                    if resto:
                        topicos.append((None, INI_AUSENTE + resto, pagina(corpo, corpo.index("⟧", corpo.index("⟦p.", pos + len(a))), pagina_corpo)))
                    corte.append(f"{nome}: o PDF perde o fim do item {num} e o que vier depois dele (não dá para saber quantos itens faltam).")
            else:
                topicos.append((num, limpa(trecho), pagina(corpo, pos, pagina_corpo)))
        if ausentes:
            faltas.append(f"{nome}: itens {', '.join(map(str, sorted(set(ausentes))))} ausentes no PDF do DOE.")
        faltas += corte
        out = []
        for t, (num, texto, pg) in enumerate(topicos, 1):
            out.append({"id": f"d{n:03d}_t{t:03d}", "titulo": titulo_de(texto, num), "texto": texto,
                        "pagina": f"Res. 344/2025, Anexo I, p. {pg} do DOE nº 15.871", "leis": leis_de(texto), "juris": []})
        disciplinas.append({"id": rid, "nome": nome, "canonicais": canon, "observacao": f"Grupo {grupo} da prova objetiva (25 questões no grupo).", "topicos": out})
    return s, disciplinas, faltas


def programa(pdf):
    _, disciplinas, faltas = extrair(pdf)
    return {
        "id": "rn-2025",
        "fonte": FONTE,
        "relatorio": False,
        "lacunas": [
            "Regulamento do III Concurso (Res. nº 344/2025), não edital: a banca (Cebraspe, contratada em 2026, segundo a imprensa especializada) ainda publicará o edital, que pode detalhar ou ajustar o programa. A imprensa especializada também noticia alterações pela Res. nº 365/2026, que não estava entre os arquivos recebidos.",
            "O PDF do DOE nº 15.871 perde texto em toda virada de página: a diagramação cortou o fim de cada página. Os trechos ausentes não foram completados; os itens cortados estão marcados e a lista abaixo diz o que falta em cada disciplina. Para completar, envie o texto integral da resolução (site da DPE/RN) ou o edital.",
            *faltas,
            "Prova objetiva (quadro da p. 5 do DOE, antes do art. 43): 100 questões em 4 grupos de 25 — I) Constitucional, Administrativo e Princípios Institucionais da Defensoria; II) Penal, Processual Penal e Execução Penal; III) Civil, Processual Civil e Consumidor; IV) Direitos Humanos, Difusos e Coletivos e Criança e Adolescente. Habilitação para a discursiva: 60% da nota global e até a 400ª posição (art. 43).",
            "Discursivas (arts. 45 e 46): Prova I (Grupo I: Constitucional, Administrativo, Penal, Processual Penal e Execução Penal) e Prova II (Grupo II: Civil, Processual Civil, Consumidor, Direitos Humanos, Difusos e Coletivos e Criança e Adolescente), cada uma com 2 questões de até 30 linhas (2,5 pontos cada) e 1 peça de até 120 linhas (5 pontos). Prova oral (art. 56): Constitucional, Consumidor, Criança e Adolescente, Penal, Processual Penal, Civil e Processual Civil.",
            "Fora do relatório de frequência dos editais de Defensor enquanto o programa estiver incompleto; serve ao Cronograma.",
        ],
        "disciplinas": disciplinas,
    }


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    p = programa(sys.argv[1])
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        json.dump(p, f, ensure_ascii=False, indent=1)
    for d in p["disciplinas"]:
        print(f'{d["id"]}: {len(d["topicos"])} tópicos')
    for l in p["lacunas"][2:-3]:
        print(" -", l)
