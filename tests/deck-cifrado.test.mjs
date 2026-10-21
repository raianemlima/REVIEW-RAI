import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const ferramenta = resolve(dirname(fileURLToPath(import.meta.url)), "../ferramentas/conteudo/deck_cifrado.mjs");
const rodar = (...a) => execFileSync("node", [ferramenta, ...a], { env: { ...process.env, SENHA: "senha-de-teste" }, encoding: "utf8" });

test("cifrar e decifrar devolvem o mesmo baralho, no formato v2 do build.mjs", () => {
  const dir = mkdtempSync(join(tmpdir(), "deck-"));
  const deck = { versao: "01/01/2026", disciplinas: [{ id: "dh" }], cartoes: [{ id: "x1", disc: "dh", frente: "á", verso: "CERTO" }], ebooks: [] };
  writeFileSync(join(dir, "deck.json"), JSON.stringify(deck));
  rodar("cifrar", join(dir, "deck.json"), join(dir, "deck.enc"));
  const p = JSON.parse(readFileSync(join(dir, "deck.enc"), "utf8"));
  assert.deepEqual([p.v, p.z, p.it], [2, "gzip", 600000]);
  rodar("decifrar", join(dir, "deck.enc"), join(dir, "saida.html"));
  const m = readFileSync(join(dir, "saida.html"), "utf8").match(/^const DECK = (\{.*\});$/m);
  assert.deepEqual(JSON.parse(m[1]), deck);
});

test("senha errada não decifra", () => {
  const dir = mkdtempSync(join(tmpdir(), "deck-"));
  writeFileSync(join(dir, "deck.json"), JSON.stringify({ disciplinas: [], cartoes: [] }));
  rodar("cifrar", join(dir, "deck.json"), join(dir, "deck.enc"));
  assert.throws(() => execFileSync("node", [ferramenta, "decifrar", join(dir, "deck.enc"), join(dir, "o.html")], { env: { ...process.env, SENHA: "outra" }, stdio: "pipe" }));
});
