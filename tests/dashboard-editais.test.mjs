import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";

const modulo = fs.readFileSync(new URL("../arquivos/dashboard-editais.js", import.meta.url), "utf8");
const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

function ambiente({ comServidor = false } = {}) {
  const programas = {}, pesos = {};
  for (let i = 0; i < 18; i++) {
    const id = `xx-${2020 + i}`;
    programas[id] = { disciplinas: [
      { id: "direito_constitucional", canonicais: ["direito_constitucional"] },
      { id: "direito_penal", canonicais: ["direito_penal"] },
      ...(i === 0 ? [{ id: "legislacao_penal_extravagante", canonicais: ["legislacao_penal_extravagante"] }] : []),
      ...(i < 16 ? [{ id: "direito_do_consumidor", canonicais: ["direito_do_consumidor"] }] : []),
    ] };
    pesos[id] = i < 14 ? { tipo: "questoes", fonte: `fonte-${i}`, grupos: [{ label: "Constitucional", valor: 10, subjects: ["direito_constitucional"] }, { label: "Grupo penal", valor: 20, subjects: ["direito_penal", "criminologia"] }] } : { tipo: "equilibrada", fonte: `fonte-${i}`, grupos: [] };
  }
  if (comServidor) {
    // Programa de servidor: aparece no Cronograma, mas não entra no relatório dos editais de Defensor.
    programas["df-2026"] = { cargo: "servidor", disciplinas: [{ id: "lingua_portuguesa", canonicais: [] }, { id: "direito_penal", canonicais: ["direito_penal"] }] };
    pesos["df-2026"] = { tipo: "pontos", fonte: "fonte-df", grupos: [{ label: "Direito Penal", valor: 999, subjects: ["direito_penal"] }] };
  }
  const dom = new JSDOM('<!doctype html><html data-rd-design="figma"><body class="rd-shell"><main id="main"></main></body></html>', { runScripts: "outside-only" });
  const { window } = dom;
  window.__estado = { tab: "estatisticas" };
  window.DPE_CONTEUDOS_EDITAIS = programas;
  window.DPE_PESOS_EDITAIS = pesos;
  window.eval('const S = window.__estado; function renderStats() { document.querySelector("#main").innerHTML = "<section class=\\"profile\\">Progresso existente</section>"; } function render() { renderStats(); } function go(tab) { S.tab = tab; }\n' + modulo);
  return { window, dom };
}

test("dashboard usa os catálogos reais, exibe resumo e não persiste dados", async () => {
  const { window, dom } = ambiente();
  try {
    await esperar(240);
    const painel = window.document.querySelector("#rdDashboardEditais");
    assert.ok(painel);
    assert.match(painel.textContent, /18[\s\S]*editais analisados/);
    assert.match(painel.textContent, /2\s*matérias universais/);
    assert.match(painel.textContent, /Legislacao Penal Extravagante/);
    assert.ok(window.document.querySelector(".profile"));
    assert.equal(Object.keys(window.__estado).length, 1);
    assert.equal(window.document.querySelectorAll("#rdDashboardEditais").length, 1);
  } finally { dom.window.close(); }
});

test("filtro mostra a distribuição documentada e CTA abre apenas o cronograma", async () => {
  const { window, dom } = ambiente();
  try {
    await esperar(240);
    const filtro = window.document.querySelector("#rdEditalFiltro");
    filtro.value = "xx-2020";
    filtro.dispatchEvent(new window.Event("change", { bubbles: true }));
    assert.match(window.document.querySelector("#rdEditalPerfil").textContent, /Constitucional · 10 questões/);
    assert.match(window.document.querySelector("#rdEditalPerfil").textContent, /Grupo penal · 20 questões/);
    window.document.querySelector("#rdUsarCronograma").click();
    assert.equal(window.__estado.tab, "cronograma");
  } finally { dom.window.close(); }
});

test("perfil equilibrado explica a ausência de peso em vez de inventar distribuição", async () => {
  const { window, dom } = ambiente();
  try {
    await esperar(240);
    const filtro = window.document.querySelector("#rdEditalFiltro");
    filtro.value = "xx-2035";
    filtro.dispatchEvent(new window.Event("change", { bubbles: true }));
    assert.match(window.document.querySelector("#rdEditalPerfil").textContent, /Sem peso individual verificável/);
  } finally { dom.window.close(); }
});

test("dashboard ignora programas de servidor na frequência e nos pesos", async () => {
  const { window, dom } = ambiente({ comServidor: true });
  try {
    await esperar(240);
    const painel = window.document.querySelector("#rdDashboardEditais");
    assert.ok(painel);
    assert.match(painel.textContent, /18[\s\S]*editais analisados/);
    assert.doesNotMatch(painel.textContent, /999/);
    assert.equal(painel.querySelector('option[value="df-2026"]'), null);
  } finally { dom.window.close(); }
});
