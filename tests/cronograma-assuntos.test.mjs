import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=html.match(/<script type="text\/plain" id="app-src">([\s\S]*?)<\/script>/)[1].replace(/\nboot\(\);\s*$/,'\n');
const motorStart=html.indexOf('// Motor de revisão:');
const fsrs=html.slice(motorStart,html.indexOf('</script>',motorStart));
const fontes=['cronograma-pesos.js','cronograma-conteudo.js','cronograma-motor.js','cronograma.js'].map(f=>readFileSync(new URL('../arquivos/'+f,import.meta.url),'utf8'));
function ambiente(){
 const dom=new JSDOM('<!doctype html><html><body><header><button id="goBusca"></button><button id="goAjustes"></button><span id="save"></span><nav id="tabs"></nav></header><main id="main"></main></body></html>',{url:'https://fixture.invalid/',runScripts:'outside-only'});
 dom.window.scrollTo=()=>{};dom.window.fetch=()=>{throw Error('Rede bloqueada');};
 const run=s=>vm.runInContext(s,dom.getInternalVMContext());
 run('const DECK={versao:"fixture",disciplinas:[{id:"dc",nome:"Direito Constitucional",curto:"Constitucional",peso:1}],cartoes:[]};');
 run(fsrs);run(app);run('S.mode="local";S.ajustes.metaOn=false;S.ajustes.onboard=true;S.ajustes.minutos=10;S.ajustes.metaDiaria=10;ensureAj();');fontes.forEach(run);
 run('go("cronograma")');
 const d=dom.window.document;
 const change=(s,v)=>{const e=d.querySelector(s);e.value=v;e.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
 const submit=()=>d.querySelector('#crForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
 return {dom,d,run,change,submit,close:()=>dom.window.close()};
}
test('programas incluem todas as rubricas e tópicos com localizador; Português e conteúdo local não dependem do baralho',()=>{
 const a=ambiente();try{
  const dados=a.run('window.DPE_CONTEUDOS_EDITAIS');assert.equal(Object.keys(dados).length,18);
  let count=0;for(const [id,p] of Object.entries(dados)){
   assert.ok(p.fonte);assert.ok(p.disciplinas.length);assert.equal(new Set(p.disciplinas.map(d=>d.id)).size,p.disciplinas.length);
   for(const d of p.disciplinas){assert.ok(d.nome);assert.ok(d.topicos.length,`${id} ${d.nome}`);assert.equal(new Set(d.topicos.map(t=>t.id)).size,d.topicos.length);for(const t of d.topicos){count++;assert.ok(t.texto&&t.titulo&&t.pagina);assert.ok(Array.isArray(t.leis)&&Array.isArray(t.juris));}}
  }assert.ok(count>5000);assert.ok(dados['rj-2026'].fonteUrl?.includes('fgv.br'));
  a.change('#crEdital','sc-2026');assert.ok([...a.d.querySelectorAll('[data-cr-subject]')].some(f=>f.parentElement.textContent.includes('PORTUGUESA')));assert.equal(a.d.querySelectorAll('[data-cr-subject]').length,dados['sc-2026'].disciplinas.length);
  assert.ok(a.d.querySelectorAll('[data-cr-topico]').length>300);
 }finally{a.close();}
});
test('agenda semanal gira disciplinas e assuntos e conserva horas, sem repetir a lista inteira todo dia',()=>{
 const a=ambiente();try{a.change('#crEdital','sc-2026');a.d.querySelector('#crHoras').value='3';a.d.querySelector('#crHoras').dispatchEvent(new a.dom.window.Event('input',{bubbles:true}));
  const p=a.run('S.cronogramaDraft'),m=a.run('window.DPE_CRONOGRAMA_MOTOR');let vistos=new Set();
  for(let w=0;w<15;w++){const agenda=m.gerarAgenda(p,w);assert.equal(agenda.totalMin,180);agenda.naSemana.forEach(id=>vistos.add(id));for(const d of agenda.dias){assert.ok(d.blocos.filter(b=>b.disciplinaId).length<=2);assert.ok(d.blocos.every(b=>b.minutos>=15));}}
  assert.equal(vistos.size,p.subjects.length);
  const antes=[...a.d.querySelectorAll('[data-cr-bloco]')].map(e=>e.textContent);a.d.querySelector('#crSemanaProxima').click();const depois=[...a.d.querySelectorAll('[data-cr-bloco]')].map(e=>e.textContent);assert.notDeepEqual(antes,depois);assert.match(a.d.querySelector('#crFuturas').textContent,/próximas|Fora/);
 }finally{a.close();}
});
test('escolher assunto resiste à sequência nativa input/change e assunto excluído não é agendado',()=>{
 const a=ambiente();try{a.change('#crEdital','ce-2022');const select=a.d.querySelector('[data-cr-trocar]'),key=select.dataset.crTrocar,newId=select.options[1].value;select.value=newId;select.dispatchEvent(new a.dom.window.Event('input',{bubbles:true}));assert.ok(a.d.contains(select));select.dispatchEvent(new a.dom.window.Event('change',{bubbles:true}));assert.equal(a.run('S.cronogramaDraft.escolhas['+JSON.stringify(key)+']'),newId);
  const t=a.d.querySelector('[data-cr-topico]'),disc=t.dataset.crDisc,topic=t.dataset.crTopico;t.checked=false;t.dispatchEvent(new a.dom.window.Event('change',{bubbles:true}));const p=a.run('S.cronogramaDraft'),agenda=a.run('window.DPE_CRONOGRAMA_MOTOR').gerarAgenda(p);assert.ok(!agenda.dias.flatMap(d=>d.blocos).some(b=>b.disciplinaId===disc&&b.topicoId===topic));
 }finally{a.close();}
});
test('salvar conteúdos preserva meta de cartões; revisão optativa consome o próprio orçamento',()=>{
 const a=ambiente();try{a.change('#crEdital','ce-2022');a.submit();assert.equal(a.run('S.ajustes.cronograma.v'),2);assert.equal(a.run('S.ajustes.minutos'),10);assert.equal(a.run('S.ajustes.metaDiaria'),10);assert.equal(a.run('snapshot().ajustes.cronograma.conteudoId'),'ce-2022');
  a.run('delete S.cronogramaDraft;go("cronograma")');a.change('#crRevisao','20');a.submit();assert.equal(a.run('S.ajustes.minutos'),20);assert.equal(a.run('S.ajustes.metaDiaria'),5);const ag=a.run('window.DPE_CRONOGRAMA_MOTOR.gerarAgenda(S.ajustes.cronograma)');assert.equal(ag.totalRevisaoMin,100);assert.equal(ag.totalMin,300);assert.equal(ag.totalConteudoMin,200);
 }finally{a.close();}
});
test('Hoje registra assuntos sem alterar cards/FSRS e mantém desmarcação no merge por relógio',()=>{
 const a=ambiente();try{a.change('#crEdital','ce-2022');a.submit();a.run('S.ajustes.cronograma.dias=[1,2,3,4,5,6,7];renderHoje();');
  const checkbox=a.d.querySelector('[data-cr-concluir]');assert.ok(checkbox);const key=checkbox.dataset.crConcluir;checkbox.checked=true;checkbox.dispatchEvent(new a.dom.window.Event('change',{bubbles:true}));assert.equal(a.run('S.ajustes.cronogramaProgresso['+JSON.stringify(key)+'].concluido'),true);assert.equal(a.run('Object.keys(S.cards).length'),0);assert.equal(a.run('snapshot().ajustes.cronogramaProgresso['+JSON.stringify(key)+'].concluido'),true);
  const merged=a.run('mesclar({ajustes:{cronogramaProgresso:{a:{concluido:true,em:1},b:{concluido:true,em:2}}}},{ajustes:{cronogramaProgresso:{a:{concluido:false,em:3},c:{concluido:true,em:4}}}})');assert.equal(merged.ajustes.cronogramaProgresso.a.concluido,false);assert.equal(Object.keys(merged.ajustes.cronogramaProgresso).length,3);
 }finally{a.close();}
});
test('abrir plano antigo não modifica o salvo nem migra seus percentuais automaticamente',()=>{
 const a=ambiente();try{a.run('S.ajustes.cronograma={v:1,ativo:true,editalId:"ce-2022",subjects:["direito_constitucional","direito_processual_civil"],pesos:{direito_constitucional:60,direito_processual_civil:40},horasSemana:5,dias:[1,2,3,4,5],blocoMin:40};');const antes=a.run('JSON.stringify(S.ajustes.cronograma)');a.run('delete S.cronogramaDraft;go("cronograma");');assert.equal(a.run('JSON.stringify(S.ajustes.cronograma)'),antes);assert.equal(Number(a.d.querySelector('[data-cr-peso="direito_constitucional"]').value.replace(',','.')),60);
 }finally{a.close();}
});
test('Português consulta material ortográfico, e lei/jurisprudência só aparecem quando fornecidas pelo tópico',()=>{
 const a=ambiente();try{const m=a.run('window.DPE_CRONOGRAMA_MOTOR');const p=m.materiais({titulo:'Ortografia',leis:[],juris:[]},'LÍNGUA PORTUGUESA');assert.equal(p.tipo,'idioma');assert.ok(p.consulta.volp.includes('academia.org.br'));assert.equal(p.consulta.stf,undefined);const j=m.materiais({titulo:'Defesa',leis:['CF art. 5º'],juris:['Súmula Vinculante 14']});assert.deepEqual(Array.from(j.leis),['CF art. 5º']);assert.deepEqual(Array.from(j.juris),['Súmula Vinculante 14']);const vazio=m.materiais({titulo:'Direito X',leis:[],juris:[]});assert.equal(vazio.juris.length,0);
 }finally{a.close();}
});

test('escolha manual consome a fila e não reaparece automaticamente antes dos outros tópicos',()=>{
 const a=ambiente();try{a.run('window.DPE_CONTEUDOS_EDITAIS.fixture={disciplinas:[{id:"d",nome:"Disciplina",topicos:[{id:"a",titulo:"A"},{id:"b",titulo:"B"},{id:"c",titulo:"C"}]}]};');const m=a.run('window.DPE_CRONOGRAMA_MOTOR'),p={conteudoId:'fixture',subjects:['d'],pesos:{d:100},dias:[1,2,3,4],horasSemana:2,blocoMin:30,escolhas:{'w0-d1-b0':'c'}};
  const agenda=m.gerarAgenda(p,0),sequencia=agenda.dias.flatMap(d=>d.blocos).map(b=>b.topicoId);assert.deepEqual(Array.from(sequencia),['c','a','b','a']);const seguinte=m.gerarAgenda({...p,dias:[1]},1);assert.equal(seguinte.dias[0].blocos[0].topicoId,'b');
 }finally{a.close();}
});
test('plano legado pausado conserva percentuais explícitos ao reabrir e ao salvar a versão por assuntos',()=>{
 const a=ambiente();try{a.run('S.ajustes.cronograma={v:1,ativo:false,editalId:"ce-2022",subjects:["direito_constitucional","direito_processual_civil"],pesos:{direito_constitucional:60,direito_processual_civil:40},horasSemana:5,dias:[1,2,3,4,5],blocoMin:40};delete S.cronogramaDraft;go("cronograma");');assert.equal(Number(a.d.querySelector('[data-cr-peso="direito_constitucional"]').value.replace(',','.')),60);a.submit();assert.equal(a.run('S.ajustes.cronograma.pesos.direito_constitucional'),60);assert.equal(a.run('S.ajustes.cronograma.pesos.direito_processual_civil'),40);
 }finally{a.close();}
});

test('revisão que não cabe no orçamento não salva nem zera os minutos de cartões',()=>{
 const a=ambiente();try{a.change('#crEdital','ce-2022');a.d.querySelector('#crHoras').value='1';a.d.querySelectorAll('[data-cr-dia]').forEach(f=>f.checked=Number(f.dataset.crDia)<=4);a.d.querySelector('#crRevisao').value='5';a.submit();assert.match(a.d.querySelector('#crMsg').textContent,/não cabe/);assert.equal(a.run('S.ajustes.minutos'),10);assert.equal(a.run('S.ajustes.cronograma?.ativo'),undefined);
 }finally{a.close();}
});
