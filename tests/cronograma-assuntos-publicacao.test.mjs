import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {validarSite} from '../ferramentas/ci/validar_site.mjs';
async function site(t,opt={}){
 const dir=await mkdtemp(join(tmpdir(),'assuntos-publicacao-'));t.after(()=>rm(dir,{recursive:true,force:true}));await mkdir(join(dir,'arquivos'));
 const arquivos={'metacognicao.js':'const fixture=true;','cronograma.js':'const fixture=window.DPE_CONTEUDOS_EDITAIS;','cronograma-conteudo.js':'window.DPE_CONTEUDOS_EDITAIS={};','cronograma-motor.js':'window.DPE_CRONOGRAMA_MOTOR={};','cronograma.css':'.fixture{}'};
 let ordem=['cronograma-conteudo.js','cronograma-motor.js','cronograma.js'];if(opt.ordem)ordem=['cronograma-motor.js','cronograma-conteudo.js','cronograma.js'];if(opt.semTag)ordem=ordem.filter(f=>f!=='cronograma-motor.js');
 const refs=['metacognicao.js',...ordem].map(f=>'<script src="arquivos/'+f+'"></script>').join('');await writeFile(join(dir,'index.html'),'<html><head><link rel="stylesheet" href="arquivos/cronograma.css"></head><body>'+refs+'</body></html>');
 const core=['./','index.html',...Object.keys(arquivos).filter(f=>!opt.semCache||f!=='cronograma-motor.js').map(f=>'arquivos/'+f)];await writeFile(join(dir,'sw.js'),'const CORE='+JSON.stringify(core)+';');
 for(const [f,s] of Object.entries(arquivos))if(!opt.semArquivo||f!=='cronograma-conteudo.js')await writeFile(join(dir,'arquivos',f),opt.sintaxe&&f==='cronograma-motor.js'?'const = ;':s);return dir;
}
test('publicação aceita conteúdo, motor e editor em ordem no cache',async t=>assert.ok(validarSite(await site(t))));
test('publicação rejeita motor fora do cache',async t=>{const dir=await site(t,{semCache:true});assert.throws(()=>validarSite(dir),/CORE offline/);});
test('publicação rejeita conteúdo ausente',async t=>{const dir=await site(t,{semArquivo:true});assert.throws(()=>validarSite(dir),/ausente/);});
test('publicação rejeita motor sem referência',async t=>{const dir=await site(t,{semTag:true});assert.throws(()=>validarSite(dir),/referência única/);});
test('publicação rejeita ordem invertida de conteúdo e motor',async t=>{const dir=await site(t,{ordem:true});assert.throws(()=>validarSite(dir),/Ordem obrigatória/);});
test('publicação rejeita sintaxe inválida do motor',async t=>{const dir=await site(t,{sintaxe:true});assert.throws(()=>validarSite(dir),/Sintaxe/);});
