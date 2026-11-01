// Review DPE · organização das telas: um caminho claro para começar e o resto recolhido.
//
// Hoje abre com o "Próximo passo": um botão para o que fazer agora (ler os trechos do assunto pendente, revisar,
// retomar). Abaixo, um roteiro de três passos, na ordem em que o app funciona:
//   1. Estude o assunto de hoje (cada assunto com botões diretos: trechos, lei seca, questões; e "Marcar como estudado");
//   2. Revise os cartões (só entram cartões de assunto já estudado, na direção escolhida);
//   3. Pratique com questões (opcional).
// O que é acompanhamento (semana, fila, reflexão, recursos, instalar) fica em "Mais", recolhido.
// Estudar mostra primeiro o que está disponível; modos ainda sem conteúdo e leituras extras ficam recolhidos.
// A barra de baixo fica com o essencial, com o Plano (Cronograma) fixo ao lado de Hoje; Informativos, Defensoria e
// Teses continuam em Estudar. Os contadores do topo dizem o que contam ("dias para a prova", "dias seguidos").
// Só reorganiza o que as outras partes do app já desenharam (os mesmos elementos e ações): nada de estudo muda aqui.
(function () {
  "use strict";
  if (window.__organizacaoInstalada) return;
  const $o = (s, r = document) => r.querySelector(s);
  const ABAS_RECOLHIDAS = ["informativos", "defensoria", "teses"];   // continuam em Estudar → Ler e aprender
  const LEITURA_PRINCIPAL = ["goEb", "leiseca", "informativos", "tribunal"];
  const direcao = () => (typeof S === "object" && S.ajustes && S.ajustes.direcao === "tj") ? "tj" : "dpe";
  const escO = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const salvar = () => { try { if (typeof queue === "function") queue("ajustes"); } catch (e) {} };

  function estilo() {
    if ($o("#orgEstilo")) return;
    const st = document.createElement("style"); st.id = "orgEstilo";
    st.textContent = `
.hoje-guia { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 16px; margin: 4px 0 14px; }
.hg-topo { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; margin-bottom: 4px; }
.hg-topo h2 { margin: 2px 0 0; font: 700 1.35rem/1.2 var(--f-ui); }
.hg-topo small { color: var(--accent); font: 700 .72rem var(--f-ui); letter-spacing: .08em; text-transform: uppercase; }
.hg-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.hg-dir { display: inline-flex; border: 1px solid var(--line); border-radius: 999px; padding: 2px; margin: 8px 0 4px; background: var(--bg); }
.hg-dir button { border: 0; background: none; color: var(--muted); font: 600 .82rem var(--f-ui); padding: 6px 12px; border-radius: 999px; cursor: pointer; min-height: 32px; }
.hg-dir button[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); }
.hg-dir-txt { color: var(--muted); font-size: .8rem; margin: 0 0 6px; }
.hg-progresso { color: var(--muted); font-size: .85rem; margin: 2px 0 10px; }
.hg-proximo { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; background: var(--accent-soft); border: 1px solid var(--accent); border-radius: 16px; padding: 14px 16px; margin: 4px 0 6px; }
.hg-proximo-tx { display: grid; gap: 2px; min-width: 0; flex: 1 1 260px; }
.hg-proximo-tx small { color: var(--accent); font: 700 .7rem var(--f-ui); letter-spacing: .08em; text-transform: uppercase; }
.hg-proximo-tx b { font: 700 1.1rem/1.3 var(--f-ui); color: var(--ink); }
.hg-proximo-tx span { color: var(--muted); font-size: .85rem; }
.hg-proximo-bt { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.hg-proximo-bt .btn.primary { min-height: 44px; padding: 10px 18px; font-size: 1rem; }
.hg-passos { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 12px; }
.hg-passo { display: grid; grid-template-columns: 34px 1fr; gap: 10px; border: 1px solid var(--line); border-radius: 16px; padding: 12px; background: var(--bg); }
.hg-passo[data-estado="agora"] { border: 2px solid var(--accent); background: var(--surface); }
.hg-passo[data-estado="feito"] { opacity: .85; }
.hg-num { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font: 700 .95rem var(--f-ui); background: var(--accent-soft); color: var(--accent); }
.hg-passo[data-estado="agora"] .hg-num { background: var(--accent); color: var(--accent-ink); }
.hg-passo[data-estado="feito"] .hg-num { background: var(--ok-soft); color: var(--ok); }
.hg-corpo { min-width: 0; }
.hg-corpo > h3 { margin: 3px 0 2px; font: 700 1.02rem/1.3 var(--f-ui); text-transform: none; letter-spacing: 0; color: var(--ink); }
.hg-corpo > p.hg-dica { margin: 0 0 8px; color: var(--muted); font-size: .86rem; line-height: 1.4; }
.hoje-guia .hg-corpo > .cr-today { margin: 6px 0 0 !important; border: 0 !important; padding: 0 !important; background: none !important; box-shadow: none !important; }
.hoje-guia .hg-corpo > .cr-today:not(.cr-hoje-conteudo) > div { display: none; }
.hoje-guia .cr-today { margin: 6px 0 0 !important; border: 0 !important; padding: 0 !important; background: none !important; box-shadow: none !important; }
.hoje-guia .cr-hoje-conteudo > div:first-child > b, .hoje-guia .cr-hoje-conteudo > div:first-child > p, .hoje-guia .cr-hoje-conteudo > div:first-child > small, .hoje-guia .cr-app-resumo { display: none; }
.hoje-guia .cr-hoje-conteudo { display: flex !important; flex-direction: column; gap: 0; }
.hoje-guia .cr-hoje-conteudo > div:first-child { display: none; }
.hoje-guia .cr-hoje-conteudo > .cr-hoje-blocos { margin-top: 0; }
.hoje-guia .cr-hoje-conteudo #goCronograma { order: 2; align-self: flex-start; margin-top: 10px; min-height: 32px; padding: 4px 10px; font-size: .8rem; }
.hg-feito-det > summary { cursor: pointer; color: var(--accent); font: 600 .86rem var(--f-ui); padding: 4px 0; }
.hg-linha { margin: 2px 0 8px; font-size: .9rem; color: var(--ink); }
.hg-acoes { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.hoje-mais .hg-metas { margin: 0 4px 10px; }
.hg-corpo .cr-today > div:first-child small, .hg-corpo .cr-today .cr-eyebrow { display: none; }
.hg-corpo .cr-hoje-blocos { margin-top: 8px; }
.hg-corpo .hero[hidden] { display: none !important; }
.hoje-mais { margin: 14px 0; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); }
.hoje-mais > summary { cursor: pointer; padding: 14px 16px; font: 600 .95rem var(--f-ui); list-style: none; display: flex; justify-content: space-between; gap: 10px; }
.hoje-mais > summary::-webkit-details-marker { display: none; }
.hoje-mais > summary::after { content: "▾"; color: var(--muted); }
.hoje-mais[open] > summary::after { content: "▴"; }
.hoje-mais > summary small { color: var(--muted); font-weight: 400; }
.hoje-mais-corpo { padding: 0 12px 6px; }
.hoje-mais-corpo .rd-dashboard { display: block; }
.es-recolhido { margin: 10px 0 4px; border: 1px dashed var(--line); border-radius: 14px; padding: 4px 12px; }
.es-recolhido > summary { cursor: pointer; padding: 10px 0; font: 600 .9rem var(--f-ui); color: var(--muted); }
.es-recolhido .es-grid { margin-bottom: 10px; }
@media (max-width: 560px) {
  .hoje-guia { padding: 12px; border-radius: 16px; }
  .hg-passo { display: block; padding: 12px 10px; }
  .hg-passo .hg-num { float: left; width: 26px; height: 26px; margin: 0 8px 0 0; font-size: .85rem; }
  .hg-corpo > h3 { line-height: 26px; margin: 0; }
  .hg-corpo > p.hg-dica { clear: left; margin-top: 6px; }
  .hg-corpo > *:not(h3) { clear: left; }
  .hoje-guia .cr-bloco { padding: 12px 10px; }
  .hg-proximo { padding: 12px; }
  .hg-proximo-bt { width: 100%; }
  .hg-proximo-bt .btn.primary { flex: 1 1 auto; }
}
`;
    document.head.appendChild(st);
  }

  // ---------- barra de navegação ----------
  function navegacao() {
    const tabs = $o("#tabs"); if (!tabs) return;
    for (const aba of ABAS_RECOLHIDAS) { const b = $o(`#tab-${aba}`); if (b) b.hidden = true; }
    const trib = $o("#tab-tribunal"); if (trib) trib.hidden = direcao() !== "tj";
    if (!$o("#tab-cronograma")) {   // o plano (Cronograma) com lugar fixo na barra, logo depois de Hoje
      const b = document.createElement("button");
      b.setAttribute("role", "tab"); b.dataset.tab = "cronograma"; b.id = "tab-cronograma"; b.setAttribute("aria-selected", String(typeof S === "object" && S.tab === "cronograma"));
      b.innerHTML = '<svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 13.5h3M13.5 13.5h3M7.5 17h3"/></svg><span>Plano</span>';
      const hoje = $o("#tab-hoje"); if (hoje) hoje.after(b); else tabs.prepend(b);
    }
    // só grava quando muda: a barra é observada (aria-selected) e regravar o mesmo valor redesenharia sem fim
    const cr = $o("#tab-cronograma"), sel = String(typeof S === "object" && S.tab === "cronograma");
    if (cr && cr.getAttribute("aria-selected") !== sel) cr.setAttribute("aria-selected", sel);
    // aba aberta que não está na barra: marca Estudar, de onde ela se abre
    const visiveis = [...tabs.querySelectorAll("button[role=tab]")].filter(b => !b.hidden);
    if (typeof S === "object" && S.tab && !visiveis.some(b => b.getAttribute("aria-selected") === "true")) {
      const est = $o("#tab-sessao"); if (est && S.tab !== "ajustes" && S.tab !== "busca") est.setAttribute("aria-selected", "true");
    }
  }

  // ---------- Hoje: roteiro em três passos ----------
  function passo(n, titulo, dica, estado) {
    const li = document.createElement("li"); li.className = "hg-passo"; li.dataset.estado = estado; li.dataset.passo = String(n);
    li.innerHTML = `<span class="hg-num" aria-hidden="true">${estado === "feito" ? "✓" : n}</span><div class="hg-corpo"><h3>${escO(titulo)}</h3>${dica ? `<p class="hg-dica">${escO(dica)}</p>` : ""}</div>`;
    return li;
  }
  // um único "próximo passo": o app decide a ação seguinte do dia
  function proximoPasso(guia, { cr, temPlano, R }) {
    const box = guia.querySelector(".hg-proximo"); if (!box) return;
    const pendente = cr ? [...cr.querySelectorAll(".cr-bloco")].find(b => { const c = b.querySelector("[data-cr-concluir]"); return c && !c.checked; }) : null;
    let titulo = "", contexto = "", botao = "", acao = null, extra = "";
    if (pendente) {
      const prim = pendente.querySelector(".cr-acoes .btn.primary") || pendente.querySelector(".cr-acoes .btn");
      titulo = pendente.querySelector("h4")?.textContent.trim() || "Assunto de hoje";
      contexto = pendente.querySelector("small")?.textContent.trim() || "";
      botao = prim ? prim.textContent.trim() : "Abrir o assunto";
      acao = () => prim ? prim.click() : go("cronograma");
      extra = `<button type="button" class="btn small" data-hg-marcar>✓ Já estudei: marcar</button>`;
      box._marcar = () => { const c = pendente.querySelector("[data-cr-concluir]"); if (c) { c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); } };
    } else if (R.aberta) { titulo = "Bloco de revisão em andamento"; botao = "Retomar a revisão"; acao = () => $o("#start")?.click(); }
    else if (R.restante && !R.concluida) { titulo = `Revisar ${R.n} ${R.n === 1 ? "cartão" : "cartões"}`; contexto = `cerca de ${R.min} min · revisão espaçada do que você já estudou`; botao = "Começar revisão"; acao = () => $o("#start")?.click(); }
    else if (!temPlano) { box.hidden = true; return; }   // sem plano, o passo 1 (Monte seu cronograma) já é o próximo passo
    else { titulo = "Tudo feito por hoje 🎉"; contexto = "Se quiser, pratique com questões."; botao = "Praticar questões"; acao = () => { S.session = null; go("sessao"); }; }
    box.innerHTML = `<div class="hg-proximo-tx"><small>Próximo passo</small><b>${escO(titulo)}</b>${contexto ? `<span>${escO(contexto)}</span>` : ""}</div><div class="hg-proximo-bt"><button type="button" class="btn primary" data-hg-proximo>${escO(botao)}</button>${extra}</div>`;
    box.hidden = false;
    box.querySelector("[data-hg-proximo]").addEventListener("click", acao);
    box.querySelector("[data-hg-marcar]")?.addEventListener("click", () => box._marcar && box._marcar());
  }
  function organizarHoje(main) {
    const hero = main.querySelector(".hero");
    if (!hero) return;
    let guia = main.querySelector(":scope > .hoje-guia");
    if (!guia) {
      const cr = main.querySelector("#cronogramaHoje");
      const temPlano = !!(cr && cr.classList.contains("cr-hoje-conteudo"));
      const caixas = cr ? [...cr.querySelectorAll("[data-cr-concluir]")] : [];
      const estudou = temPlano && caixas.length > 0 && caixas.every(c => c.checked);
      const diaLivre = temPlano && !caixas.length;
      const R = { restante: 0, concluida: false, aberta: false, n: 0, min: 0, feitos: 0, meta: 0 };
      try {
        const p = plan(), b = selecionarBloco(p), d = rotinaDiaria();
        Object.assign(R, { restante: p.due.length + p.newToday.length, concluida: !!d.concluida, n: b.q.length, min: b.minutos, feitos: Math.min(d.feitos, d.meta), meta: d.meta });
        R.aberta = !!(S.session && S.session.ui && S.session.modo === "plano" && S.session.dia === today());
      } catch (e) {}
      const dir = direcao();
      const h = new Date().getHours(), oi = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
      guia = document.createElement("section"); guia.className = "hoje-guia"; guia.setAttribute("aria-label", "Seu estudo de hoje");
      guia.innerHTML = `<div class="hg-topo"><div><small>${oi}</small><h2>Seu estudo de hoje</h2></div><span class="hg-pills"></span></div>
        <div class="hg-dir" role="group" aria-label="Direcionamento do estudo"><button type="button" data-hg-dir="dpe" aria-pressed="${dir === "dpe"}">Defensoria</button><button type="button" data-hg-dir="tj" aria-pressed="${dir === "tj"}">Tribunal · TJPB</button></div>
        <p class="hg-progresso"></p><div class="hg-proximo" hidden></div><ol class="hg-passos"></ol>`;
      const pills = hero.querySelector(".pills");
      if (pills) {   // contadores com legenda
        for (const pl of pills.querySelectorAll(".pill")) {
          const n = +((pl.textContent.match(/\d+/) || [0])[0]), tt = pl.getAttribute("title") || "";
          if (/prova/.test(tt)) pl.textContent = `🎯 ${n} ${n === 1 ? "dia" : "dias"} para a prova`;
          else if (/seguidos/.test(tt)) pl.textContent = `🔥 ${n} ${n === 1 ? "dia seguido" : "dias seguidos"}`;
        }
        guia.querySelector(".hg-pills").appendChild(pills);
      }
      const nAss = caixas.length, nFeitos = caixas.filter(c => c.checked).length;
      guia.querySelector(".hg-progresso").textContent = temPlano
        ? (nAss ? `Hoje: ${nFeitos} de ${nAss} ${nAss === 1 ? "assunto estudado" : "assuntos estudados"} · ${R.feitos} de ${R.meta} cartões revisados` : `Hoje é dia livre no seu cronograma · ${R.feitos} de ${R.meta} cartões revisados`)
        : "";
      guia.querySelector(".hg-progresso").hidden = !temPlano;
      const ol = guia.querySelector(".hg-passos");
      // passo 1: estudar o conteúdo
      const p1 = temPlano
        ? passo(1, diaLivre ? "Dia livre no seu cronograma" : estudou ? (nAss > 1 ? "Assuntos de hoje estudados" : "Assunto de hoje estudado") : (nAss > 1 ? `Estude os ${nAss} assuntos de hoje` : "Estude o assunto de hoje"), diaLivre ? "Seu ciclo continua no próximo dia de estudo." : estudou ? "Os cartões deles já estão na sua revisão." : "Use os botões de cada assunto. Ao terminar, marque como estudado: os cartões dele entram na revisão.", estudou || diaLivre ? "feito" : "agora")
        : passo(1, "Monte seu cronograma", dir === "tj" ? "Escolha o edital do TJPB, as horas e os dias. O app indica o assunto de cada dia." : "Escolha o edital da sua Defensoria, as horas e os dias. O app indica o assunto de cada dia.", "agora");
      if (cr && temPlano && (estudou || diaLivre)) {   // passo feito: o conteúdo fica recolhido para o passo 2 aparecer
        const det = document.createElement("details"); det.className = "hg-feito-det";
        det.innerHTML = `<summary>${diaLivre ? "Ver o cronograma" : "Ver o assunto de hoje"}</summary>`; det.appendChild(cr);
        p1.querySelector(".hg-corpo").appendChild(det);
      } else if (cr) p1.querySelector(".hg-corpo").appendChild(cr);
      else p1.querySelector(".hg-corpo").insertAdjacentHTML("beforeend", `<button type="button" class="btn primary small" data-hg-ir="cronograma">Abrir o Cronograma</button>`);
      ol.appendChild(p1);
      // passo 2: revisar (resumo curto; o painel original fica oculto aqui dentro, com os mesmos botões e metas)
      const vazio = temPlano ? "Os cartões do assunto entram aqui depois que você marcar “Estudei este assunto”." : "Os cartões aparecem aqui depois que você estudar o primeiro assunto do cronograma.";
      const p2 = passo(2, "Revise os cartões", R.restante || R.aberta || R.concluida ? "" : vazio, R.concluida ? "feito" : ((R.restante || R.aberta) && (estudou || diaLivre || !temPlano)) ? "agora" : "depois");
      const c2 = p2.querySelector(".hg-corpo");
      if (R.aberta) c2.insertAdjacentHTML("beforeend", `<div class="hg-acoes"><button type="button" class="btn primary" data-hg-start>Retomar bloco</button></div>`);
      else if (R.concluida) c2.insertAdjacentHTML("beforeend", `<p class="hg-linha">Meta de hoje cumprida: ${R.feitos}/${R.meta} cartões.</p>${R.restante ? `<div class="hg-acoes"><button type="button" class="btn small" data-hg-start>Revisar mais (opcional)</button></div>` : ""}`);
      else if (R.restante) c2.insertAdjacentHTML("beforeend", `<p class="hg-linha"><b>${R.n} ${R.n === 1 ? "cartão" : "cartões"}</b> no próximo bloco · cerca de ${R.min} min · meta de hoje ${R.feitos}/${R.meta}</p><div class="hg-acoes"><button type="button" class="btn primary" data-hg-start>Começar revisão</button><button type="button" class="btn ghost small" data-hg-leve>Hoje, só 5 cartões</button></div>`);
      const metas = hero.querySelector(".rd-goal-details") || null;
      hero.hidden = true; hero.classList.add("hg-original"); c2.appendChild(hero);
      ol.appendChild(p2);
      if (metas) { metas.open = false; metas.classList.add("hg-metas"); guia.dataset.metas = "1"; guia._metas = metas; }
      // passo 3: praticar
      const p3 = passo(3, "Pratique com questões (opcional)", "Questões de prova, simulados e treino de 2ª fase.", "depois");
      p3.querySelector(".hg-corpo").insertAdjacentHTML("beforeend", `<button type="button" class="btn small" data-hg-ir="sessao">Abrir questões e modos de estudo</button>`);
      ol.appendChild(p3);
      main.prepend(guia);
      proximoPasso(guia, { cr, temPlano, R });
      guia.querySelectorAll("[data-hg-dir]").forEach(b => b.addEventListener("click", () => {
        if (!S.ajustes || S.ajustes.direcao === b.dataset.hgDir) return;
        S.ajustes.direcao = b.dataset.hgDir; salvar();
        if (typeof toast === "function") toast(`Direção: ${b.dataset.hgDir === "tj" ? "Tribunal (TJPB)" : "Defensoria"}. Cartões novos vêm dos assuntos estudados nesta direção.`);
        renderHoje();
      }));
      guia.querySelectorAll("[data-hg-ir]").forEach(b => b.addEventListener("click", () => { if (b.dataset.hgIr === "sessao") S.session = null; go(b.dataset.hgIr); }));
      guia.querySelectorAll("[data-hg-start]").forEach(b => b.addEventListener("click", () => $o("#start")?.click()));
      guia.querySelectorAll("[data-hg-leve]").forEach(b => b.addEventListener("click", () => $o("#hojeLeve")?.click()));
    }
    // o restante vai para "Mais" (inclusive o que outro módulo acrescentar depois)
    let mais = main.querySelector(":scope > .hoje-mais");
    if (!mais) {
      mais = document.createElement("details"); mais.className = "hoje-mais"; mais.id = "hojeMais";
      if (S.hojeMaisAberto) mais.open = true;
      mais.innerHTML = `<summary><span>Mais: meta, semana, fila e recursos</span></summary><div class="hoje-mais-corpo"></div>`;
      mais.addEventListener("toggle", () => { S.hojeMaisAberto = mais.open; });
      guia.after(mais);
    }
    const corpo = mais.querySelector(".hoje-mais-corpo");
    if (guia._metas && guia._metas.parentNode !== corpo) corpo.prepend(guia._metas);   // ajustar a meta diária: em "Mais"
    for (const el of [...main.children]) {
      if (el === guia || el === mais || el.classList.contains("mv-assina")) continue;
      if (el.classList.contains("rd-welcome")) { el.remove(); continue; }      // a saudação já está no roteiro
      if (el.classList.contains("note") && el.classList.contains("warn")) continue;   // aviso de backup continua à vista (logo antes de "Mais")
      if (el.querySelector && el.querySelector("#goEstudar")) { el.remove(); continue; }   // repetia o passo 3
      corpo.appendChild(el);
    }
    const aviso = main.querySelector(":scope > .note.warn"); if (aviso && mais.previousElementSibling !== aviso) mais.before(aviso);
  }

  // ---------- Estudar: primeiro o disponível ----------
  function recolher(grade, tiles, titulo) {
    if (!tiles.length) return;
    const d = document.createElement("details"); d.className = "es-recolhido";
    d.innerHTML = `<summary>${escO(titulo)} (${tiles.length})</summary><div class="es-grid"></div>`;
    const g = d.querySelector(".es-grid"); tiles.forEach(t => g.appendChild(t));
    grade.after(d);
  }
  function organizarEstudar(main) {
    const grades = [...main.querySelectorAll(":scope > .es-grid")];
    if (!grades.length || grades[0].dataset.org === "1") return;   // a tela nova (innerHTML) traz grades sem a marca
    grades[0].dataset.org = "1";
    const [ler, ...resto] = grades;
    if (ler) {
      const tiles = [...ler.querySelectorAll(":scope > .es-t")];
      const chave = t => t.id || t.dataset.estab || "";
      const extras = tiles.filter(t => !LEITURA_PRINCIPAL.includes(chave(t)) || (chave(t) === "tribunal" && direcao() !== "tj"));
      // conteúdo específico (Aprofundamento) primeiro
      const eb = tiles.find(t => t.id === "goEb"); if (eb) ler.prepend(eb);
      recolher(ler, extras, "Mais materiais de leitura");
    }
    for (const g of resto) {
      const off = [...g.querySelectorAll(":scope > .es-t[disabled]")];
      if (!off.length) continue;
      const sec = g.previousElementSibling && g.previousElementSibling.classList.contains("es-sec") ? g.previousElementSibling : null;
      if (off.length === g.querySelectorAll(":scope > .es-t").length && sec && sec.id === "es-erros") {
        // nenhum erro ainda: a seção inteira some, com o atalho
        sec.hidden = true; g.hidden = true;
        const at = main.querySelector('.es-atalhos a[href="#es-erros"]'); if (at) at.hidden = true;
        continue;
      }
      recolher(g, off, "Modos que liberam conforme você estuda");
    }
    const prox = main.querySelector(":scope > .es-hoje");
    if (prox && prox.querySelector("#esStart[disabled]")) prox.hidden = true;   // sem cartões: o caminho está em Hoje
  }

  function organizar() {
    try {
      navegacao();
      if (typeof S !== "object" || S.mode === "loading") return;
      const main = $o("#main"); if (!main) return;
      if (S.tab === "hoje") organizarHoje(main);
      else if (S.tab === "sessao" && !S.session) organizarEstudar(main);
    } catch (e) { console.warn("organização da tela", e); }
  }
  function instalar() {
    window.__organizacaoInstalada = true;
    estilo();
    const main = $o("#main");
    // depois que todas as partes do app desenham a tela (microtarefa), organiza; mudanças dentro de #main repetem
    let agendado = false;
    const agendar = () => { if (agendado) return; agendado = true; Promise.resolve().then(() => { agendado = false; organizar(); }); };
    new MutationObserver(agendar).observe(main, { childList: true });
    const nav = $o("#tabs"); if (nav) new MutationObserver(agendar).observe(nav, { attributes: true, subtree: true, attributeFilter: ["aria-selected"] });
    window.DPE_ORGANIZAR = organizar;
    organizar();
  }
  (function esperar() {
    try { if (typeof S === "object" && typeof renderHoje === "function" && typeof go === "function" && $o("#main") && $o("#tabs")) { instalar(); return; } } catch (e) {}
    setTimeout(esperar, 150);
  })();
})();
