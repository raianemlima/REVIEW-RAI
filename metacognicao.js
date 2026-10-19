// Review DPE · Metacognição (fase 1): planejar, monitorar e avaliar cada sessão de estudo.
// Arquivo separado do index.html: o CI acrescenta <script src="metacognicao.js"> antes de </body>.
// O app roda como script clássico global, então aqui só envolvemos funções que já existem
// (renderSession, answer, renderHoje, mesclar) sem mudar o motor de revisão (FSRS).
// Dados salvos em S.ajustes (vão no backup e na sincronização):
//   mcPlanos:   [[ts, objetivo]]                      sessões planejadas
//   reflexoes:  [{ts, obj, cumpriu, funcionou, mudar, n}] avaliações ao fim da sessão
//   metaOn:     false desliga a etapa "Antes"
(function () {
  "use strict";
  const SEM_PLANO = ["simulado", "tese2f"];   // modos cronometrados: o planejamento atrapalharia o tempo
  const VEREDITOS = {
    il: { t: "Ilusão de conhecimento", ic: "⚠️", d: "Você tinha certeza e errou. É o erro mais perigoso na prova; o cartão volta com prioridade." },
    la: { t: "Lacuna consciente", ic: "👁️", d: "Você percebeu que não sabia. Bom sinal: agora sabe exatamente o que revisar." },
    in: { t: "Acerto inseguro", ic: "🔄", d: "Acertou sem convicção. Ainda não está dominado; na prova poderia virar erro." },
    do: { t: "Dominado", ic: "✅", d: "Confiança e resposta caminharam juntas. Você realmente sabe isso." },
  };
  const ORDEM = ["il", "la", "in", "do"];
  const SUGESTOES = ["Testar o que eu acho que já sei", "Revisar os pontos em que errei", "Fixar a base de um tema novo"];
  let ultObjetivo = "", planoAtivo = false, instalado = false;

  const veredito = (conf, ok) => ok ? (conf === 2 ? "do" : "in") : (conf === 2 ? "il" : "la");
  const hojeDe = ts => dayOf(ts) === today();
  const ultimaReflexao = () => { const r = S.ajustes.reflexoes || []; for (let i = r.length - 1; i >= 0; i--) if (r[i].mudar) return r[i]; return null; };
  const frenteDe = c => (c.tipo === "multipla_escolha" ? parseMC(c.frente).stem : c.frente).replace(/^Certo ou errado(\s*\([^)]*\))?:\s*/i, "");
  const curto = (t, n) => (t = String(t || "").replace(/\s+/g, " ").trim()).length > n ? t.slice(0, n - 1) + "…" : t;

  function css() {
    const st = document.createElement("style");
    st.textContent = `
.mc-steps { display: flex; gap: 6px; list-style: none; padding: 0; margin: 0 0 14px; font-size: .8rem; color: var(--muted); }
.mc-steps li { display: flex; align-items: center; gap: 6px; padding: 4px 10px 4px 4px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); }
.mc-steps li b { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; font-size: .72rem; background: var(--line); color: var(--ink); }
.mc-steps li.on { color: var(--accent); border-color: var(--accent); } .mc-steps li.on b { background: var(--accent); color: var(--accent-ink); }
.mc-steps li.ok b { background: var(--ok); color: #fff; }
.mc-plan { max-width: 620px; margin: 8px auto; }
.mc-eyebrow { font-size: .74rem; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); font-weight: 600; margin: 0 0 4px; }
.mc-plan h2 { margin: 0 0 6px; font-size: 1.35rem; line-height: 1.25; } .mc-lead { color: var(--muted); margin: 0 0 14px; font-size: .95rem; }
.mc-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; }
.mc-chips button { font: inherit; font-size: .85rem; padding: 7px 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); cursor: pointer; }
.mc-chips button[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.mc-field { display: grid; gap: 4px; margin: 0 0 10px; font-size: .85rem; color: var(--muted); }
.mc-field input, .mc-field textarea { font: .95rem var(--f-ui); padding: 9px 11px; border: 1px solid var(--line); border-radius: 10px; background: var(--bg); color: var(--ink); resize: vertical; }
.mc-how { list-style: none; padding: 0; margin: 12px 0; display: grid; gap: 6px; font-size: .88rem; }
.mc-how li { display: flex; gap: 8px; } .mc-how li span:first-child { width: 22px; flex: none; text-align: center; }
.mc-ontem { background: var(--amber-soft); border-radius: 12px; padding: 10px 12px; font-size: .88rem; margin: 0 0 12px; }
.mc-strip { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; font-size: .82rem; color: var(--muted); margin: 6px 0 8px; }
.mc-strip .mc-obj { color: var(--ink); }
.mc-ved { display: inline-flex; gap: 6px; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: .8rem; background: var(--accent-soft); color: var(--ink); }
.mc-ved.il { background: var(--bad-soft); color: var(--bad); } .mc-ved.la { background: var(--info-soft); color: var(--info); }
.mc-ved.in { background: var(--amber-soft); color: var(--amber); } .mc-ved.do { background: var(--ok-soft); color: var(--ok); }
.mc-depois { text-align: left; max-width: 560px; margin: 18px auto 6px; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 16px; }
.mc-depois h3 { margin: 0 0 4px; font-size: 1.1rem; text-transform: none; letter-spacing: 0; color: var(--ink); }
.mc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 12px 0; }
.mc-grid div { border-radius: 12px; padding: 8px 6px; text-align: center; font-size: .72rem; line-height: 1.2; }
.mc-grid b { display: block; font-size: 1.3rem; margin-bottom: 2px; }
.mc-grid .il { background: var(--bad-soft); color: var(--bad); } .mc-grid .la { background: var(--info-soft); color: var(--info); }
.mc-grid .in { background: var(--amber-soft); color: var(--amber); } .mc-grid .do { background: var(--ok-soft); color: var(--ok); }
.mc-prio { background: var(--bad-soft); border-radius: 12px; padding: 10px 12px; margin: 0 0 12px; font-size: .86rem; } .mc-prio ul { margin: 6px 0 0; padding-left: 18px; }
.mc-missoes { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.mc-missoes li { display: grid; grid-template-columns: 26px 1fr auto; gap: 8px; align-items: center; font-size: .9rem; }
.mc-missoes small { display: block; color: var(--muted); font-size: .78rem; }
.mc-bar { height: 5px; border-radius: 99px; background: var(--line); overflow: hidden; margin-top: 4px; } .mc-bar i { display: block; height: 100%; background: var(--accent); }
.mc-missoes li.ok .mc-bar i { background: var(--ok); }
@media (max-width: 480px) { .mc-grid { grid-template-columns: repeat(2, 1fr); } }`;
    document.head.appendChild(st);
  }

  const passos = atual => `<ol class="mc-steps" aria-label="Fases da sessão">${["Antes", "Durante", "Depois"].map((f, i) =>
    `<li class="${i === atual ? "on" : i < atual ? "ok" : ""}"><b>${i < atual ? "✓" : i + 1}</b>${f}</li>`).join("")}</ol>`;

  // ---------- Antes: planejar ----------
  function renderPlano(s) {
    planoAtivo = true;
    const r = ultimaReflexao(), obj = s.mcRascunho ?? ultObjetivo;
    $("#main").innerHTML = `<div class="mc-plan">${passos(0)}
      <p class="mc-eyebrow">Antes · Planejar</p>
      <h2>O que você quer dominar nesta sessão?</h2>
      <p class="mc-lead">${esc(s.label || "Sessão")} · ${plural(s.total, "cartão", "cartões")}. Um objetivo claro tira você do piloto automático: em vez de só passar pelos cartões, você dirige o próprio estudo.</p>
      ${r ? `<div class="mc-ontem">📝 <b>Na última sessão você decidiu:</b> ${esc(r.mudar)}</div>` : ""}
      <div class="mc-chips">${SUGESTOES.map(x => `<button type="button" data-mcsug="${esc(x)}" aria-pressed="${obj === x}">${esc(x)}</button>`).join("")}</div>
      <label class="mc-field">Ou escreva com suas palavras<input id="mcObj" maxlength="140" value="${esc(obj)}" placeholder="Ex.: acertar os prazos da LC 80/94 sem chutar"></label>
      <ul class="mc-how">
        <li><span>💭</span><span><b>Responda mentalmente</b> antes de ver a resposta.</span></li>
        <li><span>🎯</span><span><b>Marque sua confiança</b>: chutei, acho ou tenho certeza.</span></li>
        <li><span>🔍</span><span><b>Avalie no final</b> onde a confiança falhou e o que muda amanhã.</span></li>
      </ul>
      <div class="row"><button class="btn primary" id="mcIr"${obj.trim() ? "" : " disabled"}>Começar com esse objetivo</button><button class="btn ghost" id="mcPular">Pular planejamento</button></div>
      <label class="row count" style="gap:8px;margin-top:12px;font-weight:400"><input type="checkbox" id="mcDesl"> Não perguntar mais o objetivo (reative em Estatísticas › Memória)</label></div>`;
    const inp = $("#mcObj"), ir = $("#mcIr");
    const upd = () => { s.mcRascunho = inp.value; ir.disabled = !inp.value.trim(); document.querySelectorAll("[data-mcsug]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mcsug === inp.value))); };
    inp.addEventListener("input", upd);
    inp.addEventListener("keydown", e => { if (e.key === "Enter" && inp.value.trim()) { e.preventDefault(); comecar(s, inp.value.trim()); } });
    document.querySelectorAll("[data-mcsug]").forEach(b => b.onclick = () => { inp.value = b.dataset.mcsug; upd(); });
    ir.onclick = () => comecar(s, inp.value.trim());
    $("#mcPular").onclick = () => { if ($("#mcDesl").checked) { S.ajustes.metaOn = false; queue("ajustes"); } comecar(s, ""); };
    $("#mcDesl").onchange = e => { if (e.target.checked) ir.disabled = true; else upd(); };
  }
  function comecar(s, obj) {
    planoAtivo = false;
    s.mc = { obj, res: [] };
    if (obj) { ultObjetivo = obj; ensureAj(); S.ajustes.mcPlanos = [...(S.ajustes.mcPlanos || []), [Date.now(), obj]].slice(-300); queue("ajustes"); }
    if (s.ui) s.ui.t0 = Date.now();
    renderSession();
  }

  // ---------- Durante: monitorar ----------
  function faixaDurante(s) {
    const m = s.mc; if (!m || (!m.obj && !m.ult)) return;
    const prog = $("#main .progress"); if (!prog) return;
    const v = m.ult && VEREDITOS[m.ult];
    const el = document.createElement("div"); el.className = "mc-strip"; el.setAttribute("role", "status");
    el.innerHTML = `${m.obj ? `<span>🎯 <span class="mc-obj">${esc(m.obj)}</span></span>` : ""}${v ? `<span class="mc-ved ${m.ult}" title="${esc(v.d)}">${v.ic} Cartão anterior: ${esc(v.t)}</span>` : ""}`;
    prog.after(el);
  }

  // ---------- Depois: avaliar ----------
  function painelDepois(s) {
    const m = s.mc, done = $("#main .done"); if (!m || !done || done.querySelector(".mc-depois")) return;
    const n = { il: 0, la: 0, in: 0, do: 0 }; for (const r of m.res) n[r.v]++;
    const tot = m.res.length, calib = tot ? Math.round((n.do + n.la) / tot * 100) : null;
    const prio = [...new Set(m.res.filter(r => r.v === "il").map(r => r.id))].map(id => byId[id]).filter(Boolean);
    const box = document.createElement("section"); box.className = "mc-depois";
    if (m.salvo) {
      box.innerHTML = `${passos(3)}<h3>Reflexão salva</h3><p class="count" style="margin:0">${prio.length ? "Comece a próxima sessão pelos itens em que a sua certeza falhou." : "Da próxima vez, o app vai lembrar o que você decidiu mudar."}</p>`;
    } else {
      box.innerHTML = `${passos(2)}<p class="mc-eyebrow">Depois · Avaliar</p>
        <h3>Você sabia mesmo, ou só reconheceu?</h3>
        ${tot ? `<p class="count" style="margin:0">${calib}% de calibração: em ${calib}% das respostas a sua confiança bateu com o resultado (${tot} com confiança marcada).</p>
        <div class="mc-grid">${ORDEM.map(k => `<div class="${k}" title="${esc(VEREDITOS[k].d)}"><b>${n[k]}</b>${esc(VEREDITOS[k].t)}</div>`).join("")}</div>`
          : `<p class="count">Marque a confiança nos cartões (Tenho certeza, Acho, Chutei) para ver aqui onde ela acertou e onde falhou.</p>`}
        ${prio.length ? `<div class="mc-prio">⚠️ <b>Ilusões de conhecimento: revisão prioritária</b><ul>${prio.slice(0, 5).map(c => `<li>${esc(curto(frenteDe(c), 110))}</li>`).join("")}</ul>${prio.length > 5 ? `<p style="margin:4px 0 0">e mais ${prio.length - 5}.</p>` : ""}</div>` : ""}
        ${m.obj ? `<div class="mc-field"><span>Seu objetivo: <b style="color:var(--ink)">${esc(m.obj)}</b>. Você cumpriu?</span><div class="mc-chips" style="margin:4px 0 0">${[["sim", "Sim"], ["parte", "Em parte"], ["nao", "Ainda não"]].map(([k, l]) => `<button type="button" data-mccum="${k}" aria-pressed="${m.cumpriu === k}">${l}</button>`).join("")}</div></div>` : ""}
        <label class="mc-field">O que funcionou hoje?<textarea id="mcFun" rows="2" maxlength="400" placeholder="Ex.: responder antes de olhar mostrou o que eu não sabia">${esc(m.funcionou || "")}</textarea></label>
        <label class="mc-field">O que você vai mudar na próxima sessão?<textarea id="mcMud" rows="2" maxlength="400" placeholder="Ex.: reler o art. 134 da CF e explicar em voz alta">${esc(m.mudar || "")}</textarea></label>
        <div class="row"><button class="btn primary" id="mcSalvar">Salvar reflexão</button></div>`;
    }
    const botoes = done.querySelector(":scope > .row"); botoes ? done.insertBefore(box, botoes) : done.appendChild(box);
    if (m.salvo) return;
    const fun = $("#mcFun"), mud = $("#mcMud");
    fun.oninput = () => { m.funcionou = fun.value; }; mud.oninput = () => { m.mudar = mud.value; };
    document.querySelectorAll("[data-mccum]").forEach(b => b.onclick = () => { m.cumpriu = b.dataset.mccum; document.querySelectorAll("[data-mccum]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
    $("#mcSalvar").onclick = () => {
      const f = fun.value.trim(), d = mud.value.trim();
      if (!f && !d && !m.cumpriu) { toast("Escreva ao menos uma linha: é aí que o aprendizado se consolida."); fun.focus(); return; }
      ensureAj(); S.ajustes.reflexoes = [...(S.ajustes.reflexoes || []), { ts: Date.now(), obj: m.obj || "", cumpriu: m.cumpriu || "", funcionou: f, mudar: d, n }].slice(-200);
      queue("ajustes"); m.salvo = true; toast("Reflexão salva."); box.remove(); painelDepois(s);
    };
  }

  // ---------- Missões do dia (tela Hoje) ----------
  function missoesHtml() {
    const a = S.ajustes, marc = (a.calib || []).filter(e => hojeDe(e[0])).length;
    const planos = (a.mcPlanos || []).filter(e => hojeDe(e[0])).length, refl = (a.reflexoes || []).filter(e => hojeDe(e.ts)).length;
    const ilus = modoCards("hiper").length;
    const L = [
      ["🧭", "Planeje uma sessão", "Defina um objetivo antes de começar.", planos, 1],
      ["🎯", "Marque a confiança em 15 cartões", "Antes de ver a resposta: chutei, acho ou tenho certeza.", marc, 15],
      ["📝", "Avalie uma sessão", "Ao terminar, escreva o que funcionou e o que muda.", refl, 1],
    ];
    const feitas = L.filter(x => x[3] >= x[4]).length;
    return `<section class="panel" id="mcMissoes"><div class="ph"><h3>🧠 Missões metacognitivas</h3><span class="count">${feitas}/${L.length} hoje</span></div>
      <ul class="mc-missoes">${L.map(([ic, t, d, v, meta]) => `<li class="${v >= meta ? "ok" : ""}"><span>${v >= meta ? "✅" : ic}</span><div>${esc(t)}<small>${esc(d)}</small><div class="mc-bar"><i style="width:${Math.round(Math.min(1, v / meta) * 100)}%"></i></div></div><span class="mono count">${Math.min(v, meta)}/${meta}</span></li>`).join("")}</ul>
      ${ilus ? `<div class="row" style="margin-top:12px"><button class="btn small" id="mcHiper">⚠️ Revisar ${plural(ilus, "ilusão de conhecimento", "ilusões de conhecimento")}</button></div>` : ""}</section>`;
  }
  function missoesHoje() {
    if (S.tab !== "hoje" || $("#mcMissoes")) return;
    const main = $("#main"), alvo = main && main.querySelector(".panel"); if (!main) return;
    const tmp = document.createElement("div"); tmp.innerHTML = missoesHtml(); const el = tmp.firstElementChild;
    alvo ? alvo.before(el) : main.appendChild(el);
    $("#mcHiper")?.addEventListener("click", () => startModo("hiper"));
  }

  // ---------- instalação: envolve as funções do app ----------
  function instalar() {
    if (instalado) return; instalado = true; css();
    const _render = renderSession;
    renderSession = function () {
      const s = S.tab === "sessao" ? S.session : null;
      if (s && s.ui && !s.mc && s.done === 0 && !s.pausaAte && !SEM_PLANO.includes(s.modo) && S.ajustes.metaOn !== false) return renderPlano(s);
      planoAtivo = false;
      const out = _render.apply(this, arguments);
      try { if (S.tab === "sessao" && S.session) { if (S.session.ui) faixaDurante(S.session); else painelDepois(S.session); } } catch (e) { console.warn("metacognição", e); }
      return out;
    };
    const _answer = answer;
    answer = function (g) {
      const s = S.session, u = s && s.ui, conf = u && u.revealed ? u.conf : null, id = u && u.id;
      const branco = s && s.modo === "simulado" && u && u.picked === "B";
      if (s && u && u.revealed && s.mc && conf != null && !branco) { const v = veredito(conf, g > 1); s.mc.res.push({ id, v }); s.mc.ult = v; }
      return _answer.apply(this, arguments);
    };
    const _hoje = renderHoje;
    renderHoje = function () { const out = _hoje.apply(this, arguments); try { missoesHoje(); } catch (e) { console.warn("metacognição", e); } return out; };
    const _mesclar = mesclar;   // sincronização: junta reflexões e planos dos dois aparelhos
    mesclar = function (L, R) {
      const out = _mesclar.apply(this, arguments), la = (L && L.ajustes) || {}, ra = (R && R.ajustes) || {};
      const rv = new Map(); for (const e of [...(ra.reflexoes || []), ...(la.reflexoes || [])]) if (e && e.ts) rv.set(e.ts, e);
      out.ajustes.reflexoes = [...rv.values()].sort((a, b) => a.ts - b.ts).slice(-200);
      const pv = new Map(); for (const e of [...(ra.mcPlanos || []), ...(la.mcPlanos || [])]) if (Array.isArray(e)) pv.set(e[0], e);
      out.ajustes.mcPlanos = [...pv.values()].sort((a, b) => a[0] - b[0]).slice(-300);
      return out;
    };
    const _stats = typeof bindStatsMemoria === "function" ? bindStatsMemoria : null;   // reativar o planejamento em Estatísticas › Memória
    if (_stats) bindStatsMemoria = function () {
      const out = _stats.apply(this, arguments), on = $("#confOn");
      if (on && !$("#mcOn")) {
        const l = document.createElement("label"); l.className = "row"; l.style.cssText = "gap:8px;margin-top:6px;font-weight:400";
        l.innerHTML = `<input type="checkbox" id="mcOn" ${S.ajustes.metaOn !== false ? "checked" : ""}> Definir um objetivo antes de cada sessão`;
        on.closest("label").after(l); $("#mcOn").onchange = e => { ensureAj(); S.ajustes.metaOn = e.target.checked; queue("ajustes"); };
      }
      return out;
    };
    // na tela de planejamento, os atalhos da sessão (espaço, 1–4, letras) não podem virar o cartão
    document.addEventListener("keydown", e => { if (planoAtivo && S.tab === "sessao" && !e.target.matches("input, textarea, select")) e.stopImmediatePropagation(); }, true);
    if (S.tab === "sessao" || S.tab === "hoje") render();
  }
  // o app só existe depois que a tela de entrada decifra o baralho
  const pronto = () => { try { return typeof renderSession === "function" && typeof answer === "function" && typeof renderHoje === "function" && typeof S === "object" && S.ajustes && typeof DECK === "object"; } catch (e) { return false; } };
  (function esperar() { if (pronto()) instalar(); else setTimeout(esperar, 250); })();
})();
