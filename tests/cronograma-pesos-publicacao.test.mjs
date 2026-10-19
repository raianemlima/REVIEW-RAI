import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { validarSite } from '../ferramentas/ci/validar_site.mjs';

async function site(t, options={}) {
  const dir=await mkdtemp(join(tmpdir(),'pesos-publicacao-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  await mkdir(join(dir,'arquivos'));
  const perfil='<script src="arquivos/cronograma-pesos.js"></script>';
  const modulo='<script src="arquivos/cronograma.js"></script>';
  const refs=options.ordemErrada ? modulo+perfil : perfil+modulo;
  await writeFile(join(dir,'index.html'),'<html><head><link rel="stylesheet" href="arquivos/cronograma.css"></head><body><script id="app-src">const fixture=true;</script><script src="arquivos/metacognicao.js"></script>'+refs+'</body></html>');
  const core=['./','index.html','arquivos/metacognicao.js','arquivos/cronograma.js','arquivos/cronograma.css'];
  if(!options.semCache) core.push('arquivos/cronograma-pesos.js');
  await writeFile(join(dir,'sw.js'),'const CORE='+JSON.stringify(core)+';');
  await writeFile(join(dir,'arquivos/metacognicao.js'),'const fixtureMeta=true;');
  await writeFile(join(dir,'arquivos/cronograma.js'),'const fixturePesos=window.DPE_PESOS_EDITAIS;');
  await writeFile(join(dir,'arquivos/cronograma.css'),'.fixture{}');
  if(!options.semArquivo) await writeFile(join(dir,'arquivos/cronograma-pesos.js'),options.sintaxeErrada?'const = ;':'window.DPE_PESOS_EDITAIS={};');
  return dir;
}
test('publicação aceita catálogo antes do editor e ambos no cache',async t=>assert.ok(validarSite(await site(t))));
test('publicação rejeita catálogo depois do editor',async t=>{
  const dir=await site(t,{ordemErrada:true});
  assert.throws(()=>validarSite(dir),/antes de cronograma\.js/);
});
test('publicação rejeita catálogo fora do cache',async t=>{
  const dir=await site(t,{semCache:true});
  assert.throws(()=>validarSite(dir),/CORE offline/);
});
test('publicação rejeita catálogo inexistente',async t=>{
  const dir=await site(t,{semArquivo:true});
  assert.throws(()=>validarSite(dir),/cronograma-pesos/);
});
test('publicação rejeita catálogo com JavaScript inválido',async t=>{
  const dir=await site(t,{sintaxeErrada:true});
  assert.throws(()=>validarSite(dir),/sintaxe|Syntax|JavaScript/i);
});
