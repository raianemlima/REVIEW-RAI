// Cifra a lei seca extraída do curso (saída de ferramentas/conteudo/leiseca_decodificada.py) para ela ir ao GitHub
// sem expor o conteúdo pago. Uso: node ferramentas/ajustes/cifrar_leiseca.mjs pasta-ou-arquivos.json... [--chave chave.txt]
//
// Gera leiseca-cifrada/<id>.bin (um por lei). Dois modos:
// - SELADO (padrão quando existe leiseca-cifrada/chave-publica.txt): usa só a chave pública que a publicação mostra no
//   log ("chave pública da lei seca do curso"). Não precisa de segredo: o .bin abre apenas com a senha do app
//   (APP_SENHA), na publicação. Veja ferramentas/ci/leiseca_selada.mjs.
// - SIMÉTRICO (antigo): chave de 32 bytes em base64 na variável LEISECA_CHAVE (tem prioridade) ou em chave-leiseca.txt,
//   com o mesmo valor no segredo LEISECA_CHAVE do repositório. A chave NÃO pode ir para o GitHub.
// Na publicação, ferramentas/ci/aplicar_leiseca.mjs insere as leis e os cartões no baralho.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { webcrypto as crypto, randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { selar } from "../ci/leiseca_selada.mjs";

const args = process.argv.slice(2), i = args.indexOf("--chave");
const arqChave = i >= 0 ? args.splice(i, 2)[1] : "chave-leiseca.txt";
const entradas = args.flatMap(a => statSync(a).isDirectory() ? readdirSync(a).filter(f => f.endsWith(".json")).map(f => join(a, f)) : [a]);
if (!entradas.length) { console.error("Uso: node cifrar_leiseca.mjs saida/ [--chave chave-leiseca.txt]"); process.exit(1); }
const pasta = process.env.LEISECA_PASTA || join(dirname(fileURLToPath(import.meta.url)), "..", "..", "leiseca-cifrada");
mkdirSync(pasta, { recursive: true });
const daVariavel = (process.env.LEISECA_CHAVE || "").trim(), arqPublica = join(pasta, "chave-publica.txt");
const publica = !daVariavel && existsSync(arqPublica) ? readFileSync(arqPublica, "utf8").trim() : "";
let k = null;
if (!publica) {
  let chave = daVariavel || (existsSync(arqChave) ? readFileSync(arqChave, "utf8").trim() : "");
  if (!chave) { chave = randomBytes(32).toString("base64"); writeFileSync(arqChave, chave + "\n"); console.log(`chave nova criada em ${arqChave}`); }
  if (Buffer.from(chave, "base64").length !== 32) { console.error("A chave precisa ter 32 bytes em base64."); process.exit(1); }
  k = await crypto.subtle.importKey("raw", Buffer.from(chave, "base64"), "AES-GCM", false, ["encrypt"]);
}
const PESSOAL = [/uid:[0-9a-f-]{8,}/i, /cpfCnpj/i, /[\w.+-]+@[\w-]+\.[\w.]+/];
for (const arq of entradas) {
  const texto = readFileSync(arq, "utf8"), lei = JSON.parse(texto);
  if (!/^[a-z0-9-]+-dls$/.test(lei.id || "") || !Array.isArray(lei.grupos)) { console.error(`${arq}: não parece saída do extrator (id *-dls e grupos).`); process.exit(1); }
  if (PESSOAL.some(p => p.test(texto))) { console.error(`${arq}: contém algo que parece dado pessoal; nada foi cifrado.`); process.exit(1); }
  const dados = gzipSync(Buffer.from(JSON.stringify(lei), "utf8"), { level: 9 });
  if (publica) writeFileSync(join(pasta, lei.id + ".bin"), selar(publica, dados));
  else {
    const iv = randomBytes(12);
    writeFileSync(join(pasta, lei.id + ".bin"), Buffer.concat([iv, new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, dados))]));
  }
  console.log(`ok: ${lei.id}.bin${publica ? " (selado)" : ""} (${lei.grupos.reduce((n, g) => n + g.itens.filter(x => x.a !== undefined).length, 0)} artigos, ${(lei.cartoes || []).length} cartões)`);
}
if (publica) console.log("Selado com leiseca-cifrada/chave-publica.txt: abre só com a senha do app, na publicação.");
else console.log(daVariavel ? "Chave lida de LEISECA_CHAVE: use o mesmo valor no segredo LEISECA_CHAVE do repositório."
  : `Guarde ${arqChave} fora do GitHub e copie o conteúdo para o segredo LEISECA_CHAVE.`);
