# Agrupa por matéria os assuntos dos editais (DPE/RN, DPDF e TJPB), une os assuntos repetidos (mesmos trechos) e
# escreve os pacotes de leitura usados para redigir os resumos (passo anterior ao gerar_resumos.py).
# Uso: python3 -I agrupar_assuntos.py ligacoes.json pasta_saida      (ligacoes.json sai do buscar.py)
# Saída: pasta_saida/clusters.json e pasta_saida/work/<matéria>-NN.txt (trechos sem nome de fonte). Tudo fora do Git.
import json, re, collections, os, sys, unicodedata
lig_arq, S = sys.argv[1:3]
LIG = json.load(open(lig_arq, encoding="utf-8"))
os.makedirs(os.path.join(S, "work"), exist_ok=True)
# até 4 trechos por assunto, no máximo 2 do mesmo parágrafo de origem e 2 da mesma subconsulta
def norm(s):
    s = unicodedata.normalize("NFD", str(s).lower())
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", "".join(c for c in s if unicodedata.category(c) != "Mn"))).strip()
def escolher(cands, maxn=4):
    if not cands: return []
    best = cands[0]["s"]; out = []; por_pid = collections.Counter(); por_via = collections.Counter(); vistos = set()
    for c in cands:
        if c["s"] < .35 * best: break
        if por_pid[c["pid"]] >= 2 or por_via[c["via"]] >= 2: continue
        chave = norm(c["texto"])[:160]
        if chave in vistos: continue
        vistos.add(chave); por_pid[c["pid"]] += 1; por_via[c["via"]] += 1
        out.append(c)
        if len(out) >= maxn: break
    return out
MAT = {  # disciplina do edital -> matéria
    "direito_constitucional": "constitucional", "direito_administrativo": "administrativo", "etica_gestao_servico_publico": "administrativo",
    "direito_civil": "civil", "direito_civil_consumidor": "civil", "informatica_protecao_dados": "civil", "direito_do_consumidor": "consumidor",
    "direito_penal": "penal", "lei_maria_da_penha": "penal", "direito_processual_penal": "processo_penal", "execucao_penal": "execucao_penal",
    "direito_processual_civil": "processo_civil", "direitos_humanos": "direitos_humanos", "direitos_humanos_tutela_coletiva": "direitos_humanos",
    "direitos_difusos_coletivos": "difusos", "direitos_difusos_e_coletivos": "difusos", "direito_crianca_adolescente": "eca",
    "direito_da_crianca_e_adolescente": "eca", "principios_institucionais": "defensoria", "direito_institucional_defensoria_publica": "defensoria",
}
ORDEM_ED = ["rn-2025", "df-2026", "tjpb-2026"]
tops = collections.defaultdict(list)
for ed in ORDEM_ED:
    for t in LIG[ed]:
        m = MAT.get(t["disc"])
        if not m: continue
        if t["disc"] == "direito_civil_consumidor" and re.search(r"consum", norm(t["titulo"] + " " + t["texto"][:200])): m = "consumidor"
        esc = escolher(t["cands"])
        tops[m].append({"ref": f'{ed}:{t["topico"]}', "titulo": t["titulo"], "texto": re.sub(r"\s+", " ", t["texto"]).strip(), "esc": esc})
saida = {}
for m, ts in tops.items():
    clusters = []
    for t in ts:
        P = {c["id"] for c in t["esc"]}
        alvo = None
        if P:
            melhor = 0
            for c in clusters:
                if not c["P"]: continue
                ov = len(P & c["P"]) / min(len(P), len(c["P"]))
                if ov > melhor: melhor, alvo = ov, c
            if melhor < .5: alvo = None
        if alvo is None:
            alvo = {"id": f"{m}-{len(clusters)+1:03d}", "P": set(), "topicos": [], "pass": []}
            clusters.append(alvo)
        alvo["topicos"].append({"ref": t["ref"], "titulo": t["titulo"], "texto": t["texto"]})
        for c in t["esc"]:
            if c["id"] not in alvo["P"]:
                alvo["P"].add(c["id"]); alvo["pass"].append({"id": c["id"], "texto": c["texto"], "prox": c.get("prox", ""), "sec": c["sec"]})
    saida[m] = [{"id": c["id"], "topicos": c["topicos"], "pass": c["pass"]} for c in clusters]
json.dump(saida, open(os.path.join(S, "clusters.json"), "w", encoding="utf-8"), ensure_ascii=False)
# pacotes de leitura (texto limpo, sem nome de fonte)
def limpa(t, maxp):
    t = re.sub(r"\*+", "", t); t = re.sub(r"\[\^\d+\]", "", t); t = re.sub(r"\s+", " ", t).strip()
    p = t.split(); return " ".join(p[:maxp]) + (" […]" if len(p) > maxp else "")
tot = 0
for m, cs in saida.items():
    com = [c for c in cs if c["pass"]]
    sem = [c for c in cs if not c["pass"]]
    lote, n = [], 0
    def grava():
        global n
        if not lote: return
        n += 1
        open(os.path.join(S, "work", f"{m}-{n:02d}.txt"), "w", encoding="utf-8").write("\n".join(lote)); lote.clear()
    palavras = 0
    for c in com:
        bloco = [f"######## {c['id']}"]
        for t in c["topicos"]: bloco.append(f"EDITAL [{t['ref'].split(':')[0]}] {limpa(t['texto'], 90)}")
        for i, p in enumerate(c["pass"][:5], 1):
            sec = " › ".join(re.sub(r"\*+", "", x) for x in p["sec"][-2:])
            txt = p["texto"] + ((" " + p["prox"]) if len(p["texto"].split()) < 60 and p["prox"] else "")
            bloco.append(f"--- T{i} ({sec}): {limpa(txt, 170)}")
        w = sum(len(x.split()) for x in bloco)
        if palavras + w > 6500: grava(); palavras = 0
        lote.extend(bloco); palavras += w
    grava()
    tot += len(com)
    print(f"{m:16} grupos com trechos={len(com):3} sem={len(sem):2} assuntos={sum(len(c['topicos']) for c in cs):3} pacotes={n}")
print("total de grupos:", tot)
