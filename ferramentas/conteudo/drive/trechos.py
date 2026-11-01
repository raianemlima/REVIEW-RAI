# Segmenta os materiais do Drive (corpus.json + .md originais) em trechos com seção, páginas e disciplina.
# Uso: python3 -I trechos.py corpus.json pasta_do_drive trechos.json   (corpus.json sai do extrair_drive.py)
import sys, re, json, os, unicodedata, collections

corpus_arq, pasta, saida = sys.argv[1:4]
corpus = json.load(open(corpus_arq, encoding="utf-8"))

def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", "".join(c for c in s if unicodedata.category(c) != "Mn"))).strip()

# ---------- fontes: rótulo, disciplinas (chaves canônicas) ou "geral" ----------
DH = ["dh"]
FONTES = [  # (prefixo do nome do arquivo depois do id, rótulo, chaves)
    ("Cópia_de_Direitos_Humanos_-_E-book_2026", "CP Iuris · Direitos Humanos (e-book 2026)", DH),
    ("Direito_Processual_Civil_-_E-book_2026", "CP Iuris · Direito Processual Civil (e-book 2026)", ["pc"]),
    ("Legislação_Penal_Especial_-_E-book_2026", "CP Iuris · Legislação Penal Especial (e-book 2026)", ["lpe"]),
    ("Direito_da_Criança_e_do_Adolescente_-_E-book_2026", "CP Iuris · Direito da Criança e do Adolescente (e-book 2026)", ["eca"]),
    ("Direito_Penal_-_Parte_Especial_-_E-book_2026", "CP Iuris · Direito Penal – Parte Especial (e-book 2026)", ["penal"]),
    ("Direito_Civil_-_E-book_2026", "CP Iuris · Direito Civil (e-book 2026)", ["civil"]),
    ("Direito_Administrativo_-_E-book_2026", "CP Iuris · Direito Administrativo (e-book 2026)", ["adm"]),
    ("Direito_do_Consumidor_-_E-book_2026", "CP Iuris · Direito do Consumidor (e-book 2026)", ["consumidor"]),
    ("Informativos_10x_-_2026", "CP Iuris · Informativos 10x – 2026 (1º semestre)", "geral"),
    ("Roteiro_de_Leitura_-_Informativos", None, None),
    ("Atualizações_-_Julho_2026", "Atualizações – julho/2026", "geral"),
    ("Atualizações_-_Agosto_2026", "Atualizações – agosto/2026", "geral"),
    ("Atualizações_-_Janeiro_a_junho", "Atualizações – janeiro a junho/2026", "geral"),
    ("Radar_Legislativo_2024-2026_DPERN", "Radar Legislativo 2024–2026 · DPE/RN", "geral"),
    ("Roteiro-Diario-DPE-RN", None, None),
    ("EBOOK_-_Reta_Final_-_DPE-SP_-_Direitos_Humanos", "Reta Final DPE/SP · Direitos Humanos", DH),
    ("EBOOK_COMPLEMENTAR_-_Reta_Final_-_DPE-SP_-_Direitos_Humanos", "Reta Final DPE/SP · Direitos Humanos (complementar)", DH),
    ("EBOOK_-_Reta_Final_-_DPE-SP_-_Direito_Constitucional", "Reta Final DPE/SP · Direito Constitucional", ["const"]),
    ("EBOOK_-_Reta_Final_-_DPE-SP_-_Direito_Administrativo_e_Tributário", "Reta Final DPE/SP · Direito Administrativo e Tributário", ["adm", "trib"]),
    ("EBOOK_-_Reta_Final_-_DPE-SP_-_Princípios_e_Atriuições_Institucionais", "Reta Final DPE/SP · Princípios e Atribuições Institucionais", ["inst"]),
    ("EBOOK_-_Reta_Final_-_DPE-SP_-_Direto_Penal", "Reta Final DPE/SP · Direito Penal", ["penal", "lpe"]),
    ("EBOOK_-_Reta_Final_-_DPE-SP_-_Civil_ok", "Reta Final DPE/SP · Direito Civil", ["civil"]),
    ("EBOOK_-_Reta_Final_-_DPE-SP_-_Direto_Processual_Penal", "Reta Final DPE/SP · Direito Processual Penal", ["pp"]),
    ("EBOOK_-_Reta_Final_-_DPE-SP_-_Direito_Processual_Civil", "Reta Final DPE/SP · Direito Processual Civil", ["pc"]),
    ("EBOOK_-_Reta_Final_-_DPE-SP_-_Direitos_Difusos_e_Coletivos", "Reta Final DPE/SP · Direitos Difusos e Coletivos", ["difusos", "amb", "urb"]),
    ("EBOOK_-_Reta_Final_-_DPE-SP_-_Direito_da_Criança_e_do_Adolescente", "Reta Final DPE/SP · Direito da Criança e do Adolescente", ["eca"]),
    ("EBOOK_-_Reta_Final_-_DPE-SP_-_Teses_Institucionais_DPE-SP", "Reta Final DPE/SP · Teses Institucionais", ["inst"]),
    ("Defensoria_Pública_-_LC_80_1994", "Pro Leges · Defensoria Pública – LC 80/1994 e CF/88", ["inst"]),
    ("Difusos_e_coletivos_-_em_1_coluna", "Pro Leges · Direitos Difusos e Coletivos", ["difusos"]),
    ("Direito_da_Pessoa_com_Deficiência", "Pro Leges · Direito da Pessoa com Deficiência", ["difusos", "dh"]),
    ("Direito_da_pessoa_idosa", "Pro Leges · Direito da Pessoa Idosa", ["difusos", "dh"]),
    ("Direito_do_Consumidor.pdf", "Pro Leges · Direito do Consumidor", ["consumidor"]),
    ("Direito_da_Criança_e_do_Adolescente.pdf", "Pro Leges · Direito da Criança e do Adolescente", ["eca"]),
    ("Direito_Urbanístico", "Pro Leges · Direito Urbanístico", ["urb", "difusos"]),
    ("Direito_à_saúde", "Pro Leges · Direito à Saúde", ["const", "difusos", "dh"]),
    ("Criminologia.pdf", "Pro Leges · Criminologia", ["crimino"]),
    ("Direito_Agrário", "Pro Leges · Direito Agrário", ["const", "civil", "difusos"]),
    ("Direito_Digital", "Pro Leges · Direito Digital", ["civil", "const"]),
    ("Direito_Desportivo", "Pro Leges · Direito Desportivo", ["const"]),
    ("_Execução_penal", "Pro Leges · Execução Penal", ["exec"]),
    ("2026.08._Criminologia", "Pro Leges · Criminologia (revisão DPE/RJ)", ["crimino"]),
    ("NPL._02._Traumatologia", "NPL · Medicina Legal – Traumatologia", ["medleg"]),
    ("NPL._Hermenêutica_constitucional", "NPL · Hermenêutica constitucional", ["const"]),
    ("Mínimo_existencial_e_proteção_insuficiente", "Mínimo existencial e proteção insuficiente", ["const", "dh", "difusos"]),
    ("Perspectiva_racial_gênero_e_deficiência", "Perspectiva racial, de gênero e de deficiência", ["dh", "difusos"]),
    ("_Direitos_Humanos_-_noções_gerais", "Direitos Humanos – noções gerais", DH),
    ("DH_Ponto_0_Overview", "Anotações de estudo · Direitos Humanos – Ponto 0 (visão geral)", DH),
    ("Direitos_Humanos_Bloco1", "Anotações de estudo · Direitos Humanos – Bloco 1", DH),
    ("DH_Ponto_0.1_Lei_Seca_Comentada", "Anotações de estudo · Direitos Humanos – Ponto 0.1 (lei seca comentada)", DH),
    ("DH_-_DPERN.md", "Anotações de estudo · Direitos Humanos para a DPE/RN", ["dh", "difusos"]),
    ("litigancia-estrutural-barreiras-acesso.md", "Guia de estudo · Litigância estrutural e barreiras de acesso", ["difusos", "inst", "pc", "dh", "const"]),
    ("Tortura-Prova-e-Seguranca-Publica", "Guia de estudo · Tortura, prova e segurança pública", ["dh", "pp", "lpe"]),
    ("letalidade-cameras-prisoes", "Curso RDP · Letalidade policial, câmeras corporais e prisões", ["dh", "pp", "exec"]),
    ("ia-racismo-dpesp", "Curso RDP · Inteligência artificial e racismo", ["dh", "difusos"]),
    ("tabela26casos", "Quadro · 26 casos do Brasil na Corte IDH", DH),
]
RDP = {  # apostilas do Curso RDP (Direitos Humanos): rótulo a partir do nome
    "grupos-vulneraveis-pessoas-em-situacao-de-rua": "Grupos vulneráveis – pessoas em situação de rua",
    "casos-da-corte-idh-outros-paises": "Casos da Corte IDH – outros países",
    "grupos-vulneraveis-lgbtqiap": "Grupos vulneráveis – LGBTQIAP+",
    "oea-e-o-sistema-interamericano": "OEA e o sistema interamericano",
    "grupos-vulneraveis-povos-ciganos": "Grupos vulneráveis – povos ciganos",
    "casos-da-corte-idh-brasil": "Casos da Corte IDH – Brasil",
    "clima-consulta": "Opinião consultiva sobre emergência climática",
    "grupos-vulneraveis-comunidade-de-terreiros-pescadores-ribeirinhos": "Grupos vulneráveis – comunidades de terreiro, pescadores e ribeirinhos",
    "direito-internacional-humanitario": "Direito Internacional Humanitário",
    "agenda-2030-da-onu": "Agenda 2030 da ONU",
    "casos-comissao-idh-brasil": "Casos do Brasil na Comissão IDH",
    "convencao-sobre-a-eliminacao-de-todas-as-formas-de-discriminacao-contra-a-mulher": "CEDAW",
    "introducao-e-temas-gerais": "Introdução e temas gerais",
    "sis-regional-controle-de-conven-status-dos-trat-bloco-de-const": "Sistemas regionais, controle de convencionalidade e status dos tratados",
    "as-100-regras-de-brasilia": "As 100 Regras de Brasília",
    "o-defensor-publico-interamericano": "O defensor público interamericano",
    "mecanismos-de-monitoramento-no-sistema-global": "Mecanismos de monitoramento no sistema global",
    "constitucionalismo-haitiano-carta-mandinga": "Constitucionalismo haitiano e Carta Mandinga",
    "medidas-cautelares-e-medidas-provisorias": "Medidas cautelares e medidas provisórias",
    "sistema-onusiano": "Sistema onusiano",
    "resumo-comentarios-gerais-dos-comites": "Comentários gerais dos comitês",
    "grupos-vulneraveis-vulnerabilidade-por-genero-e-idosos-na-normativa-internacional": "Grupos vulneráveis – gênero e idosos na normativa internacional",
    "direito-indigenista-temas-aprofundados": "Direito indigenista – temas aprofundados",
    "opinioes-consultivas-corte-idh": "Opiniões consultivas da Corte IDH",
    "direito-dos-refugiados": "Direito dos refugiados",
}
EXTRA_RDP = {"grupos-vulneraveis-pessoas-em-situacao-de-rua": ["difusos"], "grupos-vulneraveis-lgbtqiap": ["difusos"],
             "grupos-vulneraveis-vulnerabilidade-por-genero-e-idosos-na-normativa-internacional": ["difusos"],
             "direito-indigenista-temas-aprofundados": ["difusos", "const"], "grupos-vulneraveis-povos-ciganos": ["difusos"],
             "grupos-vulneraveis-comunidade-de-terreiros-pescadores-ribeirinhos": ["difusos"], "clima-consulta": ["difusos", "amb"],
             "sis-regional-controle-de-conven-status-dos-trat-bloco-de-const": ["const"], "o-defensor-publico-interamericano": ["inst"],
             "as-100-regras-de-brasilia": ["inst"]}

PONTO_DISC = [  # (início do nome, já sem acentos, depois de "Copia_de_"/"EBOOK_1_-_") -> rótulo da disciplina, chaves
    ("Direito_Processual_Civil", "Direito Processual Civil", ["pc"]),
    ("Direito_Processual_Penal", "Direito Processual Penal", ["pp"]),
    ("Direito_da_Execucao_Penal", "Direito da Execução Penal", ["exec"]),
    ("Direito_Civil", "Direito Civil", ["civil"]),
    ("Direito_Penal", "Direito Penal", ["penal"]),
    ("Direito_Constitucional", "Direito Constitucional", ["const"]),
    ("Principios_Institucionais", "Princípios Institucionais", ["inst"]),
]
def ponto_de(nome):
    """Apostila "Ponto N" do Cursos DUO: (rótulo, chaves) ou (None, None)."""
    nome = unicodedata.normalize("NFC", nome)
    base = "".join(ch for ch in unicodedata.normalize("NFD", nome) if unicodedata.category(ch) != "Mn")
    base = re.sub(r"^(Copia_de_|EBOOK_\d+_-_)", "", base)
    m = re.search(r"Ponto_?(\d+(?:\.\d+)?)", nome)
    if not m: return None, None
    for pref, rot, ch in PONTO_DISC:
        if base.startswith(pref):
            tema = re.split(r"_-?_?(?:\[|at_\d|atualiza|Atualiza|retifica)|\.(?:pdf|docx)$", nome[m.end():], maxsplit=1)[0]
            tema = re.sub(r"_+", " ", tema).strip(" -")
            return f"Cursos DUO · {rot} – Ponto {m.group(1)}" + (f" ({tema})" if tema else ""), ch
    return None, None

def fonte_de(arq):
    nome = arq[7:] if re.match(r"^.{6}_", arq) else arq   # o nome salvo começa pelos 6 primeiros caracteres do id do Drive
    rot, ch = ponto_de(nome)
    if rot: return rot, ch
    for pref, rot, ch in FONTES:
        if nome.startswith(pref) or pref in arq: return rot, ch
    base = re.sub(r"\.(pdf|md|docx)$", "", nome).strip("_")
    for k, rot in RDP.items():
        if base.startswith(k[:60]): return "Curso RDP · " + rot, DH + EXTRA_RDP.get(k, [])
    return None, None

# ---------- disciplinas pelos títulos (para os materiais gerais) ----------
DISC_TIT = [
    ("direito constitucional", "const"), ("constitucional", "const"), ("direito administrativo", "adm"), ("administrativo", "adm"),
    ("direito tributario", "trib"), ("tributario", "trib"), ("direito financeiro", "fin"),
    ("direito processual civil", "pc"), ("processo civil", "pc"), ("processual civil", "pc"),
    ("direito processual penal", "pp"), ("processo penal", "pp"), ("processual penal", "pp"),
    ("execucao penal", "exec"), ("legislacao penal especial", "lpe"), ("legislacao penal", "lpe"),
    ("direito penal", "penal"), ("direito civil", "civil"), ("direito do consumidor", "consumidor"), ("consumidor", "consumidor"),
    ("direito da crianca e do adolescente", "eca"), ("crianca e do adolescente", "eca"), ("infancia e juventude", "eca"),
    ("direitos humanos", "dh"), ("direitos difusos", "difusos"), ("difusos e coletivos", "difusos"), ("tutela coletiva", "difusos"),
    ("direito ambiental", "amb"), ("ambiental", "amb"), ("direito urbanistico", "urb"), ("urbanistico", "urb"),
    ("direito do trabalho", "trabalho"), ("processual do trabalho", "trabalho"), ("direito previdenciario", "prev"), ("previdenciario", "prev"),
    ("direito eleitoral", "eleitoral"), ("eleitoral", "eleitoral"), ("direito empresarial", "empresarial"),
    ("principios institucionais", "inst"), ("defensoria publica", "inst"), ("direito do idoso", "difusos"), ("pessoa com deficiencia", "difusos"),
]
def discs_titulo(t):
    n = norm(t)
    if len(n) > 140 or not n: return None
    achou = []
    resto = " " + n + " "
    for k, c in DISC_TIT:
        if " " + k + " " in resto:
            achou.append(c); resto = resto.replace(" " + k + " ", " | ")
    if not achou: return None
    # o título precisa ser "só disciplina" (sobra pouco texto além dos nomes e conectivos)
    sobra = [w for w in resto.replace("|", " ").split() if w not in {"e", "de", "do", "da", "dos", "das", "direito", "direitos", "atualizacao", "legislativa", "capitulo", "informativos", "stj", "stf"} and not re.fullmatch(r"[ivxlc]+|\d+", w)]
    if len(sobra) > 1: return None
    return sorted(set(achou))

# ---------- títulos ----------
NUMH = re.compile(r"^(\d{1,2}(?:\.\d{1,2}){0,4})\.?\s*(?:[–—-]\s*)?(\S.*)$")
NAO_TIT = re.compile(r"^(CAIU|IMPORTANTE|ATEN[ÇC][ÃA]O|OBS|DICA|CUIDADO|STJ|STF|INFO|\(INFO|ART\.|Art\.|§|SÚMULA|Súmula|TEMA|Tema|JURISPRUD|Jurisprud|QUESTÃO|Questão|GABARITO|Gabarito|ALTERNATIVA|EXEMPLO|Exemplo|ERRADO|CERTO|CORRET|INCORRET|LETRA|RESPOSTA|PERGUNTA|FIQUE|ANOTE|NOTE|Fonte|FONTE|\(|“|\")")
def maiusc(s):
    letras = [c for c in s if c.isalpha()]
    return len(letras) >= 5 and sum(c.isupper() for c in letras) / len(letras) >= .85

def titulo(l, prev_fim):
    """(nível, texto) quando a linha é título; senão None. prev_fim = a linha anterior terminou frase/bloco."""
    if l.startswith("§H "):
        t = re.sub(r"\*+", "", l[3:]).strip()
        m = NUMH.match(t)
        return ((m.group(1).count(".") + 1) if m and len(m.group(1)) < 12 else 1, t) if t else None
    if len(l) > 110 or len(l) < 3 or re.search(r"\.{4,}", l) or l.endswith((",", ";")) or NAO_TIT.match(l): return None
    m = NUMH.match(l)
    if m and not re.fullmatch(r"\d{1,2}", l):
        num, txt = m.group(1), m.group(2)
        if not txt[:1].isupper() or ":" in txt[:-1] or len(txt) < 3: return None
        prof = num.count(".") + 1
        if maiusc(txt): return (prof, l)
        if prof >= 2 and len(txt) < 90 and prev_fim and txt.count(",") <= 1: return (prof, l)
        if prof == 1 and len(txt) < 70 and prev_fim and txt.endswith(".") and "," not in txt and txt.count(". ") == 0: return (1, l)
        return None
    if maiusc(l) and prev_fim and not l.endswith(":") and len(l) <= 100 and l.count(". ") <= 1 and not re.search(r"\b\d+\.\s+\S{1,2}$", l) and not re.match(r"^[A-Z]\)|^[IVX]+\s*[-–—]", l): return (1, l)
    return None

# ---------- notas de rodapé ----------
GAB = re.compile(r"^(\d{1,3})\s+(?:Gabarito:?\s*)?(CERTO|ERRADO|CERTA|ERRADA|CORRETO|CORRETA|INCORRETO|INCORRETA|Certo|Errado|Correto|Correta|Incorreto|Incorreta|[A-E])\.?$")
def rodape(linhas):
    """Separa as notas de rodapé do fim da página: devolve (corpo, gabaritos {n: resposta}, números das notas)."""
    gab, nums = {}, set()
    for l in linhas:
        m = GAB.match(l)
        if m: gab[m.group(1)] = m.group(2).upper() if len(m.group(2)) > 1 else "letra " + m.group(2)
    corpo = [l for l in linhas if not GAB.match(l)]
    # bloco final de notas: linhas "N texto" com N crescente, a partir do fim
    idx = [i for i, l in enumerate(corpo) if re.match(r"^\d{1,3}\s+\S", l) and not re.match(r"^\d{1,3}\s+(de|e|a|o|anos?|dias?|meses|horas|%)\b", l)]
    ini = None
    if idx:
        seq = []
        for i in reversed(idx):
            n = int(corpo[i].split()[0])
            if i < len(corpo) * .45: break
            if seq and n != seq[-1][1] - 1: break
            seq.append((i, n))
        if seq:
            i0, n0 = seq[-1]
            corpo_txt = " ".join(corpo[:i0])
            if re.search(r"[A-Za-zÀ-ú\.\)”\"]%s(?=[\s.,;:]|$)" % n0, corpo_txt): ini = i0
    if ini is not None:
        for l in corpo[ini:]:
            m = re.match(r"^(\d{1,3})\s", l)
            if m: nums.add(m.group(1))
        corpo = corpo[:ini]
    nums |= set(gab)
    return corpo, gab, nums

INICIO_PAR = re.compile(r"^([a-z]\)|[ivx]{1,5}\)|[IVX]{1,6}\s*[-–—)]|\d{1,3}[\.)]\s|\d{1,3}\s[-–—]\s|[•▪●◦\-–—]\s|Art\.\s*\d|§\s*\d|Parágrafo único|CAIU|IMPORTANTE|ATENÇÃO|OBS|DICA|CUIDADO|Súmula|SÚMULA|STJ\.|STF\.|\(INFO|INFO\s|Tema\s\d|\(Defensor|\(DPE|\(Juiz|\(Promotor|\|)")
def paragrafos(linhas):
    pars = []
    for l in linhas:
        l = l.replace("\u00ad", "").strip()
        if not l: continue
        if l.startswith("|"):
            pars.append(l); continue
        if pars and not pars[-1].startswith("|"):
            p = pars[-1]
            lone = re.fullmatch(r"([a-z]|[ivx]{1,5}|\d{1,3})[\.)]", p.strip())
            fim = re.search(r"[.:;!?”\")]$", p)
            if lone or (not INICIO_PAR.match(l) and not (fim and (l[:1].isupper() or l[:1].isdigit()) and len(p.split("\n")[-1]) < 70)):
                if re.search(r"[A-Za-zÀ-ú]-$", p) and l[:1].islower(): pars[-1] = p[:-1] + l
                else: pars[-1] = p + " " + l
                continue
        pars.append(l)
    return pars

PULA = re.compile(r"INSTAGRAM|@[A-Za-z]|proleges\.com\.br|pág\.\s*\d+\s*de\s*\d+|^SUMÁRIO$|^Sumário$|(?:Estudos|Material de estudo) d[ao] \w+ ?(?:•|$)|^\*\*Nota de atualização:\*\*", re.I)   # rodapé com nome da dona das anotações

def ler_md(arq):
    p = os.path.join(pasta, arq)
    linhas = open(p, encoding="utf-8").read().split("\n")
    out, tab = [], False
    for l in linhas:
        s = l.rstrip()
        if not s.strip(): out.append(""); tab = False; continue
        if s.startswith("#"): out.append("§H " + s.lstrip("# ").strip()); tab = False; continue
        out.append(s)
    return [{"p": 1, "l": out}]

passagens = []
for d in corpus:
    rot, ch = fonte_de(d["arq"])
    if not rot: continue
    md = d["arq"].endswith(".md")
    paginas = ler_md(d["arq"]) if md else d["paginas"]
    # cabeçalhos corridos: linha entre as 3 primeiras de 3+ páginas
    topo = collections.Counter(l for pg in paginas for l in set(pg["l"][:3]))
    corrido = {l for l, c in topo.items() if c >= 3 and len(l) < 120} if not md else set()
    docx = d["arq"].endswith(".docx")
    viu_h = not docx
    pilha, ctx = [], (ch if ch != "geral" else [])
    atual = None
    def fecha():
        global atual
        if atual and atual["pars"]:
            passagens.append(atual)
        atual = None
    def novo(pg):
        global atual
        atual = {"arq": d["arq"], "fonte": rot, "disc": list(ctx), "sec": [t for _, t in pilha], "p": [pg, pg], "pars": []}
    for pg in paginas:
        ls = []
        for l in pg["l"]:
            if l in corrido:
                if ch == "geral":
                    dt = discs_titulo(l)
                    if dt: ctx = dt
                continue
            if PULA.search(l) or re.search(r"\.{5,}\s*\d*$", l): continue
            ls.append(l)
        if md:
            corpo, gab, nums = ls, {}, set()
        else:
            corpo, gab, nums = rodape(ls)
        if not viu_h and any(l.startswith("§H ") for l in corpo):
            corpo = corpo[next(i for i, l in enumerate(corpo) if l.startswith("§H ")):]; viu_h = True
        elif not viu_h: continue
        # títulos e parágrafos
        bloco, prev_fim = [], True
        def despeja():
            global atual
            if not bloco: return
            for p in (list(bloco) if (docx or md) else paragrafos(bloco)):   # .docx e .md já vêm em parágrafos
                # marcas de nota coladas ao texto e gabarito das questões "CAIU"
                def troca(m):
                    n = m.group(2)
                    if n in gab and re.search(r"CAIU|\(Defensor|\(DPE|CESPE|FCC|FGV|VUNESP", p): return m.group(1) + f" [gabarito: {gab[n]}]"
                    return m.group(1) if n in nums else m.group(0)
                p = re.sub(r"([A-Za-zÀ-ú\.\)”\"!?])(\d{1,3})(?=[\s.,;:]|$)", troca, p)
                p = re.sub(r"\s+", " ", p).strip() if not p.startswith("|") else p
                if not p: continue
                if atual is None: novo(pg["p"])
                atual["pars"].append(p); atual["p"][1] = pg["p"]
                if sum(len(x.split()) for x in atual["pars"]) >= 230:
                    fecha()
            bloco.clear()
        for l in corpo:
            t = titulo(l, prev_fim)
            if t and (md or docx) and not l.startswith("§H ") and not maiusc(l): t = None
            if t:
                despeja(); fecha()
                nivel, txt = t
                txt = re.sub(r"\*+", "", txt).strip()
                dt = discs_titulo(txt)
                if dt:   # título que só nomeia a disciplina: muda o contexto, não entra no caminho da seção
                    if ch == "geral": ctx = dt
                    pilha = []
                    prev_fim = True
                    continue
                while pilha and pilha[-1][0] >= nivel: pilha.pop()
                pilha.append((nivel, txt))
                prev_fim = True
                continue
            bloco.append(l)
            prev_fim = bool(re.search(r"[.:;!?”\")]$", l)) or len(l) < 45
        despeja()
    fecha()

# limpeza: tira trechos curtos demais ou só de tabela quebrada
saidas = []
for i, p in enumerate(passagens):
    txt = "\n\n".join(p["pars"])
    pal = len(txt.split())
    if pal < 25: continue
    curtas = sum(1 for x in p["pars"] if len(x) < 40) / max(1, len(p["pars"]))
    saidas.append({"id": i, "arq": p["arq"], "fonte": p["fonte"], "disc": p["disc"], "sec": p["sec"][-3:], "p": p["p"], "texto": txt, "pal": pal, "frag": round(curtas, 2)})
json.dump(saidas, open(saida, "w", encoding="utf-8"), ensure_ascii=False)
c = collections.Counter(s["fonte"] for s in saidas)
for k, v in c.most_common(): print(f"{v:5} {k}")
print(len(saidas), "trechos;", sum(s["pal"] for s in saidas), "palavras")
semd = collections.Counter(s["fonte"] for s in saidas if not s["disc"])
print("sem disciplina:", semd.most_common())
