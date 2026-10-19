import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const modulo = readFileSync(resolve(raiz, "arquivos/metacognicao.js"), "utf8");
const diaBase = 20000;
const planoTs = (dia, n = 1) => dia * 86400000 + n;

const BASE = String.raw`
  const S = {
    tab: "hoje", mode: "local", session: null,
    ajustes: { metaOn: true, confOn: true, calib: [], reflexoes: [], mcPlanos: [],
      conq: [], notas: {}, desafios: {}, nvLidas: [], nvFeitas: [], caderno: [],
      erros: [], meus: [], lsLidos: [], pares: [] }
  };
  const byId = { a: { id: "a", tipo: "aberta", frente: "Pergunta A", verso: "Resposta A" } };
  const DECK = { versao: 1, disciplinas: [] };
  const __calls = { queue: [], renderHoje: 0, startModo: 0 };
  globalThis.__calls = __calls;
  globalThis.__hiper = false;
  globalThis.__dia = ${diaBase};
  Date.now = () => globalThis.__dia * 86400000 + 12345;
  function $(q) { return document.querySelector(q); }
  function dayOf(ts) { return Math.floor(ts / 86400000); }
  function today() { return globalThis.__dia; }
  function plural(n, a, b) { return n === 1 ? a : b; }
  function esc(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;", "'":"&#39;"}[c])); }
  function parseMC(frente) { return { stem: frente, opts: [] }; }
  function ensureAj() {
    const a = S.ajustes;
    a.calib ||= []; a.reflexoes ||= []; a.mcPlanos ||= []; a.conq ||= []; a.notas ||= {};
    a.desafios ||= {}; a.nvLidas ||= []; a.nvFeitas ||= []; a.caderno ||= [];
    a.erros ||= []; a.meus ||= []; a.lsLidos ||= []; a.pares ||= [];
  }
  function queue(kind) { __calls.queue.push(kind); }
  function flush() {}
  function sincronizarSuave() {}
  function toast() {}
  function stopSimTimer() {}
  function modoCards(modo) { return modo === "hiper" && globalThis.__hiper ? ["a"] : []; }
  function startModo() { __calls.startModo++; }
  function checkDesafio() {}
  function checkConq() {}
  function rate() {}
  function renderSession() {
    const s = S.session;
    if (!s) { $("#main").innerHTML = ""; return; }
    if (s.pausaAte) $("#main").innerHTML = '<div class="progress">pausa</div><button id="pausaFim">Continuar</button>';
    else if (s.ui) $("#main").innerHTML = '<div class="progress">progresso</div><button id="endS">Encerrar</button>';
    else $("#main").innerHTML = '<div class="done"><h2>Fim</h2><div class="row"><button id="toHoje">Hoje</button></div></div>';
  }
  function renderHoje() {
    __calls.renderHoje++;
    $("#main").innerHTML = '<section class="hero"><h2>Hoje</h2></section><section class="panel" id="firstCard">primeiro card</section>';
  }
  function renderStats() {
    $("#main").innerHTML = '<section><label><input id="confOn" type="checkbox" checked> confiança</label></section>';
    bindStatsMemoria();
  }
  function bindStatsMemoria() {}
  function render() { if (S.tab === "sessao") renderSession(); else if (S.tab === "hoje") renderHoje(); }
  function answer() {}
  function mesclar(L, R) {
    const la = L.ajustes || {}, ra = R.ajustes || {};
    const remotoNovo = (ra.atualizadoEm || 0) > (la.atualizadoEm || 0);
    return { ajustes: { ...(remotoNovo ? la : ra), ...(remotoNovo ? ra : la) } };
  }
`;

function run(ctx, code) { return vm.runInContext(code, ctx); }
function state(ctx) { return run(ctx, "S"); }
function plain(value) { return JSON.parse(JSON.stringify(value)); }

async function ambiente({ dia = diaBase, ajustes = {} } = {}) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><main id="main"></main></body></html>', {
    runScripts: "outside-only", url: "https://fixture.test/"
  });
  const ctx = dom.getInternalVMContext();
  run(ctx, BASE);
  run(ctx, `globalThis.__dia = ${dia}; Object.assign(S.ajustes, ${JSON.stringify(ajustes)});`);
  run(ctx, modulo);
  await new Promise(resolve => setTimeout(resolve, 0));
  return { dom, ctx };
}

function sessao(ctx, opts = {}) {
  const s = {
    label: opts.label || "Revisão fictícia", modo: opts.modo || "normal", total: 1,
    done: opts.done || 0, pos: 0, queue: ["a"], ui: { id: "a", revealed: true, conf: null, t0: 1 },
    pausaAte: opts.pausaAte || 0
  };
  if (opts.leve === true) s.leve = true;
  run(ctx, `S.session = ${JSON.stringify(s)}; S.tab = "sessao"; render();`);
  return state(ctx).session;
}

function setSession(ctx, opts = {}) { return sessao(ctx, opts); }

// O primeiro render só exibe a pergunta; o marcador não pode ser gravado antes da ação da pessoa.
test("pergunta no máximo uma vez por dia, grava marcador ao iniciar e reutiliza o último plano do dia", async () => {
  const { ctx } = await ambiente({ dia: diaBase });
  setSession(ctx);
  assert.ok(run(ctx, "document.querySelector('#mcObj')"));
  assert.equal(state(ctx).ajustes.mcPerguntadoDia, undefined);
  assert.deepEqual(plain(run(ctx, "__calls.queue")), []);

  run(ctx, "document.querySelector('#mcObj').value = 'Foco do primeiro bloco'; document.querySelector('#mcObj').dispatchEvent(new Event('input', {bubbles:true})); document.querySelector('#mcIr').click();");
  assert.equal(state(ctx).ajustes.mcPerguntadoDia, diaBase);
  assert.deepEqual(plain(state(ctx).ajustes.mcPlanos.map(x => x[1])), ["Foco do primeiro bloco"]);
  assert.deepEqual(plain(run(ctx, "__calls.queue")), ["ajustes"]);

  setSession(ctx);
  assert.equal(run(ctx, "!!document.querySelector('#mcObj')"), false);
  assert.equal(state(ctx).session.mc.obj, "Foco do primeiro bloco");
  assert.equal(state(ctx).ajustes.mcPlanos.length, 1);
});

test("pular também marca o dia, não cria plano vazio e a segunda sessão entra direto", async () => {
  const { ctx } = await ambiente({ dia: diaBase });
  setSession(ctx);
  run(ctx, "document.querySelector('#mcPular').click();");
  assert.equal(state(ctx).ajustes.mcPerguntadoDia, diaBase);
  assert.deepEqual(plain(state(ctx).ajustes.mcPlanos), []);

  setSession(ctx);
  assert.equal(run(ctx, "!!document.querySelector('#mcObj')"), false);
  assert.deepEqual(plain(state(ctx).session.mc), { obj: "", res: [] });
});

test("modo leve, simulado e tese2f não exibem planejamento nem gravam marcador", async () => {
  for (const opts of [{ leve: true }, { modo: "simulado" }, { modo: "tese2f" }]) {
    const { ctx } = await ambiente({ dia: diaBase });
    setSession(ctx, opts);
    assert.equal(run(ctx, "!!document.querySelector('#mcObj')"), false);
    assert.deepEqual(plain(state(ctx).session.mc), { obj: "", res: [] });
    assert.equal(state(ctx).ajustes.mcPerguntadoDia, undefined);
  }
  const leve = await ambiente({ dia: diaBase, ajustes: { mcPerguntadoDia: diaBase, mcPlanos: [[planoTs(diaBase), "Foco reaproveitado"]] } });
  setSession(leve.ctx, { leve: true });
  assert.equal(run(leve.ctx, "!!document.querySelector('#mcObj')"), false);
  assert.equal(state(leve.ctx).session.mc.obj, "Foco reaproveitado");
});

test("virada do dia não reaproveita objeto de ontem", async () => {
  const ontem = diaBase - 1;
  const { ctx } = await ambiente({
    dia: diaBase,
    ajustes: { mcPerguntadoDia: ontem, mcPlanos: [[planoTs(ontem), "Foco de ontem"]] }
  });
  setSession(ctx);
  assert.ok(run(ctx, "document.querySelector('#mcObj')"));
  assert.equal(run(ctx, "document.querySelector('#mcObj').value"), "");
  assert.equal(state(ctx).ajustes.mcPerguntadoDia, ontem);
});

test("plano desativado não pergunta e reativar nas estatísticas libera a próxima pergunta", async () => {
  const { ctx } = await ambiente({ dia: diaBase, ajustes: { metaOn: false, mcPerguntadoDia: diaBase } });
  setSession(ctx);
  assert.equal(run(ctx, "!!document.querySelector('#mcObj')"), false);
  assert.deepEqual(plain(state(ctx).session.mc), { obj: "", res: [] });

  run(ctx, "renderStats();");
  assert.match(run(ctx, "document.querySelector('#mcOn').parentElement.textContent"), /Definir um foco no início do dia/);
  run(ctx, "document.querySelector('#mcOn').checked = true; document.querySelector('#mcOn').dispatchEvent(new Event('change', {bubbles:true}));");
  assert.equal(state(ctx).ajustes.metaOn, true);
  assert.equal(state(ctx).ajustes.mcPerguntadoDia, undefined);

  setSession(ctx);
  assert.ok(run(ctx, "document.querySelector('#mcObj')"));
});

test("Hoje mantém sugestões recolhidas, contadores e botão hiper sem duplicar na re-renderização", async () => {
  const { ctx } = await ambiente({ dia: diaBase, ajustes: {
    calib: [[planoTs(diaBase), "a", 1, 1]],
    mcPlanos: [[planoTs(diaBase), "Foco"]],
    reflexoes: [{ ts: planoTs(diaBase), mudar: "ajuste" }]
  } });
  run(ctx, "globalThis.__hiper = true; renderHoje();");
  assert.equal(run(ctx, "document.querySelectorAll('#mcMissoes').length"), 1);
  assert.equal(run(ctx, "document.querySelector('#mcMissoes').tagName"), "DETAILS");
  assert.equal(run(ctx, "document.querySelector('#mcMissoes').open"), false);
  assert.equal(run(ctx, "document.querySelector('#mcMissoes > summary').textContent"), "Refletir sobre o estudo (opcional)");
  assert.equal(run(ctx, "document.querySelector('#mcMissoes').querySelectorAll('.mc-missoes li').length"), 3);
  assert.equal(run(ctx, "document.querySelector('.hero').nextElementSibling.id"), "mcMissoes");
  assert.equal(run(ctx, "document.querySelector('#mcMissoes').nextElementSibling.id"), "firstCard");
  assert.ok(run(ctx, "document.querySelector('#mcHiper')"));
  run(ctx, "document.querySelector('#mcHiper').click();");
  assert.equal(run(ctx, "__calls.startModo"), 1);

  run(ctx, "renderHoje(); renderHoje();");
  assert.equal(run(ctx, "document.querySelectorAll('#mcMissoes').length"), 1);
  assert.equal(run(ctx, "document.querySelector('#mcMissoes').open"), false);
});

test("mesclar preserva o marcador mais novo e mantém FIFO dos planos válidos", async () => {
  const { ctx } = await ambiente({ dia: diaBase });
  run(ctx, `globalThis.__merge = mesclar(
    { ajustes: { atualizadoEm: 10, mcPerguntadoDia: ${diaBase - 1}, mcPlanos: [[${planoTs(diaBase - 1)}, "antigo"], [${planoTs(diaBase)}, "a"]] } },
    { ajustes: { atualizadoEm: 20, mcPerguntadoDia: ${diaBase}, mcPlanos: [[${planoTs(diaBase, 2)}, "b"], [${planoTs(diaBase, 2)}, "b"]] } }
  );`);
  const out = run(ctx, "__merge");
  assert.equal(out.ajustes.mcPerguntadoDia, diaBase);
  assert.deepEqual(plain(out.ajustes.mcPlanos.map(x => x[1])), ["antigo", "a", "b"]);
});
