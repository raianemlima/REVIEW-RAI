import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// tolera checkout com CRLF (Windows) e LF (CI)
const app = readFileSync(new URL("../app-src.txt", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const i = app.indexOf("const PROVAS_PUBLICO = ") + "const PROVAS_PUBLICO = ".length;
const provas = JSON.parse(app.slice(i, app.indexOf(";\n", i)));
const porId = Object.fromEntries(provas.map(p => [p.id, p]));
const novas = provas.filter(p => /^(tj|mp)[a-z]*-\d{4}-/.test(p.id));

test("banco de provas: as provas que já existiam continuam no app", () => {
  const antigas = { "fcc-defensorias": 403, "dpe-mg-2023": 100, "dpe-pe-2025": 100, "dpe-pr-2024": 100, "dpe-rn-2015": 100, "dpe-ro-2025": 70, "dpesp-2025-propria": 94 };
  for (const [id, n] of Object.entries(antigas)) assert.equal(porId[id]?.questoes.length, n, id);
  assert.equal(provas[0].id, "fcc-defensorias");
  assert.equal(new Set(provas.map(p => p.id)).size, provas.length, "ids repetidos");
});

test("provas de TJ e MP: formato do banco, gabarito definitivo e anuladas como X", () => {
  assert.ok(novas.length >= 30, `só ${novas.length} provas novas`);
  for (const p of novas) {
    assert.ok(["FGV", "Cebraspe"].includes(p.banca), p.id); assert.equal(p.gabarito, "definitivo", p.id);
    assert.ok(p.questoes.length >= 30, `${p.id}: ${p.questoes.length} questões`);
    let anterior = 0;
    for (const q of p.questoes) {
      assert.ok(q.n > anterior, `${p.id}: questões fora de ordem em ${q.n}`); anterior = q.n;
      const letras = Object.keys(q.alternativas).join("");
      assert.ok(letras === "ABCDE" || letras === "CE", `${p.id} q${q.n}: alternativas ${letras}`);
      assert.ok(q.gabarito === "X" || q.gabarito in q.alternativas, `${p.id} q${q.n}: gabarito ${q.gabarito}`);
      assert.ok(q.enunciado.length > 15 && q.materia, `${p.id} q${q.n}`);
    }
  }
  // gabarito retificado do TJMT: na prova inteira são 3 anuladas (7, 25 e 52); as duas primeiras são de Português e
  // Matemática/Estatística, que o filtro jurídico tira, então só a 52 sobra e o número original da questão é mantido
  assert.deepEqual(porId["tjmt-2024-analista-judiciario-direito"].questoes.filter(q => q.gabarito === "X").map(q => q.n), [52]);
});

test("provas de TJ e MP: só área jurídica (sem Português, Informática, Estatística, Raciocínio e cargos de outras áreas)", () => {
  const naoJuridica = /portugu|inform[aá]tica|estat[ií]stica|racioc[ií]nio|matem[aá]tica|conhecimentos gerais|atualidades/i;
  const cargoFora = /engenh|psicolog|contab|medic|enferm|odont|servi[cç]o social|arquitet|biblioteco|pedagog|economi|sistemas|suporte|administra[cç][aã]o|[aá]rea meio|apoio [àa] gest/i;
  for (const p of novas) {
    assert.ok(!cargoFora.test(p.nome), `${p.id}: cargo fora da área jurídica`);
    for (const q of p.questoes) assert.ok(!naoJuridica.test(q.materia), `${p.id} q${q.n}: matéria "${q.materia}"`);
  }
  for (const p of provas.filter(x => /juiz|promotor/i.test(x.nome) && novas.includes(x))) assert.match(p.cargo, /^Carreira jurídica/, p.id);
  assert.ok(novas.some(p => /Juiz/i.test(p.nome)) && novas.some(p => /Promotor/i.test(p.nome)), "faltam provas de juiz ou de promotor");
});
