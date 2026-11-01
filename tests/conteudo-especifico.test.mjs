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
const ebookFicticio = (id, titulo = "Conteúdo específico · Fixture") => ({
  id, titulo, subtitulo: "Fixture", disc: "", grupo: "Conteúdo específico", edital: "tjpb-2026", atualizado: "2026-11-01",
  caps: [{ id: "c1", t: "Direito Constitucional", md: "## 1. Assunto fictício\n\n**Trecho 1** — *Fonte fictícia*\n\n> Texto fictício.\n" }],
  mapa: { d001_t001: [0, 0, 1] },
});

test("aplicar_ebooks abre os e-books selados com a senha do app e troca pelo id, mantendo o sal do baralho", async () => {
  const pasta = await mkdtemp(join(tmpdir(), "ebooks-")), bins = join(pasta, "bins");
  await mkdir(bins);
  const senha = "senha-de-teste", publica = b64(parDaSenha(senha).publica);
  const antes = await escreverDeck(pasta, senha, { disciplinas: [], cartoes: [], ebooks: [{ id: "ce-x", titulo: "versão antiga", caps: [] }, { id: "dh", titulo: "DH", caps: [] }] });
  await writeFile(join(bins, "ce.bin"), selar(publica, gzipSync(Buffer.from(JSON.stringify({ ebooks: [ebookFicticio("ce-x"), ebookFicticio("ce-y", "Outro")] })))));
  const { stdout } = await run("node", [script, join(pasta, "index.html")], { env: { ...process.env, APP_SENHA: senha, EBOOKS_PASTA: bins } });
  assert.match(stdout, /ok: 2 e-book\(s\) de conteúdo específico no baralho \(1 novo\(s\), 1 atualizado\(s\)/);
  const { payload, deck } = await lerDeck(pasta, senha);
  assert.equal(payload.s, antes.s, "o sal não muda: quem já entrou continua abrindo offline");
  assert.deepEqual(deck.ebooks.map(e => e.id), ["ce-x", "dh", "ce-y"]);
  assert.equal(deck.ebooks[0].titulo, "Conteúdo específico · Fixture");
  assert.deepEqual(deck.ebooks[0].mapa, { d001_t001: [0, 0, 1] });
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

test("os e-books de conteúdo específico do repositório estão selados (sem texto legível do material)", () => {
  const pasta = join(raiz, "conteudo-cifrado"), bins = readdirSync(pasta).filter(f => f.endsWith(".bin")).sort();
  assert.deepEqual(bins, ["ce-dpdf.bin", "ce-dpe-rn.bin", "ce-tjpb.bin"]);
  for (const f of bins) {
    const buf = readFileSync(join(pasta, f));
    assert.ok(ehSelado(buf), `${f} selado (LSX1)`);
    const txt = buf.toString("latin1");
    for (const w of ["Trecho", "Edital", "CP Iuris", "Reta Final", "Direito"]) assert.ok(!txt.includes(w), `${f} não pode ter "${w}" legível`);
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
function ebookDoEdital(sem) {
  const ctx = { window: {} }; vm.runInNewContext(fontes[2], ctx);
  const ed = ctx.window.DPE_CONTEUDOS_EDITAIS["tjpb-2026"], mapa = {}, caps = [];
  ed.disciplinas.forEach((d, ci) => {
    caps.push({ id: "c" + (ci + 1), t: d.nome, md: d.topicos.map((t, k) => { mapa[t.id] = [ci, k, sem.has(t.id) ? 0 : 2]; return `## ${t.titulo}\n\n> Trecho fictício de ${t.id}.\n`; }).join("\n") });
  });
  return { id: "ce-tjpb", titulo: "Conteúdo específico · TJPB 2026", subtitulo: "Fixture", disc: "", grupo: "Conteúdo específico", edital: "tjpb-2026", atualizado: "2026-11-01", caps, mapa };
}

test("Cronograma: cada assunto com trechos ganha o botão que abre o e-book no ponto certo do Aprofundamento", async () => {
  const eb = ebookDoEdital(new Set());
  const a = ambiente([{ id: "outro", titulo: "Material antigo", subtitulo: "", disc: "dc", atualizado: "2026-01-01", caps: [{ id: "c1", t: "Cap", md: "Texto" }] }, eb]);
  try {
    a.change("#crEdital", "tjpb-2026"); a.submit(); a.run("S.ajustes.cronograma.dias=[1,2,3,4,5,6,7];");
    a.run("renderHoje()");
    const btn = [...a.d.querySelectorAll("#cronogramaHoje [data-cr-ir]")].find(x => JSON.parse(x.dataset.crIr).v === "eb");
    assert.ok(btn, "botão Ler os trechos no bloco do dia");
    assert.match(btn.textContent, /Ler os trechos \(2\)/);
    assert.ok(btn.classList.contains("primary"), "é a ação principal do assunto");
    const o = JSON.parse(btn.dataset.crIr);
    const b = a.run('(()=>{const p=S.ajustes.cronograma,ag=window.DPE_CRONOGRAMA_MOTOR.gerarAgenda(p,0);const d=ag.dias[(dayToDate(today()).getDay()||7)-1];return d.blocos.find(b=>b.disciplinaId);})()');
    assert.deepEqual([o.id, o.ci, o.a], ["ce-tjpb", eb.mapa[b.topicoId][0], `eb${eb.mapa[b.topicoId][0]}-${eb.mapa[b.topicoId][1]}`]);
    btn.click();
    assert.equal(a.run("S.tab"), "biblioteca");
    assert.equal(a.run("S.libView"), "ebooks");
    assert.equal(a.run("S.ebId"), "ce-tjpb");
    const alvo = a.d.getElementById(o.a);
    assert.ok(alvo, "o assunto existe no capítulo aberto");
    assert.match(alvo.textContent, new RegExp(b.objeto.titulo.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await new Promise(r => setTimeout(r, 80));
    assert.equal(a.dom.window.__rolou, o.a, "rola até o assunto");
    assert.ok(alvo.classList.contains("eb-alvo"), "destaca o assunto");
    assert.equal(a.run("S.ebAncora"), null);
  } finally { a.close(); }
});

test("Cronograma: assunto sem trecho no material avisa, sem botão; outro edital não mostra nada", () => {
  const ctx = { window: {} }; vm.runInNewContext(fontes[2], ctx);
  const todos = new Set(ctx.window.DPE_CONTEUDOS_EDITAIS["tjpb-2026"].disciplinas.flatMap(d => d.topicos.map(t => t.id)));
  const a = ambiente([ebookDoEdital(todos)]);
  try {
    a.change("#crEdital", "tjpb-2026"); a.submit(); a.run("S.ajustes.cronograma.dias=[1,2,3,4,5,6,7];"); a.run("renderHoje()");
    assert.ok(!a.d.querySelector('#cronogramaHoje [data-cr-ir*="\\"eb\\""]'));
    assert.match(a.d.querySelector("#cronogramaHoje [data-cr-trechos]").textContent, /Sem trecho doutrinário/);
    a.run('go("cronograma")'); a.change("#crEdital", "sc-2026");
    assert.equal(a.d.querySelectorAll("#crSemana [data-cr-trechos]").length, 0);
  } finally { a.close(); }
});

test("Aprofundamento: o conteúdo específico vem primeiro, com a etiqueta do grupo", () => {
  const a = ambiente([{ id: "outro", titulo: "Material antigo", subtitulo: "", disc: "dc", atualizado: "2026-01-01", caps: [{ id: "c1", t: "Cap", md: "Texto" }] }, ebookDoEdital(new Set())]);
  try {
    a.run('S.libView="ebooks";S.ebId=null;go("biblioteca")');
    const cards = [...a.d.querySelectorAll(".eb-card")];
    assert.equal(cards.length, 2);
    assert.match(cards[0].textContent, /Conteúdo específico · TJPB 2026/);
    assert.ok(cards[0].querySelector(".eb-grupo"), "etiqueta Conteúdo específico");
    assert.match(cards[1].textContent, /Material antigo/);
  } finally { a.close(); }
});
