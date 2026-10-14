"""Gera o simulado (JSON) a partir do texto da prova e do gabarito (dados/simulados/<id>-prova.md e <id>-gabarito.md).

    python ferramentas/conteudo/simulado_json.py            # todas as provas de PROVAS
    python ferramentas/conteudo/simulado_json.py dpe-pe-2025

Para uma prova nova: salve <id>-prova.md e <id>-gabarito.md em dados/simulados e acrescente a linha dela em PROVAS.

O texto de cada questão fica como está na prova; o script só tira cabeçalhos de página, separa enunciado e
alternativas, junta as linhas quebradas e confere: cada questão precisa ter A a E e uma letra no gabarito.
"""
import json, re, sys
from collections import Counter
from pathlib import Path

PASTA = Path(__file__).resolve().parent / "dados" / "simulados"
# formato do caderno (fundatec: "QUESTÃO 01 –" e "A)"; fgv: número sozinho na linha e "(A)") e onde está o gabarito do tipo usado
PROVAS = {
    "dpe-pr-2024": dict(nome="DPE-PR 2024", cargo="Defensor(a) Público(a) Substituto(a)", banca="Fundatec", formato="fundatec", gabarito="fundatec"),
    "dpe-pe-2025": dict(nome="DPE-PE 2025", cargo="Defensor(a) Público(a) · prova tipo 1 (branca)", banca="FGV", formato="fgv", gabarito="grade", secao="DEFENSOR PÚBLICO - PROVA TIPO 1"),
    "dpe-ro-2025": dict(nome="DPE-RO 2025", cargo="Analista Jurídico · Classe A · prova tipo 1 (branca)", banca="FGV", formato="fgv", gabarito="pares", secao="Analista Jurídico - Classe A - Prova Tipo 1"),
}
LIXO = re.compile(r"^(\d+_BASE_\w+|Execução: .*|DEFENSOR PÚBLICO – SUBSTITUTO|\d{1,2}/\d{1,2}/\d{4}\d{1,2}:\d{2}:\d{2}|QR|code|PARANÁ|V\d_.*|```|## Página \d+)$")
MATERIA = re.compile(r"^(DIREITO[S]? [A-ZÁÉÍÓÚÂÊÔÃÕÇ ,]+|FILOSOFIA DO DIREITO E SOCIOLOGIA JURÍDICA|PRINCÍPIOS E ATRIBUIÇÕES INSTITUCIONAIS DA DEFENSORIA PÚBLICA DO ESTADO DO)$")
QUESTAO = re.compile(r"^QUESTÃO (\d\s?\d{1,2})\s*[–-]\s*")   # "QUESTÃO 9 2" também

def paginas(texto):
    """Linhas úteis da prova, sem capa nem cabeçalhos."""
    corpo = texto.split("## Página 2", 1)[1]
    return [l.rstrip() for l in corpo.splitlines() if not LIXO.match(l.strip())]

def juntar(linhas):
    """Junta as linhas quebradas em parágrafos; linha em branco separa parágrafos."""
    paras, atual = [], []
    for l in linhas:
        if l.strip(): atual.append(l.strip())
        elif atual: paras.append(" ".join(atual)); atual = []
    if atual: paras.append(" ".join(atual))
    return "\n".join(re.sub(r"\s{2,}", " ", p) for p in paras)

def separar(linhas):
    # Na página 2 o PDF traz o fim da questão 1 antes do título: devolve esse trecho para depois do começo dela.
    i = next(k for k, l in enumerate(linhas) if MATERIA.match(l.strip()))
    q1 = next(k for k, l in enumerate(linhas) if QUESTAO.match(l.strip()))
    q2 = next(k for k, l in enumerate(linhas) if k > q1 and QUESTAO.match(l.strip()))
    linhas = linhas[i:q1] + linhas[q1:q2] + [""] + linhas[:i] + [""] + linhas[q2:]
    qs, materia = [], ""
    for l in linhas:
        s = l.strip()
        if MATERIA.match(s):
            materia = s.title().replace(" Do ", " do ").replace(" Da ", " da ").replace(" E ", " e ").replace(" Dos ", " dos ")
            if materia.lower().endswith(" do estado do"): materia = "Princípios e atribuições institucionais da DPE"
            continue
        if s == "PARANÁ" and qs and not qs[-1]["linhas"]: continue
        m = QUESTAO.match(s)
        if m: qs.append({"n": int(m.group(1).replace(" ", "")), "materia": materia, "linhas": [s[m.end():]]}); continue
        if qs: qs[-1]["linhas"].append(l)
    return qs

FGV_LIXO = re.compile(r"^(```|## Página \d+|> Nota:.*|DEFENSORIA PÚBLICA DO ESTADO DE .*FGV CONHECIMENTO|.* – (TARDE|MANHÃ)\s+TIPO .*PÁGINA \d+|Realização)$")
CABECA = re.compile(r"^[A-ZÁÉÍÓÚ][^.;:?()“”]{1,70}$")

def separar_fgv(texto):
    corpo = texto.split("## Página 2", 1)[1]
    corpo, _, disc = corpo.partition("\nProva Discursiva\n")
    linhas = [l.rstrip() for l in corpo.splitlines() if not FGV_LIXO.match(l.strip())]
    qs, esperado, buf, materia = [], 1, [], ""
    for l in linhas:
        if l.strip() == str(esperado):
            # títulos de matéria ficam logo antes do número, depois de uma linha terminada em pontuação (fim da questão anterior)
            while buf and not buf[-1].strip(): buf.pop()
            k = len(buf)
            while k and CABECA.match(buf[k - 1].strip()): k -= 1
            if k < len(buf) and (k == 0 or not buf[k - 1].strip() or re.search(r"[.;:?!)”\"]$", buf[k - 1].strip())):
                run = [x.strip() for x in buf[k:]]; del buf[k:]
                if run[0] in ("Conhecimentos Gerais", "Conhecimentos Específicos") and len(run) > 1: run = run[1:]
                materia = " ".join(run)
                if re.match(r"^Analista .* - Classe", materia): materia = "Conhecimentos específicos"
            qs.append({"n": esperado, "materia": materia, "linhas": []}); buf = qs[-1]["linhas"]; esperado += 1; continue
        buf.append(l)
    disc_linhas = []
    for l in disc.strip().splitlines()[1:]:      # pula o "1" do título; a folha de resposta (1, 2, 3... e traços) encerra
        if l.strip() == "1" or l.startswith("---"): break
        if not FGV_LIXO.match(l.strip()): disc_linhas.append(l)
    return qs, juntar(paragrafos(disc_linhas))

ITEM = re.compile(r"^(\(\s*\)|[IVX]+\s*[.–-]|[a-e]\)|\d+\s*[.–-]\s)")

def paragrafos(linhas):
    """FGV não deixa linha em branco entre parágrafos: abre um novo em itens (I., ( ), a)) e depois de frase encerrada."""
    out, ant = [], ""
    for l in linhas:
        s = l.strip()
        if s and ant and (ITEM.match(s) or (re.search(r"[.:?!”]$", ant) and re.match(r"[A-ZÁÉÍÓÚÂÊÔ“\"]", s))): out.append("")
        out.append(l); ant = s or ant
    return out

def montar(q, fgv=False):
    linhas, alts, atual, enun = q["linhas"], {}, None, []
    for l in linhas:
        m = re.match(r"^\s*\(?([A-E])\)\s*(.*)$", l)
        if m and m.group(1) == chr(ord(atual or "@") + 1):
            atual = m.group(1); alts[atual] = [m.group(2)]; continue
        if m and atual: break                     # letra fora de ordem: daqui em diante é trecho deslocado de outra questão
        (alts[atual] if atual else enun).append(l)
    return {"n": q["n"], "materia": q["materia"], "enunciado": juntar(paragrafos(enun) if fgv else enun),
            "alternativas": {k: juntar(v).replace("\n", " ") for k, v in alts.items()}}

def trecho(linhas, partes):
    """Junta os trechos [início, fim] do texto da prova (cada início precisa ser único)."""
    out = []
    for ini, fim in partes:
        achou = [k for k, l in enumerate(linhas) if l.strip().startswith(ini)]
        if len(achou) != 1: sys.exit(f"correção: início {'repetido' if achou else 'não encontrado'}: {ini!r}")
        k = achou[0]
        while not linhas[k].strip().endswith(fim):
            k += 1
            if k - achou[0] > 12: sys.exit(f"correção: fim {fim!r} não encontrado depois de {ini!r}")
        out += [l.strip() for l in linhas[achou[0]:k + 1]]
    return re.sub(r"^\(?[A-E]\)\s*", "", re.sub(r"\s{2,}", " ", " ".join(out)))

PAL = re.compile(r"[A-Za-zÀ-ÿ]+")
PAR = re.compile(r"(?<![A-Za-zÀ-ÿ])([A-Za-zÀ-ÿ]+) ([a-zà-ÿ][a-zà-ÿ]*)(?![A-Za-zÀ-ÿ])")
CURTAS = set("a o e é à as os ao aos às de da do das dos em no na nos nas se que um uma por com ou sem lei art".split())

def colador():
    """Junta palavras partidas pela extração do PDF ("compete nte" → "competente"): só quando a palavra inteira aparece
    em outro ponto das provas e um dos pedaços não é palavra. Numerais romanos e letra solta depois de palavra ficam."""
    voc = Counter(w.lower() for f in PASTA.glob("*-prova.md") for w in PAL.findall(f.read_text(encoding="utf-8")))
    eh = lambda x: x.lower() in CURTAS or (voc[x.lower()] >= 2 and len(x) > 2)
    def troca(m):
        a, b = m.group(1), m.group(2)
        if re.fullmatch(r"[IVX]+", a) or (a.isupper() and len(a) > 1) or (len(b) == 1 and eh(a)) or not voc[(a + b).lower()] or (eh(a) and eh(b)): return m.group(0)
        return a + b
    return lambda t: PAR.sub(troca, PAR.sub(troca, t))

def ler_gabarito(texto, cfg):
    """{número: letra}; "*" (questão anulada) vira "X"."""
    if cfg["gabarito"] == "fundatec":
        g = {str(int(n)): l for n, l in re.findall(r"\b(\d{2,3}) - ([A-E*X])\b", texto)}
    else:
        ls = [l.strip() for l in texto.splitlines()]
        i = next(k for k, l in enumerate(ls) if l == cfg["secao"]) + 1; g = {}
        if cfg["gabarito"] == "grade":            # linha de números, linha de letras
            while i + 1 < len(ls) and re.fullmatch(r"[\d ]+", ls[i] or "x"):
                g.update(zip(ls[i].split(), ls[i + 1].split())); i += 2
        else:                                     # número e letra em linhas alternadas
            while i + 1 < len(ls) and ls[i].isdigit(): g[ls[i]] = ls[i + 1]; i += 2
    return {n: ("X" if l == "*" else l) for n, l in g.items()}

def gerar(id_):
    cfg = PROVAS[id_]
    prova = (PASTA / f"{id_}-prova.md").read_text(encoding="utf-8")
    gtexto = (PASTA / f"{id_}-gabarito.md").read_text(encoding="utf-8")
    gab = ler_gabarito(gtexto, cfg)
    if cfg["formato"] == "fgv":
        brutas, disc = separar_fgv(prova)
        linhas = [l.rstrip() for l in prova.splitlines() if not FGV_LIXO.match(l.strip())]
    else:
        linhas = paginas(prova); brutas, disc = separar(linhas), ""
    qs = [montar(q, cfg["formato"] == "fgv") for q in brutas]
    corr, movidos = PASTA / f"{id_}-correcoes.json", []
    for n, alts in (json.loads(corr.read_text(encoding="utf-8")) if corr.exists() else {}).items():
        if n.startswith("_"): continue
        q = next(x for x in qs if x["n"] == int(n))
        for letra, partes in alts.items():
            q["alternativas"][letra] = trecho(linhas, partes)
            for p in partes: movidos.append((q["n"], letra, trecho(linhas, [p])))
        q["alternativas"] = dict(sorted(q["alternativas"].items()))
    # o trecho deslocado também ficou grudado onde o PDF o pôs: tira de lá
    for q in qs:
        for letra, v in list(q["alternativas"].items()):
            for n, l, t in movidos:
                if (q["n"], letra) != (n, l) and len(t) > 25 and t in v: v = v.replace(t, "").strip()
            q["alternativas"][letra] = v
    colar = colador()
    for q in qs:
        q["enunciado"] = colar(q["enunciado"]); q["alternativas"] = {k: colar(v) for k, v in q["alternativas"].items()}
    disc = colar(disc)
    erros = []
    for q in qs:
        q["gabarito"] = gab.get(str(q["n"]))
        if list(q["alternativas"]) != list("ABCDE"): erros.append(f"questão {q['n']}: alternativas {list(q['alternativas'])}")
        if q["gabarito"] not in list("ABCDEX"): erros.append(f"questão {q['n']}: gabarito {q['gabarito']!r}")
    if len(gab) != len(qs): erros.append(f"gabarito com {len(gab)} questões, prova com {len(qs)}")
    if [q["n"] for q in qs] != list(range(1, len(qs) + 1)): erros.append("numeração fora de ordem")
    if erros: sys.exit("Conferir antes de usar:\n  " + "\n  ".join(erros))
    dados = {"id": id_, "nome": cfg["nome"], "cargo": cfg["cargo"], "banca": cfg["banca"], "gabarito": "preliminar" if "PRELIMINAR" in gtexto.upper() else "definitivo",
             "questoes": qs, **({"discursiva": disc} if disc else {})}
    (PASTA / f"{id_}.json").write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding="utf-8")
    from collections import Counter
    anul = sum(q["gabarito"] == "X" for q in qs)
    print(f"{len(qs)} questões → {id_}.json" + (" + discursiva" if disc else "") + (f" · {anul} anulada(s)" if anul else ""))
    for m, n in Counter(q["materia"] for q in qs).items(): print(f"  {n:3}  {m}")

if __name__ == "__main__":
    for i in sys.argv[1:] or PROVAS: gerar(i)
