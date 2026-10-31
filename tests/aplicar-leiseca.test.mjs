import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { webcrypto as crypto, randomBytes } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(raiz, "ferramentas/ci/aplicar_leiseca.mjs");
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
async function cifrarLei(pasta, chave, lei) {
  const k = await crypto.subtle.importKey("raw", Buffer.from(chave, "base64"), "AES-GCM", false, ["encrypt"]), iv = randomBytes(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, gzipSync(Buffer.from(JSON.stringify(lei)))));
  await writeFile(join(pasta, lei.id + ".bin"), Buffer.concat([iv, ct]));
}

const leiFicticia = {
  id: "cp-dls", nome: "Código Penal · Decodificado", curto: "CP", disc: "@penal", completa: true, fonte: "Fixture",
  grupos: [{ nome: "PARTE GERAL", itens: [{ a: "1", x: "Art. 1º Texto fictício.", n: 7 }, { q: "Assertiva fictícia.", b: "FGV 2025 - Cargo fictício" }] }],
  cartoes: [{ g: 0, a: "1", origem: "CP, art. 1", tema: "art. 1", frente: "CP, Art. 1º: complete a lacuna.\nArt. 1º ______ fictício.", verso: "Texto", porque: "Fixture." }],
};

test("insere a lei seca do curso e os cartões no baralho, mantendo o sal e resolvendo a disciplina pelo nome", async () => {
  const pasta = await mkdtemp(join(tmpdir(), "leiseca-")), bins = join(pasta, "bins");
  await mkdir(bins);
  const senha = "senha-de-teste", chave = randomBytes(32).toString("base64");
  const antes = await escreverDeck(pasta, senha, {
    disciplinas: [{ id: "dp", nome: "Direito Penal", curto: "Penal" }, { id: "pp", nome: "Direito Processual Penal", curto: "Proc. Penal" }],
    cartoes: [{ id: "x1", disc: "dp", ord: 10 }, { id: "ls-cp-dls1-001", disc: "dp", ord: 3 }],
    leiseca: [{ id: "cp-dls", nome: "versão antiga", grupos: [] }, { id: "cf", nome: "CF", grupos: [] }],
  });
  await writeFile(join(pasta, "index.html"), "<!doctype html>");
  await cifrarLei(bins, chave, leiFicticia);
  const { stdout } = await run("node", [script, join(pasta, "index.html")], { env: { ...process.env, APP_SENHA: senha, LEISECA_CHAVE: chave, LEISECA_PASTA: bins } });
  assert.match(stdout, /ok: 1 lei\(s\) e 1 cartão/);
  const { payload, deck } = await lerDeck(pasta, senha);
  assert.equal(payload.s, antes.s, "o sal não muda: a chave derivada continua a mesma");
  assert.deepEqual(deck.leiseca.map(l => l.id), ["cp-dls", "cf"]);
  const lei = deck.leiseca[0];
  assert.equal(lei.disc, "dp", "Penal não pode cair em Processo Penal");
  assert.equal(lei.completa, true);
  assert.equal(lei.grupos[0].itens[0].n, 7);
  const novos = deck.cartoes.filter(c => c.id.startsWith("ls-cp-dls"));
  assert.equal(novos.length, 1);
  assert.deepEqual({ id: novos[0].id, disc: novos[0].disc, tipo: novos[0].tipo, ord: novos[0].ord }, { id: "ls-cp-dls1-001", disc: "dp", tipo: "lei_seca", ord: 11 });
});

test("sem os segredos ou sem leis cifradas, não mexe no baralho", async () => {
  const pasta = await mkdtemp(join(tmpdir(), "leiseca-")), bins = join(pasta, "bins");
  await mkdir(bins);
  await writeFile(join(pasta, "deck.enc"), "{}");
  const vazio = await run("node", [script, join(pasta, "index.html")], { env: { ...process.env, LEISECA_PASTA: bins } });
  assert.match(vazio.stdout, /Nenhuma lei/);
  await cifrarLei(bins, randomBytes(32).toString("base64"), leiFicticia);
  const env = { ...process.env, LEISECA_PASTA: bins }; delete env.APP_SENHA; delete env.LEISECA_CHAVE;
  const semSegredo = await run("node", [script, join(pasta, "index.html")], { env });
  assert.match(semSegredo.stdout, /não configurados/);
  assert.equal(await readFile(join(pasta, "deck.enc"), "utf8"), "{}");
});

test("a publicação aplica a lei seca depois das revisões e a chave nunca entra no repositório", async () => {
  const pages = await readFile(join(raiz, ".github/workflows/pages.yml"), "utf8");
  assert.ok(pages.indexOf("aplicar_leiseca.mjs") > pages.indexOf("aplicar_revisoes.mjs"));
  assert.match(pages, /LEISECA_CHAVE: \$\{\{ secrets\.LEISECA_CHAVE \}\}/);
  assert.match(await readFile(join(raiz, ".gitignore"), "utf8"), /^chave-leiseca\*\.txt$/m);
});
