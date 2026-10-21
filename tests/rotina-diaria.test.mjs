import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const htmlApp = readFileSync(resolve(raiz, "app-src.txt"), "utf8");
const DAY = 86400000;
const AGORA = Date.parse("2026-10-19T12:00:00Z");

/** Extrai apenas uma função versionada do app, sem carregar o baralho cifrado ou a rede. */
function funcaoReal(nome, ocorrencia = 0) {
  const alvo = `function ${nome}(`;
  let inicio = -1;
  for (let n = 0; n <= ocorrencia; n++) {
    inicio = htmlApp.indexOf(alvo, inicio + 1);
    assert.ok(inicio >= 0, `função real ausente no index.html: ${nome}`);
  }
  // O primeiro "{" pode ser o valor default de um parâmetro; localize o
  // primeiro corpo depois de fechar a lista de parâmetros.
  let abre = -1, parenteses = 0, aspasCabecalho = null;
  for (let i = htmlApp.indexOf("(", inicio); i < htmlApp.length; i++) {
    const ch = htmlApp[i];
    if (aspasCabecalho) {
      if (ch === "\\") { i++; continue; }
      if (ch === aspasCabecalho) aspasCabecalho = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") { aspasCabecalho = ch; continue; }
    if (ch === "(") parenteses++;
    else if (ch === ")") parenteses--;
    else if (ch === "{" && parenteses === 0) { abre = i; break; }
  }
  assert.ok(abre >= 0, `corpo ausente para ${nome}`);
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

// As fronteiras abaixo são o código real do index.html. O restante é harness:
// somente dados, persistência, scheduler e renderização são substituídos.
const REAL = {
  dayOf: funcaoReal("dayOf"),
  today: funcaoReal("today"),
  logsOrd: funcaoReal("logsOrd"),
  allLogs: funcaoReal("allLogs"),
  espalharTemas: funcaoReal("espalharTemas"),
  espalharLongos: funcaoReal("espalharLongos"),
  normalizarMetaDiaria: funcaoReal("normalizarMetaDiaria"),
  rotinaDiaria: funcaoReal("rotinaDiaria"),
  definirMetaDiaria: funcaoReal("definirMetaDiaria"),
  selecionarBloco: funcaoReal("selecionarBloco"),
  podeRepetirSessao: funcaoReal("podeRepetirSessao"),
  plan: funcaoReal("plan"),
  startSession: funcaoReal("startSession"),
  newCardUI: funcaoReal("newCardUI"),
  answer: funcaoReal("answer"),
  snapshot: funcaoReal("snapshot"),
  mesclar: funcaoReal("mesclar"),
};

const ids = [
  ...Array.from({ length: 80 }, (_, i) => `c${i + 1}`),
  ...Array.from({ length: 12 }, (_, i) => `long${i + 1}`),
];
const byIdFixture = Object.fromEntries(ids.map(id => [id, {
  id,
  tipo: "conceito",
  disc: "pi",
  tema: id.startsWith("long") ? "Questões longas" : `Tema ${Number(id.slice(1)) % 3}`,
  frente: id.startsWith("long") ? "x".repeat(351) : `Frente ${id}`,
  verso: `Verso ${id}`,
  peso: 3,
  inc: 3,
  ord: Number(id.replace(/\D/g, "")) || 0,
}]));

const BASE = String.raw`
  "use strict";
  const DAY = 86400000;
  const LONGO = 350;
  const SO_LOCAL = [];
  const DECK = { versao: 77, cartoes: [], disciplinas: [] };
  const byId = __BY_ID__;
  const S = {
    mode: "local", tab: "hoje", session: null, cards: {}, logs: {}, flags: {},
    ajustes: { minutos: 30, novosMax: 20, metaDiaria: 10 }
  };
  const __calls = { queue: [], rate: [], go: [], toasts: [], renders: 0 };
  globalThis.__calls = __calls;
  globalThis.__active = [];
  globalThis.__ritmo = { rev: 15, nov: 40 };
  globalThis.__now = __AGORA__;
  let _logsC = null, _logsRef = null, _logsMs = [];
  Date.now = () => __now;

  function $(q) { return document.querySelector(q); }
  __DAYOF__
  __TODAY__
  __LOGSORD__
  __ALLLOGS__
  function queue(...a) { __calls.queue.push(a); }
  function toast(msg) { __calls.toasts.push(String(msg)); }
  function stopSimTimer() {}
  function renderSession() { __calls.renders++; }
  function render() {}
  function go(tab) { S.tab = tab; __calls.go.push(tab); }
  function buzz() {}
  function checkDesafio() {}
  function checkConq() {}
  function ensureAj() {
    S.ajustes.calib ||= [];
    S.ajustes.t2f ||= [];
  }
  function rate(id, g) { __calls.rate.push([id, g]); }
  function retrievability(t, s) { return Math.pow(1 + (19 / 81) * t / s, -0.5); }
  function xpTotal() { return 0; }
  function desempilharVespera() {}
  function faseAtual() { return -1; }
  function ctx() { return { daysToExam: null, pesoDisciplina: 1 }; }
  function prio(c) { return c.prio || 0; }
  function activeCards() { return __active.slice(); }
  function introducedToday() { return Object.values(S.cards).filter(st => st && st.f === today()).length; }
  function ritmoSeg() { return __ritmo; }
  function cadMesclar(a, b) { return [...(a || []), ...(b || [])]; }
  const ehLongo = c => !!c && ((c.frente || "").length > LONGO);
  __ESPALHAR_TEMAS__
  __ESPALHAR_LONGOS__
  __NORMALIZAR__
  __ROTINA__
  __DEFINIR__
  __SELECIONAR__
  __PODE__
  __PLAN__
  __NEW_CARD__
  __START__
  __ANSWER__
  __SNAPSHOT__
  __MESCLAR__
`;

function scriptBase() {
  return BASE
    .replace("__BY_ID__", JSON.stringify(byIdFixture))
    .replace("__AGORA__", String(AGORA))
    .replace("__DAYOF__", REAL.dayOf)
    .replace("__TODAY__", REAL.today)
    .replace("__LOGSORD__", REAL.logsOrd)
    .replace("__ALLLOGS__", REAL.allLogs)
    .replace("__ESPALHAR_TEMAS__", REAL.espalharTemas)
    .replace("__ESPALHAR_LONGOS__", REAL.espalharLongos)
    .replace("__NORMALIZAR__", REAL.normalizarMetaDiaria)
    .replace("__ROTINA__", REAL.rotinaDiaria)
    .replace("__DEFINIR__", REAL.definirMetaDiaria)
    .replace("__SELECIONAR__", REAL.selecionarBloco)
    .replace("__PODE__", REAL.podeRepetirSessao)
    .replace("__PLAN__", REAL.plan)
    .replace("__NEW_CARD__", REAL.newCardUI)
    .replace("__START__", REAL.startSession)
    .replace("__ANSWER__", REAL.answer)
    .replace("__SNAPSHOT__", REAL.snapshot)
    .replace("__MESCLAR__", REAL.mesclar);
}

function run(ctx, code) { return vm.runInContext(code, ctx); }
function plain(value) { return JSON.parse(JSON.stringify(value)); }

async function ambiente() {
  const dom = new JSDOM("<!doctype html><html><body><main id=main></main></body></html>", {
    runScripts: "outside-only",
    url: "https://local.test/",
  });
  const ctx = dom.getInternalVMContext();
  run(ctx, scriptBase());
  await new Promise(resolve => setTimeout(resolve, 0));
  return { dom, ctx };
}

function setNow(ctx, ts = AGORA) {
  run(ctx, `__now = ${ts}; Date.now = () => __now;`);
}
function setLogs(ctx, entries) {
  const months = {};
  for (const [i, e] of entries.entries()) {
    const d = new Date(e[0]);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    (months[month] ||= {})[`e${i}`] = e;
  }
  run(ctx, `S.logs = ${JSON.stringify(months)};`);
}
function cardRows(n, prefix = "c") {
  return Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i + 1}`, disc: "pi", tema: `Tema ${i % 2}`, peso: 3, inc: 3, ord: i }));
}
function state(ctx) { return run(ctx, "S"); }
function calls(ctx) { return run(ctx, "__calls"); }


test("normalização aceita atalhos, rejeita entrada inválida e a meta de hoje não vaza para amanhã", async () => {
  const { ctx } = await ambiente();
  assert.deepEqual(plain(run(ctx, "[normalizarMetaDiaria(5), normalizarMetaDiaria(10), normalizarMetaDiaria(20), normalizarMetaDiaria(50)]")), [5, 10, 20, 50]);
  assert.deepEqual(plain(run(ctx, "[normalizarMetaDiaria(0), normalizarMetaDiaria(-1), normalizarMetaDiaria(NaN), normalizarMetaDiaria(Infinity), normalizarMetaDiaria(''), normalizarMetaDiaria(51)]")), [10, 10, 10, 10, 10, 50]);

  run(ctx, "S.ajustes.metaDiaria = 10; definirMetaDiaria(5, true);");
  const hoje = run(ctx, "today()");
  assert.deepEqual(plain(run(ctx, "[S.ajustes.metaDiaria, S.ajustes.metaHoje, __calls.queue.at(-1)[0]]")), [10, { dia: hoje, valor: 5 }, "ajustes"]);
  assert.equal(run(ctx, "rotinaDiaria().meta"), 5);

  setNow(ctx, AGORA + DAY);
  assert.equal(run(ctx, "rotinaDiaria().meta"), 10);
  assert.equal(run(ctx, "!!S.ajustes.metaHoje"), true, "o override antigo pode permanecer salvo, mas não deve valer fora do dia");
  run(ctx, "definirMetaDiaria(20);");
  assert.deepEqual(plain(run(ctx, "[S.ajustes.metaDiaria, S.ajustes.metaHoje]")), [20, null]);
});

test("rotina diária conta cartões distintos, inclusive erro grau 1 repetido", async () => {
  const { ctx } = await ambiente();
  setLogs(ctx, [
    [AGORA - 1000, "c1", 1],
    [AGORA, "c1", 1],
    [AGORA + 1000, "c1", 2],
    [AGORA + 2000, "c2", 1],
    [AGORA - DAY, "c3", 1],
  ]);
  run(ctx, "S.ajustes.metaDiaria = 10;");
  assert.deepEqual(plain(run(ctx, "rotinaDiaria()")), {
    meta: 10,
    feitos: 2,
    restantes: 8,
    concluida: false,
    retomada: false,
    temporaria: false,
  });
});

test("backlog de 71 preserva pendências e seleciona somente os 10 do bloco padrão", async () => {
  const { ctx } = await ambiente();
  const due = cardRows(71);
  run(ctx, `S.ajustes.metaDiaria = 10; S.cards = Object.fromEntries(${JSON.stringify(due)}.map(c => [c.id, { s: 3, due: today(), last: today(), reps: 2 }]));`);
  run(ctx, `globalThis.__p = ${JSON.stringify({ due, newToday: [] })}; globalThis.__b = selecionarBloco(__p);`);
  assert.equal(run(ctx, "__b.q.length"), 10);
  assert.equal(run(ctx, "__p.due.length"), 71);
  assert.equal(run(ctx, "__b.limiteTentativas"), 15);
  assert.equal(run(ctx, "rotinaDiaria().restantes"), 10);
});

test("plan limita novos pela meta restante, não infla a meta após revisões e preserva minutos/novosMax", async () => {
  const { ctx } = await ambiente();
  const due = [{ id: "c1", disc: "pi", tema: "Revisão", peso: 5, inc: 5, ord: 0 }];
  const fresh = cardRows(50).map((c, i) => ({ ...c, id: `c${i + 2}`, ord: i + 1 }));
  setLogs(ctx, [[AGORA, "c1", 1], [AGORA + 1000, "c1", 1], [AGORA + 2000, "c1", 1]]);
  run(ctx, `S.cards = { c1: { s: 3, due: today(), last: today() - 2, reps: 2 } }; S.ajustes.metaDiaria = 10; S.ajustes.minutos = 30; S.ajustes.novosMax = 20; __active = ${JSON.stringify([...due, ...fresh])}; __ritmo = {rev: 15, nov: 40}; globalThis.__p = plan();`);
  assert.equal(run(ctx, "__p.due.length"), 1);
  assert.equal(run(ctx, "__p.newToday.length"), 8, "três respostas do mesmo cartão não criam três cartões de progresso nem elevam o alvo");
  assert.equal(run(ctx, "rotinaDiaria().meta"), 10);
  assert.deepEqual(plain(run(ctx, "[S.ajustes.minutos, S.ajustes.novosMax]")), [30, 20]);

  run(ctx, `S.cards = {}; S.logs = {}; __active = ${JSON.stringify(cardRows(50))}; S.ajustes.metaDiaria = 10; S.ajustes.minutos = 30; S.ajustes.novosMax = 20; globalThis.__p = plan();`);
  assert.equal(run(ctx, "__p.newToday.length"), 10, "planejar não deve sobrescrever o teto existente de novos");
});

test("retomada após três dias prioriza vencidos e não inclui cartões novos", async () => {
  const { ctx } = await ambiente();
  const due = [
    { id: "c1", disc: "pi", tema: "Urgente", peso: 5, inc: 5, ord: 0 },
    { id: "c2", disc: "pi", tema: "Depois", peso: 2, inc: 2, ord: 1 },
  ];
  const fresh = cardRows(5).map((c, i) => ({ ...c, id: `c${i + 3}` }));
  setLogs(ctx, [[AGORA - 3 * DAY, "c9", 1]]);
  run(ctx, `S.cards = { c1: {s:3,due:today(),last:today()-5,reps:2}, c2: {s:3,due:today(),last:today()-4,reps:2} }; S.ajustes.metaDiaria = 10; __active = ${JSON.stringify([...due, ...fresh])}; globalThis.__p = plan();`);
  assert.equal(run(ctx, "rotinaDiaria().retomada"), true);
  assert.deepEqual(plain(run(ctx, "__p.due.map(c => c.id)")), ["c1", "c2"]);
  assert.deepEqual(plain(run(ctx, "__p.newToday.map(c => c.id)")), []);
});

test("cartões novos usam apenas a sala restante do orçamento de minutos", async () => {
  const { ctx } = await ambiente();
  run(ctx, `S.cards = {}; S.ajustes.metaDiaria = 50; S.ajustes.minutos = 5; S.ajustes.novosMax = 20; __active = ${JSON.stringify(cardRows(12))}; __ritmo = {rev: 15, nov: 40}; globalThis.__p = plan();`);
  assert.equal(run(ctx, "__p.newToday.length"), 7, "floor(300/40), sem ultrapassar cinco minutos");
  assert.equal(run(ctx, "__p.minutes"), 5);
});

test("bloco leve, orçamento e questões longas permanecem finitos", async () => {
  const { ctx } = await ambiente();
  const due = Array.from({ length: 12 }, (_, i) => ({ id: `long${i + 1}`, disc: "pi", tema: "Questões longas", frente: "x".repeat(351), peso: 3, inc: 3, ord: i }));
  run(ctx, `S.cards = Object.fromEntries(${JSON.stringify(due)}.map(c => [c.id, {s:3,due:today(),last:today(),reps:1}])); S.ajustes.metaDiaria = 50; S.ajustes.minutos = 5; globalThis.__b = selecionarBloco(${JSON.stringify({ due, newToday: [] })}); globalThis.__leve = selecionarBloco(${JSON.stringify({ due, newToday: [] })}, true);`);
  assert.equal(run(ctx, "__b.q.length"), 5, "cada questão longa custa ao menos um minuto no orçamento");
  assert.equal(run(ctx, "__b.minutos"), 5);
  assert.ok(run(ctx, "__leve.q.length") <= 5);
  assert.ok(run(ctx, "__leve.q.length + Math.ceil(__leve.q.length / 2)") <= 8);
});

test("resposta com erro reinsere cada cartão no máximo uma vez e respeita teto de 1,5 bloco", async () => {
  const { ctx } = await ambiente();
  const q = Array.from({ length: 10 }, (_, i) => `c${i + 1}`);
  run(ctx, `S.cards = {}; S.session = { modo: "plano", queue: ${JSON.stringify(q)}, pos: 0, total: 10, done: 0, again: 0, results: {1:0,2:0,3:0,4:0}, limiteTentativas: 15, repeticoes: {}, ui: {id: "c1", revealed: true, conf: null, t0: 1} };`);
  // O loop é deliberadamente limitado: sem a guarda real, ele ainda termina e expõe
  // uma fila maior que o teto, em vez de esconder uma repetição infinita no teste.
  run(ctx, "for (let i = 0; i < 100 && S.session.ui; i++) { S.session.ui.revealed = true; answer(1); }");
  assert.equal(run(ctx, "S.session.queue.length"), 15, run(ctx, "JSON.stringify({queue:S.session.queue,pos:S.session.pos,done:S.session.done,ui:S.session.ui,repeticoes:S.session.repeticoes})"));
  assert.equal(run(ctx, "S.session.done"), 15);
  assert.equal(run(ctx, "Object.keys(S.session.repeticoes).length"), 5);
  assert.equal(run(ctx, "Math.max(...Object.values(S.session.repeticoes))"), 1, "cada id pode ser reinscrito no máximo uma vez");
  assert.equal(run(ctx, "new Set(S.session.queue).size"), 10);
  assert.equal(run(ctx, "Math.max(...Object.values(S.session.results))"), 15);
});

test("podeRepetirSessao mantém contrato permissivo de modos legados/simulados", async () => {
  const { ctx } = await ambiente();
  assert.equal(run(ctx, "podeRepetirSessao({modo:'simulado', queue:Array(100), limiteTentativas:null}, 'c1')"), true);
  assert.equal(run(ctx, "podeRepetirSessao({modo:'tese2f', queue:Array(100)}, 'c1')"), true);
  assert.equal(run(ctx, "podeRepetirSessao({queue:Array(14), limiteTentativas:15, repeticoes:{c1:1}}, 'c1')"), false);
  assert.equal(run(ctx, "podeRepetirSessao({queue:Array(14), limiteTentativas:15, repeticoes:{}}, 'c1')"), true);
});

test("startSession grava metadados do bloco leve e retoma a mesma UI sem perder progresso", async () => {
  const { ctx } = await ambiente();
  run(ctx, `S.cards = {}; S.ajustes.metaDiaria = 10; __active = ${JSON.stringify(cardRows(8))}; S.session = null; startSession({leve:true});`);
  assert.equal(run(ctx, "S.tab"), "sessao");
  assert.ok(run(ctx, "S.session.queue.length") <= 5);
  assert.equal(run(ctx, "S.session.dia"), run(ctx, "today()"));
  assert.equal(run(ctx, "S.session.leve"), true);
  assert.equal(run(ctx, "S.session.modo"), "plano");
  assert.equal(run(ctx, "S.session.limiteTentativas"), run(ctx, "S.session.queue.length + Math.ceil(S.session.queue.length / 2)"));
  assert.deepEqual(plain(run(ctx, "S.session.repeticoes")), {});

  run(ctx, `globalThis.__sRef = S.session; globalThis.__uiRef = S.session.ui; S.session.done = 3; S.session.results = {1:1,2:0,3:2,4:0}; S.session.ui.t0 = 7; __now = ${AGORA + 12345}; startSession();`);
  assert.equal(run(ctx, "S.session === __sRef"), true);
  assert.equal(run(ctx, "S.session.ui === __uiRef"), true);
  assert.equal(run(ctx, "S.session.ui.t0"), AGORA + 12345);
  assert.equal(run(ctx, "S.session.done"), 3);
  assert.deepEqual(plain(run(ctx, "S.session.results")), {1:1,2:0,3:2,4:0});
});

test("snapshot contém preferência e override, enquanto mesclar usa preferência mais nova e preserva histórico", async () => {
  const { ctx } = await ambiente();
  const hoje = run(ctx, "today()");
  run(ctx, `S.ajustes = { minutos:30, novosMax:20, metaDiaria:20, metaHoje:{dia:${hoje},valor:5}, atualizadoEm:4 }; S.cards = {c1:{s:3,last:1,reps:2}}; S.logs = {"2026-10":{a:[${AGORA},"c1",1]}};`);
  const snap = run(ctx, "snapshot()");
  assert.equal(snap.ajustes.metaDiaria, 20);
  assert.deepEqual(plain(snap.ajustes.metaHoje), { dia: hoje, valor: 5 });
  assert.deepEqual(plain(snap.logs["2026-10"].a), [AGORA, "c1", 1]);

  run(ctx, `globalThis.__merged = mesclar(
    { ajustes:{atualizadoEm:1,metaDiaria:5,metaHoje:{dia:${hoje},valor:5},conq:["antiga"]}, cards:{c1:{last:1,reps:1}}, logs:{"2026-09":{old:[1,"c1",1]}}, flags:{} },
    { ajustes:{atualizadoEm:2,metaDiaria:20,metaHoje:{dia:${hoje},valor:20},conq:["nova"]}, cards:{c2:{last:2,reps:1}}, logs:{"2026-10":{new:[2,"c2",3]}}, flags:{} }
  );`);
  assert.equal(run(ctx, "__merged.ajustes.metaDiaria"), 20);
  assert.deepEqual(plain(run(ctx, "__merged.ajustes.metaHoje")), { dia: hoje, valor: 20 });
  assert.deepEqual(plain(run(ctx, "Object.keys(__merged.logs).sort()")), ["2026-09", "2026-10"]);
  assert.deepEqual(plain(run(ctx, "Object.keys(__merged.cards).sort()")), ["c1", "c2"]);
  assert.deepEqual(plain(run(ctx, "__merged.ajustes.conq.sort()")), ["antiga", "nova"]);
});
