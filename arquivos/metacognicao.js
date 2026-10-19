// Review DPE · Metacognição: planejar, monitorar e refletir, sem mudar o FSRS.
// O CI carrega este arquivo depois dos scripts do app. A instalação espera o desbloqueio.
// S.ajustes mantém mcPlanos, reflexoes e metaOn no backup e na sincronização existentes.
(function () {
  "use strict";
  const SEM_PLANO = ["simulado", "tese2f"];
  // As chaves antigas são preservadas nas reflexões; os rótulos não declaram domínio.
  const VEREDITOS = {
    il: { t: "Certeza não confirmada", d: "A confiança estava alta, mas o resultado não se confirmou. Confira a explicação." },
    la: { t: "Dúvida confirmada", d: "Você percebeu uma dúvida e encontrou um ponto a revisar." },
    in: { t: "Acerto sem certeza", d: "O resultado foi positivo, mas você ainda tinha dúvida. Teste novamente após um intervalo." },
    do: { t: "Acerto com confiança", d: "Confiança e resultado coincidiram nesta tentativa. Isso não comprova domínio duradouro." },
  };
  const ORDEM = ["il", "la", "in", "do"];
  const SUGESTOES = ["Testar o que eu acho que já sei", "Revisar os pontos em que errei", "Fixar a base de um tema novo"];
  let planoAtivo = false, instalado = false;
  const lista = a => Array.isArray(a) ? a : [];
  const veredito = (conf, ok) => ok ? (conf === 2 ? "do" : "in") : (conf === 2 ? "il" : "la");
  const hojeDe = ts => Number.isFinite(ts) && dayOf(ts) === today();
  const planoHoje = () => {
    const e = lista((S.ajustes || {}).mcPlanos).slice().reverse().find(x => Array.isArray(x) && hojeDe(x[0]) && typeof x[1] === "string" && x[1].trim());
    return e ? e[1].trim().slice(0, 140) : "";
  };
  const ultimaReflexao = () => lista(S.ajustes.reflexoes).slice().reverse().find(r => r && r.mudar);
  const frenteDe = c => (c.tipo === "multipla_escolha" ? parseMC(c.frente).stem : c.frente).replace(/^Certo ou errado(\s*\([^)]*\))?:\s*/i, "");
  const curto = (t, n) => { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
  const iniciarDados = (s, obj = "") => (s.mc = { obj, res: [] });

  function resultado(u, g) {
    if (typeof resultadoConfianca === "function") return resultadoConfianca(u, g);
    // Compatibilidade com um HTML anterior que ainda não expõe o helper.
    const c = byId[u.id];
    const gabarito = c && ["multipla_escolha", "pegadinha"].includes(c.tipo) && typeof u.correct === "boolean";
    return { ok: gabarito ? u.correct : g > 1, fonte: gabarito ? "gabarito" : "autoavaliacao" };
  }

  function css() {
    const st = document.createElement("style");
    st.id = "mcStyle";
    st.textContent = `
.mc-steps { display:flex; flex-wrap:wrap; gap:6px; list-style:none; padding:0; margin:0 0 14px; font-size:.8rem; color:var(--muted); }
.mc-steps li { display:flex; align-items:center; gap:6px; padding:4px 10px 4px 4px; border-radius:999px; border:1px solid var(--line); background:var(--surface); }
.mc-steps li b { width:20px; height:20px; border-radius:50%; display:grid; place-items:center; font-size:.72rem; background:var(--line); color:var(--ink); }
.mc-steps li.on { color:var(--accent); border-color:var(--accent); } .mc-steps li.on b { background:var(--accent); color:var(--accent-ink); }
.mc-steps li.ok b { background:var(--ok); color:#fff; }
.mc-plan { max-width:620px; margin:8px auto; }
.mc-eyebrow { font-size:.74rem; letter-spacing:.08em; text-transform:uppercase; color:var(--accent); font-weight:600; margin:0 0 4px; }
.mc-plan h2 { margin:0 0 6px; font-size:1.35rem; line-height:1.25; } .mc-lead { color:var(--muted); margin:0 0 14px; font-size:.95rem; }
.mc-chips { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 10px; }
.mc-chips button { font:inherit; font-size:.85rem; padding:7px 12px; border-radius:999px; border:1px solid var(--line); background:var(--surface); color:var(--ink); cursor:pointer; }
.mc-chips button[aria-pressed="true"] { background:var(--accent); color:var(--accent-ink); border-color:var(--accent); }
.mc-field { display:grid; gap:4px; margin:0 0 10px; font-size:.85rem; color:var(--muted); }
.mc-field input, .mc-field textarea { font:.95rem var(--f-ui); padding:9px 11px; border:1px solid var(--line); border-radius:10px; background:var(--bg); color:var(--ink); resize:vertical; max-width:100%; box-sizing:border-box; }
.mc-how { padding-left:20px; margin:12px 0; font-size:.88rem; } .mc-how li { margin:5px 0; }
.mc-ontem { background:var(--amber-soft); border-radius:12px; padding:10px 12px; font-size:.88rem; margin:0 0 12px; overflow-wrap:anywhere; }
.mc-strip { display:flex; flex-wrap:wrap; gap:6px 10px; align-items:center; font-size:.82rem; color:var(--muted); margin:6px 0 8px; overflow-wrap:anywhere; }
.mc-strip .mc-obj { color:var(--ink); } .mc-ved { display:inline-flex; padding:4px 10px; border-radius:999px; font-size:.8rem; background:var(--accent-soft); color:var(--ink); }
.mc-ved.il { background:var(--bad-soft); color:var(--bad); } .mc-ved.la { background:var(--info-soft); color:var(--info); }
.mc-ved.in { background:var(--amber-soft); color:var(--amber); } .mc-ved.do { background:var(--ok-soft); color:var(--ok); }
.mc-depois { text-align:left; max-width:560px; margin:18px auto 6px; background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:16px; }
.mc-depois h3 { margin:0 0 4px; font-size:1.1rem; text-transform:none; letter-spacing:0; color:var(--ink); }
.mc-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin:12px 0; }
.mc-grid div { border-radius:12px; padding:8px 6px; text-align:center; font-size:.72rem; line-height:1.2; } .mc-grid b { display:block; font-size:1.3rem; margin-bottom:2px; }
.mc-grid .il { background:var(--bad-soft); color:var(--bad); } .mc-grid .la { background:var(--info-soft); color:var(--info); }
.mc-grid .in { background:var(--amber-soft); color:var(--amber); } .mc-grid .do { background:var(--ok-soft); color:var(--ok); }
.mc-prio { background:var(--bad-soft); border-radius:12px; padding:10px 12px; margin:0 0 12px; font-size:.86rem; } .mc-prio ul { margin:6px 0 0; padding-left:18px; }
  .mc-missoes-panel > summary { cursor:pointer; font-weight:600; }
  .mc-missoes { list-style:none; padding:0; margin:0; display:grid; gap:8px; }
.mc-missoes li { display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; font-size:.9rem; }
.mc-missoes small { display:block; color:var(--muted); font-size:.78rem; }
.mc-bar { height:5px; border-radius:99px; background:var(--line); overflow:hidden; margin-top:4px; } .mc-bar i { display:block; height:100%; background:var(--accent); }
.mc-missoes li.ok .mc-bar i { background:var(--ok); }
@media(max-width:480px) { .mc-grid { grid-template-columns:repeat(2,1fr); } }`;
    document.head.appendChild(st);
  }

  const passos = atual => `<ol class="mc-steps" aria-label="Fases da sessão">${["Antes", "Durante", "Depois"].map((f, i) =>
    `<li class="${i === atual ? "on" : i < atual ? "ok" : ""}"${i === atual ? ' aria-current="step"' : ""}><b>${i < atual ? "✓" : i + 1}</b>${f}</li>`).join("")}</ol>`;

  function renderPlano(s) {
    planoAtivo = true;
    const r = ultimaReflexao(), obj = s.mcRascunho ?? planoHoje();
    $("#main").innerHTML = `<div class="mc-plan">${passos(0)}
      <p class="mc-eyebrow">Antes · Planejar</p><h2>Qual é o foco de hoje?</h2>
      <p class="mc-lead">${esc(s.label || "Sessão")} · ${plural(s.total, "cartão", "cartões")}. Escolha um objetivo curto para orientar o primeiro bloco.</p>
      ${r ? `<div class="mc-ontem"><b>Na última reflexão você decidiu:</b> ${esc(r.mudar)}</div>` : ""}
      <div class="mc-chips">${SUGESTOES.map(x => `<button type="button" data-mcsug="${esc(x)}" aria-pressed="${obj === x}">${esc(x)}</button>`).join("")}</div>
      <label class="mc-field">Ou escreva com suas palavras<input id="mcObj" maxlength="140" value="${esc(obj)}" placeholder="Ex.: explicar os prazos da LC 80/94 sem consultar"></label>
      <ol class="mc-how"><li>Tente responder antes de consultar o gabarito.</li><li>Se quiser, marque sua confiança antes de revelar a resposta.</li><li>Ao terminar, compare o resultado e escolha um ajuste para a próxima sessão.</li></ol>
      <div class="row"><button class="btn primary" id="mcIr"${obj.trim() ? "" : " disabled"}>Começar com esse objetivo</button><button class="btn ghost" id="mcPular">Pular planejamento</button></div>
      <label class="row count" style="gap:8px;margin-top:12px;font-weight:400"><input type="checkbox" id="mcDesl"> Não perguntar o objetivo nas próximas sessões</label>
      <p class="count">Planejar é opcional. Você pode reativar esta etapa em Estatísticas, junto das opções de confiança.</p></div>`;
    const inp = $("#mcObj"), ir = $("#mcIr");
    const upd = () => {
      s.mcRascunho = inp.value;
      ir.disabled = !inp.value.trim();
      document.querySelectorAll("[data-mcsug]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mcsug === inp.value)));
    };
    inp.addEventListener("input", upd);
    inp.addEventListener("keydown", e => { if (e.key === "Enter" && inp.value.trim()) { e.preventDefault(); comecar(s, inp.value.trim()); } });
    document.querySelectorAll("[data-mcsug]").forEach(b => b.onclick = () => { inp.value = b.dataset.mcsug; upd(); });
    ir.onclick = () => comecar(s, inp.value.trim());
    $("#mcPular").onclick = () => comecar(s, "");
    $("#mcDesl").onchange = e => { ensureAj(); S.ajustes.metaOn = !e.target.checked; queue("ajustes"); };
  }

  function comecar(s, obj) {
    planoAtivo = false;
    obj = String(obj).trim().slice(0, 140);
    iniciarDados(s, obj);
    ensureAj();
    S.ajustes.mcPerguntadoDia = today();
    if (obj) {
      S.ajustes.mcPlanos = [...lista(S.ajustes.mcPlanos), [Date.now(), obj]].slice(-300);
    }
    queue("ajustes");
    if (s.ui) s.ui.t0 = Date.now();
    renderSession();
  }

  function faixaDurante(s) {
    const m = s.mc, prog = $("#main .progress");
    if (!m || !prog || (!m.obj && !m.ult)) return;
    const v = m.ult && VEREDITOS[m.ult];
    const el = document.createElement("div");
    el.className = "mc-strip";
    el.setAttribute("role", "status");
    el.innerHTML = `${m.obj ? `<span>Objetivo: <span class="mc-obj">${esc(m.obj)}</span></span>` : ""}${v ? `<span class="mc-ved ${m.ult}" title="${esc(v.d)}">Tentativa anterior: ${esc(v.t)} · ${m.ultimaFonte === "gabarito" ? "gabarito" : "autoavaliação"}</span>` : ""}`;
    prog.after(el);
  }

  function painelDepois(s) {
    const m = s.mc, done = $("#main .done");
    if (!m || !done || s.pausaAte || done.querySelector(".mc-depois")) return;
    const n = { il: 0, la: 0, in: 0, do: 0 }, fontes = { gabarito: 0, autoavaliacao: 0 };
    for (const r of m.res) { n[r.v]++; fontes[r.fonte]++; }
    const prio = [...new Set(m.res.filter(r => r.v === "il").map(r => r.id))].map(id => byId[id]).filter(Boolean);
    const box = document.createElement("section");
    box.className = "mc-depois";
    if (m.salvo) {
      box.innerHTML = `${passos(3)}<h3>Reflexão salva</h3><p class="count" style="margin:0">${m.mudar ? "Na próxima sessão, o app vai lembrar o ajuste que você escolheu." : "Seu registro ficou guardado no histórico de reflexões."}</p>`;
    } else {
      box.innerHTML = `${passos(2)}<p class="mc-eyebrow">Depois · Refletir</p><h3>O que esta sessão mostrou?</h3>
        ${m.res.length ? `<p class="count">${plural(m.res.length, "tentativa com confiança marcada", "tentativas com confiança marcada")} · ${fontes.gabarito} com gabarito e ${fontes.autoavaliacao} por autoavaliação.</p>
        <div class="mc-grid">${ORDEM.map(k => `<div class="${k}" title="${esc(VEREDITOS[k].d)}"><b>${n[k]}</b>${esc(VEREDITOS[k].t)}</div>`).join("")}</div>
        <p class="count">São contagens desta sessão, incluindo repetições do mesmo cartão. Não medem domínio nem calibração probabilística. Para verificar retenção, teste novamente após um intervalo. Lacunas de correção aproximada entram como autoavaliação.</p>`
          : `<p class="count">Sem tentativas com confiança marcada nesta sessão. Você ainda pode refletir sobre como estudou.</p>`}
        ${prio.length ? `<div class="mc-prio"><b>Certezas que vale conferir</b><ul>${prio.slice(0, 5).map(c => `<li>${esc(curto(frenteDe(c), 110))}</li>`).join("")}</ul>${prio.length > 5 ? `<p style="margin:4px 0 0">e mais ${prio.length - 5}.</p>` : ""}</div>` : ""}
        ${m.obj ? `<fieldset style="border:0;padding:0;margin:0 0 10px"><legend class="count">Seu objetivo: ${esc(m.obj)}. Você o cumpriu?</legend><div class="mc-chips">${[["sim", "Sim"], ["parte", "Em parte"], ["nao", "Ainda não"]].map(([k, l]) => `<button type="button" data-mccum="${k}" aria-pressed="${m.cumpriu === k}">${l}</button>`).join("")}</div></fieldset>` : ""}
        <label class="mc-field">O que funcionou hoje?<textarea id="mcFun" rows="2" maxlength="400" placeholder="Ex.: explicar em voz alta mostrou uma dúvida">${esc(m.funcionou || "")}</textarea></label>
        <label class="mc-field">O que você vai mudar na próxima sessão?<textarea id="mcMud" rows="2" maxlength="400" placeholder="Ex.: revisar o art. 134 da CF e explicar sem consultar">${esc(m.mudar || "")}</textarea></label>
        <div class="row"><button class="btn primary" id="mcSalvar">Salvar reflexão</button></div>
        <p class="count">Refletir é opcional. Você pode usar os botões abaixo para continuar sem salvar.</p>`;
    }
    const botoes = done.querySelector(":scope > .row");
    botoes ? done.insertBefore(box, botoes) : done.appendChild(box);
    if (m.salvo) return;
    const fun = $("#mcFun"), mud = $("#mcMud");
    fun.oninput = () => { m.funcionou = fun.value; };
    mud.oninput = () => { m.mudar = mud.value; };
    document.querySelectorAll("[data-mccum]").forEach(b => b.onclick = () => {
      m.cumpriu = b.dataset.mccum;
      document.querySelectorAll("[data-mccum]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    });
    $("#mcSalvar").onclick = () => {
      const f = fun.value.trim().slice(0, 400), d = mud.value.trim().slice(0, 400);
      if (!f && !d && !m.cumpriu) { toast("Escolha como foi o objetivo ou escreva um ajuste para guardar sua reflexão."); fun.focus(); return; }
      ensureAj();
      S.ajustes.reflexoes = [...lista(S.ajustes.reflexoes), { ts: Date.now(), obj: m.obj, cumpriu: m.cumpriu || "", funcionou: f, mudar: d, n, fontes }].slice(-200);
      m.funcionou = f; m.mudar = d; m.salvo = true;
      queue("ajustes");
      flush();
      if (typeof sincronizarSuave === "function") sincronizarSuave(true);
      toast("Reflexão salva.");
      box.remove(); painelDepois(s);
    };
  }

  function missoesHoje() {
    if (S.tab !== "hoje" || $("#mcMissoes")) return;
    const a = S.ajustes, main = $("#main");
    if (!main) return;
    const marc = lista(a.calib).filter(e => Array.isArray(e) && hojeDe(e[0]) && [0, 1, 2].includes(e[2])).length;
    const planos = lista(a.mcPlanos).filter(e => Array.isArray(e) && hojeDe(e[0])).length;
    const refl = lista(a.reflexoes).filter(e => e && hojeDe(e.ts)).length;
    const L = [
      ["Escolha um foco", "Um objetivo curto antes de estudar.", planos, 1],
      ["Observe sua confiança", "Marque a confiança em uma tentativa, se quiser.", marc, 1],
      ["Guarde uma reflexão", "Um ajuste concreto para a próxima sessão.", refl, 1],
    ];
    const ilus = modoCards("hiper").length;
    const el = document.createElement("details"); el.className = "panel mc-missoes-panel"; el.id = "mcMissoes";
    el.innerHTML = `<summary>Refletir sobre o estudo (opcional)</summary>
      <div class="ph"><h3>Estude com intenção</h3><span class="count">${L.filter(x => x[2] >= x[3]).length}/${L.length} hoje</span></div>
      <p class="count">Sugestões opcionais, sem penalidade por pular. Fazer uma tentativa já é um começo.</p>
      <ul class="mc-missoes">${L.map(([t, d, v, meta]) => `<li class="${v >= meta ? "ok" : ""}"><div>${esc(t)}<small>${esc(d)}</small><div class="mc-bar"><i style="width:${v >= meta ? 100 : 0}%"></i></div></div><span class="mono count">${Math.min(v, meta)}/${meta}</span></li>`).join("")}</ul>
      ${ilus ? `<div class="row" style="margin-top:12px"><button class="btn small" id="mcHiper">Revisar ${plural(ilus, "certeza não confirmada", "certezas não confirmadas")}</button></div>` : ""}`;
    const alvo = main.querySelector(".hero") || main.querySelector(".panel"); alvo ? alvo.after(el) : main.appendChild(el);
    $("#mcHiper")?.addEventListener("click", () => startModo("hiper"));
  }

  function encerrar(s) {
    planoAtivo = false;
    stopSimTimer();
    clearInterval(pausaTimer);
    if (!s.done) { S.session = null; flush(); go("hoje"); return; }
    s.pausaAte = 0; s.sugPausa = null; s.ui = null;
    s.mc ||= { obj: "", res: [] };
    renderSession();
  }

  function instalar() {
    if (instalado || document.getElementById("mcStyle")) return;
    instalado = true; css();
    const _render = renderSession;
    renderSession = function () {
      const s = S.tab === "sessao" ? S.session : null;
      if (s && !s.mc) {
        const comum = !SEM_PLANO.includes(s.modo), reaproveita = comum && S.ajustes.metaOn !== false && S.ajustes.mcPerguntadoDia === today();
        const podePerguntar = s.ui && s.done === 0 && !s.pausaAte && comum && s.leve !== true && S.ajustes.metaOn !== false;
        if (podePerguntar && !reaproveita) return renderPlano(s);
        iniciarDados(s, reaproveita ? planoHoje() : "");
      }
      planoAtivo = false;
      const out = _render.apply(this, arguments);
      try {
        if (s && S.session === s && S.tab === "sessao") {
          if (s.ui && !s.pausaAte) faixaDurante(s);
          else if (!s.ui) painelDepois(s);
          for (const id of ["endS", "pausaFim"]) { const b = $("#" + id); if (b) b.onclick = () => encerrar(s); }
        }
      } catch (e) { console.warn("metacognição", e); }
      return out;
    };
    const _answer = answer;
    answer = function (g) {
      if (![1, 2, 3, 4].includes(g)) return;
      const s = S.session, u = s && s.ui;
      const branco = s && s.modo === "simulado" && u && u.picked === "B";
      if (s && u && u.revealed && s.mc && [0, 1, 2].includes(u.conf) && !branco) {
        const r = resultado(u, g), v = veredito(u.conf, r.ok);
        s.mc.res.push({ id: u.id, v, fonte: r.fonte });
        s.mc.ult = v; s.mc.ultimaFonte = r.fonte;
      }
      return _answer.apply(this, arguments);
    };
    const _hoje = renderHoje;
    renderHoje = function () { const out = _hoje.apply(this, arguments); try { missoesHoje(); } catch (e) { console.warn("metacognição", e); } return out; };
    const _mesclar = mesclar;
    mesclar = function (L, R) {
      const out = _mesclar.apply(this, arguments), la = (L && L.ajustes) || {}, ra = (R && R.ajustes) || {};
      const remotoNovo = (ra.atualizadoEm || 0) > (la.atualizadoEm || 0);
      const lados = remotoNovo ? [la, ra] : [ra, la];
      const rv = new Map(), pv = new Map();
      for (const a of lados) {
        for (const e of lista(a.reflexoes)) if (e && Number.isFinite(e.ts)) rv.set(e.ts, e);
        for (const e of lista(a.mcPlanos)) if (Array.isArray(e) && Number.isFinite(e[0]) && typeof e[1] === "string") pv.set(e[0], e);
      }
      out.ajustes.reflexoes = [...rv.values()].sort((a, b) => a.ts - b.ts).slice(-200);
      out.ajustes.mcPlanos = [...pv.values()].sort((a, b) => a[0] - b[0]).slice(-300);
      return out;
    };
    const _stats = typeof bindStatsMemoria === "function" ? bindStatsMemoria : null;
    if (_stats) bindStatsMemoria = function () {
      const out = _stats.apply(this, arguments), on = $("#confOn");
      if (on && !$("#mcOn")) {
        const l = document.createElement("label"); l.className = "row"; l.style.cssText = "gap:8px;margin-top:6px;font-weight:400";
        l.innerHTML = `<input type="checkbox" id="mcOn" ${S.ajustes.metaOn !== false ? "checked" : ""}> Definir um foco no início do dia`;
        on.closest("label").after(l);
        $("#mcOn").onchange = e => {
          ensureAj();
          const anterior = S.ajustes.metaOn !== false;
          S.ajustes.metaOn = e.target.checked;
          if (!anterior && e.target.checked) delete S.ajustes.mcPerguntadoDia;
          queue("ajustes");
        };
      }
      return out;
    };
    document.addEventListener("keydown", e => {
      if (!planoAtivo || S.tab !== "sessao" || e.target.matches("input, textarea, select")) return;
      const controle = e.target.closest("button, a[href], summary, [role=button]");
      // O listener do app já ignora Enter/Espaço nos controles: sua ativação nativa deve chegar ao alvo.
      if (controle && (e.key === " " || e.key === "Enter")) return;
      e.stopImmediatePropagation();
    }, true);
    if (S.tab === "sessao" || S.tab === "hoje") render();
  }
  const pronto = () => {
    try { return typeof renderSession === "function" && typeof answer === "function" && typeof renderHoje === "function" && typeof mesclar === "function" && typeof S === "object" && S.ajustes && typeof DECK === "object"; }
    catch (_) { return false; }
  };
  (function esperar() { if (pronto()) instalar(); else setTimeout(esperar, 250); })();
})();
