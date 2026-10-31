import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const appOriginal = readFileSync(new URL('../app-src.txt', import.meta.url), 'utf8');
const app = appOriginal.replace(/\nboot\(\);\s*$/, '\n');
const motorInicio = html.indexOf('// Motor de revisão:');
const motor = html.slice(motorInicio, html.indexOf('</script>', motorInicio));
const cronograma = readFileSync(new URL('../arquivos/cronograma.js', import.meta.url), 'utf8');
const perfilPath = new URL('../arquivos/cronograma-pesos.js', import.meta.url);
const perfis = existsSync(perfilPath) ? readFileSync(perfilPath, 'utf8') : '';

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
  if (perfis) run(perfis);
  run(readFileSync(new URL('../arquivos/cronograma-taxonomia.js', import.meta.url), 'utf8'));
  run(readFileSync(new URL('../arquivos/cronograma-conteudo.js', import.meta.url), 'utf8'));
  run(readFileSync(new URL('../arquivos/cronograma-motor.js', import.meta.url), 'utf8'));
  run(cronograma);
  return { dom, run, close: () => dom.window.close() };
}

async function pronta(a) {
  for (let i = 0; i < 15 && !a.run('window.__cronogramaInstalado === true'); i++) await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(a.run('window.__cronogramaInstalado'), true);
}

const idsCE = ['direito_constitucional', 'direito_civil', 'direito_penal', 'direito_processual_civil', 'direito_processual_penal', 'direito_do_trabalho', 'direito_administrativo', 'direito_previdenciario', 'direito_empresarial', 'direito_do_consumidor', 'direito_institucional_defensoria_publica'];
const close = (actual, expected, tolerance = 0.011) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} deveria estar próximo de ${expected}`);

test('catálogo de percentuais interpreta vírgula e ponto e rejeita texto inválido', () => {
  const a = ambiente();
  try {
    assert.equal(a.run('window.__cronogramaCatalogo.lerPercentual("7,69")'), 7.69);
    assert.equal(a.run('window.__cronogramaCatalogo.lerPercentual("7.69")'), 7.69);
    assert.ok(Number.isNaN(a.run('window.__cronogramaCatalogo.lerPercentual("abc")')));
    assert.ok(Number.isNaN(a.run('window.__cronogramaCatalogo.lerPercentual("")')));
  } finally { a.close(); }
});

test('normalização distribui centésimos inteiros e fecha exatamente em 10000 centésimos', () => {
  const a = ambiente();
  try {
    for (const n of [13, 33]) {
      const result = a.run(`window.__cronogramaCatalogo.normalizarPercentuais(Array.from({length:${n}}, (_,i)=>'m'+i), {}, 10000)`);
      const values = Object.values(result);
      assert.equal(values.reduce((sum, value) => sum + Math.round(value * 100), 0), 10000);
      assert.equal(values.length, n);
      assert.ok(values.every(value => Number.isInteger(Math.round(value * 100))));
    }
    const fixed = a.run(`window.__cronogramaCatalogo.normalizarPercentuais(['a','b','c'], {a:40,b:30,c:30}, 10000)`);
    assert.equal(fixed.a, 40);
    assert.equal(Object.values(fixed).reduce((s, n) => s + Math.round(n * 100), 0), 10000);
  } finally { a.close(); }
});

test('perfil objetivo CE contém pesos verificáveis e proposta constitucional/penal respeita 20:13', () => {
  const a = ambiente();
  try {
    const result = a.run(`(() => { const p=window.DPE_PESOS_EDITAIS; const ce=p.ceara||p.CE||p['ce-2022']||p['ce-2023']||p['ce-2021']; return {p,ce}; })()`);
    assert.ok(result.p, 'perfil de pesos disponibilizado globalmente');
    assert.ok(result.ce, 'perfil específico da DPE-CE disponível');
    const all = JSON.stringify(result.ce);
    for (const [name, n] of [['Constitucional',20],['Civil',13],['Penal',13],['Processual Civil',12],['Processual Penal',12],['Trabalho',2],['Administrativo',7],['Previdenciário',3],['Empresarial',2],['Consumidor',6],['Institucional',10]]) {
      assert.ok(all.toLowerCase().includes(name.toLowerCase()), `perfil CE inclui ${name}`);
      assert.ok(all.includes(String(n)), `perfil CE registra peso ${n} para ${name}`);
    }
    const pair = a.run(`window.__cronogramaCatalogo.sugerirPesos('ce-2022',['direito_constitucional','direito_penal'])`);
    assert.ok(pair);
    close(pair.direito_constitucional / pair.direito_penal, 20 / 13, 0.02);
    close(pair.direito_constitucional + pair.direito_penal, 100, 0.011);
  } finally { a.close(); }
});

test('campos de percentual usam texto decimal, botões de sugestão/igualdade e explicam o método', async () => {
  const a = ambiente();
  try {
    await pronta(a); a.run('go("cronograma")');
    const d = a.dom.window.document;
    assert.ok(d.querySelector('#crSugerir'));
    assert.ok(d.querySelector('#crIgual'));
    assert.ok(d.querySelector('#crMetodo'));
    assert.ok(d.querySelector('#crTotal'));
    const fields = [...d.querySelectorAll('[data-cr-peso]')];
    assert.ok(fields.length);
    assert.ok(fields.every(x => x.type === 'text' && x.inputMode === 'decimal'));
    assert.match(d.querySelector('#crMetodo').textContent, /quest|grupo|equilibrad/i);
    assert.doesNotMatch(d.querySelector('#crMetodo').textContent, /peso individual/i);
  } finally { a.close(); }
});

test('alterar percentual redistribui saldo ao redor do valor fixo e inválidos não são aceitos no submit', async () => {
  const a = ambiente();
  try {
    await pronta(a); a.run('go("cronograma")');
    const d = a.dom.window.document, fields = [...d.querySelectorAll('[data-cr-peso]')];
    const target = fields[0]; target.value = '40'; target.dispatchEvent(new a.dom.window.Event('change', { bubbles: true }));
    close(Number(target.value.replace(',', '.')), 40);
    close([...d.querySelectorAll('[data-cr-peso]')].reduce((s, x) => s + Number(x.value.replace(',', '.')), 0), 100);
    target.value = '-5'; target.dispatchEvent(new a.dom.window.Event('change', { bubbles: true }));
    assert.notEqual(target.value, '0.00', 'entrada negativa não deve virar zero silenciosamente');
    d.querySelector('#crForm').dispatchEvent(new a.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    assert.notEqual(a.run('S.ajustes.cronograma?.ativo'), true, 'formulário inválido não salva');
  } finally { a.close(); }
});

test('rascunho preserva horas e dias ao trocar edital; edição de inputs funciona por delegação', async () => {
  const a = ambiente();
  try {
    await pronta(a); a.run('go("cronograma")');
    const d = a.dom.window.document, hours = d.querySelector('#crHoras');
    hours.value = '8'; hours.dispatchEvent(new a.dom.window.Event('input', { bubbles: true }));
    const chosenDay = d.querySelector('[data-cr-dia]'); chosenDay.checked = false; chosenDay.dispatchEvent(new a.dom.window.Event('change', { bubbles: true }));
    const before = [...d.querySelectorAll('[data-cr-dia]:checked')].map(x => x.dataset.crDia);
    const edital = d.querySelector('#crEdital'); edital.value = 'ce-2022'; edital.dispatchEvent(new a.dom.window.Event('change', { bubbles: true }));
    assert.equal(d.querySelector('#crHoras').value, '8');
    assert.deepEqual([...d.querySelectorAll('[data-cr-dia]:checked')].map(x => x.dataset.crDia), before);
    const field = d.querySelector('[data-cr-peso]'); field.value = '7,69'; field.dispatchEvent(new a.dom.window.Event('input', { bubbles: true }));
    assert.ok(d.querySelector('#crTotal').textContent.length > 0);
  } finally { a.close(); }
});

test('salvar e reabrir plano personalizado conserva pesos 60/40 sem regenerá-los', async () => {
  const a = ambiente();
  try {
    await pronta(a); a.run('go("cronograma")');
    const d = a.dom.window.document;
    const edital=d.querySelector('#crEdital'); edital.value='ce-2022'; edital.dispatchEvent(new a.dom.window.Event('change',{bubbles:true}));
    d.querySelectorAll('[data-cr-subject]').forEach(x => { x.checked = ['direito_constitucional','direito_processual_civil'].includes(x.dataset.crSubject); x.dispatchEvent(new a.dom.window.Event('change', { bubbles: true })); });
    for (const x of d.querySelectorAll('[data-cr-peso]')) x.value = x.dataset.crPeso === 'direito_constitucional' ? '60' : '40';
    d.querySelector('#crForm').dispatchEvent(new a.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    assert.equal(a.run('S.ajustes.cronograma.ativo'), true);
    assert.equal(a.run('S.ajustes.cronograma.pesos.direito_constitucional'), 60);
    assert.equal(a.run('S.ajustes.cronograma.pesos.direito_processual_civil'), 40);
    a.run('go("hoje")'); a.run('go("cronograma")');
    assert.equal(Number(d.querySelector('[data-cr-peso="direito_constitucional"]').value.replace(',', '.')), 60);
    assert.equal(Number(d.querySelector('[data-cr-peso="direito_processual_civil"]').value.replace(',', '.')), 40);
  } finally { a.close(); }
});

test('os 20 perfis usam IDs existentes e as sugestões de todos os editais fecham 100%', () => {
  const a = ambiente();
  try {
    const catalogo = a.run('window.__cronogramaCatalogo');
    const perfis = a.run('window.DPE_PESOS_EDITAIS');
    assert.equal(Object.keys(perfis).length, 20);
    for (const [id, perfil] of Object.entries(perfis)) {
      const edital = catalogo.EDITAIS_DPE.find(e => e.id === id);
      assert.ok(edital);
      for (const grupo of perfil.grupos) {
        assert.ok(grupo.valor > 0 && grupo.evidencia);
        assert.equal(new Set(grupo.subjects).size, grupo.subjects.length);
        for (const materia of grupo.subjects) assert.ok(catalogo.DISC_MAP[materia]);
      }
      const pesos = catalogo.sugerirPesos(id, edital.subjects);
      assert.equal(Object.values(pesos).reduce((n, v) => n + Math.round(v * 100), 0), 10000);
    }
    for (const texto of ['-1','101','100.01','7,691','1e2','1,2.3']) assert.ok(Number.isNaN(catalogo.lerPercentual(texto)));
    for (const [texto, numero] of [['0',0],['100',100],[',5',0.5],['7,69',7.69],['7.69',7.69]]) assert.equal(catalogo.lerPercentual(texto), numero);
  } finally { a.close(); }
});
