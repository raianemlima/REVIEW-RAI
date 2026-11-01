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
# chave -> (urn, id, nome, curto, disciplina "@termo" resolvida no baralho pelo nome)
LEIS = {
    "lgpd": ("urn:lex:br:federal:lei:2018-08-14;13709", "lgpd", "Lei nº 13.709/2018 · Lei Geral de Proteção de Dados Pessoais (LGPD)", "LGPD", "@administrativo"),
    "lindb": ("urn:lex:br:federal:decreto.lei:1942-09-04;4657", "lindb", "Decreto-Lei nº 4.657/1942 · Lei de Introdução às Normas do Direito Brasileiro (LINDB)", "LINDB", "@civil"),
    "l9784": ("urn:lex:br:federal:lei:1999-01-29;9784", "l9784", "Lei nº 9.784/1999 · Processo administrativo federal", "Lei 9.784", "@administrativo"),
    "l12846": ("urn:lex:br:federal:lei:2013-08-01;12846", "l12846", "Lei nº 12.846/2013 · Lei Anticorrupção (responsabilização de pessoas jurídicas)", "Lei 12.846", "@administrativo"),
}
ESTRUTURA = re.compile(r"^(LIVRO|PARTE|TÍTULO|CAPÍTULO|SEÇÃO|Seção|SUBSEÇÃO|Subseção)\b")
ARTIGO = re.compile(r"^Art\.\s*(\d+)\s*[º°o]?\s*(?:-\s*([A-Z]))?\s*\.?\s+")
ROTULO = r"(?:§\s*\d+º?(?:-[A-Z])?|Parágrafo único\.?|[IVXLC]+(?:-[A-Z])?\s*[-–]|[a-z]\)|\d+\))"
# fim do texto: local e data da sanção ou nome do signatário em maiúsculas (linha de pontilhado não conta)
FIM = re.compile(r"^(Brasília,? \d|Rio de Janeiro,? \d|(?=.*[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{3})[A-ZÁÉÍÓÚÂÊÔÃÕÇ .]{6,}$)")


def baixar(url):
    req = urllib.request.Request(url, headers={"Accept": "application/json, text/html", "User-Agent": "review-rai/leiseca (uso pessoal de estudo)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", errors="replace")


def texto_compilado(urn):
    meta = json.loads(baixar(f"{API}normas?urn={urn}&tipo_documento=maior-detalhe"))
    atual = [e for e in meta.get("encoding", []) if e.get("version") == "Current" and e.get("contentUrl")]
    if not atual:
        raise SystemExit(f"{urn}: o normas.leg.br não traz texto compilado (Current) para esta norma.")
    url = atual[0]["contentUrl"].replace("/api/binario/", "/api/public/binario/")
    return baixar(url), meta.get("dateModified") or ""


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


def converter(chave, pagina, atualizado):
    urn, lid, nome, curto, disc = LEIS[chave]
    linhas = paragrafos(pagina)
    i0 = next(k for k, l in enumerate(linhas) if ESTRUTURA.match(l) or ARTIGO.match(l))
    itens, art, pendente = [], None, None
    k = i0
    while k < len(linhas):
        l = linhas[k]
        if art and FIM.match(l) and not ESTRUTURA.match(l):
            break
        if ESTRUTURA.match(l):
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
    if len(arts) < 5:
        raise SystemExit(f"{lid}: só {len(arts)} artigos; confira o texto baixado.")
    return {
        "id": lid, "nome": nome, "curto": curto, "disc": disc, "completa": True,
        "fonte": f"Texto compilado vigente (Câmara dos Deputados) publicado no normas.leg.br ({urn}; atualizado em {atualizado or 's/d'}; consultado em {date.today().strftime('%d/%m/%Y')})",
        "grupos": [{"nome": nome, "itens": itens}],
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    saida = Path(sys.argv[1])
    for chave in sys.argv[2:] or list(LEIS):
        pagina, atualizado = texto_compilado(LEIS[chave][0])
        lei = converter(chave, pagina, atualizado)
        (saida / f"{lei['id']}.json").write_text(json.dumps(lei, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        arts = [x for x in lei["grupos"][0]["itens"] if "a" in x]
        print(f"ok: {lei['id']}.json ({len(arts)} artigos, {sum('(Revogado.)' in a['x'] for a in arts)} revogados)")
