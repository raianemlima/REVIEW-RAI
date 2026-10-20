import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const html = index.match(/<header class="top">[\s\S]*?<\/header>/)?.[0] + index.match(/<main class="wrap" id="main"><\/main>/)?.[0];
assert.match(html, /header class="top"/);
assert.match(html, /nav class="tabs"[^>]+id="tabs"/);
const appOriginal = readFileSync(new URL('../app-src.txt', import.meta.url), 'utf8');
assert.match(appOriginal, /\nboot\(\);\s*$/);
const app = appOriginal.replace(/\nboot\(\);\s*$/, '\n');
const motorInicio = index.indexOf('// Motor de revisão:');
const motor = index.slice(motorInicio, index.indexOf('</script>', motorInicio));
const metacognicao = readFileSync(new URL('../arquivos/metacognicao.js', import.meta.url), 'utf8');
const interfaceDesign = readFileSync(new URL('../arquivos/interface.js', import.meta.url), 'utf8');

function fixtureDeck(n = 71) {
  const cartoes = Array.from({ length: n }, (_, i) => ({
    id: 'c' + i, disc: 'dc', tema: 'Tema ' + (i % 3), abr: 'nucleo_comum', tipo: 'conceito',
    frente: 'Pergunta fictícia ' + i, verso: 'Resposta fictícia ' + i,
    porque: 'Explicação fictícia', inc: 3, peso: 3, ord: i, origem: 'Fixture',
  }));
  return {
    versao: 'fixture',
    disciplinas: [{ id: 'dc', nome: 'Direito Constitucional', curto: 'Constitucional', peso: 1 }],
    cartoes,
  };
}

function makeEnvironment(n = 71) {
  const dom = new JSDOM(`<!doctype html><html><head><meta name="theme-color" content="#f7f6ff"></head><body>${html}</body></html>`, {
    url: 'https://fixture.invalid/', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  Object.defineProperty(dom.window, 'innerWidth', { configurable: true, writable: true, value: 1280 });
  dom.window.scrollTo = () => {};
  dom.window.fetch = () => { throw new Error('Rede não permitida nos testes.'); };
  const ctx = dom.getInternalVMContext();
  const run = code => vm.runInContext(code, ctx);
  run(`const DECK = ${JSON.stringify(fixtureDeck(n))};`);
  run(motor);
  run(app);
  run(`S.mode = 'local'; S.ajustes.metaOn = false; S.ajustes.onboard = true; S.ajustes.som = false; S.ajustes.vibra = false; S.ajustes.minutos = 30; S.ajustes.novosMax = 20; S.ajustes.metaDiaria = 10; for (const c of DECK.cartoes) S.cards[c.id] = {s:2,d:5,due:today(),last:today()-3,reps:1,lapses:0,f:today()-3}; ensureAj();`);
  run(metacognicao);
  run(interfaceDesign);
  return { dom, run, close: () => dom.window.close() };
}

function waitForDesign(a) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      if (a.dom.window.document.documentElement.dataset.rdDesign === 'figma') return resolve();
      if (Date.now() - started > 1500) return reject(new Error('interface.js não ficou pronto'));
      a.dom.window.setTimeout(check, 25);
    };
    check();
  });
}

async function ambiente(n = 71) {
  const a = makeEnvironment(n);
  await waitForDesign(a);
  return a;
}

function click(a, selector) {
  const el = a.dom.window.document.querySelector(selector);
  assert.ok(el, `controle ausente: ${selector}`);
  el.click();
  return el;
}

function closeAfter(promise) {
  return promise;
}

test('shell reaproveita a navegação real e todos os destinos principais continuam acionáveis', async () => {
  const a = await ambiente();
  try {
    const doc = a.dom.window.document;
    const tabs = doc.querySelector('#tabs');
    assert.equal(doc.querySelectorAll('#tabs').length, 1);
    assert.equal(doc.querySelector('#rdSidebar').contains(tabs), true);
    assert.equal(doc.querySelector('header.top').contains(tabs), false);
    for (const [id, heading] of [['#tab-sessao', 'Estudar'], ['#tab-biblioteca', 'Biblioteca'], ['#tab-leiseca', 'Lei seca'], ['#tab-estatisticas', 'Estatísticas']]) {
      click(a, id);
      assert.match(doc.querySelector('#main').textContent, new RegExp(heading));
    }
    click(a, '#goBusca');
    assert.match(doc.querySelector('#main h2').textContent, /Busca/);
    click(a, '#rdAjustes');
    assert.match(doc.querySelector('#main h2').textContent, /Ajustes/);
  } finally { a.close(); }
});

test('Hoje usa data, fila, meta e sequência reais e não injeta identidade ou status fictícios', async () => {
  const a = await ambiente();
  try {
    const doc = a.dom.window.document;
    a.run(`S.logs = {}; S.logs[monthKey(Date.now() - 86400000)] = {fixture: [Date.now() - 86400000, 'c0', 3, 0, 1]}; S.tab = 'hoje'; render();`);
    const hero = doc.querySelector('.hero');
    assert.equal(doc.querySelector('#main').dataset.rdView, 'hoje');
    assert.match(hero.textContent, /10 cartões no próximo bloco/);
    click(a, '[data-meta="20"]');
    assert.equal(a.run('S.ajustes.metaDiaria'), 20);
    a.run(`S.ajustes.metaDiaria = 10; renderHoje();`);
    assert.match(doc.querySelector('#filaHoje').textContent, /71 revisões disponíveis/);
    assert.match(doc.querySelector('#rdSequencia').textContent, /1 dia com estudo/);
    assert.doesNotMatch(doc.body.textContent, /Marina|sincronização falsa|plano ativo/);
    const date = a.run(`dayToDate(today()).getDate()`);
    assert.match(doc.querySelector('.rd-date b').textContent, new RegExp(`^${date}$`));
    for (const id of ['#filaHoje', '#extrasHoje', '#mcMissoes', '#hojeExplorar']) assert.equal(doc.querySelector(id)?.open, false);
  } finally { a.close(); }
});

test('atalho Hoje, só 5 preserva meta habitual e inicia bloco real sem planejamento', async () => {
  const a = await ambiente();
  try {
    a.run(`S.ajustes.metaOn = true; S.tab = 'hoje'; render();`);
    click(a, '#hojeLeve');
    assert.equal(a.run('S.session.queue.length'), 5);
    assert.equal(a.run('S.session.leve'), true);
    assert.equal(a.run('rotinaDiaria().meta'), 5);
    assert.equal(a.run('S.ajustes.metaDiaria'), 10);
    assert.equal(a.run('S.ajustes.metaHoje.dia'), a.run('today()'));
    assert.equal(a.dom.window.document.querySelector('#mcObj'), null);
  } finally { a.close(); }
});

test('início sem metacognição executa bloco curto e as notas FSRS terminam em quinze tentativas', async () => {
  const a = await ambiente();
  try {
    click(a, '#start');
    assert.equal(a.run('S.session.queue.length'), 10);
    assert.equal(a.run('S.session.limiteTentativas'), 15);
    let tentativas = 0;
    while (a.run('!!S.session.ui') && tentativas < 20) { a.run('reveal(); answer(1);'); tentativas++; }
    assert.equal(tentativas, 15);
    assert.equal(a.run('rotinaDiaria().feitos'), 10);
    assert.equal(a.run('S.session.ui'), null);
    const doc = a.dom.window.document;
    assert.match(doc.querySelector('.done').textContent, /meta de hoje/);
    click(a, '#toHoje');
    assert.match(doc.querySelector('.hero h2').textContent, /meta de hoje está feita/);
    assert.match(doc.querySelector('#start').textContent, /opcional/);
    assert.equal(a.run('Object.keys(S.cards).length'), 71);
  } finally { a.close(); }
});

test('carregamento idempotente não duplica shell, dashboard, recursos, wrappers ou ações', async () => {
  const a = await ambiente();
  try {
    const doc = a.dom.window.document;
    const before = { side: doc.querySelectorAll('#rdSidebar').length, welcome: doc.querySelectorAll('.rd-welcome').length, resources: doc.querySelectorAll('.rd-resources').length, tabs: doc.querySelectorAll('#tabs').length };
    a.run(interfaceDesign);
    a.run(`S.tab = 'sessao'; render(); S.tab = 'hoje'; render();`);
    const after = { side: doc.querySelectorAll('#rdSidebar').length, welcome: doc.querySelectorAll('.rd-welcome').length, resources: doc.querySelectorAll('.rd-resources').length, tabs: doc.querySelectorAll('#tabs').length };
    assert.deepEqual(after, before);
    assert.equal(doc.querySelectorAll('.rd-resource').length, 3);
    click(a, '.rd-resource[data-rd-go="biblioteca"]');
    assert.equal(a.run('S.tab'), 'biblioteca');
  } finally { a.close(); }
});

test('rotas secundárias mantêm badge e controles reais, enquanto abas ocultas ficam fora do teclado', async () => {
  const a = await ambiente();
  try {
    const doc = a.dom.window.document;
    a.run(`S.ajustes.nvLidas = []; S.ajustes.nvFeitas = []; S.tab = 'novidades'; render();`);
    assert.match(doc.querySelector('#main').textContent, /Novidades/);
    assert.equal(doc.querySelector('#tab-novidades').hidden, true);
    assert.ok(doc.querySelector('#tab-novidades').dataset.n);
    assert.equal([...doc.querySelectorAll('#tabs button')].filter(b => !b.hidden).includes(doc.querySelector('#tab-ajustes')), false);
    assert.equal([...doc.querySelectorAll('#tabs button')].filter(b => !b.hidden).some(b => b.id === 'tab-novidades'), false);
  } finally { a.close(); }
});

test('planejamento, confiança, fontes de resultado e reflexão persistem no fluxo real', async () => {
  const a = await ambiente();
  try {
    a.run(`S.ajustes.metaOn = true; S.tab = 'hoje'; render();`);
    click(a, '#start');
    assert.ok(a.dom.window.document.querySelector('#mcObj'));
    const obj = a.dom.window.document.querySelector('#mcObj');
    obj.value = 'Revisar fundamentos'; obj.dispatchEvent(new a.dom.window.Event('input', { bubbles: true }));
    click(a, '#mcIr');
    assert.equal(a.run('S.session.mc.obj'), 'Revisar fundamentos');
    a.run('reveal(); S.session.ui.conf = 2; answer(3);');
    assert.equal(a.run('S.session.mc.res.length'), 1);
    assert.equal(a.run('S.session.mc.res[0].fonte'), 'autoavaliacao');
    while (a.run('!!S.session.ui') && a.run('S.session.done < S.session.total')) a.run('reveal(); answer(3);');
    const doc = a.dom.window.document;
    const fun = doc.querySelector('#mcFun'), mud = doc.querySelector('#mcMud');
    assert.ok(fun && mud);
    fun.value = 'Responder antes de consultar'; fun.dispatchEvent(new a.dom.window.Event('input', { bubbles: true }));
    mud.value = 'Revisar a fonte'; mud.dispatchEvent(new a.dom.window.Event('input', { bubbles: true }));
    click(a, '#mcSalvar');
    assert.equal(a.run('S.ajustes.reflexoes.length'), 1);
    assert.match(a.run('JSON.stringify(S.ajustes.reflexoes)'), /Revisar a fonte/);
    assert.match(a.run('JSON.stringify(snapshot())'), /Revisar a fonte/);
    assert.equal(a.run('S.ajustes.metaOn'), true);
  } finally { a.close(); }
});

test('modo simulado preserva cronômetro inicial, deadline e gabarito real do cartão', async () => {
  const a = await ambiente();
  try {
    a.run(`byId.c0.tipo = 'pegadinha'; byId.c0.frente = 'CERTO ou ERRADO: pergunta de fixture'; byId.c0.verso = 'CERTO'; byId.c1.tipo = 'multipla_escolha'; byId.c1.frente = 'Escolha a resposta\\nA) certa\\nB) errada'; byId.c1.verso = 'A'; S.tab = 'sessao'; S.session = null; startModo('simulado');`);
    assert.equal(a.run('S.session.modo'), 'simulado');
    assert.equal(a.run('S.session.ui.t0 != null'), true);
    const deadline = a.run('S.session.deadline');
    const t0 = a.run('S.session.ui.t0');
    assert.equal(typeof deadline, 'number');
    assert.match(a.dom.window.document.querySelector('#tm')?.textContent || '', /^(?:20:00|19:5\d)$/);
    a.run('renderSession();');
    assert.equal(a.run('S.session.deadline'), deadline);
    assert.equal(a.run('S.session.ui.t0'), t0);
    a.run(`reveal({ picked: 'C', correct: true });`);
    assert.equal(a.run('S.session.ui.picked'), 'C');
    assert.equal(a.run('S.session.ui.correct'), true);
    assert.match(a.dom.window.document.querySelector('#main').textContent, /Próxima/);
  } finally { a.close(); }
});

test('tema usa a chave real e os três estados, sem apagar a escolha ao renderizar', async () => {
  const a = await ambiente();
  try {
    const doc = a.dom.window.document;
    a.run(`S.tab = 'hoje'; render();`);
    click(a, '#goTema');
    assert.equal(a.run('localStorage.getItem(TEMA_KEY)'), 'escuro');
    click(a, '#goTema');
    assert.equal(a.run('localStorage.getItem(TEMA_KEY)'), 'claro');
    click(a, '#goAjustes');
    for (const [tema, atributo] of [['claro', 'light'], ['escuro', 'dark'], ['auto', undefined]]) {
      click(a, `[data-tema-op="${tema}"]`);
      assert.equal(a.run('localStorage.getItem(TEMA_KEY)'), tema === 'auto' ? null : tema);
      assert.equal(doc.documentElement.dataset.theme, atributo);
      a.run('renderAjustes();');
      assert.ok(doc.querySelector(`[data-tema-op="${tema}"]`));
    }
  } finally { a.close(); }
});

test('setas respeitam orientação, resize e foco: vertical no desktop, horizontal no celular, skip vai ao main', async () => {
  const a = await ambiente();
  try {
    const doc = a.dom.window.document, tabs = doc.querySelector('#tabs');
    assert.equal(tabs.getAttribute('aria-orientation'), 'vertical');
    const estudar = doc.querySelector('#tab-sessao'); estudar.focus();
    estudar.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    assert.equal(doc.activeElement.id, 'tab-biblioteca');
    Object.defineProperty(a.dom.window, 'innerWidth', { configurable: true, writable: true, value: 420 });
    a.dom.window.dispatchEvent(new a.dom.window.Event('resize'));
    assert.equal(tabs.getAttribute('aria-orientation'), 'horizontal');
    const biblioteca = doc.querySelector('#tab-biblioteca'); biblioteca.focus();
    biblioteca.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    assert.equal(doc.activeElement.id, 'tab-leiseca');
    const skip = doc.querySelector('.rd-skip-link'); skip.click();
    assert.equal(doc.activeElement.id, 'main');
  } finally { a.close(); }
});
