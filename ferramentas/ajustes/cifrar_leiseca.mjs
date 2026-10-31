// Cifra a lei seca extraída do curso (saída de ferramentas/conteudo/leiseca_decodificada.py) para ela ir ao GitHub
// sem expor o conteúdo pago. Uso: node ferramentas/ajustes/cifrar_leiseca.mjs pasta-ou-arquivos.json... [--chave chave.txt]
//
// Gera leiseca-cifrada/<id>.bin (um por lei). A chave (32 bytes em base64) vem da variável de ambiente LEISECA_CHAVE
// (assim ela não passa por arquivo nem por chat) ou, sem a variável, de chave-leiseca.txt, criada se não existir.
// O mesmo valor vai no segredo LEISECA_CHAVE do repositório (Settings › Secrets and variables › Actions) e NÃO pode ir
// para o GitHub. Gere uma chave com: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// Na publicação, ferramentas/ci/aplicar_leiseca.mjs insere as leis e os cartões no baralho.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { webcrypto as crypto, randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2), i = args.indexOf("--chave");
const arqChave = i >= 0 ? args.splice(i, 2)[1] : "chave-leiseca.txt";
const entradas = args.flatMap(a => statSync(a).isDirectory() ? readdirSync(a).filter(f => f.endsWith(".json")).map(f => join(a, f)) : [a]);
if (!entradas.length) { console.error("Uso: node cifrar_leiseca.mjs saida/ [--chave chave-leiseca.txt]"); process.exit(1); }
const daVariavel = (process.env.LEISECA_CHAVE || "").trim();
let chave = daVariavel || (existsSync(arqChave) ? readFileSync(arqChave, "utf8").trim() : "");
if (!chave) { chave = randomBytes(32).toString("base64"); writeFileSync(arqChave, chave + "\n"); console.log(`chave nova criada em ${arqChave}`); }
if (Buffer.from(chave, "base64").length !== 32) { console.error("A chave precisa ter 32 bytes em base64."); process.exit(1); }
const k = await crypto.subtle.importKey("raw", Buffer.from(chave, "base64"), "AES-GCM", false, ["encrypt"]);
const pasta = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "leiseca-cifrada");
mkdirSync(pasta, { recursive: true });
const PESSOAL = [/uid:[0-9a-f-]{8,}/i, /cpfCnpj/i, /[\w.+-]+@[\w-]+\.[\w.]+/];
for (const arq of entradas) {
  const texto = readFileSync(arq, "utf8"), lei = JSON.parse(texto);
  if (!/^[a-z0-9-]+-dls$/.test(lei.id || "") || !Array.isArray(lei.grupos)) { console.error(`${arq}: não parece saída do extrator (id *-dls e grupos).`); process.exit(1); }
  if (PESSOAL.some(p => p.test(texto))) { console.error(`${arq}: contém algo que parece dado pessoal; nada foi cifrado.`); process.exit(1); }
  const iv = randomBytes(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, gzipSync(Buffer.from(JSON.stringify(lei), "utf8"), { level: 9 })));
  writeFileSync(join(pasta, lei.id + ".bin"), Buffer.concat([iv, ct]));
  console.log(`ok: leiseca-cifrada/${lei.id}.bin (${lei.grupos.reduce((n, g) => n + g.itens.filter(x => x.a !== undefined).length, 0)} artigos, ${(lei.cartoes || []).length} cartões)`);
}
console.log(daVariavel ? "Chave lida de LEISECA_CHAVE: use o mesmo valor no segredo LEISECA_CHAVE do repositório."
  : `Guarde ${arqChave} fora do GitHub e copie o conteúdo para o segredo LEISECA_CHAVE.`);
