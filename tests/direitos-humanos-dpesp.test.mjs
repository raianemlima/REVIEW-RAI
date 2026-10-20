import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { test } from "node:test";

const caminho = new URL("../direitos-humanos-dpesp.html", import.meta.url);

async function abrir() {
  const html = await readFile(caminho, "utf8");
  const dom = new JSDOM(html, {
    url: "https://review-dpe.test/direitos-humanos-dpesp.html",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
  dom.window.print = () => {};
  await new Promise(resolve => setTimeout(resolve, 0));
  return dom;
}

test("arquivo interativo apresenta recorrência e separa o X Concurso", async () => {
  const dom = await abrir();
  const { document } = dom.window;
  assert.equal(document.querySelectorAll("#themeGrid .theme-card").length, 10);
  assert.match(document.querySelector("#themeGrid").textContent, /17/);
  assert.equal(document.querySelectorAll("#newGrid .new-card").length, 9);
  assert.match(document.querySelector("#newGrid").textContent, /Direitos Humanos e democracia/);
  assert.match(document.body.textContent, /2 × 5 pts/);
  dom.window.close();
});

test("busca, filtros e aba de novidades funcionam sem recarregar a página", async () => {
  const dom = await abrir();
  const { document } = dom.window;
  const busca = document.querySelector("#searchInput");
  busca.value = "tecnologia";
  busca.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  assert.equal(document.querySelectorAll("#themeGrid .theme-card").length, 1);
  document.querySelector('[data-filter="core"]').click();
  assert.equal(document.querySelectorAll("#themeGrid .theme-card").length, 0);
  document.querySelector('[data-filter="all"]').click();
  document.querySelector("#tabNew").click();
  assert.equal(document.querySelector("#newView").hidden, false);
  assert.equal(document.querySelector("#frequencyView").hidden, true);
  dom.window.close();
});

test("checklist calcula, persiste e limpa o progresso local", async () => {
  const dom = await abrir();
  const { document, localStorage } = dom.window;
  const primeira = document.querySelector("[data-check='0']");
  primeira.click();
  assert.equal(document.querySelector("#progressLabel").textContent, "13%");
  assert.match(document.querySelector("#progressText").textContent, /1 de 8/);
  assert.equal(JSON.parse(localStorage.getItem("review-dpe:direitos-humanos-dpesp:v1"))[0], 0);
  document.querySelector("#themeToggle").click();
  assert.equal(document.documentElement.dataset.theme, "dark");
  document.querySelector("#resetChecklist").click();
  assert.equal(document.querySelector("#progressLabel").textContent, "0%");
  assert.equal(localStorage.getItem("review-dpe:direitos-humanos-dpesp:v1"), "[]");
  dom.window.close();
});
