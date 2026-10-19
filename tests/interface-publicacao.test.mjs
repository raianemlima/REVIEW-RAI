import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { validarSite } from '../ferramentas/ci/validar_site.mjs';

async function fixture(t, op = {}) {
  const pasta = await mkdtemp(join(tmpdir(), 'review-design-publicacao-'));
  t.after(() => rm(pasta, { recursive: true, force: true }));
  await mkdir(join(pasta, 'arquivos'));
  const core = op.core || ['./', 'index.html', 'arquivos/metacognicao.js', 'arquivos/interface.js', 'arquivos/interface.css'];
  const cssLink = op.cssLink ?? '<link rel="stylesheet" href="arquivos/interface.css">';
  const jsTag = op.jsTag ?? '<script src="arquivos/interface.js"></script>';
  await writeFile(join(pasta, 'sw.js'), `const CORE = ${JSON.stringify(core)}; self.addEventListener('install',()=>{});\n`);
  await writeFile(join(pasta, 'index.html'), `<html><head>${cssLink}</head><body><script type="text/plain" id="app-src">const pronto=true;</script><script src="arquivos/metacognicao.js"></script>${jsTag}</body></html>\n`);
  await writeFile(join(pasta, 'arquivos/metacognicao.js'), 'globalThis.mc=true;\n');
  if (!op.semJs) await writeFile(join(pasta, 'arquivos/interface.js'), op.js ?? 'globalThis.design=true;\n');
  if (!op.semCss) await writeFile(join(pasta, 'arquivos/interface.css'), op.css ?? ':root { --accent: #6653e7; }\n');
  return pasta;
}

test('publicação aceita o design completo e reconhece atributos reais variados', async t => {
  const pasta = await fixture(t, { cssLink: "<link media='all' REL='stylesheet' href='./arquivos/interface.css'>", jsTag: "<script defer data-src='fixture' SRC='./arquivos/interface.js'></script>" });
  assert.equal(validarSite(pasta).core.length, 5);
});

test('publicação falha se o CSS da interface estiver ausente ou vazio', async t => {
  const sem = await fixture(t, { semCss: true });
  assert.throws(() => validarSite(sem), /ausente/);
  const vazio = await fixture(t, { css: '  \n' });
  assert.throws(() => validarSite(vazio), /não pode estar vazio/);
});

test('publicação falha se o JavaScript visual estiver ausente ou inválido', async t => {
  const sem = await fixture(t, { semJs: true });
  assert.throws(() => validarSite(sem), /ausente/);
  const invalido = await fixture(t, { js: 'function quebrado( {' });
  assert.throws(() => validarSite(invalido), /Sintaxe JavaScript inválida.*interface/);
});

test('publicação rejeita referência parcial, duplicada e data-src no lugar de src', async t => {
  for (const jsTag of ['', '<script data-src="arquivos/interface.js"></script>', '<script src="arquivos/interface.js"></script><script src="arquivos/interface.js"></script>']) {
    const pasta = await fixture(t, { jsTag });
    assert.throws(() => validarSite(pasta), /referência única/);
  }
  const semLink = await fixture(t, { cssLink: '' });
  assert.throws(() => validarSite(semLink), /referência única/);
});

test('publicação exige as dependências visuais também no cache offline', async t => {
  const pasta = await fixture(t, { core: ['./', 'index.html', 'arquivos/metacognicao.js', 'arquivos/interface.js'] });
  assert.throws(() => validarSite(pasta), /CORE offline.*interface.css/);
});
