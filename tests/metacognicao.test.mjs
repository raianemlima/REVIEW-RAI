import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const modulo = readFileSync(resolve(raiz, "arquivos/metacognicao.js"), "utf8");
const htmlApp = readFileSync(resolve(raiz, "index.html"), "utf8");

/** Extrai uma função do HTML versionado sem carregar o baralho ou os scripts do app. */
function funcaoReal(nome) {
  const inicio = htmlApp.indexOf(`function ${nome}(`);
  assert.ok(inicio >= 0, `função real ausente no index.html: ${nome}`);
  const abre = htmlApp.indexOf("{", inicio);
  let nivel = 0;
  let aspas = null;
  let comentarioLinha = false;
  let comentarioBloco = false;
  for (let i = abre; i < htmlApp.length; i++) {
    const ch = htmlApp[i], nx = htmlApp[i + 1];
    if (comentarioLinha) { if (ch === "\n") comentarioLinha = false; continue; }
    if (comentarioBloco) { if (ch === "*" && nx === "/") { comentarioBloco = false; i++; } continue; }
    if (aspas) {
      if (ch === "\\") { i++; continue; }
      if (ch === aspas) aspas = null;
      continue;
    }
    if (ch === "/" && nx === "/") { comentarioLinha = true; i++; continue; }
    if (ch === "/" && nx === "*") { comentarioBloco = true; i++; continue; }
    if (ch === "'" || ch === '"' || ch === "`") { aspas = ch; continue; }
    if (ch === "{") nivel++;
    if (ch === "}" && --nivel === 0) return htmlApp.slice(inicio, i + 1);
  }
  throw new Error(`não foi possível delimitar ${nome}`);
}

// Fronteiras explícitas: estes trechos são o código real do index.html; o restante é infraestrutura.
const REAL = {
  resultadoConfianca: funcaoReal("resultadoConfianca"),
  podeRepetirSessao: funcaoReal("podeRepetirSessao"),
  answer: funcaoReal("answer"),
  mesclar: funcaoReal("mesclar"),
  snapshot: funcaoReal("snapshot"),
  calibracao: funcaoReal("calibracao"),
};

const cards = {
  aberta: { id: "aberta", tipo: "aberta", frente: "Explique a regra aberta", verso: "Regra aberta" },
  lacuna: { id: "lacuna", tipo: "lacunas", frente: "Complete a lacuna", verso: "Resposta da lacuna" },
  mc: { id: "mc", tipo: "multipla_escolha", frente: "Qual opção?\nA) Alfa\nB) Beta", verso: "A) Alfa" },
  pega: { id: "pega", tipo: "pegadinha", frente: "Certo ou errado: uma pegadinha", verso: "CERTO" },
};

const BASE = String.raw`
  const S = {
    tab: "hoje", mode: "local", session: null, cards: {}, logs: {}, flags: {},
    ajustes: { metaOn: true, confOn: true, calib: [], reflexoes: [], mcPlanos: [],
      conq: [], notas: {}, desafios: {}, nvLidas: [], nvFeitas: [], caderno: [],
      erros: [], meus: [], lsLidos: [], pares: [] }
  };
  const byId = __FIXTURES__;
  const DECK = { versao: 77, disciplinas: [] };
  const SO_LOCAL = [];
  let W = [];
  const __calls = { rate: [], queue: [], renderSession: 0, renderHoje: 0, toasts: [], sync: 0, keyboard: [] };
  globalThis.__calls = __calls;
  let pausaTimer = null;
  function $(q) { return document.querySelector(q); }
  function dayOf(ts) { return Math.floor(ts / 86400000); }
  function today() { return dayOf(Date.now()); }
  function plural(n, a, b) { return n === 1 ? a : b; }
  function esc(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;", "'":"&#39;"}[c])); }
  function parseMC(frente) { const lines = String(frente).split("\n"), opts = [], stem = []; for (const l of lines) { const m = l.match(/^([A-E])\)\s*(.*)$/); if (m) opts.push({ k: m[1], t: m[2] }); else stem.push(l); } return { stem: stem.join("\n"), opts }; }
  function aplicarW() { W = []; }
  function ensureAj() { const a = S.ajustes; a.calib ||= []; a.reflexoes ||= []; a.mcPlanos ||= []; a.conq ||= []; a.notas ||= {}; a.desafios ||= {}; a.nvLidas ||= []; a.nvFeitas ||= []; a.caderno ||= []; a.erros ||= []; a.meus ||= []; a.lsLidos ||= []; a.pares ||= []; }
  function queue(kind) { __calls.queue.push(kind); }
  function flush() { __calls.flush = (__calls.flush || 0) + 1; }
  function sincronizarSuave() { __calls.sync++; }
  function toast(msg) { __calls.toasts.push(String(msg)); }
  function stopSimTimer() {}
  function modoCards() { return []; }
  function startModo() {}
  function checkDesafio() {}
  function checkConq() {}
  function newCardUI() {}
  function buzz() {}
  function rate(id, g) { __calls.rate.push([id, g]); }
  function cadMesclar(a, b) { return [...new Set([...(a || []), ...(b || [])])]; }
  function renderSession() {
    __calls.renderSession++;
    const s = S.session;
    if (!s) { $("#main").innerHTML = ""; return; }
    if (s.pausaAte) {
      $("#main").innerHTML = '<div class="progress"><span>pausa</span></div><div class="pause"><button id="pausaFim">Continuar</button></div>';
    } else if (s.ui) {
      $("#main").innerHTML = '<div class="progress"><span>progresso</span><button id="endS" type="button">Encerrar</button></div>';
    } else {
      $("#main").innerHTML = '<div class="done"><h2>Fim</h2><div class="row"><button id="toHoje" type="button">Hoje</button></div></div>';
    }
  }
  function renderHoje() {
    __calls.renderHoje++;
    $("#main").innerHTML = '<section class="panel"><h2>Hoje</h2></section>';
  }
  function renderStats() {
    $("#main").innerHTML = '<section><label><input id="confOn" type="checkbox" checked> confiança</label></section>';
    bindStatsMemoria();
  }
  function bindStatsMemoria() {
    $("#confOn")?.addEventListener("change", e => { ensureAj(); S.ajustes.confOn = e.target.checked; queue("ajustes"); });
  }
  function render() { if (S.tab === "sessao") renderSession(); else if (S.tab === "hoje") renderHoje(); }
  function go(tab) { S.tab = tab; render(); }
  // Listener de atalhos da aplicação, instalado antes do módulo real para testar stopImmediatePropagation.
  document.addEventListener("keydown", e => {
    if (S.tab !== "sessao" || !S.session?.ui) return;
    if ((e.key === " " || e.key === "Enter") && e.target.closest("button, a[href], summary, [role=button]")) return;
    if ([" ", "1", "2", "3", "4", "A", "B", "C", "D", "E"].includes(e.key)) __calls.keyboard.push([e.key, e.target.id || e.target.tagName]);
  });
  __REAL_RESULTADO__
  __REAL_REPETICAO__
  __REAL_ANSWER__
  __REAL_MESCLAR__
  __REAL_SNAPSHOT__
  __REAL_CALIBRACAO__
`;

function scriptBase() {
  return BASE
    .replace("__FIXTURES__", JSON.stringify(cards))
    .replace("__REAL_RESULTADO__", REAL.resultadoConfianca)
    .replace("__REAL_REPETICAO__", REAL.podeRepetirSessao)
    .replace("__REAL_ANSWER__", REAL.answer)
    .replace("__REAL_MESCLAR__", REAL.mesclar)
    .replace("__REAL_SNAPSHOT__", REAL.snapshot)
    .replace("__REAL_CALIBRACAO__", REAL.calibracao);
}

function run(ctx, code) { return vm.runInContext(code, ctx); }
function state(ctx) { return run(ctx, "S"); }
function calls(ctx) { return run(ctx, "__calls"); }
function plain(value) { return JSON.parse(JSON.stringify(value)); }
function session(ctx, opts = {}) {
  const ids = opts.ids || ["aberta"];
  return {
    label: opts.label || "Sessão fictícia", modo: opts.modo || "normal", total: ids.length,
    done: opts.done || 0, pos: 0, queue: ids.slice(), again: 0, results: [0, 0, 0, 0, 0],
    ativo: 0, ativoBase: 0, t0: opts.sessionT0 || 123456, ui: opts.ui === false ? null : {
      id: ids[0], revealed: true, conf: opts.conf ?? 1, correct: opts.correct,
      picked: opts.picked, t0: opts.cardT0 || 123456, flipMs: 4000
    }, mc: opts.mc,
    pausaAte: opts.pausaAte || 0,
  };
}

async function ambiente(opts = {}) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><main id="main"></main></body></html>', {
    runScripts: "outside-only", url: "https://local.test/"
  });
  const ctx = dom.getInternalVMContext();
  run(ctx, scriptBase());
  if (opts.state) run(ctx, `Object.assign(S, ${JSON.stringify(opts.state)});`);
  if (opts.session) run(ctx, `S.session = ${JSON.stringify(opts.session)}; S.tab = "sessao";`);
  run(ctx, modulo);
  await new Promise(resolve => setTimeout(resolve, 0));
  return { dom, ctx };
}

function iniciar(ctx, opts = {}) {
  const s = session(ctx, opts);
  run(ctx, `S.session = ${JSON.stringify(s)}; S.tab = "sessao"; render();`);
  return state(ctx).session;
}
function responder(ctx, id, conf, g, extra = {}) {
  run(ctx, `S.session.ui = Object.assign({ id: ${JSON.stringify(id)}, revealed: true, conf: ${conf}, t0: 123456, flipMs: 4000 }, ${JSON.stringify(extra)}); answer(${g});`);
}

// Planejamento, reuso da reflexão e o caminho opcional de pular.
test("planejamento aceita objetivo e reaproveita a última reflexão", async () => {
  const { ctx } = await ambiente();
  run(ctx, `S.ajustes.reflexoes = [{ts: 10, mudar: "Revisar prazos", funcionou: "mapa", obj: "anterior"}];`);
  iniciar(ctx, { label: "Revisão", ids: ["aberta"] });
  assert.match(run(ctx, "document.querySelector('.mc-ontem').textContent"), /Revisar prazos/);
  run(ctx, "document.querySelector('#mcObj').value = '<foco & teste>'; document.querySelector('#mcObj').dispatchEvent(new Event('input', {bubbles:true})); document.querySelector('#mcIr').click();");
  const s = state(ctx).session;
  assert.equal(s.mc.obj, "<foco & teste>");
  assert.equal(state(ctx).ajustes.mcPlanos.length, 1);
  assert.match(run(ctx, "document.querySelector('#main').innerHTML"), /&lt;foco &amp; teste&gt;/);
});

test("pular planejamento e metaOn=false preservam monitoramento e reflexão", async () => {
  const a = await ambiente();
  iniciar(a.ctx, { ids: ["aberta"] });
  run(a.ctx, "document.querySelector('#mcPular').click();");
  assert.deepEqual(plain(state(a.ctx).session.mc), { obj: "", res: [] });
  responder(a.ctx, "aberta", 2, 1);
  assert.equal(state(a.ctx).session.mc.res.length, 1);
  run(a.ctx, "S.session.ui = null; renderSession();");
  assert.ok(run(a.ctx, "document.querySelector('.mc-depois')"));

  const b = await ambiente({ state: { ajustes: { metaOn: false, confOn: true, calib: [], reflexoes: [], mcPlanos: [] } } });
  iniciar(b.ctx, { ids: ["aberta"] });
  assert.equal(run(b.ctx, "!!document.querySelector('#mcObj')"), false);
  assert.ok(state(b.ctx).session.mc);
  responder(b.ctx, "aberta", 1, 3);
  run(b.ctx, "S.session.ui = null; renderSession();");
  assert.ok(run(b.ctx, "document.querySelector('.mc-depois')"));
});

test("estatísticas reativam o planejamento e atualizam metaOn", async () => {
  const { ctx } = await ambiente();
  run(ctx, "renderStats();");
  assert.ok(run(ctx, "document.querySelector('#mcOn')"));
  run(ctx, "document.querySelector('#mcOn').checked = false; document.querySelector('#mcOn').dispatchEvent(new Event('change', {bubbles:true}));");
  assert.equal(state(ctx).ajustes.metaOn, false);
  run(ctx, "document.querySelector('#mcOn').checked = true; document.querySelector('#mcOn').dispatchEvent(new Event('change', {bubbles:true}));");
  assert.equal(state(ctx).ajustes.metaOn, true);
});

// Modos sem planejamento não podem alterar deadline nem t0 durante a instalação/renderização.
test("simulado e tese2f não planejam nem alteram deadline/t0", async () => {
  for (const modo of ["simulado", "tese2f"]) {
    const { ctx } = await ambiente();
    const s = session(ctx, { modo, ids: ["mc"], sessionT0: 987654, cardT0: 765432 });
    s.limite = 91; s.deadline = 222; s.ui.revealed = false;
    run(ctx, `S.session = ${JSON.stringify(s)}; S.tab = "sessao"; renderSession();`);
    assert.equal(run(ctx, "!!document.querySelector('#mcObj')"), false);
    assert.equal(state(ctx).session.t0, 987654);
    assert.equal(state(ctx).session.deadline, 222);
    assert.equal(state(ctx).session.ui.t0, 765432);
  }
});

// Confiança e fonte: resultadoConfianca e answer são extraídos do app, não reimplementados no harness.
test("as quatro categorias de confiança são registradas", async () => {
  const { ctx } = await ambiente();
  iniciar(ctx, { ids: ["aberta"] });
  run(ctx, "document.querySelector('#mcPular').click();");
  for (const [conf, g] of [[2, 1], [0, 3], [2, 3], [1, 1]]) responder(ctx, "aberta", conf, g);
  assert.deepEqual(plain(state(ctx).session.mc.res.map(x => x.v)), ["il", "in", "do", "la"]);
  assert.equal(state(ctx).session.mc.res.length, 4);
});

test("gabarito de múltipla/pegadinha vence g distinto e rate recebe g intacto", async () => {
  const { ctx } = await ambiente();
  iniciar(ctx, { ids: ["mc", "pega"] });
  run(ctx, "document.querySelector('#mcPular').click();");
  responder(ctx, "mc", 2, 4, { correct: false });
  responder(ctx, "pega", 2, 1, { correct: true });
  assert.deepEqual(plain(calls(ctx).rate.slice(-2)), [["mc", 4], ["pega", 1]]);
  assert.deepEqual(plain(state(ctx).session.mc.res.slice(-2).map(x => [x.fonte, x.v])), [["gabarito", "il"], ["gabarito", "do"]]);
  assert.deepEqual(plain(state(ctx).ajustes.calib.slice(-2).map(x => x.slice(1))), [["mc", 2, 0], ["pega", 2, 1]]);
});

test("lacunas e cartões abertos usam autoavaliação", async () => {
  const { ctx } = await ambiente();
  iniciar(ctx, { ids: ["lacuna", "aberta"] });
  run(ctx, "document.querySelector('#mcPular').click();");
  responder(ctx, "lacuna", 1, 3, { correct: false });
  responder(ctx, "aberta", 0, 1, { correct: true });
  assert.deepEqual(plain(state(ctx).session.mc.res.slice(-2).map(x => x.fonte)), ["autoavaliacao", "autoavaliacao"]);
  assert.deepEqual(plain(state(ctx).session.mc.res.slice(-2).map(x => x.v)), ["in", "la"]);
});

test("confiança nula/fora do intervalo, branco e resposta não revelada não geram registro", async () => {
  const { ctx } = await ambiente();
  iniciar(ctx, { modo: "simulado", ids: ["aberta"] });
  run(ctx, "S.session.mc = {obj:'',res:[]}; S.session.ui = {id:'aberta', revealed:false, conf:1, t0:1}; answer(3);");
  run(ctx, "S.session.ui = {id:'aberta', revealed:true, conf:null, t0:1}; answer(3);");
  run(ctx, "S.session.ui = {id:'aberta', revealed:true, conf:9, t0:1}; answer(3);");
  run(ctx, "S.session.ui = {id:'aberta', revealed:true, conf:1, picked:'B', t0:1}; answer(3);");
  assert.deepEqual(plain(state(ctx).session.mc.res), []);
  assert.deepEqual(plain(state(ctx).ajustes.calib), []);
});

// Encerramentos: uma sessão com revisão feita exibe Depois; uma sessão vazia volta a Hoje sem falso progresso.
test("endS antecipado e pausaFim preservam revisão e mostram reflexão", async () => {
  for (const field of ["endS", "pausaFim"]) {
    const { ctx } = await ambiente();
    iniciar(ctx, { ids: ["aberta"], done: 1, pausaAte: field === "pausaFim" ? 999999 : 0 });
    run(ctx, "S.session.mc = {obj:'foco', res:[{id:'aberta',v:'do',fonte:'autoavaliacao'}]}; S.session.ui = {id:'aberta',revealed:true,conf:2,t0:1}; renderSession();");
    assert.ok(run(ctx, `document.querySelector('#${field}')`));
    run(ctx, `document.querySelector('#${field}').click();`);
    assert.ok(run(ctx, "document.querySelector('.mc-depois')"));
    assert.equal(state(ctx).session.mc.res.length, 1);
  }
});

test("sessão sem resposta sai sem plano ou reflexão fictícios", async () => {
  const { ctx } = await ambiente();
  iniciar(ctx, { ids: ["aberta"], done: 0 });
  run(ctx, "document.querySelector('#mcPular').click(); document.querySelector('#endS').click();");
  assert.equal(state(ctx).session, null);
  assert.equal(state(ctx).ajustes.mcPlanos.length, 0);
  assert.equal(state(ctx).ajustes.reflexoes.length, 0);
  assert.equal(run(ctx, "!!document.querySelector('#mcMissoes')"), true);
});

// Reflexão, limites e backup.
test("reflexão exige conteúdo/opção, salva uma vez e snapshot contém os campos", async () => {
  const { ctx } = await ambiente();
  iniciar(ctx, { ids: ["aberta"] });
  run(ctx, "document.querySelector('#mcPular').click(); S.session.mc = {obj:'foco & <x>',res:[],funcionou:'',mudar:''}; S.session.ui = null; renderSession();");
  const save = run(ctx, "document.querySelector('#mcSalvar')");
  run(ctx, "document.querySelector('#mcSalvar').click();");
  assert.equal(state(ctx).ajustes.reflexoes.length, 0);
  run(ctx, "document.querySelector('#mcFun').value = '<script>alert(1)</script>'; document.querySelector('#mcFun').dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('#mcMud').value = 'Mudar & testar'; document.querySelector('#mcMud').dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('#mcSalvar').click();");
  assert.equal(state(ctx).ajustes.reflexoes.length, 1);
  const r = state(ctx).ajustes.reflexoes[0];
  assert.deepEqual(Object.keys(r).sort(), ["cumpriu", "fontes", "funcionou", "mudar", "n", "obj", "ts"]);
  assert.match(run(ctx, "document.querySelector('.mc-depois').innerHTML"), /Reflexão salva/);
  assert.equal(save.isConnected, false);
  const snap = run(ctx, "snapshot()");
  assert.equal(snap.ajustes.metaOn, true);
  assert.equal(snap.ajustes.reflexoes.length, 1);
  assert.deepEqual(plain(snap.ajustes.mcPlanos), []);
});

test("merge faz união, respeita limites e preserva preferência do lado mais novo", async () => {
  const { ctx } = await ambiente();
  const oldRef = Array.from({length: 205}, (_, i) => ({ts: i + 1, mudar: `o${i}`}));
  const newRef = Array.from({length: 205}, (_, i) => ({ts: i + 201, mudar: `n${i}`}));
  const oldPlan = Array.from({length: 305}, (_, i) => [i + 1, `o${i}`]);
  const newPlan = Array.from({length: 305}, (_, i) => [i + 301, `n${i}`]);
  run(ctx, `globalThis.__merge = mesclar({ajustes:{atualizadoEm:1,metaOn:true,reflexoes:${JSON.stringify(oldRef)},mcPlanos:${JSON.stringify(oldPlan)},conq:['a']}},{ajustes:{atualizadoEm:2,metaOn:false,reflexoes:${JSON.stringify(newRef)},mcPlanos:${JSON.stringify(newPlan)},conq:['b']}});`);
  const out = run(ctx, "__merge");
  assert.equal(out.ajustes.metaOn, false);
  assert.deepEqual(plain(out.ajustes.conq).sort(), ["a", "b"]);
  assert.equal(out.ajustes.reflexoes.length, 200);
  assert.equal(out.ajustes.mcPlanos.length, 300);
  assert.equal(out.ajustes.reflexoes.at(-1).ts, 405);
  assert.equal(out.ajustes.mcPlanos.at(-1)[0], 605);
});

// Idempotência da instalação e da renderização.
test("re-render não duplica painel/faixa e carregar módulo duas vezes não reinstala", async () => {
  const { ctx } = await ambiente();
  iniciar(ctx, { ids: ["aberta"] });
  run(ctx, "document.querySelector('#mcObj').value = 'foco'; document.querySelector('#mcObj').dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('#mcIr').click(); renderSession(); renderSession();");
  assert.equal(run(ctx, "document.querySelectorAll('.mc-strip').length"), 1);
  run(ctx, "S.session.ui = null; renderSession(); renderSession();");
  assert.equal(run(ctx, "document.querySelectorAll('.mc-depois').length"), 1);
  const stylesBefore = run(ctx, "document.querySelectorAll('#mcStyle').length");
  run(ctx, modulo);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(run(ctx, "document.querySelectorAll('#mcStyle').length"), stylesBefore);
  run(ctx, "S.session.ui = {id:'aberta',revealed:true,conf:2,t0:1}; renderSession();");
  assert.equal(run(ctx, "document.querySelectorAll('.mc-strip').length"), 1);
});

// O app-base recebe atalhos em document; o listener de captura do módulo deve bloqueá-los durante planejamento.
test("atalhos não viram durante planejamento, inclusive com foco em botão", async () => {
  const { ctx } = await ambiente();
  iniciar(ctx, { ids: ["aberta"] });
  for (const [key, selector] of [[" ", "#mcPular"], ["1", "#mcIr"], ["4", "[data-mcsug]"], ["C", "#mcPular"], ["E", "#mcPular"], ["A", "[data-mcsug]"]]) {
    run(ctx, `(() => { const target = document.querySelector(${JSON.stringify(selector)}); target.focus(); target.dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(key)},bubbles:true,cancelable:true})); })();`);
  }
  assert.deepEqual(plain(calls(ctx).keyboard), []);
});

// Mantém uma verificação direta do helper real e da agregação usada nas estatísticas.
test("calibracao real agrega somente entradas válidas de quatro campos", async () => {
  const { ctx } = await ambiente();
  run(ctx, "S.ajustes.calib = [[1,'a',0,1],[2,'b',0,0],[3,'c',1,1],[4,'d',2,0],[5,'e',2,1],['x','f',2,1],[6,'g',9,1],null];");
  assert.deepEqual(plain(run(ctx, "calibracao()")), [[2,1],[1,1],[3,2]]);
});

// Regressões identificadas na revisão independente: não oferecer estudo com estado vazio,
// e não interceptar a ativação por Enter/Espaço de controles nativos.
test("render real bloqueia ações enquanto o progresso carrega e libera após carregar", async () => {
  const { ctx } = await ambiente();
  run(ctx, `
    function bindMetodoMini() {}
    function updNavBadge() {}
    function esVoltar() {}
    const __outrosRenderizadores = ["renderLib", "renderNov", "renderDef", "renderTeses", "renderProva", "renderDoutrina", "renderAjustes", "renderOuvir", "renderBusca", "renderPreparo", "renderLeiSeca", "renderMetodos", "renderJogo", "renderCaderno"];
    for (const nome of __outrosRenderizadores) globalThis[nome] = function () {};
    ${funcaoReal("render")}
    S.mode = "loading";
    S.tab = "hoje";
    render();
  `);
  assert.equal(run(ctx, "document.querySelector('#main').getAttribute('aria-busy')"), "true");
  assert.match(run(ctx, "document.querySelector('#main').textContent"), /Carregando seu progresso/);
  assert.equal(run(ctx, "document.querySelectorAll('#main button').length"), 0);
  const antes = calls(ctx).renderHoje;
  run(ctx, "S.tab = 'sessao'; render();");
  assert.equal(run(ctx, "document.querySelectorAll('#main button').length"), 0);
  assert.equal(calls(ctx).renderHoje, antes);
  run(ctx, "S.mode = 'local'; S.tab = 'hoje'; render();");
  assert.equal(run(ctx, "document.querySelector('#main').getAttribute('aria-busy')"), "false");
  assert.ok(run(ctx, "document.querySelector('#mcMissoes')"));
});

test("Enter e Espaço chegam ao botão de planejamento sem cancelar sua ação nativa", async () => {
  const { ctx } = await ambiente();
  iniciar(ctx, { ids: ["aberta"] });
  run(ctx, `
    globalThis.__teclasNoBotao = [];
    const b = document.querySelector('#mcPular');
    b.addEventListener('keydown', e => __teclasNoBotao.push([e.key, e.defaultPrevented]));
    for (const key of ['Enter', ' ']) b.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true}));
  `);
  assert.deepEqual(plain(run(ctx, "__teclasNoBotao")), [["Enter", false], [" ", false]]);
  assert.deepEqual(plain(calls(ctx).keyboard), []);
  assert.ok(run(ctx, "document.querySelector('#mcPular')"));
});
