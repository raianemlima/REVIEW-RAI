import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { JSDOM } from "jsdom";

const raiz = new URL("../", import.meta.url);
const ler = p => readFileSync(new URL(p, raiz), "utf8");
const aba = ler("ferramentas/ajustes/aba_teses_stj/aba.js");
const PASTA = "arquivos/jurisprudencia-em-teses/";

// ambiente mínimo do app: helpers globais, estado e fetch lendo os dados do disco
function ambiente() {
  const dom = new JSDOM(`<main id="main"></main>`, { runScripts: "outside-only" });
  const w = dom.window;
  const helpers = `
    const $ = s => document.querySelector(s);
    const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\\s+/g, " ").trim();
    const plural = (n, a, b) => n + " " + (n === 1 ? a : b);
    var S = { ajustes: {} }; let filas = [];
    const ensureAj = () => S.ajustes; const queue = k => filas.push(k);
  `;
  w.fetch = async url => {
    try { const txt = readFileSync(new URL(String(url), raiz), "utf8"); return { ok: true, status: 200, json: async () => JSON.parse(txt) }; }
    catch { return { ok: false, status: 404 }; }
  };
  w.eval(helpers + aba + "\nwindow.renderTesesSTJ = renderTesesSTJ; window.getS = () => S;");
  return w;
}
const espera = ms => new Promise(r => setTimeout(r, ms));

test("dados das teses: índice confere com os arquivos, todo ramo preenchido", () => {
  const indice = JSON.parse(ler(PASTA + "indice.json"));
  const arqs = readdirSync(new URL(PASTA, raiz)).filter(f => /^ramo-.*\.json$/.test(f));
  assert.deepEqual([...new Set(indice.map(i => i.arquivo))].sort(), arqs.sort());
  assert.ok(indice.length >= 281);
  const eds = arqs.flatMap(a => JSON.parse(ler(PASTA + a)));
  assert.equal(eds.length, indice.length);
  for (const i of indice) {
    assert.ok(i.ramo && i.ramo !== "SEM RAMO", `edição ${i.edicao} sem ramo`);
    const e = eds.find(x => x.edicao === i.edicao);
    assert.equal(e.teses.length, i.teses);
    assert.equal(e.teses.reduce((n, t) => n + Object.values(t.julgados).reduce((m, l) => m + l.length, 0), 0), i.julgados);
    for (const t of e.teses) assert.ok(t.texto.length > 10, `edição ${i.edicao} tese ${t.n} vazia`);
  }
});

test("dados das teses: sem dado pessoal nem marcador de coleta", () => {
  for (const f of readdirSync(new URL(PASTA, raiz))) assert.ok(!/uid:|cpfCnpj|Baixado por/.test(ler(PASTA + f)), f);
});

test("aba Teses STJ: lista, filtra por ramo e busca, e guarda a edição lida em S.ajustes.teses", async () => {
  const w = ambiente();
  await w.renderTesesSTJ(); await espera(20);
  const doc = w.document;
  assert.ok(doc.querySelectorAll(".tes-item").length > 0);
  assert.match(doc.querySelector(".tes-cont").textContent, /edições/);
  doc.querySelector("#tesR").value = "DIREITO TRIBUTÁRIO"; doc.querySelector("#tesR").dispatchEvent(new w.Event("change"));
  await espera(50);
  assert.ok([...doc.querySelectorAll(".tes-meta")].every(e => /Tribut/.test(e.textContent)));
  const busca = doc.querySelector("#tesQ"); busca.value = "zzzxxxqqq"; busca.dispatchEvent(new w.Event("input"));
  await espera(900);
  assert.equal(doc.querySelectorAll(".tes-item").length, 0);
  assert.match(doc.querySelector(".tes-lista").textContent, /Nada com esses filtros/);
  w.getS().tesF.q = ""; await w.renderTesesSTJ(); await espera(20);
  const caixa = doc.querySelector("[data-tes-lido]");
  caixa.checked = true; caixa.dispatchEvent(new w.Event("change"));
  assert.equal(Object.keys(w.getS().ajustes.teses.lidos).length, 1);
  assert.ok(caixa.closest(".tes-item").classList.contains("lido"));
});

test("aba Teses STJ publicada: menu, estilo, rota e atalho em Hoje, uma vez cada", () => {
  const html = ler("index.html"), app = ler("app-src.txt");
  assert.equal(html.split('id="tab-teses"').length - 1, 1);
  assert.equal(html.split("/* ---- aba Teses STJ (Jurisprudência em Teses) ---- */").length - 1, 1);
  assert.equal(app.split("// ===================== aba Teses STJ: Jurisprudência em Teses").length - 1, 1);
  assert.equal(app.split("teses: typeof renderTesesSTJ").length - 1, 1);
  assert.equal(app.split('tab: "teses"').length - 1, 1);
});
