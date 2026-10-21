import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const app = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "..", "app-src.txt"), "utf8");

test("copiar o código de conexão do GitHub exige confirmação que avisa que o token não é criptografado", () => {
  const i = app.indexOf('$("#syCopy")?.addEventListener("click"');
  assert.ok(i > 0, "handler de #syCopy ausente");
  const trecho = app.slice(i, app.indexOf("\n  $(\"#syOff\")", i));
  assert.match(trecho, /não é criptografado/);
  assert.match(trecho, /id="syCopyYes"/);
  const clique = trecho.indexOf("syCopyYes\").onclick");
  const copia = trecho.indexOf("clipboard.writeText");
  assert.ok(clique > 0 && copia > clique, "a cópia só pode acontecer dentro do clique de confirmação");
  assert.equal((trecho.match(/clipboard\.writeText/g) || []).length, 1);
});
