// Visão limpa: Hoje vira um roteiro em três passos, Estudar mostra primeiro o disponível, a barra fica com o essencial,
// e a publicação carimba o cache do app para o aparelho sempre receber a versão nova.
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import { JSDOM } from "jsdom";

const raiz = new URL("..", import.meta.url).pathname;
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../app-src.txt", import.meta.url), "utf8").replace(/\nboot\(\);\s*$/, "\n");
const motorStart = html.indexOf("// Motor de revisão:");
const fsrs = html.slice(motorStart, html.indexOf("</script>", motorStart));
const modulos = ["cronograma-pesos.js", "cronograma-taxonomia.js", "cronograma-conteudo.js", "cronograma-motor.js", "cronograma.js", "organizacao.js"].map(f => readFileSync(new URL("../arquivos/" + f, import.meta.url), "utf8"));
const navHtml = (html.match(/<nav class="tabs" role="tablist" id="tabs">[\s\S]*?<\/nav>/) || [])[0];
const tick = () => new Promise(r => setTimeout(r, 20));

function ambiente(cartoes = []) {
  const dom = new JSDOM(`<!doctype html><html><head></head><body><header><button id="goBusca"></button><button id="goAjustes"></button><span id="save"></span></header>${navHtml}<main id="main"></main></body></html>`, { url: "https://fixture.invalid/", runScripts: "outside-only" });
  dom.window.scrollTo = () => {}; dom.window.fetch = () => { throw Error("Rede bloqueada"); };
  const run = s => vm.runInContext(s, dom.getInternalVMContext());
  run(`const DECK={versao:"fixture",disciplinas:[{id:"direito_constitucional",nome:"Direito Constitucional",curto:"Constitucional",peso:1}],cartoes:${JSON.stringify(cartoes)},leiseca:[]};`);
  run(fsrs); run(app);
  run('S.mode="local";S.ajustes.metaOn=false;S.ajustes.onboard=true;S.ajustes.minutos=60;S.ajustes.metaDiaria=20;ensureAj();globalThis.__toasts=[];toast=m=>__toasts.push(m);');
  modulos.forEach(run);
  return { dom, run, d: dom.window.document, close: () => dom.window.close() };
}

test("a barra fica com o essencial; Tribunal aparece na direção Tribunal", async () => {
  assert.ok(navHtml, "barra de abas no index.html");
  const a = ambiente();
  try {
    a.run('go("hoje")'); await tick();
    const visiveis = () => [...a.d.querySelectorAll("#tabs button[role=tab]")].filter(b => !b.hidden).map(b => b.dataset.tab);
    assert.deepEqual(visiveis(), ["hoje", "sessao", "biblioteca", "leiseca", "estatisticas"]);
    a.run('S.ajustes.direcao="tj";go("hoje")'); await tick();
    assert.ok(visiveis().includes("tribunal"));
    a.run('S.ajustes.direcao="dpe";go("informativos")'); await tick();
    assert.equal(a.d.querySelector("#tab-sessao").getAttribute("aria-selected"), "true", "aba aberta por Estudar marca Estudar");
  } finally { a.close(); }
});

test("Hoje: roteiro em três passos e o resto recolhido em Mais, sem duplicar ao redesenhar", async () => {
  const a = ambiente();
  try {
    a.run('go("hoje")'); await tick();
    const guia = a.d.querySelector("#main > .hoje-guia");
    assert.ok(guia, "roteiro no topo");
    const passos = [...guia.querySelectorAll(".hg-passo")].map(p => p.dataset.passo + ":" + p.dataset.estado + ":" + p.querySelector("h3").textContent);
    assert.deepEqual(passos, ["1:agora:Monte seu cronograma", "2:depois:Revise os cartões", "3:depois:Pratique com questões (opcional)"]);
    assert.ok(guia.querySelector('[data-passo="1"] #cronogramaHoje #goCronograma'), "passo 1 leva ao Cronograma");
    assert.ok(guia.querySelector('[data-passo="2"] #start'), "o botão original da revisão continua no passo 2");
    const mais = a.d.querySelector("#main > #hojeMais");
    assert.ok(mais && !mais.open, "Mais recolhido");
    assert.equal(a.d.querySelectorAll("#main > section.panel, #main > details.day-details").length, 0, "nenhum painel solto abaixo do roteiro");
    a.run("renderHoje()"); await tick(); a.run("renderHoje()"); await tick();
    assert.equal(a.d.querySelectorAll(".hoje-guia").length, 1);
    assert.equal(a.d.querySelectorAll("#hojeMais").length, 1);
    // trocar a direção no próprio roteiro
    a.d.querySelector('[data-hg-dir="tj"]').click(); await tick();
    assert.equal(a.run("S.ajustes.direcao"), "tj");
    assert.match(a.d.querySelector('.hoje-guia [data-passo="1"] .hg-dica').textContent, /TJPB/);
  } finally { a.close(); }
});

test("Hoje: com o assunto estudado, o passo 2 vira Começar revisão e abre a sessão", async () => {
  const card = (id, tema, frente) => ({ id, disc: "direito_constitucional", ord: 1, tema, tipo: "conceito", frente, verso: "R", abr: "nucleo_comum", peso: 3, inc: 3 });
  const a = ambiente([card("k1", "Constitucionalismo", "Constitucionalismo: história das Constituições e documentos históricos")]);
  try {
    a.run('S.ajustes.cronogramaProgresso={"rn-2025:direito_constitucional:d001_t001":{concluido:true,em:1}};go("hoje")'); await tick();
    const p2 = a.d.querySelector('.hoje-guia [data-passo="2"]');
    assert.equal(p2.dataset.estado, "agora");
    assert.match(p2.textContent, /1 cartão no próximo bloco/);
    p2.querySelector("[data-hg-start]").click(); await tick();
    assert.equal(a.run("S.tab"), "sessao");
    assert.equal(a.run("S.session.queue.join()"), "k1");
  } finally { a.close(); }
});

test("Estudar: primeiro o que está disponível; o resto recolhido; sem erros, a seção de erros some", async () => {
  const a = ambiente();
  try {
    a.run('S.session=null;go("sessao")'); await tick();
    const main = a.d.querySelector("#main");
    const ler = main.querySelector(":scope > .es-grid");
    const visiveis = [...ler.querySelectorAll(":scope > .es-t")].map(t => t.id || t.dataset.estab);
    assert.ok(visiveis.every(k => ["goEb", "leiseca", "informativos"].includes(k)), "leitura principal: " + visiveis);
    assert.ok(main.querySelector(".es-recolhido summary").textContent.startsWith("Mais materiais de leitura"));
    assert.equal(main.querySelectorAll(":scope > .es-grid:not([hidden]) > .es-t[disabled]").length, 0, "nenhum atalho desativado à vista");
    assert.equal(main.querySelector("#es-erros").hidden, true);
    assert.equal(main.querySelector('.es-atalhos a[href="#es-erros"]').hidden, true);
    assert.ok([...main.querySelectorAll(".es-recolhido summary")].some(s => /Modos que liberam/.test(s.textContent)));
  } finally { a.close(); }
});

test("publicação: o cache do app ganha o carimbo do conteúdo, igual no sw.js e no index.html", () => {
  const pasta = mkdtempSync(join(tmpdir(), "carimbo-"));
  writeFileSync(join(pasta, "sw.js"), readFileSync(join(raiz, "sw.js"), "utf8"));
  writeFileSync(join(pasta, "index.html"), html);
  const base = readFileSync(join(raiz, "sw.js"), "utf8").match(/const CACHE = "([^"]+)"/)[1];
  const roda = c => execFileSync("node", [join(raiz, "ferramentas/ci/carimbar_cache.mjs"), pasta], { cwd: raiz, env: { ...process.env, CACHE_CARIMBO: c }, encoding: "utf8" });
  assert.match(roda("abc123def0"), new RegExp(`ok: cache do app = ${base}-abc123def0`));
  roda("ffff000011");   // rodar de novo troca o carimbo, não acumula
  const sw = readFileSync(join(pasta, "sw.js"), "utf8"), ix = readFileSync(join(pasta, "index.html"), "utf8");
  assert.equal(sw.match(/const CACHE = "([^"]+)"/)[1], `${base}-ffff000011`);
  assert.equal(ix.match(/APP_CACHE = "([^"]+)"/)[1], `${base}-ffff000011`);
  const sem = execFileSync("node", [join(raiz, "ferramentas/ci/carimbar_cache.mjs"), pasta], { cwd: raiz, env: { ...process.env, CACHE_CARIMBO: "" }, encoding: "utf8" });
  assert.match(sem, /ok: cache do app = review-dpe-assuntos-v\d+-[0-9a-f]{10}/, "sem CACHE_CARIMBO, usa o conteúdo do git");
  const wf = readFileSync(join(raiz, ".github/workflows/pages.yml"), "utf8");
  assert.ok(wf.indexOf("carimbar_cache.mjs") > wf.indexOf("aplicar_ebooks.mjs") && wf.indexOf("carimbar_cache.mjs") < wf.indexOf("validar_site.mjs"), "carimbo depois das etapas que mudam o site e antes da validação");
  assert.match(readFileSync(join(raiz, "sw.js"), "utf8"), /"arquivos\/organizacao\.js"/, "organizacao.js no cache offline");
  assert.match(html, /<script data-lazy-src="arquivos\/organizacao\.js"><\/script>/);
});
