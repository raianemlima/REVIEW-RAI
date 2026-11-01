# Monta os e-books "Conteúdo específico" (um por concurso) a partir das ligações assunto -> trechos.
# Uso: python3 -I gerar_ebooks.py ligacoes.json editais3.json pasta_saida
import sys, re, json, os, unicodedata, collections, datetime

lig_arq, ed_arq, pasta = sys.argv[1:4]
LIG = json.load(open(lig_arq, encoding="utf-8"))
ED = {e["id"]: e for e in json.load(open(ed_arq, encoding="utf-8"))}
os.makedirs(pasta, exist_ok=True)

META = {
    "rn-2025": ("ce-dpe-rn", "Conteúdo específico · DPE/RN", "III Concurso de Defensor Público · assunto por assunto do Regulamento (Res. 344/2025), com os trechos do seu material"),
    "tjpb-2026": ("ce-tjpb", "Conteúdo específico · TJPB 2026", "Analista Judiciário – Área Judiciária · assunto por assunto do Edital nº 01/2026, com os trechos do seu material"),
    "df-2026": ("ce-dpdf", "Conteúdo específico · DPDF 2026", "Analista de Apoio à Assistência Judiciária – Direito · assunto por assunto do Edital nº 1/2026, com os trechos do seu material"),
}
PII = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\buid:|cpfCnpj|Licenciad[oa] para|Baixado por|\(\d{2}\)\s?9?\d{4}-?\d{4}" + "".join("|" + re.escape(n) for n in os.environ.get("OCULTAR", "").split(",") if n.strip()), re.I)   # OCULTAR=nome1,nome2

def norm(s):
    s = unicodedata.normalize("NFD", str(s).lower())
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", "".join(c for c in s if unicodedata.category(c) != "Mn"))).strip()

def titulo_cap(nome):
    peq = {"e", "de", "do", "da", "dos", "das", "a", "o", "em", "no", "na", "nº", "ao", "à", "para", "acerca"}
    out = []
    for i, w in enumerate(nome.lower().split()):
        out.append(w if (w in peq and i) else (w.upper() if w in {"lodf", "df", "lc"} else w[:1].upper() + w[1:]))
    return " ".join(out)

def limpa(t):
    t = re.sub(r"\[\^\d+\]", "", t)
    t = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", r"\1", t)
    t = t.replace(" ", " ")
    return t

def corta(t, maxp=230):
    pal = t.split()
    if len(pal) <= maxp: return t
    s = " ".join(pal[:maxp])
    m = re.search(r"^(.*[.;!?”])\s", s[: len(s)])
    return (m.group(1) if m and len(m.group(1)) > len(s) * .6 else s) + " […]"

def trecho_md(c):
    txt = limpa(c["texto"])
    if len(txt.split()) < 60 and c.get("prox"): txt += "\n\n" + limpa(c["prox"])
    if re.match(r"^[a-zà-ú,;]", txt) and c.get("ant"):   # começa no meio da frase: traz o parágrafo anterior
        ant = limpa(c["ant"]).split("\n\n")[-1]
        txt = ant + "\n\n" + txt
    pars = [corta(p.strip()) for p in txt.split("\n\n") if p.strip()]
    linhas = []
    tab = []
    def fecha_tab():
        if tab:
            if len(tab) >= 2 and not re.match(r"^\|?\s*:?-{3,}", tab[1]):
                n = tab[0].count("|") - 1
                tab.insert(1, "|" + "---|" * max(1, n))
            linhas.append(""); linhas.extend(tab); linhas.append(""); tab.clear()
    for p in pars:
        if PII.search(p): p = PII.sub("", p)
        if p.startswith("|"): tab.append(p); continue
        fecha_tab()
        if linhas and linhas[-1].startswith(">"): linhas.append(">")
        linhas.append("> " + re.sub(r"\s+", " ", p))
    fecha_tab()
    return "\n".join(linhas).strip()

def fonte_md(c):
    pag = ""
    if c["arq"].endswith(".pdf"):
        a, b = c["p"]
        pag = f", p. {a}" if a == b else f", p. {a}–{b}"
    sec = " › ".join(x for x in c["sec"][-2:] if x)
    sec = re.sub(r"\*+", "", sec)
    return f"*{c['fonte']}{pag}{' · ' + sec if sec else ''}*"

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

resumo = {}
for ed_id, topicos in LIG.items():
    eid, titulo, sub = META[ed_id]
    ed = ED[ed_id]
    caps, mapa = [], {}
    por_disc = collections.OrderedDict()
    for t in topicos: por_disc.setdefault((t["disc"], t["nome"]), []).append(t)
    for ci, ((did, nome), ts) in enumerate(por_disc.items()):
        k = 0
        com = sum(1 for t in ts if escolher(t["cands"]))
        md = [f"*{com} de {len(ts)} assuntos do edital com trechos do seu material.* Cada trecho traz a fonte e a página; leia junto com a lei seca e confira a redação vigente.", ""]
        for t in ts:
            tit = re.sub(r"\s+", " ", t["titulo"]).strip().rstrip(".")
            if tit.endswith("…") or len(tit) > 120:   # título truncado no programa: usa a primeira frase do item
                corpo = re.sub(r"^\s*\d+(?:\.\d+)*\.?\s*", "", t["texto"])
                prim = re.split(r"(?<=[a-zà-ú)])\.\s|:\s", corpo)[0].strip()
                tit = prim if len(prim) <= 120 else prim[:117].rsplit(" ", 1)[0] + "…"
            num = re.match(r"^\s*(\d+(?:\.\d+)*)\.?\s", t["texto"])
            cab = f"{num.group(1)}. {tit}" if num and not tit.startswith(num.group(1)) else tit
            md.append(f"## {cab}")
            esc = escolher(t["cands"])
            mapa[t["topico"]] = [ci, k, len(esc)]
            k += 1
            md.append("")
            md.append(f"**Edital:** {re.sub(chr(10), ' ', t['texto']).strip()}")
            md.append("")
            if not esc:
                md.append("*O seu material do Drive não traz trecho específico deste assunto. Estude pela lei seca, pelos cartões e pelas fontes oficiais indicadas no Cronograma.*")
                md.append("")
                continue
            for j, c in enumerate(esc, 1):
                via = c["via"].strip(" .")
                sobre = "" if norm(via) == norm(tit) else f" · sobre: {via}"
                md.append(f"**Trecho {j}**{sobre} — {fonte_md(c)}")
                md.append("")
                md.append(trecho_md(c))
                md.append("")
        caps.append({"id": f"c{ci + 1}", "t": titulo_cap(nome), "md": "\n".join(md).strip() + "\n"})
    ebook = {"id": eid, "titulo": titulo, "subtitulo": sub, "disc": "", "grupo": "Conteúdo específico", "edital": ed_id,
             "atualizado": datetime.date.today().isoformat(), "caps": caps, "mapa": mapa}
    json.dump(ebook, open(os.path.join(pasta, eid + ".json"), "w", encoding="utf-8"), ensure_ascii=False)
    n = sum(1 for v in mapa.values() if v[2]); tr = sum(v[2] for v in mapa.values())
    tam = sum(len(c["md"]) for c in caps)
    resumo[eid] = (n, len(mapa), tr, tam)
    print(f"{eid}: {n}/{len(mapa)} assuntos com trecho, {tr} trechos, {tam/1e6:.2f} MB de texto, {len(caps)} capítulos")
