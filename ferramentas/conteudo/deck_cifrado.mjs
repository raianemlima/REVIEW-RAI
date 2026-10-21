// Abre e fecha o baralho cifrado (deck.enc) SEM o fonte.html: útil para inserir conteúdo quando só o repositório e a senha estão à mão.
// Usa o mesmo formato do build.mjs (v2: gzip + PBKDF2 600k + AES-GCM).
//   SENHA='...' node deck_cifrado.mjs decifrar deck.enc saida.html     # grava "const DECK = {...};" (aceito por baralho.py extrair/montar)
//   SENHA='...' node deck_cifrado.mjs cifrar   deck.json deck.enc      # deck.json = o objeto DECK
// Depois de trocar o deck.enc, suba CACHE e APP_CACHE (sw.js, gate.js e o gate do index.html). Nunca deixe a saída em claro no repositório.
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto, randomBytes } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";

const [modo, entrada, saida] = process.argv.slice(2);
const senha = process.env.SENHA;
if (!["decifrar", "cifrar"].includes(modo) || !entrada || !saida || !senha) {
  console.error("Uso: SENHA='...' node deck_cifrado.mjs decifrar|cifrar entrada saida");
  process.exit(1);
}
const b64 = u8 => Buffer.from(u8).toString("base64"), u = s => Buffer.from(s, "base64");
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveKey"]);
const chave = (salt, it, uso) => crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: it, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, [uso]);

if (modo === "decifrar") {
  const p = JSON.parse(readFileSync(entrada, "utf8"));
  let pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: u(p.iv) }, await chave(u(p.s), p.it, "decrypt"), u(p.ct)));
  if (p.z === "gzip") pt = gunzipSync(pt);
  const deck = JSON.parse(Buffer.from(pt).toString("utf8"));
  writeFileSync(saida, "const DECK = " + JSON.stringify(deck) + ";\n");
  console.log("ok: cartões", deck.cartoes.length, "| estudos", (deck.ebooks || []).length, "| disciplinas", deck.disciplinas.length);
} else {
  const ITER = 600000, salt = randomBytes(16), iv = randomBytes(12);
  const deck = JSON.parse(readFileSync(entrada, "utf8"));
  if (!Array.isArray(deck.cartoes) || !Array.isArray(deck.disciplinas)) throw new Error("não parece um DECK (faltam cartoes/disciplinas)");
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await chave(salt, ITER, "encrypt"), gzipSync(Buffer.from(JSON.stringify(deck), "utf8"), { level: 9 })));
  writeFileSync(saida, JSON.stringify({ v: 2, z: "gzip", it: ITER, s: b64(salt), iv: b64(iv), ct: b64(ct) }));
  console.log("ok:", saida, (readFileSync(saida).length / 1e6).toFixed(2), "MB");
}
