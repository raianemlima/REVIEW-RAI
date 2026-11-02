# Monta os e-books "Resumos por matéria" (Aprofundamento) a partir dos resumos reescritos assunto por assunto.
# Uso: python3 -I gerar_resumos.py clusters.json pasta_resumos pasta_saida
#
# clusters.json: {materia: [{id, topicos: [{ref: "edital:topico", titulo, texto}], pass: [...]}]}
#   (cada grupo junta os assuntos dos editais que tratam da mesma coisa; "pass" são os trechos de origem)
# pasta_resumos/*.md: blocos "=== <id>\nCAP: <capítulo>\nTIT: <título>\n<corpo em Markdown, sem títulos #>"
#
# Saída: um JSON por matéria (rm-<materia>.json) no formato de DECK.ebooks, com "editais":
#   {edital: {topico: [capítulo, âncora, 1] | null}} — null = assunto do edital sem resumo (o Cronograma avisa).
# O texto é de apoio ao estudo, sem nome de curso ou de material de origem. Nada disto vai em claro para o
# repositório público: sele com ferramentas/ajustes/selar_conteudo.mjs (conteudo-cifrado/resumos-<materia>.bin).
import sys, re, json, os, glob, datetime

clu_arq, res_dir, pasta = sys.argv[1:4]
CLU = json.load(open(clu_arq, encoding="utf-8"))
os.makedirs(pasta, exist_ok=True)

# matéria -> (título, disciplina do app, ordem dos capítulos)
MATERIAS = {
    "constitucional": ("Direito Constitucional", "dc", ["Teoria da Constituição", "Direitos fundamentais", "Organização do Estado", "Organização dos Poderes",
                       "Funções essenciais à Justiça", "Controle de constitucionalidade", "Defesa do Estado", "Tributação e orçamento", "Ordem social"]),
    "administrativo": ("Direito Administrativo", "ad", ["Fundamentos do Direito Administrativo", "Organização administrativa", "Atos e poderes administrativos",
                       "Agentes públicos e processo administrativo", "Serviços públicos", "Licitações e contratos", "Bens públicos e intervenção na propriedade",
                       "Responsabilidade do Estado e controle"]),
    "defensoria": ("Defensoria Pública e princípios institucionais", "pi", ["Assistência jurídica e acesso à justiça", "Defensoria Pública na Constituição",
                   "Organização e prerrogativas", "Funções e atuação"]),
    "penal": ("Direito Penal", "dp", ["Fundamentos e aplicação da lei penal", "Teoria do crime", "Penas", "Ação penal e punibilidade", "Crimes em espécie",
              "Legislação penal especial"]),
    "processo_penal": ("Direito Processual Penal e Execução Penal", "pp", ["Fundamentos e sistemas", "Investigação", "Ação penal e jurisdição", "Sujeitos e defesa",
                       "Provas", "Prisão e medidas cautelares", "Procedimentos e atos processuais", "Sentença, recursos e nulidades", "Legislação especial",
                       "Execução penal"]),
    "civil": ("Direito Civil", "cv", ["Parte geral", "Obrigações e contratos", "Responsabilidade civil", "Direitos reais", "Família e sucessões",
              "Empresa e pessoa jurídica", "Proteção de dados"]),
    "processo_civil": ("Direito Processual Civil", "pc", ["Jurisdição e processo de conhecimento", "Partes e Fazenda Pública", "Atos processuais", "Tutelas provisórias",
                       "Procedimentos especiais", "Execução", "Tribunais e precedentes", "Tutela coletiva"]),
    "consumidor": ("Direito do Consumidor", "co", ["Fundamentos e responsabilidade", "Contratos e responsabilidade civil", "Práticas comerciais e crimes",
                   "Defesa do consumidor em juízo", "Sistema de defesa do consumidor"]),
    "direitos_humanos": ("Direitos Humanos", "dh", ["Teoria geral", "Sistema brasileiro e internacional", "Instrumentos internacionais", "Igualdade e antidiscriminação",
                         "Acesso à justiça e grupos vulneráveis"]),
    "difusos": ("Direitos Difusos e Coletivos", "df", ["Processo coletivo", "Direitos sociais e políticas públicas", "Grupos e direitos em espécie"]),
    "eca": ("Direito da Criança e do Adolescente", "ec", ["Fundamentos e direitos", "Convivência familiar e família substituta", "Justiça da Infância e Juventude",
            "Ato infracional e medidas socioeducativas"]),
}
JUNTAR = {"execucao_penal": "processo_penal"}   # poucos assuntos: viram o capítulo "Execução penal" de Processo Penal
EDITAIS = {"rn-2025": "DPE/RN", "tjpb-2026": "TJPB", "df-2026": "DPDF"}
# assunto de outra disciplina do edital que o resumo cobre por inteiro
EXTRA = {"df-2026:d006_t007": "civil-042"}   # Noções de informática: "noções básicas da Lei 13.709/2018" -> LGPD
CURSO = re.compile(r"cp ?iuris|reta final|dpe ?full|ouse\b|pro leges|mege\b|estrat[eé]gia concursos|cursinho|dizer o direito|e-?book", re.I)
PII = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\buid:|cpfCnpj|Licenciad[oa] para|Baixado por", re.I)

# ---------- resumos ----------
RES = {}
for f in sorted(glob.glob(os.path.join(res_dir, "*.md"))):
    for bloco in re.split(r"^=== ", open(f, encoding="utf-8").read(), flags=re.M)[1:]:
        cab, _, corpo = bloco.partition("\n")
        m1 = re.match(r"CAP: (.+)\nTIT: (.+)\n", corpo)
        if not m1: sys.exit(f"{f}: bloco {cab.strip()} sem CAP/TIT")
        corpo = corpo[m1.end():].strip()
        rid = cab.strip()
        if rid in RES: sys.exit(f"resumo repetido: {rid}")
        if re.search(r"^#", corpo, re.M): sys.exit(f"{rid}: o corpo não pode ter títulos (# ...): a âncora do Cronograma conta os títulos")
        if CURSO.search(corpo + m1.group(2)) or PII.search(corpo): sys.exit(f"{rid}: menção a curso/material de origem ou dado pessoal")
        RES[rid] = {"cap": m1.group(1).strip(), "tit": m1.group(2).strip(), "md": corpo}

def item_do_edital(t):
    m = re.match(r"^\s*(\d+(?:\.\d+)*)\.?\s", t["texto"])
    return m.group(1) if m else ""

def onde(topicos):
    por = {}
    for t in topicos:
        ed = t["ref"].split(":")[0]
        por.setdefault(ed, [])
        n = item_do_edital(t)
        if n and n not in por[ed]: por[ed].append(n)
    partes = [f"{EDITAIS[ed]}{' ' + ', '.join(ns) if ns else ''}" for ed in EDITAIS if ed in por for ns in [por[ed]]]
    return "*No edital: " + " · ".join(partes) + "*"

grupos = {}
for mat, cl in CLU.items():
    grupos.setdefault(JUNTAR.get(mat, mat), []).extend(cl)

usados, total = set(), {}
for mat, cl in grupos.items():
    titulo, disc, ordem = MATERIAS[mat]
    caps = {c: [] for c in ordem}
    editais = {}
    for x in cl:
        r = RES.get(x["id"])
        if x["pass"] and not r: sys.exit(f"{x['id']}: grupo com trechos e sem resumo")
        if not r:
            for t in x["topicos"]:
                ed, tid = t["ref"].split(":")
                editais.setdefault(ed, {}).setdefault(tid, None)
            continue
        if r["cap"] not in caps: sys.exit(f"{x['id']}: capítulo {r['cap']!r} fora da ordem de {mat}")
        caps[r["cap"]].append((x, r)); usados.add(x["id"])
    out, ancora = [], {}
    for ci, (cap, itens) in enumerate((c, v) for c, v in caps.items() if v):
        md = []
        for k, (x, r) in enumerate(itens):
            md += [f"## {r['tit']}", "", onde(x["topicos"]), "", r["md"], ""]
            ancora[x["id"]] = [len(out), k, 1]
            for t in x["topicos"]:
                ed, tid = t["ref"].split(":")
                editais.setdefault(ed, {})[tid] = ancora[x["id"]]
        out.append({"id": "c" + str(len(out) + 1), "t": cap, "md": "\n".join(md).strip() + "\n"})
    for ref, rid in EXTRA.items():
        if rid in ancora:
            ed, tid = ref.split(":"); editais.setdefault(ed, {})[tid] = ancora[rid]
    nomes = [EDITAIS[e] for e in EDITAIS if e in editais]
    sub = "Resumos por assunto · " + (", ".join(nomes[:-1]) + " e " + nomes[-1] if len(nomes) > 1 else nomes[0])
    eid = "rm-" + mat.replace("_", "-")
    ebook = {"id": eid, "titulo": titulo, "subtitulo": sub, "disc": disc, "grupo": "Resumos por matéria",
             "atualizado": datetime.date.today().isoformat(), "caps": out, "editais": editais}
    json.dump(ebook, open(os.path.join(pasta, eid + ".json"), "w", encoding="utf-8"), ensure_ascii=False)
    com = sum(1 for d in editais.values() for v in d.values() if v); tot = sum(len(d) for d in editais.values())
    total[eid] = (len(ancora), com, tot)
    print(f"{eid}: {len(ancora)} resumos em {len(out)} capítulos; {com}/{tot} assuntos de edital com resumo; {sum(len(c['md']) for c in out)/1e3:.0f} mil caracteres")
sobra = set(RES) - usados
if sobra: sys.exit(f"resumos sem grupo: {sorted(sobra)[:5]}")
print(f"total: {sum(v[0] for v in total.values())} resumos; {sum(v[1] for v in total.values())}/{sum(v[2] for v in total.values())} assuntos de edital com resumo")
