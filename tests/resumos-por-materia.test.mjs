import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync, readdirSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vm from "node:vm";
import { webcrypto as crypto, randomBytes } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { JSDOM } from "jsdom";
import { parDaSenha, selar, ehSelado } from "../ferramentas/ci/leiseca_selada.mjs";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(raiz, "ferramentas/ci/aplicar_ebooks.mjs");
const run = promisify(execFile);
const b64 = u => Buffer.from(u).toString("base64");

async function chaveDeck(senha, sal, it) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: sal, iterations: it, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function escreverDeck(pasta, senha, deck) {
  const sal = randomBytes(16), iv = randomBytes(12), it = 1000;
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await chaveDeck(senha, sal, it), gzipSync(Buffer.from(JSON.stringify(deck)))));
  const payload = { v: 2, z: "gzip", it, s: b64(sal), iv: b64(iv), ct: b64(ct) };
  await writeFile(join(pasta, "deck.enc"), JSON.stringify(payload));
  return payload;
}
async function lerDeck(pasta, senha) {
  const p = JSON.parse(await readFile(join(pasta, "deck.enc"), "utf8"));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(p.iv, "base64") }, await chaveDeck(senha, Buffer.from(p.s, "base64"), p.it), Buffer.from(p.ct, "base64"));
  return { payload: p, deck: JSON.parse(gunzipSync(Buffer.from(pt)).toString("utf8")) };
}
const ebookFicticio = (id, titulo = "Direito Fictício") => ({
  id, titulo, subtitulo: "Fixture", disc: "dc", grupo: "Resumos por matéria", atualizado: "2026-11-01",
  caps: [{ id: "c1", t: "Teoria fictícia", md: "## Assunto fictício\n\n*No edital: TJPB 1*\n\nResumo fictício.\n" }],
  editais: { "tjpb-2026": { d001_t001: [0, 0, 1] } },
});

test("aplicar_ebooks abre os e-books selados com a senha do app e troca pelo id, mantendo o sal do baralho", async () => {
  const pasta = await mkdtemp(join(tmpdir(), "ebooks-")), bins = join(pasta, "bins");
  await mkdir(bins);
  const senha = "senha-de-teste", publica = b64(parDaSenha(senha).publica);
  const antes = await escreverDeck(pasta, senha, { disciplinas: [], cartoes: [], ebooks: [{ id: "ce-x", titulo: "versão antiga", caps: [] }, { id: "dh", titulo: "DH", caps: [] }] });
  await writeFile(join(bins, "ce.bin"), selar(publica, gzipSync(Buffer.from(JSON.stringify({ ebooks: [ebookFicticio("ce-x"), ebookFicticio("ce-y", "Outro")] })))));
  const { stdout } = await run("node", [script, join(pasta, "index.html")], { env: { ...process.env, APP_SENHA: senha, EBOOKS_PASTA: bins } });
  assert.match(stdout, /ok: 2 e-book\(s\) do Aprofundamento no baralho \(1 novo\(s\), 1 atualizado\(s\)/);
  const { payload, deck } = await lerDeck(pasta, senha);
  assert.equal(payload.s, antes.s, "o sal não muda: quem já entrou continua abrindo offline");
  assert.deepEqual(deck.ebooks.map(e => e.id), ["ce-x", "dh", "ce-y"]);
  assert.equal(deck.ebooks[0].titulo, "Direito Fictício");
  assert.deepEqual(deck.ebooks[0].editais, { "tjpb-2026": { d001_t001: [0, 0, 1] } });
});

test("aplicar_ebooks sem senha, sem e-books ou com .bin de outra chave não mexe no baralho", async () => {
  const pasta = await mkdtemp(join(tmpdir(), "ebooks-")), bins = join(pasta, "bins");
  await mkdir(bins);
  const vazio = await run("node", [script, join(pasta, "index.html")], { env: { ...process.env, EBOOKS_PASTA: bins } });
  assert.match(vazio.stdout, /Nenhum e-book/);
  const outra = b64(parDaSenha("outra-senha").publica);
  await writeFile(join(bins, "ce.bin"), selar(outra, gzipSync(Buffer.from(JSON.stringify({ ebooks: [ebookFicticio("ce-x")] })))));
  const semSenha = await run("node", [script, join(pasta, "index.html")], { env: { ...process.env, APP_SENHA: "", EBOOKS_PASTA: bins } });
  assert.match(semSenha.stdout, /APP_SENHA não configurado/);
  const senha = "senha-de-teste";
  const antes = await escreverDeck(pasta, senha, { ebooks: [] });
  const r = await run("node", [script, join(pasta, "index.html")], { env: { ...process.env, APP_SENHA: senha, EBOOKS_PASTA: bins } });
  assert.match(r.stdout, /não abre com a senha atual/);
  assert.equal(JSON.parse(await readFile(join(pasta, "deck.enc"), "utf8")).ct, antes.ct, "baralho intacto");
});

test("os e-books do Aprofundamento no repositório estão selados (sem texto legível do material) e sem nome de curso no arquivo", () => {
  const pasta = join(raiz, "conteudo-cifrado"), bins = readdirSync(pasta).filter(f => f.endsWith(".bin")).sort();
  assert.deepEqual(bins, ["manual-direito-constitucional.bin", "manual-direito-processual-penal.bin", "resumos-por-materia.bin", "revisao-pontos-de-prova.bin"]);
  for (const f of bins) {
    const buf = readFileSync(join(pasta, f));
    assert.ok(ehSelado(buf), `${f} selado (LSX1)`);
    const txt = buf.toString("latin1");
    for (const w of ["Resumo", "edital", "Iuris", "IURIS", "Reta Final", "Direito", "Constitu", "Processo", "Capítulo"]) assert.ok(!txt.includes(w), `${f} não pode ter "${w}" legível`);
  }
  assert.match(readFileSync(join(raiz, ".github/workflows/pages.yml"), "utf8"), /aplicar_ebooks\.mjs _site\/index\.html/);
});

// ---------- app: Cronograma -> Aprofundamento ----------
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../app-src.txt", import.meta.url), "utf8").replace(/\nboot\(\);\s*$/, "\n");
const motorStart = html.indexOf("// Motor de revisão:");
const fsrs = html.slice(motorStart, html.indexOf("</script>", motorStart));
const fontes = ["cronograma-pesos.js", "cronograma-taxonomia.js", "cronograma-conteudo.js", "cronograma-motor.js", "cronograma.js"].map(f => readFileSync(new URL("../arquivos/" + f, import.meta.url), "utf8"));
function ambiente(ebooks) {
  const dom = new JSDOM('<!doctype html><html><body><header><button id="goBusca"></button><button id="goAjustes"></button><span id="save"></span><nav id="tabs"></nav></header><main id="main"></main></body></html>', { url: "https://fixture.invalid/", runScripts: "outside-only" });
  dom.window.scrollTo = () => {}; dom.window.fetch = () => { throw Error("Rede bloqueada"); };
  dom.window.HTMLElement.prototype.scrollIntoView = function () { dom.window.__rolou = this.id; };
  const run = s => vm.runInContext(s, dom.getInternalVMContext());
  run(`const DECK={versao:"fixture",disciplinas:[{id:"dc",nome:"Direito Constitucional",curto:"Constitucional",peso:1}],cartoes:[],leiseca:[],ebooks:${JSON.stringify(ebooks)}};`);
  run(fsrs); run(app); run('S.mode="local";S.ajustes.metaOn=false;S.ajustes.onboard=true;S.ajustes.minutos=10;S.ajustes.metaDiaria=10;ensureAj();'); fontes.forEach(run);
  run('go("cronograma")');
  const d = dom.window.document;
  const change = (s, v) => { const e = d.querySelector(s); e.value = v; e.dispatchEvent(new dom.window.Event("change", { bubbles: true })); };
  const submit = () => d.querySelector("#crForm").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
  return { dom, d, run, change, submit, close: () => dom.window.close() };
}
// e-book "Resumos por matéria" de fixture: um capítulo por disciplina do TJPB, um título por assunto; "sem" = assuntos sem resumo
function ebookDoEdital(sem, edital = "tjpb-2026") {
  const ctx = { window: {} }; vm.runInNewContext(fontes[2], ctx);
  const ed = ctx.window.DPE_CONTEUDOS_EDITAIS[edital], mapa = {}, caps = [];
  ed.disciplinas.forEach((d, ci) => {
    const com = d.topicos.filter(t => !sem.has(t.id));
    d.topicos.forEach(t => { mapa[t.id] = sem.has(t.id) ? null : [ci, com.indexOf(t), 1]; });
    caps.push({ id: "c" + (ci + 1), t: d.nome, md: com.map(t => `## ${t.titulo}\n\n*No edital: TJPB*\n\nResumo fictício de ${t.id}.\n`).join("\n") || "Sem resumos." });
  });
  return { id: "rm-fixture", titulo: "Matéria fictícia", subtitulo: "Resumos por assunto · TJPB", disc: "dc", grupo: "Resumos por matéria", atualizado: "2026-11-01", caps, editais: { [edital]: mapa } };
}

test("Cronograma: cada assunto com resumo ganha o botão que abre o e-book da matéria no ponto certo do Aprofundamento", async () => {
  const eb = ebookDoEdital(new Set());
  const a = ambiente([{ id: "outro", titulo: "Material antigo", subtitulo: "", disc: "dc", atualizado: "2026-01-01", caps: [{ id: "c1", t: "Cap", md: "Texto" }] }, eb]);
  try {
    a.change("#crEdital", "tjpb-2026"); a.submit(); a.run("S.ajustes.cronograma.dias=[1,2,3,4,5,6,7];");
    a.run("renderHoje()");
    const btn = [...a.d.querySelectorAll("#cronogramaHoje [data-cr-ir]")].find(x => JSON.parse(x.dataset.crIr).v === "eb");
    assert.ok(btn, "botão Ler o resumo no bloco do dia");
    assert.match(btn.textContent, /Ler o resumo/);
    assert.ok(btn.classList.contains("primary"), "é a ação principal do assunto");
    const o = JSON.parse(btn.dataset.crIr);
    const b = a.run('(()=>{const p=S.ajustes.cronograma,ag=window.DPE_CRONOGRAMA_MOTOR.gerarAgenda(p,0);const d=ag.dias[(dayToDate(today()).getDay()||7)-1];return d.blocos.find(b=>b.disciplinaId);})()');
    const [ci, k] = eb.editais["tjpb-2026"][b.topicoId];
    assert.deepEqual([o.id, o.ci, o.a], ["rm-fixture", ci, `eb${ci}-${k}`]);
    btn.click();
    assert.equal(a.run("S.tab"), "biblioteca");
    assert.equal(a.run("S.libView"), "ebooks");
    assert.equal(a.run("S.ebId"), "rm-fixture");
    const alvo = a.d.getElementById(o.a);
    assert.ok(alvo, "o assunto existe no capítulo aberto");
    assert.match(alvo.textContent, new RegExp(b.objeto.titulo.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await new Promise(r => setTimeout(r, 80));
    assert.equal(a.dom.window.__rolou, o.a, "rola até o assunto");
    assert.ok(alvo.classList.contains("eb-alvo"), "destaca o assunto");
    assert.equal(a.run("S.ebAncora"), null);
  } finally { a.close(); }
});

test("Cronograma: assunto sem resumo avisa, sem botão; edital sem e-book não mostra nada", () => {
  const ctx = { window: {} }; vm.runInNewContext(fontes[2], ctx);
  const todos = new Set(ctx.window.DPE_CONTEUDOS_EDITAIS["tjpb-2026"].disciplinas.flatMap(d => d.topicos.map(t => t.id)));
  const a = ambiente([ebookDoEdital(todos)]);
  try {
    a.change("#crEdital", "tjpb-2026"); a.submit(); a.run("S.ajustes.cronograma.dias=[1,2,3,4,5,6,7];"); a.run("renderHoje()");
    assert.ok(!a.d.querySelector('#cronogramaHoje [data-cr-ir*="\\"eb\\""]'));
    assert.match(a.d.querySelector("#cronogramaHoje [data-cr-resumo]").textContent, /Sem resumo deste assunto/);
    a.run('go("cronograma")'); a.change("#crEdital", "sc-2026");
    assert.equal(a.d.querySelectorAll("#crSemana [data-cr-resumo]").length, 0);
  } finally { a.close(); }
});

test("Aprofundamento: os resumos por matéria vêm primeiro, com a etiqueta do grupo", () => {
  const a = ambiente([{ id: "outro", titulo: "Material antigo", subtitulo: "", disc: "dc", atualizado: "2026-01-01", caps: [{ id: "c1", t: "Cap", md: "Texto" }] }, ebookDoEdital(new Set())]);
  try {
    a.run('S.libView="ebooks";S.ebId=null;go("biblioteca")');
    const cards = [...a.d.querySelectorAll(".eb-card")];
    assert.equal(cards.length, 2);
    assert.match(cards[0].textContent, /Matéria fictícia/);
    assert.match(cards[0].querySelector(".eb-grupo").textContent, /Resumos por matéria/);
    assert.match(cards[1].textContent, /Material antigo/);
  } finally { a.close(); }
});

test("Cronograma: o mesmo e-book da matéria serve a outro edital, e um e-book sem o resumo não esconde o que tem", () => {
  const ctx = { window: {} }; vm.runInNewContext(fontes[2], ctx);
  const todos = new Set(ctx.window.DPE_CONTEUDOS_EDITAIS["tjpb-2026"].disciplinas.flatMap(d => d.topicos.map(t => t.id)));
  const vazio = { ...ebookDoEdital(todos), id: "rm-vazio", titulo: "Outra matéria" };   // todos os assuntos null
  const cheio = ebookDoEdital(new Set());
  cheio.editais["rn-2025"] = {};   // mesmo e-book também ligado ao edital da DPE/RN
  const a = ambiente([vazio, cheio]);
  try {
    a.change("#crEdital", "tjpb-2026"); a.submit(); a.run("S.ajustes.cronograma.dias=[1,2,3,4,5,6,7];"); a.run("renderHoje()");
    const btn = [...a.d.querySelectorAll("#cronogramaHoje [data-cr-ir]")].find(x => JSON.parse(x.dataset.crIr).v === "eb");
    assert.ok(btn, "o resumo do e-book que tem o assunto aparece");
    assert.equal(JSON.parse(btn.dataset.crIr).id, "rm-fixture");
    assert.equal(a.d.querySelectorAll("#cronogramaHoje [data-cr-resumo='0']").length, 0, "sem aviso falso de assunto sem resumo");
  } finally { a.close(); }
});

// ---------- gerador dos e-books (roda fora do Git, sobre os resumos) ----------
const gerador = join(raiz, "ferramentas/conteudo/drive/gerar_resumos.py");
async function gerar(clusters, resumos) {
  const pasta = await mkdtemp(join(tmpdir(), "resumos-")), res = join(pasta, "res"), out = join(pasta, "out");
  await mkdir(res); await mkdir(out);
  await writeFile(join(pasta, "clusters.json"), JSON.stringify(clusters));
  await writeFile(join(res, "lote-01.md"), resumos);
  try { const r = await run("python3", ["-I", gerador, join(pasta, "clusters.json"), res, out]); return { ok: true, out, stdout: r.stdout }; }
  catch (e) { return { ok: false, stderr: String(e.stderr || e.message) }; }
}
const topico = (ref, texto) => ({ ref, titulo: texto, texto });
const clustersFicticios = {
  constitucional: [
    { id: "constitucional-001", topicos: [topico("rn-2025:d001_t001", "1. Constitucionalismo."), topico("tjpb-2026:d002_t001", "2. Constitucionalismo e neoconstitucionalismo.")], pass: [{ id: "1" }] },
    { id: "constitucional-002", topicos: [topico("df-2026:d001_t005", "5. Tema sem material.")], pass: [] },
    { id: "constitucional-003", topicos: [topico("rn-2025:d001_t009", "9. Controle de constitucionalidade.")], pass: [{ id: "2" }] },
    { id: "constitucional-004", topicos: [topico("rn-2025:d001_t002", "2. Poder constituinte.")], pass: [{ id: "3" }] },
  ],
  execucao_penal: [{ id: "execucao_penal-001", topicos: [topico("df-2026:d009_t001", "1. Lei de Execução Penal.")], pass: [{ id: "4" }] }],
};
const resumosFicticios = [
  "=== constitucional-001\nCAP: Teoria da Constituição\nTIT: Constitucionalismo\n**Ideia central:** limitar o poder.\n- item\n",
  "=== constitucional-003\nCAP: Controle de constitucionalidade\nTIT: Controle concentrado\nTexto do controle.\n",
  "=== constitucional-004\nCAP: Teoria da Constituição\nTIT: Poder constituinte\nTexto do poder constituinte.\n",
  "=== execucao_penal-001\nCAP: Execução penal\nTIT: Princípios da execução\nTexto da LEP.\n",
].join("\n");

test("gerar_resumos: um e-book por matéria, capítulos na ordem lógica, âncoras e editais certos", async () => {
  const r = await gerar(clustersFicticios, resumosFicticios);
  assert.ok(r.ok, r.stderr);
  const dc = JSON.parse(readFileSync(join(r.out, "rm-constitucional.json"), "utf8"));
  assert.equal(dc.grupo, "Resumos por matéria"); assert.equal(dc.disc, "dc"); assert.equal(dc.titulo, "Direito Constitucional");
  assert.deepEqual(dc.caps.map(c => c.t), ["Teoria da Constituição", "Controle de constitucionalidade"], "capítulos na ordem da matéria, sem capítulo vazio");
  assert.deepEqual(dc.editais, { "rn-2025": { d001_t001: [0, 0, 1], d001_t009: [1, 0, 1], d001_t002: [0, 1, 1] }, "tjpb-2026": { d002_t001: [0, 0, 1] }, "df-2026": { d001_t005: null } });
  assert.match(dc.caps[0].md, /^## Constitucionalismo\n\n\*No edital: DPE\/RN 1 · TJPB 2\*\n\n\*\*Ideia central:\*\*/);
  assert.match(dc.subtitulo, /DPE\/RN, TJPB e DPDF/);
  const pp = JSON.parse(readFileSync(join(r.out, "rm-processo-penal.json"), "utf8"));
  assert.deepEqual(pp.caps.map(c => c.t), ["Execução penal"], "Execução Penal entra como capítulo de Processo Penal");
  assert.deepEqual(pp.editais, { "df-2026": { d009_t001: [0, 0, 1] } });
});

test("gerar_resumos recusa resumo com nome de curso, título no corpo ou grupo com trechos sem resumo", async () => {
  const curso = await gerar(clustersFicticios, resumosFicticios.replace("Texto da LEP.", "Segundo o e-book do CP Iuris, a LEP..."));
  assert.equal(curso.ok, false); assert.match(curso.stderr, /menção a curso/);
  const titulo = await gerar(clustersFicticios, resumosFicticios.replace("Texto do controle.", "### Subtítulo\nTexto."));
  assert.equal(titulo.ok, false); assert.match(titulo.stderr, /não pode ter títulos/);
  const falta = await gerar(clustersFicticios, resumosFicticios.split("=== constitucional-004")[0]);
  assert.equal(falta.ok, false); assert.match(falta.stderr, /constitucional-004: grupo com trechos e sem resumo/);
});
