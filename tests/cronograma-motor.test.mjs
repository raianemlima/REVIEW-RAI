import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../arquivos/cronograma-motor.js', import.meta.url), 'utf8');
const fixture = Object.fromEntries(Array.from({length:18},(_,i)=>{
  const id=`d${i+1}`;
  return [id,{id,fonte:'fixture',disciplinas:[{id:'m'+i,nome:`Matéria ${i+1}`,topicos:[0,1,2].map(n=>({id:`t${n}`,titulo:`Tópico ${n}`,leis:[`Lei ${n}`],juris:[]}))}]}];
}));
fixture.d1.disciplinas=Object.values(fixture).flatMap(x=>x.disciplinas);
function setup(){const window={DPE_CONTEUDOS_EDITAIS:fixture};vm.runInNewContext(source,{window});return window.DPE_CRONOGRAMA_MOTOR;}
const plan=(subjects,dias,extra={})=>({editalId:'d1',conteudoId:'d1',subjects,pesos:Object.fromEntries(subjects.map(x=>[x,100/subjects.length])),horasSemana:7,dias,blocoMin:45,...extra});
test('API do motor independe do baralho e inclui todas as disciplinas do edital',()=>{const m=setup();assert.equal(m.obterDisciplinas('d1').length,18);assert.equal(m.obterDisciplinas('d18').length,1);assert.equal(m.chaveTopico('a','b','c'),'a:b:c');});
test('conserva minutos inteiros para vários totais e distribuições de dias',()=>{const m=setup();for(const hours of [0,0.25,1,7,12])for(const dias of [[],[1],[1,3,5],[1,2,3,4,5,6,7]]){const p=plan(['m0'],dias,{horasSemana:hours});const a=m.gerarAgenda(p);assert.equal(a.totalMin,dias.length?Math.round(hours*60):0);assert.equal(a.dias.reduce((s,d)=>s+d.minutos,0),a.totalMin);assert.ok(Number.isInteger(a.totalConteudoMin));assert.ok(Number.isInteger(a.totalRevisaoMin));}});
test('18 disciplinas têm cobertura no ciclo sem repetir a mesma matéria no mesmo dia',()=>{const m=setup(),subjects=Array.from({length:18},(_,i)=>`m${i}`),p=plan(subjects,[1,2,3,4,5,6,7],{horasSemana:4,blocoMin:15});const a=m.gerarAgenda(p);assert.equal(a.totalMin,240);for(const d of a.dias){const ids=d.blocos.filter(b=>b.disciplinaId).map(b=>b.disciplinaId);assert.equal(new Set(ids).size,ids.length);}const seen=new Set(a.naSemana);for(let w=1;w<12&&seen.size<18;w++)m.gerarAgenda(p,w).naSemana.forEach(x=>seen.add(x));assert.equal(seen.size,18);});
test('tópicos distintos por visita até esgotar, depois marca revisita; escolha manual respeitada',()=>{const m=setup(),p=plan(['m0'],[1],{horasSemana:3,blocoMin:30,escolhas:{'w0-d1-b0':'t2'}});const a=m.gerarAgenda(p);assert.equal(a.dias[0].blocos[0].topicoId,'t2');const b=m.gerarAgenda(plan(['m0'],[1],{horasSemana:3,blocoMin:15}),3);assert.ok(b.dias[0].blocos.some(x=>x.tipo==='revisita'));});
test('zero explícito remove tópicos, percentuais zero vão para fora e tópicos não inventam lei/jurisprudência',()=>{const m=setup(),p=plan(['m0','m1'],[1,2],{topicosSelecionados:{m0:[]},pesos:{m0:50,m1:0}});const a=m.gerarAgenda(p);assert.deepEqual(Array.from(a.fora),['m0','m1']);assert.equal(a.totalConteudoMin,0);const mats=m.materiais({titulo:'Direito X',leis:[],juris:[]});assert.deepEqual(Array.from(mats.leis),[]);assert.deepEqual(Array.from(mats.juris),[]);assert.ok(mats.orientacao.some(x=>x.includes('STF/STJ')));});
test('limita blocos para evitar fatia final inferior a 15 minutos quando aplicável',()=>{const m=setup(),a=m.gerarAgenda(plan(['m0'],[1],{horasSemana:34/60,blocoMin:30}));const blocks=a.dias[0].blocos;assert.equal(a.totalMin,34);assert.equal(blocks.length,1);assert.equal(blocks[0].minutos,34);});
test('entradas inválidas não produzem NaN e revisão respeita orçamento diário',()=>{const m=setup(),a=m.gerarAgenda({editalId:'d1',subjects:['m0'],pesos:{m0:100},horasSemana:'x',dias:[1],blocoMin:0,revisaoMin:100});assert.equal(a.totalMin,0);assert.ok(Number.isFinite(a.totalConteudoMin));const b=m.gerarAgenda(plan(['m0'],[1],{horasSemana:1,revisaoMin:100}));assert.equal(b.totalMin,60);assert.equal(b.totalConteudoMin,15);assert.equal(b.totalRevisaoMin,45);});
