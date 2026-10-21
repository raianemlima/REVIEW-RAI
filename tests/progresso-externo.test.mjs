import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { test } from "node:test";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(resolve(raiz, "app-src.txt"), "utf8");

function trecho(inicio, fim) {
  const a = app.indexOf(inicio), b = app.indexOf(fim, a);
  assert.ok(a >= 0 && b > a, `trecho ausente no app-src.txt: ${inicio}`);
  return app.slice(a, b);
}
const linha = prefixo => { const a = app.indexOf(prefixo); assert.ok(a >= 0, prefixo); return app.slice(a, app.indexOf("\n", a)); };

const ctx = vm.createContext({});
vm.runInContext([
  linha("function cleanCards("),
  trecho("const objPuro", "function localLoad"),
  linha("function cadMesclar("),
  trecho("function mesclar(", "function aplicarMesclado"),
  "this.limparProgresso = limparProgresso; this.mesclar = mesclar;",
].join("\n"), ctx);
const { limparProgresso, mesclar } = ctx;
const plano = v => JSON.parse(JSON.stringify(v));

test("lixo na raiz vira progresso vazio", () => {
  for (const ruim of [null, undefined, 7, "x", [], true]) {
    assert.deepEqual(plano(limparProgresso(ruim)), { cards: {}, logs: {}, flags: {}, ajustes: {} });
  }
});

test("campos com formato errado são descartados, os válidos são mantidos", () => {
  const r = limparProgresso({
    cards: { a: { s: 2, last: 1 }, b: null, c: { s: "x" }, d: 5 },
    logs: { "2026-10": { q1: 1 }, "2026-11": "texto", "2026-12": [1] },
    flags: { a: { ts: 1 }, b: 3, c: null },
    ajustes: { conq: "oi", nvLidas: ["x"], calib: [[1, 2], "z", null], erros: 9, caderno: [{ id: "k" }, { semid: 1 }, null],
      meus: [{ id: "m1", frente: "f", verso: "v" }, { id: "m2", frente: "f" }, { id: 3, frente: "f", verso: "v" }],
      notas: [], desafios: "x", jogo: 4, minutos: 15 },
  });
  assert.deepEqual(Object.keys(r.cards), ["a"]);
  assert.deepEqual(Object.keys(r.logs), ["2026-10"]);
  assert.deepEqual(Object.keys(r.flags), ["a"]);
  const a = r.ajustes;
  assert.equal("conq" in a, false);
  assert.deepEqual(plano(a.nvLidas), ["x"]);
  assert.deepEqual(plano(a.calib), [[1, 2]]);
  assert.equal("erros" in a, false);
  assert.deepEqual(plano(a.caderno), [{ id: "k" }]);
  assert.deepEqual(plano(a.meus), [{ id: "m1", frente: "f", verso: "v" }]);
  for (const k of ["notas", "desafios", "jogo"]) assert.equal(k in a, false, k);
  assert.equal(a.minutos, 15);
});

test("dado remoto malformado não derruba a mesclagem", () => {
  const local = { cards: { a: { s: 1, last: 1 } }, logs: {}, flags: {}, ajustes: { conq: ["x"], calib: [[1, 2]] } };
  const remoto = { cards: "x", logs: [], flags: 5, ajustes: { conq: 3, calib: 8, erros: "e", caderno: 1, meus: {}, notas: 2, t2f: null } };
  const m = mesclar(local, limparProgresso(remoto));
  assert.deepEqual(Object.keys(m.cards), ["a"]);
  assert.deepEqual(plano(m.ajustes.conq), ["x"]);
  assert.deepEqual(plano(m.ajustes.calib), [[1, 2]]);
});

test("progresso válido atravessa a limpeza sem perda", () => {
  const ok = { app: "revisao-dpe", cards: { a: { s: 3, last: 9 } }, logs: { "2026-10": { x: 1 } }, flags: { a: { ts: 2 } },
    ajustes: { conq: ["c"], erros: [[1, "a"]], meus: [{ id: "mc-1", frente: "f", verso: "v" }], notas: { a: "n" } } };
  assert.deepEqual(plano(limparProgresso(ok)), ok);
});

test("pontos de entrada usam a limpeza e atributos da semana são escapados", () => {
  assert.match(app, /mesclar\(local, limparProgresso\(rem\.data\)\)/);
  assert.match(app, /const lim = limparProgresso\(j\);/);
  assert.match(app, /title="\$\{esc\(x\.nome\)\}" aria-label="\$\{esc\(x\.nome\)\}/);
});
