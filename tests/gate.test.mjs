import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const gate = await readFile(new URL("../gate.js", import.meta.url), "utf8");
const seguranca = await readFile(new URL("../supabase/seguranca.sql", import.meta.url), "utf8");
const interfaceCSS = await readFile(new URL("../arquivos/interface.css", import.meta.url), "utf8");

function resposta(status, body) {
  return { ok: status >= 200 && status < 300, status, async json() { return body; } };
}

function ambiente({ storage = {}, rpc = null, url = "https://review.invalid/?entrar=1" } = {}) {
  const dom = new JSDOM(`<!doctype html><html><body><header class="top"><div class="brand"><h1>Review DPE</h1></div></header><span id="save"></span><main id="main" class="wrap"></main></body></html>`, {
    url, runScripts: "outside-only", pretendToBeVisual: true,
  });
  const w = dom.window;
  for (const [key, value] of Object.entries(storage)) w.localStorage.setItem(key, value);
  const chamadas = [];
  w.fetch = async (url, options = {}) => {
    const caminho = new URL(url).pathname;
    chamadas.push({ caminho, options });
    if (caminho === "/auth/v1/token") return resposta(200, {
      user: { id: "uid-nao-liberado", email: "alguem@example.com" },
      access_token: "token-de-teste", refresh_token: "refresh-de-teste", expires_in: 3600,
    });
    if (caminho === "/rest/v1/rpc/chave_do_app") return resposta(200, rpc);
    if (caminho === "/auth/v1/logout") return resposta(204, null);
    throw new Error(`Rota não esperada no teste: ${caminho}`);
  };
  w.eval(gate);
  return { dom, w, chamadas };
}

function aguardar(w, predicado) {
  return new Promise((resolve, reject) => {
    const inicio = Date.now();
    const checar = () => {
      if (predicado()) return resolve();
      if (Date.now() - inicio > 1500) return reject(new Error("fluxo de autenticação não terminou"));
      w.setTimeout(checar, 10);
    };
    checar();
  });
}

test("login autenticado no Supabase sem liberação não abre o app e encerra a sessão", async () => {
  const a = ambiente();
  try {
    await aguardar(a.w, () => !!a.w.document.querySelector("#gate"));
    assert.equal(a.w.document.documentElement.dataset.rdDesign, "figma");
    assert.equal(a.w.document.body.classList.contains("rd-gate"), true);
    assert.match(interfaceCSS, /body\.rd-gate nav\.tabs\s*\{\s*display:\s*none/s);
    a.w.document.querySelector("#gEmail").value = "alguem@example.com";
    a.w.document.querySelector("#gSenha").value = "senha-correta";
    a.w.document.querySelector("#gate").dispatchEvent(new a.w.Event("submit", { bubbles: true, cancelable: true }));
    await aguardar(a.w, () => a.w.document.querySelector("#gmsg")?.textContent.includes("não tem uma liberação ativa"));

    assert.ok(a.chamadas.some(c => c.caminho === "/rest/v1/rpc/chave_do_app"));
    assert.ok(a.chamadas.some(c => c.caminho === "/auth/v1/logout"));
    assert.equal(a.w.localStorage.getItem("revisao-dpe-chave"), null);
    assert.equal(a.w.localStorage.getItem("revisao-dpe-conta"), JSON.stringify({ email: "alguem@example.com" }));
    assert.equal(a.w.document.querySelector("#main").textContent.includes("ainda não foi liberado"), false);
  } finally { a.dom.window.close(); }
});

test("chave offline armazenada para outra conta não contorna a autorização", async () => {
  const a = ambiente({ storage: {
    "revisao-dpe-chave": "chave-ficticia",
    "revisao-dpe-chave-uid": "uid-autorizado-anterior",
    "revisao-dpe-verif": String(Date.now()),
    "revisao-dpe-conta": JSON.stringify({ email: "alguem@example.com", uid: "uid-nao-liberado", at: "token-de-teste", rt: "refresh-de-teste", exp: Date.now() + 3600000 }),
  } });
  try {
    await aguardar(a.w, () => a.w.document.querySelector("#gmsg")?.textContent.includes("não tem uma liberação ativa"));
    assert.ok(a.chamadas.some(c => c.caminho === "/rest/v1/rpc/chave_do_app"));
    assert.equal(a.chamadas.some(c => c.caminho === "/auth/v1/logout"), true);
    assert.equal(a.w.localStorage.getItem("revisao-dpe-chave"), null);
    assert.equal(a.w.document.querySelector("#main").textContent.includes("ainda não foi liberado"), false);
  } finally { a.dom.window.close(); }
});

test("SQL bloqueia novos cadastros fora da lista e a RPC só entrega chave a assinantes", () => {
  assert.match(seguranca, /create trigger review_dpe_email_liberado[\s\S]*?before insert on auth\.users/i);
  assert.match(seguranca, /lower\(btrim\(l\.email\)\)\s*=\s*lower\(btrim\(new\.email\)\)/i);
  assert.match(seguranca, /grant execute on function public\.chave_do_app\(\) to authenticated/i);
  assert.match(seguranca, /l\.valido_ate is null or l\.valido_ate > now\(\)/i);
});

const espera = (w, ms) => new Promise(r => w.setTimeout(r, ms));

test("visitante novo pelo navegador não vê a tela de login nem consulta o servidor (vai para a divulgação)", async () => {
  const a = ambiente({ url: "https://review.invalid/?utm_source=instagram" });
  try {
    await espera(a.w, 150);
    assert.equal(a.w.document.querySelector("#gate"), null);
    assert.equal(a.chamadas.length, 0);
  } finally { a.dom.window.close(); }
});

test("quem já usou o app, quem clica em Entrar e o app instalado continuam na tela de entrada", async () => {
  for (const opcoes of [
    { url: "https://review.invalid/", storage: { "revisao-dpe-tema": "escuro" } },
    { url: "https://review.invalid/?entrar=1" },
    { url: "https://review.invalid/?origem=pwa" },
  ]) {
    const a = ambiente(opcoes);
    try { await aguardar(a.w, () => !!a.w.document.querySelector("#gate")); }
    finally { a.dom.window.close(); }
  }
});

test("links Entrar da página de divulgação pedem a tela de entrada explicitamente", async () => {
  const conheca = await readFile(new URL("../conheca.html", import.meta.url), "utf8");
  assert.doesNotMatch(conheca, /href="\.\/"/);
  assert.match(conheca, /href="\.\/\?entrar=1"/);
});
