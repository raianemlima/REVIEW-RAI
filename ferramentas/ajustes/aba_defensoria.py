"""Aba "Defensoria" (verde, com a cara da DPE): súmulas e temas que mais interessam à Defensoria.

    python ferramentas/ajustes/aba_defensoria.py fonte.html                 # só o código da aba
    python ferramentas/ajustes/aba_defensoria.py fonte.html defensoria.json # código + conteúdo (DECK.dpe)
    python ferramentas/ajustes/aba_defensoria.py index.html defensoria.json --publico
                                    # conteúdo embutido no código, sem baralho cifrado nem senha
                                    # (use só para textos públicos: súmulas e teses)

Com DECK.dpe o conteúdo fica cifrado e a aba só aparece depois do build com a senha; com --publico ele vai no código.
Sem conteúdo a aba fica escondida. Rodar de novo não duplica nada.
"""
import json, re, sys
from pathlib import Path

NAV_BTN = ('\n      <button role="tab" data-tab="defensoria" aria-selected="false" id="tab-defensoria" hidden>'
           '<svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" '
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/>'
           '<path d="M8.5 12l2.5 2.5 4.5-5"/></svg><span>Defensoria</span></button>')

CSS = """
/* ---- aba Defensoria ---- */
.dpe-hero { position: relative; overflow: hidden; border-radius: 22px; padding: 22px 20px 20px; margin: 16px 0 14px; color: #f1fbf6;
  background: radial-gradient(120% 140% at 100% 0%, #2fa37a 0%, transparent 55%), linear-gradient(135deg, #0f4a3a 0%, #155e4a 55%, #1b7a5c 100%); }
.dpe-hero::after { content: ""; position: absolute; right: -40px; bottom: -60px; width: 200px; height: 200px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,.14), transparent 70%); pointer-events: none; }
.dpe-kicker { font: 600 .7rem var(--f-ui); letter-spacing: .14em; text-transform: uppercase; opacity: .8; margin: 0; }
.dpe-hero h2 { color: #fff; margin: 6px 0 6px; font-size: 1.7rem; }
.dpe-hero p { margin: 0; opacity: .9; max-width: 34em; }
.dpe-stats { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
.dpe-stat { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18); border-radius: 14px; padding: 8px 12px; min-width: 84px; }
.dpe-stat b { display: block; font: 600 1.25rem var(--f-ui); color: #fff; }
.dpe-stat span { font-size: .75rem; opacity: .85; }
.dpe-sec { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin: 22px 0 8px; }
.dpe-sec h3 { margin: 0; }
.dpe-filtros { display: flex; gap: 6px; flex-wrap: wrap; margin: 0 0 10px; }
.dpe-card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 16px; margin: 0 0 12px;
  box-shadow: 0 1px 0 rgba(0,0,0,.02), 0 8px 24px -18px rgba(21,94,74,.45); border-left: 4px solid var(--accent); }
.dpe-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.dpe-num { font: 600 .82rem var(--f-mono); padding: 4px 10px; border-radius: 999px; background: var(--accent); color: var(--accent-ink); }
.dpe-data { color: var(--muted); font-size: .8rem; margin-left: auto; }
.dpe-enun { font-family: var(--f-read); font-size: 1.12rem; line-height: 1.5; margin: 4px 0 12px; }
.dpe-por { background: var(--accent-soft); border-radius: 12px; padding: 10px 12px; font-size: .92rem; }
.dpe-por b { color: var(--accent); }
.dpe-pe { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 10px; font-size: .8rem; color: var(--muted); }
.dpe-pe a { color: var(--accent); font-weight: 600; text-decoration: none; }
.dpe-nota { color: var(--muted); font-size: .8rem; margin: 18px 0 8px; }
.dpe-tese { border-left-color: #2fa37a; }
.dpe-cargo { margin: 0 0 10px; font-weight: 600; }
.dpe-links { display: flex; gap: 8px; flex-wrap: wrap; }
.dpe-links a { text-decoration: none; }
.dpe-prova { border-left-color: #8fd3b6; }
.dpe-tese .dpe-num { font-family: var(--f-ui); white-space: normal; border-radius: 12px; }
.dpe-teses { margin: 4px 0 12px; padding-left: 20px; font-family: var(--f-read); font-size: 1.04rem; line-height: 1.5; }
.dpe-teses li { margin: 0 0 8px; }
"""

JS = r"""
// ===================== aba Defensoria: súmulas e teses que mais importam à DPE =====================
// conteúdo em DECK.dpe (baralho cifrado) ou em DPE_PUBLICO (embutido no código: só textos públicos de súmulas e teses)
const dpeDados = () => DECK.dpe || (typeof DPE_PUBLICO !== "undefined" ? DPE_PUBLICO : {});
function renderDef() {
  const D = dpeDados(), sum = D.sumulas || [], E = D.estatisticas || {}, EJ = D.estatisticas_stj || {}, teses = D.teses || [];
  const tri = S.defTri || "", f = S.defRamo || "";
  const doTri = sum.filter(x => !tri || (x.tribunal || "STF") === tri);
  const ramos = [...new Set(doTri.map(x => x.ramo))].sort((a, b) => a.localeCompare(b, "pt"));
  const lista = doTri.filter(x => !f || x.ramo === f);
  const nivel = r => /^essencial/i.test(r) ? "Essencial" : /^alta/i.test(r) ? "Alta" : /^m[ée]dia/i.test(r) ? "Média" : "";
  const motivo = r => r.replace(/^(Essencial|Alta|Média|Media)\s*/i, "").replace(/^\(([^)]*)\)/, "$1");
  const rel = r => r ? `<div class="dpe-por"><b>Relevância para a DPE${nivel(r) ? " · " + nivel(r) : ""}:</b> ${esc(motivo(r))}</div>` : "";
  const numStj = String(EJ.total_sumulas_editadas || "").match(/\d+/);
  $("#main").innerHTML = `
    <section class="dpe-hero">
      <p class="dpe-kicker">Defensoria em foco</p>
      <h2>O que mais cai e mais importa para a DPE</h2>
      <p>Súmulas e teses com maior relevância para concursos e para a atuação da Defensoria Pública.${D.atualizado ? " Atualizado em " + fmtISO(D.atualizado) + "." : ""}</p>
      <div class="dpe-stats">
        ${E.total_sumulas_tradicionais ? `<div class="dpe-stat"><b>${E.total_sumulas_tradicionais}</b><span>súmulas do STF</span></div>` : ""}
        ${E.total_sumulas_vinculantes ? `<div class="dpe-stat"><b>${E.total_sumulas_vinculantes}</b><span>vinculantes</span></div>` : ""}
        ${numStj ? `<div class="dpe-stat"><b>${numStj[0]}+</b><span>súmulas do STJ</span></div>` : ""}
        <div class="dpe-stat"><b>${sum.length}</b><span>em destaque</span></div>
      </div>
    </section>
    <div class="dpe-sec"><h3>Súmulas em destaque</h3><span class="count">${plural(lista.length, "súmula", "súmulas")}</span></div>
    <div class="dpe-filtros" role="group" aria-label="Tribunal">${["", "STF", "STJ"].map(t => `<button class="fchip" data-tri="${t}" aria-pressed="${tri === t}">${t || "STF e STJ"}</button>`).join("")}</div>
    <div class="dpe-filtros" role="group" aria-label="Filtrar por ramo"><button class="fchip" data-r="" aria-pressed="${!f}">Todos os ramos</button>${ramos.map(r => `<button class="fchip" data-r="${esc(r)}" aria-pressed="${f === r}">${esc(r)}</button>`).join("")}</div>
    ${lista.map(x => `
      <article class="dpe-card">
        <div class="dpe-top"><span class="dpe-num">${esc(x.tipo)}</span><span class="chip">${esc(x.ramo)}</span>${x.aprovacao ? `<span class="dpe-data">aprovada em ${esc(x.aprovacao)}</span>` : ""}</div>
        <p class="dpe-enun">${md(x.enunciado)}</p>
        ${rel(x.relevancia_dpe)}
      </article>`).join("")}
    ${teses.length ? `<div class="dpe-sec"><h3>Jurisprudência em Teses · STJ</h3><span class="count">${plural(teses.length, "edição", "edições")}</span></div>
    ${teses.map(t => `
      <article class="dpe-card dpe-tese">
        <div class="dpe-top"><span class="dpe-num">${esc(t.edicao)}</span></div>
        <ol class="dpe-teses">${(t.teses_destaque || []).map(x => `<li>${md(x)}</li>`).join("")}</ol>
        ${rel(t.relevancia_dpe)}
      </article>`).join("")}` : ""}
    ${(D.provas || []).length ? `<div class="dpe-sec"><h3>Provas anteriores</h3><span class="count">${plural(D.provas.length, "concurso", "concursos")}</span></div>
    ${D.provas.map(v => `
      <article class="dpe-card dpe-prova">
        <div class="dpe-top"><span class="dpe-num">${esc(v.orgao)}</span><span class="chip">${esc(v.banca)}</span>${v.ano ? `<span class="dpe-data">${esc(String(v.ano))}</span>` : ""}</div>
        <p class="dpe-cargo">${esc(v.cargo)}</p>
        <div class="dpe-links">${(v.links || []).map(l => `<a class="btn small" href="${esc(l.url)}" target="_blank" rel="noopener">📄 ${esc(l.rotulo)}</a>`).join("")}</div>
      </article>`).join("")}
    <p class="dpe-nota">Os arquivos abrem nos sites das bancas e de repositórios de provas e precisam de internet.</p>` : ""}
    <p class="dpe-nota">${[E.fonte, EJ.fonte_oficial].filter(Boolean).map(esc).join(" · ")}${E.fonte || EJ.fonte_oficial ? ". " : ""}Confira sempre a redação oficial antes de citar em peça ou prova.</p>`;
  document.querySelectorAll(".fchip[data-tri]").forEach(b => b.onclick = () => { S.defTri = b.dataset.tri; S.defRamo = ""; renderDef(); });
  document.querySelectorAll(".fchip[data-r]").forEach(b => b.onclick = () => { S.defRamo = b.dataset.r; renderDef(); });
}
(() => { const t = document.getElementById("tab-defensoria"), D = dpeDados(); if (t) t.hidden = !((D.sumulas || []).length || (D.teses || []).length); })();
"""

DECK_RE = re.compile(r"^const DECK = (\{.*\});$", re.M)

def trocar(html, antes, depois, marca):
    if marca in html: return html, 0
    if html.count(antes) != 1: sys.exit(f"trecho não encontrado (ou repetido), nada foi gravado: {antes[:80]!r}")
    return html.replace(antes, depois), 1

def aplicar(caminho: Path, dados: Path | None, publico: bool = False):
    html = caminho.read_text(encoding="utf-8"); n = 0
    i = html.index('id="tab-novidades"'); j = html.index("</button>", i) + len("</button>")
    if 'id="tab-defensoria"' not in html: html = html[:j] + NAV_BTN + html[j:]; n += 1
    # estilo: insere, ou troca a versão anterior pela atual
    c0 = html.find("\n/* ---- aba Defensoria ---- */")
    if c0 >= 0:
        c1 = html.index("</style>", c0)
        if html[c0:c1] != CSS.rstrip("\n") + "\n": html = html[:c0] + CSS + html[c1:]; n += 1
    else:
        k = html.index("</style>", html.index(".tabs {")); html = html[:k] + CSS + html[k:]; n += 1
    html, x = trocar(html, "novidades: renderNov,", "novidades: renderNov, defensoria: renderDef,", "defensoria: renderDef"); n += x
    # tela: insere antes de renderNov, ou troca a versão anterior pela atual
    novo_js = JS.lstrip("\n")
    j0 = html.find("// ===================== aba Defensoria")
    if j0 >= 0:
        fim = '(() => { const t = document.getElementById("tab-defensoria")'
        j1 = html.index("\n", html.index(fim, j0)) + 1
        if html[j0:j1] != novo_js: html = html[:j0] + novo_js + html[j1:]; n += 1
    else:
        html, x = trocar(html, "function renderNov() {", novo_js + "function renderNov() {", "function renderDef()"); n += x
    if dados and publico:
        bloco = "const DPE_PUBLICO = " + json.dumps(json.loads(dados.read_text(encoding="utf-8")), ensure_ascii=False) + ";\n"
        html = re.sub(r"const DPE_PUBLICO = .*;\n", "", html)          # troca a versão anterior, se houver
        i = html.index("// ===================== aba Defensoria")
        html = html[:i] + bloco + html[i:]
        print("conteúdo embutido no código (DPE_PUBLICO)")
    elif dados:
        m = DECK_RE.search(html)
        if not m: sys.exit("const DECK não encontrado: o conteúdo só pode ir para o fonte.html (no index.html o baralho é cifrado).")
        deck = json.loads(m.group(1)); deck["dpe"] = json.loads(dados.read_text(encoding="utf-8"))
        html = html[:m.start()] + "const DECK = " + json.dumps(deck, ensure_ascii=False) + ";" + html[m.end():]
        print(f"conteúdo: {len(deck['dpe'].get('sumulas', []))} súmulas em DECK.dpe")
    caminho.write_text(html, encoding="utf-8")
    print(f"{caminho}: {n} alterações de código" + (" (já estava aplicado)" if not n else ""))

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--publico"]
    if len(args) not in (1, 2): sys.exit(__doc__)
    aplicar(Path(args[0]), Path(args[1]) if len(args) == 2 else None, "--publico" in sys.argv)
