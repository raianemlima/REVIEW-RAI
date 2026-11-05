import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { webcrypto as crypto, randomBytes } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { parDaSenha, ehSelado } from "../ferramentas/ci/leiseca_selada.mjs";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const conversor = join(raiz, "ferramentas/conteudo/pontos_de_prova.py");
const b64 = u => Buffer.from(u).toString("base64");
const py = (...args) => spawnSync("python3", ["-I", conversor, ...args], { encoding: "utf8" });

// Conteúdo 100% fictício: o repositório é público e o material de estudo real nunca entra aqui.
const MD = `# Primeiro capítulo fictício

## Assunto A

> **Regra** inventada para o teste.

- item **um**
- item dois

| Termo | Ideia |
|---|---|
| **alfa** | primeira letra |
| **beta** | segunda letra |

# Segundo capítulo fictício

## Assunto B

Texto *qualquer* sobre o assunto B.
`;

function converter(md, ...extra) {
  const pasta = mkdtempSync(join(tmpdir(), "pdp-"));
  writeFileSync(join(pasta, "r.md"), md);
  const r = py(join(pasta, "r.md"), "pdp-fixture", "ad", "Pontos fictícios", "Fixture", join(pasta, "s.json"), ...extra);
  return { r, pasta, json: () => JSON.parse(readFileSync(join(pasta, "s.json"), "utf8")) };
}

test("pontos_de_prova.py transforma cada '# Capítulo' em capítulo do Aprofundamento, no grupo 'Pontos de prova'", () => {
  const { r, json } = converter(MD);
  assert.equal(r.status, 0, r.stderr);
  const e = json();
  assert.equal(e.id, "pdp-fixture");
  assert.equal(e.disc, "ad");
  assert.equal(e.grupo, "Pontos de prova");
  assert.deepEqual(e.caps.map(c => [c.id, c.t]), [["c1", "Primeiro capítulo fictício"], ["c2", "Segundo capítulo fictício"]]);
  assert.match(e.caps[0].md, /^## Assunto A/);
  assert.ok(!/^# /m.test(e.caps[0].md));
});

test("pontos_de_prova.py recusa texto solto, menção a editora ou curso, dado pessoal, '#' no corpo e tabela torta", () => {
  const casos = [
    ["texto antes do primeiro capítulo", "solto\n\n# Cap\n\ntexto\n"],
    ["menção a editora", "# Cap\n\nTexto da Editora Fictícia.\n"],
    ["menção a sinopse", "# Cap\n\nEsta sinopse diz algo.\n"],
    ["e-mail", "# Cap\n\nescreva para alguem@exemplo.invalid\n"],
    ["tabela torta", "# Cap\n\n| a | b |\n|---|---|\n| 1 |\n"],
    ["capítulo vazio", "# Cap\n\n# Outro\n\ntexto\n"],
  ];
  for (const [nome, md] of casos) {
    const { r } = converter(md);
    assert.notEqual(r.status, 0, `${nome} deveria ser recusado`);
  }
});

test("o e-book dos pontos de prova selado entra no baralho pelo aplicar_ebooks e o renderizador do app o aceita", async () => {
  const { r, json } = converter(MD);
  assert.equal(r.status, 0, r.stderr);
  const pasta = mkdtempSync(join(tmpdir(), "pdp-ap-")), bins = join(pasta, "bins");
  mkdirSync(bins);
  const senha = "senha-de-teste", publica = b64(parDaSenha(senha).publica);
  const jsonPath = join(pasta, "e.json");
  writeFileSync(jsonPath, JSON.stringify(json()));
  const sel = spawnSync("node", [join(raiz, "ferramentas/ajustes/selar_conteudo.mjs"), join(bins, "pdp.bin"), jsonPath], { encoding: "utf8", env: { ...process.env, CHAVE_PUBLICA: publica } });
  assert.equal(sel.status, 0, sel.stderr);
  assert.ok(ehSelado(readFileSync(join(bins, "pdp.bin"))));
  const sal = randomBytes(16), iv = randomBytes(12), it = 1000;
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: sal, iterations: it, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, gzipSync(Buffer.from(JSON.stringify({ ebooks: [] })))));
  writeFileSync(join(pasta, "deck.enc"), JSON.stringify({ v: 2, z: "gzip", it, s: b64(sal), iv: b64(iv), ct: b64(ct) }));
  const ap = spawnSync("node", [join(raiz, "ferramentas/ci/aplicar_ebooks.mjs"), join(pasta, "index.html")], { encoding: "utf8", env: { ...process.env, APP_SENHA: senha, EBOOKS_PASTA: bins } });
  assert.equal(ap.status, 0, ap.stderr);
  assert.match(ap.stdout, /ok: 1 e-book\(s\) do Aprofundamento no baralho \(1 novo\(s\), 0 atualizado\(s\); 2 capítulos/);
  const enc = JSON.parse(readFileSync(join(pasta, "deck.enc"), "utf8"));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(enc.iv, "base64") }, key, Buffer.from(enc.ct, "base64"));
  const deck = JSON.parse(gunzipSync(Buffer.from(pt)).toString("utf8"));
  assert.equal(deck.ebooks[0].grupo, "Pontos de prova");

  // o renderizador de Markdown do app (ebMd) precisa transformar tudo, sem sobrar sintaxe crua
  const app = readFileSync(join(raiz, "app-src.txt"), "utf8");
  const i0 = app.indexOf("function ebInline"), i1 = app.indexOf("function ebLidos");
  assert.ok(i0 > 0 && i1 > i0, "ebInline/ebMd existem no app");
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const { ebMd } = new Function("esc", `${app.slice(i0, i1)}; return { ebMd };`)(esc);
  const out = ebMd(deck.ebooks[0].caps[0].md, "t");
  assert.match(out.html, /<table/);
  assert.match(out.html, /<blockquote>/);
  assert.match(out.html, /<ul>/);
  assert.ok(!/\*\*|^\|/m.test(out.html.replace(/<[^>]+>/g, "")), "sem negrito nem tabela crus");
});

test("o repositório guarda os pontos de prova só selados, e a documentação do fluxo existe", () => {
  const buf = readFileSync(join(raiz, "conteudo-cifrado/revisao-pontos-de-prova.bin"));
  assert.ok(ehSelado(buf), "selado (LSX1)");
  const txt = buf.toString("latin1");
  for (const w of ["Tributário", "Criminologia", "Administrativo", "Processo", "Capítulo", "Súmula", "pdp-", "Penal", "Civil"]) assert.ok(!txt.includes(w), `não pode ter "${w}" legível`);
  const doc = readFileSync(join(raiz, "docs/PONTOS-DE-PROVA.md"), "utf8");
  for (const id of ["pdp-criminologia", "pdp-administrativo", "pdp-tributario", "pdp-pessoa-com-deficiencia", "pdp-processo-civil", "pdp-civil", "pdp-penal", "pdp-processo-civil-geral", "pdp-pratica-processual", "pdp-cpc-e-direito-civil", "pdp-consumidor", "pdp-cpc-novidades"]) assert.ok(doc.includes(id), `docs cita ${id}`);
  assert.match(readFileSync(join(raiz, "README.md"), "utf8"), /docs\/PONTOS-DE-PROVA\.md/);
});

// ---------- ligação com o Cronograma ----------
const ligador = join(raiz, "ferramentas/conteudo/ligar_pontos_de_prova.py");
const FIX_TRIB = {
  id: "pdp-tributario", titulo: "Fixture", subtitulo: "", disc: "tr", grupo: "Pontos de prova", atualizado: "2026-01-01",
  caps: [
    { id: "c1", t: "Sistema", md: "## Conceito de tributo (CTN art. 3º)\n\ntexto\n\n### Detalhe\n\nmais texto\n\n## Competência tributária\n\ntexto\n" },
    { id: "c2", t: "Crédito", md: "## Lançamento\n\ntexto\n\n## Decadência e prescrição\n\ntexto\n" },
  ],
};
test("ligar_pontos_de_prova.py liga assunto do edital à seção certa, com a âncora do leitor do app", () => {
  const pasta = mkdtempSync(join(tmpdir(), "pdp-lig-"));
  writeFileSync(join(pasta, "pdp-tributario.json"), JSON.stringify(FIX_TRIB));
  const r = spawnSync("python3", ["-I", "-c", `
import sys, json
sys.path.insert(0, ${JSON.stringify(join(raiz, "ferramentas/conteudo"))})
import ligar_pontos_de_prova as L
e = json.load(open(${JSON.stringify(join(pasta, "pdp-tributario.json"))}))
ed = {"x-2026": {"disciplinas": [{"canonicais": ["direito_tributario"], "topicos": [
  {"id": "t1", "titulo": "3. Competência tributária.", "texto": ""},
  {"id": "t2", "titulo": "Ponto II · alínea b — Decadência e prescrição. Lançamento", "texto": ""},
  {"id": "t3", "titulo": "5. Assunto sem resumo nenhum", "texto": ""}]},
  {"canonicais": ["direito_penal"], "topicos": [{"id": "t4", "titulo": "Competência tributária", "texto": ""}]}]}}
print(json.dumps(L.ligar([e], ed, estrito=False)))
`], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const m = JSON.parse(r.stdout)["pdp-tributario"]["x-2026"];
  assert.deepEqual(Object.keys(m).sort(), ["t1", "t2"], "só liga o que tem regra e a disciplina certa");
  assert.deepEqual(m.t1, [0, 2, 1], "'###' conta na posição: Competência é o 3º título do capítulo");
  assert.deepEqual(m.t2, [1, 1, 1], "assunto composto liga pelo tema principal");
});

test("as âncoras gravadas apontam para o título certo no renderizador do app", () => {
  const app = readFileSync(join(raiz, "app-src.txt"), "utf8");
  const i0 = app.indexOf("function ebInline"), i1 = app.indexOf("function ebLidos");
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const { ebMd } = new Function("esc", `${app.slice(i0, i1)}; return { ebMd };`)(esc);
  const html = ebMd(FIX_TRIB.caps[0].md, "eb0").html;
  assert.match(html, /<h3 id="eb0-2">Competência tributária<\/h3>/);
});
