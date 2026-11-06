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

// Caso real da CF, art. 7º, XIII: a emenda que deu a redação aparece como uma etiqueta em fonte pequena ("EC 141/2026"),
// colada ao texto sem espaço, e saía "EC 141/2026duração do trabalho".
test("a etiqueta da emenda (EC 141/2026) não cola na primeira palavra do dispositivo", async () => {
  const linhas = await lerPagina([
    ["XIII - ", "ArchivoSemiBold-Bold", 8.9, CINZA, 70, 200, 95],
    ["EC 141/2026", "ArchivoSemiBold-Bold", 5.8, 0x17785f, 96, 200, 130],
    ["duração do trabalho normal", NORMAL, 10.4, CINZA, 130, 200, 260],
  ]);
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].txt, "XIII - EC 141/2026 duração do trabalho normal");
});

test("etiqueta de emenda que já vem seguida de espaço não ganha espaço duplo, e texto parecido com etiqueta fora do padrão não é alterado", async () => {
  const comEspaco = await lerPagina([
    ["EC 139/2026", "ArchivoSemiBold-Bold", 5.8, 0x17785f, 96, 200, 130],
    [" O controle externo", NORMAL, 10.4, CINZA, 130, 200, 260],
  ]);
  assert.equal(comEspaco[0].txt, "EC 139/2026 O controle externo");
  const foraDoPadrao = await lerPagina([
    ["ECO 10/2026", "ArchivoSemiBold-Bold", 5.8, 0x17785f, 96, 200, 130],
    ["texto", NORMAL, 10.4, CINZA, 130, 200, 260],
  ]);
  assert.equal(foraDoPadrao[0].txt, "ECO 10/2026texto");
});

// Caso real da CF (art. 183 e art. 224): o bloco "COMO ESTÁ CAINDO · questões recentes do Vade Mecum de Questões" vem
// depois do bloco de assertivas, não tem tratamento próprio e seu texto era anexado à última assertiva.
async function extrair(trechos) {
  const py = `
import json, runpy, sys, types
sys.modules["pymupdf"] = types.ModuleType("pymupdf")
m = runpy.run_path(sys.argv[1], run_name="modulo")
class Pg:
    def __init__(self, blocos): self.b = blocos
    def get_text(self, modo): return {"blocks": self.b}
e = m["Extrator"](("cf-dls", "Constituição Federal · com grifos", "CF", "@constitucional"))
for l in m["linhas"](m["spans_da_pagina"](Pg(json.loads(sys.argv[2])))):
    e.linha(l)
e.fecha_art()
print(json.dumps(e.saida(), ensure_ascii=False))`;
  const bloco = [{ lines: trechos.map(s => ({ spans: [{ text: s[0], font: s[1], size: s[2], color: s[3], bbox: [s[4], s[5], s[6], s[5] + 11] }] })) }];
  const { stdout } = await run("python3", ["-I", "-c", py, script, JSON.stringify(bloco)]);
  return JSON.parse(stdout);
}
const SEMIBOLD = "ArchivoSemiBold-ExtraBold";
const cabecalhoCaindo = y => [["C O M O E S TÁ C A I N D O", SEMIBOLD, 6.0, 0x2f5d62, 81, y, 160], ["questões recentes do Vade Mecum de Questões, com gabarito comentado", "ArchivoSemiBold-Medium", 6.0, 0x6b6b6b, 168, y, 360]];

test("o bloco 'Como está caindo' não é anexado à última assertiva, e as assertivas do artigo continuam saindo inteiras", async () => {
  const lei = await extrair([
    ["A R T.", SEMIBOLD, 6.0, 0x6a625b, 40, 50, 60],
    ["224", "Literata-SemiBold", 12, CINZA, 40, 62, 60],
    ["O Congresso Nacional instituirá o Conselho.", NORMAL, 10.4, CINZA, 70, 54, 300],
    ["D E C O R A N D O A D O U T R I N A D A S B A N C A S", SEMIBOLD, 6.0, 0x2f6b3a, 81, 157, 240],
    ["■", "LiberationSerif-Bold", 6.3, 0x2f6b3a, 81, 166, 85],
    [" FGV 2026 - Juiz de Direito (TJ-PE)", "ArchivoSemiBold-Bold", 6.3, 0x2f6b3a, 84, 166, 240],
    ["O art. 224 veicula norma de eficácia limitada.", "Literata-Regular", 8.4, CINZA, 81, 173, 300],
    ...cabecalhoCaindo(263).map(s => s),
    ["Segundo a Constituição, a publicação de veículo impresso depende de licença.", "Literata-Regular", 8.4, CINZA, 81, 285, 400],
    ["GABARITO: FALSO", SEMIBOLD, 5.7, 0xc4161c, 87, 317, 130],
  ]);
  const itens = lei.grupos.flatMap(g => g.itens);
  assert.equal(itens.filter(i => i.a !== undefined).length, 1);
  const qs = itens.filter(i => i.q !== undefined);
  assert.equal(qs.length, 1);
  assert.equal(qs[0].q, "O art. 224 veicula norma de eficácia limitada.");
  assert.doesNotMatch(JSON.stringify(lei), /C O M O E S T|Vade Mecum|GABARITO/);
});

// Caso real da CF (art. 156-A), do CC (art. 421-A, 1.025) e do CPC: o número do artigo, na margem, encolhe para caber
// ("1º" em 12 pt, "156-A" em 8,2 pt, "1.240-A" em 6,8 pt). O extrator só aceitava 10 pt ou mais, então o artigo perdia
// o número (o leitor não mostra item sem número) e suas assertivas ficavam soltas.
async function artigoComNumero(numero, tamanho) {
  const lei = await extrair([
    ["A R T.", SEMIBOLD, 6.2, 0xad5a0a, 38, 124, 60],
    [numero, "Literata-SemiBoldItalic", tamanho, 0x1f7396, 36, 130, 60],
    ["Lei complementar instituirá o imposto.", NORMAL, 10.4, CINZA, 70, 126, 300],
    ["D E C O R A N D O A D O U T R I N A D A S B A N C A S", SEMIBOLD, 6.0, 0x2f6b3a, 81, 157, 240],
    ["■", "LiberationSerif-Bold", 6.3, 0x2f6b3a, 81, 166, 85],
    [" FGV 2026 - Juiz de Direito (TJ-PE)", "ArchivoSemiBold-Bold", 6.3, 0x2f6b3a, 84, 166, 240],
    ["O imposto é compartilhado.", "Literata-Regular", 8.4, CINZA, 81, 173, 300],
  ]);
  return lei.grupos.flatMap(g => g.itens);
}
for (const [numero, tamanho] of [["1º", 12.0], ["156-A", 8.2], ["1.025", 8.8], ["1.240-A", 6.8], ["54-A", 9.9]]) {
  test(`o número do artigo ${numero} (${tamanho} pt na margem) é mantido, e a assertiva fica dentro do artigo`, async () => {
    const itens = await artigoComNumero(numero, tamanho);
    const arts = itens.filter(i => i.x !== undefined);
    assert.equal(arts.length, 1);
    assert.equal(arts[0].a, numero.replace("º", ""));
    assert.match(arts[0].x, new RegExp("^Art\\. " + numero.replace(".", "\\.") + (numero.includes("º") ? "" : "\\.") + " Lei complementar"));
    assert.equal(itens.filter(i => i.q !== undefined).length, 1);
    assert.equal(itens.indexOf(arts[0]), 0, "a assertiva vem depois do artigo, não solta");
  });
}

test("texto da margem que não parece número de artigo não vira número (controle negativo)", async () => {
  const itens = await artigoComNumero("DOS DIREITOS E DEVERES", 8.2);
  assert.equal(itens.filter(i => i.a !== undefined).length, 0);
});
