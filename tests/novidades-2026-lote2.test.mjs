import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// tolera checkout com CRLF (Windows) e LF (CI)
const app = readFileSync(new URL("../app-src.txt", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const itens = JSON.parse(app.match(/^const NOV_PUBLICO = (\[.*\]);\n/m)[1]);
const por = Object.fromEntries(itens.map(n => [n.id, n]));

// id -> [norma, data de publicação no DOU]
const LOTE = {
  "nv-2026-11-lei15358": ["Lei 15.358/2026", "2026-03-25"],
  "nv-2026-11-lei15402": ["Lei 15.402/2026", "2026-05-08"],
  "nv-2026-11-lei15353": ["Lei 15.353/2026", "2026-03-08"],
  "nv-2026-11-lei15384": ["Lei 15.384/2026", "2026-04-10"],
  "nv-2026-11-lei15397": ["Lei 15.397/2026", "2026-05-04"],
  "nv-2026-11-lei15407": ["Lei 15.407/2026", "2026-05-12"],
  "nv-2026-11-lei15487": ["Lei 15.487/2026", "2026-08-07"],
  "nv-2026-11-lei15410": ["Lei 15.410/2026", "2026-05-21"],
  "nv-2026-11-lei15438": ["Lei 15.438/2026", "2026-06-19"],
  "nv-2026-11-lei15380": ["Lei 15.380/2026", "2026-04-07"],
  "nv-2026-11-lei15383": ["Lei 15.383/2026", "2026-04-10"],
  "nv-2026-11-lei15411": ["Lei 15.411/2026", "2026-05-21"],
  "nv-2026-11-lei15412": ["Lei 15.412/2026", "2026-05-21"],
  "nv-2026-11-lei15392": ["Lei 15.392/2026", "2026-04-17"],
  "nv-2026-11-lei15455": ["Lei 15.455/2026", "2026-07-02"],
  "nv-2026-11-ec139": ["Emenda Constitucional 139/2026", "2026-05-06"],
  "nv-2026-11-ec140": ["Emenda Constitucional 140/2026", "2026-10-16"],
  "nv-2026-11-ec141": ["Emenda Constitucional 141/2026", "2026-10-16"],
  "nv-2026-11-lei15484": ["Lei 15.484/2026", "2026-08-04"],
  "nv-2026-11-lei15479": ["Lei 15.479/2026", "2026-07-30"],
  "nv-2026-11-lei15378": ["Lei 15.378/2026", "2026-04-07"],
  "nv-2026-11-lei15327": ["Lei 15.327/2026", "2026-01-07"],
  "nv-2026-11-lei15371": ["Lei 15.371/2026", "2026-04-01"],
  "nv-2026-11-lei15500": ["Lei 15.500/2026", "2026-09-04"],
  "nv-2026-11-lei15434": ["Lei 15.434/2026", "2026-06-17"],
  "nv-2026-11-lc225": ["Lei Complementar 225/2026", "2026-01-09"],
  "nv-2026-11-lc236": ["Lei Complementar 236/2026", "2026-09-04"],
};

test("Novidades: o lote de leis e emendas de 2026 entra com os campos da aba, sem tirar as anteriores", () => {
  assert.equal(new Set(itens.map(i => i.id)).size, itens.length, "ids repetidos");
  for (const [id, [lei, pub]] of Object.entries(LOTE)) {
    const n = por[id];
    assert.ok(n, id);
    assert.equal(n.tipo, "lei", id); assert.equal(n.lei, lei, id); assert.equal(n.pub, pub, id);
    for (const c of ["titulo", "resumo", "temas", "mudou", "dpe", "prova"]) assert.ok(n[c] && n[c].length, `${id}: campo ${c}`);
    for (const p of n.papeis || []) assert.ok(["defesa", "assistido", "coletivo"].includes(p), `${id}: ${p}`);
    assert.ok(n.treino.length >= 3 && n.treino.every(t => t.q && typeof t.a === "boolean" && t.e), `${id}: treino`);
  }
  for (const id of ["nv-2026-11-lei15471", "nv-2026-10-lei15516", "nv-2026-10-lei15517", "nv-2026-10-lei15512", "nv-2026-10-lei15504", "nv-2026-10-lei15524"]) assert.ok(por[id], id);
});

test("Novidades: marcos que o lote precisa registrar (vigência, vetos e pegadinhas)", () => {
  const txt = id => { const n = por[id]; return [n.resumo, ...n.mudou, ...n.prova].join(" "); };
  assert.match(txt("nv-2026-11-lei15371"), /01\/01\/2027/);                       // licença-paternidade só vale em 2027
  assert.match(txt("nv-2026-11-lei15479"), /1 ano/);                              // transferência automática de alimentos: vacatio de 1 ano
  assert.match(txt("nv-2026-11-ec141"), /inciso XV[^.]*2 meses/);                 // dois dias de repouso só 2 meses depois
  assert.match(txt("nv-2026-11-ec140"), /31\/12\/2028/);                          // prazo de admissão dos ACS e ACE
  assert.match(txt("nv-2026-11-lei15397"), /revoga[^.]*§5º do art\. 171|§5º do art\. 171[^.]*revogad/i);
  assert.match(txt("nv-2026-11-lei15402"), /veto total|VETADO/);                  // promulgada após derrubada do veto
  assert.match(txt("nv-2026-11-lei15358"), /70%/);                                // art. 112, V, da LEP
  assert.match(txt("nv-2026-11-lc236"), /2 anos/);                                // prazo de adaptação dos entes
});
