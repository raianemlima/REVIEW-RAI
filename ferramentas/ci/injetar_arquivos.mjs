// Usado na publicação (GitHub Actions): coloca as chaves dos PDFs protegidos dentro do baralho cifrado do index.html.
// Uso: APP_SENHA=... CHAVE_ARQUIVOS='[...]' node ferramentas/ci/injetar_arquivos.mjs _site/index.html
//
// Os dois valores vêm dos segredos do repositório (Settings › Secrets and variables › Actions) e nunca ficam no código.
// Decifra o baralho com a senha, troca DECK.arquivos e cifra de novo com o MESMO sal: a chave derivada não muda,
// então quem já entrou continua abrindo o app sem precisar de internet. Sem os segredos, só injeta o módulo de metacognição.
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { webcrypto as crypto, randomBytes } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";

const arq = process.argv[2], senha = process.env.APP_SENHA, chaves = process.env.CHAVE_ARQUIVOS;
if (!arq) { console.error("Uso: node injetar_arquivos.mjs index.html"); process.exit(1); }

function móduloRegular(caminho) {
  try {
    return statSync(caminho).isFile();
  } catch {
    return false;
  }
}

function atributo(tag, nome) {
  // O espaço antes do nome evita que data-src seja tratado como src.
  const padrão = new RegExp("[\\t\\n\\f\\r ]" + nome + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'=<>`]+))", "i");
  const match = tag.match(padrão);
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : null;
}

function normalizarReferencia(referência) {
  if (typeof referência !== "string") return null;
  const semConsulta = referência.trim().split(/[?#]/, 1)[0];
  if (!semConsulta || /^[a-z][a-z\d+.-]*:/i.test(semConsulta) || semConsulta.startsWith("//")) return null;
  return semConsulta.replace(/^\/+/, "").replaceAll("\\", "/").replace(/^\.\//, "");
}

function jáCarregaMetacognição(html) {
  const scripts = /<script\b([^>]*)>(?:[\s\S]*?)<\/script\s*>/gi;
  let match;
  while ((match = scripts.exec(html))) {
    const abertura = `<script${match[1]}>`;
    if (normalizarReferencia(atributo(abertura, "src")) === "arquivos/metacognicao.js") return true;
  }
  return false;
}

// Módulo de metacognição (arquivos/metacognicao.js): entra antes do </body>, depois dos scripts do app,
// para se encaixar nas funções globais já definidas. A existência é conferida antes de qualquer modificação.
const caminhoMódulo = join(dirname(arq), "arquivos", "metacognicao.js");
if (!móduloRegular(caminhoMódulo)) {
  console.error(`::error::Módulo obrigatório ausente ou não é arquivo: ${caminhoMódulo}`);
  process.exit(1);
}

let h;
try {
  h = readFileSync(arq, "utf8");
} catch (cause) {
  console.error(`::error::Não foi possível ler o HTML de saída: ${cause.message}`);
  process.exit(1);
}

if (jáCarregaMetacognição(h)) console.log("index.html já carrega arquivos/metacognicao.js.");
else {
  const corpo = /<\/body\s*>/i.exec(h);
  if (!corpo) { console.error("::error::</body> não encontrado no index.html."); process.exit(1); }
  const TAG = '<script src="arquivos/metacognicao.js"></script>';
  writeFileSync(arq, h.slice(0, corpo.index) + TAG + "\n" + h.slice(corpo.index));
  h = h.slice(0, corpo.index) + TAG + "\n" + h.slice(corpo.index);
  console.log("ok: arquivos/metacognicao.js injetado no index.html");
}

if (!senha || !chaves) { console.log("::notice::Segredos APP_SENHA e CHAVE_ARQUIVOS não configurados: PDFs protegidos não entram no baralho."); process.exit(0); }

let lista;
try { lista = JSON.parse(chaves); if (!Array.isArray(lista) || !lista.every(a => a.id && a.k && a.iv && a.arquivo)) throw 0; }
catch { console.error("::error::O segredo CHAVE_ARQUIVOS não é o conteúdo do chave-arquivos.json."); process.exit(1); }

const re = /(<script type="application\/json" id="deck-enc">)(.*?)(<\/script>)/s, m = h.match(re);
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
writeFileSync(arq, h.replace(re, (_, a, __, c) => a + novo + c));
console.log(`ok: ${lista.length} arquivo(s) protegido(s) no baralho (PDFs e pacotes de doutrina) (${lista.map(a => a.id).join(", ")})`);
