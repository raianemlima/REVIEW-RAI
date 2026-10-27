import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const appOriginal = readFileSync(new URL('../app-src.txt', import.meta.url), 'utf8');
const app = appOriginal.replace(/\nboot\(\);\s*$/, '\n');
const motorInicio = html.indexOf('// Motor de revisão:');
const motor = html.slice(motorInicio, html.indexOf('</script>', motorInicio));
const cronograma = readFileSync(new URL('../arquivos/cronograma.js', import.meta.url), 'utf8');

function ambiente() {
  const dom = new JSDOM('<!doctype html><html><head></head><body><header><button id="goBusca"></button><button id="goAjustes"></button><span id="save"></span><nav id="tabs"></nav></header><main id="main"></main></body></html>', { url: 'https://fixture.invalid/', runScripts: 'outside-only' });
  dom.window.scrollTo = () => {};
  dom.window.fetch = () => { throw new Error('Rede não permitida nos testes.'); };
  const ctx = dom.getInternalVMContext();
  const run = code => vm.runInContext(code, ctx);
  const cartoes = Array.from({ length: 28 }, (_, i) => ({ id: 'c' + i, disc: i % 2 ? 'dc' : 'pc', tema: 'Tema ' + (i % 4), abr: 'nucleo_comum', tipo: 'conceito', frente: 'Pergunta fictícia ' + i, verso: 'Resposta fictícia', porque: 'Explicação fictícia', inc: 3, peso: 3, ord: i, origem: 'Fixture' }));
  run(`const DECK = ${JSON.stringify({ versao: 'fixture', disciplinas: [{ id: 'dc', nome: 'Direito Constitucional', curto: 'Constitucional', peso: 1 }, { id: 'pc', nome: 'Direito Processual Civil', curto: 'Proc. Civil', peso: 1 }], cartoes })};`);
  run(motor);
  run(app);
  run(`S.mode = 'local'; S.ajustes.metaOn = false; S.ajustes.onboard = true; S.ajustes.som = false; S.ajustes.vibra = false; S.ajustes.minutos = 10; S.ajustes.novosMax = 10; ensureAj();`);
  run(readFileSync(new URL('../arquivos/cronograma-taxonomia.js', import.meta.url), 'utf8'));
  run(readFileSync(new URL('../arquivos/cronograma-conteudo.js', import.meta.url), 'utf8'));
  run(readFileSync(new URL('../arquivos/cronograma-motor.js', import.meta.url), 'utf8'));
  run(cronograma);
  return { dom, run, close: () => dom.window.close() };
}

async function pronta(a) {
  for (let i = 0; i < 10 && !a.run('window.__cronogramaInstalado === true'); i++) await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(a.run('window.__cronogramaInstalado'), true);
}

test('catálogo tem 18 editais de Defensor, o edital DPDF de servidor e sete matérias comuns documentadas', () => {
  const a = ambiente();
  try {
    assert.equal(a.run('window.__cronogramaCatalogo.EDITAIS_DPE.length'), 19);
    assert.equal(a.run('window.__cronogramaCatalogo.EDITAIS_DPE.filter(x => window.DPE_CONTEUDOS_EDITAIS[x.id]?.cargo !== "servidor").length'), 18);
    assert.equal(a.run('window.__cronogramaCatalogo.CORE.length'), 7);
    assert.equal(a.run('window.__cronogramaCatalogo.EDITAIS_DPE.find(x => x.id === "ma-2026").subjects.filter(x => window.__cronogramaCatalogo.CORE.includes(x)).length'), 7);
  } finally { a.close(); }
});

test('editor permite escolher horas, dias, disciplinas e gera uma prévia semanal', async () => {
  const a = ambiente();
  try {
    await pronta(a);
    a.run('go("cronograma")');
    const doc = a.dom.window.document;
    assert.ok(doc.querySelector('#crForm'));
    assert.match(doc.querySelector('.cr-hero').textContent, /cronograma/i);
    assert.ok(doc.querySelectorAll('[data-cr-subject]').length > 7);
    assert.equal(doc.querySelectorAll('.cr-dia').length, 7);
    assert.match(doc.querySelector('.cr-week').textContent, /min/);
  } finally { a.close(); }
});

test('salvar o plano aplica metas de assuntos e preserva a revisão quando não há reserva de cartões', async () => {
  const a = ambiente();
  try {
    await pronta(a);
    a.run('go("cronograma")');
    const doc = a.dom.window.document;
    const edital=doc.querySelector('#crEdital'); edital.value='ce-2022'; edital.dispatchEvent(new a.dom.window.Event('change',{bubbles:true}));
    doc.querySelector('#crHoras').value = '5';
    doc.querySelectorAll('[data-cr-subject]').forEach(x => { x.checked = x.dataset.crSubject === 'direito_constitucional' || x.dataset.crSubject === 'direito_processual_civil'; x.dispatchEvent(new a.dom.window.Event('change', { bubbles: true })); });
    doc.querySelectorAll('[data-cr-peso]').forEach(x => { x.value = x.dataset.crPeso === 'direito_constitucional' ? '60' : '40'; });
    doc.querySelector('#crForm').dispatchEvent(new a.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    assert.equal(a.run('S.ajustes.cronograma.ativo'), true);
    assert.deepEqual(Array.from(a.run('S.ajustes.cronograma.subjects')), ['direito_constitucional', 'direito_processual_civil']);
    assert.equal(a.run('S.ajustes.minutos'), 10);
    assert.equal(a.run('S.ajustes.metaDiaria'), 10);
    assert.equal(a.run('S.ajustes.cronograma.horasSemana'), 5);
    assert.equal(a.run('S.ajustes.disciplinas'), null);
    assert.deepEqual(Array.from(a.run('snapshot().ajustes.cronograma.subjects')), ['direito_constitucional', 'direito_processual_civil']);
  } finally { a.close(); }
});

test('cronograma ativo aparece na tela Hoje sem tratar dia livre como atraso', async () => {
  const a = ambiente();
  try {
    await pronta(a);
    a.run('S.ajustes.cronograma = { v:1, ativo:true, editalId:"comum", horasSemana:5, dias:[1,2,3,4,5], subjects:window.__cronogramaCatalogo.CORE, pesos:window.__cronogramaCatalogo.CORE.reduce((o,id)=>{o[id]=100/7;return o},{}), blocoMin:40, aplicarMetas:true }; renderHoje();');
    assert.ok(a.dom.window.document.querySelector('#cronogramaHoje'));
    assert.match(a.dom.window.document.querySelector('#cronogramaHoje').textContent, /Cronograma ativo/);
  } finally { a.close(); }
});
