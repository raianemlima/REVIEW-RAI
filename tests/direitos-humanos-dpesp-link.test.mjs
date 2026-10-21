import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ler = arquivo => readFileSync(resolve(raiz, arquivo), "utf8");

test("a Biblioteca tem link seguro para o guia de Direitos Humanos DPESP", () => {
  const link = ler("app-src.txt").match(/<a class="btn" id="dhLink"[^>]*>/);
  assert.ok(link, "link do guia ausente na Biblioteca");
  const href = link[0].match(/href="([^"]+)"/)[1];
  assert.equal(href, "direitos-humanos-dpesp.html");
  assert.ok(existsSync(resolve(raiz, href)), "o arquivo do guia precisa existir");
  assert.match(link[0], /target="_blank"/);
  assert.match(link[0], /rel="noopener"/);
});

test("o guia é publicado e guardado para uso offline", () => {
  assert.match(ler("sw.js"), /"direitos-humanos-dpesp\.html"/);
  assert.match(ler(".github/workflows/pages.yml"), /cp [^\n]*direitos-humanos-dpesp\.html/);
});

test("versões de cache do service worker e do gate continuam iguais", () => {
  const sw = ler("sw.js").match(/const CACHE = "([^"]+)"/)[1];
  assert.equal(ler("gate.js").match(/APP_CACHE = "([^"]+)"/)[1], sw);
  assert.equal(ler("index.html").match(/APP_CACHE = "([^"]+)"/)[1], sw);
});
