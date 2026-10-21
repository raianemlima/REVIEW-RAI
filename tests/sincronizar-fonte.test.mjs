import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sincronizador = join(raiz, "ferramentas/ajustes/sincronizar_fonte.py");
const modulos = [
  "arquivos/metacognicao.js",
  "arquivos/cronograma-pesos.js",
  "arquivos/cronograma-taxonomia.js",
  "arquivos/cronograma-conteudo.js",
  "arquivos/cronograma-motor.js",
  "arquivos/cronograma.js",
  "arquivos/interface.js",
];
const codigoApp = "globalThis.appRestaurado = true;\n";
const fonteBase = '<!doctype html><html><body><script>\nconst DECK = {"fixture":"original"};\n</script></body></html>\n';

function indexPublicado() {
  return [
    '<!doctype html><html><body>',
    `<script>${"/* baralho criptografado: ver gate */"}</script>`,
    '<script type="text/plain" id="app-src" data-src="app-src.txt"></script>',
    '<script>/* gate fixture */</script>',
    ...modulos.map(path => `<script data-lazy-src="${path}"></script>`),
    "</body></html>",
  ].join("\n");
}

function executar(fonte, index) {
  return spawnSync("python3", [sincronizador, fonte, index], { encoding: "utf8" });
}

async function pastaTemporaria(t) {
  const pasta = await mkdtemp(join(tmpdir(), "review-sync-fonte-"));
  t.after(() => rm(pasta, { recursive: true, force: true }));
  return pasta;
}

test("sincronizador lê app-src.txt e restaura módulos lazy para a próxima execução do build", async t => {
  const pasta = await pastaTemporaria(t);
  const fonte = join(pasta, "fonte.html"), index = join(pasta, "index.html");
  await writeFile(fonte, fonteBase);
  await writeFile(index, indexPublicado());
  await writeFile(join(pasta, "app-src.txt"), codigoApp);

  const resultado = executar(fonte, index);
  assert.equal(resultado.status, 0, resultado.stderr);
  const restaurada = await readFile(fonte, "utf8");
  assert.match(restaurada, /const DECK = \{"fixture":"original"\};/);
  assert.ok(restaurada.includes(`<script>${codigoApp}</script>`));
  assert.doesNotMatch(restaurada, /id="app-src"|data-src="app-src\.txt"|gate fixture/);
  for (const modulo of modulos) assert.ok(restaurada.includes(`<script src="${modulo}"></script>`), `módulo não restaurado: ${modulo}`);
  assert.doesNotMatch(restaurada, /data-lazy-src=/);
});

test("sincronizador falha antes de tocar no fonte se app-src.txt estiver ausente", async t => {
  const pasta = await pastaTemporaria(t);
  const fonte = join(pasta, "fonte.html"), index = join(pasta, "index.html");
  await writeFile(fonte, fonteBase);
  await writeFile(index, indexPublicado());

  const resultado = executar(fonte, index);
  assert.notEqual(resultado.status, 0);
  assert.match(resultado.stderr, /app-src\.txt não encontrado/);
  assert.equal(await readFile(fonte, "utf8"), fonteBase);
});
