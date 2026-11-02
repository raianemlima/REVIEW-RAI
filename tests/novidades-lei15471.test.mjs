import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// tolera checkout com CRLF (Windows) e LF (CI)
const app = readFileSync(new URL("../app-src.txt", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const itens = JSON.parse(app.match(/^const NOV_PUBLICO = (\[.*\]);\n/m)[1]);
const por = Object.fromEntries(itens.map(n => [n.id, n]));

test("Novidades: Lei 15.471/2026 (Ensceis) entra com os campos da aba, sem tirar as anteriores", () => {
  const n = por["nv-2026-11-lei15471"];
  assert.ok(n, "item da Lei 15.471/2026");
  assert.equal(n.tipo, "lei"); assert.equal(n.lei, "Lei 15.471/2026"); assert.equal(n.pub, "2026-07-21");   // DOU de 21/07/2026
  for (const c of ["titulo", "resumo", "temas", "mudou", "dpe", "prova"]) assert.ok(n[c] && n[c].length, `campo ${c}`);
  for (const p of n.papeis) assert.ok(["defesa", "assistido", "coletivo"].includes(p), p);
  assert.ok(n.treino.length >= 4 && n.treino.every(t => t.q && typeof t.a === "boolean" && t.e));
  assert.equal(new Set(itens.map(i => i.id)).size, itens.length, "ids repetidos");
  for (const id of ["nv-2026-10-lei15516", "nv-2026-10-lei15517", "nv-2026-10-lei15512", "nv-2026-10-lei15504", "nv-2026-10-lei15524"]) assert.ok(por[id], id);
});

test("Novidades: o resumo da Lei 15.471/2026 registra os vetos e que a Lei 6.360/1976 não foi alterada", () => {
  const n = por["nv-2026-11-lei15471"], texto = [n.resumo, ...n.mudou].join(" ");
  assert.match(texto, /arts\. 28, 35 e 38/);
  assert.match(texto, /Lei 6\.360\/1976[^.]*n[ãa]o foi alterada/);
  const errada = n.treino.find(t => /alterou a Lei 6\.360/.test(t.q));
  assert.equal(errada?.a, false);
});
