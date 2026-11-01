// ===================== aba Informativos: STF e STJ desde 2024 =====================
// Texto oficial público dos Informativos, coletado por ferramentas/conteudo/informativos/coletar.py e publicado em
// arquivos/informativos/ (indice.json + um arquivo por tribunal e ano). Carrega sob demanda e fica no cache do
// service worker. O "lido" fica em S.ajustes.inf.lidos e sincroniza com os demais ajustes.
const INF_PASSO = 25;
const infCache = {};
let _infIndice = null;
async function infJson(arq) {
  if (infCache[arq]) return infCache[arq];
  const r = await fetch("arquivos/informativos/" + arq);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return (infCache[arq] = await r.json());
}
function infLidos() { ensureAj(); S.ajustes.inf ||= {}; S.ajustes.inf.lidos ||= {}; return S.ajustes.inf.lidos; }
// "DIREITO PENAL – CÓDIGO PENAL; ..." ou "DIREITO PENAL, DIREITO PROCESSUAL PENAL" -> ["Direito Penal", ...]
function infAreas(ramo) {
  const base = String(ramo || "").split(" – ")[0];
  return base.split(/\s*,\s*(?=DIREITO)/).map(x => x.trim()).filter(Boolean)
    .map(x => x.toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(Do|Da|De|E|Dos|Das)\b/g, m => m.toLowerCase()));
}
function infAchata(eds) {
  const out = [];
  for (const ed of eds) ed.itens.forEach((it, i) => out.push({
    id: ed.tribunal + ed.info + "-" + i, trib: ed.tribunal, info: ed.info, data: ed.data, orgao: it.orgao || "",
    areas: infAreas(it.ramo), ramo: it.ramo || "", titulo: it.titulo || it.tema || "", processo: it.processo || it.fecho || "",
    tese: it.tese || "", resumo: it.resumo || "", extra: it.adicionais || "", notas: it.notas || []
  }));
  return out;
}
const infData = iso => iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "";
function infCard(x, lidos) {
  const par = t => String(t || "").split(/\n+/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join("");
  return `<article class="inf-item${lidos[x.id] ? " lido" : ""}">
    <header><span class="inf-trib" data-t="${x.trib}">${x.trib}</span><span class="inf-meta">Info ${x.info} · ${infData(x.data)}${x.orgao ? " · " + esc(x.orgao) : ""}</span>
      <label class="inf-lido"><input type="checkbox" data-inf-lido="${esc(x.id)}" ${lidos[x.id] ? "checked" : ""}> lido</label></header>
    <h4>${esc(x.titulo)}</h4>
    ${x.areas.length ? `<p class="inf-areas">${x.areas.map(a => `<span>${esc(a)}</span>`).join("")}</p>` : ""}
    ${x.tese ? `<div class="inf-tese"><b>${x.trib === "STJ" ? "Destaque" : "Tese"}</b>${par(x.tese)}</div>` : ""}
    ${x.resumo ? `<details><summary>${x.trib === "STJ" ? "Inteiro teor (resumo)" : "Resumo"}</summary><div class="inf-res">${par(x.resumo)}</div></details>` : ""}
    ${x.extra ? `<details><summary>Legislação e precedentes</summary><div class="inf-res">${par(x.extra.replace(/ \| /g, "\n"))}</div></details>` : ""}
    ${x.notas.length ? `<details><summary>Notas (${x.notas.length})</summary><div class="inf-res">${x.notas.map(n => `<p>${esc(n)}</p>`).join("")}</div></details>` : ""}
    ${x.processo ? `<p class="inf-proc">${esc(x.processo)}</p>` : ""}
  </article>`;
}
async function renderInformativos() {
  const F = (S.infF ||= { trib: "", ano: "", area: "", q: "", tese: false, nao: false, n: INF_PASSO });
  $("#main").innerHTML = `<h2>Informativos</h2><p class="sub">Carregando…</p>`;
  try { _infIndice ||= await infJson("indice.json"); }
  catch (e) { $("#main").innerHTML = `<h2>Informativos</h2><p class="sub">Os informativos ainda não foram baixados. Conecte-se à internet uma vez nesta tela para guardá-los no aparelho.</p>`; return; }
  const anos = [...new Set(_infIndice.map(i => i.ano))].sort().reverse();
  const arqs = _infIndice.filter(i => (!F.trib || i.tribunal === F.trib) && (!F.ano || i.ano === F.ano));
  let todos = [];
  try { for (const a of arqs) todos = todos.concat(infAchata(await infJson(a.arquivo))); }
  catch (e) { $("#main").innerHTML = `<h2>Informativos</h2><p class="sub">Não foi possível carregar os dados agora. Tente de novo com internet.</p>`; return; }
  todos.sort((a, b) => (b.data || "").localeCompare(a.data || "") || b.info - a.info);
  const areas = [...new Set(todos.flatMap(x => x.areas))].sort((a, b) => a.localeCompare(b, "pt"));
  const lidos = infLidos(), palavras = norm(F.q).split(" ").filter(Boolean);
  const lista = todos.filter(x => (!F.area || x.areas.includes(F.area)) && (!F.tese || x.tese) && (!F.nao || !lidos[x.id])
    && (!palavras.length || (t => palavras.every(w => t.includes(w)))(norm([x.titulo, x.tese, x.resumo, x.processo, x.ramo, x.extra].join(" ")))));
  const mostra = lista.slice(0, F.n);
  const n = (t) => _infIndice.filter(i => i.tribunal === t).reduce((s, i) => s + i.itens, 0);
  $("#main").innerHTML = `
    <section class="inf-hero"><p class="inf-kicker">STF e STJ · desde 2024</p><h2>Informativos</h2>
      <p>Texto oficial dos Informativos de Jurisprudência, com busca e filtros por matéria. Confira sempre a fonte antes de citar.</p>
      <div class="inf-stats"><div><b>${n("STF")}</b><span>julgados do STF</span></div><div><b>${n("STJ")}</b><span>julgados do STJ</span></div><div><b>${Object.keys(lidos).length}</b><span>marcados como lidos</span></div></div></section>
    <div class="inf-filtros">
      <input type="search" id="infQ" placeholder="Buscar por tema, tese, artigo ou processo" value="${esc(F.q)}" aria-label="Buscar nos informativos">
      <select id="infT" aria-label="Tribunal"><option value="">STF e STJ</option><option value="STF"${F.trib === "STF" ? " selected" : ""}>STF</option><option value="STJ"${F.trib === "STJ" ? " selected" : ""}>STJ</option></select>
      <select id="infA" aria-label="Ano"><option value="">Todos os anos</option>${anos.map(a => `<option${F.ano === a ? " selected" : ""}>${a}</option>`).join("")}</select>
      <select id="infR" aria-label="Matéria"><option value="">Todas as matérias</option>${areas.map(a => `<option${F.area === a ? " selected" : ""}>${esc(a)}</option>`).join("")}</select>
      <label><input type="checkbox" id="infTese" ${F.tese ? "checked" : ""}> só com tese/destaque</label>
      <label><input type="checkbox" id="infNao" ${F.nao ? "checked" : ""}> só não lidos</label>
    </div>
    <p class="inf-cont" aria-live="polite">${plural(lista.length, "julgado", "julgados")}</p>
    <div class="inf-lista">${mostra.map(x => infCard(x, lidos)).join("") || `<p class="sub">Nada com esses filtros.</p>`}</div>
    ${lista.length > mostra.length ? `<p style="text-align:center"><button class="btn" id="infMais">Mostrar mais (${lista.length - mostra.length})</button></p>` : ""}
    <p class="src">Fontes: Informativo do STF (portal.stf.jus.br) e Informativo de Jurisprudência do STJ (processo.stj.jus.br). Resumos oficiais, sem alteração de conteúdo.</p>`;
  const vol = () => { F.n = INF_PASSO; renderInformativos(); };
  let tq; $("#infQ").oninput = e => { F.q = e.target.value; clearTimeout(tq); tq = setTimeout(() => { F.n = INF_PASSO; renderInformativos().then(() => { const i = $("#infQ"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }); }, 350); };
  $("#infT").onchange = e => { F.trib = e.target.value; vol(); };
  $("#infA").onchange = e => { F.ano = e.target.value; vol(); };
  $("#infR").onchange = e => { F.area = e.target.value; vol(); };
  $("#infTese").onchange = e => { F.tese = e.target.checked; vol(); };
  $("#infNao").onchange = e => { F.nao = e.target.checked; vol(); };
  $("#infMais")?.addEventListener("click", () => { F.n += INF_PASSO; renderInformativos(); });
  document.querySelectorAll("[data-inf-lido]").forEach(b => b.onchange = () => {
    const l = infLidos(); if (b.checked) l[b.dataset.infLido] = 1; else delete l[b.dataset.infLido];
    b.closest(".inf-item").classList.toggle("lido", b.checked); queue("ajustes");
  });
}
// ===================== fim da aba Informativos =====================
