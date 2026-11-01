# Liga cada assunto dos editais aos trechos mais pertinentes do material do Drive (BM25 com bônus de bigrama e de título).
# Uso: python3 -I buscar.py passagens.json editais.json saida.json
import sys, re, json, math, unicodedata, collections

pas_arq, ed_arq, saida = sys.argv[1:4]
P = json.load(open(pas_arq, encoding="utf-8"))
ED = json.load(open(ed_arq, encoding="utf-8"))

def norm(s):
    s = unicodedata.normalize("NFD", str(s).lower())
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", "".join(c for c in s if unicodedata.category(c) != "Mn"))).strip()

STOP = set("""a o e é de do da dos das em no na nos nas um uma uns umas por pelo pela pelos pelas para com sem sob sobre ao aos à às
que se ou como mais menos seu sua seus suas ele ela eles elas isso esse essa este esta estes estas esses essas aquele aquela não nao sim
ser são sao foi há ha entre até ate quando onde qual quais cujo cuja também tambem já ja muito muita só so apenas outro outra outros outras
lei leis nº n art arts artigo artigos inciso incisos parágrafo paragrafo caput etc ex lc cf federal constituição constituicao vigente
jurisprudência jurisprudencia stf stj matéria materia aspectos gerais geral noções nocoes conceito conceitos
disposições disposicoes demais respectivo respectiva âmbito ambito relação relacao regime aplicação aplicacao tema temas
segundo conforme tratamento previsto prevista previstos previstas atual atualizada alterações alteracoes""".split())
STOP = {norm(w) for w in STOP}

def stem(w):
    if len(w) <= 3: return w
    for a, b in (("coes", "cao"), ("oes", "ao"), ("aes", "ao"), ("aos", "ao"), ("ais", "al"), ("eis", "el"), ("ns", "m")):
        if w.endswith(a) and len(w) > len(a) + 2: w = w[: -len(a)] + b; break
    else:
        if w.endswith("s") and len(w) > 4 and not w.endswith(("us", "ss")): w = w[:-1]
    if len(w) > 4 and w[-1] in "ao": w = w[:-1]
    return w
def toks(s):
    return [stem(w) for w in norm(s).split() if w not in STOP and len(w) > 1 and not w.isdigit()]
CODIGOS = {"2848", "3689", "13105", "10406", "5869", "3071", "7210", "8069", "8078", "1001"}  # códigos e estatutos citados em toda parte
def toks_num(s):  # mantém números de leis (8.069, 12.594) como termo
    out = toks(s)
    for m in re.finditer(r"\b(\d{1,2}\.\d{3})(?:/\d{2,4})?", str(s)):
        n = m.group(1).replace(".", "")
        if n not in CODIGOS: out.append("n" + n)
    return out

QUESTAO = re.compile(r"QUEST(Õ|O)ES|COMENT(Á|A)RIOS|Assinale|alternativa|GABARITO|EXERC|REFER(Ê|E)NCIA|BIBLIOGRAF|SOBRE O AUTOR|APRESENTA(Ç|C)(Ã|A)O|SUM(Á|A)RIO", re.I)
docs = []
uid = 0
for p in P:
    if any(QUESTAO.search(s) for s in p["sec"]): continue
    if p["frag"] > .6: continue
    # unidades menores (até ~130 palavras, por parágrafo) para o assunto não se diluir em trechos mistos
    pars = p["texto"].split("\n\n"); grupos, g = [], []
    for x in pars:
        item = re.match(r"^(\d{1,3}\)|Súmula \d|SÚMULA \d|Tema \d)", x)
        if g and (item or sum(len(y.split()) for y in g) + len(x.split()) > 130): grupos.append(g); g = []
        g.append(x)
    if g: grupos.append(g)
    h = toks_num(" ".join(p["sec"]))
    textos_g = ["\n\n".join(g) for g in grupos]
    for k, g in enumerate(grupos):
        txt = "\n\n".join(g)
        if len(txt.split()) < 20 and len(grupos) > 1: continue
        if re.search(r"O que vai estudar neste material|neste material Ponto|^\s*SUM[ÁA]RIO", txt[:200], re.I): continue   # abertura que só repete o edital
        t = toks_num(txt)
        u = {"id": f'{p["id"]}.{k}', "pid": p["id"], "k": k, "n": len(grupos), "fonte": p["fonte"], "arq": p["arq"], "disc": p["disc"],
             "sec": p["sec"], "p": p["p"], "texto": txt, "prox": textos_g[k + 1] if k + 1 < len(textos_g) else "", "ant": textos_g[k - 1] if k else ""}
        u["_tf"] = collections.Counter(t + h + h)
        u["_len"] = len(t) + 2 * len(h)
        u["_bic"] = collections.Counter(zip(t, t[1:]))
        u["_bi"] = set(u["_bic"]) | set(zip(h, h[1:]))
        u["_h"] = set(h)
        u["_t"] = t
        docs.append(u)
N = len(docs); avg = sum(p["_len"] for p in docs) / N
df = collections.Counter(w for p in docs for w in p["_tf"])
idf = {w: math.log(1 + (N - n + .5) / (n + .5)) for w, n in df.items()}

def bm25(p, q):
    s = 0.0
    for w, qw in q.items():
        f = p["_tf"].get(w)
        if not f: continue
        s += qw * idf[w] * f * 2.2 / (f + 1.2 * (1 - .75 + .75 * p["_len"] / avg))
    return s

# disciplina do edital -> chaves aceitas nos trechos
ACEITA = {
    "direito_constitucional": ["const"], "direito_administrativo": ["adm"], "principios_institucionais": ["inst"],
    "direito_institucional_defensoria_publica": ["inst"], "direito_penal": ["penal", "lpe", "crimino", "medleg"],
    "direito_processual_penal": ["pp", "lpe"], "execucao_penal": ["exec"], "direito_civil": ["civil"],
    "direito_processual_civil": ["pc"], "direito_do_consumidor": ["consumidor"], "direitos_humanos": ["dh"],
    "direitos_difusos_coletivos": ["difusos", "amb", "urb", "dh", "consumidor", "pc"], "direitos_difusos_e_coletivos": ["difusos", "amb", "urb", "dh", "consumidor", "pc"],
    "direito_crianca_adolescente": ["eca"], "direito_da_crianca_e_adolescente": ["eca"],
    "direito_civil_consumidor": ["civil", "consumidor"], "direitos_humanos_tutela_coletiva": ["dh", "difusos", "amb", "urb", "pc"],
    "lei_maria_da_penha": ["lpe", "penal", "pp", "dh"], "distrito_federal_politica_mulheres": ["dh", "lpe"],
    "etica_gestao_servico_publico": ["adm"], "regime_juridico_servidores_df": ["adm"], "informatica_protecao_dados": ["civil", "adm", "const"],
}

GENERICO = {norm(w) for w in """bases base diretrizes instrumentos instrumento modalidades dimensões dimensoes formas forma manifestação manifestacao
características caracteristicas natureza jurídica juridica objetivos objetivo evolução evolucao noção nocao fundamentos fundamento espécies
sentidos sentido elementos tipos funções funcoes diferenças diferencas aspectos papeis papéis órgãos orgaos ações acoes normas gerais
desenvolvimento formação formacao atualidade significado essência essencia histórico historico histórica historica panorama teórico teorico
evolutivo noções suas seus outros outras demais temas tema ideia ideias definições definicoes princípios principios interpretação
conteúdo conteudo objeto metodologia matéria materia questões questoes atuação atuacao limitações limitacoes concepções concepcoes
fontes classificações classificacoes""".split()}
def toks_q(s):
    return [w for w in toks_num(s) if w not in {stem(x) for x in GENERICO}]

def pedacos(frase):
    """Frase do edital -> ela mesma e os pedaços entre ':' e ',' (sem as palavras genéricas)."""
    out = [frase]
    if ":" in frase or frase.count(",") >= 2:
        for x in re.split(r"[:;,]|\s+e\s+(?=[A-ZÁÉÍÓÚ])", frase):
            x = x.strip(" .")
            if x and norm(x) != norm(frase): out.append(x)
    return out

def subitens(t):
    t = re.sub(r"^\s*\d+(\.\d+)*\.?\s*", "", t)
    partes = re.split(r"(?<=[.;])\s+(?=(?:\d+(?:\.\d+)*\.?\s+)?[A-ZÁÉÍÓÚÂÊÔÃÕÇ])|:?\s+(?=\d+\.\d+\.?\s)", t)
    return [re.sub(r"^\d+(\.\d+)*\.?\s*", "", x).strip(" .;") for x in partes if len(toks(x)) >= 2]

def consulta(titulo, texto, extra=""):
    q = collections.Counter()
    for w in toks_num(titulo): q[w] += 2
    for w in toks_num(texto): q[w] += 1
    for w in toks_num(extra): q[w] += 1
    return {w: min(v, 3) for w, v in q.items()}

def cobertura(p, termos):
    tot = sum(idf.get(w, 0) for w in termos) or 1
    return sum(idf.get(w, 0) for w in termos if w in p["_tf"]) / tot

def melhores(cands, q, termos_tit, bis, k=12):
    res = []
    for p in cands:
        s = bm25(p, q)
        if s <= 0: continue
        s += sum(1.5 for b in bis if b in p["_bi"])
        s += 1.0 * sum(1 for w in termos_tit if w in p["_h"])
        res.append((s, p))
    res.sort(key=lambda x: -x[0])
    return res[:k]

def cob_h(p, termos):
    tot = sum(idf.get(w, 0) for w in termos) or 1
    return sum(idf.get(w, 0) for w in termos if w in p["_h"]) / tot

def janela(p, termos, W):
    """Maior cobertura (ponderada pelo idf) dos termos dentro de uma janela de W palavras do trecho."""
    alvo = set(termos); pos = [(i, w) for i, w in enumerate(p["_t"]) if w in alvo]
    tot = sum(idf.get(w, 0) for w in termos) or 1
    melhor, ini, cont = 0.0, 0, collections.Counter()
    for j in range(len(pos)):
        cont[pos[j][1]] += 1
        while pos[j][0] - pos[ini][0] >= W:
            cont[pos[ini][1]] -= 1
            if not cont[pos[ini][1]]: del cont[pos[ini][1]]
            ini += 1
        melhor = max(melhor, sum(idf.get(w, 0) for w in cont) / tot)
    return melhor

def elegivel(p, termos, cob, pares, hc):
    if len(termos) == 1: return termos[0] in p["_h"] or p["_tf"].get(termos[0], 0) >= (2 if termos[0].startswith("n") else 3)
    leis = [w for w in termos if re.fullmatch(r"n\d{4,5}", w)]
    if leis and all(p["_tf"].get(w, 0) >= 2 or w in p["_h"] for w in leis): return True
    dist = sum(1 for b in pares if b in p["_bi"]); occ = sum(p["_bic"].get(b, 0) for b in pares)
    if hc >= .7 and cob >= .99: return True
    if hc < .5 and janela(p, termos, 2 * len(termos) + 6) < (.8 if len(termos) <= 4 else .6): return False
    if len(termos) == 2: return cob >= .99 and dist >= 1 and (occ >= 2 or hc >= .5)
    if len(termos) >= 5: return cob >= .7 and dist >= 2
    precisa = max(1, math.ceil(.5 * len(pares)))
    return cob >= .8 and dist >= precisa and (occ >= 2 or len(termos) >= 4)

def por_subconsulta(cands, sq, peso, k=2, pedaco=False, titulo=False, ctx=""):
    termos = list(dict.fromkeys(toks_q(sq)))
    curto = False
    if ctx and 0 < len(termos) <= 2:   # subitem curto: junta o assunto do título (se curto) ou exige o assunto no título da seção
        if len(set(toks_q(ctx))) <= 3: sq = ctx + " " + sq; termos = list(dict.fromkeys(toks_q(sq)))
        else: curto = True
    if not termos: return []
    if len(termos) == 1 and not termos[0].startswith("n") and idf.get(termos[0], 0) < (1.5 if titulo else 4): return []
    if len(termos) > 1 and sum(idf.get(w, 0) for w in termos) < 2.5: return []
    seqq = toks_q(sq)
    pares = list(dict.fromkeys(zip(seqq, seqq[1:])))
    q = {w: 1 for w in termos}
    res = []
    for p in cands:
        cob = cobertura(p, termos)
        if cob < .6: continue
        hc = cob_h(p, termos)
        if (pedaco or curto) and hc < .5 and (len(termos) < 3 or cob < .99): continue
        if not elegivel(p, termos, cob, pares, hc): continue
        s = bm25(p, q)
        if s < 3: continue
        fr = sum(1 for b in pares if b in p["_bi"])
        res.append((peso * (s * (.5 + cob) + 2.5 * fr + 6 * hc * min(len(termos), 4)), cob, hc, sq, p))
    res.sort(key=lambda x: -x[0])
    return res[:k]

saidaj = {}
for ed in ED:
    out = []
    for d in ed["disciplinas"]:
        aceita = set(ACEITA.get(d["id"], []))
        cands = [p for p in docs if aceita & set(p["disc"])] if aceita else []
        for t in d["topicos"]:
            tit = re.sub(r"^\s*\d+(\.\d+)*\.?\s*", "", t["titulo"]).strip(" .")
            subs, vistos = [], set()
            for x in [tit] + subitens(t["texto"]):
                for n, y in enumerate(pedacos(x)):
                    ch = tuple(toks_q(y))
                    if ch and ch not in vistos: vistos.add(ch); subs.append((y, n > 0))
            subs = subs[:18]
            escolhidos = {}
            if cands:
                for j, (sq, ped) in enumerate(subs):
                    for s, cob, hc, via, p in por_subconsulta(cands, sq, 1.0 if j == 0 else (.7 if ped else .85), k=3 if j == 0 else 2, pedaco=ped, titulo=j == 0, ctx="" if j == 0 else tit):
                        if p["id"] not in escolhidos or escolhidos[p["id"]][0] < s: escolhidos[p["id"]] = (s, cob, hc, via, p)
            lista = sorted(escolhidos.values(), key=lambda x: -x[0])
            out.append({"disc": d["id"], "nome": d["nome"], "topico": t["id"], "titulo": t["titulo"], "texto": t["texto"],
                        "cands": [{"id": p["id"], "pid": p["pid"], "k": p["k"], "s": round(s, 2), "cob": round(c, 2), "hc": round(hc, 2), "via": via[:160], "texto": p["texto"], "prox": p["prox"], "ant": p["ant"], "fonte": p["fonte"], "arq": p["arq"], "sec": p["sec"], "p": p["p"]} for s, c, hc, via, p in lista[:14]]})
    saidaj[ed["id"]] = out
json.dump(saidaj, open(saida, "w", encoding="utf-8"), ensure_ascii=False)
print({k: len(v) for k, v in saidaj.items()})
print({k: sum(1 for t in v if t["cands"]) for k, v in saidaj.items()}, "assuntos com algum trecho")
