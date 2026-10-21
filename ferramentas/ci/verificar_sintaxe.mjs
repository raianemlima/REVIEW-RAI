// Verificação mínima sem dependências: compila os scripts do app como JavaScript e procura sobras de merge e depuração.
// Uso: node ferramentas/ci/verificar_sintaxe.mjs [pasta-raiz]
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const raiz = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
const IGNORAR = new Set(["node_modules", ".git"]);
const problemas = [];

function arquivos(pasta) {
  const saida = [];
  for (const nome of readdirSync(pasta)) {
    if (IGNORAR.has(nome)) continue;
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) saida.push(...arquivos(caminho));
    else saida.push(caminho);
  }
  return saida;
}

const todos = arquivos(raiz);
const rel = c => relative(raiz, c).split("\\").join("/");

// scripts clássicos (não módulos): o app-src.txt roda depois de "const DECK = ...;", então basta compilar
const scripts = todos.filter(c => {
  const r = rel(c);
  return r === "app-src.txt" || r === "gate.js" || r === "sw.js" || (r.startsWith("arquivos/") && r.endsWith(".js"));
});
for (const c of scripts) {
  try { new vm.Script(readFileSync(c, "utf8"), { filename: rel(c) }); }
  catch (e) { problemas.push(`${rel(c)}: erro de sintaxe: ${e.message}`); }
}

const TEXTO = /\.(js|mjs|html|css|txt|md|json|yml|ts|py|sql)$/;
const MARCADOR = /^(<{7}|>{7}) |^={7}$/m;
for (const c of todos) {
  const r = rel(c);
  if (!TEXTO.test(r) || r === "package-lock.json" || r.startsWith("ferramentas/conteudo/dados/")) continue;
  const texto = readFileSync(c, "utf8");
  if (MARCADOR.test(texto)) problemas.push(`${r}: marcador de conflito de merge`);
  if (scripts.includes(c) && /^\s*debugger\s*;?\s*$/m.test(texto)) problemas.push(`${r}: instrução debugger`);
}

if (problemas.length) {
  console.error(problemas.join("\n"));
  process.exit(1);
}
console.log(`ok: ${scripts.length} scripts compilados, sem marcadores de conflito`);
