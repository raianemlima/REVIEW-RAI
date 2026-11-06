// Apostila DPE/AM: conversor Markdown -> e-book do Aprofundamento, mapa dos assuntos do Cronograma e botão "Ler o resumo".
// O repositório é público: aqui só há texto fictício. A apostila de verdade nunca entra no Git, só o .bin selado.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test } from "node:test";
import vm from "node:vm";
import { JSDOM } from "jsdom";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const run = promisify(execFile);
const conversor = join(raiz, "ferramentas/conteudo/dpeam/apostila_para_ebook.py");
const arquivoMapa = join(raiz, "ferramentas/conteudo/dpeam/mapa-apostila.json");

async function converter(md, mapa, perfil = "apostila") {
  const pasta = await mkdtemp(join(tmpdir(), "apostila-"));
  await writeFile(join(pasta, "a.md"), md);
  const args = ["-I", conversor, "--perfil", perfil];
  if (mapa) { await writeFile(join(pasta, "m.json"), JSON.stringify(mapa)); args.push("--mapa", join(pasta, "m.json")); }
  try {
    const r = await run("python3", [...args, join(pasta, "a.md"), join(pasta, "o.json")]);
    return { ok: true, stdout: r.stdout, ebook: JSON.parse(await readFile(join(pasta, "o.json"), "utf8")) };
  } catch (e) { return { ok: false, stderr: String(e.stderr || e.message), stdout: String(e.stdout || "") }; }
}

const SINTETICO = `<img src="https://exemplo.invalid/logo.png" style="height:64px;margin-right:32px"/>

# Apostila fictícia — Teste

## Subtítulo fictício

Introdução fictícia com nota.[^1_3] E duas notas juntas.[^1_9][^1_11]

<span style="display:none">[^1_3][^1_9][^1_11]</span>

> Nota fictícia em citação.

______________________________________________________________________

## Capítulo Um

Abertura do capítulo um.

### Seção 1.1

Texto \\& mais texto com 100\\% e \\_sublinhado\\_ e \\*asterisco\\*.

| Coluna A | Coluna B |
| :-- | :-- |
| a \\| b | c |

### Seção 1.2

- primeiro item
- segundo item

______________________________________________________________________

## Capítulo Dois

### Seção 2.1

Texto do capítulo dois.

<div align="center">⁂</div>

[^1_3]: https://exemplo.invalid/a
[^1_9]: https://exemplo.invalid/b?x=1\\&y=2
[^1_11]: https://exemplo.invalid/c\\_d
`;
const MAPA = { edital: "ed-ficticio", itens: { d001_t001: { cap: "Capítulo Um", titulo: null }, d001_t002: { cap: "Capítulo Um", titulo: "Seção 1.2" }, d001_t003: { cap: "Capítulo Dois", titulo: null } } };

test("o conversor entrega o e-book do Aprofundamento: capítulos, apresentação com aviso, notas e fontes", async () => {
  const r = await converter(SINTETICO, MAPA);
  assert.ok(r.ok, r.stderr);
  const e = r.ebook;
  assert.equal(e.id, "dpeam-apostila-cg");
  assert.equal(e.disc, "pi");
  assert.equal(e.grupo, "Apostila DPE/AM");
  assert.equal(e.subtitulo, "Subtítulo fictício");
  assert.deepEqual(e.caps.map(c => c.t), ["Apresentação", "Capítulo Um", "Capítulo Dois", "Fontes consultadas"]);
  assert.deepEqual(e.caps.map(c => c.id), ["c1", "c2", "c3", "c4"]);
  const [apres, um, dois, fontes] = e.caps.map(c => c.md);
  assert.match(apres, /^> \*\*Aviso do app/, "o aviso do app vem primeiro");
  assert.match(apres, /item 13\.2/);
  assert.match(apres, /Introdução fictícia com nota\.\[3\] E duas notas juntas\.\[9, 11\]/);
  assert.match(apres, /Nota fictícia em citação\./);
  assert.match(um, /^Abertura do capítulo um\./);
  assert.match(um, /^## Seção 1\.1$/m, "### do original vira ## (h3 no app)");
  assert.match(um, /100% e _sublinhado_ e ∗asterisco∗/, "escapes de Markdown resolvidos; asterisco literal vira ∗");
  assert.match(um, /\| a \/ b \| c \|/, "barra escapada em célula vira /");
  assert.match(um, /^\| --- \| --- \|$/m, "o renderizador do app só reconhece separador de tabela com 3 ou mais traços");
  assert.doesNotMatch(um, /:--/);
  assert.match(dois, /^## Seção 2\.1$/m);
  assert.match(fontes, /^- \[3\] https:\/\/exemplo\.invalid\/a$/m);
  assert.match(fontes, /^- \[9\] https:\/\/exemplo\.invalid\/b\?x=1&y=2$/m);
  assert.match(fontes, /^- \[11\] https:\/\/exemplo\.invalid\/c_d$/m);
  assert.ok(fontes.indexOf("[3]") < fontes.indexOf("[9]") && fontes.indexOf("[9]") < fontes.indexOf("[11]"), "ordem numérica");
  const tudo = JSON.stringify(e);
  for (const proibido of ["[^", "<img", "<span", "<div", "⁂", "exemplo.invalid/logo", "____"]) assert.ok(!tudo.includes(proibido), `sobrou ${proibido}`);
  assert.deepEqual(e.editais, { "ed-ficticio": { d001_t001: [1, 0, 1], d001_t002: [1, 1, 1], d001_t003: [2, 0, 1] } });
});

test("o conversor recusa mapa que não acha capítulo ou título, capítulo sem título e nota sem definição", async () => {
  const semCap = await converter(SINTETICO, { edital: "x", itens: { d001_t001: { cap: "Capítulo Inexistente", titulo: null } } });
  assert.equal(semCap.ok, false);
  assert.match(semCap.stderr, /Capítulo Inexistente/);
  const semTitulo = await converter(SINTETICO, { edital: "x", itens: { d001_t001: { cap: "Capítulo Um", titulo: "Seção Inexistente" } } });
  assert.equal(semTitulo.ok, false);
  assert.match(semTitulo.stderr, /Seção Inexistente/);
  const semHeading = await converter(SINTETICO.replace("### Seção 2.1\n\n", ""), MAPA);
  assert.equal(semHeading.ok, false);
  assert.match(semHeading.stderr, /Capítulo Dois/);
  const semNota = await converter(SINTETICO.replace("[^1_3]: https://exemplo.invalid/a\n", ""), MAPA);
  assert.equal(semNota.ok, false);
  assert.match(semNota.stderr, /nota.*3/i);
});

const QUADROS = `# Quadros fictícios

## Subtítulo dos quadros fictícios

Raiane, os quadros abaixo são fictícios. Segunda frase da abertura.

## 1. Primeiro quadro fictício

| Coluna A | Coluna B |
| :-- | :-- |
| a1 | b1 |
| a2 | b2 |

Base: fonte fictícia.

## 2. Segundo quadro fictício

| X | Y | Z |
| :-- | :-- | :-- |
| 1 | 2 | 3 |

## Como usar estes quadros

Cubra as colunas e reconstrua.
`;

test("o conversor também entrega os quadros comparativos: um capítulo por quadro, sem nome pessoal, sem mapa e sem fontes", async () => {
  const r = await converter(QUADROS, null, "quadros");
  assert.ok(r.ok, r.stderr);
  const e = r.ebook;
  assert.equal(e.id, "dpeam-quadros");
  assert.equal(e.titulo, "Quadros comparativos DPE/AM");
  assert.equal(e.grupo, "Apostila DPE/AM");
  assert.equal(e.disc, "pi");
  assert.equal(e.subtitulo, "Subtítulo dos quadros fictícios");
  assert.deepEqual(e.caps.map(c => c.t), ["Apresentação", "1. Primeiro quadro fictício", "2. Segundo quadro fictício", "Como usar estes quadros"]);
  assert.equal("editais" in e, false, "os quadros não competem com a apostila pelo botão do Cronograma");
  const [apres, q1, q2] = e.caps.map(c => c.md);
  assert.match(apres, /^> \*\*Aviso do app/);
  assert.doesNotMatch(apres, /Fontes consultadas/, "sem notas, o aviso não manda ver as fontes");
  assert.match(apres, /^Os quadros abaixo são fictícios\./m, "o vocativo pessoal sai da abertura");
  assert.doesNotMatch(JSON.stringify(e), /Raiane/);
  assert.match(q1, /^\| Coluna A \| Coluna B \|$/m);
  assert.match(q1, /^\| a2 \| b2 \|$/m);
  assert.match(q1, /Base: fonte fictícia\./);
  assert.match(q2, /^\| 1 \| 2 \| 3 \|$/m);
});

test("o conversor entrega o terceiro e-book, LC nº 80/1994 × DPE-AM, pelo perfil lc80", async () => {
  const r = await converter(QUADROS, null, "lc80");
  assert.ok(r.ok, r.stderr);
  assert.equal(r.ebook.id, "dpeam-lc80");
  assert.equal(r.ebook.titulo, "LC nº 80/1994 e a DPE-AM");
  assert.equal(r.ebook.grupo, "Apostila DPE/AM");
  assert.equal(r.ebook.disc, "pi");
  assert.equal("editais" in r.ebook, false);
});

test("o conversor recusa tabela com número de colunas diferente do cabeçalho (erro de transcrição)", async () => {
  const torta = await converter(QUADROS.replace("| a2 | b2 |", "| a2 | b2 | c2 |"), null, "quadros");
  assert.equal(torta.ok, false);
  assert.match(torta.stderr, /colunas/i);
  assert.match(torta.stderr, /1\. Primeiro quadro fictício/);
});

// ---------- mapa real contra o catálogo do Cronograma ----------
function catalogo() {
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(readFileSync(join(raiz, "arquivos/cronograma-conteudo.js"), "utf8"), ctx);
  return ctx.window.DPE_CONTEUDOS_EDITAIS["am-2026-servidor"];
}
const ESPERADO = {
  d002_t001: /Constituição Federal \(arts\. 5º, 37 e 134\)/, d002_t002: /Lei Complementar Federal nº 80\/1994/, d002_t003: /Emenda Constitucional nº 45\/2004/,
  d002_t004: /Emenda Constitucional nº 80\/2014/, d002_t005: /Constituição do Estado do Amazonas/, d002_t006: /Lei Complementar n\.º 01\/1990/,
  d002_t007: /Lei n\.º 1\.762\/1986/, d002_t008: /Lei n\.º 4\.077\/2014/, d002_t009: /Demais normas estaduais/,
  d003_t001: /Fundamentos Constitucionais/, d003_t002: /Organização da Defensoria Pública do Amazonas/, d003_t003: /Atuação Institucional/,
  d003_t004: /Princípios Institucionais e Atuação Extrajudicial/, d003_t005: /Ética Institucional/, d003_t006: /Direito Antidiscriminatório/,
  d003_t007: /Justiça social, inclusão social e participação/, d004_t006: /funções essenciais à Justiça/,
};

test("o mapa da apostila liga cada assunto certo do edital DPE/AM: 16 de Conhecimentos Gerais e o item 6 de Constitucional", () => {
  assert.ok(existsSync(arquivoMapa), "mapa-apostila.json precisa existir");
  const mapa = JSON.parse(readFileSync(arquivoMapa, "utf8"));
  assert.equal(mapa.edital, "am-2026-servidor");
  assert.deepEqual(Object.keys(mapa.itens).sort(), Object.keys(ESPERADO).sort());
  const topicos = Object.fromEntries(catalogo().disciplinas.flatMap(d => d.topicos.map(t => [t.id, t])));
  for (const [id, re] of Object.entries(ESPERADO)) {
    assert.ok(topicos[id], `${id} não existe no catálogo`);
    assert.match(topicos[id].texto, re, `${id} aponta para o assunto errado`);
    assert.equal(typeof mapa.itens[id].cap, "string");
    assert.ok(mapa.itens[id].titulo === null || typeof mapa.itens[id].titulo === "string");
  }
  assert.deepEqual(Object.keys(mapa.itens).filter(id => id.startsWith("d002_")).length, 9, "os 9 assuntos de Legislação da Defensoria");
  assert.deepEqual(Object.keys(mapa.itens).filter(id => id.startsWith("d003_")).length, 7, "os 7 de Conhecimentos Jurídicos e Institucionais");
});

// ---------- ponta a ponta: mapa real + apostila sintética com os mesmos títulos -> botão no Cronograma ----------
function esqueleto(mapa) {
  const caps = new Map();
  for (const { cap, titulo } of Object.values(mapa.itens)) { if (!caps.has(cap)) caps.set(cap, new Set()); caps.get(cap).add(titulo || "Visão geral"); }
  let md = "# Apostila fictícia\n\n## Subtítulo fictício\n\nIntrodução fictícia.\n\n";
  for (const [cap, titulos] of caps) { md += `## ${cap}\n\nAbertura fictícia.\n\n`; for (const t of titulos) md += `### ${t}\n\nTexto fictício de ${t}.\n\n`; }
  return md;
}
const html = readFileSync(join(raiz, "index.html"), "utf8");
const app = readFileSync(join(raiz, "app-src.txt"), "utf8").replace(/\nboot\(\);\s*$/, "\n");
const motorStart = html.indexOf("// Motor de revisão:");
const fsrs = html.slice(motorStart, html.indexOf("</script>", motorStart));
const fontes = ["cronograma-pesos.js", "cronograma-taxonomia.js", "cronograma-conteudo.js", "cronograma-motor.js", "cronograma.js"].map(f => readFileSync(join(raiz, "arquivos", f), "utf8"));
function ambiente(ebooks) {
  const dom = new JSDOM('<!doctype html><html><body><header><button id="goBusca"></button><button id="goAjustes"></button><span id="save"></span><nav id="tabs"></nav></header><main id="main"></main></body></html>', { url: "https://fixture.invalid/", runScripts: "outside-only", pretendToBeVisual: true });
  dom.window.scrollTo = () => {}; dom.window.fetch = () => { throw Error("Rede bloqueada"); };
  dom.window.HTMLElement.prototype.scrollIntoView = function () { dom.window.__rolou = this.id; };
  const run = s => vm.runInContext(s, dom.getInternalVMContext());
  run(`const DECK={versao:"fixture",disciplinas:[{id:"dc",nome:"Direito Constitucional",curto:"Constitucional",peso:1}],cartoes:[],leiseca:[],ebooks:${JSON.stringify(ebooks)}};`);
  run(fsrs); run(app); run('S.mode="local";S.ajustes.metaOn=false;S.ajustes.onboard=true;S.ajustes.minutos=10;S.ajustes.metaDiaria=10;ensureAj();'); fontes.forEach(run);
  run('go("cronograma")');
  const d = dom.window.document;
  return { dom, d, run, close: () => dom.window.close() };
}

test("Cronograma: assunto do edital DPE/AM ligado à apostila ganha o botão que abre o capítulo no título certo", async () => {
  const mapa = JSON.parse(readFileSync(arquivoMapa, "utf8"));
  const r = await converter(esqueleto(mapa), mapa);
  assert.ok(r.ok, r.stderr);
  const eb = r.ebook;
  assert.equal(Object.keys(eb.editais["am-2026-servidor"]).length, 17);
  const a = ambiente([eb]);
  try {
    const ev = n => new a.dom.window.Event(n, { bubbles: true });
    const ed = a.d.querySelector("#crEdital"); ed.value = "am-2026-servidor"; ed.dispatchEvent(ev("change"));
    a.d.querySelectorAll("[data-cr-subject]").forEach(x => { x.checked = x.dataset.crSubject === "legislacao_defensoria"; x.dispatchEvent(ev("change")); });
    a.d.querySelector("#crForm").dispatchEvent(new a.dom.window.Event("submit", { bubbles: true, cancelable: true }));
    a.run("S.ajustes.cronograma.dias=[1,2,3,4,5,6,7];");
    a.run("renderHoje()");
    const btn = [...a.d.querySelectorAll("#cronogramaHoje [data-cr-ir]")].find(x => JSON.parse(x.dataset.crIr).v === "eb");
    assert.ok(btn, "botão Ler o resumo no bloco do dia");
    assert.match(btn.textContent, /Ler o resumo/);
    const o = JSON.parse(btn.dataset.crIr);
    const b = a.run('(()=>{const p=S.ajustes.cronograma,ag=window.DPE_CRONOGRAMA_MOTOR.gerarAgenda(p,0);const d=ag.dias[(dayToDate(today()).getDay()||7)-1];return d.blocos.find(b=>b.disciplinaId);})()');
    assert.match(b.topicoId, /^d002_t\d{3}$/, "o bloco do dia é de Legislação da Defensoria");
    const [ci, k] = eb.editais["am-2026-servidor"][b.topicoId];
    assert.deepEqual([o.id, o.ci, o.a], ["dpeam-apostila-cg", ci, `eb${ci}-${k}`]);
    btn.click();
    assert.equal(a.run("S.ebId"), "dpeam-apostila-cg");
    const alvo = a.d.getElementById(o.a);
    assert.ok(alvo, "o título existe no capítulo aberto");
    assert.equal(alvo.tagName, "H3");
  } finally { a.close(); }
});
