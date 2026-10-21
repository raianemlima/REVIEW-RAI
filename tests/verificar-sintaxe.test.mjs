import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(raiz, "ferramentas/ci/verificar_sintaxe.mjs");
const rodar = pasta => spawnSync(process.execPath, [script, pasta], { encoding: "utf8" });

function projeto(arquivos) {
  const pasta = mkdtempSync(join(tmpdir(), "sintaxe-"));
  for (const [nome, texto] of Object.entries(arquivos)) {
    mkdirSync(dirname(join(pasta, nome)), { recursive: true });
    writeFileSync(join(pasta, nome), texto);
  }
  return pasta;
}

test("o repositório passa na verificação de sintaxe", () => {
  const r = rodar(raiz);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /scripts compilados/);
});

test("erro de sintaxe no app-src.txt reprova", () => {
  const pasta = projeto({ "app-src.txt": "function ok() { return 1; }\nfunction quebrada( {\n" });
  try {
    const r = rodar(pasta);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /app-src\.txt: erro de sintaxe/);
  } finally { rmSync(pasta, { recursive: true, force: true }); }
});

test("marcador de conflito de merge e debugger reprovam", () => {
  const pasta = projeto({ "gate.js": "const a = 1;\ndebugger;\n", "README.md": "texto\n<<<<<<< HEAD\nA\n=======\nB\n>>>>>>> outro\n" });
  try {
    const r = rodar(pasta);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /README\.md: marcador de conflito/);
    assert.match(r.stderr, /gate\.js: instrução debugger/);
  } finally { rmSync(pasta, { recursive: true, force: true }); }
});

test("pasta limpa passa", () => {
  const pasta = projeto({ "app-src.txt": "const x = 1;\n", "sw.js": "self.x = 1;\n", "arquivos/a.js": "(function(){})();\n" });
  try { assert.equal(rodar(pasta).status, 0); } finally { rmSync(pasta, { recursive: true, force: true }); }
});
