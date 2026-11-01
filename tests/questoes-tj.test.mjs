import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// tolera checkout com CRLF (Windows) e LF (CI)
const app = readFileSync(new URL("../app-src.txt", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const i = app.indexOf("const PROVAS_PUBLICO = ") + "const PROVAS_PUBLICO = ".length;
const provas = JSON.parse(app.slice(i, app.indexOf(";\n", i)));
const porId = Object.fromEntries(provas.map(p => [p.id, p]));

test("banco de provas: as provas que já existiam continuam no app", () => {
  const antigas = { "fcc-defensorias": 403, "dpe-mg-2023": 100, "dpe-pe-2025": 100, "dpe-pr-2024": 100, "dpe-rn-2015": 100, "dpe-ro-2025": 70, "dpesp-2025-propria": 94 };
  for (const [id, n] of Object.entries(antigas)) assert.equal(porId[id]?.questoes.length, n, id);
  assert.equal(provas[0].id, "fcc-defensorias");
});

test("provas de TJ (FGV): 70 questões com 5 alternativas, gabarito A a E ou X (anulada), ids únicos", () => {
  const novas = provas.filter(p => /^tj(mt|rr)-2024-/.test(p.id));
  assert.ok(novas.length >= 7);
  assert.equal(new Set(provas.map(p => p.id)).size, provas.length);
  for (const p of novas) {
    assert.equal(p.banca, "FGV"); assert.equal(p.gabarito, "definitivo"); assert.equal(p.questoes.length, 70, p.id);
    p.questoes.forEach((q, k) => {
      assert.equal(q.n, k + 1, `${p.id} questão fora de ordem`);
      assert.deepEqual(Object.keys(q.alternativas), ["A", "B", "C", "D", "E"], `${p.id} q${q.n}`);
      assert.match(q.gabarito, /^[A-EX]$/, `${p.id} q${q.n}`);
      assert.ok(q.enunciado.length > 15 && q.materia, `${p.id} q${q.n}`);
    });
  }
  assert.equal(porId["tjmt-2024-analista-judiciario-direito"].questoes.filter(q => q.gabarito === "X").length, 3);   // gabarito retificado
});
