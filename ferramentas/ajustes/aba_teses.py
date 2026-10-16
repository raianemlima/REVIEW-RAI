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
.ts-ramos-nav { display: flex; gap: 6px; overflow-x: auto; padding: 2px 2px 8px; margin: 0 0 4px; scrollbar-width: thin; }
.ts-ramos-nav .fchip { flex: none; white-space: nowrap; }
.fchip small { opacity: .7; font-weight: 600; margin-left: 2px; }
.ts-sep { width: 1px; background: var(--line); margin: 2px 4px; }
.ts-fnovas[aria-pressed="false"] { border-color: #f0b429; }
.ts-novo { font: 700 .7rem var(--f-ui); text-transform: uppercase; letter-spacing: .04em; background: #f0b429; color: #3d2a00; border-radius: 999px; padding: 2px 8px; }
.ts-stat-novas { font: inherit; cursor: pointer; border: 1px solid transparent; }
.ts-stat-novas[aria-pressed="true"] { border-color: #f0b429; }
.ts-grupo { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 2px solid var(--line); font: 700 1rem var(--f-ui); }
.ts-grupo small { color: var(--muted); font-weight: 500; font-size: .8rem; }
.ts-pe { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin-top: 6px; font-size: .82rem; }
.ts-proc { color: var(--muted); font-weight: 600; }
.ts-ramos { display: flex; gap: 4px; flex-wrap: wrap; }
.ts-acoes { margin-left: auto; display: flex; gap: 6px; }
.ts-acao { font: 600 .8rem var(--f-ui); color: var(--accent); background: none; border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; cursor: pointer; text-decoration: none; }
.ts-acao:hover { border-color: var(--accent); }
.ts-txt mark { background: #fde68a; color: inherit; border-radius: 3px; padding: 0 1px; }
"""

JS = r"""
// ===================== aba Teses: repercussão geral (STF) e repetitivos (STJ) para a DPE =====================
const tsDados = () => { const a = DECK.teses, b = typeof TESES_PUBLICO !== "undefined" ? TESES_PUBLICO : null;
  return a && (!b || (a.atualizado || "") >= (b.atualizado || "")) ? a : (b || { itens: [] }); };
const tsNorm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const TS_ALERTA = { aguardando: "Tema afetado: o tribunal ainda não fixou a tese. Acompanhe o julgamento.", superado: "Superado, revogado ou cancelado: não use como entendimento atual.",
  conferir: "Este número aparece no documento com outro texto. Confira o número no site do tribunal." };
const TS_TIPOS = [["", "Tudo"], ["sum", "Súmulas"], ["rg", "Repercussão geral"], ["rep", "Repetitivos e IAC"]];
const tsTipoOk = (x, t) => !t || (t === "sum" ? /Súmula/.test(x.tipo) : t === "rg" ? x.tipo === "Repercussão geral" : /Repetitivo|IAC/.test(x.tipo));
const tsRamos = x => [x.ramo, ...(x.outros_ramos || [])];
const tsData = x => { const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(x.data || ""); return m ? m[3] + m[2].padStart(2, "0") + m[1].padStart(2, "0") : ""; };
const tsNum = x => parseInt(x.num, 10) || 0;
function tsBase(semRamo) {      // todos os filtros, menos a busca; semRamo serve para contar os itens de cada ramo
  const D = tsDados(), tri = S.tsTri || "", tipo = S.tsTipo || "", r = S.tsRamo || "";
  return (D.itens || []).filter(x => (!tri || x.tribunal === tri) && tsTipoOk(x, tipo) && (!S.tsNovas || x.novo) && (semRamo || !r || tsRamos(x).includes(r)));
}
function tsFiltrados() {
  const termos = tsNorm(S.tsQ).trim().split(/\s+/).filter(Boolean);
  const l = tsBase().filter(x => !termos.length || (x._q || (x._q = tsNorm([x.tribunal, x.tipo, "tema " + x.num, x.num, x.processo, x.ramo, x.texto].join(" ")))) && termos.every(t => x._q.includes(t)));
  if (S.tsOrdem === "recentes") return [...l].sort((a, b) => (tsData(b) || "0").localeCompare(tsData(a) || "0") || tsNum(b) - tsNum(a));
  if (S.tsOrdem === "numero") return [...l].sort((a, b) => a.tribunal.localeCompare(b.tribunal) || tsNum(a) - tsNum(b));
  return l;                    // ordem do conjunto: por ramo; súmulas, STF e STJ; tema mais novo primeiro
}
function tsRotulo(x) {
  return x.tipo === "Repercussão geral" ? `Tema ${x.num || "—"} · Repercussão geral` : x.tipo === "Repetitivo" ? `Tema ${x.num} · Repetitivo`
    : x.tipo === "IAC" ? `IAC ${x.num}` : `${x.tipo} ${x.num}`;
}
function tsCitacao(x) {
  const p = [x.processo, x.data ? "julgado em " + x.data : ""].filter(Boolean).join(", ");
  const onde = /Súmula/.test(x.tipo) ? `${x.tipo} ${x.num} do ${x.tribunal}` : x.tipo === "Repercussão geral" ? `STF, Tema ${x.num} da Repercussão Geral`
    : x.tipo === "IAC" ? `STJ, IAC ${x.num}` : `STJ, Tema Repetitivo ${x.num}`;
  return `“${x.texto.replace(/\n+/g, " ")}” (${onde}${p ? ", " + p : ""}).`;
}
function tsLink(x) {
  if (!x.num || !/^\d+$/.test(x.num)) return "";
  if (x.tipo === "Repercussão geral") return "https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=" + x.num;
  if (x.tipo === "Repetitivo") return `https://processo.stj.jus.br/repetitivos/temas_repetitivos/pesquisa.jsp?novaConsulta=true&tipo_pesquisa=T&cod_tema_inicial=${x.num}&cod_tema_final=${x.num}`;
  return "";
}
function tsDestaca(html, termos) {    // marca os termos da busca no texto, ignorando acentos
  const cls = { a: "[aáàâã]", e: "[eéê]", i: "[ií]", o: "[oóôõ]", u: "[uúü]", c: "[cç]" };
  termos.filter(t => t.length > 2).forEach(t => {
    const re = new RegExp("(" + [...t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")].map(ch => cls[ch] || ch).join("") + ")", "gi");
    html = html.replace(/(^|>)([^<]*)/g, (m, a, txt) => a + txt.replace(re, "<mark>$1</mark>"));
  });
  return html;
}
function tsCard(x, termos) {
  const longo = x.texto.length > 600, lk = tsLink(x);
  const paras = x.texto.split("\n").map(p => `<p>${tsDestaca(esc(p), termos)}</p>`).join("");
  return `<article class="dpe-card ts-card${x.tribunal === "STJ" ? " ts-stj" : ""}${x.status === "superado" ? " ts-superado" : ""}" data-ts="${esc(x.tribunal + x.tipo + x.num)}">
    <div class="dpe-top"><span class="dpe-num">${x.tribunal} · ${esc(tsRotulo(x))}</span>${x.novo ? `<span class="ts-novo">Nova</span>` : ""}${x.data ? `<span class="dpe-data">${esc(x.data)}</span>` : ""}</div>
    ${x.status ? `<div class="ts-alerta">${TS_ALERTA[x.status]}</div>` : ""}
    <div class="ts-txt${longo ? " fechado" : ""}">${paras}</div>
    ${longo ? `<button class="ts-mais">Ler tudo</button>` : ""}
    <div class="ts-pe">${x.processo ? `<span class="ts-proc">${esc(x.processo)}</span>` : ""}<span class="ts-ramos">${tsRamos(x).map(r => `<span class="chip">${esc(r)}</span>`).join("")}</span>
      <span class="ts-acoes"><button class="ts-acao" data-tscopia="1" title="Copia a tese com a citação, pronta para a peça">Copiar citação</button>${lk ? `<a class="ts-acao" href="${lk}" target="_blank" rel="noopener">Ver no ${x.tribunal}</a>` : ""}</span></div>
  </article>`;
}
function tsLista() {
  const l = tsFiltrados(), n = S.tsN || 40, el = $("#ts-lista"), termos = tsNorm(S.tsQ).trim().split(/\s+/).filter(Boolean);
  $("#ts-cont").textContent = plural(l.length, "tese", "teses");
  const porRamo = !S.tsOrdem && !S.tsRamo; let ramo = "", h = "";
  l.slice(0, n).forEach(x => {
    if (porRamo && x.ramo !== ramo) { ramo = x.ramo; h += `<h4 class="ts-grupo"><span>${esc(ramo)}</span><small>${plural(l.filter(y => y.ramo === ramo).length, "tese", "teses")}</small></h4>`; }
    h += tsCard(x, termos);
  });
  el.innerHTML = l.length ? h + (l.length > n ? `<button class="btn" id="ts-mostrar" style="width:100%">Mostrar mais ${Math.min(40, l.length - n)} de ${l.length - n}</button>` : "")
    : `<p class="ts-vazio">Nada encontrado. Tente outra palavra ou limpe os filtros.</p>`;
  el.querySelectorAll(".ts-mais").forEach(b => b.onclick = () => { const t = b.previousElementSibling, f = t.classList.toggle("fechado"); b.textContent = f ? "Ler tudo" : "Mostrar menos"; });
  const porId = Object.fromEntries(l.map(x => [x.tribunal + x.tipo + x.num, x]));
  el.querySelectorAll("[data-tscopia]").forEach(b => b.onclick = () => {
    const x = porId[b.closest("[data-ts]").dataset.ts], txt = tsCitacao(x);
    const ok = () => toast("Tese copiada com a citação.");
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, () => prompt("Copie a citação:", txt)); else prompt("Copie a citação:", txt);
  });
  const m = $("#ts-mostrar"); if (m) m.onclick = () => { S.tsN = n + 40; tsLista(); };
}
function renderTeses() {
  const D = tsDados(), it = D.itens || [], tri = S.tsTri || "";
  const nSTF = it.filter(x => x.tribunal === "STF").length, nNovas = it.filter(x => x.novo).length;
  const base = tsBase(true), conta = r => base.filter(x => tsRamos(x).includes(r)).length;
  const ramos = (D.ramos || []).filter(r => conta(r) || r === S.tsRamo);
  $("#main").innerHTML = `
    <section class="dpe-hero">
      <p class="dpe-kicker">Precedentes qualificados</p>
      <h2>Teses que a Defensoria precisa conhecer</h2>
      <p>Repercussão geral do STF, repetitivos do STJ e súmulas recentes, organizados por ramo.${D.atualizado ? " Atualizado em " + fmtISO(D.atualizado).slice(3) + "." : ""}</p>
      <div class="dpe-stats">
        <div class="dpe-stat"><b>${nSTF}</b><span>do STF</span></div>
        <div class="dpe-stat"><b>${it.length - nSTF}</b><span>do STJ</span></div>
        ${nNovas ? `<button class="dpe-stat ts-stat-novas" id="ts-ver-novas" aria-pressed="${!!S.tsNovas}"><b>${nNovas}</b><span>novas</span></button>` : `<div class="dpe-stat"><b>${(D.ramos || []).length}</b><span>ramos</span></div>`}
      </div>
    </section>
    <div class="ts-busca"><input id="ts-q" type="search" placeholder="Buscar por palavra, tema ou processo" value="${esc(S.tsQ || "")}" aria-label="Buscar teses">
      <select id="ts-ordem" aria-label="Ordem"><option value="">Por ramo</option><option value="recentes"${S.tsOrdem === "recentes" ? " selected" : ""}>Mais recentes</option><option value="numero"${S.tsOrdem === "numero" ? " selected" : ""}>Número do tema</option></select></div>
    <div class="ts-ramos-nav" role="group" aria-label="Ramo">
      <button class="fchip" data-tsramo="" aria-pressed="${!S.tsRamo}">Todos <small>${base.length}</small></button>
      ${ramos.map(r => `<button class="fchip" data-tsramo="${esc(r)}" aria-pressed="${r === S.tsRamo}">${esc(r)} <small>${conta(r)}</small></button>`).join("")}
    </div>
    <div class="dpe-filtros" role="group" aria-label="Filtros">
      ${["", "STF", "STJ"].map(t => `<button class="fchip" data-tstri="${t}" aria-pressed="${tri === t}">${t || "STF e STJ"}</button>`).join("")}
      <span class="ts-sep"></span>
      ${TS_TIPOS.map(([v, r]) => `<button class="fchip" data-tstipo="${v}" aria-pressed="${(S.tsTipo || "") === v}">${r}</button>`).join("")}
      ${nNovas ? `<button class="fchip ts-fnovas" data-tsnovas="1" aria-pressed="${!!S.tsNovas}">Só as novas</button>` : ""}
    </div>
    <div class="dpe-sec"><h3>${esc(S.tsRamo || (S.tsNovas ? "Novas nesta atualização" : "Todas as teses"))}</h3><span class="count" id="ts-cont"></span></div>
    <div id="ts-lista"></div>
    <p class="dpe-nota">${D.fonte ? esc(D.fonte) + ". " : ""}Confira sempre a redação oficial no site do STF ou do STJ antes de citar em peça ou prova.</p>`;
  const reset = () => { S.tsN = 40; renderTeses(); };
  let t0; $("#ts-q").oninput = e => { clearTimeout(t0); t0 = setTimeout(() => { S.tsQ = e.target.value; S.tsN = 40; tsLista(); }, 150); };
  $("#ts-ordem").onchange = e => { S.tsOrdem = e.target.value; S.tsN = 40; tsLista(); };
  document.querySelectorAll("[data-tsramo]").forEach(b => b.onclick = () => { S.tsRamo = b.dataset.tsramo; reset(); });
  document.querySelectorAll("[data-tstri]").forEach(b => b.onclick = () => { S.tsTri = b.dataset.tstri; reset(); });
  document.querySelectorAll("[data-tstipo]").forEach(b => b.onclick = () => { S.tsTipo = b.dataset.tstipo; reset(); });
  document.querySelectorAll("[data-tsnovas], #ts-ver-novas").forEach(b => b.onclick = () => { S.tsNovas = !S.tsNovas; reset(); });
  const sel = document.querySelector('.ts-ramos-nav [aria-pressed="true"]'); if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: "nearest", inline: "center" });
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
