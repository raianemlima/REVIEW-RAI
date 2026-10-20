import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { validarSite } from "../ferramentas/ci/validar_site.mjs";

async function site(t, opcoes = {}) {
  const pasta = await mkdtemp(join(tmpdir(), "dashboard-publicacao-"));
  t.after(() => rm(pasta, { recursive: true, force: true }));
  await mkdir(join(pasta, "arquivos"));
  const arquivos = {
    "metacognicao.js": "const metacognicao = true;",
    "interface.js": "const interfaceVisual = true;", "interface.css": ".interface{}",
    "cronograma-pesos.js": "window.DPE_PESOS_EDITAIS = {};", "cronograma-conteudo.js": "window.DPE_CONTEUDOS_EDITAIS = {};",
    "cronograma-motor.js": "window.DPE_CRONOGRAMA_MOTOR = {};", "cronograma.js": "const cronograma = true;", "cronograma.css": ".cronograma{}",
    "dashboard-editais.js": opcoes.sintaxe ? "const = ;" : "const dashboard = true;", "dashboard-editais.css": ".dashboard{}",
  };
  const ordem = opcoes.ordemIncorreta ? ["cronograma-pesos.js", "cronograma-conteudo.js", "dashboard-editais.js", "cronograma-motor.js", "cronograma.js", "interface.js"] : ["cronograma-pesos.js", "cronograma-conteudo.js", "cronograma-motor.js", "cronograma.js", "interface.js", "dashboard-editais.js"];
  const scripts = ["metacognicao.js", ...ordem.filter(f => !(opcoes.semTag && f === "dashboard-editais.js"))].map(f => `<script src="arquivos/${f}"></script>`).join("");
  const links = ["interface.css", "cronograma.css", ...(opcoes.semLink ? [] : ["dashboard-editais.css"])].map(f => `<link rel="stylesheet" href="arquivos/${f}">`).join("");
  await writeFile(join(pasta, "index.html"), `<html><head>${links}</head><body>${scripts}</body></html>`);
  const core = ["./", "index.html", ...Object.keys(arquivos).filter(f => !(opcoes.semCache && f === "dashboard-editais.js")).map(f => `arquivos/${f}`)];
  await writeFile(join(pasta, "sw.js"), `const CORE=${JSON.stringify(core)};`);
  await Promise.all(Object.entries(arquivos).map(([nome, conteudo]) => writeFile(join(pasta, "arquivos", nome), conteudo)));
  return pasta;
}

test("publicação aceita dashboard documental com dependências e ordem corretas", async t => assert.ok(validarSite(await site(t))));
test("publicação rejeita dashboard fora do cache", async t => { const pasta = await site(t, { semCache: true }); assert.throws(() => validarSite(pasta), /CORE offline/); });
test("publicação rejeita dashboard sem referência única", async t => { const pasta = await site(t, { semTag: true }); assert.throws(() => validarSite(pasta), /referência única/); });
test("publicação rejeita dashboard carregado antes da interface", async t => { const pasta = await site(t, { ordemIncorreta: true }); assert.throws(() => validarSite(pasta), /precisa carregar depois/); });
test("publicação rejeita sintaxe inválida no dashboard", async t => { const pasta = await site(t, { sintaxe: true }); assert.throws(() => validarSite(pasta), /Sintaxe/); });
