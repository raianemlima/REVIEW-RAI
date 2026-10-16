// Usado na publicação (GitHub Actions): aplica no baralho cifrado do index.html as revisões de texto de cartões.
// Uso: APP_SENHA=... REVISOES_CHAVE=... node ferramentas/ci/aplicar_revisoes.mjs _site/index.html
//
// As revisões ficam em revisoes/*.bin, cifradas com a chave do segredo REVISOES_CHAVE (gere com ferramentas/ajustes/cifrar_revisao.mjs).
// Cada uma é um JSON {"id-do-cartao": {"frente": "...", "verso": "...", "porque": "..."}}. O script decifra o baralho com APP_SENHA,
// troca só esses campos e cifra de novo com o MESMO sal, como o injetar_arquivos.mjs. Sem os segredos, não faz nada.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { webcrypto as crypto, randomBytes } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { join } from "node:path";

const arq = process.argv[2], senha = process.env.APP_SENHA, chave = process.env.REVISOES_CHAVE, pasta = "revisoes";
if (!arq) { console.error("Uso: node aplicar_revisoes.mjs index.html"); process.exit(1); }
const bins = existsSync(pasta) ? readdirSync(pasta).filter(f => f.endsWith(".bin")).sort() : [];
if (!bins.length) { console.log("Nenhuma revisão em revisoes/."); process.exit(0); }
if (!senha || !chave) { console.log("::notice::Segredos APP_SENHA e REVISOES_CHAVE não configurados: revisões de cartões não aplicadas."); process.exit(0); }

const unb64 = s => Buffer.from(s, "base64"), b64 = u => Buffer.from(u).toString("base64");
const kRev = await crypto.subtle.importKey("raw", unb64(chave.trim()), "AES-GCM", false, ["decrypt"])
  .catch(() => { console.error("::error::O segredo REVISOES_CHAVE não é uma chave válida (copie o arquivo chave-revisoes.txt inteiro)."); process.exit(1); });
const rev = {};
for (const f of bins) {
  const buf = readFileSync(join(pasta, f));
  let pt;
  try { pt = Buffer.from(await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.subarray(0, 12) }, kRev, buf.subarray(12))); }
  catch { console.error(`::error::O segredo REVISOES_CHAVE não abre ${f}. Confira o segredo.`); process.exit(1); }
  Object.assign(rev, JSON.parse(gunzipSync(pt).toString("utf8")));
}

const html = readFileSync(arq, "utf8");
const re = /(<script type="application\/json" id="deck-enc">)(.*?)(<\/script>)/s, m = html.match(re);
if (!m) { console.error("::error::deck-enc não encontrado no index.html."); process.exit(1); }
const enc = JSON.parse(m[2]);
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: unb64(enc.s), iterations: enc.it, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
let pt;
try { pt = Buffer.from(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(enc.iv) }, key, unb64(enc.ct))); }
catch { console.error("::error::A senha do segredo APP_SENHA não abre o baralho deste index.html."); process.exit(1); }
const deck = JSON.parse((enc.z === "gzip" ? gunzipSync(pt) : pt).toString("utf8"));

const porId = Object.fromEntries((deck.cartoes || []).map(c => [c.id, c]));
let campos = 0, cartoes = 0; const faltam = [];
for (const [id, novo] of Object.entries(rev)) {
  const c = porId[id]; if (!c) { faltam.push(id); continue; }
  let mudou = false;
  for (const k of ["frente", "verso", "porque"]) if (k in novo && c[k] !== novo[k]) { c[k] = novo[k]; campos++; mudou = true; }
  if (mudou) cartoes++;
}
if (faltam.length) console.log(`::warning::${faltam.length} cartão(ões) da revisão não existem no baralho: ${faltam.slice(0, 15).join(", ")}`);
if (!campos) { console.log("Baralho já está com as revisões: nada a fazer."); process.exit(0); }
const iv = randomBytes(12);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, gzipSync(Buffer.from(JSON.stringify(deck), "utf8"), { level: 9 })));
writeFileSync(arq, html.replace(re, (_, a, __, c) => a + JSON.stringify({ ...enc, z: "gzip", iv: b64(iv), ct: b64(ct) }) + c));
console.log(`ok: ${campos} campo(s) revisado(s) em ${cartoes} cartão(ões) (${bins.join(", ")})`);
