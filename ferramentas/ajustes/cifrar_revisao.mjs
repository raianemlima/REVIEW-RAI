// Cifra uma revisão de cartões para ela ir ao GitHub sem expor o texto do baralho.
// Uso: node ferramentas/ajustes/cifrar_revisao.mjs revisao.json nome [chave.txt]
//
// Gera revisoes/<nome>.bin. A chave (32 bytes em base64) fica em chave.txt: se o arquivo não existir, é criada.
// Ela vai no segredo REVISOES_CHAVE do repositório (Settings › Secrets and variables › Actions) e NÃO pode ir para o GitHub.
// Na publicação, ferramentas/ci/aplicar_revisoes.mjs aplica as revisões no baralho.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { webcrypto as crypto, randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [entrada, nome, arqChave = "chave-revisoes.txt"] = process.argv.slice(2);
if (!entrada || !/^[a-z0-9-]+$/.test(nome || "")) { console.error("Uso: node cifrar_revisao.mjs revisao.json nome-em-minusculas [chave.txt]"); process.exit(1); }
const rev = JSON.parse(readFileSync(entrada, "utf8"));
if (!rev || typeof rev !== "object" || Array.isArray(rev)) { console.error("A revisão deve ser {id: {frente, verso, porque}}."); process.exit(1); }
let chave = existsSync(arqChave) ? readFileSync(arqChave, "utf8").trim() : "";
if (!chave) { chave = randomBytes(32).toString("base64"); writeFileSync(arqChave, chave + "\n"); console.log(`chave nova criada em ${arqChave}`); }
const k = await crypto.subtle.importKey("raw", Buffer.from(chave, "base64"), "AES-GCM", false, ["encrypt"]), iv = randomBytes(12);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, gzipSync(Buffer.from(JSON.stringify(rev), "utf8"), { level: 9 })));
const pasta = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "revisoes"); mkdirSync(pasta, { recursive: true });
writeFileSync(join(pasta, nome + ".bin"), Buffer.concat([iv, ct]));
console.log(`ok: revisoes/${nome}.bin (${Object.keys(rev).length} cartões). Guarde ${arqChave} fora do GitHub e copie o conteúdo para o segredo REVISOES_CHAVE.`);
