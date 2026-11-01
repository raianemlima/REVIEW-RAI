// Sela e-books (JSON do Aprofundamento) com a chave pública do app, para irem ao repositório público sem texto legível.
// Uso: node ferramentas/ajustes/selar_conteudo.mjs conteudo-cifrado/ce-dpe-rn.bin ebook1.json [ebook2.json ...]
//
// Usa a mesma chave pública da lei seca do curso (leiseca-cifrada/chave-publica.txt, derivada da senha do app):
// não precisa de segredo nenhum para selar; só a publicação (ferramentas/ci/aplicar_ebooks.mjs, com APP_SENHA) abre.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { selar } from "../ci/leiseca_selada.mjs";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const [saida, ...entradas] = process.argv.slice(2);
if (!saida || !entradas.length) { console.error("Uso: node selar_conteudo.mjs saida.bin ebook.json [...]"); process.exit(1); }
const publica = (process.env.CHAVE_PUBLICA || readFileSync(join(raiz, "leiseca-cifrada", "chave-publica.txt"), "utf8")).trim();
const ebooks = entradas.map(f => JSON.parse(readFileSync(f, "utf8")));
for (const e of ebooks) if (!e.id || !e.titulo || !Array.isArray(e.caps) || !e.caps.length) { console.error(`${e.id || "?"}: e-book sem id, título ou capítulos.`); process.exit(1); }
mkdirSync(dirname(saida), { recursive: true });
writeFileSync(saida, selar(publica, gzipSync(Buffer.from(JSON.stringify({ ebooks }), "utf8"), { level: 9 })));
console.log(`${saida}: ${ebooks.map(e => `${e.id} (${e.caps.length} capítulos)`).join(", ")} selado(s)`);
