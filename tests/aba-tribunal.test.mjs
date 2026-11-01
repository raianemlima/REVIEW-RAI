import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const ler = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const html = ler('index.html');
const app = ler('app-src.txt').replace(/\nboot\(\);\s*$/, '\n');
const motorInicio = html.indexOf('// Motor de revisão:');
const motor = html.slice(motorInicio, html.indexOf('</script>', motorInicio));
const norm = v => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// Lei seca fictícia no formato extraído do curso (campos g, n, rec, j, stf e assertivas {q, b} sem gabarito).
const leiCurso = {
  id: 'cp-dls', nome: 'Código Penal · Decodificado', curto: 'CP', disc: 'dp', fonte: 'Fixture do curso', completa: true,
  grupos: [{ nome: 'PARTE GERAL', itens: [
    { h: 'TÍTULO I · Da Aplicação da Lei Penal' },
    { a: '1', x: 'Art. 1º Não há crime sem lei anterior que o defina.', n: 9, rec: 'FGV 2025 · Analista Judiciário (TJ-XX)',
      g: [['Art. 1º Não há ', ''], ['crime sem lei anterior', 'v'], [' que o defina.', '']],
      j: [{ t: 'STF', tit: 'Legalidade.', x: 'Texto fictício de julgado.', ref: '(Fixture)' }], stf: [{ t: 'Decisão do STF', x: 'Aviso fictício.' }] },
    { q: 'Assertiva fictícia considerada correta.', b: 'FGV 2024 - Analista Judiciário (TJ-XX)' },
    { a: '2', x: 'Art. 2º Ninguém pode ser punido por fato que lei posterior deixa de considerar crime.', n: 2 },
  ] }],
};

function ambiente(extras = []) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><header><button id="goBusca"></button><button id="goAjustes"></button><span id="save"></span><nav id="tabs"></nav></header><main id="main"></main></body></html>', { url: 'https://fixture.invalid/', runScripts: 'outside-only' });
  dom.window.scrollTo = () => {};
  dom.window.fetch = () => { throw new Error('Rede não permitida nos testes.'); };
  const ctx = dom.getInternalVMContext();
  const run = code => vm.runInContext(code, ctx);
  const cartoes = [
    { id: 'pc1', disc: 'pc', tema: 'Normas fundamentais', abr: 'nucleo_comum', tipo: 'conceito', frente: 'Normas fundamentais do processo civil e prazos em dias úteis', verso: 'Resposta fictícia', porque: '', inc: 3, peso: 3, ord: 1, origem: 'CPC, art. 219' },
    { id: 'dc1', disc: 'dc', tema: 'Tema fictício', abr: 'nucleo_comum', tipo: 'conceito', frente: 'Pergunta fictícia', verso: 'Resposta', porque: '', inc: 3, peso: 3, ord: 2, origem: 'Fixture' },
  ];
  const disciplinas = [['dc', 'Direito Constitucional', 'Constitucional'], ['pc', 'Direito Processual Civil', 'Proc. Civil'], ['dp', 'Direito Penal', 'Penal'], ['pp', 'Direito Processual Penal', 'Proc. Penal']]
    .map(([id, nome, curto]) => ({ id, nome, curto, peso: 1 }));
  run(`const DECK = ${JSON.stringify({ versao: 'fixture', disciplinas, cartoes, leiseca: [leiCurso, ...extras] })};`);
  run(motor);
  run(app);
  run(`S.mode = 'local'; S.ajustes.metaOn = false; S.ajustes.onboard = true; S.ajustes.som = false; S.ajustes.vibra = false; ensureAj();`);
  for (const f of ['cronograma-taxonomia.js', 'cronograma-conteudo.js', 'cronograma-motor.js']) run(ler('arquivos/' + f));
  return { doc: dom.window.document, run, close: () => dom.window.close() };
}

test('o edital TJPB 2026 entra no Cronograma com as rubricas do Anexo I e localizador de página', () => {
  const ctx = { window: {} }; vm.createContext(ctx);
  for (const f of ['cronograma-taxonomia.js', 'cronograma-conteudo.js', 'cronograma-pesos.js']) vm.runInContext(ler('arquivos/' + f), ctx);
  const tj = ctx.window.DPE_CONTEUDOS_EDITAIS['tjpb-2026'], perfil = ctx.window.DPE_PESOS_EDITAIS['tjpb-2026'];
  assert.equal(tj.cargo, 'servidor');
  assert.equal(tj.plano, 'plano-tjpb-2026.html');
  assert.ok(existsSync(new URL('../' + tj.plano, import.meta.url)), 'a página do plano precisa existir');
  assert.equal(tj.disciplinas.length, 10);
  const topicos = tj.disciplinas.flatMap(d => d.topicos);
  assert.equal(topicos.length, 84);
  for (const t of topicos) assert.match(t.pagina, /^Edital nº 01\/2026, p\. (2[89]|3[0-3])$/);
  const penal = tj.disciplinas.find(d => d.id === 'direito_penal');
  assert.ok(penal.topicos.at(-1).leis.includes('Lei nº 13.964/2019'), 'a legislação penal especial fica ligada às leis citadas');
  assert.equal(perfil.tipo, 'questoes');
  const soma = gs => Math.round(gs.reduce((n, g) => n + g.valor, 0));
  assert.equal(soma(perfil.grupos.slice(0, 3)), 20);
  assert.equal(soma(perfil.grupos.slice(3)), 40);
  for (const d of tj.disciplinas) assert.equal(perfil.grupos.filter(g => norm(g.label) === norm(d.nome)).length, 1, d.nome);
  assert.match(ler('arquivos/cronograma.js'), /\["tjpb-2026","PB",2026,/);
});

test('o plano pessoal tem 13 semanas até a prova e nenhum bloco de Português', () => {
  const plano = JSON.parse(ler('ferramentas/conteudo/dados/plano-tjpb-2026.json'));
  assert.equal(plano.semanas.length, 13);
  assert.equal(plano.semanas.at(-1).dias.at(-1).data, '2027-01-24');
  const itens = plano.semanas.flatMap(w => w.dias.flatMap(d => d.itens));
  assert.equal(itens.filter(i => i.s === 'port' || /Portugu[eê]s/.test(i.t)).length, 0);
  assert.ok(itens.filter(i => i.s === 'jur').length >= 27, 'os blocos que eram de Português viraram súmulas e teses');
  assert.match(ler('app-src.txt'), /const TJPB_PLANO = \{/);
});

test('a aba Tribunal mostra a semana, salva o progresso e liga o bloco ao conteúdo do app', () => {
  const a = ambiente();
  try {
    a.run('S.tjSem = 1; go("tribunal")');
    const doc = a.doc;
    assert.ok(doc.querySelector('.tj-hero'));
    assert.equal(doc.querySelectorAll('.tj-chip').length, 13);
    assert.equal(doc.querySelectorAll('.tj-dia').length, 7);
    const caixa = doc.querySelector('[data-tjfeito="w1-d0-i0"]');
    caixa.checked = true;
    caixa.dispatchEvent(new doc.defaultView.Event('change'));
    assert.equal(a.run('S.ajustes.tjpb.feitos["w1-d0-i0"]'), 1);
    assert.match(doc.querySelector('.tj-prog span').textContent, /^1 de \d+ concluídos$/);
    const det = doc.querySelector('details[data-tjrel="0:0"]');
    det.open = true;
    det.dispatchEvent(new doc.defaultView.Event('toggle'));
    assert.match(det.textContent, /Normas fundamentais/);
    det.querySelector('[data-tj-ir]').click();
    assert.equal(a.run('S.tab'), 'biblioteca');
  } finally { a.close(); }
});

test('a aba Tribunal lista os artigos mais cobrados da lei seca do curso e abre o artigo', () => {
  const a = ambiente();
  try {
    a.run('go("tribunal")');
    const lei = a.doc.querySelector('.tj-lei');
    assert.ok(lei, 'seção da lei seca do curso');
    assert.match(lei.textContent, /Art\. 1/);
    assert.match(lei.textContent, /FGV/);
    lei.querySelector('.tj-art').click();
    assert.equal(a.run('S.tab'), 'leiseca');
    assert.equal(a.run('S.lsDip'), 'cp-dls');
  } finally { a.close(); }
});

test('o leitor de Lei seca mostra grifos, questões, jurisprudência e filtra o muito cobrado', () => {
  const a = ambiente();
  try {
    a.run('S.lsDip = "cp-dls"; S.lsGrp = 0; S.lsQ = ""; go("leiseca")');
    const doc = a.doc;
    assert.equal(doc.querySelector('.ls-x mark.gv')?.textContent, 'crime sem lei anterior');
    assert.match(doc.querySelector('.badge.ls-nq.raio').textContent, /9 questões/);
    assert.match(doc.querySelector('.ls-j summary').textContent, /Jurisprudência correlata \(1\)/);
    assert.ok(doc.querySelector('.ls-stf'));
    assert.ok(doc.querySelector('.ls-ok'), 'assertiva sem gabarito aparece como correta, sem "undefined"');
    assert.doesNotMatch(doc.querySelector('#lsList').innerHTML, /undefined/);
    assert.equal(doc.querySelectorAll('#lsList .ls-a').length, 2);
    const raio = doc.querySelector('#lsRaio');
    raio.checked = true; raio.dispatchEvent(new doc.defaultView.Event('change'));
    assert.equal(doc.querySelectorAll('#lsList .ls-a').length, 1);
  } finally { a.close(); }
});

test('o menu, o estilo e o cache publicam a aba e a página do plano', () => {
  assert.match(html, /id="tab-tribunal"/);
  assert.match(html, /\/\* ---- aba Tribunal \(TJPB\) ---- \*\//);
  assert.match(ler('sw.js'), /"plano-tjpb-2026\.html"/);
  assert.match(ler('.github/workflows/pages.yml'), /cp [^\n]*plano-tjpb-2026\.html/);
});

test('lei sem os grifos do curso mostra a marcação automática com a legenda própria', () => {
  const auto = { id: 'lgpd', nome: 'Lei nº 13.709/2018 · LGPD', curto: 'LGPD', disc: 'dc', fonte: 'Fixture', completa: true, grifos: 'auto',
    grupos: [{ nome: 'LGPD', itens: [{ a: '7', x: 'Art. 7º O tratamento somente poderá ser realizado.', g: [['Art. 7º O tratamento ', ''], ['somente', 'a'], [' poderá ser realizado.', '']] }] }] };
  const a = ambiente([auto]);
  try {
    a.run('S.lsDip = "lgpd"; S.lsGrp = 0; S.lsQ = ""; go("leiseca")');
    const mark = a.doc.querySelector('.ls-x mark.ga');
    assert.equal(mark.textContent, 'somente');
    assert.equal(mark.title, 'exceção, vedação ou restrição');
    assert.match(a.doc.querySelector('.ls-legenda').textContent, /marcação automática do app/);
    assert.doesNotMatch(a.doc.querySelector('.ls-legenda').textContent, /pegadinha/);
    a.run('S.lsDip = "cp-dls"; go("leiseca")');
    assert.match(a.doc.querySelector('.ls-legenda').textContent, /pegadinha/, 'a lei do curso mantém a legenda do curso');
    assert.equal(a.doc.querySelector('.ls-x mark.gv').title, 'pegadinha');
  } finally { a.close(); }
});
