"""Aba "Teses STJ" (Jurisprudência em Teses do STJ).

    python ferramentas/ajustes/aba_teses_stj.py index.html app-src.txt     # site publicado (shell + código)

Insere, sem duplicar:
- o botão "Teses STJ" no menu e o estilo da aba (aba_teses_stj/aba.css), no arquivo que tem o menu;
- a tela (aba_teses_stj/aba.js), a rota e o atalho em Hoje, no arquivo que tem o código do app.
Os dados ficam em arquivos/jurisprudencia-em-teses/ (gerados por ferramentas/conteudo/jurisprudencia_em_teses/coletar.py) e são
carregados sob demanda pela tela. Rodar de novo troca a tela e o estilo pela versão atual.
Depois, suba CACHE/APP_CACHE no sw.js.
"""
import sys
from pathlib import Path

PASTA = Path(__file__).resolve().parent / "aba_teses_stj"

NAV_BTN = ('\n      <button role="tab" data-tab="teses" aria-selected="false" id="tab-teses">'
           '<svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" '
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h13a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2z"/>'
           '<path d="M19 9h2v8a2 2 0 0 1-2 2"/><path d="M8 9h7M8 13h7M8 16h4"/></svg><span>Teses STJ</span></button>')
CSS_INI, CSS_FIM = "/* ---- aba Teses STJ (Jurisprudência em Teses) ---- */", "/* ---- fim da aba Teses STJ ---- */"
JS_INI, JS_FIM = "// ===================== aba Teses STJ", "// ===================== fim da aba Teses STJ ====================="
TILE = '    tile({ tab: "teses", i: "📚", t: "Teses STJ", d: "Jurisprudência em Teses, por edição, com os julgados" }),\n'


def trocar(txt, antes, depois, marca):
    if marca in txt:
        return txt, 0
    if txt.count(antes) != 1:
        sys.exit(f"trecho não encontrado (ou repetido), nada foi gravado: {antes[:90]!r}")
    return txt.replace(antes, depois), 1


def bloco(txt, ini, fim, novo, antes_de):
    """Troca o bloco entre ini e fim pelo novo; sem bloco, insere antes de 'antes_de'."""
    i = txt.find(ini)
    if i >= 0:
        j = txt.index(fim, i) + len(fim)
        return (txt, 0) if txt[i:j] == novo.strip("\n") else (txt[:i] + novo.strip("\n") + txt[j:], 1)
    k = txt.index(antes_de)
    return txt[:k] + novo.strip("\n") + "\n" + txt[k:], 1


def aplica_menu(txt):
    n = 0
    if 'id="tab-teses"' not in txt:
        i = txt.index('id="tab-informativos"')
        j = txt.index("</button>", i) + len("</button>")
        txt = txt[:j] + NAV_BTN + txt[j:]
        n += 1
    css = (PASTA / "aba.css").read_text(encoding="utf-8").strip("\n")
    i = txt.find(CSS_INI)
    if i >= 0:
        j = txt.index(CSS_FIM, i) + len(CSS_FIM)
        if txt[i:j] != css:
            txt, n = txt[:i] + css + txt[j:], n + 1
    else:
        k = txt.index("</style>", txt.index(".tabs {"))
        txt, n = txt[:k] + css + "\n" + txt[k:], n + 1
    return txt, n


def aplica_codigo(txt):
    n = 0
    js = (PASTA / "aba.js").read_text(encoding="utf-8")
    txt, x = bloco(txt, JS_INI, JS_FIM, js, "function renderNov() {"); n += x
    txt, x = trocar(txt, "defensoria: renderDef,",
                    'defensoria: renderDef, teses: typeof renderTesesSTJ === "function" ? renderTesesSTJ : () => {},',
                    "teses: typeof renderTesesSTJ"); n += x
    txt, x = trocar(txt, '    tile({ tab: "leiseca", i: "⚖️", t: "Lei seca"', TILE + '    tile({ tab: "leiseca", i: "⚖️", t: "Lei seca"', 'tab: "teses"'); n += x
    return txt, n


def main(args):
    if not args or len(args) > 3:
        sys.exit(__doc__)
    for caminho in map(Path, args):
        txt = caminho.read_text(encoding="utf-8")
        total = 0
        if 'id="tab-leiseca"' in txt:
            txt, n = aplica_menu(txt); total += n
        if "function renderNov() {" in txt:
            txt, n = aplica_codigo(txt); total += n
        if total:
            caminho.write_text(txt, encoding="utf-8")
        print(f"{caminho.name}: {total} alteração(ões)")


if __name__ == "__main__":
    main(sys.argv[1:])
