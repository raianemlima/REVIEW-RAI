import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const ler = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const html = ler('index.html');
const appReal = ler('app-src.txt').replace(/\nboot\(\);\s*$/, '\n');
const motorInicio = html.indexOf('// Motor de revisão:');
const motor = html.slice(motorInicio, html.indexOf('</script>', motorInicio));

const q = (n, d, enun, certa, extra = {}) => ({ n, materia: extra.materia || 'Prova Objetiva', d, enunciado: enun, alternativas: { A: 'alternativa a', B: 'alternativa b', C: 'alternativa c', D: 'alternativa d' }, gabarito: certa, ...extra });
const PROVAS = [
  { id: 'tj-fgv', nome: 'TJ-XX 2025 · FGV', cargo: 'Fixture', banca: 'FGV', gabarito: 'definitivo', questoes: [
    q(1, 'direito_penal', 'Sobre a prescrição da pretensão punitiva e a prescrição retroativa no direito penal, assinale a correta.', 'B'),
    q(2, 'direito_processual_penal', 'A prisão preventiva exige fundamento cautelar; sobre a prisão preventiva, assinale a correta.', 'C'),
    q(3, 'direito_processual_penal', 'Na prisão preventiva, o juiz deve fundamentar a necessidade da prisão preventiva em fatos concretos.', 'A'),
    q(4, 'direito_processual_penal', 'Quanto à prisão preventiva decretada de ofício, assinale a alternativa correta.', 'D'),
    q(5, 'direito_penal', 'A prescrição penal e a prescrição retroativa dependem da pena aplicada na sentença.', 'A'),
    q(6, null, 'Questão sem matéria identificada sobre assunto qualquer.', 'A'),
  ] },
  { id: 'tj-ceb', nome: 'TJ-YY 2024 · Cebraspe', cargo: 'Fixture', banca: 'Cebraspe', gabarito: 'definitivo', questoes: [
    q(1, 'direito_processual_penal', 'Julgue a prisão preventiva e seus requisitos, inclusive a prisão preventiva domiciliar.', 'B'),
    q(2, 'direito_penal', 'A prescrição penal da pretensão punitiva em abstrato regula-se pelo máximo da pena.', 'C'),
  ] },
];

const filler = Array.from({ length: 40 }, (_, i) => ({ id: 'f' + i, disc: 'dc', tema: 'Assunto avulso ' + i, abr: 'nucleo_comum', tipo: 'conceito', frente: `Pergunta avulsa número ${i} sobre palavra${'xyz'[i % 3]}${i}`, verso: 'Resposta', porque: '', inc: 3, peso: 3, ord: 100 + i, origem: 'Fixture' }));
const carta = (id, disc, tema, frente, verso = 'Resposta') => ({ id, disc, tema, abr: 'nucleo_comum', tipo: 'conceito', frente, verso, porque: '', inc: 3, peso: 3, ord: 1, origem: 'Fixture' });
const leiX = { id: 'cpp-x', nome: 'Código de Processo Penal', curto: 'CPP', disc: 'pp', fonte: 'Fixture', completa: false, grupos: [{ nome: 'Geral', itens: [
  { a: '310', x: 'Art. 310. Após receber o auto de prisão em flagrante, no prazo máximo de até 24 (vinte e quatro) horas após a realização da prisão, o juiz deverá promover audiência de custódia.', n: 9 },
  { a: '5', x: 'Art. 5º Texto longo o bastante para a lacuna, mas sem nenhum prazo ou número escrito nele.', n: 20 },
  { a: '8', x: 'Art. 8º O prazo é de 5 (cinco) dias para o recurso interposto pela parte interessada.', n: 1 },
  { a: '9', x: 'Art. 9º A pena aumenta-se de um terço se o crime for cometido em concurso de pessoas e com violência.', n: 4 },
] }] };

function ambiente() {
  const app = appReal.replace(/^const PROVAS_PUBLICO = .*$/m, 'const PROVAS_PUBLICO = ' + JSON.stringify(PROVAS) + ';');
  const dom = new JSDOM('<!doctype html><html><head></head><body><header><button id="goBusca"></button><button id="goAjustes"></button><span id="save"></span><nav id="tabs"></nav></header><main id="main"></main></body></html>', { url: 'https://fixture.invalid/', runScripts: 'outside-only' });
  dom.window.scrollTo = () => {};
  dom.window.fetch = () => { throw new Error('Rede não permitida nos testes.'); };
  const ctx = dom.getInternalVMContext(), run = code => vm.runInContext(code, ctx);
  const cartoes = [
    carta('c1', 'dp', 'Prescrição penal', 'Como se conta a prescrição retroativa e a prescrição da pretensão punitiva no direito penal?', 'Pelo máximo da pena; a retroativa conta-se da data do fato.'),
    carta('c2', 'dp', 'Prescrição penal', 'Quais causas interrompem a prescrição da pretensão punitiva no direito penal e a prescrição retroativa?'),
    carta('c3', 'pp', 'Prisão preventiva', 'Quais os requisitos da prisão preventiva, de ofício pelo juiz, e a fundamentação cautelar concreta?'),
    carta('c4', 'ep', 'Progressão de regime', 'Qual a fração para a progressão de regime do apenado primário?'),
    ...filler,
  ];
  const disciplinas = [['dc', 'Direito Constitucional', 'Constitucional'], ['dp', 'Direito Penal', 'Penal'], ['pp', 'Direito Processual Penal', 'Proc. Penal'], ['ep', 'Execução Penal', 'Exec. Penal']].map(([id, nome, curto]) => ({ id, nome, curto, peso: 1 }));
  run(`const DECK = ${JSON.stringify({ versao: 'fixture', disciplinas, cartoes, leiseca: [leiX] })};`);
  run(motor);
  run(app);
  run(`S.mode = 'local'; S.ajustes.metaOn = false; S.ajustes.onboard = true; S.ajustes.som = false; S.ajustes.vibra = false; ensureAj(); globalThis.__toasts = []; toast = m => __toasts.push(m);`);
  for (const f of ['cronograma-taxonomia.js', 'cronograma-conteudo.js', 'cronograma-motor.js']) run(ler('arquivos/' + f));
  return { doc: dom.window.document, win: dom.window, run, close: () => dom.window.close() };
}
const visto = (a, id, dias) => a.run(`S.cards[${JSON.stringify(id)}] = { s: 5, d: 5, due: today() + ${dias}, last: today() - 3, reps: 3, lapses: 0, f: null }`);
const meus = a => JSON.parse(a.run('JSON.stringify(S.ajustes.meus)'));

test('o banco de questões traz a disciplina identificada (campo d) em mais da metade das questões', () => {
  const t = readFileSync(new URL('../app-src.txt', import.meta.url), 'utf8');
  const provas = JSON.parse(t.match(/^const PROVAS_PUBLICO = (\[.*\]);\r?$/m)[1]);
  const qs = provas.flatMap(p => p.questoes), com = qs.filter(x => x.d);
  assert.ok(com.length / qs.length > 0.55, `só ${com.length} de ${qs.length}`);
  const ids = new Set(com.map(x => x.d));
  for (const must of ['direito_penal', 'direito_processual_penal', 'direito_civil', 'direito_constitucional', 'direito_administrativo']) assert.ok(ids.has(must), must);
  assert.ok([...ids].every(i => /^[a-z_]+$/.test(i)));
});

test('errar uma questão de prova cria o cartão no tema do baralho, antecipa cartões parecidos e entra no ranking', () => {
  const a = ambiente();
  try {
    visto(a, 'c1', 12); visto(a, 'c2', 20);
    a.run('S.pvId = "tj-fgv"; S.pvMat = ""; S.pvI = 0; go("prova")');
    // gabarito da questão 1 é B; marcar A erra
    a.doc.querySelector('[data-pvalt="A"]').click();
    const m = meus(a);
    assert.equal(m.length, 1);
    assert.equal(m[0].id, 'mc-pv-tj-fgv-1');
    assert.equal(m[0].tema, 'Prescrição penal'); assert.equal(m[0].disc, 'dp'); assert.equal(m[0].origem, 'Erro em prova');
    assert.match(m[0].verso, /^Gabarito: B\)/);
    assert.equal(a.run('S.cards.c1.due === today() && S.cards.c2.due === today()'), true, 'os dois cartões do tema vencem hoje');
    assert.equal(a.run('S.ajustes.errosQ.length'), 1);
    assert.match(a.run('__toasts.at(-1)'), /Erro virou revisão: 1 cartão criado e 2 cartões parecidos antecipados/);
    // refazer e errar de novo no mesmo dia não duplica cartão nem erro
    a.doc.querySelector('#pvRefazer').click();
    a.doc.querySelector('[data-pvalt="C"]').click();
    assert.equal(meus(a).length, 1);
    assert.equal(a.run('S.ajustes.errosQ.length'), 1);
    // o ranking soma a questão errada no tema do baralho e oferece "Treinar"
    const temas = JSON.parse(a.run('JSON.stringify(temasQueMaisErra())'));
    assert.equal(temas[0].tema, 'Prescrição penal'); assert.equal(temas[0].q, 1); assert.equal(temas[0].treinavel, true);
  } finally { a.close(); }
});

test('acertar não gera cartão; a opção desligada e a questão anulada também não', () => {
  const a = ambiente();
  try {
    a.run('S.pvId = "tj-fgv"; S.pvMat = ""; S.pvI = 0; go("prova")');
    a.doc.querySelector('[data-pvalt="B"]').click();
    assert.equal(meus(a).length, 0);
    a.run('S.ajustes.erroAuto = false; S.pvI = 1; renderProva()');
    a.doc.querySelector('[data-pvalt="A"]').click();
    assert.equal(meus(a).length, 0);
    assert.equal(a.run('S.ajustes.errosQ.length'), 0);
  } finally { a.close(); }
});

test('a antecipação respeita o teto diário e só mexe em cartões já estudados', () => {
  const a = ambiente();
  try {
    visto(a, 'c1', 12); // c2 nunca estudado: não entra
    a.run('ensureAj(); S.ajustes.antecipHoje = { dia: today(), n: 23 }');
    a.run('S.pvId = "tj-fgv"; S.pvI = 0; go("prova")');
    a.doc.querySelector('[data-pvalt="A"]').click();
    assert.equal(a.run('S.cards.c1.due === today()'), true);
    assert.equal(a.run('S.cards.c2'), undefined);
    assert.equal(a.run('S.ajustes.antecipHoje.n'), 24);
    // no teto, o cartão novo ainda é criado, mas nada é antecipado
    a.run('S.ajustes.antecipHoje = { dia: today(), n: 24 }; S.cards.c1.due = today() + 9; S.pvI = 4; renderProva()');
    a.doc.querySelector('[data-pvalt="B"]').click();
    assert.equal(a.run('S.cards.c1.due === today() + 9'), true);
    assert.equal(meus(a).length, 2);
  } finally { a.close(); }
});

test('temas com erro recente sobem na fila de revisão', () => {
  const a = ambiente();
  try {
    visto(a, 'c1', -2); visto(a, 'c3', -2);
    const antes = a.run('JSON.stringify([prio(byId.c1, today(), ctx()), prio(byId.c3, today(), ctx())])');
    const [p1, p3] = JSON.parse(antes);
    assert.ok(Math.abs(p1 - p3) < 1e-9, 'sem erros, mesma prioridade');
    a.run('for (let i = 0; i < 4; i++) registrarErroQ("pv:x:" + i, "dp", "Prescrição penal", "prova")');
    const [q1, q3] = JSON.parse(a.run('JSON.stringify([prio(byId.c1, today(), ctx()), prio(byId.c3, today(), ctx())])'));
    assert.ok(Math.abs(q3 - p3) < 1e-9, 'tema sem erro não muda');
    assert.ok(Math.abs(q1 / p1 - 1.48) < 1e-9, '4 erros = +48%');
    a.run('for (let i = 0; i < 20; i++) registrarErroQ("pv:y:" + i, "dp", "Prescrição penal", "prova")');
    assert.ok(Math.abs(JSON.parse(a.run('JSON.stringify(prio(byId.c1, today(), ctx()))')) / p1 - 1.6) < 1e-9, 'teto de +60%');
    const plano = JSON.parse(a.run('JSON.stringify(plan().due.map(c => c.id))'));
    assert.equal(plano[0], 'c1');
  } finally { a.close(); }
});

test('treino certo ou errado: quem erra ganha cartão no formato certo/errado e quem acerta não', () => {
  const a = ambiente();
  try {
    a.run('document.getElementById("main").innerHTML = treinoHtml("teste:1", [{ q: "A pena é de 20 a 40 anos.", a: false, e: "Errado. A pena é de 12 a 20 anos." }, { q: "O prazo é de 30 dias.", a: true, e: "Certo. É o art. 3º." }], "Novidades · Lei X")');
    const caixas = a.doc.querySelectorAll('.qz2');
    assert.equal(caixas.length, 2);
    assert.equal(caixas[0].querySelector('.qa').hidden, true);
    caixas[0].querySelector('[data-qa="C"]').click();    // errou: a afirmativa é errada
    assert.ok(caixas[0].classList.contains('errou')); assert.equal(caixas[0].querySelector('.qa').hidden, false);
    const m = meus(a);
    assert.equal(m.length, 1); assert.equal(m[0].tipo, 'pegadinha'); assert.equal(m[0].tema, 'Novidades · Lei X');
    assert.match(m[0].frente, /^Certo ou errado: A pena é de 20 a 40 anos\.$/); assert.match(m[0].verso, /^ERRADO\. A pena é de 12 a 20 anos\./);
    assert.equal(a.run('correctCE(byId[S.ajustes.meus[0].id])'), 'E');
    caixas[1].querySelector('[data-qa="C"]').click();    // acertou
    assert.ok(caixas[1].classList.contains('certo')); assert.equal(meus(a).length, 1);
    assert.equal(JSON.stringify(a.run('Object.keys(S.ajustes.nvTreino)')), '["teste:1#0","teste:1#1"]');
    // o resultado sobrevive a um novo desenho da tela
    a.run('document.getElementById("main").innerHTML = treinoHtml("teste:1", [{ q: "A pena é de 20 a 40 anos.", a: false, e: "Errado. A pena é de 12 a 20 anos." }], "Novidades · Lei X")');
    assert.ok(a.doc.querySelector('.qz2').classList.contains('errou'));
    a.doc.querySelector('[data-qa="refazer"]').click();
    assert.equal(a.doc.querySelector('.qa').hidden, true); assert.equal(a.doc.querySelector('[data-qa="E"]').disabled, false);
    assert.equal(meus(a).length, 1, 'refazer não apaga o cartão');
  } finally { a.close(); }
});

test('Novidades: o treino é interativo e o botão cria os cartões de lacuna uma única vez', () => {
  const a = ambiente();
  try {
    a.run('S.novSt = "todas"; go("novidades")');
    const art = a.doc.querySelector('[data-id="nv-2026-11-lei15358"]');
    assert.ok(art, 'Lei 15.358 na lista');
    assert.equal(art.querySelectorAll('.qz2').length, 5);
    assert.equal(art.querySelectorAll('details.qz').length, 0, 'sem o treino antigo de abrir e ver');
    const btn = art.querySelector('[data-nvlz]');
    assert.match(btn.textContent, /8 cartões de lacuna/);
    btn.click();
    const lz = meus(a).filter(x => x.id.startsWith('lz-nv-nv-2026-11-lei15358-'));
    assert.equal(lz.length, 8);
    assert.ok(lz.every(x => x.frente.split('____').length === 2 && x.tipo === 'lei_seca' && x.tema === 'Novidades · Lei 15.358/2026'));
    assert.ok(lz.every(x => a.run(`fillMatch(${JSON.stringify(x.verso)}, ${JSON.stringify(x.verso)})`) === true));
    assert.equal(btn.disabled, true);
    assert.match(art.querySelector('[data-nvlzm]').textContent, /8 cartões criados/);
    btn.disabled = false; btn.click();
    assert.equal(meus(a).filter(x => x.id.startsWith('lz-nv-nv-2026-11-lei15358-')).length, 8, 'não duplica');
    // os cartões entram no baralho e na fila
    assert.equal(a.run('DECK.cartoes.filter(c => c.id.startsWith("lz-nv-nv-2026-11-lei15358-")).length'), 8);
  } finally { a.close(); }
});

test('todas as lacunas das Novidades têm exatamente um espaço, resposta e disciplina do baralho', () => {
  const app = appReal;
  const itens = JSON.parse(app.match(/^const NOV_PUBLICO = (\[.*\]);$/m)[1]);
  const com = itens.filter(n => n.lacunas);
  assert.ok(com.length >= 27);
  const ids = new Set(['dp', 'pp', 'ep', 'dc', 'pc', 'cv', 'co', 'ec', 'pi', 'dh', 'ad', 'tr', 'df']);
  for (const n of com) for (const l of n.lacunas) {
    assert.equal(l.f.split('____').length, 2, `${n.id}: ${l.f.slice(0, 50)}`);
    assert.ok(l.v && l.v.length < 40, `${n.id}: resposta`);
    assert.ok(ids.has(l.d), `${n.id}: ${l.d}`);
  }
  assert.ok(com.reduce((s, n) => s + n.lacunas.length, 0) >= 90);
});

test('lacunas da lei seca: só artigos cobrados (2+ questões) com prazo, percentual ou quórum, do mais cobrado ao menos', () => {
  const a = ambiente();
  try {
    const l = JSON.parse(a.run('JSON.stringify(lacunasDaLei(DECK.leiseca[0]))'));
    assert.deepEqual(l.map(x => x.id), ['lz-cpp-x-310-0', 'lz-cpp-x-9-0']);
    assert.match(l[0].frente, /^CPP: Art\. 310\. Após receber .* no prazo máximo de até ____ após a realização da prisão/);
    assert.equal(l[0].verso, '24 (vinte e quatro) horas');
    assert.equal(a.run(`fillMatch("24 horas", ${JSON.stringify(l[0].verso)})`), true);
    assert.equal(l[1].verso, 'um terço');
    a.run('go("leiseca")');
    const bt = a.doc.querySelector('#lsLz');
    assert.match(bt.textContent, /\+2/);
    bt.click();
    assert.equal(meus(a).filter(x => x.id.startsWith('lz-cpp-x-')).length, 2);
    assert.equal(a.doc.querySelector('#lsLz').disabled, true, 'sem lacunas novas o botão fica desligado');
  } finally { a.close(); }
});

test('mapa de incidência: conta questões por banca, mostra lacunas e filtra', async () => {
  const a = ambiente();
  try {
    a.run(`window.DPE_CONTEUDOS_EDITAIS['teste-2026'] = { id: 'teste-2026', disciplinas: [
      { id: 'direito_penal', nome: 'DIREITO PENAL', canonicais: ['direito_penal'], topicos: [{ id: 'p1', titulo: 'Prescrição penal.', texto: 'Prescrição penal. Prescrição retroativa.', leis: [], juris: [] }] },
      { id: 'direito_processual_penal', nome: 'DIREITO PROCESSUAL PENAL', canonicais: ['direito_processual_penal'], topicos: [{ id: 'pp1', titulo: 'Prisão preventiva.', texto: 'Prisão preventiva.', leis: [], juris: [] }] } ] }`);
    const dados = await a.run('incidenciaCalcular("teste-2026")');
    const por = Object.fromEntries(dados.flatMap(d => d.topicos).map(t => [t.id, t]));
    assert.equal(por.p1.refs.length, 3);      // 2 FGV + 1 Cebraspe
    assert.equal(por.pp1.refs.length, 4);     // 3 FGV + 1 Cebraspe
    assert.equal(por.p1.cartoes, 2); assert.equal(por.pp1.cartoes, 1);
    const todas = JSON.parse(a.run('JSON.stringify(incidenciaLinhas(' + JSON.stringify(JSON.parse(JSON.stringify(dados))) + ', "FGV").todas.map(x => [x.t.id, x.q, x.tags.join("")]))'));
    assert.deepEqual(todas.map(x => x.slice(0, 2)), [['p1', 2], ['pp1', 3]]);
    const ceb = JSON.parse(a.run('JSON.stringify(incidenciaLinhas(' + JSON.stringify(JSON.parse(JSON.stringify(dados))) + ', "Cebraspe").todas.map(x => x.q))'));
    assert.deepEqual(ceb, [1, 1]);
    const todasBancas = JSON.parse(a.run('JSON.stringify(incidenciaLinhas(' + JSON.stringify(JSON.parse(JSON.stringify(dados))) + ', "").top.map(x => x.t.id))'));
    assert.deepEqual(todasBancas, ['pp1', 'p1'], 'o assunto mais cobrado e menos coberto vem primeiro');
    // o desempenho do aluno entra: erra 4 de 4 em prisão preventiva
    a.run(`ensureAj(); S.ajustes.provas = { 'tj-fgv': { r: { 2: 'A', 3: 'B', 4: 'A' }, rev: [] }, 'tj-ceb': { r: { 1: 'A' }, rev: [] } }`);
    const fraco = JSON.parse(a.run('JSON.stringify(incidenciaLinhas(' + JSON.stringify(JSON.parse(JSON.stringify(dados))) + ', "").todas.find(x => x.t.id === "pp1").tags)'));
    assert.deepEqual(fraco, ['l', 'f'], 'cai muito, pouco coberto e você erra');
    // a tela inteira
    a.run('S.incEdital = "teste-2026"; S.incBanca = ""; go("incidencia")');
    await new Promise(r => setTimeout(r, 50));
    const doc = a.doc;
    assert.match(doc.querySelector('h2').textContent, /Mapa de incidência/);
    assert.equal(doc.querySelectorAll('.inc-top li').length, 2);
    assert.equal(doc.querySelectorAll('.inc-disc').length, 2);
    assert.match(doc.querySelector('#incCorpo').textContent, /Prisão preventiva/);
  } finally { a.close(); }
});

test('sincronização: os erros de questão e o resultado do treino se mesclam entre aparelhos', () => {
  const a = ambiente();
  try {
    const m = JSON.parse(a.run(`JSON.stringify(mesclar(
      { ajustes: { errosQ: [[1, "a", "dp", "t", "prova"]], nvTreino: { k1: [5, 1, 0], k2: [7, 1, 1] } } },
      { ajustes: { errosQ: [[2, "b", "pp", "t2", "treino"], [1, "a", "dp", "t", "prova"]], nvTreino: { k1: [9, 0, 1] } } }).ajustes)`));
    assert.equal(m.errosQ.length, 2);
    assert.deepEqual(m.nvTreino, { k1: [9, 0, 1], k2: [7, 1, 1] });
    const lim = JSON.parse(a.run(`JSON.stringify(limparProgresso({ ajustes: { errosQ: [[1, "a"], "lixo", 3], nvTreino: [1, 2] } }).ajustes)`));
    assert.deepEqual(lim.errosQ, [[1, 'a']]); assert.equal('nvTreino' in lim, false);
  } finally { a.close(); }
});

test('o caderno de erros mostra cartões e questões, liga e desliga a conversão automática', () => {
  const a = ambiente();
  try {
    a.run('registrarErroQ("pv:a:1", "dp", "Prescrição penal", "prova"); registrarErroQ("pv:a:2", "dp", "Tema que não existe no baralho", "prova"); go("estatisticas")');
    const t = a.doc.querySelector('main').textContent;
    assert.match(t, /Temas em que mais erra/);
    assert.match(t, /Prescrição penal/);
    assert.match(t, /1 questão/);
    const treinar = [...a.doc.querySelectorAll('.weak')].map(w => [w.textContent.includes('Tema que não existe'), !!w.querySelector('[data-tte]')]);
    assert.deepEqual(treinar.find(x => x[0]), [true, false], 'sem cartões do tema, sem botão Treinar');
    const cx = a.doc.querySelector('#erroAuto');
    assert.equal(cx.checked, true);
    cx.checked = false; cx.dispatchEvent(new a.win.Event('change'));
    assert.equal(a.run('S.ajustes.erroAuto'), false);
  } finally { a.close(); }
});
