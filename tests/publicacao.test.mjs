import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { webcrypto as crypto } from "node:crypto";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { validarSite } from "../ferramentas/ci/validar_site.mjs";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const build = join(raiz, "build.mjs");
const injetor = join(raiz, "ferramentas/ci/injetar_arquivos.mjs");
const aplicarRevisoes = join(raiz, "ferramentas/ci/aplicar_revisoes.mjs");
const validador = join(raiz, "ferramentas/ci/validar_site.mjs");

function ambienteSemSegredos() {
  const env = { ...process.env };
  delete env.APP_SENHA;
  delete env.CHAVE_ARQUIVOS;
  delete env.REVISOES_CHAVE;
  delete env.SENHA;
  return env;
}

function executar(script, argumentos, extras = {}, cwd = raiz) {
  return spawnSync(process.execPath, [script, ...argumentos], {
    cwd,
    env: { ...ambienteSemSegredos(), ...extras },
    encoding: "utf8",
  });
}

async function escreverDeck(pasta, senha, deck) {
  const sal = new Uint8Array(16).fill(7), iv = new Uint8Array(12).fill(9);
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveKey"]);
  const chave = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: sal, iterations: 100000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, chave, gzipSync(Buffer.from(JSON.stringify(deck), "utf8")));
  const base64 = bytes => Buffer.from(bytes).toString("base64");
  const payload = { v: 2, z: "gzip", it: 100000, s: base64(sal), iv: base64(iv), ct: base64(ct) };
  await writeFile(join(pasta, "deck.enc"), JSON.stringify(payload));
  return payload;
}

async function lerDeck(pasta, senha) {
  const payload = JSON.parse(await readFile(join(pasta, "deck.enc"), "utf8"));
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveKey"]);
  const chave = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: Buffer.from(payload.s, "base64"), iterations: payload.it, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const texto = await crypto.subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(payload.iv, "base64") }, chave, Buffer.from(payload.ct, "base64"));
  return JSON.parse(gunzipSync(Buffer.from(texto)).toString("utf8"));
}

async function criarSite(opções = {}) {
  const pasta = await mkdtemp(join(tmpdir(), "review-publicacao-"));
  await mkdir(join(pasta, "arquivos"), { recursive: true });
  await writeFile(join(pasta, "deck.enc"), JSON.stringify({ v: 2, z: "gzip", it: 100000, s: "AAAAAAAAAAAAAAAAAAAAAA==", iv: "AAAAAAAAAAAAAAAA", ct: "AAAAAAAAAAAAAAAAAAAAAA==" }));
  const core = opções.core || ["./", "index.html", "deck.enc", "arquivos/metacognicao.js"];
  const index = opções.index || [
    "<!doctype html><html><body>",
    '<script type="text/plain" id="app-src">const appPronto = true;</script>',
    '<script data-lazy-src="arquivos/metacognicao.js"></script>',
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

test("build separa deck e app-source e converte os oito módulos para lazy", async t => {
  const pasta = await mkdtemp(join(tmpdir(), "review-build-"));
  t.after(() => apagar(pasta));
  const source = join(pasta, "fonte.html"), output = join(pasta, "index.html");
  const deck = { versao: "fixture", cartoes: [], disciplinas: [] }, app = "globalThis.fixtureApp = true;\n";
  const modulos = ["arquivos/metacognicao.js", "arquivos/cronograma-pesos.js", "arquivos/cronograma-taxonomia.js", "arquivos/cronograma-conteudo.js", "arquivos/cronograma-motor.js", "arquivos/cronograma.js", "arquivos/interface.js", "arquivos/dashboard-editais.js"];
  const html = [
    '<!doctype html><html><head><meta charset="utf-8"></head><body>',
    `<script>\nconst DECK = ${JSON.stringify(deck)};\n</script>`,
    `<script>${app}</script>`,
    ...modulos.map(path => `<script src="${path}"></script>`),
    "</body></html>",
  ].join("\n");
  await writeFile(source, html);
  const senha = "fixture-build-password";
  const resultado = executar(build, [source, output], { SENHA: senha });
  assert.equal(resultado.status, 0, resultado.stderr);
  const publicado = await readFile(output, "utf8");
  assert.match(publicado, /id="app-src" data-src="app-src\.txt"/);
  assert.equal((publicado.match(/data-lazy-src=/g) || []).length, modulos.length);
  assert.doesNotMatch(publicado, /id="deck-enc"/);
  assert.equal(await readFile(join(pasta, "app-src.txt"), "utf8"), app);
  assert.deepEqual(await lerDeck(pasta, senha), deck);
});

test("gate e service worker compartilham a mesma versão de cache offline", async () => {
  const [gate, sw] = await Promise.all([
    readFile(join(raiz, "gate.js"), "utf8"),
    readFile(join(raiz, "sw.js"), "utf8"),
  ]);
  const appCache = gate.match(/APP_CACHE\s*=\s*["']([^"']+)["']/)?.[1];
  const workerCache = sw.match(/\bCACHE\s*=\s*["']([^"']+)["']/)?.[1];
  assert.ok(appCache, "APP_CACHE ausente no gate");
  assert.ok(workerCache, "CACHE ausente no service worker");
  assert.equal(appCache, workerCache);
  assert.match(sw, /["']app-src\.txt["']/);
});

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

test("injetor atualiza o baralho externo sem alterar o HTML", async t => {
  const pasta = await criarSite();
  t.after(() => apagar(pasta));
  const senha = "fixture-app-password";
  const encAntes = await escreverDeck(pasta, senha, { cartoes: [], arquivos: [] });
  const htmlPath = join(pasta, "index.html"), htmlAntes = await readFile(htmlPath, "utf8");
  const lista = [{ id: "doc-1", k: "chave", iv: "vetor", arquivo: "pdfs/doc.pdf" }];
  const resultado = executar(injetor, [htmlPath], { APP_SENHA: senha, CHAVE_ARQUIVOS: JSON.stringify(lista) });
  assert.equal(resultado.status, 0, resultado.stderr);
  assert.equal(await readFile(htmlPath, "utf8"), htmlAntes);
  const encDepois = JSON.parse(await readFile(join(pasta, "deck.enc"), "utf8"));
  assert.equal(encDepois.s, encAntes.s);
  assert.equal(encDepois.it, encAntes.it);
  assert.deepEqual(await lerDeck(pasta, senha), { cartoes: [], arquivos: lista });
});

test("aplicador de revisões atualiza deck.enc e mantém index.html intacto", async t => {
  const pasta = await mkdtemp(join(tmpdir(), "review-revisoes-"));
  t.after(() => apagar(pasta));
  await mkdir(join(pasta, "revisoes"));
  const senha = "fixture-app-password";
  const cartoes = [{ id: "c-1", frente: "antiga", verso: "verso antigo", porque: "motivo antigo" }];
  await escreverDeck(pasta, senha, { cartoes, arquivos: [] });
  const htmlPath = join(pasta, "index.html"), html = "<!doctype html><html><body>fixture</body></html>";
  await writeFile(htmlPath, html);
  const chave = crypto.getRandomValues(new Uint8Array(32)), iv = crypto.getRandomValues(new Uint8Array(12));
  const aes = await crypto.subtle.importKey("raw", chave, "AES-GCM", false, ["encrypt"]);
  const revisoes = { "c-1": { frente: "nova", verso: "novo verso", porque: "novo motivo" } };
  const cifra = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, gzipSync(Buffer.from(JSON.stringify(revisoes), "utf8")));
  await writeFile(join(pasta, "revisoes", "fixture.bin"), Buffer.concat([Buffer.from(iv), Buffer.from(cifra)]));
  const resultado = executar(aplicarRevisoes, [htmlPath], { APP_SENHA: senha, REVISOES_CHAVE: Buffer.from(chave).toString("base64") }, pasta);
  assert.equal(resultado.status, 0, resultado.stderr);
  assert.equal(await readFile(htmlPath, "utf8"), html);
  assert.deepEqual(await lerDeck(pasta, senha), { cartoes: [{ id: "c-1", frente: "nova", verso: "novo verso", porque: "novo motivo" }], arquivos: [] });
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
  assert.deepEqual(resultado.core, ["./", "index.html", "deck.enc", "arquivos/metacognicao.js"]);
  assert.deepEqual(resultado.avisos, []);
});

test("validador exige app-src.txt externo no CORE e verifica sua sintaxe", async t => {
  const core = ["./", "index.html", "deck.enc", "app-src.txt", "arquivos/metacognicao.js"];
  const index = '<html><body><script type="text/plain" id="app-src" data-src="app-src.txt"></script><script data-lazy-src="arquivos/metacognicao.js"></script></body></html>';
  const pasta = await criarSite({ core, index });
  t.after(() => apagar(pasta));
  await writeFile(join(pasta, "app-src.txt"), "const appPronto = true;\n");
  assert.deepEqual(validarSite(pasta).core, core);

  const semCache = await criarSite({ core: core.filter(x => x !== "app-src.txt"), index });
  t.after(() => apagar(semCache));
  assert.throws(() => validarSite(semCache), /código externo do app.*CORE offline/);

  await writeFile(join(pasta, "app-src.txt"), "const = inválido;\n");
  assert.throws(() => validarSite(pasta), /Sintaxe JavaScript inválida.*app-src externo/);
});

test("validador rejeita arquivo obrigatório ausente no CORE", async t => {
  const pasta = await criarSite({ core: ["./", "index.html", "deck.enc", "arquivos/metacognicao.js", "offline.js"] });
  t.after(() => apagar(pasta));
  assert.throws(() => validarSite(pasta), /arquivo obrigatório do CORE .* ausente/);
});

test("CLI do validador retorna código não zero quando CORE está incompleto", async t => {
  const pasta = await criarSite({ core: ["./", "index.html", "deck.enc", "arquivos/metacognicao.js", "ausente.bin"] });
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

test("validador aceita o módulo de cronograma somente com JS, CSS e CORE completos", async t => {
  const core = ["./", "index.html", "deck.enc", "arquivos/metacognicao.js", "arquivos/cronograma.js", "arquivos/cronograma.css"];
  const index = [
    "<!doctype html><html><head>",
    '<link rel="stylesheet" href="arquivos/cronograma.css">',
    "</head><body>",
    '<script type="text/plain" id="app-src">const appPronto = true;</script>',
    '<script data-lazy-src="arquivos/metacognicao.js"></script>',
    '<script data-lazy-src="arquivos/cronograma.js"></script>',
    "</body></html>",
  ].join("\n");
  const pasta = await criarSite({ core, index });
  t.after(() => apagar(pasta));
  await writeFile(join(pasta, "arquivos/cronograma.js"), "globalThis.cronogramaPronto = true;\n");
  await writeFile(join(pasta, "arquivos/cronograma.css"), ".cronograma { display: block; }\n");
  assert.deepEqual(validarSite(pasta).core, core);
  await rm(join(pasta, "arquivos/cronograma.css"));
  assert.throws(() => validarSite(pasta), /cronograma.*CORE|arquivo obrigatório/i);
});
