import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const gate = await readFile(new URL("../gate.js", import.meta.url), "utf8");
const linha = gate.split("\n").find(l => l.includes("const unb64 ="));
assert.ok(linha, "unb64 ausente no gate.js");
const ctx = vm.createContext({ atob, Uint8Array });
vm.runInContext(`${linha.trim()}\nthis.unb64 = unb64;`, ctx);
const { unb64 } = ctx;
const referencia = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

test("unb64 devolve os mesmos bytes que a implementação anterior", () => {
  const todos = Uint8Array.from({ length: 256 }, (_, i) => i);
  for (const bytes of [new Uint8Array(0), Uint8Array.of(0), Uint8Array.of(255, 0, 128), todos, Uint8Array.from({ length: 100003 }, (_, i) => (i * 31 + 7) & 255)]) {
    const b64 = Buffer.from(bytes).toString("base64");
    assert.deepEqual([...unb64(b64)], [...referencia(b64)]);
    assert.deepEqual([...unb64(b64)], [...bytes]);
  }
});

test("unb64 continua rejeitando base64 inválido, como a validação do deck espera", () => {
  assert.throws(() => unb64("não é base64!"));
  assert.throws(() => referencia("não é base64!"));
});

test("unb64 usa laço indexado, sem callback por byte (gargalo medido: 249 ms contra 13 ms para 2,9 MB)", () => {
  assert.doesNotMatch(linha, /Uint8Array\.from\(/);
  assert.match(linha, /for \(let i = 0; i < n; i\+\+\)/);
});
