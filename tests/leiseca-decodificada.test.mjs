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

// ---------- leitura dos trechos do PDF (sem PyMuPDF e sem PDF: o módulo é carregado com um pymupdf falso) ----------
// Caso real do EPD, art. 2º, § 1º: a última palavra de um trecho grifado termina SEM espaço, e o espaço seguinte é um
// trecho próprio só de espaço, na fonte normal. O extrator descartava esse trecho e saía "interdisciplinare".
async function lerPagina(trechos) {
  const py = `
import json, runpy, sys, types
sys.modules["pymupdf"] = types.ModuleType("pymupdf")
m = runpy.run_path(sys.argv[1], run_name="modulo")
class Pg:
    def __init__(self, blocos): self.b = blocos
    def get_text(self, modo): return {"blocks": self.b}
linhas = m["linhas"](m["spans_da_pagina"](Pg(json.loads(sys.argv[2]))))
print(json.dumps([{"txt": l["txt"], "margem": l["margem"], "spans": [s["t"] for s in l["s"]]} for l in linhas], ensure_ascii=False))`;
  const bloco = [{ lines: trechos.map(s => ({ spans: [{ text: s[0], font: s[1], size: s[2], color: s[3], bbox: [s[4], s[5], s[6], s[5] + 11] }] })) }];
  const { stdout } = await run("python3", ["-I", "-c", py, script, JSON.stringify(bloco)]);
  return JSON.parse(stdout);
}
const GRIFO = 0xbc3048, CINZA = 0x333333, NEGRITO = "Literata-Bold", NORMAL = "Literata-Regular";

test("o espaço que é um trecho próprio entre uma palavra grifada e a seguinte é mantido (interdisciplinar + e)", async () => {
  const linhas = await lerPagina([
    ["por ", NORMAL, 10.4, CINZA, 127.6, 149.8, 147.0],
    ["equipe ", NEGRITO, 10.4, GRIFO, 157.3, 149.8, 195.4],
    ["multiprofissional ", NEGRITO, 10.4, GRIFO, 205.7, 149.8, 300.6],
    ["e ", NEGRITO, 10.4, GRIFO, 310.9, 149.8, 318.8],
    ["interdisciplinar", NEGRITO, 10.4, GRIFO, 329.1, 149.8, 413.8],
    [" ", NORMAL, 10.4, CINZA, 413.8, 149.8, 415.9],
    ["e", NORMAL, 10.4, CINZA, 426.1, 149.8, 431.5],
  ]);
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].txt, "por equipe multiprofissional e interdisciplinar e");
});

test("trecho só de espaço fora do texto da lei (margem, rodapé, outras fontes) continua descartado", async () => {
  const linhas = await lerPagina([
    [" ", "ArchivoSemiBold-Regular", 9, CINZA, 40, 200, 42],          // margem esquerda: não pode virar linha vazia
    ["Texto da lei.", NORMAL, 10.4, CINZA, 70, 200.2, 140],
    [" ", NORMAL, 10.4, CINZA, 70, 820, 72],                          // rodapé (y0 > 805)
    [" ", "Archivo-Regular", 8, CINZA, 300, 300, 302],               // fonte que não é a do texto da lei
  ]);
  assert.deepEqual(linhas.map(l => l.txt), ["Texto da lei."]);
});

test("acento decomposto (letra + acento combinante) sai composto (NFC), como o resto do texto e as buscas do app esperam", async () => {
  const linhas = await lerPagina([["pessoas idôneas e informações", NEGRITO, 10.4, GRIFO, 70, 300, 300]]);
  assert.equal(linhas[0].txt, "pessoas idôneas e informações");
  assert.equal(linhas[0].txt, linhas[0].txt.normalize("NFC"));
});
