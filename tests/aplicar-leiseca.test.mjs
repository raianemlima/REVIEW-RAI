import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
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
  const { stdout } = await run("node", [script, join(pasta, "index.html")], { env: { ...process.env, APP_SENHA: senha, LEISECA_CHAVE: chave, LEISECA_PASTA: bins, LEISECA_PUBLICA: join(pasta, "sem-publicas") } });
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
  const vazio = await run("node", [script, join(pasta, "index.html")], { env: { ...process.env, LEISECA_PASTA: bins, LEISECA_PUBLICA: join(pasta, "sem-publicas") } });
  assert.match(vazio.stdout, /Nenhuma lei/);
  await cifrarLei(bins, randomBytes(32).toString("base64"), leiFicticia);
  const env = { ...process.env, LEISECA_PASTA: bins, LEISECA_PUBLICA: join(pasta, "sem-publicas") }; delete env.APP_SENHA; delete env.LEISECA_CHAVE;
  const semSegredo = await run("node", [script, join(pasta, "index.html")], { env });
  assert.match(semSegredo.stdout, /não configurado/);
  assert.equal(await readFile(join(pasta, "deck.enc"), "utf8"), "{}");
});

test("a publicação aplica a lei seca depois das revisões e a chave nunca entra no repositório", async () => {
  const pages = await readFile(join(raiz, ".github/workflows/pages.yml"), "utf8");
  assert.ok(pages.indexOf("aplicar_leiseca.mjs") > pages.indexOf("aplicar_revisoes.mjs"));
  assert.match(pages, /LEISECA_CHAVE: \$\{\{ secrets\.LEISECA_CHAVE \}\}/);
  assert.match(await readFile(join(raiz, ".gitignore"), "utf8"), /^chave-leiseca\*\.txt$/m);
});

test("a lei seca pública (resoluções do CNJ) entra só com APP_SENHA, sem a chave do curso", async () => {
  const pasta = await mkdtemp(join(tmpdir(), "leiseca-")), bins = join(pasta, "bins");
  await mkdir(bins);
  await cifrarLei(bins, randomBytes(32).toString("base64"), leiFicticia);
  const senha = "senha-de-teste";
  await escreverDeck(pasta, senha, { disciplinas: [{ id: "dp", nome: "Direito Penal", curto: "Penal" }], cartoes: [], leiseca: [] });
  const env = { ...process.env, APP_SENHA: senha, LEISECA_PASTA: bins, LEISECA_PUBLICA: join(raiz, "ferramentas/conteudo/dados/leiseca-publica") };
  delete env.LEISECA_CHAVE;
  const { stdout } = await run("node", [script, join(pasta, "index.html")], { env });
  assert.match(stdout, /LEISECA_CHAVE não configurado/);
  const { deck } = await lerDeck(pasta, senha);
  assert.deepEqual(deck.leiseca.map(l => l.id).sort(), ["l12846", "l9784", "lgpd", "lindb", "res-cnj-351", "res-cnj-363", "res-cnj-400", "res-cnj-401"]);
  const r351 = deck.leiseca.find(l => l.id === "res-cnj-351");
  assert.equal(r351.completa, true);
  assert.equal(r351.disc, "", "sem disciplina de Administrativo no baralho de teste, a lei entra sem disciplina");
  assert.ok(r351.grupos[0].itens.some(i => i.a === "1" && /^Art\. 1º Instituir a Política de Prevenção e Enfrentamento do Assédio/.test(i.x)));
});

test("a lei seca pública usa o texto vigente: nada tachado, revogado só como (Revogado.), a Res. 230/2016 fica de fora", async () => {
  const pasta = join(raiz, "ferramentas/conteudo/dados/leiseca-publica");
  const ids = (await import("node:fs")).readdirSync(pasta).map(f => f.replace(".json", "")).sort();
  assert.deepEqual(ids, ["l12846", "l9784", "lgpd", "lindb", "res-cnj-351", "res-cnj-363", "res-cnj-400", "res-cnj-401"]);
  for (const id of ids) {
    const lei = JSON.parse(await readFile(join(pasta, id + ".json"), "utf8"));
    const arts = lei.grupos.flatMap(g => g.itens).filter(i => i.a !== undefined);
    assert.ok(arts.length >= 3, id);
    for (const a of arts) assert.match(a.x, /^Art\. \d+º?(-[A-Z])?\.? /, `${id} art. ${a.a}`);
    assert.doesNotMatch(JSON.stringify(lei), /<\/?s>|§ \d+ o /);
  }
  assert.match(JSON.parse(await readFile(join(pasta, "res-cnj-401.json"), "utf8")).nome, /substituiu a Res\. 230\/2016/);
});

test("lei seca selada com a chave pública: cifra sem segredo e abre só com a senha do app", async () => {
  const { parDaSenha } = await import(join(raiz, "ferramentas/ci/leiseca_selada.mjs"));
  const pasta = await mkdtemp(join(tmpdir(), "leiseca-")), bins = join(pasta, "bins"), saida = join(pasta, "saida");
  await mkdir(bins); await mkdir(saida);
  const senha = "senha-de-teste", publica = parDaSenha(senha).publica.toString("base64");
  await writeFile(join(bins, "chave-publica.txt"), publica + "\n");
  await writeFile(join(saida, "cp-dls.json"), JSON.stringify(leiFicticia));
  const semSegredo = { ...process.env, LEISECA_PASTA: bins }; delete semSegredo.LEISECA_CHAVE; delete semSegredo.APP_SENHA;
  const cifra = await run("node", [join(raiz, "ferramentas/ajustes/cifrar_leiseca.mjs"), saida, "--chave", join(pasta, "nao-cria.txt")], { env: semSegredo, cwd: pasta });
  assert.match(cifra.stdout, /cp-dls\.bin \(selado\)/);
  assert.equal((await import("node:fs")).existsSync(join(pasta, "nao-cria.txt")), false, "o modo selado não cria chave simétrica");
  const bin = await readFile(join(bins, "cp-dls.bin"));
  assert.equal(bin.subarray(0, 4).toString(), "LSX1");
  assert.doesNotMatch(bin.toString("latin1"), /fictício|Decodificado/);

  await escreverDeck(pasta, senha, { disciplinas: [{ id: "pp", nome: "Direito Processual Penal" }, { id: "dp", nome: "Direito Penal" }], cartoes: [], leiseca: [] });
  const env = { ...semSegredo, APP_SENHA: senha, LEISECA_PUBLICA: join(pasta, "sem-publicas") };
  const { stdout } = await run("node", [script, join(pasta, "index.html")], { env });
  assert.ok(stdout.includes(`chave pública da lei seca do curso (pode ir para ${bins}/chave-publica.txt): ${publica}`));
  assert.match(stdout, /ok: 1 lei\(s\) e 1 cartão\(ões\) de lei seca no baralho \(cp-dls\.bin\)/);
  const { deck } = await lerDeck(pasta, senha);
  assert.equal(deck.leiseca[0].id, "cp-dls");
  assert.equal(deck.leiseca[0].disc, "dp");

  // outra senha: a lei fica de fora com aviso, o baralho continua abrindo e a publicação não quebra
  const outra = await mkdtemp(join(tmpdir(), "leiseca-"));
  await escreverDeck(outra, "outra-senha", { disciplinas: [], cartoes: [], leiseca: [] });
  const r = await run("node", [script, join(outra, "index.html")], { env: { ...env, APP_SENHA: "outra-senha" } });
  assert.match(r.stdout, /chave-publica\.txt não corresponde à senha atual/);
  assert.match(r.stdout, /cp-dls\.bin não abre com a senha atual do app/);
  assert.deepEqual((await lerDeck(outra, "outra-senha")).deck.leiseca, []);
});

test("a disciplina prefere o nome sem 'processo' (Execução Penal antes de Processo Penal e Execução Penal)", async () => {
  const pasta = await mkdtemp(join(tmpdir(), "leiseca-")), publicas = join(pasta, "publicas");
  await mkdir(publicas);
  await writeFile(join(publicas, "lep.json"), JSON.stringify({ ...leiFicticia, id: "lep-dls", disc: "@execucao penal", cartoes: [] }));
  const senha = "senha-de-teste";
  await escreverDeck(pasta, senha, { disciplinas: [{ id: "ppe", nome: "Direito Processual Penal e Execução Penal" }, { id: "ep", nome: "Execução Penal" }], cartoes: [], leiseca: [] });
  const env = { ...process.env, APP_SENHA: senha, LEISECA_PASTA: join(pasta, "sem-bins"), LEISECA_PUBLICA: publicas };
  await run("node", [script, join(pasta, "index.html")], { env });
  assert.equal((await lerDeck(pasta, senha)).deck.leiseca[0].disc, "ep");
  await escreverDeck(pasta, senha, { disciplinas: [{ id: "ppe", nome: "Direito Processual Penal e Execução Penal" }], cartoes: [], leiseca: [] });
  await run("node", [script, join(pasta, "index.html")], { env });
  assert.equal((await lerDeck(pasta, senha)).deck.leiseca[0].disc, "ppe", "sem outra opção, aceita a disciplina com 'processo'");
});

test("o repositório só guarda a lei seca do curso selada: nada em claro em leiseca-cifrada/", async () => {
  const fs = await import("node:fs"), pasta = join(raiz, "leiseca-cifrada");
  if (!fs.existsSync(pasta)) return;
  const arquivos = fs.readdirSync(pasta).sort();
  for (const f of arquivos) {
    assert.match(f, /^([a-z0-9-]+-dls\.bin|chave-publica\.txt)$/, `${f} não deveria estar em leiseca-cifrada/`);
    if (f === "chave-publica.txt") { assert.equal(Buffer.from(fs.readFileSync(join(pasta, f), "utf8").trim(), "base64").length, 32); continue; }
    const bin = fs.readFileSync(join(pasta, f));
    assert.equal(bin.subarray(0, 4).toString(), "LSX1", `${f} precisa estar selado com a chave pública`);
    assert.doesNotMatch(bin.toString("latin1"), /Art\. \d|Decodificad|cpfCnpj|uid:/, `${f} tem texto em claro`);
  }
});

test("leis federais do normas.leg.br: nome com o número da lei, texto compilado e dispositivo revogado fora", async () => {
  const pasta = join(raiz, "ferramentas/conteudo/dados/leiseca-publica"), ler = id => JSON.parse(readFileSync(join(pasta, id + ".json"), "utf8"));
  const lgpd = ler("lgpd"), arts = lgpd.grupos[0].itens.filter(i => i.a !== undefined);
  assert.match(lgpd.nome, /^Lei nº 13\.709\/2018 · /);
  assert.match(lgpd.fonte, /normas\.leg\.br/);
  assert.ok(arts.length >= 70);
  assert.match(arts.find(a => a.a === "55-B").x, /^Art\. 55-B\. \(Revogado\.\)$/);
  assert.doesNotMatch(arts.find(a => a.a === "55-A").x, /§ 1º \(Parágrafo acrescido/);
  assert.match(ler("lindb").nome, /^Decreto-Lei nº 4\.657\/1942 · /);
  assert.equal(ler("lindb").id, "lindb", "o Cronograma liga a LINDB pela sigla");
  for (const id of ["l9784", "l12846"]) assert.ok(ler(id).grupos[0].itens.filter(i => i.a !== undefined).length >= 25, id);
});

test("marcação automática: prazo, exceção, dever e definição; nota de alteração fica sem marca", async () => {
  const { marcar, marcarLei } = await import(join(raiz, "ferramentas/ci/grifos_auto.mjs"));
  const segs = marcar("Art. 9º O prazo é de 30 (trinta) dias, salvo disposição em contrário, e compete ao juiz decidir de ofício. (Redação dada pela Lei nº 1.234, de 2020)");
  const marcados = segs.filter(s => s[1]).map(s => s[1] + ":" + s[0]);
  assert.deepEqual(marcados, ["v:30 (trinta) dias", "a:salvo", "d:compete", "d:de ofício"]);
  assert.equal(segs.map(s => s[0]).join(""), "Art. 9º O prazo é de 30 (trinta) dias, salvo disposição em contrário, e compete ao juiz decidir de ofício. (Redação dada pela Lei nº 1.234, de 2020)");
  const def = marcar("Art. 5º Para os fins desta Lei, considera-se:\nI - dado pessoal: informação relacionada a pessoa natural;");
  assert.ok(def.some(s => s[1] === "m" && s[0] === "dado pessoal"));
  assert.equal(marcar("Art. 1º Esta Lei entra em vigor na data de sua publicação."), null);
  const lei = { grupos: [{ itens: [{ h: "CAPÍTULO I" }, { a: "1", x: "Art. 1º É vedado o uso, exceto nos casos legais." }] }] };
  assert.equal(marcarLei(lei), 1);
  assert.equal(lei.grifos, "auto");
});

test("na publicação: a lei do curso tira a seleção antiga do leitor e as leis sem grifo do curso ganham marcação automática", async () => {
  const pasta = await mkdtemp(join(tmpdir(), "leiseca-")), publicas = join(pasta, "publicas");
  await mkdir(publicas);
  const curso = { ...leiFicticia, id: "cdc-dls", disc: "@consumidor", substitui: ["cdc"], cartoes: [],
    grupos: [{ nome: "Parte", itens: [{ a: "1", x: "Art. 1º Texto do curso, salvo exceção.", g: [["Art. 1º Texto do curso, ", ""], ["salvo exceção", "v"], [".", ""]] }] }] };
  await writeFile(join(publicas, "cdc-dls.json"), JSON.stringify(curso));
  const senha = "senha-de-teste";
  await escreverDeck(pasta, senha, { disciplinas: [{ id: "dc", nome: "Direito do Consumidor" }], cartoes: [{ id: "ls-cdc1-001", disc: "dc", ord: 1 }],
    leiseca: [{ id: "cdc", nome: "CDC · seleção", curto: "CDC", grupos: [{ itens: [{ a: "6", x: "Art. 6º São direitos básicos, no prazo de 5 (cinco) dias." }] }] },
              { id: "cf", nome: "CF", curto: "CF", grupos: [{ itens: [{ a: "5", x: "Art. 5º Todos são iguais, sem distinção de qualquer natureza, salvo exceções." }] }] }] });
  const env = { ...process.env, APP_SENHA: senha, LEISECA_PASTA: join(pasta, "sem-bins"), LEISECA_PUBLICA: publicas };
  const { stdout } = await run("node", [script, join(pasta, "index.html")], { env });
  assert.match(stdout, /marcação automática em 1 lei\(s\)/);
  const { deck } = await lerDeck(pasta, senha);
  assert.deepEqual(deck.leiseca.map(l => l.id), ["cf", "cdc-dls"], "a seleção antiga do CDC sai do leitor");
  assert.ok(deck.cartoes.some(c => c.id === "ls-cdc1-001"), "os cartões da seleção antiga ficam");
  const cf = deck.leiseca.find(l => l.id === "cf"), cdc = deck.leiseca.find(l => l.id === "cdc-dls");
  assert.equal(cf.grifos, "auto");
  assert.ok(cf.grupos[0].itens[0].g.some(s => s[1] === "a" && s[0] === "salvo"));
  assert.equal(cdc.grifos, undefined, "a lei do curso mantém os grifos do professor");
  assert.deepEqual(cdc.grupos[0].itens[0].g, curso.grupos[0].itens[0].g);
});
