import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { validarSite } from "../ferramentas/ci/validar_site.mjs";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const injetor = join(raiz, "ferramentas/ci/injetar_arquivos.mjs");
const validador = join(raiz, "ferramentas/ci/validar_site.mjs");

function ambienteSemSegredos() {
  const env = { ...process.env };
  delete env.APP_SENHA;
  delete env.CHAVE_ARQUIVOS;
  return env;
}

function executar(script, argumentos) {
  return spawnSync(process.execPath, [script, ...argumentos], {
    cwd: raiz,
    env: ambienteSemSegredos(),
    encoding: "utf8",
  });
}

async function criarSite(opções = {}) {
  const pasta = await mkdtemp(join(tmpdir(), "review-publicacao-"));
  await mkdir(join(pasta, "arquivos"), { recursive: true });
  const core = opções.core || ["./", "index.html", "arquivos/metacognicao.js"];
  const index = opções.index || [
    "<!doctype html><html><body>",
    '<script type="text/plain" id="app-src">const appPronto = true;</script>',
    '<script src="arquivos/metacognicao.js"></script>',
    "</body></html>",
  ].join("\n");
  await writeFile(join(pasta, "sw.js"), opções.sw || `const CORE = ${JSON.stringify(core)}; self.addEventListener("install", () => {});\n`);
  await writeFile(join(pasta, "index.html"), index);
  if (opções.modulo !== null) {
    await writeFile(join(pasta, "arquivos/metacognicao.js"), opções.modulo || "globalThis.metacognicaoPronta = true;\n");
  }
  return pasta;
}

async function apagar(pasta) {
  await rm(pasta, { recursive: true, force: true });
}

test("injetor falha sem módulo e não modifica o HTML", async t => {
  const pasta = await criarSite({ modulo: null });
  t.after(() => apagar(pasta));
  const htmlPath = join(pasta, "index.html");
  const antes = await readFile(htmlPath, "utf8");
  const resultado = executar(injetor, [htmlPath]);
  assert.notEqual(resultado.status, 0);
  assert.match(resultado.stderr, /Módulo obrigatório/);
  assert.equal(await readFile(htmlPath, "utf8"), antes);
});

test("injetor é idempotente em duas execuções sem segredos", async t => {
  const pasta = await criarSite({
    index: '<!doctype html><html><body><script type="text/plain" id="app-src">const appPronto = true;</script></body></html>',
  });
  t.after(() => apagar(pasta));
  const htmlPath = join(pasta, "index.html");
  const primeira = executar(injetor, [htmlPath]);
  assert.equal(primeira.status, 0, primeira.stderr);
  const depoisDaPrimeira = await readFile(htmlPath, "utf8");
  assert.equal((depoisDaPrimeira.match(/metacognicao\.js/g) || []).length, 1);
  const segunda = executar(injetor, [htmlPath]);
  assert.equal(segunda.status, 0, segunda.stderr);
  assert.equal(await readFile(htmlPath, "utf8"), depoisDaPrimeira);
});

test("injetor reconhece script existente com aspas simples e atributos variados", async t => {
  const pasta = await criarSite({
    index: '<html><body><script defer data-origem="fixture" SRC = \'arquivos/metacognicao.js\'></script></body></html>',
  });
  t.after(() => apagar(pasta));
  const htmlPath = join(pasta, "index.html");
  const antes = await readFile(htmlPath, "utf8");
  const resultado = executar(injetor, [htmlPath]);
  assert.equal(resultado.status, 0, resultado.stderr);
  assert.equal(await readFile(htmlPath, "utf8"), antes);
});

test("injetor não aceita diretório no lugar do módulo", async t => {
  const pasta = await criarSite({ modulo: null });
  await mkdir(join(pasta, "arquivos/metacognicao.js"));
  t.after(() => apagar(pasta));
  const htmlPath = join(pasta, "index.html");
  const antes = await readFile(htmlPath, "utf8");
  const resultado = executar(injetor, [htmlPath]);
  assert.notEqual(resultado.status, 0);
  assert.equal(await readFile(htmlPath, "utf8"), antes);
});

test("validador aceita uma pasta completa e retorna o CORE", async t => {
  const pasta = await criarSite();
  t.after(() => apagar(pasta));
  const resultado = validarSite(pasta);
  assert.deepEqual(resultado.core, ["./", "index.html", "arquivos/metacognicao.js"]);
  assert.deepEqual(resultado.avisos, []);
});

test("validador rejeita arquivo obrigatório ausente no CORE", async t => {
  const pasta = await criarSite({ core: ["./", "index.html", "arquivos/metacognicao.js", "offline.js"] });
  t.after(() => apagar(pasta));
  assert.throws(() => validarSite(pasta), /arquivo obrigatório do CORE .* ausente/);
});

test("CLI do validador retorna código não zero quando CORE está incompleto", async t => {
  const pasta = await criarSite({ core: ["./", "index.html", "arquivos/metacognicao.js", "ausente.bin"] });
  t.after(() => apagar(pasta));
  const resultado = executar(validador, [pasta]);
  assert.notEqual(resultado.status, 0);
  assert.match(resultado.stderr, /ausente|obrigatório/i);
});

test("CLI do validador aprova o caminho bom", async t => {
  const pasta = await criarSite();
  t.after(() => apagar(pasta));
  const resultado = executar(validador, [pasta]);
  assert.equal(resultado.status, 0, resultado.stderr);
  assert.match(resultado.stdout, /site válido/);
});

test("validador rejeita módulo JavaScript inválido", async t => {
  const pasta = await criarSite({ modulo: "const = inválido;\n" });
  t.after(() => apagar(pasta));
  assert.throws(() => validarSite(pasta), /Sintaxe JavaScript inválida.*módulo/);
});

test("validador rejeita service worker inválido ou sem CORE", async t => {
  const pastaInvalido = await criarSite({ sw: "const CORE = [;" });
  t.after(() => apagar(pastaInvalido));
  assert.throws(() => validarSite(pastaInvalido), /service worker/i);

  const pastaSemCore = await criarSite({ sw: 'self.addEventListener("install", () => {});' });
  t.after(() => apagar(pastaSemCore));
  assert.throws(() => validarSite(pastaSemCore), /não declara um CORE válido/);
});
