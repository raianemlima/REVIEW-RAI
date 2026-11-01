// Cartões são de revisão: cartão novo só entra na revisão diária depois que o assunto é marcado "Estudei este assunto"
// no Cronograma, num edital da direção escolhida em Ajustes (Defensoria ou Tribunal). O que já está em revisão continua.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { JSDOM } from "jsdom";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../app-src.txt", import.meta.url), "utf8").replace(/\nboot\(\);\s*$/, "\n");
const motorStart = html.indexOf("// Motor de revisão:");
const fsrs = html.slice(motorStart, html.indexOf("</script>", motorStart));
const fontes = ["cronograma-pesos.js", "cronograma-taxonomia.js", "cronograma-conteudo.js", "cronograma-motor.js", "cronograma.js"].map(f => readFileSync(new URL("../arquivos/" + f, import.meta.url), "utf8"));

const card = (id, disc, tema, extra = {}) => ({ id, disc, ord: Number(id.replace(/\D/g, "")) || 1, tema, tipo: "conceito", frente: `Pergunta sobre ${tema}`, verso: "Resposta", porque: "", origem: "Fixture", abr: "nucleo_comum", peso: 3, inc: 3, ...extra });
// constitucionalismo (DPE/RN), princípios fundamentais (TJPB), um cartão de outro assunto e um já em revisão
const CARTOES = [
  card("k1", "direito_constitucional", "Constitucionalismo", { frente: "Constitucionalismo: o que a história das Constituições e os documentos históricos mostram?" }),
  card("k2", "direito_constitucional", "Constitucionalismo latino-americano"),
  card("k3", "direito_constitucional", "Princípios fundamentais da República"),
  card("k4", "direito_constitucional", "Controle de constitucionalidade"),
  card("k5", "direito_constitucional", "Remédios constitucionais"),
];
function ambiente({ comCronograma = true } = {}) {
  const dom = new JSDOM('<!doctype html><html><body><header><button id="goBusca"></button><button id="goAjustes"></button><span id="save"></span><nav id="tabs"></nav></header><main id="main"></main></body></html>', { url: "https://fixture.invalid/", runScripts: "outside-only" });
  dom.window.scrollTo = () => {}; dom.window.fetch = () => { throw Error("Rede bloqueada"); };
  const run = s => vm.runInContext(s, dom.getInternalVMContext());
  run(`const DECK={versao:"fixture",disciplinas:[{id:"direito_constitucional",nome:"Direito Constitucional",curto:"Constitucional",peso:1}],cartoes:${JSON.stringify(CARTOES)},leiseca:[]};`);
  run(fsrs); run(app);
  run('S.mode="local";S.ajustes.metaOn=false;S.ajustes.onboard=true;S.ajustes.minutos=60;S.ajustes.metaDiaria=50;S.ajustes.novosMax=50;ensureAj();');
  run('S.cards.k5={s:3,d:5,due:today(),last:today()-3,reps:2,lapses:0};');   // já estava em revisão antes da mudança
  run('globalThis.__toasts=[];toast=m=>__toasts.push(m);');
  if (comCronograma) fontes.forEach(run);
  return { dom, run, d: dom.window.document, close: () => dom.window.close() };
}
const novos = a => a.run("JSON.stringify(plan().fresh.map(c=>c.id))");
const due = a => a.run("JSON.stringify(plan().due.map(c=>c.id))");

test("o motor lista todos os cartões ligados ao assunto, sem o limite da tela", () => {
  const ctx = { window: {} }; vm.runInNewContext(fontes[3], ctx);
  const m = ctx.window.DPE_CRONOGRAMA_MOTOR;
  const muitos = Array.from({ length: 9 }, (_, i) => card("t" + i, "dc", "Tráfico de drogas"));
  const ids = m.cartoesDoAssunto({ cartoes: [...muitos, card("x1", "dc", "Usucapião")] }, { titulo: "Tráfico de drogas.", texto: "", discIds: ["dc"], discNomes: ["Direito Penal"] });
  assert.equal(ids.length, 9);
  assert.ok(!ids.includes("x1"));
  assert.equal(m.relacionarConteudo({ cartoes: muitos }, { titulo: "Tráfico de drogas.", discIds: ["dc"] }).tema.itens.length, 4, "a tela continua mostrando 4");
});

test("sem assunto estudado, nenhum cartão novo entra; o que já está em revisão continua", () => {
  const a = ambiente();
  try {
    assert.deepEqual(JSON.parse(novos(a)), []);
    assert.deepEqual(JSON.parse(due(a)), ["k5"]);
    a.run('S.cards.k5.due=today()+5;go("hoje")');
    assert.match(a.d.querySelector("#main .hero").textContent, /Estudei este assunto/);
    assert.match(a.d.querySelector("#hojeLiberados").textContent, /direção Defensoria: 0 assuntos estudados/);
  } finally { a.close(); }
});

test("marcar Estudei este assunto libera só os cartões daquele assunto, na direção escolhida", () => {
  const a = ambiente();
  try {
    a.run('S.ajustes.cronogramaProgresso={"rn-2025:direito_constitucional:d001_t001":{concluido:true,em:1}};');
    const lib = JSON.parse(novos(a));
    assert.ok(lib.includes("k1") && lib.includes("k2"), "constitucionalismo liberado: " + lib);
    assert.ok(!lib.includes("k3") && !lib.includes("k4"), "outros assuntos continuam fora");
    assert.ok(a.run("plan().newToday.length") > 0, "entram no bloco de hoje");
    // assunto do TJPB não libera na direção Defensoria
    a.run('S.ajustes.cronogramaProgresso["tjpb-2026:direito_constitucional:d004_t002"]={concluido:true,em:2};');
    assert.ok(!JSON.parse(novos(a)).includes("k3"));
    a.run('S.ajustes.direcao="tj"');
    const tj = JSON.parse(novos(a));
    assert.ok(tj.includes("k3"), "na direção Tribunal, o assunto do TJPB libera: " + tj);
    assert.ok(!tj.includes("k1"), "e o da Defensoria deixa de liberar cartão novo");
    a.run('S.ajustes.cronogramaProgresso["tjpb-2026:direito_constitucional:d004_t002"].concluido=false');
    assert.ok(!JSON.parse(novos(a)).includes("k3"), "desmarcar tira o cartão ainda não visto");
  } finally { a.close(); }
});

test("meus cartões sempre entram; sem o módulo do Cronograma o app segue como antes", () => {
  const a = ambiente();
  try {
    a.run('DECK.cartoes.push({id:"meu-1",disc:"direito_constitucional",ord:99,tema:"Anotação",tipo:"conceito",frente:"F",verso:"V",abr:"nucleo_comum",meu:true,peso:3,inc:3});byId["meu-1"]=DECK.cartoes[DECK.cartoes.length-1];');
    assert.deepEqual(JSON.parse(novos(a)), ["meu-1"]);
  } finally { a.close(); }
  const b = ambiente({ comCronograma: false });
  try { assert.equal(JSON.parse(novos(b)).length, 4); } finally { b.close(); }
});

test("Hoje: marcar Estudei este assunto avisa quantos cartões entraram na revisão", () => {
  const a = ambiente();
  try {
    a.run('go("cronograma")');
    const sel = a.d.querySelector("#crEdital"); sel.value = "rn-2025"; sel.dispatchEvent(new a.dom.window.Event("change", { bubbles: true }));
    a.d.querySelector("#crForm").dispatchEvent(new a.dom.window.Event("submit", { bubbles: true, cancelable: true }));
    a.run("S.ajustes.cronograma.dias=[1,2,3,4,5,6,7];renderHoje()");
    const box = a.d.querySelector("#cronogramaHoje [data-cr-concluir]");
    assert.ok(box, "checkbox do assunto de hoje");
    const k = box.dataset.crConcluir;
    const [, disc, top] = k.split(":");
    a.run(`(()=>{const t=window.DPE_CONTEUDOS_EDITAIS["rn-2025"].disciplinas.find(d=>d.id===${JSON.stringify(disc)}).topicos.find(t=>t.id===${JSON.stringify(top)});DECK.cartoes.push({id:"h1",disc:${JSON.stringify(disc)},ord:1,tema:t.titulo.replace(/[.:].*$/,""),tipo:"conceito",frente:"Pergunta sobre "+t.texto,verso:"R",abr:"nucleo_comum",peso:3,inc:3});byId.h1=DECK.cartoes[DECK.cartoes.length-1];DECK.disciplinas.push({id:${JSON.stringify(disc)},nome:"X",curto:"X",peso:1});})()`);
    a.run("renderHoje()");
    assert.match(a.d.querySelector("#cronogramaHoje [data-cr-libera]").textContent, /Ao marcar, 1 cartão novo entra na revisão/);
    const box2 = a.d.querySelector("#cronogramaHoje [data-cr-concluir]");
    box2.checked = true; box2.dispatchEvent(new a.dom.window.Event("change", { bubbles: true }));
    assert.equal(a.run(`S.ajustes.cronogramaProgresso[${JSON.stringify(k)}].concluido`), true);
    assert.match(a.d.querySelector("#cronogramaHoje [data-cr-libera]").textContent, /1 cartão deste assunto está na sua revisão/);
    assert.match(a.run("__toasts.join(' | ')"), /cart(ão|ões) deste assunto entr/);
    assert.ok(JSON.parse(novos(a)).includes("h1"));
  } finally { a.close(); }
});

test("Cronograma: Estudei este assunto também na semana do ciclo, e Ajustes guarda a direção", () => {
  const a = ambiente();
  try {
    a.run('go("cronograma")');
    const sel = a.d.querySelector("#crEdital"); sel.value = "tjpb-2026"; sel.dispatchEvent(new a.dom.window.Event("change", { bubbles: true }));
    const box = a.d.querySelector("#crSemana [data-cr-concluir]");
    assert.ok(box, "checkbox na prévia da semana");
    box.checked = true;
    box.dispatchEvent(new a.dom.window.Event("input", { bubbles: true }));
    box.dispatchEvent(new a.dom.window.Event("change", { bubbles: true }));
    assert.equal(a.run(`S.ajustes.cronogramaProgresso[${JSON.stringify(box.dataset.crConcluir)}].concluido`), true);
    assert.match(a.run("__toasts.join(' | ')"), /direcionamento em Ajustes for Tribunal/);
    a.run('go("ajustes")');
    const dir = a.d.querySelector("#a-direcao");
    assert.ok(dir, "campo Direcionamento do estudo");
    assert.equal(dir.value, "dpe");
    dir.value = "tj";
    a.d.querySelector("#aj").dispatchEvent(new a.dom.window.Event("submit", { bubbles: true, cancelable: true }));
    assert.equal(a.run("S.ajustes.direcao"), "tj");
  } finally { a.close(); }
});
