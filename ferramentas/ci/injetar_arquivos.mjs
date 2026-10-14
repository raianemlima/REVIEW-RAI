// Usado na publicação (GitHub Actions): coloca as chaves dos PDFs protegidos dentro do baralho cifrado do index.html.
// Uso: APP_SENHA=... CHAVE_ARQUIVOS='[...]' node ferramentas/ci/injetar_arquivos.mjs _site/index.html
//
// Os dois valores vêm dos segredos do repositório (Settings › Secrets and variables › Actions) e nunca ficam no código.
// Decifra o baralho com a senha, troca DECK.arquivos e cifra de novo com o MESMO sal: a chave derivada não muda,
// então quem já entrou continua abrindo o app sem precisar de internet. Sem os segredos, não faz nada.
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto, randomBytes } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";

const arq = process.argv[2], senha = process.env.APP_SENHA, chaves = process.env.CHAVE_ARQUIVOS;
if (!arq) { console.error("Uso: node injetar_arquivos.mjs index.html"); process.exit(1); }
if (!senha || !chaves) { console.log("::notice::Segredos APP_SENHA e CHAVE_ARQUIVOS não configurados: PDFs protegidos não entram no baralho."); process.exit(0); }

let lista;
try { lista = JSON.parse(chaves); if (!Array.isArray(lista) || !lista.every(a => a.id && a.k && a.iv && a.arquivo)) throw 0; }
catch { console.error("::error::O segredo CHAVE_ARQUIVOS não é o conteúdo do chave-arquivos.json."); process.exit(1); }

const html = readFileSync(arq, "utf8");
const re = /(<script type="application\/json" id="deck-enc">)(.*?)(<\/script>)/s, m = html.match(re);
if (!m) { console.error("::error::deck-enc não encontrado no index.html."); process.exit(1); }
const enc = JSON.parse(m[2]), unb64 = s => Buffer.from(s, "base64"), b64 = u => Buffer.from(u).toString("base64");
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: unb64(enc.s), iterations: enc.it, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
let pt;
try { pt = Buffer.from(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(enc.iv) }, key, unb64(enc.ct))); }
catch { console.error("::error::A senha do segredo APP_SENHA não abre o baralho deste index.html. Confira o segredo."); process.exit(1); }
const deck = JSON.parse((enc.z === "gzip" ? gunzipSync(pt) : pt).toString("utf8"));
if (JSON.stringify(deck.arquivos || []) === JSON.stringify(lista)) { console.log("Baralho já tem as chaves dos PDFs: nada a fazer."); process.exit(0); }
deck.arquivos = lista;
const iv = randomBytes(12);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, gzipSync(Buffer.from(JSON.stringify(deck), "utf8"), { level: 9 })));
const novo = JSON.stringify({ ...enc, z: "gzip", iv: b64(iv), ct: b64(ct) });
writeFileSync(arq, html.replace(re, (_, a, __, c) => a + novo + c));
console.log(`ok: ${lista.length} arquivo(s) protegido(s) no baralho (PDFs e pacotes de doutrina) (${lista.map(a => a.id).join(", ")})`);
