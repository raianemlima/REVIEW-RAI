// Usado na publicação (GitHub Actions): insere no baralho cifrado a lei seca que fica fora do arquivo-fonte.
// Uso: APP_SENHA=... [LEISECA_CHAVE=...] node ferramentas/ci/aplicar_leiseca.mjs _site/index.html
//
// Duas origens, trocadas pelo id em DECK.leiseca (com os cartões de lacuna da lei, se houver):
// - texto oficial público em ferramentas/conteudo/dados/leiseca-publica/*.json (ex.: resoluções do CNJ): só precisa de APP_SENHA;
// - lei seca do curso em leiseca-cifrada/*.bin, extraída por ferramentas/conteudo/leiseca_decodificada.py e cifrada com a
//   chave do segredo LEISECA_CHAVE (ferramentas/ajustes/cifrar_leiseca.mjs): sem esse segredo, os .bin ficam de fora.
// O baralho é decifrado com APP_SENHA e cifrado de novo com o MESMO sal, como o aplicar_revisoes.mjs: quem já entrou
// continua abrindo o app offline. Sem APP_SENHA, não faz nada.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { webcrypto as crypto, randomBytes } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { dirname, join } from "node:path";

const arq = process.argv[2], senha = process.env.APP_SENHA, chave = process.env.LEISECA_CHAVE;
const pasta = process.env.LEISECA_PASTA || "leiseca-cifrada";
const pastaPublica = process.env.LEISECA_PUBLICA || "ferramentas/conteudo/dados/leiseca-publica";
if (!arq) { console.error("Uso: node aplicar_leiseca.mjs index.html"); process.exit(1); }
const bins = existsSync(pasta) ? readdirSync(pasta).filter(f => f.endsWith(".bin")).sort() : [];
const publicas = existsSync(pastaPublica) ? readdirSync(pastaPublica).filter(f => f.endsWith(".json")).sort() : [];
if (!bins.length && !publicas.length) { console.log(`Nenhuma lei em ${pasta}/ nem em ${pastaPublica}/.`); process.exit(0); }
if (!senha) { console.log("::notice::Segredo APP_SENHA não configurado: lei seca extra não aplicada."); process.exit(0); }

const unb64 = s => Buffer.from(s, "base64"), b64 = u => Buffer.from(u).toString("base64");
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const leis = publicas.map(f => JSON.parse(readFileSync(join(pastaPublica, f), "utf8")));
if (bins.length && !chave) console.log("::notice::Segredo LEISECA_CHAVE não configurado: lei seca do curso (leiseca-cifrada) não aplicada.");
if (bins.length && chave) {
  const kLei = await crypto.subtle.importKey("raw", unb64(chave.trim()), "AES-GCM", false, ["decrypt"])
    .catch(() => { console.error("::error::O segredo LEISECA_CHAVE não é uma chave válida (copie o arquivo chave-leiseca.txt inteiro)."); process.exit(1); });
  for (const f of bins) {
    const buf = readFileSync(join(pasta, f));
    let pt;
    try { pt = Buffer.from(await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.subarray(0, 12) }, kLei, buf.subarray(12))); }
    catch { console.error(`::error::O segredo LEISECA_CHAVE não abre ${f}. Confira o segredo.`); process.exit(1); }
    leis.push(JSON.parse(gunzipSync(pt).toString("utf8")));
  }
}
if (!leis.length) process.exit(0);

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

// "@processo civil" -> id da disciplina do baralho cujo nome contém o termo (Civil e Penal não pegam as processuais)
function disciplina(ref) {
  if (!String(ref).startsWith("@")) return (deck.disciplinas || []).some(d => d.id === ref) ? ref : "";
  const termo = norm(ref.slice(1)), alternativas = { "processo civil": ["processo civil", "processual civil"], "processo penal": ["processo penal", "processual penal"] }[termo] || [termo];
  const achada = (deck.disciplinas || []).find(d => {
    const n = norm(`${d.nome || ""} ${d.curto || ""}`);
    if ((termo === "civil" || termo === "penal") && /process|execu/.test(n)) return false;
    return alternativas.some(t => n.includes(t));
  });
  return achada ? achada.id : "";
}

const FONTE_CARTAO = "secundária: elaborado a partir do texto legal e dos grifos do curso; confira a redação vigente";
deck.leiseca ||= []; deck.cartoes ||= [];
let nLeis = 0, nCartoes = 0;
for (const lei of leis) {
  const disc = disciplina(lei.disc);
  if (!disc) console.log(`::warning::${lei.id}: disciplina ${lei.disc} não existe no baralho; a lei entra sem disciplina e sem cartões.`);
  const item = { id: lei.id, nome: lei.nome, curto: lei.curto, disc, fonte: lei.fonte, completa: !!lei.completa, grupos: lei.grupos };
  const pos = deck.leiseca.findIndex(x => x.id === lei.id);
  if (pos >= 0) deck.leiseca[pos] = item; else deck.leiseca.push(item);
  nLeis++;
  const prefixo = `ls-${lei.id}`;
  deck.cartoes = deck.cartoes.filter(c => !String(c.id).startsWith(prefixo));
  if (!disc) continue;
  let ord = deck.cartoes.reduce((m, c) => Math.max(m, c.ord || 0), 0);
  const cont = {};
  for (const c of lei.cartoes || []) {
    cont[c.g] = (cont[c.g] || 0) + 1;
    deck.cartoes.push({ id: `${prefixo}${c.g + 1}-${String(cont[c.g]).padStart(3, "0")}`, disc, ord: ++ord, tema: `Lei seca ${lei.curto}: ${c.tema}`, tipo: "lei_seca",
      frente: c.frente, verso: c.verso, porque: c.porque, origem: c.origem, abr: "nucleo_comum", peso: 5, inc: 5, fonte: FONTE_CARTAO });
    nCartoes++;
  }
}
const iv = randomBytes(12);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, gzipSync(Buffer.from(JSON.stringify(deck), "utf8"), { level: 9 })));
writeFileSync(caminhoDeck, JSON.stringify({ ...enc, z: "gzip", iv: b64(iv), ct: b64(ct) }));
console.log(`ok: ${nLeis} lei(s) e ${nCartoes} cartão(ões) de lei seca no baralho (${[...publicas, ...(chave ? bins : [])].join(", ")})`);
