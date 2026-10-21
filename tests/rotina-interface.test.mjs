import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const appOriginal = readFileSync(new URL('../app-src.txt', import.meta.url), 'utf8');
assert.match(appOriginal, /\nboot\(\);\s*$/);
const app = appOriginal.replace(/\nboot\(\);\s*$/, '\n');
const motorInicio = html.indexOf('// Motor de revisão:');
const motor = html.slice(motorInicio, html.indexOf('</script>', motorInicio));
const metacognicao = readFileSync(new URL('../arquivos/metacognicao.js', import.meta.url), 'utf8');

function ambiente(n = 71) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><header><button id="goBusca"></button><button id="goAjustes"></button><span id="save"></span><nav id="tabs"></nav></header><main id="main"></main></body></html>', { url: 'https://fixture.invalid/', runScripts: 'outside-only' });
  dom.window.scrollTo = () => {};
  dom.window.fetch = () => { throw new Error('Rede não permitida nos testes.'); };
  const ctx = dom.getInternalVMContext();
  const run = code => vm.runInContext(code, ctx);
  const cartoes = Array.from({ length: n }, (_, i) => ({ id: 'c' + i, disc: 'dc', tema: 'Tema ' + (i % 3), abr: 'nucleo_comum', tipo: 'conceito', frente: 'Pergunta fictícia ' + i, verso: 'Resposta fictícia', porque: 'Explicação fictícia', inc: 3, peso: 3, ord: i, origem: 'Fixture' }));
  run(`const DECK = ${JSON.stringify({ versao: 'fixture', disciplinas: [{ id: 'dc', nome: 'Direito Constitucional', curto: 'Constitucional', peso: 1 }], cartoes })};`);
  run(motor);
  run(app);
  run(`S.mode = 'local'; S.ajustes.metaOn = false; S.ajustes.onboard = true; S.ajustes.som = false; S.ajustes.vibra = false; S.ajustes.minutos = 30; S.ajustes.novosMax = 20; for (const c of DECK.cartoes) S.cards[c.id] = {s:2,d:5,due:today(),last:today()-3,reps:1,lapses:0,f:today()-3}; ensureAj();`);
  run(metacognicao);
  run('renderHoje();');
  return { dom, run, close: () => dom.window.close() };
}

test('Hoje real mostra meta 10 e bloco 10, deixando 71 pendências e XP em áreas recolhidas', () => {
  const a = ambiente();
  try {
    const doc = a.dom.window.document;
    const hero = doc.querySelector('.hero');
    assert.match(hero.textContent, /10 cartões no próximo bloco/);
    assert.match(hero.textContent, /0\/10/);
    assert.doesNotMatch(hero.textContent, /71|XP para|em risco|para fechar a meta/);
    assert.equal(doc.querySelector('#filaHoje').open, false);
    assert.match(doc.querySelector('#filaHoje').textContent, /71 revisões disponíveis/);
    assert.equal(doc.querySelector('#extrasHoje').open, false);
    assert.equal(doc.querySelector('#mcMissoes').open, false);
    assert.equal(doc.querySelector('#hojeExplorar').open, false);
    doc.querySelector('#start').click();
    assert.equal(a.run('S.session.queue.length'), 10);
    assert.equal(a.run('S.session.limiteTentativas'), 15);
    assert.equal(a.run('Object.keys(S.cards).length'), 71);
  } finally { a.close(); }
});

test('Hoje só 5 real altera apenas a meta datada e inicia o bloco sem perguntar planejamento', () => {
  const a = ambiente();
  try {
    a.run('S.ajustes.metaOn = true;');
    a.dom.window.document.querySelector('#hojeLeve').click();
    assert.equal(a.run('S.session.queue.length'), 5);
    assert.equal(a.run('S.session.leve'), true);
    assert.equal(a.run('rotinaDiaria().meta'), 5);
    assert.equal(a.run('S.ajustes.metaDiaria'), 10);
    assert.equal(a.run('S.ajustes.metaHoje.dia'), a.run('today()'));
    assert.equal(a.dom.window.document.querySelector('#mcObj'), null);
  } finally { a.close(); }
});

test('Cartões errados não tornam o bloco real infinito e a meta concluída oferece descanso', () => {
  const a = ambiente();
  try {
    a.dom.window.document.querySelector('#start').click();
    let tentativas = 0;
    while (a.run('!!S.session.ui') && tentativas < 30) {
      a.run('reveal(); answer(1);');
      tentativas++;
    }
    assert.equal(tentativas, 15);
    assert.equal(a.run('rotinaDiaria().feitos'), 10);
    assert.equal(a.run('S.session.ui'), null);
    const doc = a.dom.window.document;
    assert.match(doc.querySelector('.done').textContent, /meta de hoje/);
    assert.equal(doc.querySelector('#toHoje').textContent, 'Encerrar por hoje');
    assert.match(doc.querySelector('#maisBloco').textContent, /opcional/);
    doc.querySelector('#toHoje').click();
    assert.match(doc.querySelector('.hero h2').textContent, /meta de hoje está feita/);
    assert.equal(doc.querySelector('#start').classList.contains('cta'), false);
    assert.match(doc.querySelector('#start').textContent, /opcional/);
    assert.equal(a.run('plan().due.length'), 61);
  } finally { a.close(); }
});

test('Atalhos e Ajustes da interface real salvam a meta, preservando escolhas anteriores de tempo e novos', () => {
  const a = ambiente();
  try {
    const doc = a.dom.window.document;
    doc.querySelector('[data-meta="20"]').click();
    assert.equal(a.run('rotinaDiaria().meta'), 20);
    assert.equal(a.run('S.ajustes.minutos'), 30);
    assert.equal(a.run('S.ajustes.novosMax'), 20);
    a.run('S.tab = "ajustes"; renderAjustes();');
    doc.querySelector('#a-meta').value = '15';
    doc.querySelector('#aj').dispatchEvent(new a.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    assert.equal(a.run('S.ajustes.metaDiaria'), 15);
    assert.equal(a.run('S.ajustes.minutos'), 30);
    assert.equal(a.run('S.ajustes.novosMax'), 20);
    assert.equal(a.run('snapshot().ajustes.metaDiaria'), 15);
  } finally { a.close(); }
});

test('Padrões de conta nova permitem cumprir a meta inicial de 10 com o limite de novos', () => {
  const a = ambiente(10);
  try {
    a.run('S.cards = {}; Object.assign(S.ajustes, DEFAULTS, {metaOn:false,onboard:true,som:false,vibra:false}); renderHoje();');
    assert.equal(a.run('S.ajustes.metaDiaria'), 10);
    assert.equal(a.run('plan().newToday.length'), 10);
    a.dom.window.document.querySelector('#start').click();
    assert.equal(a.run('S.session.queue.length'), 10);
    assert.equal(a.run('Object.keys(S.cards).length'), 0);
  } finally { a.close(); }
});

test('Estudar real alinha a estimativa do próximo bloco ao botão que inicia apenas 10 cartões', () => {
  const a = ambiente();
  try {
    const minutos = a.run('selecionarBloco(plan()).minutos');
    a.run('S.session = null; S.tab = "sessao"; renderEstudar();');
    const doc = a.dom.window.document;
    const destaque = doc.querySelector('.es-hoje');
    assert.match(destaque.textContent, new RegExp(`Próximo bloco · cerca de ${minutos} min`));
    assert.match(destaque.querySelector('b').textContent, /10 cartões neste bloco/);
    assert.match(destaque.querySelector('span').textContent, /Fila disponível: 71 cartões/);
    doc.querySelector('#esStart').click();
    assert.equal(a.run('S.session.queue.length'), 10);
  } finally { a.close(); }
});
