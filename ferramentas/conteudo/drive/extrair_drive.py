# Extrai o texto dos materiais do Drive em blocos por página, sem as linhas repetidas (cabeçalho, rodapé, marca d'água)
# e sem linhas com dados pessoais (e-mail, CPF, telefone, "licenciado para").
# Uso: python3 -I extrair_drive.py pasta_com_pdf_docx_md corpus.json   (fora do repositório: o conteúdo é do curso)
import sys, os, re, json, zipfile, html, collections
import pymupdf
src, out = sys.argv[1], sys.argv[2]
PII = re.compile(r"[\w.+-]+@[\w-]+[.·][\w.·]+|\b\d{3}[.·]?\d{3}[.·]?\d{3}-?\d{2}\b|\bCPF\s*:|\buid:|cpfCnpj|Licenciad[oa] para|Baixado por|\(\d{2}\)\s?9?\d{4}-?\d{4}", re.I)
docs = []
for nome in sorted(os.listdir(src)):
    p = os.path.join(src, nome); paginas = []
    if nome.endswith(".pdf"):
        d = pymupdf.open(p)
        for i, pg in enumerate(d):
            linhas = [l.strip() for l in pg.get_text().split("\n")]
            paginas.append((i + 1, [l for l in linhas if l]))
    elif nome.endswith(".docx"):
        z = zipfile.ZipFile(p); x = z.read("word/document.xml").decode("utf8")
        pars = []
        for m in re.finditer(r"<w:p[ >].*?</w:p>", x, flags=re.S):
            par = m.group(0); est = re.search(r'<w:pStyle w:val="([^"]+)"', par)
            t = html.unescape("".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", par))).strip()
            if t: pars.append(("§H " if est and re.match(r"(Heading|Ttulo|Titulo|T\w*tulo)\d", est.group(1), re.I) else "") + t)
        # docx sem páginas: blocos de 40 parágrafos
        for k in range(0, len(pars), 40): paginas.append((k // 40 + 1, pars[k:k + 40]))
    elif nome.endswith(".md"):
        t = open(p, encoding="utf-8").read().split("\n"); t = [("§H " + l.lstrip("# ")) if l.startswith("#") else l for l in t if l.strip()]
        for k in range(0, len(t), 40): paginas.append((k // 40 + 1, t[k:k + 40]))
    else:
        continue
    # linhas que se repetem em muitas páginas = cabeçalho/rodapé/marca d'água
    cont = collections.Counter(l for _, ls in paginas for l in set(ls))
    n = max(1, len(paginas))
    repet = {l for l, c in cont.items() if n >= 4 and c >= max(3, 0.3 * n) and len(l) < 160}
    limpas, pii = [], collections.Counter()
    for pgn, ls in paginas:
        boas = []
        for l in ls:
            if l in repet: continue
            if PII.search(l): pii[l[:60]] += 1; continue
            if re.fullmatch(r"\d{1,4}|Página \d+( de \d+)?|\d+ de \d+", l): continue
            boas.append(l)
        limpas.append({"p": pgn, "l": boas})
    docs.append({"arq": nome, "paginas": limpas, "repetidas": sorted(repet)[:12], "pii": pii.most_common(5)})
json.dump(docs, open(out, "w", encoding="utf-8"), ensure_ascii=False)
for d in docs:
    nl = sum(len(p["l"]) for p in d["paginas"])
    print(f'{d["arq"][:70]:70} pág={len(d["paginas"]):4} linhas={nl:6} rep={len(d["repetidas"]):2} pii={d["pii"][:2]}')
