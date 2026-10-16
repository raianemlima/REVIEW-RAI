"""Extrai os enunciados do compilado "Teses de Repercussão Geral & Temas Repetitivos" (Cursos DUO, 07/2026), já em texto (.md).

    python ferramentas/conteudo/teses_duo.py caminho/Teses_e_Temas_STF_STJ_Cursos_DUO_07-2026.md

Grava dados/teses/duo-2026-07.json só com o que é público: tribunal, tipo, número, processo, data, ramo e o texto oficial
de cada tese ou súmula. Cabeçalhos, rodapés e a marca d'água com dados de quem comprou o material ficam de fora.
Depois rode teses_json.py, que junta esta lista com a de abril/2026.
"""
import json, re, sys
from pathlib import Path

SAIDA = Path(__file__).resolve().parent / "dados" / "teses" / "duo-2026-07.json"
PARTES = {1: "Súmulas recentes", 2: "Princípios institucionais", 3: "Penal", 4: "Execução penal", 5: "Processo penal",
          6: "Civil", 7: "Constitucional", 8: "Criança e adolescente", 9: "Administrativo", 10: "Processo civil",
          11: "Consumidor", 12: "Difusos e coletivos"}
CAB = re.compile(r"^S T ([FJ]) (Súmula [Vv]inculante \d+|Súmula \d+|\d{1,4})(?:\s+(.*))?$")
LIXO = re.compile(r"^(## Página|C U R S O S|Licensed to|S T F (STF|Teses)|S T J (STJ|Temas)|ST[FJ] · |T E M A$|S T [FJ]$)")
PARA = re.compile(r"^(?:\d{1,2}\s*[.)\-–]|[IVX]{1,4}\s*[-–.)]|[a-h]\))\s+\S")
DATA = re.compile(r"(\d(?:\s*\d)?\s*/\s*\d(?:\s*\d)?\s*/\s*\d(?:\s*\d){3})")
# citação no fim do enunciado: "(REsp 1.234/SP, Rel. ..., julgado em 1/2/2024, DJe ...)" ou "STJ. 3ª Seção. REsp ... (Info 881)"
CIT_PAR = re.compile(r"\s*\((?:[^()]|\([^()]*\))*?\b(?:REsp|EREsp|AREsp|RE|ARE|HC|RHC|Pet|CC|ProAfR|EDcl|AgInt|Segunda Seção|Primeira Seção|Terceira Seção|Corte Especial|PRIMEIRA SEÇÃO|SEGUNDA SEÇÃO|TERCEIRA SEÇÃO|Aprovada|julgad)(?:[^()]|\([^()]*\))*\)\.?\s*$")
CIT_SOLTA = re.compile(r"\s*\(?\s*(?:STJ\.\s*\S+\s*Seção\.\s*)?(?:ProAfR no |EDcl no |AgInt no )?(?:REsp|EREsp|AREsp|RE|ARE)\.?\s?\d[\d.]*[^\n]*?(?:Rel\.|[Rr]elator|julgad|Seção)[^\n]*$")
CIT_TXT = re.compile(r"\s*(?:STF|STJ)\.\s+(?:Plenário|\d+ª\s+(?:Seção|Turma)|Corte Especial|1ª|2ª|3ª)[^\n]*$")

def limpa(s):
    s = s.replace("ﬁ", "fi").replace("ﬂ", "fl").replace("­", "")
    return re.sub(r"[ \t]+", " ", s).strip()

def processo_limpo(p):
    p = re.sub(r"\b(REsp|RE|ARE)\.\s*(?=\d)", r"\1 ", p)
    p = re.sub(r"(?<=[\d.]) +(?=[\d./])", "", p)                 # "RE 114 0005" -> "RE 1140005"; "7 66.304 /RS" -> "766.304/RS"
    p = re.sub(r" +/", "/", p).strip(" -–,;")
    return re.sub(r"\b(A?RE) (\d{4,})\b", lambda m: m.group(1) + " " + f"{int(m.group(2)):,}".replace(",", "."), p)

def data_limpa(d):
    d = re.sub(r"\s", "", d)
    try:
        dd, mm, aa = d.split("/"); return f"{int(dd):02d}/{int(mm):02d}/{aa}"
    except ValueError: return d

def ler(md):
    parte, itens = 0, []
    linhas = md.read_text(encoding="utf-8").splitlines()
    i = 0
    while i < len(linhas):
        l = linhas[i].strip()
        if m := re.match(r"^P A R T E\s+(\d)\s*(\d)?$", l):
            parte = int(m.group(1) + (m.group(2) or "")); i += 2; continue      # a linha seguinte é o título da parte
        m = CAB.match(l)
        if m and parte:
            trib, cab, resto = "STF" if m.group(1) == "F" else "STJ", m.group(2), m.group(3) or ""
            itens.append({"tribunal": trib, "cab": cab, "resto": resto, "ramo": PARTES[parte], "linhas": []})
        elif itens and l and not LIXO.match(l) and parte:
            itens[-1]["linhas"].append(l)
        i += 1
    return itens

def montar(it):
    trib, cab, resto = it["tribunal"], it["cab"], it["resto"]
    if m := re.match(r"Súmula [Vv]inculante (\d+)", cab): tipo, num = "Súmula Vinculante", m.group(1)
    elif m := re.match(r"Súmula (\d+)", cab): tipo, num = "Súmula", m.group(1)
    else: tipo, num = ("Repercussão geral" if trib == "STF" else "Repetitivo"), str(int(cab))
    status = "superado" if re.search(r"REVOGAD|SEM EFEITO|CANCELAD", resto) else ""
    if re.search(r"T E S E\s*$", resto) and it["linhas"]: it["linhas"][0] = "Tese " + it["linhas"][0]
    resto = re.sub(r"REVOGADA|SEM EFEITO|T E S E", "", resto).strip()
    processo, data = resto, ""
    if "AC Ó R D ÃO" in resto:
        processo, depois = resto.split("AC Ó R D ÃO", 1)
        if d := DATA.search(depois): data = data_limpa(d.group(1))
    elif d := DATA.search(resto):
        processo, data = resto[:d.start()], data_limpa(d.group(1))
    processo = processo_limpo(DATA.sub("", processo))
    # junta as linhas quebradas do PDF; item numerado ("1.", "2 -", "I -") começa parágrafo novo
    paras = []
    for l in it["linhas"]:
        l = limpa(l)
        if not paras or PARA.match(l): paras.append(l)
        else: paras[-1] += ("" if paras[-1].endswith("-") and not paras[-1].endswith(" -") else " ") + l
    texto = "\n".join(paras)
    texto = re.sub(r"(?<=\S) +(?=\d{1,2}\s*[-–]\s+[A-ZÁÉÍÓÚ])", "\n", texto)   # "... art. 12. 2 - Não é possível" -> novo parágrafo
    # citação final vira referência; o texto da tese fica limpo
    texto = re.sub(r"\s*T E M A S?\s*$", "", texto)
    texto = re.sub(r"\s*(?:\[\.\.\.\]\s*)?Acórdão sujeito ao regime do art\. 543-C[^\n]*$", "", texto)
    if o := re.search(r"\s*Órgão julgador:.*$", texto): texto = texto[:o.start()]
    ref = []
    while (c := CIT_PAR.search(texto)) or (c := CIT_TXT.search(texto)) or (c := CIT_SOLTA.search(texto)):
        if c.start() < 40 or not re.search(r"Rel\.|[Rr]elator|julgad|Seção|SEÇÃO|Aprovada|Plenário|DJe|Info", c.group(0)): break
        ref.insert(0, c.group(0).strip().strip("()").strip(" ."))
        texto = texto[:c.start()].rstrip()
    ref = " · ".join(r.rstrip(")") if r.count(")") > r.count("(") else r for r in ref)
    if q := re.search(r"\s*\b((?:RE|ARE)\s?[\d.]+)\.?\s*(\d{1,2}/\d{1,2}/\d{4})\.?$", texto):   # só a questão do tema, ainda sem tese
        status, texto = "aguardando", texto[:q.start()].rstrip(" .") + "."
        processo = processo or processo_limpo(q.group(1)); data = data or data_limpa(q.group(2))
    if not processo and (p := re.search(r"\b((?:REsp|EREsp|RE|ARE|AREsp|HC|RHC|PSV)\.?\s?[\d.]+[\d](?:[-/][A-Z]{2})?)", ref)):
        processo = processo_limpo(p.group(1))
    if not data and (d := re.findall(r"(?:julgad[oa]|[Aa]provada) em (\d{1,2}/\d{1,2}/\d{4})", ref)): data = data_limpa(d[-1])
    texto = re.sub(r"(?m)^(\d{1,2}\.)(?=[A-ZÁÉÍÓÚ])", r"\1 ", texto.strip())          # "1.É devido" -> "1. É devido"
    if texto and texto[-1] not in ".;:!?)]»”\"": texto += "."
    x = {"tribunal": trib, "tipo": tipo, "num": num, "processo": processo, "data": data, "ramo": it["ramo"], "texto": texto.strip()}
    if ref: x["ref"] = ref
    if status: x["status"] = status
    return x

if __name__ == "__main__":
    if len(sys.argv) != 2: sys.exit(__doc__)
    itens = [montar(it) for it in ler(Path(sys.argv[1]))]
    itens = [x for x in itens if x["texto"]]
    SAIDA.write_text(json.dumps(itens, ensure_ascii=False, indent=1), encoding="utf-8")
    from collections import Counter
    print(f"{len(itens)} enunciados → {SAIDA}")
    for (r, t), n in Counter((x["ramo"], x["tribunal"]) for x in itens).items(): print(f"  {r:24} {t}: {n}")
