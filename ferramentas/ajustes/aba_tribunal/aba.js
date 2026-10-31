// ===================== aba Tribunal: cronograma TJPB 2026 ligado ao conteúdo do app =====================
// O plano vem de TJPB_PLANO (dados públicos em ferramentas/conteudo/dados/plano-tjpb-2026.json, injetados por
// ferramentas/ajustes/plano_tjpb.py). Cada bloco de assunto procura cartões, lei seca, súmulas/teses e questões
// com o motor do Cronograma; o progresso fica em S.ajustes.tjpb.feitos e sincroniza com os demais ajustes.
// [nome, cor, palavras do nome da disciplina no baralho, leis que ligam o assunto à lei seca]
const TJ_MATERIAS = {
  const: ["Constitucional", "pub", ["constitucional"], ["Constituição Federal"]],
  adm: ["Administrativo", "pub", ["administrativo"], []],
  civ: ["Civil e CDC", "priv", ["civil", "consumidor"], ["Código Civil", "Código de Defesa do Consumidor"]],
  pc: ["Proc. Civil", "priv", ["processo civil", "processual civil", "difusos", "coletiv"], ["Código de Processo Civil"]],
  pen: ["Penal", "crim", ["penal", "criminologia"], ["Código Penal"]],
  pp: ["Proc. Penal", "crim", ["processo penal", "processual penal", "execucao penal"], ["Código de Processo Penal"]],
  dh: ["Direitos Humanos", "dh", ["direitos humanos", "difusos", "coletiv"], []],
  etica: ["Ética e Gestão", "ger", ["administrativo"], []],
  info: ["Informática e LGPD", "ger", [], []],
  jur: ["Súmulas e teses", "rev", [], []],
  disc: ["Discursiva", "pen", [], []],
  q: ["Questões", "rev", [], []],
  rev: ["Revisão", "rev", [], []],
  sim: ["Simulado", "stamp", [], []],
  meta: ["Agenda", "stamp", [], []]
};
const TJ_ASSUNTO = ["const", "adm", "civ", "pc", "pen", "pp", "dh", "etica", "info"];
const TJ_LEIS_ORDEM = ["cf-dls", "l14133-dls", "lia-dls", "cc-dls", "cpc-dls", "cp-dls", "cpp-dls", "idoso-dls", "desarm-dls", "l8112-dls"];
const TJ_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
let _tjFontes = null;
function tjFontes() {
  const ok = f => { try { return f(); } catch (e) { return undefined; } };
  const deck = typeof DECK === "undefined" ? {} : DECK;
  if (_tjFontes && _tjFontes.cartoes === deck.cartoes && _tjFontes.leiseca === deck.leiseca) return _tjFontes;
  _tjFontes = { cartoes: deck.cartoes || [], leiseca: deck.leiseca || [], teses: ok(() => tsDados().itens) || [], sumulas: ok(() => dpeDados().sumulas) || [], provas: ok(() => provasDados()) || [] };
  return _tjFontes;
}
function tjDiscs(s) {
  const m = TJ_MATERIAS[s];
  if (!m || !m[2].length || typeof DECK === "undefined") return [];
  return (DECK.disciplinas || []).filter(d => {
    const n = norm(`${d.nome || ""} ${d.curto || ""}`);
    if ((s === "civ" || s === "pen") && /process|execu/.test(n)) return false;
    return m[2].some(k => n.includes(k));
  }).map(d => d.id);
}
function tjIso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function tjHoje() { try { return tjIso(dayToDate(today())); } catch (e) { return tjIso(new Date()); } }
function tjData(iso) { const [a, m, d] = iso.split("-").map(Number); return new Date(a, m - 1, d); }
function tjDdMm(iso) { return iso.slice(8, 10) + "/" + iso.slice(5, 7); }
function tjSemanaDe(P, iso) {
  for (const w of P.semanas) if (w.dias.some(d => d.data === iso)) return w.n;
  return iso < P.semanas[0].dias[0].data ? 0 : P.semanas[P.semanas.length - 1].n;
}
const tjId = (w, di, ii) => `w${w}-d${di}-i${ii}`;
function tjFeitos() { ensureAj(); S.ajustes.tjpb ||= {}; S.ajustes.tjpb.feitos ||= {}; return S.ajustes.tjpb.feitos; }
function tjContagem(w) { const f = tjFeitos(); let t = 0, c = 0; w.dias.forEach((d, di) => d.itens.forEach((x, ii) => { t++; if (f[tjId(w.n, di, ii)]) c++; })); return { t, c }; }
// relaciona um bloco do plano ao conteúdo do app; "súmulas e teses" usa os assuntos jurídicos do mesmo dia
function tjRelacionar(it, dia) {
  const M = window.DPE_CRONOGRAMA_MOTOR;
  if (!M || typeof M.relacionarConteudo !== "function" || typeof DECK === "undefined") return null;
  const base = it.s === "jur" ? dia.itens.filter(x => ["const", "adm", "civ", "pc", "pen", "pp"].includes(x.s)) : [it];
  const out = { tema: [], lei: [], juris: [], questoes: [] }, vistos = new Set();
  for (const x of base) {
    const m = TJ_MATERIAS[x.s];
    const leis = [...m[3], ...(x.t.match(/\b(?:Lei|LC|Decreto-Lei)\s*(?:nº\s*)?\d[\d.]*\/\d{4}/g) || [])];
    const r = M.relacionarConteudo(tjFontes(), { titulo: x.t, texto: x.t, leis, juris: [], discIds: tjDiscs(x.s), discNomes: [m[0], ...m[2]] }, 4);
    for (const g of Object.keys(out)) for (const i of r[g].itens) { const k = i.fonte + ":" + i.k; if (!vistos.has(k)) { vistos.add(k); out[g].push(i); } }
  }
  if (it.s === "jur") { out.tema = []; out.lei = []; out.questoes = []; }
  return out;
}
const tjIrAttr = o => `data-tj-ir="${esc(JSON.stringify(o))}"`;
const tjResumo = (s, n = 150) => { const x = String(s || "").replace(/\s+/g, " ").trim(); return x.length > n ? x.slice(0, n) + "…" : x; };
function tjRelItem(x) {
  if (x.fonte === "cartao") { const c = x.item; return `<li><b>${esc(c.tema || "Cartão")}</b><span>${esc(tjResumo(c.frente))}</span><button class="btn small ghost" ${tjIrAttr({ v: "lib", disc: c.disc || "", q: c.id })}>Abrir cartão</button></li>`; }
  if (x.fonte === "leiseca") { const d = x.item, arts = x.artigos || []; return `<li><b>${esc(d.curto || d.nome)}</b><span>${arts.length ? "Artigos: " + arts.map(a => esc(a.r || "art. " + a.a)).join(", ") : esc(x.motivo)}</span><button class="btn small ghost" ${tjIrAttr({ v: "lei", dip: d.id, gi: arts[0]?.gi || 0, q: arts.length === 1 ? String(arts[0].a) : "" })}>Ler na Lei seca</button></li>`; }
  if (x.fonte === "tese") { const t = x.item; return `<li><b>${esc(`${t.tribunal || ""} · ${t.tipo || ""}${t.num ? " " + t.num : ""}`)}</b><span>${esc(tjResumo(t.texto))}</span><button class="btn small ghost" ${tjIrAttr({ v: "tese", q: t.processo || (t.num ? "tema " + t.num : tjResumo(t.texto, 40)) })}>Ver em Teses</button></li>`; }
  if (x.fonte === "sumula") { const s = x.item; return `<li><b>${esc(`${s.tribunal || ""} · ${s.tipo || "Súmula"}`)}</b><span>${esc(tjResumo(s.enunciado))}</span><button class="btn small ghost" ${tjIrAttr({ v: "sum", ramo: s.ramo || "", tri: s.tribunal || "" })}>Ver súmula</button></li>`; }
  if (x.fonte === "prova") { const q = x.item, P = x.prova; return `<li><b>${esc(`${P.nome} · questão ${q.n}`)}</b><span>${esc(tjResumo(q.assunto || q.enunciado))}</span><button class="btn small ghost" ${tjIrAttr({ v: "prova", id: P.id, mat: q.materia || "", n: q.n })}>Resolver</button></li>`; }
  return "";
}
function tjRelHtml(r, it) {
  if (!r) return `<p class="tj-vazio">O motor do Cronograma não carregou. Abra a Biblioteca e busque o assunto.</p>`;
  const grupos = [["tema", "Cartões do assunto"], ["lei", "Lei seca"], ["juris", "Súmulas e jurisprudência"], ["questoes", "Questões"]].filter(([g]) => r[g].length);
  const busca = it.s === "jur" ? "" : `<button class="btn small" ${tjIrAttr({ v: "busca", q: it.t.replace(/\(.*?\)/g, "").split(/[:;,]/)[0].slice(0, 60).trim() })}>Buscar em tudo</button>`;
  if (!grupos.length) return `<p class="tj-vazio">Nada específico no app para este assunto ainda.</p>${busca}`;
  return grupos.map(([g, nome]) => `<div class="tj-rel-g"><b>${nome}</b><ul>${r[g].slice(0, 4).map(tjRelItem).join("")}</ul></div>`).join("") + busca;
}
function tjIr(o) {
  if (!o) return;
  if (o.v === "lib") { S.libView = ""; S.libDisc = o.disc || ""; S.libTema = ""; S.libTipo = ""; S.libStatus = ""; S.libQuery = o.q || ""; go("biblioteca"); }
  else if (o.v === "lei") { S.lsDip = o.dip; S.lsGrp = Number(o.gi) || 0; S.lsQ = o.q || ""; S.lsCaiu = false; go("leiseca"); }
  else if (o.v === "tese") { S.tsQ = o.q || ""; S.tsRamo = ""; S.tsTri = ""; S.tsTipo = ""; S.tsNovas = false; go("teses"); }
  else if (o.v === "sum") { S.defTri = o.tri || ""; S.defRamo = o.ramo || ""; go("defensoria"); }
  else if (o.v === "prova") { S.pvId = o.id; S.pvMat = o.mat || ""; const P = provasDados().find(x => x.id === o.id), l = P ? P.questoes.filter(q => !S.pvMat || q.materia === S.pvMat) : []; S.pvI = Math.max(0, l.findIndex(q => q.n === o.n)); go("prova"); }
  else if (o.v === "busca") { S.buscaQ = o.q || ""; go("busca"); }
  else if (o.v === "tab") go(o.tab);
}
// artigos da lei seca do curso (conjuntos "-dls" do baralho cifrado), ordenados pelo número de questões
function tjMaisCobrados() {
  const dips = (typeof DECK === "undefined" ? [] : DECK.leiseca || []).filter(d => /-dls$/.test(d.id));
  dips.sort((a, b) => TJ_LEIS_ORDEM.indexOf(a.id) - TJ_LEIS_ORDEM.indexOf(b.id));
  return dips.map(d => {
    const arts = [];
    d.grupos.forEach((g, gi) => { let a = null; for (const x of g.itens) {
      if (x.a !== undefined) { a = { a: x.a, n: x.n || 0, gi, fgv: /\bFGV\b/.test(x.rec || "") }; arts.push(a); }
      else if (x.q !== undefined && a && /^FGV\b/.test(x.b || "")) a.fgv = true;
    } });
    const top = arts.filter(a => a.n > 0).sort((p, q) => q.n - p.n || p.gi - q.gi);
    return { d, top: top.slice(0, 10), fgv: arts.filter(a => a.fgv).length, total: arts.length };
  }).filter(x => x.top.length);
}
// atualiza contadores sem redesenhar a tela (mantém aberto o que estiver aberto)
function tjAtualizaProgresso(P, W) {
  const cw = tjContagem(W), pct = cw.t ? Math.round(cw.c / cw.t * 100) : 0;
  const prog = document.querySelector(".tj-prog");
  if (prog) { prog.querySelector("span").textContent = `${cw.c} de ${cw.t} concluídos`; prog.querySelector("i").style.setProperty("--p", pct + "%"); }
  document.querySelector(`.tj-chip[data-tjsem="${W.n}"] i`)?.style.setProperty("--p", pct + "%");
  const tot = P.semanas.reduce((n, w) => { const c = tjContagem(w); n.t += c.t; n.c += c.c; return n; }, { t: 0, c: 0 });
  const b = document.querySelector(".tj-stats div:nth-child(3) b"); if (b) b.textContent = (tot.t ? Math.round(tot.c / tot.t * 100) : 0) + "%";
}
function renderTribunal() {
  ensureAj();
  const P = typeof TJPB_PLANO === "object" && TJPB_PLANO ? TJPB_PLANO : null;
  if (!P) { $("#main").innerHTML = `<h2>Tribunal</h2><p class="sub">O plano do TJPB não está carregado nesta versão.</p>`; return; }
  const hoje = tjHoje(), atual = tjSemanaDe(P, hoje), feitos = tjFeitos();
  if (S.tjSem == null || !P.semanas[S.tjSem]) S.tjSem = atual;
  const W = P.semanas[S.tjSem], fase = P.fases.find(f => f.semanas.includes(W.n)) || P.fases[0];
  const faltam = Math.round((tjData(P.prova) - tjData(hoje)) / 86400000);
  const total = P.semanas.reduce((n, w) => { const c = tjContagem(w); n.t += c.t; n.c += c.c; return n; }, { t: 0, c: 0 });
  const cw = tjContagem(W);
  const chips = P.fases.map(f => `<div class="tj-fase"><span>${esc(f.nome)}</span><div>${f.semanas.map(n => {
    const w = P.semanas[n], c = tjContagem(w), pct = c.t ? Math.round(c.c / c.t * 100) : 0;
    return `<button class="tj-chip${n === atual && faltam >= 0 ? " hoje" : ""}" data-tjsem="${n}" aria-pressed="${n === W.n}"><b>S${n}</b><small>${tjDdMm(w.dias[0].data)}</small><i style="--p:${pct}%"></i></button>`;
  }).join("")}</div></div>`).join("");
  const dias = W.dias.map((d, di) => {
    const dt = tjData(d.data), ehHoje = d.data === hoje;
    return `<article class="tj-dia${ehHoje ? " hoje" : ""}"><h4><span>${TJ_SEMANA[dt.getDay()]} <span class="tj-mono">${tjDdMm(d.data)}</span></span>${ehHoje ? `<span class="tj-hoje">Hoje</span>` : ""}</h4><ul>${d.itens.map((x, ii) => {
      const id = tjId(W.n, di, ii), m = TJ_MATERIAS[x.s] || TJ_MATERIAS.meta;
      const rel = TJ_ASSUNTO.includes(x.s) || x.s === "jur";
      return `<li class="tj-item${x.alerta ? " alerta" : ""}"><input type="checkbox" id="tj-${id}" data-tjfeito="${id}" ${feitos[id] ? "checked" : ""}><label for="tj-${id}"><span class="tj-meta"><span class="tj-mono">${esc(x.b)}</span><span class="tj-tag" data-k="${m[1]}">${esc(m[0])}</span></span><span class="tj-txt">${esc(x.t)}</span></label>${rel ? `<details class="tj-rel" data-tjrel="${di}:${ii}"><summary>No app para este bloco</summary><div class="tj-rel-c"></div></details>` : ""}</li>`;
    }).join("")}</ul></article>`;
  }).join("");
  const mc = tjMaisCobrados();
  const leis = mc.length ? `<div class="tj-sec"><h3>Lei seca do curso: artigos que mais caem</h3><span class="count">número de questões de 2022 a 2026</span></div>
    <div class="tj-leis">${mc.map(L => `<section class="tj-lei"><header><b>${esc(L.d.curto)}</b><small>${plural(L.total, "artigo", "artigos")}${L.fgv ? " · " + L.fgv + " com FGV" : ""}</small></header><ol>${L.top.map(a => `<li><button class="tj-art" ${tjIrAttr({ v: "lei", dip: L.d.id, gi: a.gi, q: String(a.a) })}>Art. ${esc(a.a)}</button><span class="tj-mono">${a.n} q.</span>${a.fgv ? `<span class="tj-fgv">FGV</span>` : ""}</li>`).join("")}</ol></section>`).join("")}</div>`
    : `<p class="tj-nota">A lei seca do curso (grifos, questões por artigo e assertivas das bancas) aparece aqui depois de inserida no baralho cifrado.</p>`;
  $("#main").innerHTML = `
    <section class="tj-hero">
      <p class="tj-kicker">Tribunal de Justiça · TJPB 2026 · FGV</p>
      <h2>Analista Judiciário · Área Judiciária</h2>
      <p>${esc(P.nota)}</p>
      <div class="tj-stats">
        <div><b>${faltam > 0 ? faltam : faltam === 0 ? "Hoje" : "—"}</b><span>${faltam > 0 ? (faltam === 1 ? "dia para a prova" : "dias para a prova") : faltam === 0 ? "é a prova" : "prova realizada"}</span></div>
        <div><b>${tjDdMm(P.prova)}</b><span>${esc(P.provaHora)} · ${esc(P.local)}</span></div>
        <div><b>${total.t ? Math.round(total.c / total.t * 100) : 0}%</b><span>do plano feito</span></div>
      </div>
    </section>
    <div class="tj-atalhos">
      <button class="btn" ${tjIrAttr({ v: "tab", tab: "cronograma" })}>Cronograma por assuntos</button>
      <button class="btn" ${tjIrAttr({ v: "tab", tab: "leiseca" })}>Lei seca</button>
      <a class="btn" href="plano-tjpb-2026.html" target="_blank" rel="noopener">Plano estratégico completo</a>
    </div>
    <p class="tj-nota">No Cronograma, escolha <b>TJPB · Analista Judiciário – Área Judiciária</b> para estudar pelos 84 assuntos do Anexo I com o conteúdo do app em cada bloco.</p>
    <div class="tj-fases" role="group" aria-label="Escolha a semana">${chips}</div>
    <div class="tj-semana">
      <div><span class="tj-tag" data-k="pen">${esc(fase.nome)}</span><h3>Semana ${W.n} · ${tjDdMm(W.dias[0].data)} a ${tjDdMm(W.dias[W.dias.length - 1].data)}</h3><p>${esc(fase.desc)}</p></div>
      <div class="tj-prog"><span class="tj-mono">${cw.c} de ${cw.t} concluídos</span><i style="--p:${cw.t ? Math.round(cw.c / cw.t * 100) : 0}%"></i></div>
      ${atual !== W.n ? `<button class="btn small" data-tjsem="${atual}">Ir para esta semana</button>` : ""}
    </div>
    <div class="tj-dias">${dias}</div>
    ${leis}
    <p class="src" style="margin-top:14px">Edital nº 01/2026 do TJPB (retificado em 29/10/2026). Estimativas de incidência e metas são hipóteses de estudo. Confira a redação vigente das leis.</p>`;
  document.querySelectorAll("[data-tjsem]").forEach(b => b.onclick = () => { S.tjSem = +b.dataset.tjsem; renderTribunal(); });
  document.querySelectorAll("[data-tjfeito]").forEach(b => b.onchange = () => {
    const f = tjFeitos(); if (b.checked) f[b.dataset.tjfeito] = 1; else delete f[b.dataset.tjfeito];
    queue("ajustes"); tjAtualizaProgresso(P, W);
  });
  document.querySelectorAll("details[data-tjrel]").forEach(dt => dt.addEventListener("toggle", () => {
    const alvo = dt.querySelector(".tj-rel-c"); if (!dt.open || alvo.dataset.ok) return;
    const [di, ii] = dt.dataset.tjrel.split(":").map(Number), dia = W.dias[di];
    alvo.innerHTML = tjRelHtml(tjRelacionar(dia.itens[ii], dia), dia.itens[ii]); alvo.dataset.ok = "1";
    alvo.querySelectorAll("[data-tj-ir]").forEach(b => b.onclick = e => { e.preventDefault(); let o = null; try { o = JSON.parse(b.dataset.tjIr); } catch (_) {} tjIr(o); });
  }));
  document.querySelectorAll(".tj-atalhos [data-tj-ir], .tj-leis [data-tj-ir]").forEach(b => b.onclick = e => { e.preventDefault(); let o = null; try { o = JSON.parse(b.dataset.tjIr); } catch (_) {} tjIr(o); });
}
// ===================== fim da aba Tribunal =====================
