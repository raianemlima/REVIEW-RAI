// Usado na publicação (GitHub Actions): insere no baralho cifrado os e-books "Conteúdo específico" (Aprofundamento).
// Uso: APP_SENHA=... node ferramentas/ci/aplicar_ebooks.mjs _site/index.html
//
// Os e-books ficam em conteudo-cifrado/*.bin, "selados" com a chave pública da lei seca do curso
// (leiseca-cifrada/chave-publica.txt, veja ferramentas/ci/leiseca_selada.mjs): no repositório público não há texto
// legível do material de estudo; só a senha do app (APP_SENHA) abre. Cada .bin traz {"ebooks": [{id, titulo, caps, ...}]}.
// O e-book entra em DECK.ebooks no lugar do que tiver o mesmo id. O baralho é decifrado e cifrado de novo com o MESMO
// sal (quem já entrou continua abrindo o app offline). Sem APP_SENHA, não faz nada.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { webcrypto as crypto, randomBytes } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { parDaSenha, ehSelado, abrir } from "./leiseca_selada.mjs";

const arq = process.argv[2], senha = process.env.APP_SENHA;
const pasta = process.env.EBOOKS_PASTA || "conteudo-cifrado";
if (!arq) { console.error("Uso: node aplicar_ebooks.mjs index.html"); process.exit(1); }
const bins = existsSync(pasta) ? readdirSync(pasta).filter(f => f.endsWith(".bin")).sort() : [];
if (!bins.length) { console.log(`Nenhum e-book em ${pasta}/.`); process.exit(0); }
if (!senha) { console.log("::notice::Segredo APP_SENHA não configurado: e-books de conteúdo específico não aplicados."); process.exit(0); }
const par = parDaSenha(senha);

const ebooks = [], aplicados = [];
for (const f of bins) {
  const buf = readFileSync(join(pasta, f));
  if (!ehSelado(buf)) { console.log(`::warning::${f} não está selado (LSX1): ficou de fora.`); continue; }
  let dados;
  try { dados = JSON.parse(gunzipSync(abrir(par, buf)).toString("utf8")); }
  catch { console.log(`::warning::${f} não abre com a senha atual do app (APP_SENHA): sele de novo com a chave pública do log da lei seca. Ficou de fora.`); continue; }
  const lista = Array.isArray(dados.ebooks) ? dados.ebooks : [];
  const validos = lista.filter(e => e && typeof e.id === "string" && e.id && typeof e.titulo === "string" && Array.isArray(e.caps) && e.caps.length &&
    e.caps.every(c => c && typeof c.id === "string" && typeof c.t === "string" && typeof c.md === "string"));
  if (validos.length !== lista.length) console.log(`::warning::${f}: ${lista.length - validos.length} e-book(s) sem id, título ou capítulos válidos ficaram de fora.`);
  ebooks.push(...validos);
  if (validos.length) aplicados.push(f);
}
if (!ebooks.length) process.exit(0);

const unb64 = s => Buffer.from(s, "base64"), b64 = u => Buffer.from(u).toString("base64");
const caminhoDeck = join(dirname(arq), "deck.enc");
let enc;
try { enc = JSON.parse(readFileSync(caminhoDeck, "utf8")); }
catch (cause) { console.error(`::error::deck.enc ausente, ilegível ou inválido: ${cause.message}`); process.exit(1); }
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: unb64(enc.s), iterations: enc.it, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
let pt;
try { pt = Buffer.from(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(enc.iv) }, key, unb64(enc.ct))); }
catch { console.error("::error::A senha do segredo APP_SENHA não abre o baralho deste index.html."); process.exit(1); }
const deck = JSON.parse((enc.z === "gzip" ? gunzipSync(pt) : pt).toString("utf8"));

deck.ebooks ||= [];
let novos = 0, trocados = 0;
for (const e of ebooks) {
  const i = deck.ebooks.findIndex(x => x.id === e.id);
  if (i >= 0) { deck.ebooks[i] = e; trocados++; }
  else { deck.ebooks.push(e); novos++; }
}
const iv = randomBytes(12);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, gzipSync(Buffer.from(JSON.stringify(deck), "utf8"), { level: 9 })));
writeFileSync(caminhoDeck, JSON.stringify({ ...enc, z: "gzip", iv: b64(iv), ct: b64(ct) }));
const caps = ebooks.reduce((s, e) => s + e.caps.length, 0);
console.log(`ok: ${ebooks.length} e-book(s) de conteúdo específico no baralho (${novos} novo(s), ${trocados} atualizado(s); ${caps} capítulos; ${aplicados.join(", ")})`);
