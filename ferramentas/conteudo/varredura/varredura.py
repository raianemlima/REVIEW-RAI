"""Varredura mensal: o que saiu de novo e ainda não está no app (leis, emendas, leis complementares e informativos).

    python ferramentas/conteudo/varredura/varredura.py [--saida PASTA] [--hoje AAAA-MM-DD]

Sem senha, sem chave e só com a biblioteca padrão. Lê:
- app-src.txt (NOV_PUBLICO): o que já está em Novidades;
- ferramentas/conteudo/dados/varredura-estado.json: a partir de que número olhar e o que foi deixado de lado de propósito;
- arquivos/informativos/indice.json: a última edição de cada informativo que o app tem.
Procura no Planalto (texto oficial e público) as normas com número acima do último conferido e, no STF e no STJ, as
edições de informativo seguintes às do app. Escreve em PASTA (padrão: varredura/):
- varredura-AAAA-MM.md: o relatório, para ler (vira a descrição de uma issue no GitHub);
- candidatos-AAAA-MM.json: um esboço de item de Novidades por norma, para quem for redigir o lote.
Se o site não responder, o relatório diz isso, em vez de fingir que não há novidade.
"""
import html as htmllib
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppData/varredura-review-dpe"}
MESES = {m: i + 1 for i, m in enumerate("janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro".split())}
TIPOS = {
    "lei": ("Lei", "https://www.planalto.gov.br/ccivil_03/_ato{periodo}/{ano}/lei/l{num}.htm"),
    "lcp": ("Lei Complementar", "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp{num}.htm"),
    "emc": ("Emenda Constitucional", "https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc{num}.htm"),
}
ALTA = re.compile(r"c[oó]digo penal|processo penal|execu[cç][aã]o penal|maria da penha|viol[eê]ncia|crime|hediondo|medida protetiva|criança|adolescente|"
                  r"estatuto|consumidor|defensoria|constitui[cç][aã]o|c[oó]digo de processo civil|c[oó]digo civil|alimentos|tribut|previd[eê]n|"
                  r"servidor|licita[cç][aã]o|improbidade|sa[uú]de|idoso|pessoa com defici[eê]ncia|racial|direitos humanos|justi[cç]a|tribunal|"
                  r"ju[ií]zo|processo|prisão|prisao|pena|lgpd|prote[cç][aã]o de dados", re.I)
BAIXA = re.compile(r"^(denomina|d[aá] (o )?nome|confere o t[ií]tulo|inscreve|institui o (dia|m[eê]s|a semana|o ano)|declara .{0,80}(patrim[oô]nio|capital nacional)|"
                   r"homenageia|reconhece .{0,60}(capital nacional|manifesta[cç][aã]o da cultura)|altera a lei n[º°o]? ?[\d.]+,? de .{0,40} para (denominar|dar o nome))", re.I)


def limpa(t):
    return re.sub(r"\s+", " ", (t or "").replace("\xa0", " ")).strip()


def texto_da_pagina(bruto):
    """HTML do Planalto -> texto corrido, sem o que está tachado (revogado)."""
    try:
        t = bruto.decode("utf-8")
    except UnicodeDecodeError:
        t = bruto.decode("cp1252", errors="replace")
    t = re.sub(r"(?is)<(script|style).*?</\1>", "", t)
    t = re.sub(r"(?is)<(strike|del|s)(?=[\s>])[^>]*>.*?</\1>", "", t)
    t = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</tr>", "\n", t)
    return htmllib.unescape(re.sub(r"<[^>]+>", "", t))


CABECALHO = re.compile(r"(LEI COMPLEMENTAR|LEI|EMENDA CONSTITUCIONAL)\s+N[º°o.]*\s*([\d.]+)\s*,\s*DE\s+(\d{1,2})[º°o]?\s+DE\s+([A-Za-zçÇãÃ]+)\s+DE\s+(\d{4})", re.I)
FIM_EMENTA = re.compile(r"\b(O\s+PRESIDENTE|O\s+VICE|As\s+Mesas|Faço\s+saber|O\s+CONGRESSO|Faço\s+saber)", re.I)


def extrair(bruto):
    """(tipo, numero, ano, data_iso, ementa) de uma página do Planalto; None se não for uma norma."""
    t = limpa(texto_da_pagina(bruto))
    m = CABECALHO.search(t)
    if not m:
        return None
    mes = MESES.get(m.group(4).lower())
    if not mes:
        return None
    depois = t[m.end():]
    f = FIM_EMENTA.search(depois)
    ementa = limpa(re.sub(r"(Mensagem de veto|Vig[êe]ncia|Produção de efeitos|Regulamento|Texto compilado|Promulgação partes vetadas|Vetado)\s*", "", depois[:f.start() if f else 600]))
    tipo = {"LEI COMPLEMENTAR": "lcp", "LEI": "lei", "EMENDA CONSTITUCIONAL": "emc"}[m.group(1).upper()]
    return tipo, int(m.group(2).replace(".", "")), int(m.group(5)), f"{int(m.group(5)):04d}-{mes:02d}-{int(m.group(3)):02d}", ementa[:700]


def relevancia(tipo, ementa):
    if tipo in ("emc", "lcp"):
        return "alta"
    if BAIXA.search(ementa):
        return "baixa"
    return "alta" if ALTA.search(ementa) else "media"


def rotulo(tipo, num, ano):
    nome = TIPOS[tipo][0]
    return f"{nome} {num:,}".replace(",", ".") + f"/{ano}" if tipo == "lei" else f"{nome} {num}/{ano}"


def ja_cobertas(app_src):
    """Normas que já têm item em Novidades (campo "lei" do NOV_PUBLICO)."""
    out = set()
    for tipo, num, ano in re.findall(r'"lei": "(Lei Complementar|Lei|Emenda Constitucional) n?[º°o.]? ?([\d.]+)/(\d{4})"', app_src):
        out.add(({"Lei": "lei", "Lei Complementar": "lcp", "Emenda Constitucional": "emc"}[tipo], int(num.replace(".", "")), int(ano)))
    return out


def baixar(url, tentativas=2, espera=2.0):
    """(status, bytes): status 200/404/... ou None se não houve conexão."""
    ultimo = None
    for i in range(tentativas):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            return e.code, b""
        except Exception as e:  # sem rede, tempo esgotado, certificado...
            ultimo = e
            time.sleep(espera * (i + 1))
    return None, str(ultimo).encode()


def periodo_do_ano(ano):
    return "2023-2026" if ano <= 2026 else "2027-2030"


def _tentar(tipo, num, anos, baixar):
    """Primeira página que existe e é mesmo uma norma: (status, extraído, url). A lei do ano novo mora em outra pasta do Planalto."""
    st = 404
    for ano in anos:
        url = TIPOS[tipo][1].format(num=num, ano=ano, periodo=periodo_do_ano(ano))
        st, corpo = baixar(url)
        if st is None:
            return None, None, url
        if st == 200:
            r = extrair(corpo)
            if r:
                return 200, r, url
    return st, None, url


def varrer_normas(estado, cobertas, hoje, baixar=baixar, max_falhas=6, teto=120):
    """Confere as pendentes e anda a partir do número seguinte ao último conferido, por tipo, até `max_falhas` números seguidos que não existem."""
    achadas, avisos, vistas = [], [], set()

    def registrar(tipo, r, url, deixadas):
        t, n, a, data, ementa = r
        if (t, n, a) in cobertas or (t, n, a) in vistas or n in deixadas:
            return a
        vistas.add((t, n, a))
        achadas.append({"tipo": t, "num": n, "ano": a, "norma": rotulo(t, n, a), "data": data, "ementa": ementa, "relevancia": relevancia(t, ementa), "url": url})
        return a

    for tipo in ("lei", "lcp", "emc"):
        e = estado.get(tipo, {})
        ano, deixadas, sem_rede = e.get("ano", hoje.year), set(e.get("deixadas", [])), 0
        anos = lambda a: [a] + ([a + 1] if tipo == "lei" and hoje.year > a else [])
        for num in e.get("pendentes", []):
            st, r, url = _tentar(tipo, num, anos(ano), baixar)
            if st is None:
                sem_rede += 1
                if sem_rede >= 2:
                    avisos.append(f"Sem acesso ao Planalto ao conferir {TIPOS[tipo][0]} pendente (parei no nº {num}).")
                    break
            elif r:
                registrar(tipo, r, url, deixadas)
        num, falhas, visitados = e.get("desde", 1), 0, 0
        while falhas < max_falhas and visitados < teto and sem_rede < 2:
            st, r, url = _tentar(tipo, num, anos(ano), baixar)
            visitados += 1
            if st is None:
                sem_rede += 1
                if sem_rede >= 2:
                    avisos.append(f"Sem acesso ao Planalto ao procurar {TIPOS[tipo][0]} (parei no nº {num}).")
                continue
            if r is None:
                falhas += 1
                num += 1
                continue
            falhas = 0
            ano = max(ano, registrar(tipo, r, url, deixadas))
            num += 1
    return achadas, avisos


def varrer_informativos(indice, baixar=baixar, olhar=6):
    """Edições de informativo posteriores às do app. Devolve (lista, avisos)."""
    novas, avisos = [], []
    ultimo = {}
    for i in indice:
        ultimo[i["tribunal"]] = max(ultimo.get(i["tribunal"], 0), i["ate"])
    for trib, n0 in sorted(ultimo.items()):
        sem_rede = 0
        for n in range(n0 + 1, n0 + 1 + olhar):
            if trib == "STF":
                url = f"https://www.stf.jus.br/arquivo/informativo/documento/informativo{n}.htm"
            else:
                url = f"https://processo.stj.jus.br/jurisprudencia/externo/informativo/?acao=pesquisarumaedicao&livre={n:04d}"
            st, corpo = baixar(url)
            if st is None:
                sem_rede += 1
                if sem_rede >= 2:
                    avisos.append(f"Sem acesso ao {trib} ao procurar informativos (parei no nº {n}).")
                    break
                continue
            txt = corpo.decode("latin-1", errors="replace")
            existe = st == 200 and (len(corpo) > 5000 if trib == "STF" else bool(re.search(r"Informativo\s*n[ºo°]\.?\s*%d\b" % n, txt)))
            if existe:
                novas.append({"tribunal": trib, "numero": n, "url": url})
    return novas, avisos


def esboco(a, tag):
    """Item de Novidades para o redator completar (resumo, o que mudou, DPE, prova e treino ficam por fazer)."""
    pref = {"lei": "lei", "lcp": "lc", "emc": "ec"}[a["tipo"]]
    return {"id": f"nv-{tag}-{pref}{a['num']}", "tipo": "lei", "lei": a["norma"], "pub": a["data"], "titulo": a["ementa"][:160],
            "resumo": "", "temas": [], "papeis": [], "mudou": [], "dpe": [], "prova": [], "treino": [], "lacunas": [], "fonte": a["url"],
            "observacao": "pub = data da norma; confira a data do DOU. Redigir a partir do texto oficial."}


def relatorio(hoje, achadas, informativos, avisos, estado):
    L = [f"# Varredura de {hoje:%m/%Y}", "",
         "O que saiu de novo e ainda não está no app. Texto oficial e público (Planalto, STF e STJ). Nada daqui entra no app sozinho: cada norma precisa ser lida e resumida antes.", ""]
    for av in avisos:
        L.append(f"> **Atenção:** {av} Tente de novo mais tarde (Actions › Varredura mensal › Run workflow).")
    if avisos:
        L.append("")
    grupos = {k: [a for a in achadas if a["relevancia"] == k] for k in ("alta", "media", "baixa")}
    L.append(f"## Normas novas: {len(achadas)}")
    L.append("")
    for k, titulo in (("alta", "Prioridade alta (Constituição, penal, família, infância, consumidor, Defensoria, processo)"), ("media", "Prioridade média")):
        if grupos[k]:
            L += [f"### {titulo}", ""]
            for a in sorted(grupos[k], key=lambda x: (x["data"], x["num"]), reverse=True):
                L.append(f"- [ ] **[{a['norma']}]({a['url']})** ({a['data']}): {a['ementa']}")
            L.append("")
    if grupos["baixa"]:
        L += ["<details><summary>Provável homenagem ou data comemorativa (%d)</summary>" % len(grupos["baixa"]), ""]
        for a in sorted(grupos["baixa"], key=lambda x: x["num"], reverse=True):
            L.append(f"- [{a['norma']}]({a['url']}): {a['ementa'][:200]}")
        L += ["", "</details>", ""]
    if not achadas and not avisos:
        L += ["Nenhuma norma nova acima do último número conferido.", ""]
    L.append(f"## Informativos novos: {len(informativos)}")
    L.append("")
    for i in informativos:
        L.append(f"- [ ] [{i['tribunal']} nº {i['numero']}]({i['url']})")
    if not informativos and not avisos:
        L.append("Nenhuma edição nova depois das que o app já tem.")
    L += ["", "## Como virar item do app", "",
          "1. Ler o texto oficial de cada norma marcada e redigir o item no formato de `ferramentas/conteudo/dados/novidades-2026-11-0*.json` (resumo, o que mudou, DPE, prova, treino Certo/Errado e lacunas).",
          "2. `python ferramentas/ajustes/novidades_publicas.py app-src.txt <json>` e `npm test`.",
          "3. Informativos: `python ferramentas/conteudo/informativos/coletar.py` (ver `docs/INFORMATIVOS.md`).",
          "4. Para deixar uma norma de lado de propósito, acrescente o número em `deixadas` no tipo certo de `ferramentas/conteudo/dados/varredura-estado.json`.",
          "5. Depois do lote, suba `desde` no estado para o último número conferido."]
    return "\n".join(L) + "\n"


def main():
    a = sys.argv[1:]
    saida = Path(a[a.index("--saida") + 1]) if "--saida" in a else RAIZ / "varredura"
    hoje = date.fromisoformat(a[a.index("--hoje") + 1]) if "--hoje" in a else date.today()
    estado = json.loads((RAIZ / "ferramentas/conteudo/dados/varredura-estado.json").read_text(encoding="utf-8"))
    app_src = (RAIZ / "app-src.txt").read_text(encoding="utf-8")
    indice = json.loads((RAIZ / "arquivos/informativos/indice.json").read_text(encoding="utf-8"))
    achadas, avisos = varrer_normas(estado, ja_cobertas(app_src), hoje)
    infos, av2 = varrer_informativos(indice)
    avisos += av2
    saida.mkdir(parents=True, exist_ok=True)
    tag = f"{hoje:%Y-%m}"
    (saida / f"varredura-{tag}.md").write_text(relatorio(hoje, achadas, infos, avisos, estado), encoding="utf-8")
    (saida / f"candidatos-{tag}.json").write_text(json.dumps([esboco(x, tag) for x in achadas if x["relevancia"] != "baixa"], ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(achadas)} normas, {len(infos)} informativos, {len(avisos)} aviso(s) -> {saida}")
    return 1 if avisos and not achadas and not infos else 0


if __name__ == "__main__":
    sys.exit(main())
