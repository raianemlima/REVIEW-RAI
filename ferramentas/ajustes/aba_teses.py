"""Aba "Teses": teses de repercussão geral (STF) e temas repetitivos (STJ) que mais importam à Defensoria.

    python ferramentas/conteudo/teses_json.py                          # gera dados/teses.json a partir do texto
    python ferramentas/ajustes/aba_teses.py index.html ferramentas/conteudo/dados/teses.json

O conteúdo (texto público de teses e súmulas) vai embutido no código como TESES_PUBLICO.
Use depois da aba Defensoria, porque o visual reaproveita o estilo dela. Rodar de novo não duplica nada.
"""
import json, sys
from pathlib import Path

NAV_BTN = ('\n      <button role="tab" data-tab="teses" aria-selected="false" id="tab-teses" hidden>'
           '<svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" '
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v16M5 20h14M7 8h10"/>'
           '<path d="M7 8l-3 6a3 3 0 0 0 6 0zM17 8l-3 6a3 3 0 0 0 6 0z"/></svg><span>Teses</span></button>')

CSS = """
/* ---- aba Teses ---- */
.ts-busca { display: flex; gap: 8px; margin: 0 0 10px; }
.ts-busca input { flex: 1; min-width: 0; font: inherit; padding: 10px 14px; border-radius: 14px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); }
.ts-busca select { font: inherit; font-size: .9rem; padding: 10px; border-radius: 14px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); max-width: 46%; }
.ts-txt { font-family: var(--f-read); font-size: 1.04rem; line-height: 1.55; margin: 4px 0 6px; }
.ts-txt p { margin: 0 0 8px; }
.ts-txt.fechado { display: -webkit-box; -webkit-line-clamp: 7; -webkit-box-orient: vertical; overflow: hidden; }
.ts-mais { background: none; border: 0; padding: 0; color: var(--accent); font: 600 .85rem var(--f-ui); cursor: pointer; }
.ts-alerta { font-size: .82rem; border-radius: 10px; padding: 6px 10px; margin: 0 0 8px; background: var(--amber-soft, #fdf3dc); color: var(--amber, #8a5a00); }
.ts-card.ts-superado { opacity: .72; border-left-color: var(--muted); }
.ts-card.ts-superado .ts-txt { text-decoration: line-through; text-decoration-thickness: 1px; }
.ts-stj { border-left-color: #2fa37a; }
.ts-vazio { color: var(--muted); text-align: center; padding: 24px 8px; }
"""

JS = r"""
// ===================== aba Teses: repercussão geral (STF) e repetitivos (STJ) para a DPE =====================
const tsDados = () => DECK.teses || (typeof TESES_PUBLICO !== "undefined" ? TESES_PUBLICO : { itens: [] });
const tsNorm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const TS_ALERTA = { aguardando: "O documento traz só a questão do tema, sem a tese fixada.", superado: "Superado ou cancelado: não use como entendimento atual.",
  conferir: "Este número aparece no documento com outro texto. Confira o número no site do tribunal." };
function tsFiltrados() {
  const D = tsDados(), q = tsNorm(S.tsQ).trim(), tri = S.tsTri || "", r = S.tsRamo || "";
  const termos = q.split(/\s+/).filter(Boolean);
  return (D.itens || []).filter(x => (!tri || x.tribunal === tri) && (!r || x.ramo === r) &&
    (!termos.length || (x._q || (x._q = tsNorm([x.tipo, x.num, x.processo, x.ramo, x.texto].join(" ")))) && termos.every(t => x._q.includes(t))));
}
function tsCard(x) {
  const rot = x.tipo === "Repercussão geral" ? `Tema ${x.num || "—"} · RG` : x.tipo === "Repetitivo" ? `Tema ${x.num} · Repetitivo` : `${x.tipo} ${x.num}`;
  const paras = x.texto.split("\n").map(p => `<p>${esc(p)}</p>`).join("");
  return `<article class="dpe-card ts-card${x.tribunal === "STJ" ? " ts-stj" : ""}${x.status === "superado" ? " ts-superado" : ""}">
    <div class="dpe-top"><span class="dpe-num">${x.tribunal} · ${esc(rot)}</span><span class="chip">${esc(x.ramo)}</span>${x.data ? `<span class="dpe-data">${esc(x.data)}</span>` : ""}</div>
    ${x.status ? `<div class="ts-alerta">${TS_ALERTA[x.status]}</div>` : ""}
    <div class="ts-txt${x.texto.length > 600 ? " fechado" : ""}">${paras}</div>
    ${x.texto.length > 600 ? `<button class="ts-mais">Ler tudo</button>` : ""}
    ${x.processo ? `<div class="dpe-pe"><span>${esc(x.processo)}</span></div>` : ""}
  </article>`;
}
function tsLista() {
  const l = tsFiltrados(), n = S.tsN || 40, el = $("#ts-lista");
  $("#ts-cont").textContent = plural(l.length, "tese", "teses");
  el.innerHTML = l.length ? l.slice(0, n).map(tsCard).join("") + (l.length > n ? `<button class="btn" id="ts-mostrar" style="width:100%">Mostrar mais ${Math.min(40, l.length - n)} de ${l.length - n}</button>` : "")
    : `<p class="ts-vazio">Nada encontrado. Tente outra palavra ou limpe os filtros.</p>`;
  el.querySelectorAll(".ts-mais").forEach(b => b.onclick = () => { const t = b.previousElementSibling, f = t.classList.toggle("fechado"); b.textContent = f ? "Ler tudo" : "Mostrar menos"; });
  const m = $("#ts-mostrar"); if (m) m.onclick = () => { S.tsN = n + 40; tsLista(); };
}
function renderTeses() {
  const D = tsDados(), it = D.itens || [], tri = S.tsTri || "";
  const ramos = (D.ramos || []).filter(r => it.some(x => x.ramo === r && (!tri || x.tribunal === tri)));
  const nSTF = it.filter(x => x.tribunal === "STF").length;
  $("#main").innerHTML = `
    <section class="dpe-hero">
      <p class="dpe-kicker">Precedentes qualificados</p>
      <h2>Teses que a Defensoria precisa conhecer</h2>
      <p>Repercussão geral do STF, repetitivos do STJ e súmulas recentes, organizados por ramo.${D.atualizado ? " Atualizado em " + fmtISO(D.atualizado).slice(3) + "." : ""}</p>
      <div class="dpe-stats">
        <div class="dpe-stat"><b>${nSTF}</b><span>do STF</span></div>
        <div class="dpe-stat"><b>${it.length - nSTF}</b><span>do STJ</span></div>
        <div class="dpe-stat"><b>${(D.ramos || []).length}</b><span>ramos</span></div>
      </div>
    </section>
    <div class="ts-busca"><input id="ts-q" type="search" placeholder="Buscar tese" value="${esc(S.tsQ || "")}" aria-label="Buscar teses">
      <select id="ts-ramo" aria-label="Ramo"><option value="">Todos os ramos</option>${ramos.map(r => `<option${r === S.tsRamo ? " selected" : ""}>${esc(r)}</option>`).join("")}</select></div>
    <div class="dpe-filtros" role="group" aria-label="Tribunal">${["", "STF", "STJ"].map(t => `<button class="fchip" data-tstri="${t}" aria-pressed="${tri === t}">${t || "STF e STJ"}</button>`).join("")}</div>
    <div class="dpe-sec"><h3>${esc(S.tsRamo || "Todas as teses")}</h3><span class="count" id="ts-cont"></span></div>
    <div id="ts-lista"></div>
    <p class="dpe-nota">${D.fonte ? esc(D.fonte) + ". " : ""}Confira sempre a redação oficial no site do STF ou do STJ antes de citar em peça ou prova.</p>`;
  let t0; $("#ts-q").oninput = e => { clearTimeout(t0); t0 = setTimeout(() => { S.tsQ = e.target.value; S.tsN = 40; tsLista(); }, 150); };
  $("#ts-ramo").onchange = e => { S.tsRamo = e.target.value; S.tsN = 40; renderTeses(); };
  document.querySelectorAll(".fchip[data-tstri]").forEach(b => b.onclick = () => { S.tsTri = b.dataset.tstri; S.tsN = 40;
    if (S.tsRamo && !it.some(x => x.ramo === S.tsRamo && (!S.tsTri || x.tribunal === S.tsTri))) S.tsRamo = ""; renderTeses(); });
  tsLista();
}
(() => { const t = document.getElementById("tab-teses"); if (t) t.hidden = !(tsDados().itens || []).length; })();
"""

def trocar(html, antes, depois, marca):
    if marca in html: return html, 0
    if html.count(antes) != 1: sys.exit(f"trecho não encontrado (ou repetido), nada foi gravado: {antes[:80]!r}")
    return html.replace(antes, depois), 1

def aplicar(caminho: Path, dados: Path | None):
    html = caminho.read_text(encoding="utf-8"); n = 0
    if 'id="tab-defensoria"' not in html: sys.exit("rode antes o aba_defensoria.py: a aba Teses usa o estilo dela.")
    if 'id="tab-teses"' not in html:
        i = html.index('id="tab-defensoria"'); j = html.index("</button>", i) + len("</button>")
        html = html[:j] + NAV_BTN + html[j:]; n += 1
    c0 = html.find("\n/* ---- aba Teses ---- */")
    if c0 >= 0:
        c1 = min(k for k in (html.find("\n/* ---- ", c0 + 1), html.index("</style>", c0)) if k >= 0)   # só o próprio bloco
        if html[c0:c1] != CSS.rstrip("\n") + "\n": html = html[:c0] + CSS + html[c1:]; n += 1
    else:
        k = html.index("</style>", html.index("/* ---- aba Defensoria ---- */")); html = html[:k] + CSS + html[k:]; n += 1
    html, x = trocar(html, "defensoria: renderDef,", "defensoria: renderDef, teses: renderTeses,", "teses: renderTeses"); n += x
    novo_js = JS.lstrip("\n")
    j0 = html.find("// ===================== aba Teses")
    if j0 >= 0:
        fim = '(() => { const t = document.getElementById("tab-teses")'
        j1 = html.index("\n", html.index(fim, j0)) + 1
        if html[j0:j1] != novo_js: html = html[:j0] + novo_js + html[j1:]; n += 1
    else:
        html, x = trocar(html, "function renderNov() {", novo_js + "function renderNov() {", "function renderTeses()"); n += x
    if dados:
        d = json.loads(dados.read_text(encoding="utf-8"))
        bloco = "const TESES_PUBLICO = " + json.dumps(d, ensure_ascii=False).replace("</", "<\\/") + ";\n"
        a = html.find("const TESES_PUBLICO = ")
        if a >= 0:
            b = html.index(";\n", a) + 2                       # o JSON não tem ";\n" dentro (json.dumps não quebra linha)
            html = html[:a] + bloco + html[b:]
        else:
            i = html.index("// ===================== aba Teses"); html = html[:i] + bloco + html[i:]
        print(f"conteúdo embutido no código (TESES_PUBLICO): {len(d.get('itens', []))} teses")
    caminho.write_text(html, encoding="utf-8")
    print(f"{caminho}: {n} alterações de código" + (" (já estava aplicado)" if not n else ""))

if __name__ == "__main__":
    if len(sys.argv) not in (2, 3): sys.exit(__doc__)
    aplicar(Path(sys.argv[1]), Path(sys.argv[2]) if len(sys.argv) == 3 else None)
