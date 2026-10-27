import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { webcrypto, randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const gate = await readFile(new URL("../gate.js", import.meta.url), "utf8");
const SENHA = "senha-de-teste-do-baralho", ITER = 100000;
const DECK = { versao: "teste", cartoes: [{ id: "c1", frente: "pergunta", verso: "resposta" }] };
const b64 = u8 => Buffer.from(u8).toString("base64");

async function derivar(senha, salt) {
  const base = await webcrypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveKey"]);
  return webcrypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}
// mesmo formato que build.mjs gera: JSON v2 com gzip antes de cifrar
async function cifrar(deck) {
  const salt = randomBytes(16), iv = randomBytes(12), key = await derivar(SENHA, salt);
  const ct = new Uint8Array(await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, key, gzipSync(Buffer.from(JSON.stringify(deck), "utf8"))));
  return { payload: JSON.stringify({ v: 2, z: "gzip", it: ITER, s: b64(salt), iv: b64(iv), ct: b64(ct) }), key };
}
const resp = (status, corpo) => ({ ok: status >= 200 && status < 300, status, async json() { return corpo; }, async text() { return typeof corpo === "string" ? corpo : JSON.stringify(corpo); } });

async function abrir({ senhaDoServidor, armazenamento }) {
  const { payload, key } = await cifrar(DECK);
  const dom = new JSDOM(`<!doctype html><html><body><span id="save"></span><main id="main"></main><script type="text/plain" id="app-src" data-src="app-src.txt"></script></body></html>`, { url: "https://review.invalid/?entrar=1", runScripts: "outside-only" });
  const w = dom.window;
  Object.defineProperty(w, "crypto", { value: webcrypto, configurable: true });
  Object.assign(w, { TextEncoder, TextDecoder, Blob, Response, DecompressionStream });
  const chamadas = [];
  w.fetch = async url => {
    const caminho = new URL(url).pathname; chamadas.push(caminho);
    if (caminho === "/deck.enc") return resp(200, payload);
    if (caminho === "/app-src.txt") return resp(200, "window.__appIniciou = DECK.cartoes.length;");
    if (caminho === "/rest/v1/rpc/chave_do_app") return resp(200, senhaDoServidor);
    if (caminho === "/auth/v1/logout") return resp(204, null);
    throw new Error(`rota inesperada: ${caminho}`);
  };
  const conta = { email: "aluno@example.com", uid: "uid-1", at: "token", rt: "refresh", exp: Date.now() + 3600000 };
  const guardado = armazenamento ? await armazenamento(key, conta) : { "revisao-dpe-conta": JSON.stringify(conta) };
  for (const [k, v] of Object.entries(guardado)) w.localStorage.setItem(k, v);
  w.eval(gate);
  return { w, chamadas, dom };
}
const esperar = async (w, ok) => { for (let i = 0; i < 300; i++) { if (ok()) return; await new Promise(r => setTimeout(r, 10)); } throw new Error("tempo esgotado"); };
const appIniciado = w => [...w.document.querySelectorAll("body > script")].find(s => s.textContent.startsWith("const DECK = "));

test("conta liberada: o gate decifra o baralho real (base64, AES-GCM, gzip) e inicia o app", async () => {
  const a = await abrir({ senhaDoServidor: SENHA });
  try {
    await esperar(a.w, () => appIniciado(a.w));
    const s = appIniciado(a.w).textContent;
    assert.ok(s.startsWith("const DECK = " + JSON.stringify(DECK) + ";\n"), "o baralho decifrado precisa ser idêntico ao original");
    assert.ok(s.endsWith("window.__appIniciou = DECK.cartoes.length;"));
    assert.ok(a.w.localStorage.getItem("revisao-dpe-chave"), "a chave fica guardada para o uso offline");
  } finally { a.w.close(); }
});

test("senha do servidor errada não abre o app e não guarda chave", async () => {
  const a = await abrir({ senhaDoServidor: "outra-senha" });
  try {
    await esperar(a.w, () => a.w.document.querySelector("#gmsg")?.textContent.includes("não confere"));
    assert.equal(appIniciado(a.w), undefined);
    assert.equal(a.w.localStorage.getItem("revisao-dpe-chave"), null);
  } finally { a.w.close(); }
});

test("uso offline: a chave guardada abre o baralho sem pedir a senha ao servidor", async () => {
  const a = await abrir({
    senhaDoServidor: SENHA,
    armazenamento: async (key, conta) => ({
      "revisao-dpe-chave": b64(new Uint8Array(await webcrypto.subtle.exportKey("raw", key))),
      "revisao-dpe-chave-uid": conta.uid, "revisao-dpe-verif": String(Date.now()), "revisao-dpe-conta": JSON.stringify(conta),
    }),
  });
  try {
    await esperar(a.w, () => appIniciado(a.w));
    assert.ok(appIniciado(a.w).textContent.startsWith("const DECK = " + JSON.stringify(DECK)));
    assert.equal(a.chamadas.includes("/auth/v1/logout"), false);
  } finally { a.w.close(); }
});
