"""Gera dados/teses.json a partir do texto do documento "Teses de Repercussão Geral e Temas Repetitivos
mais importantes para as Defensorias Públicas" (dados/teses/*.txt, copiado sem alterações) e da atualização
de julho/2026 (dados/teses/duo-2026-07.json, gerada por teses_duo.py).

    python ferramentas/conteudo/teses_json.py

Quando o mesmo tema está nas duas fontes, vale o da atualização de julho (texto oficial limpo, com processo e data);
o tema que só existe nela ganha a marca "novo". O texto de cada item fica como está no documento. O script só separa os itens, identifica tribunal, tipo,
número e ramo, junta repetições idênticas e marca o que precisa de atenção:
  - "superado": trecho riscado ou cancelado no documento;
  - "aguardando": o documento traz só a questão ou a admissão do tema, sem a tese;
  - "conferir": o mesmo número aparece com textos diferentes no documento.
"""
import json, re, unicodedata
from pathlib import Path

DADOS = Path(__file__).resolve().parent / "dados"
FONTE = sorted((DADOS / "teses").glob("*.txt"))
ATUALIZACAO = DADOS / "teses" / "duo-2026-07.json"
SAIDA = DADOS / "teses.json"

RAMOS = {
    "SÚMULAS MAIS RECENTES": "Súmulas recentes", "PRINCÍPIOS INSTITUCIONAIS": "Princípios institucionais",
    "DIREITO PENAL": "Penal", "DIREITO DA EXECUÇÃO PENAL": "Execução penal", "DIREITO PROCESSUAL PENAL": "Processo penal",
    "DIREITO CIVIL": "Civil", "DIREITO CONSTITUCIONAL": "Constitucional", "DIREITO DA CRIANÇA E DO ADOLESCENTE": "Criança e adolescente",
    "DIREITO ADMINISTRATIVO": "Administrativo", "DIREITO PROCESSUAL CIVIL": "Processo civil", "DIREITO DO CONSUMIDOR": "Consumidor",
    "DIREITOS DIFUSOS E COLETIVOS": "Difusos e coletivos",
}
# temas que o documento lista só com a questão ou a admissão (sem tese firmada)
AGUARDANDO = {("STF", n) for n in "1383 1368 1305 1284 1247 1347 1344 1323 1256 1407 1428 1404 977 1361 1360 1338 1326".split()} \
           | {("STJ", n) for n in "1317 1273 1326".split()}

SECAO = re.compile(r"^\s*(\d+)\.\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ ]+)\s*$")
SUB = re.compile(r"^\s*\d+\.\d*\.?\s*(STF|STJ|Teses de [Rr]epercussão|Temas Repetitivos)")
ITEM = re.compile(
    r"^\s*(?P<risc>~~)?\s*(?P<bul>(?:[•●*]\s*)*)"
    r"(?P<cab>Súmula Vinculante \d+|Súmula \d+|Temas? Repetitivos? \d[\d., e]*\d|Temas? Repetitivos? \d|Tema IAC \d+|Tema \d+|TEMA \d+"
    r"|(?:\d{2,4}\s*[-–]\s*)?(?:RE|ARE|AI|ADI|ADPF)\s+[\d.]+(?:\s*ED)?(?:\s*/\s*[A-Z]{2})?\s*(?:[-–]\s*(?:Acórdão|Tese:?))?"
    r"|\d{3,4}\s*[-–]\s*(?=[A-ZÁÉÍÓÚ]))(?P<resto>.*)$")
LINK = re.compile(r"A?\[\s*((?:A?RE|ADI)[^\]]*?)\s*\]\([^)]*\)")

def chave_texto(t):
    t = re.sub(r"^\W*(?:\d+|[IVX]+)\s*[-.)]\s*", "", t)          # numeração inicial ("1.", "1 -", "I -")
    t = unicodedata.normalize("NFKD", t.lower())
    return re.sub(r"[^a-z0-9]", "", t)

def ler():
    itens, ramo, tribunal = [], "", ""
    for arq in FONTE:
        for linha in arq.read_text(encoding="utf-8").splitlines():
            linha = LINK.sub(lambda m: ("A" if m.group(0).startswith("A[") else "") + m.group(1) + " ", linha)
            m = SECAO.match(linha)
            if m and m.group(2).strip() in RAMOS:
                ramo, tribunal = RAMOS[m.group(2).strip()], ""; continue
            s = SUB.match(linha)
            if s:
                tribunal = "STF" if s.group(1) in ("STF",) or "epercuss" in s.group(1) else "STJ"; continue
            m = ITEM.match(linha)
            if m and (m.group("bul") or m.group("cab").upper().startswith("TEMA")):
                itens.append({"ramo": ramo, "tribunal": tribunal, "cab": m.group("cab").strip(),
                              "linhas": [m.group("resto").strip(" :")], "riscado": bool(m.group("risc"))})
            elif itens and linha.strip():
                itens[-1]["linhas"].append(linha.strip())
    return itens

def montar(it):
    cab, trib = it["cab"], it["tribunal"]
    texto = "\n".join(l for l in it["linhas"] if l).strip()
    riscado = it["riscado"] or "~~" in cab or texto.startswith("~~")
    texto = re.sub(r"^(?:RG\s*)?[-–]?\s*(?:Acórdão|Tese:)\s*", "", texto.replace("~~", "").strip())
    texto = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", texto)              # links em markdown viram texto simples
    processo = ""
    if m := re.match(r"Súmula Vinculante (\d+)", cab): tipo, num, trib = "Súmula Vinculante", m.group(1), "STF"
    elif m := re.match(r"Súmula (\d+)", cab): tipo, num = "Súmula", m.group(1)
    elif m := re.match(r"Tema IAC (\d+)", cab): tipo, num, trib = "IAC", m.group(1), "STJ"
    elif m := re.match(r"Temas? Repetitivos? (.+)", cab):
        tipo, num, trib = "Repetitivo", re.sub(r"(?<=\d)\.(?=\d{3})", "", re.sub(r"\s+", " ", m.group(1))).strip(" ,"), "STJ"
    elif m := re.match(r"(?i)Tema (\d+)\s*[-–]?\s*(.*)", cab):
        tipo, num = ("Repercussão geral" if trib == "STF" else "Repetitivo"), m.group(1)
        processo = m.group(2).strip(" -–.")
    elif m := re.match(r"(\d{2,4})\s*[-–]?\s*(.*)", cab):
        tipo, num, trib = "Repercussão geral", m.group(1), "STF"
        processo = re.sub(r"\s*[-–]\s*(Acórdão|Tese:?)\s*$", "", m.group(2)).strip(" -–")
    else:
        tipo, num, trib = "Repercussão geral", "", "STF"
        processo = re.sub(r"\s*[-–]\s*(Acórdão|Tese:?)\s*$", "", cab).strip(" -–")
    num = num.lstrip("0") if num.isdigit() else num
    if not processo and trib == "STF" and (p := re.findall(r"\b((?:RE|ARE)\s\d[\d.]*\d)", texto)):
        processo = p[-1]                                         # o processo do tema vem no fim; antes podem vir citações
    elif not processo and (p := re.search(r"\(((?:EDcl no |AgInt no )?(?:REsp|RE|ARE|HC|RHC|EREsp|AREsp|ProAfR no REsp) [\d.]+[^,)]*)", texto)):
        processo = p.group(1).strip()
    data = ""
    if d := re.findall(r"julgad[oa] em (\d{1,2}/\d{1,2}/\d{4})", texto): data = d[-1]
    elif d := re.findall(r"(\d{2}/\d{2}/\d{4})\.?\s*$", texto, re.M): data = d[-1]
    status = "superado" if riscado or re.search(r"CANCELAD[OA]", texto) else \
             "aguardando" if (trib, num) in AGUARDANDO and not re.match(r"\d+\.\s", texto) else ""
    processo = processo.rstrip(" .")
    return {"tribunal": trib or "STJ", "tipo": tipo, "num": num, "processo": processo, "data": data,
            "ramo": it["ramo"], "texto": texto, **({"status": status} if status else {})}

def mesmo_tema(grupo):
    """Repetição legítima: mesmo processo, ou o mesmo texto citado em mais de um ramo (um contém o início do outro)."""
    procs = {re.sub(r"\W", "", x["processo"]) for x in grupo}
    if len(procs) == 1 and "" not in procs: return True
    ks = [chave_texto(x["texto"]) for x in grupo]
    return all(a[:60] in b or b[:60] in a for a in ks for b in ks)

def chave(x):
    return (x["tribunal"], x["tipo"], x["num"]) if x["num"] else None

def juntar(abril, ramos):
    """Junta abril com a atualização de julho. Um tema aparece uma vez só (mesmo número ou mesmo texto);
    os outros ramos em que ele é citado vão em "outros_ramos", para o filtro por ramo continuar achando."""
    if not ATUALIZACAO.exists(): return abril, 0
    julho = json.loads(ATUALIZACAO.read_text(encoding="utf-8"))
    tk = lambda x: chave_texto(x["texto"])[:90]
    saida, por_chave, por_texto, achado_em_abril = [], {}, {}, set()
    for origem, lista in (("julho", julho), ("abril", abril)):
        for x in lista:
            k, t = chave(x), tk(x)
            p = (k and por_chave.get(k)) or por_texto.get(t)
            if p is not None:
                if origem == "abril":
                    achado_em_abril.add(id(p))
                    if x["tipo"] == "IAC": p["tipo"] = "IAC"                 # julho lista o IAC como tema comum
                    if " e " in (x["num"] or "") and x["num"].startswith(p["num"]): p["num"] = x["num"]   # "190 e 191"
                if x["ramo"] != p["ramo"] and x["ramo"] not in p.setdefault("outros_ramos", []): p["outros_ramos"].append(x["ramo"])
                continue
            x = dict(x, _origem=origem); saida.append(x)
            if k: por_chave[k] = x
            por_texto[t] = x
    novos = 0
    for x in saida:
        if x.pop("_origem") == "julho" and id(x) not in achado_em_abril: x["novo"] = True; novos += 1
        if not x.get("outros_ramos"): x.pop("outros_ramos", None)
    ordem_tipo = {"Súmula Vinculante": 0, "Súmula": 1, "Repercussão geral": 2, "IAC": 3, "Repetitivo": 4}
    num = lambda x: int(re.match(r"\d+", x["num"]).group()) if re.match(r"\d+", x["num"] or "") else 0
    # dentro de cada ramo: súmulas, depois STF e STJ, do tema mais recente (número maior) para o mais antigo
    saida.sort(key=lambda x: (ramos.index(x["ramo"]) if x["ramo"] in ramos else 99, ordem_tipo.get(x["tipo"], 9), -num(x)))
    return saida, novos

def gerar():
    vistos, saida, dup = set(), [], 0
    for it in ler():
        x = montar(it)
        if not x["texto"] and not x["processo"]: continue
        k = (x["ramo"], x["tribunal"], x["tipo"], x["num"], chave_texto(x["texto"])[:120])
        if k in vistos: dup += 1; continue
        vistos.add(k); saida.append(x)
    # mesmo número com textos diferentes: marca para conferir (o número pode estar trocado no documento)
    por_num = {}
    for x in saida:
        if x["num"]: por_num.setdefault((x["tribunal"], x["tipo"], x["num"]), []).append(x)
    conferir = 0
    for grupo in por_num.values():
        grupo = [x for x in grupo if not x.get("status")]
        if len(grupo) > 1 and not mesmo_tema(grupo):
            for x in grupo:
                if not x.get("status"): x["status"] = "conferir"; conferir += 1
    ramos = list(dict.fromkeys(RAMOS.values()))
    saida, novos = juntar(saida, ramos)
    dados = {"titulo": "Teses de repercussão geral e temas repetitivos mais importantes para a Defensoria",
             "atualizado": "2026-07-01", "fonte": "Compilações “Teses de Repercussão Geral e Temas Repetitivos mais importantes para as Defensorias Públicas” (abril/2026) e “Teses de Repercussão Geral & Temas Repetitivos” (Cursos DUO, julho/2026)",
             "ramos": ramos, "itens": saida}
    SAIDA.write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding="utf-8")
    from collections import Counter
    print(f"{len(saida)} itens, {novos} novos na atualização de julho ({dup} repetições idênticas removidas, {conferir} para conferir número) → {SAIDA}")
    for (r, t), n in sorted(Counter((x["ramo"], x["tribunal"]) for x in saida).items(), key=lambda a: dados["ramos"].index(a[0][0])):
        print(f"  {r:24} {t}: {n}")
    print("  status:", dict(Counter(x.get("status", "ok") for x in saida)))

if __name__ == "__main__":
    gerar()
