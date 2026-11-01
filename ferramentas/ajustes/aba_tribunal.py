"""Aba "Tribunal" (TJPB 2026) e leitor de Lei seca com os grifos do curso.

    python ferramentas/ajustes/aba_tribunal.py index.html app-src.txt     # site publicado (shell + código)
    python ferramentas/ajustes/aba_tribunal.py fonte.html                 # arquivo-fonte único
    python ferramentas/ajustes/aba_tribunal.py plano-tjpb-2026.html       # só atualiza o plano na página offline

Insere, sem duplicar:
- o botão "Tribunal" no menu e o estilo da aba (aba_tribunal/aba.css), no arquivo que tem o menu;
- o plano (TJPB_PLANO, de conteudo/dados/plano-tjpb-2026.json), a tela (aba_tribunal/aba.js), a rota e o atalho
  em Hoje, no arquivo que tem o código do app;
- no leitor de Lei seca: grifos por cor (campo g), questões por artigo (n), concursos recentes (rec),
  jurisprudência correlata (j), avisos do STF (stf), filtros "muito cobrado" e "caiu na FGV" e assertivas sem gabarito.
Rodar de novo troca o plano, a tela e o estilo pela versão atual. Depois, suba CACHE/APP_CACHE no sw.js.
"""
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
PASTA = Path(__file__).resolve().parent / "aba_tribunal"
DADOS = RAIZ / "ferramentas" / "conteudo" / "dados" / "plano-tjpb-2026.json"

NAV_BTN = ('\n      <button role="tab" data-tab="tribunal" aria-selected="false" id="tab-tribunal">'
           '<svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" '
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18"/><path d="M5 21v-9M9.7 21v-9M14.3 21v-9M19 21v-9"/>'
           '<path d="M2.5 9.5 12 4l9.5 5.5z"/></svg><span>Tribunal</span></button>')
CSS_INI, CSS_FIM = "\n/* ---- aba Tribunal (TJPB) ---- */", "/* ---- fim da aba Tribunal ---- */"
JS_INI, JS_FIM = "// ===================== aba Tribunal", "// ===================== fim da aba Tribunal ====================="
TILE = '    tile({ tab: "tribunal", i: "🏛️", t: "Tribunal · TJPB", d: "Plano de 12 semanas com o conteúdo do app em cada bloco" }),\n'

# leitor de Lei seca: (trecho atual, trecho novo, marca que indica que já foi aplicado)
LEISECA = [
    ('function lsCardIds(dip) {',
     '''const LS_GRIFO = { v: "pegadinha", V: "pegadinha (a mais cobrada)", a: "ponto cobrado", A: "ponto cobrado (o mais cobrado)", d: "caiu dos dois jeitos", m: "cobrado na literalidade", b: "destaque" };
// texto com grifos do curso: g = [[trecho, classe], ...], mesmas regras de formatação de lsFmt
function lsFmtG(segs) {
  const linhas = [[]];
  for (const [t, c] of segs) String(t).split("\\n").forEach((parte, i) => { if (i) linhas.push([]); if (parte) linhas[linhas.length - 1].push([parte, c]); });
  return linhas.map((l, i) => {
    const sub = i && !/^\\s*(§|Parágrafo)/.test(l.map(x => x[0]).join(""));
    const h = l.map(([t, c]) => c && LS_GRIFO[c] ? `<mark class="g${c}" title="${LS_GRIFO[c]}">${esc(t)}</mark>` : esc(t)).join("")
      .replace(/\\((Reda[çc][ãa]o dad|Inclu[íi]d|Vide|Revogad|Vig[êe]ncia|Acrescid|Renumerad)[^)]*\\)/g, m => `<span class="ls-red">${m}</span>`)
      .replace(/^(Art\\.\\s*[\\dº°A-Z.\\-]+|§\\s*[\\dº°]+[º°]?(-[A-Z])?\\.?|Parágrafo único\\.?)/, "<b>$1</b>");
    return `<p class="${sub ? "sub2" : ""}">${h}</p>`;
  }).join("");
}
function lsFgv(b) { return /\\bFGV\\b/.test(b.rec || "") || b.qs.some(x => /^FGV\\b/.test(x.b || "")); }
function lsExtras(b) {
  const stf = (b.stf || []).map(s => `<div class="ls-stf"><b>${esc(s.t)}</b> ${esc(s.x)}</div>`).join("");
  const rec = b.rec ? `<p class="ls-rec">Recentes: ${esc(b.rec)}</p>` : "";
  const j = (b.j || []).length ? `<details class="ls-j"><summary>⚖️ Jurisprudência correlata (${b.j.length})</summary>${b.j.map(x => `<div class="ls-jx"><p>${x.t ? `<span class="badge">${esc(x.t)}</span> ` : ""}<b>${esc(x.tit)}</b> ${esc(x.x)}</p>${x.ref ? `<small>${esc(x.ref)}</small>` : ""}</div>`).join("")}</details>` : "";
  return stf + rec + j;
}
function lsCardIds(dip) {''', "function lsFmtG(segs"),
    ('const casa = b => (!S.lsCaiu || b.qs.length) && (',
     'const casa = b => (!S.lsCaiu || b.qs.length) && (!S.lsRaio || (b.n || 0) >= 6) && (!S.lsFgv || lsFgv(b)) && (',
     "!S.lsRaio ||"),
    ('const filtrando = q || S.lsCaiu;', 'const filtrando = q || S.lsCaiu || S.lsRaio || S.lsFgv;\n  const temN = arts.some(b => b.n), temG = arts.some(b => b.g);',
     "const temN = arts.some"),
    ('${b.qs.length ? `<span class="badge caiu2">caiu ${b.qs.length}×</span>` : ""}</span>',
     '${b.qs.length ? `<span class="badge caiu2">caiu ${b.qs.length}×</span>` : ""}${b.n ? `<span class="badge ls-nq${b.n >= 6 ? " raio" : ""}" title="questões sobre o artigo, de 2022 a 2026">${b.n >= 6 ? "⚡ " : ""}${plural(b.n, "questão", "questões")}</span>` : ""}</span>',
     'class="badge ls-nq'),
    ('<div class="ls-x">${lsFmt(b.x)}</div>', '<div class="ls-x">${b.g ? lsFmtG(b.g) : lsFmt(b.x)}</div>${lsExtras(b)}', "b.g ? lsFmtG(b.g"),
    ('<details><summary>Ver gabarito</summary><p><b>${x.g}.</b> ${esc(x.c || "")}</p></details></div>`).join("")}</details>` : ""}</article>`;',
     '${x.g ? `<details><summary>Ver gabarito</summary><p><b>${x.g}.</b> ${esc(x.c || "")}</p></details>` : `<p class="ls-ok">Assertiva considerada correta pela banca.</p>`}</div>`).join("")}</details>` : ""}</article>`;',
     'class="ls-ok"'),
    ('> só o que já caiu</label></div>',
     '> só o que já caiu</label>${temN ? `<label class="ls-lido" style="font-size:.9rem"><input type="checkbox" id="lsRaio" ${S.lsRaio ? "checked" : ""}> muito cobrado (6+)</label><label class="ls-lido" style="font-size:.9rem"><input type="checkbox" id="lsFgv" ${S.lsFgv ? "checked" : ""}> caiu na FGV</label>` : ""}</div>${temG ? `<p class="ls-legenda"><mark class="gv">pegadinha</mark><mark class="ga">ponto cobrado</mark><mark class="gd">caiu dos dois jeitos</mark><mark class="gm">literal</mark></p>` : ""}',
     'id="lsRaio"'),
    ('$("#lsC").onchange = e => { S.lsCaiu = e.target.checked; renderLeiSeca(); };',
     '$("#lsC").onchange = e => { S.lsCaiu = e.target.checked; renderLeiSeca(); };\n  $("#lsRaio")?.addEventListener("change", e => { S.lsRaio = e.target.checked; renderLeiSeca(); });\n  $("#lsFgv")?.addEventListener("change", e => { S.lsFgv = e.target.checked; renderLeiSeca(); });',
     '$("#lsRaio")?.addEventListener'),
    ('${esc(dip.fonte)}. Não é a lei completa: confira a redação vigente no Planalto.',
     '${esc(dip.fonte)}. ${dip.completa ? "Confira" : "Não é a lei completa: confira"} a redação vigente no Planalto.',
     'dip.completa ?'),
    # marcação automática (ferramentas/ci/grifos_auto.mjs) nas leis sem os grifos do curso: legenda e títulos próprios
    ('function lsFmtG(segs) {',
     'const LS_AUTO = { v: "prazo, número ou quórum", a: "exceção, vedação ou restrição", d: "dever, competência ou nulidade", m: "definição legal" };\nfunction lsFmtG(segs, mapa = LS_GRIFO) {',
     'mapa = LS_GRIFO'),
    ('c && LS_GRIFO[c] ? `<mark class="g${c}" title="${LS_GRIFO[c]}">',
     'c && mapa[c] ? `<mark class="g${c}" title="${mapa[c]}">',
     'title="${mapa[c]}"'),
    ('<div class="ls-x">${b.g ? lsFmtG(b.g) : lsFmt(b.x)}</div>',
     '<div class="ls-x">${b.g ? lsFmtG(b.g, dip.grifos === "auto" ? LS_AUTO : LS_GRIFO) : lsFmt(b.x)}</div>',
     'dip.grifos === "auto" ? LS_AUTO'),
    ('${temG ? `<p class="ls-legenda"><mark class="gv">pegadinha</mark><mark class="ga">ponto cobrado</mark><mark class="gd">caiu dos dois jeitos</mark><mark class="gm">literal</mark></p>` : ""}',
     '${temG ? (dip.grifos === "auto" ? `<p class="ls-legenda"><mark class="gv">prazo, número, quórum</mark><mark class="ga">exceção, vedação</mark><mark class="gd">dever, competência, nulidade</mark><mark class="gm">definição legal</mark><span>marcação automática do app</span></p>` : `<p class="ls-legenda"><mark class="gv">pegadinha</mark><mark class="ga">ponto cobrado</mark><mark class="gd">caiu dos dois jeitos</mark><mark class="gm">literal</mark></p>`) : ""}',
     'marcação automática do app'),
]


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
    if 'id="tab-tribunal"' not in txt:
        i = txt.index('id="tab-leiseca"')
        j = txt.index("</button>", i) + len("</button>")
        txt = txt[:j] + NAV_BTN + txt[j:]
        n += 1
    css = (PASTA / "aba.css").read_text(encoding="utf-8").strip("\n")
    i = txt.find(CSS_INI.strip())
    if i >= 0:
        j = txt.index(CSS_FIM, i) + len(CSS_FIM)
        if txt[i:j] != css:
            txt, n = txt[:i] + css + txt[j:], n + 1
    else:
        k = txt.index("</style>", txt.index(".tabs {"))       # mesmo bloco de estilos da aba Defensoria
        txt, n = txt[:k] + css + "\n" + txt[k:], n + 1
    return txt, n


def aplica_codigo(txt):
    n = 0
    plano = json.loads(DADOS.read_text(encoding="utf-8"))
    dados = "const TJPB_PLANO = " + json.dumps(plano, ensure_ascii=False, separators=(",", ":")) + ";"
    js = dados + "\n" + (PASTA / "aba.js").read_text(encoding="utf-8")
    if "const TJPB_PLANO = " in txt and JS_INI not in txt:
        sys.exit("TJPB_PLANO existe sem a tela da aba; confira o arquivo")
    ini = "const TJPB_PLANO = " if "const TJPB_PLANO = " in txt else JS_INI
    txt, x = bloco(txt, ini, JS_FIM, js, "function renderNov() {"); n += x
    txt = txt.replace("defensoria: renderDef, tribunal: renderTribunal,", "defensoria: renderDef,")   # versão anterior desta rota
    txt, x = trocar(txt, "defensoria: renderDef,", 'defensoria: renderDef, tribunal: typeof renderTribunal === "function" ? renderTribunal : () => {},', "tribunal: typeof renderTribunal"); n += x
    txt, x = trocar(txt, '    tile({ tab: "leiseca", i: "⚖️", t: "Lei seca"', TILE + '    tile({ tab: "leiseca", i: "⚖️", t: "Lei seca"', 'tab: "tribunal"'); n += x
    for antes, depois, marca in LEISECA:
        txt, x = trocar(txt, antes, depois, marca); n += x
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
        elif "const TJPB_PLANO = " in txt:          # página offline plano-tjpb-2026.html: só troca os dados
            plano = json.loads(DADOS.read_text(encoding="utf-8"))
            novo = "const TJPB_PLANO = " + json.dumps(plano, ensure_ascii=False, separators=(",", ":")) + ";"
            i = txt.index("const TJPB_PLANO = "); j = txt.index(";\n", i) + 1
            if txt[i:j] != novo:
                txt, total = txt[:i] + novo + txt[j:], total + 1
        if total:
            caminho.write_text(txt, encoding="utf-8")
        print(f"{caminho.name}: {total} alteração(ões)")


if __name__ == "__main__":
    main(sys.argv[1:])
