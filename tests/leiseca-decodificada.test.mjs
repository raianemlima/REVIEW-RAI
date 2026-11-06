// Tabela de leis do extrator da lei seca grifada (ferramentas/conteudo/leiseca_decodificada.py).
// Lê a tabela real com ast, sem importar o PyMuPDF (o CI não o instala) e sem nenhum PDF: só títulos de arquivo.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test } from "node:test";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const run = promisify(execFile);
const script = join(raiz, "ferramentas/conteudo/leiseca_decodificada.py");

// Imita meta_de: a primeira linha da tabela cujo padrão aparece no título.
async function reconhecer(titulos) {
  const py = `
import ast, json, re, sys
arvore = ast.parse(open(sys.argv[1], encoding="utf-8").read())
leis = next(ast.literal_eval(n.value) for n in arvore.body if isinstance(n, ast.Assign) and n.targets[0].id == "LEIS")
saida = {"ids": [l[1] for l in leis], "discs": [l[4] for l in leis], "achados": {}}
for t in json.loads(sys.argv[2]):
    saida["achados"][t] = next((l[1] for l in leis if re.search(l[0], t, re.I)), None)
print(json.dumps(saida))`;
  const { stdout } = await run("python3", ["-I", "-c", py, script, JSON.stringify(titulos)]);
  return JSON.parse(stdout);
}

const TITULOS = {
  "Lei 9784-1999 Processo Administrativo - Legislação Decodificada 3 em 1 - Grifos com Cores": "l9784-dls",
  "Lei 8.987-1995 (Concessões) - Legislação Decodificada 3 em 1 - Grifos com cores": "l8987-dls",
  "Legislação Decodificada - Estatuto da Pessoa com Deficiência - Grifos com Cores": "epd-dls",
  "Legislação Decodificada - Estatuto da Pessoa Idosa - Grifos com Cores": "idoso-dls",
  // as que já existiam continuam sendo reconhecidas pela mesma linha
  "Lei 8429-1992 Improbidade - Legislação Decodificada 3 em 1 - Grifos com Cores": "lia-dls",
  "Lei 14133-2021 - Legislação Decodificada 3 em 1 - Grifos com Cores": "l14133-dls",
  "Lei 8112-1990 - Legislação Decodificada 3 em 1 - Grifos com Cores": "l8112-dls",
  "Código de Processo Civil - Legislação Decodificada 3 em 1 - Grifos com cores": "cpc-dls",
  "Código Civil - Legislação Decodificada 3 em 1 - Grifos com cores": "cc-dls",
};

test("o extrator reconhece a Lei 9.784 e a Lei 8.987 pelo título, sem tirar o reconhecimento das leis que já tinha", async () => {
  const r = await reconhecer(Object.keys(TITULOS));
  for (const [titulo, id] of Object.entries(TITULOS)) assert.equal(r.achados[titulo], id, titulo);
});

test("a tabela de leis tem ids únicos e cada disciplina é resolvida pelo nome canônico do baralho (@...)", async () => {
  const r = await reconhecer([]);
  assert.equal(new Set(r.ids).size, r.ids.length, "ids duplicados");
  assert.ok(r.ids.length >= 17, "as 15 antigas e as 2 novas");
  for (const d of r.discs) assert.match(d, /^@[a-zç ]+$/);
  assert.ok(r.ids.every(id => /^[a-z0-9]+-dls$/.test(id)));
});

// A Lei 9.784 já existe no leitor como texto oficial (leiseca-publica/l9784.json). A versão grifada precisa
// substituí-la na publicação; sem isso o leitor mostraria a mesma lei duas vezes.
test("a Lei 9.784 grifada substitui a versão pública (sem duplicar no leitor) e a Lei 8.987, que não tem versão pública, não substitui nada", async () => {
  const py = `
import ast, json, sys
arvore = ast.parse(open(sys.argv[1], encoding="utf-8").read())
print(json.dumps(next(ast.literal_eval(n.value) for n in arvore.body if isinstance(n, ast.Assign) and n.targets[0].id == "SUBSTITUI")))`;
  const { stdout } = await run("python3", ["-I", "-c", py, script]);
  const subst = JSON.parse(stdout);
  assert.deepEqual(subst["l9784-dls"], ["l9784"]);
  assert.deepEqual(subst["epd-dls"], ["l13146", "epcd"], "o EPD grifado tira o texto oficial (l13146) e a seleção antiga (epcd)");
  assert.equal("l8987-dls" in subst, false);
  const publica = join(raiz, "ferramentas/conteudo/dados/leiseca-publica/l9784.json");
  assert.ok(existsSync(publica), "a lei pública que a grifada substitui precisa existir");
  assert.equal(JSON.parse(readFileSync(publica, "utf8")).id, "l9784");
  assert.equal(existsSync(join(raiz, "ferramentas/conteudo/dados/leiseca-publica/l8987.json")), false);
  const epd = join(raiz, "ferramentas/conteudo/dados/leiseca-publica/l13146.json");
  assert.ok(existsSync(epd), "a lei pública que o EPD grifado substitui precisa existir");
  assert.equal(JSON.parse(readFileSync(epd, "utf8")).id, "l13146");
  // as substituições que já existiam continuam
  for (const [dls, antigas] of Object.entries({ "cdc-dls": ["cdc"], "idoso-dls": ["idoso"], "lmp-dls": ["lmp"], "cf-dls": ["cf"] })) assert.deepEqual(subst[dls], antigas);
});
