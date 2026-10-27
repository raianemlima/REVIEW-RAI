import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const ler = arquivo => readFileSync(new URL(`../${arquivo}`, import.meta.url), "utf8");
const app = ler("app-src.txt");

function trecho(inicio, fim) {
  const i = app.indexOf(inicio), f = app.indexOf(fim, i);
  assert.ok(i >= 0 && f > i, `trecho não encontrado: ${inicio}`);
  return app.slice(i, f);
}

// Executa as funções reais do app com estado e service worker fictícios.
function ambiente({ tab = "hoje", session = null, foco = null } = {}) {
  const mensagens = [], ordem = [];
  const ctx = {
    S: { tab, session },
    document: { activeElement: foco },
    flush: async () => { ordem.push("flush"); },
    $: () => null,
  };
  vm.createContext(ctx);
  vm.runInContext(trecho("function estudoEmAndamento()", "function mostrarAtualizar(w)"), ctx);
  const w = { postMessage: m => { ordem.push("skip"); mensagens.push(m); } };
  return { ctx, w, mensagens, ordem };
}

const campo = { matches: sel => sel.includes("textarea") };

test("fora de uma sessão de estudo, a versão nova é aplicada sem botão, depois de gravar o pendente", async () => {
  const a = ambiente({ tab: "hoje" });
  assert.equal(vm.runInContext("estudoEmAndamento()", a.ctx), false);
  await vm.runInContext("aplicarAtualizacao", a.ctx)(a.w);
  assert.deepEqual(a.ordem, ["flush", "skip"]);
  assert.deepEqual(JSON.parse(JSON.stringify(a.mensagens)), [{ type: "SKIP_WAITING" }]);
});

test("sessão em andamento, jogo ou campo em edição adiam a troca de versão", () => {
  assert.equal(vm.runInContext("estudoEmAndamento()", ambiente({ tab: "sessao", session: { ui: {} } }).ctx), true);
  assert.equal(vm.runInContext("estudoEmAndamento()", ambiente({ tab: "jogo" }).ctx), true);
  assert.equal(vm.runInContext("estudoEmAndamento()", ambiente({ tab: "hoje", foco: campo }).ctx), true);
  assert.equal(vm.runInContext("estudoEmAndamento()", ambiente({ tab: "sessao", session: null }).ctx), false);
});

test("falha ao gravar não impede a atualização", async () => {
  const a = ambiente();
  a.ctx.flush = async () => { throw new Error("sem conexão"); };
  await vm.runInContext("aplicarAtualizacao", a.ctx)(a.w);
  assert.deepEqual(JSON.parse(JSON.stringify(a.mensagens)), [{ type: "SKIP_WAITING" }]);
});

test("o registro aplica sozinho quando seguro, avisa quando não e aplica ao sair do app", () => {
  const registro = trecho('navigator.serviceWorker.register("sw.js")', "setInterval(");
  assert.match(registro, /if \(!estudoEmAndamento\(\)\) \{ aplicarAtualizacao\(w\); return; \}/);
  assert.match(registro, /pendente = w; mostrarAtualizar\(w\);/);
  assert.match(registro, /visibilityState === "hidden" && pendente/);
});

test("a instalação da versão nova ignora o cache HTTP do navegador", async () => {
  const pedidos = [];
  const ctx = {
    Request: class { constructor(url, op) { this.url = url; this.cache = op?.cache; } },
    caches: { open: async () => ({ match: async () => undefined, addAll: async lista => { pedidos.push(...lista); } }), keys: async () => [] },
    self: { addEventListener: (tipo, fn) => { if (tipo === "install") ctx.instalar = fn; }, location: { origin: "https://x.test" } },
  };
  vm.createContext(ctx);
  vm.runInContext(ler("sw.js"), ctx);
  let espera;
  ctx.instalar({ waitUntil: p => { espera = p; } });
  await espera;
  assert.ok(pedidos.length > 5);
  assert.ok(pedidos.every(r => r.cache === "reload"));
});
