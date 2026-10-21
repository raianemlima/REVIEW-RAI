import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(raiz, "ferramentas/conteudo/estudo_md.py");
const py = (...args) => spawnSync("python3", [script, ...args], { encoding: "utf8" });
const ler = p => JSON.parse(readFileSync(p, "utf8"));

// Conteúdo 100% fictício: o repositório é público e o estudo real nunca entra aqui.
const MD = `# Estudo fictício

# Questões comentadas

## Questão 1

**A água do mar é salgada.**

**Certo.** Contém sais dissolvidos. [Fonte inventada](https://exemplo.invalid/a) [3]

### Questão 2

**O sol gira em torno da terra.**

**Errado:** é o contrário. Veja o *modelo* heliocêntrico.[4][5]

## Questão 3

**A água do mar é salgada.**

**Certo.** Repetida: não deve gerar outro cartão.

# Pegadinhas

| Afirmação | Avaliação |
|---|---|
| "Toda ave voa." | Errada: pinguins não voam. |
| Gatos são mamíferos. | **Correta.** |
| O ouro é um metal. | **Certa:** é um elemento metálico. |
| Sem veredito aqui. | talvez |

| Outra | Tabela |
|---|---|
| x | Errada: não é a tabela de pegadinhas |
`;

function cartoes(pasta, extra = []) {
  writeFileSync(join(pasta, "estudo.md"), MD);
  const r = py("cartoes", join(pasta, "estudo.md"), "--id", "fic", "--tema", "Tema fictício", "--saida", pasta, ...extra);
  assert.equal(r.status, 0, r.stderr);
  return ler(join(pasta, "fic.json"));
}

test("gera cartões Certo ou errado de questões e de tabelas de pegadinhas", () => {
  const pasta = mkdtempSync(join(tmpdir(), "estudo-"));
  try {
    const c = cartoes(pasta, ["--abr", "RN", "--disc", "dh"]);
    assert.deepEqual(c.map(x => x.id), ["ps-fic-q01", "ps-fic-q02", "ps-fic-p01", "ps-fic-p02", "ps-fic-p03"]);
    assert.deepEqual(c.map(x => x.verso), ["CERTO", "ERRADO", "ERRADO", "CERTO", "CERTO"]);
    assert.equal(c[0].frente, "Certo ou errado: A água do mar é salgada.");
    assert.equal(c[0].porque, "Contém sais dissolvidos. Fonte inventada");
    assert.equal(c[1].porque, "É o contrário. Veja o modelo heliocêntrico.");
    assert.equal(c[2].frente, "Certo ou errado: Toda ave voa.");
    assert.equal(c[2].porque, "Pinguins não voam.");
    assert.equal(c[3].porque, "");
    for (const x of c) {
      assert.equal(x.tipo, "pegadinha"); assert.equal(x.disc, "dh"); assert.equal(x.abr, "RN"); assert.equal(x.tema, "Tema fictício");
      assert.ok(x.peso >= 1 && x.inc >= 1);
      assert.doesNotMatch(JSON.stringify(x), /\*\*|\]\(|\[\d+\]/);
    }
  } finally { rmSync(pasta, { recursive: true, force: true }); }
});

test("o verso começa por CERTO ou ERRADO, como o app exige para corrigir a resposta", () => {
  const pasta = mkdtempSync(join(tmpdir(), "estudo-"));
  try {
    for (const x of cartoes(pasta)) assert.match(x.verso, /^(CERTO|ERRADO)$/);
    const app = readFileSync(join(raiz, "app-src.txt"), "utf8");
    assert.match(app, /function correctCE\(c\) \{ return \/\^\\s\*CERTO\/i\.test\(c\.verso\)/);
  } finally { rmSync(pasta, { recursive: true, force: true }); }
});

test("arquivo sem questões nem pegadinhas é recusado", () => {
  const pasta = mkdtempSync(join(tmpdir(), "estudo-"));
  try {
    writeFileSync(join(pasta, "vazio.md"), "# Título\n\nSó texto.\n");
    const r = py("cartoes", join(pasta, "vazio.md"), "--id", "v", "--tema", "T", "--saida", pasta);
    assert.notEqual(r.status, 0);
  } finally { rmSync(pasta, { recursive: true, force: true }); }
});

function baralho(pasta) {
  const b = join(pasta, "baralho");
  mkdirSync(join(b, "cartoes"), { recursive: true });
  writeFileSync(join(b, "deck_resto.json"), JSON.stringify({ versao: "t", disciplinas: [{ id: "dh" }, { id: "pi" }] }));
  writeFileSync(join(b, "cartoes", "dh.json"), JSON.stringify([{ id: "x-1", disc: "dh", tema: "T", frente: "f", verso: "v" }]));
  writeFileSync(join(b, "cartoes", "pi.json"), JSON.stringify([{ id: "pi-1", disc: "pi", tema: "T", frente: "f", verso: "v" }]));
  return b;
}

test("inserir acrescenta, é idempotente e atualiza pelo id sem duplicar", () => {
  const pasta = mkdtempSync(join(tmpdir(), "estudo-"));
  try {
    const c = cartoes(pasta), b = baralho(pasta), arq = join(pasta, "fic.json");
    let r = py("inserir", b, arq); assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /5 novos, 0 atualizados, 6 no total/);
    r = py("inserir", b, arq); assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /0 novos, 5 atualizados, 6 no total/);
    c[0].porque = "editado"; writeFileSync(arq, JSON.stringify(c));
    r = py("inserir", b, arq); assert.equal(r.status, 0, r.stderr);
    const dh = ler(join(b, "cartoes", "dh.json"));
    assert.equal(dh.length, 6); assert.equal(new Set(dh.map(x => x.id)).size, 6);
    assert.equal(dh.find(x => x.id === "ps-fic-q01").porque, "editado");
    assert.equal(dh[0].id, "x-1", "os cartões que já existiam continuam na frente");
  } finally { rmSync(pasta, { recursive: true, force: true }); }
});

test("inserir recusa disciplina que o baralho não tem e id repetido em outra disciplina", () => {
  const pasta = mkdtempSync(join(tmpdir(), "estudo-"));
  try {
    const c = cartoes(pasta), b = baralho(pasta);
    writeFileSync(join(pasta, "zz.json"), JSON.stringify([{ ...c[0], disc: "zz" }]));
    let r = py("inserir", b, join(pasta, "zz.json")); assert.notEqual(r.status, 0); assert.match(r.stderr, /disciplina desconhecida/);
    writeFileSync(join(pasta, "dup.json"), JSON.stringify([{ ...c[0], id: "pi-1", disc: "dh" }]));
    r = py("inserir", b, join(pasta, "dup.json")); assert.notEqual(r.status, 0); assert.match(r.stderr, /id já existe em outra disciplina/);
    writeFileSync(join(pasta, "vazio.json"), JSON.stringify([{ ...c[0], frente: "" }]));
    r = py("inserir", b, join(pasta, "vazio.json")); assert.notEqual(r.status, 0); assert.match(r.stderr, /sem 'frente'/);
  } finally { rmSync(pasta, { recursive: true, force: true }); }
});

test("o estudo e os cartões gerados ficam fora do Git (o repositório é público)", () => {
  for (const caminho of ["ferramentas/conteudo/dados/ebooks/fonte/qualquer.md", "ferramentas/conteudo/dados/ebooks/qualquer.json", "ferramentas/conteudo/dados/ebooks/cartoes/qualquer.json"]) {
    const r = spawnSync("git", ["check-ignore", "-q", caminho], { cwd: raiz });
    assert.equal(r.status, 0, `${caminho} precisa estar no .gitignore`);
  }
});
