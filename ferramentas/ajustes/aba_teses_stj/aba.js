// ===================== aba Teses STJ: Jurisprudência em Teses =====================
// Texto oficial público da Jurisprudência em Teses do STJ, coletado por ferramentas/conteudo/jurisprudencia_em_teses/coletar.py
// e publicado em arquivos/jurisprudencia-em-teses/ (indice.json + um arquivo por ramo do direito). Carrega sob demanda e
// fica no cache do service worker. O "lido" fica em S.ajustes.teses.lidos e sincroniza com os demais ajustes.
const TES_PASSO = 15;
const tesCache = {};
let _tesIndice = null;
async function tesJson(arq) {
  if (tesCache[arq]) return tesCache[arq];
  const r = await fetch("arquivos/jurisprudencia-em-teses/" + arq);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return (tesCache[arq] = await r.json());
}
function tesLidos() { ensureAj(); S.ajustes.teses ||= {}; S.ajustes.teses.lidos ||= {}; return S.ajustes.teses.lidos; }
const tesNome = r => String(r || "").toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(Do|Da|De|E|Dos|Das)\b/g, m => m.toLowerCase());
const tesData = iso => iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "";
function tesCard(ed, lidos, abertos) {
  const total = ed.teses.reduce((n, t) => n + Object.values(t.julgados).reduce((m, l) => m + l.length, 0), 0);
  const id = "ed" + ed.edicao;
  return `<article class="tes-item${lidos[id] ? " lido" : ""}">
    <header><span class="tes-num">Ed. ${ed.edicao}</span><span class="tes-meta">${esc(tesNome(ed.ramo))}${ed.data ? " · " + tesData(ed.data) : ""}</span>
      <label class="tes-lido"><input type="checkbox" data-tes-lido="${id}" ${lidos[id] ? "checked" : ""}> lida</label></header>
    <h4>${esc(ed.titulo)}</h4>
    <p class="tes-sub">${plural(ed.teses.length, "tese", "teses")} · ${plural(total, "julgado", "julgados")}${ed.ate ? " · julgados até " + tesData(ed.ate) : ""}</p>
    <details data-tes-ed="${id}"${abertos[id] ? " open" : ""}><summary>Ver teses</summary>
      <ol class="tes-teses">${ed.teses.map(t => `<li value="${t.n}"><p class="tes-txt">${esc(t.texto)}</p>${t.situacao ? `<p class="tes-sit">${esc(t.situacao)}</p>` : ""}
        ${Object.entries(t.julgados).map(([k, l]) => `<details class="tes-jul"><summary>${esc(k)} (${l.length})</summary><ul>${l.map(j => `<li>${esc(j)}</li>`).join("")}</ul></details>`).join("")}</li>`).join("")}</ol>
    </details>
  </article>`;
}
async function renderTesesSTJ() {
  const F = (S.tesF ||= { ramo: "", q: "", nao: false, n: TES_PASSO, abertos: {} });
  $("#main").innerHTML = `<h2>Teses STJ</h2><p class="sub">Carregando…</p>`;
  try { _tesIndice ||= await tesJson("indice.json"); }
  catch (e) { $("#main").innerHTML = `<h2>Teses STJ</h2><p class="sub">A Jurisprudência em Teses ainda não foi baixada. Conecte-se à internet uma vez nesta tela para guardá-la no aparelho.</p>`; return; }
  const ramos = [...new Set(_tesIndice.map(i => i.ramo))].sort((a, b) => a.localeCompare(b, "pt"));
  const arqs = [...new Set(_tesIndice.filter(i => !F.ramo || i.ramo === F.ramo).map(i => i.arquivo))];
  let todas = [];
  try { for (const a of arqs) todas = todas.concat(await tesJson(a)); }
  catch (e) { $("#main").innerHTML = `<h2>Teses STJ</h2><p class="sub">Não foi possível carregar os dados agora. Tente de novo com internet.</p>`; return; }
  todas.sort((a, b) => (b.data || "").localeCompare(a.data || "") || b.edicao - a.edicao);
  const lidos = tesLidos(), palavras = norm(F.q).split(" ").filter(Boolean);
  const lista = todas.filter(e => (!F.nao || !lidos["ed" + e.edicao])
    && (!palavras.length || (t => palavras.every(w => t.includes(w)))(norm([e.titulo, e.ramo, ...e.teses.flatMap(t => [t.texto, ...Object.values(t.julgados).flat()])].join(" ")))));
  const mostra = lista.slice(0, F.n);
  const nT = _tesIndice.reduce((s, i) => s + i.teses, 0), nJ = _tesIndice.reduce((s, i) => s + i.julgados, 0);
  $("#main").innerHTML = `
    <section class="tes-hero"><p class="tes-kicker">STJ · Jurisprudência em Teses</p><h2>Teses STJ</h2>
      <p>Entendimentos consolidados do STJ, por edição, com os julgados que os sustentam. Texto oficial; confira a edição vigente antes de citar.</p>
      <div class="tes-stats"><div><b>${_tesIndice.length}</b><span>edições</span></div><div><b>${nT}</b><span>teses</span></div><div><b>${nJ}</b><span>julgados</span></div><div><b>${Object.keys(lidos).length}</b><span>edições lidas</span></div></div></section>
    <div class="tes-filtros">
      <input type="search" id="tesQ" placeholder="Buscar por tema, tese, artigo ou processo" value="${esc(F.q)}" aria-label="Buscar nas teses">
      <select id="tesR" aria-label="Ramo do direito"><option value="">Todos os ramos</option>${ramos.map(a => `<option value="${esc(a)}"${F.ramo === a ? " selected" : ""}>${esc(tesNome(a))}</option>`).join("")}</select>
      <label><input type="checkbox" id="tesNao" ${F.nao ? "checked" : ""}> só não lidas</label>
    </div>
    <p class="tes-cont" aria-live="polite">${plural(lista.length, "edição", "edições")}</p>
    <div class="tes-lista">${mostra.map(e => tesCard(e, lidos, F.abertos)).join("") || `<p class="sub">Nada com esses filtros.</p>`}</div>
    ${lista.length > mostra.length ? `<p style="text-align:center"><button class="btn" id="tesMais">Mostrar mais (${lista.length - mostra.length})</button></p>` : ""}
    <p class="src">Fonte: Jurisprudência em Teses do STJ (processo.stj.jus.br/SCON/jt). Texto oficial, sem alteração de conteúdo.</p>`;
  const vol = () => { F.n = TES_PASSO; renderTesesSTJ(); };
  let tq; $("#tesQ").oninput = e => { F.q = e.target.value; clearTimeout(tq); tq = setTimeout(() => { F.n = TES_PASSO; renderTesesSTJ().then(() => { const i = $("#tesQ"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }); }, 350); };
  $("#tesR").onchange = e => { F.ramo = e.target.value; vol(); };
  $("#tesNao").onchange = e => { F.nao = e.target.checked; vol(); };
  $("#tesMais")?.addEventListener("click", () => { F.n += TES_PASSO; renderTesesSTJ(); });
  document.querySelectorAll("[data-tes-ed]").forEach(d => d.addEventListener("toggle", () => { F.abertos[d.dataset.tesEd] = d.open; }));
  document.querySelectorAll("[data-tes-lido]").forEach(b => b.onchange = () => {
    const l = tesLidos(); if (b.checked) l[b.dataset.tesLido] = 1; else delete l[b.dataset.tesLido];
    b.closest(".tes-item").classList.toggle("lido", b.checked); queue("ajustes");
  });
}
// ===================== fim da aba Teses STJ =====================
