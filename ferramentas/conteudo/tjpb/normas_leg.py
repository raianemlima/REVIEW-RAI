"""Lei seca de leis federais a partir do texto compilado vigente do normas.leg.br (Senado/Câmara), para o app.

    python ferramentas/conteudo/tjpb/normas_leg.py ferramentas/conteudo/dados/leiseca-publica            # todas de LEIS
    python ferramentas/conteudo/tjpb/normas_leg.py ferramentas/conteudo/dados/leiseca-publica lgpd lindb # só algumas

O normas.leg.br publica, para cada norma, a "Compilação Monovigente" da Câmara dos Deputados (texto atualizado, com as
notas "(Redação dada pela Lei ...)"). O script pede os metadados da norma (api/public/normas?urn=...), baixa o texto
"Current" e converte para o formato de lei seca do app. Dispositivo revogado não entra (o artigo revogado fica só como
"Art. N. (Revogado.)", para a numeração não sumir); vetado fica como está. O site do Planalto não é usado (fica fora da
rede das sessões). Texto oficial, de domínio público: a saída pode ficar no repositório e é publicada no baralho por
ferramentas/ci/aplicar_leiseca.mjs (só com APP_SENHA).
"""
import html
import json
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path

API = "https://normas.leg.br/api/public/"
# chave -> (urn, id, nome, curto, disciplina "@termo" resolvida no baralho pelo nome[, seleções antigas que a lei completa substitui])
LEIS = {
    "lgpd": ("urn:lex:br:federal:lei:2018-08-14;13709", "lgpd", "Lei nº 13.709/2018 · Lei Geral de Proteção de Dados Pessoais (LGPD)", "LGPD", "@administrativo"),
    "lindb": ("urn:lex:br:federal:decreto.lei:1942-09-04;4657", "lindb", "Decreto-Lei nº 4.657/1942 · Lei de Introdução às Normas do Direito Brasileiro (LINDB)", "LINDB", "@civil"),
    "l9784": ("urn:lex:br:federal:lei:1999-01-29;9784", "l9784", "Lei nº 9.784/1999 · Processo administrativo federal", "Lei 9.784", "@administrativo"),
    "l12846": ("urn:lex:br:federal:lei:2013-08-01;12846", "l12846", "Lei nº 12.846/2013 · Lei Anticorrupção (responsabilização de pessoas jurídicas)", "Lei 12.846", "@administrativo"),
    # legislação especial citada no edital do TJPB (Anexo I) e ainda sem lei seca no app
    "l12850": ("urn:lex:br:federal:lei:2013-08-02;12850", "l12850", "Lei nº 12.850/2013 · Organizações criminosas e colaboração premiada", "Orcrim", "@processo penal"),
    "l9807": ("urn:lex:br:federal:lei:1999-07-13;9807", "l9807", "Lei nº 9.807/1999 · Proteção a vítimas, testemunhas e réus colaboradores", "Proteção a testemunhas", "@processo penal"),
    "l13431": ("urn:lex:br:federal:lei:2017-04-04;13431", "l13431", "Lei nº 13.431/2017 · Escuta especializada e depoimento especial de criança e adolescente", "Depoimento especial", "@crianca"),
    "l14344": ("urn:lex:br:federal:lei:2022-05-24;14344", "l14344", "Lei nº 14.344/2022 · Lei Henry Borel (violência doméstica contra criança e adolescente)", "Henry Borel", "@crianca"),
    "l9613": ("urn:lex:br:federal:lei:1998-03-03;9613", "l9613", "Lei nº 9.613/1998 · Lavagem de dinheiro", "Lavagem", "@penal"),
    "l8072": ("urn:lex:br:federal:lei:1990-07-25;8072", "l8072", "Lei nº 8.072/1990 · Crimes hediondos", "Hediondos", "@penal"),
    "l9455": ("urn:lex:br:federal:lei:1997-04-07;9455", "l9455", "Lei nº 9.455/1997 · Crimes de tortura", "Tortura", "@penal"),
    "l13869": ("urn:lex:br:federal:lei:2019-09-05;13869", "l13869", "Lei nº 13.869/2019 · Abuso de autoridade", "Abuso de autoridade", "@penal"),
    "l9296": ("urn:lex:br:federal:lei:1996-07-24;9296", "l9296", "Lei nº 9.296/1996 · Interceptação telefônica e telemática", "Interceptação", "@processo penal"),
    "l7716": ("urn:lex:br:federal:lei:1989-01-05;7716", "l7716", "Lei nº 7.716/1989 · Crimes de racismo", "Racismo", "@penal"),
    "l9605": ("urn:lex:br:federal:lei:1998-02-12;9605", "l9605", "Lei nº 9.605/1998 · Crimes ambientais", "Crimes ambientais", "@penal"),
    "l9099": ("urn:lex:br:federal:lei:1995-09-26;9099", "l9099", "Lei nº 9.099/1995 · Juizados Especiais Cíveis e Criminais", "Lei 9.099", "@processo penal", ["jec"]),
    "l10259": ("urn:lex:br:federal:lei:2001-07-12;10259", "l10259", "Lei nº 10.259/2001 · Juizados Especiais Federais", "Lei 10.259", "@processo civil"),
    "l8009": ("urn:lex:br:federal:lei:1990-03-29;8009", "l8009", "Lei nº 8.009/1990 · Impenhorabilidade do bem de família", "Bem de família", "@civil"),
    "l8245": ("urn:lex:br:federal:lei:1991-10-18;8245", "l8245", "Lei nº 8.245/1991 · Locações de imóveis urbanos", "Locações", "@civil"),
    "l12965": ("urn:lex:br:federal:lei:2014-04-23;12965", "l12965", "Lei nº 12.965/2014 · Marco Civil da Internet", "Marco Civil", "@civil"),
    "l4717": ("urn:lex:br:federal:lei:1965-06-29;4717", "l4717", "Lei nº 4.717/1965 · Ação popular", "Ação popular", "@difusos"),
    "l7347": ("urn:lex:br:federal:lei:1985-07-24;7347", "l7347", "Lei nº 7.347/1985 · Ação civil pública", "Lei 7.347", "@difusos"),
    "l13146": ("urn:lex:br:federal:lei:2015-07-06;13146", "l13146", "Lei nº 13.146/2015 · Estatuto da Pessoa com Deficiência", "PcD", "@direitos humanos", ["epcd"]),
}
ESTRUTURA = re.compile(r"^(LIVRO|PARTE|TÍTULO|CAPÍTULO|SEÇÃO|Seção|SUBSEÇÃO|Subseção)\b")
ARTIGO = re.compile(r"^Art\.\s*(\d+)\s*[º°o]?\s*(?:-\s*([A-Z]))?\s*\.?\s+")
ROTULO = r"(?:§\s*\d+º?(?:-[A-Z])?|Parágrafo único\.?|[IVXLC]+(?:-[A-Z])?\s*[-–]|[a-z]\)|\d+\))"
# fim do texto: a linha de local e data da sanção
FIM = re.compile(r"^(Brasília|Rio de Janeiro|Senado Federal|Câmara dos Deputados),?\s+(?:em\s+)?\d")
# linha só em maiúsculas (título de capítulo em mais de uma linha); pontilhado de texto alterado não conta
MAIUSCULAS = re.compile(r"^(?=.*[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{3})[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9 ,.;()–-]{6,}$")


def baixar(url):
    req = urllib.request.Request(url, headers={"Accept": "application/json, text/html", "User-Agent": "review-rai/leiseca (uso pessoal de estudo)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", errors="replace")


def texto_compilado(urn):
    meta = json.loads(baixar(f"{API}normas?urn={urn}&tipo_documento=maior-detalhe"))
    enc = meta.get("encoding") or []
    enc = [e for e in (enc if isinstance(enc, list) else [enc]) if isinstance(enc, (list, dict)) and isinstance(e, dict) and e.get("contentUrl")]
    atual = [e for e in enc if e.get("version") == "Current"]
    # sem compilação (lei nunca alterada, ou ainda não compilada): usa o texto original publicado no DOU e avisa na fonte
    escolhido, original = (atual[0], False) if atual else ((enc[0], True) if enc else (None, False))
    if not escolhido:
        raise SystemExit(f"{urn}: o normas.leg.br não traz texto para esta norma.")
    url = escolhido["contentUrl"].replace("/api/binario/", "/api/public/binario/")
    return baixar(url), meta.get("dateModified") or "", original


def paragrafos(pagina):
    corpo = pagina[pagina.lower().find("<body"):]
    out = []
    for p in re.findall(r"<p\b[^>]*>(.*?)</p>", corpo, flags=re.S | re.I):
        p = re.sub(r"<(s|strike|del)\b[^>]*>.*?</\1\s*>", " ", p, flags=re.S | re.I)
        p = re.sub(r"<br\s*/?>", " ", p, flags=re.I)
        p = re.sub(r"<[^>]+>", "", p)
        p = re.sub(r"\s+", " ", html.unescape(p).replace("\xa0", " ")).strip()
        if p:
            out.append(p)
    return out


def so_nota(resto):
    """Depois do rótulo só vem uma nota entre parênteses (ex.: dispositivo revogado ou acrescido e revogado)."""
    return re.fullmatch(r"\((?:[^()]|\([^()]*\))*\)\.?", resto.strip()) is not None


def converter(chave, pagina, atualizado, original=False):
    urn, lid, nome, curto, disc, *extra = LEIS[chave]
    linhas = paragrafos(pagina)
    i0 = next(k for k, l in enumerate(linhas) if ESTRUTURA.match(l) or ARTIGO.match(l))
    itens, art, pendente = [], None, None
    k = i0
    while k < len(linhas):
        l = linhas[k]
        if FIM.match(l):
            break
        if MAIUSCULAS.match(l) and not ESTRUTURA.match(l) and itens and "h" in itens[-1] and art is None:
            itens[-1]["h"] += " " + l               # continuação do título
        elif MAIUSCULAS.match(l) and not ESTRUTURA.match(l) and not ARTIGO.match(l) and (art is None or not re.match(ROTULO, l)):
            itens.append({"h": l})                  # título solto (ex.: "DISPOSIÇÕES FINAIS")
            art = None
        elif ESTRUTURA.match(l):
            titulo = l
            nxt = linhas[k + 1] if k + 1 < len(linhas) else ""
            if nxt and not ARTIGO.match(nxt) and not ESTRUTURA.match(nxt):
                titulo, k = f"{l} · {nxt}", k + 1
            itens.append({"h": titulo})
            art = None
        elif (m := ARTIGO.match(l)):
            num = m.group(1) + (f"-{m.group(2)}" if m.group(2) else "")
            resto = l[m.end():]
            texto = re.sub(r"^Art\.\s*(\d+)\s*[º°o]?", lambda x: f"Art. {x.group(1)}{'º' if int(x.group(1)) < 10 else ''}", l, count=1)
            if so_nota(resto) and re.search(r"revogad", resto, re.I):
                texto = f"Art. {num}{'º' if num.isdigit() and int(num) < 10 else ''}. (Revogado.)"
            art = {"a": num, "x": texto}
            itens.append(art)
        elif art is not None:
            m = re.match(ROTULO, l)
            if m and so_nota(l[m.end():]) and re.search(r"revogad", l[m.end():], re.I):
                k += 1
                continue                       # parágrafo, inciso ou alínea revogado
            art["x"] += "\n" + l
        k += 1
    arts = [x for x in itens if "a" in x]
    if len(arts) < 3:
        raise SystemExit(f"{lid}: só {len(arts)} artigos; confira o texto baixado.")
    return {
        "id": lid, "nome": nome, "curto": curto, "disc": disc, "completa": True,
        "fonte": (f"Texto original publicado no DOU, pelo normas.leg.br ({urn}; sem texto compilado na fonte: confira se houve alteração posterior; consultado em {date.today().strftime('%d/%m/%Y')})" if original else
                  f"Texto compilado vigente (Câmara dos Deputados) publicado no normas.leg.br ({urn}; atualizado em {atualizado or 's/d'}; consultado em {date.today().strftime('%d/%m/%Y')})"),
        "grupos": [{"nome": nome, "itens": itens}],
        **({"substitui": extra[0]} if extra else {}),
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    saida = Path(sys.argv[1])
    for chave in sys.argv[2:] or list(LEIS):
        pagina, atualizado, original = texto_compilado(LEIS[chave][0])
        lei = converter(chave, pagina, atualizado, original)
        (saida / f"{lei['id']}.json").write_text(json.dumps(lei, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        arts = [x for x in lei["grupos"][0]["itens"] if "a" in x]
        print(f"ok: {lei['id']}.json ({len(arts)} artigos, {sum('(Revogado.)' in a['x'] for a in arts)} revogados){' · TEXTO ORIGINAL (sem compilação)' if original else ''}")
