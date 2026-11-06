// Leitor de Lei seca: assertivas de prova que aparecem fora de qualquer artigo (logo depois de um título de capítulo).
// Em produção, o "Ver gabarito" dessas assertivas mostrava "undefined." porque o gabarito é opcional e o app não checava.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { JSDOM } from "jsdom";

const ler = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const html = ler("index.html"), app = ler("app-src.txt").replace(/\nboot\(\);\s*$/, "\n");
const m0 = html.indexOf("// Motor de revisão:"), motor = html.slice(m0, html.indexOf("</script>", m0));

// As assertivas do curso são "consideradas corretas": não têm gabarito (g) nem comentário (c).
const lei = {
  id: "cf-dls", nome: "Constituição Federal · com grifos", curto: "CF", disc: "dc", fonte: "Fixture", completa: true,
  grupos: [{ nome: "Parte", itens: [
    { h: "TÍTULO I · Dos Princípios Fundamentais" },
    { q: "Assertiva fictícia solta, logo depois do título.", b: "BANCA 2022 - Cargo (Órgão-XX)" },
    { q: "Outra assertiva fictícia solta.", b: "BANCA 2018 - Cargo (Órgão-YY)" },
    { a: "1", x: "Art. 1º Texto fictício do artigo." },
    { q: "Assertiva fictícia dentro do artigo.", b: "BANCA 2024 - Cargo (Órgão-ZZ)" },
    { h: "TÍTULO II · Dos Direitos" },
    { q: "Questão solta COM gabarito fictício.", b: "BANCA 2025 - Cargo (Órgão-WW)", g: "Certo", c: "Comentário fictício do gabarito." },
    { a: "2", x: "Art. 2º Outro texto fictício." },
  ] }],
};

function leitor() {
  const dom = new JSDOM('<!doctype html><html><body><header><button id="goBusca"></button><button id="goAjustes"></button><span id="save"></span><nav id="tabs"></nav></header><main id="main"></main></body></html>', { url: "https://fixture.invalid/", runScripts: "outside-only", pretendToBeVisual: true });
  dom.window.scrollTo = () => {}; dom.window.fetch = () => { throw Error("Rede bloqueada"); };
  const run = s => vm.runInContext(s, dom.getInternalVMContext());
  run(`const DECK = ${JSON.stringify({ versao: "f", disciplinas: [{ id: "dc", nome: "Direito Constitucional", curto: "Constitucional", peso: 1 }], cartoes: [], leiseca: [lei] })};`);
  run(motor); run(app);
  run("S.mode = 'local'; S.ajustes.metaOn = false; S.ajustes.onboard = true; ensureAj();");
  run('S.lsDip = "cf-dls"; S.lsGrp = 0; S.lsQ = ""; go("leiseca")');
  return { doc: dom.window.document, close: () => dom.window.close() };
}

test('assertiva solta sem gabarito não mostra "undefined": diz que a banca a considerou correta', () => {
  const l = leitor();
  try {
    const soltas = [...l.doc.querySelectorAll("#main .ls-q")].filter(q => !q.closest("article"));
    assert.equal(soltas.length, 3, "as 2 assertivas depois do título I e a questão depois do título II");
    const texto = l.doc.querySelector("#main").textContent;
    assert.doesNotMatch(texto, /undefined/, "nenhum 'undefined' na tela");
    const semGabarito = soltas.slice(0, 2);
    for (const q of semGabarito) {
      assert.equal(q.querySelector("details"), null, "sem gabarito, não há 'Ver gabarito' vazio");
      assert.match(q.textContent, /Assertiva considerada correta pela banca/);
    }
  } finally { l.close(); }
});

test("questão solta que TEM gabarito continua mostrando 'Ver gabarito' com o gabarito e o comentário", () => {
  const l = leitor();
  try {
    const comGabarito = [...l.doc.querySelectorAll("#main .ls-q")].find(q => /COM gabarito/.test(q.textContent));
    const d = comGabarito.querySelector("details");
    assert.ok(d, "tem 'Ver gabarito'");
    assert.match(d.querySelector("summary").textContent, /Ver gabarito/);
    assert.match(d.textContent, /Certo\./);
    assert.match(d.textContent, /Comentário fictício do gabarito/);
  } finally { l.close(); }
});

test("assertiva dentro do artigo segue como estava (controle)", () => {
  const l = leitor();
  try {
    const dentro = l.doc.querySelector("article#ls-1 .ls-qs");
    assert.ok(dentro, "o artigo 1 tem 'Como caiu em prova'");
    assert.match(dentro.textContent, /Assertiva considerada correta pela banca/);
    assert.doesNotMatch(dentro.textContent, /undefined/);
  } finally { l.close(); }
});
