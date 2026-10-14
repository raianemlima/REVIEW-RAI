"""Gera o simulado (JSON) a partir do texto da prova e do gabarito (dados/simulados/<id>-prova.md e <id>-gabarito.md).

    python ferramentas/conteudo/simulado_json.py dpe-pr-2024 "DPE-PR 2024" "Defensor(a) Público(a) Substituto(a)" Fundatec

O texto de cada questão fica como está na prova; o script só tira cabeçalhos de página, separa enunciado e
alternativas, junta as linhas quebradas e confere: cada questão precisa ter A a E e uma letra no gabarito.
"""
import json, re, sys
from pathlib import Path

PASTA = Path(__file__).resolve().parent / "dados" / "simulados"
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

def montar(q):
    linhas, alts, atual, enun = q["linhas"], {}, None, []
    for l in linhas:
        m = re.match(r"^\s*([A-E])\)\s*(.*)$", l)
        if m and m.group(1) == chr(ord(atual or "@") + 1):
            atual = m.group(1); alts[atual] = [m.group(2)]; continue
        if m and atual: break                     # letra fora de ordem: daqui em diante é trecho deslocado de outra questão
        (alts[atual] if atual else enun).append(l)
    return {"n": q["n"], "materia": q["materia"], "enunciado": juntar(enun),
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
    return re.sub(r"^[A-E]\)\s*", "", re.sub(r"\s{2,}", " ", " ".join(out)))

def gerar(id_, nome, cargo, banca):
    prova = (PASTA / f"{id_}-prova.md").read_text(encoding="utf-8")
    gab = dict(re.findall(r"\b(\d{2,3}) - ([A-E*X])\b", (PASTA / f"{id_}-gabarito.md").read_text(encoding="utf-8")))
    linhas = paginas(prova)
    qs = [montar(q) for q in separar(linhas)]
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
    erros = []
    for q in qs:
        q["gabarito"] = gab.get(f"{q['n']:02d}") or gab.get(str(q["n"]))
        if list(q["alternativas"]) != list("ABCDE"): erros.append(f"questão {q['n']}: alternativas {list(q['alternativas'])}")
        if not q["gabarito"]: erros.append(f"questão {q['n']}: sem gabarito")
    if [q["n"] for q in qs] != list(range(1, len(qs) + 1)): erros.append("numeração fora de ordem")
    if erros: sys.exit("Conferir antes de usar:\n  " + "\n  ".join(erros))
    dados = {"id": id_, "nome": nome, "cargo": cargo, "banca": banca, "gabarito": "preliminar" if "PRELIMINAR" in (PASTA / f"{id_}-gabarito.md").read_text(encoding="utf-8") else "definitivo",
             "questoes": qs}
    (PASTA / f"{id_}.json").write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding="utf-8")
    from collections import Counter
    print(f"{len(qs)} questões → {id_}.json")
    for m, n in Counter(q["materia"] for q in qs).items(): print(f"  {n:3}  {m}")

if __name__ == "__main__":
    if len(sys.argv) != 5: sys.exit(__doc__)
    gerar(*sys.argv[1:])
