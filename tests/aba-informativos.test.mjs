import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { JSDOM } from "jsdom";

const raiz = new URL("../", import.meta.url);
const ler = p => readFileSync(new URL(p, raiz), "utf8");
const aba = ler("ferramentas/ajustes/aba_informativos/aba.js");

// ambiente mínimo do app: helpers globais, estado e fetch lendo arquivos/informativos do disco
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
    const nome = String(url).replace("arquivos/informativos/", "");
    try { const txt = readFileSync(new URL("arquivos/informativos/" + nome, raiz), "utf8"); return { ok: true, status: 200, json: async () => JSON.parse(txt) }; }
    catch { return { ok: false, status: 404 }; }
  };
  w.eval(helpers + aba + "\nwindow.renderInformativos = renderInformativos; window.infAreas = infAreas; window.getS = () => S;");
  return w;
}
const espera = ms => new Promise(r => setTimeout(r, ms));

test("dados dos informativos: indice confere com os arquivos e há STF e STJ desde 2024", () => {
  const indice = JSON.parse(ler("arquivos/informativos/indice.json"));
  const arqs = readdirSync(new URL("arquivos/informativos/", raiz)).filter(f => /^st[fj]-\d{4}\.json$/.test(f));
  assert.equal(indice.length, arqs.length);
  assert.ok(indice.some(i => i.tribunal === "STF" && i.ano === "2024") && indice.some(i => i.tribunal === "STJ" && i.ano === "2026"));
  for (const i of indice) {
    const eds = JSON.parse(ler("arquivos/informativos/" + i.arquivo));
    assert.equal(eds.length, i.edicoes);
    assert.equal(eds.reduce((n, e) => n + e.itens.length, 0), i.itens);
    for (const e of eds) {
      assert.ok(e.data >= "2024-01-01", `${i.tribunal} ${e.info} anterior a 2024`);
      for (const it of e.itens) assert.ok(it.titulo || it.tema, `${i.tribunal} ${e.info}: item sem título`);
    }
  }
});

test("dados dos informativos: sem dado pessoal nem marcador de coleta", () => {
  for (const f of readdirSync(new URL("arquivos/informativos/", raiz))) {
    const t = ler("arquivos/informativos/" + f);
    assert.ok(!/uid:|cpfCnpj|Baixado por|Nenhum caso foi selecionado/.test(t), f);
  }
});

test("aba Informativos: lista, filtra por tribunal e busca, e guarda o lido em S.ajustes.inf", async () => {
  const w = ambiente();
  await w.renderInformativos(); await espera(20);
  const doc = w.document;
  assert.ok(doc.querySelectorAll(".inf-item").length > 0);
  assert.match(doc.querySelector(".inf-cont").textContent, /julgados/);
  doc.querySelector("#infT").value = "STJ"; doc.querySelector("#infT").dispatchEvent(new w.Event("change"));
  await espera(300);
  assert.ok([...doc.querySelectorAll(".inf-trib")].every(e => e.textContent === "STJ"));
  const busca = doc.querySelector("#infQ"); busca.value = "zzzxxxqqq"; busca.dispatchEvent(new w.Event("input"));
  await espera(900);
  assert.equal(doc.querySelectorAll(".inf-item").length, 0);
  assert.match(doc.querySelector(".inf-lista").textContent, /Nada com esses filtros/);
  w.getS().infF.q = ""; await w.renderInformativos(); await espera(20);
  const caixa = doc.querySelector("[data-inf-lido]");
  caixa.checked = true; caixa.dispatchEvent(new w.Event("change"));
  assert.equal(Object.keys(w.getS().ajustes.inf.lidos).length, 1);
  assert.ok(caixa.closest(".inf-item").classList.contains("lido"));
});

test("aba Informativos: áreas do ramo viram nomes legíveis", () => {
  const w = ambiente();
  assert.deepEqual(Array.from(w.infAreas("DIREITO PENAL, DIREITO PROCESSUAL PENAL")), ["Direito Penal", "Direito Processual Penal"]);
  assert.deepEqual(Array.from(w.infAreas("DIREITO ADMINISTRATIVO – MILITAR; CONCURSO PÚBLICO")), ["Direito Administrativo"]);
  assert.deepEqual(Array.from(w.infAreas("")), []);
});

test("aba Informativos publicada: menu, estilo, rota e atalho em Hoje, uma vez cada", () => {
  const html = ler("index.html"), app = ler("app-src.txt");
  assert.equal(html.split('id="tab-informativos"').length - 1, 1);
  assert.equal(html.split("/* ---- aba Informativos (STF e STJ) ---- */").length - 1, 1);
  assert.equal(app.split("// ===================== aba Informativos: STF e STJ").length - 1, 1);
  assert.equal(app.split("informativos: typeof renderInformativos").length - 1, 1);
  assert.equal(app.split('tab: "informativos"').length - 1, 1);
});
