// Usado na publicação (GitHub Actions): carimba o nome do cache do app com a versão do conteúdo publicado.
// Uso: node ferramentas/ci/carimbar_cache.mjs _site
//
// O app instalado só baixa a versão nova quando o sw.js muda. Antes, cada mudança precisava subir "vNN" à mão, e
// duas sessões que subiam para o mesmo número publicavam versões diferentes com o mesmo cache: quem abriu o app entre
// as duas ficava preso na anterior. Agora o nome vira "review-dpe-assuntos-vNN-<carimbo>", e o carimbo sai do conteúdo
// do repositório que entra no site (git ls-tree), sem docs nem testes. Mesmo conteúdo, mesmo carimbo (ninguém baixa
// tudo de novo à toa); qualquer mudança no que é publicado, carimbo novo.
// CACHE_CARIMBO=... força o carimbo (testes, publicação fora do git).
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";

const site = process.argv[2];
if (!site) { console.error("Uso: node carimbar_cache.mjs _site"); process.exit(1); }
const FORA = /^(docs\/|tests\/|\.github\/|README\.md$|TODO\.md$|plan\.md$|brand-spec\.md$|SECURITY\.md$)/;

function carimbo() {
  if (process.env.CACHE_CARIMBO) return String(process.env.CACHE_CARIMBO).replace(/[^a-z0-9]/gi, "").slice(0, 16);
  const arvore = execFileSync("git", ["ls-tree", "-r", "HEAD"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  const linhas = arvore.split("\n").filter(l => l && !FORA.test(l.split("\t")[1] || ""));
  return createHash("sha256").update(linhas.join("\n")).digest("hex").slice(0, 10);
}

const c = carimbo();
if (!c) { console.error("::error::carimbo vazio"); process.exit(1); }
const arqSw = join(site, "sw.js"), arqIndex = join(site, "index.html");
let sw = readFileSync(arqSw, "utf8"), index = readFileSync(arqIndex, "utf8");
const base = (sw.match(/const CACHE = "([^"]+)"/) || [])[1], baseApp = (index.match(/APP_CACHE = "([^"]+)"/) || [])[1];
if (!base || !baseApp) { console.error("::error::CACHE (sw.js) ou APP_CACHE (index.html) não encontrado."); process.exit(1); }
if (base !== baseApp) { console.error(`::error::sw.js (${base}) e index.html (${baseApp}) usam caches diferentes.`); process.exit(1); }
const nome = `${base.replace(/-[0-9a-f]{6,16}$/, "")}-${c}`;
sw = sw.replace(`const CACHE = "${base}"`, `const CACHE = "${nome}"`);
index = index.split(`APP_CACHE = "${base}"`).join(`APP_CACHE = "${nome}"`);
writeFileSync(arqSw, sw); writeFileSync(arqIndex, index);
console.log(`ok: cache do app = ${nome}`);
