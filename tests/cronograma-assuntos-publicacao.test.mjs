import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {validarSite} from '../ferramentas/ci/validar_site.mjs';

const taxonomiaOk = [{id:'civil',nome:'Direito Civil',cobertura:'Fixture documental',aliases:['civil'],nucleoComum:true}];
function conteudoFixture(opt={}) {
 const topico={id:'t001',titulo:'Obrigações',texto:'Texto literal da fonte.',pagina:'p. 1',leis:[],juris:[]};
 if(opt.semPagina) delete topico.pagina;
 if(opt.paginaNumerica) topico.pagina=12;
 const canonicais=opt.canonicoDesconhecido?['materia_inexistente']:['civil'];
 return 'window.DPE_CONTEUDOS_EDITAIS='+JSON.stringify({demo:{id:'demo',fonte:'edital-fixture.md',disciplinas:[{id:'civil',nome:'Direito Civil',canonicais,topicos:[topico]}]}})+';';
}
async function site(t,opt={}){
 const dir=await mkdtemp(join(tmpdir(),'assuntos-publicacao-'));t.after(()=>rm(dir,{recursive:true,force:true}));await mkdir(join(dir,'arquivos'));
 const arquivos={
  'metacognicao.js':'const fixture=true;',
  'cronograma.js':'const fixture=window.DPE_CONTEUDOS_EDITAIS; const taxonomy=window.DPE_DISCIPLINAS_CANONICAS;',
  'cronograma-taxonomia.js':'window.DPE_DISCIPLINAS_CANONICAS='+JSON.stringify(opt.taxonomia||taxonomiaOk)+';',
  'cronograma-conteudo.js':conteudoFixture(opt),
  'cronograma-motor.js':'window.DPE_CRONOGRAMA_MOTOR={};',
  'cronograma.css':'.fixture{}'
 };
 let ordem=['cronograma-taxonomia.js','cronograma-conteudo.js','cronograma-motor.js','cronograma.js'];
 if(opt.ordem)ordem=['cronograma-conteudo.js','cronograma-taxonomia.js','cronograma-motor.js','cronograma.js'];
 if(opt.semTag)ordem=ordem.filter(f=>f!=='cronograma-motor.js');
 if(opt.semTaxTag)ordem=ordem.filter(f=>f!=='cronograma-taxonomia.js');
 const refs=['metacognicao.js',...ordem].map(f=>'<script src="arquivos/'+f+'"></script>').join('');
 await writeFile(join(dir,'index.html'),'<html><head><link rel="stylesheet" href="arquivos/cronograma.css"></head><body>'+refs+'</body></html>');
 const core=['./','index.html',...Object.keys(arquivos).filter(f=>!opt.semCache||f!=='cronograma-motor.js').map(f=>'arquivos/'+f)];
 await writeFile(join(dir,'sw.js'),'const CORE='+JSON.stringify(core)+';');
 for(const [f,s] of Object.entries(arquivos)){
  if(opt.semArquivo&&f==='cronograma-conteudo.js')continue;
  if(opt.semTaxArquivo&&f==='cronograma-taxonomia.js')continue;
  await writeFile(join(dir,'arquivos',f),opt.sintaxe&&f==='cronograma-motor.js'?'const = ;':s);
 }
 return dir;
}
test('publicação aceita taxonomia, conteúdo, motor e editor em ordem no cache',async t=>assert.ok(validarSite(await site(t))));
test('publicação rejeita motor fora do cache',async t=>{const dir=await site(t,{semCache:true});assert.throws(()=>validarSite(dir),/CORE offline/);});
test('publicação rejeita conteúdo ausente',async t=>{const dir=await site(t,{semArquivo:true});assert.throws(()=>validarSite(dir),/ausente/);});
test('publicação rejeita taxonomia ausente',async t=>{const dir=await site(t,{semTaxArquivo:true});assert.throws(()=>validarSite(dir),/ausente/);});
test('publicação rejeita motor sem referência',async t=>{const dir=await site(t,{semTag:true});assert.throws(()=>validarSite(dir),/referência única/);});
test('publicação rejeita taxonomia sem referência',async t=>{const dir=await site(t,{semTaxTag:true});assert.throws(()=>validarSite(dir),/referência única/);});
test('publicação rejeita ordem invertida de taxonomia e conteúdo',async t=>{const dir=await site(t,{ordem:true});assert.throws(()=>validarSite(dir),/Ordem obrigatória/);});
test('publicação rejeita sintaxe inválida do motor',async t=>{const dir=await site(t,{sintaxe:true});assert.throws(()=>validarSite(dir),/Sintaxe/);});
test('publicação rejeita rubrica com referência canônica desconhecida',async t=>{const dir=await site(t,{canonicoDesconhecido:true});assert.throws(()=>validarSite(dir),/ID canônico desconhecido/);});
test('publicação rejeita tópico sem localizador documental',async t=>{const dir=await site(t,{semPagina:true});assert.throws(()=>validarSite(dir),/localizador pagina.*são obrigatórios/);});
test('publicação aceita número inteiro positivo como localizador de página',async t=>assert.ok(validarSite(await site(t,{paginaNumerica:true}))));
