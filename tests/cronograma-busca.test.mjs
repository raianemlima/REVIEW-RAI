import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app-src.txt',import.meta.url),'utf8').replace(/\nboot\(\);\s*$/,'\n');
const motorStart=html.indexOf('// Motor de revisão:');
const fsrs=html.slice(motorStart,html.indexOf('</script>',motorStart));
const fontes=['cronograma-pesos.js','cronograma-taxonomia.js','cronograma-conteudo.js','cronograma-motor.js','cronograma.js'].map(f=>readFileSync(new URL('../arquivos/'+f,import.meta.url),'utf8'));
function motorIsolado(){const ctx={};vm.createContext(ctx);vm.runInContext(fontes[3],ctx);return ctx.DPE_CRONOGRAMA_MOTOR;}
const fixture={
 cartoes:[
  {id:'c1',disc:'dp',tema:'Tráfico de drogas',tipo:'conceito',frente:'O que caracteriza o tráfico privilegiado?',verso:'Primariedade, bons antecedentes...',origem:'Lei 11.343/2006'},
  {id:'c2',disc:'dp',tema:'Tráfico de drogas',tipo:'lei_seca',frente:'Art. 33 da Lei 11.343/06: núcleos do tipo',verso:'Importar, exportar...',origem:'Lei 11.343/2006'},
  {id:'c3',disc:'dp',tema:'Tráfico de drogas',tipo:'jurisprudencia',frente:'Tráfico privilegiado é hediondo?',verso:'Não (STF).',origem:'STF'},
  {id:'c4',disc:'dp',tema:'Tráfico de drogas',tipo:'multipla_escolha',frente:'Sobre o tráfico de drogas, assinale...',verso:'B',origem:'Prova'},
  {id:'c5',disc:'dc',tema:'Controle de constitucionalidade',tipo:'conceito',frente:'O que é ADI?',verso:'Ação direta...',origem:'CF'},
  {id:'c6',disc:'dc',tema:'Drogas e saúde',tipo:'conceito',frente:'Drogas lícitas na saúde pública',verso:'...',origem:''}],
 leiseca:[{id:'drogas',nome:'Lei de Drogas (Lei 11.343/2006)',curto:'Drogas',grupos:[{itens:[{a:'28',r:'Art. 28',x:'Quem adquirir, guardar... drogas para consumo pessoal'},{a:'33',r:'Art. 33',x:'Importar, exportar, remeter drogas... tráfico. § 4º tráfico privilegiado'}]}]},{id:'cf',nome:'Constituição Federal',curto:'CF',grupos:[{itens:[{a:'102',r:'Art. 102',x:'Compete ao STF processar ação direta de inconstitucionalidade'}]}]}],
 teses:[{tribunal:'STF',tipo:'Súmula Vinculante',num:'63',ramo:'Penal',texto:'O tráfico privilegiado (art. 33, § 4º, da Lei nº 11.343/2006) não configura crime hediondo.'},{tribunal:'STJ',tipo:'Repetitivo',num:'1139',ramo:'Civil',texto:'Contratos bancários e juros remuneratórios.'}],
 sumulas:[{tipo:'Súmula 512',tribunal:'STJ',ramo:'Penal',enunciado:'A aplicação da causa de diminuição do tráfico privilegiado não afasta a hediondez (cancelada).'}],
 provas:[{id:'p1',nome:'Prova X',questoes:[{n:1,materia:'Direito Penal',assunto:'Tráfico de drogas privilegiado',enunciado:'Sobre o tráfico de drogas...',alternativas:{A:'a',B:'b'},gabarito:'A'},{n:2,materia:'Direito Civil',assunto:'Contratos',enunciado:'Sobre contratos...',alternativas:{A:'a'},gabarito:'A'}]}]
};
test('motor liga assunto, lei, súmula/jurisprudência e questões do próprio app, respeitando a disciplina',()=>{
 const m=motorIsolado();
 const r=m.relacionarConteudo(fixture,{titulo:'5 Tráfico de drogas e tráfico privilegiado.',texto:'Lei nº 11.343/2006.',leis:['Lei nº 11.343/2006'],juris:[],discIds:['dp'],discNomes:['Direito Penal']});
 assert.deepEqual(Array.from(r.tema.itens.map(x=>x.item.id)),['c1']);
 assert.ok(r.lei.itens.some(x=>x.item.id==='c2'));
 const lei=r.lei.itens.find(x=>x.fonte==='leiseca');assert.equal(lei.item.id,'drogas');assert.ok(lei.artigos.some(a=>a.a==='33'));
 assert.ok(!r.lei.itens.some(x=>x.item.id==='cf'),'CF não citada nem relacionada');
 const jur=r.juris.itens.map(x=>x.fonte+':'+(x.item.id||x.item.num||x.item.tipo));
 assert.ok(jur.includes('cartao:c3')&&jur.includes('tese:63')&&jur.includes('sumula:Súmula 512'));
 assert.ok(!jur.includes('tese:1139'));
 const qs=r.questoes.itens.map(x=>x.fonte==='prova'?x.prova.id+':'+x.item.n:x.item.id);
 assert.ok(qs.includes('p1:1')&&qs.includes('c4')&&!qs.includes('p1:2'));
 assert.ok(!r.tema.itens.some(x=>x.item.id==='c6'),'outra disciplina com uma palavra em comum não entra');
 const vazio=m.relacionarConteudo(fixture,{titulo:'Usucapião extrajudicial',texto:'',leis:[],juris:[],discIds:['dciv'],discNomes:['Direito Civil']});
 assert.equal(vazio.total,0);
 const ref=m.relacionarConteudo(fixture,{titulo:'Crimes hediondos',texto:'',leis:[],juris:['Súmula Vinculante 63'],discIds:['dp'],discNomes:['Direito Penal']});
 assert.ok(ref.juris.itens.some(x=>x.fonte==='tese'&&x.item.num==='63'));
});
function ambiente(){
 const dom=new JSDOM('<!doctype html><html><body><header><button id="goBusca"></button><button id="goAjustes"></button><span id="save"></span><nav id="tabs"></nav></header><main id="main"></main></body></html>',{url:'https://fixture.invalid/',runScripts:'outside-only'});
 dom.window.scrollTo=()=>{};dom.window.fetch=()=>{throw Error('Rede bloqueada');};
 const run=s=>vm.runInContext(s,dom.getInternalVMContext());
 run('const DECK={versao:"fixture",disciplinas:[{id:"dc",nome:"Direito Constitucional",curto:"Constitucional",peso:1}],cartoes:[],leiseca:[]};');
 run(fsrs);run(app);run('S.mode="local";S.ajustes.metaOn=false;S.ajustes.onboard=true;S.ajustes.minutos=10;S.ajustes.metaDiaria=10;ensureAj();');fontes.forEach(run);
 run('go("cronograma")');
 const d=dom.window.document;
 const change=(s,v)=>{const e=d.querySelector(s);e.value=v;e.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
 const submit=()=>d.querySelector('#crForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
 return {dom,d,run,change,submit,close:()=>dom.window.close()};
}
test('Hoje mostra a ligação de cada assunto do dia e os atalhos abrem o conteúdo certo sem alterar o FSRS',()=>{
 const a=ambiente();try{
  a.change('#crEdital','ce-2022');a.submit();a.run('S.ajustes.cronograma.dias=[1,2,3,4,5,6,7];');
  const b=a.run('(()=>{const p=S.ajustes.cronograma,ag=window.DPE_CRONOGRAMA_MOTOR.gerarAgenda(p,0);const d=ag.dias[(dayToDate(today()).getDay()||7)-1];for(const b of d.blocos)if(b.disciplinaId)return b;})()');
  assert.ok(b,'há bloco de assunto');
  const titulo=b.objeto.titulo.replace(/^\s*\d+(?:\.\d+)*\s*/,'');
  a.run(`DECK.disciplinas.push({id:${JSON.stringify(b.disciplinaId)},nome:${JSON.stringify(b.nome)},curto:"X",peso:1});DECK.cartoes.push({id:"fx-1",disc:${JSON.stringify(b.disciplinaId)},ord:1,tema:${JSON.stringify(titulo)},tipo:"conceito",frente:${JSON.stringify('Pergunta sobre '+titulo)},verso:"Resposta",porque:"",origem:"Fixture",peso:3,inc:3});byId["fx-1"]=DECK.cartoes[DECK.cartoes.length-1];`);
  const antes=a.run('JSON.stringify(S.cards)');
  a.run('renderHoje()');
  const resumo=a.d.querySelector('#cronogramaHoje [data-cr-app-resumo]');assert.ok(resumo,'resumo da ligação no bloco do dia');
  const botoes=[...a.d.querySelectorAll('#cronogramaHoje [data-cr-ir]')];
  const btn=botoes.find(x=>x.dataset.crIr.includes('"fx-1"'));
  if(btn){btn.click();assert.equal(a.run('S.tab'),'biblioteca');assert.equal(a.run('S.libQuery'),'fx-1');assert.match(a.d.querySelector('#main').textContent,/Pergunta sobre/);}
  else assert.fail('cartão do assunto deveria aparecer como atalho: '+resumo.textContent);
  assert.equal(a.run('JSON.stringify(S.cards)'),antes,'navegar não cria estado FSRS');
  a.run('renderHoje()');
  const q=[...a.d.querySelectorAll('#cronogramaHoje [data-cr-ir]')].find(x=>JSON.parse(x.dataset.crIr).v==='busca');
  if(q){q.click();assert.equal(a.run('S.tab'),'busca');assert.ok(a.run('S.buscaQ').length>0);}
 }finally{a.close();}
});
test('com o conteúdo real de teses e provas, a ligação semanal é rápida e não quebra a prévia',()=>{
 const a=ambiente();try{
  a.change('#crEdital','sc-2026');
  const t0=Date.now();for(let w=0;w<4;w++){a.d.querySelector('#crSemanaProxima').click();}const dt=Date.now()-t0;
  assert.ok(a.d.querySelectorAll('#crSemana [data-cr-app-resumo]').length>0);
  assert.ok(dt<4000,'quatro semanas em '+dt+'ms');
  const ir=[...a.d.querySelectorAll('#crSemana [data-cr-ir]')].map(x=>JSON.parse(x.dataset.crIr));
  assert.ok(ir.every(o=>['lib','lei','tese','sum','prova','busca'].includes(o.v)));
  const prova=ir.find(o=>o.v==='prova');
  if(prova){a.run(`(${'()=>{}'})`);const el=[...a.d.querySelectorAll('#crSemana [data-cr-ir]')].find(x=>JSON.parse(x.dataset.crIr).v==='prova');el.click();assert.equal(a.run('S.tab'),'prova');assert.equal(a.run('S.pvId'),prova.id);}
 }finally{a.close();}
});
test('lei citada no edital sempre aparece, mesmo quando o assunto cita muitas leis (até 12)',()=>{
 const src=readFileSync(new URL('../arquivos/cronograma-motor.js',import.meta.url),'utf8'),window={};vm.runInNewContext(src,{window});const m=window.DPE_CRONOGRAMA_MOTOR;
 const nums=['12850','9807','13431','14344','9613','8072','9455','13869','9296','7716'];
 const leiseca=nums.map(n=>({id:'l'+n,nome:`Lei nº ${n.slice(0,-3)}.${n.slice(-3)}/2000 · Lei ${n}`,curto:'Lei '+n,grupos:[{itens:[{a:'1',x:'Art. 1º Texto.'}]}]}));
 const r=m.relacionarConteudo({cartoes:[],leiseca},{titulo:'Legislação penal especial.',texto:'',leis:nums.map(n=>`Lei nº ${n.slice(0,-3)}.${n.slice(-3)}/2000`),juris:[],discIds:[],discNomes:[]},4);
 assert.equal(r.lei.total,10);assert.equal(r.lei.itens.length,10,'as 10 leis citadas aparecem, não só as 4 primeiras');
 assert.ok(r.lei.itens.every(x=>x.motivo==='lei citada no edital'));
});
