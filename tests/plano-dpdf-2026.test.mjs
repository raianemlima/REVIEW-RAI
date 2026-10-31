import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vm from "node:vm";
import { validarCatalogoConteudo } from "../ferramentas/ci/validar_conteudo.mjs";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ler = arquivo => readFileSync(resolve(raiz, arquivo), "utf8");
const norm = v => String(v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function catalogos() {
  const ambiente = { window: {} };
  vm.createContext(ambiente);
  for (const f of ["cronograma-taxonomia.js", "cronograma-conteudo.js", "cronograma-pesos.js"]) vm.runInContext(ler(`arquivos/${f}`), ambiente);
  return { taxonomia: ambiente.window.DPE_DISCIPLINAS_CANONICAS, programas: ambiente.window.DPE_CONTEUDOS_EDITAIS, pesos: ambiente.window.DPE_PESOS_EDITAIS };
}

test("o edital DPDF 2026 traz básicos e o Cargo 1 com localizador do DODF", () => {
  const { programas } = catalogos();
  const df = programas["df-2026"];
  assert.ok(df);
  assert.equal(df.cargo, "servidor");
  assert.equal(df.plano, "plano-dpdf-2026.html");
  assert.ok(existsSync(resolve(raiz, df.plano)), "a página do plano precisa existir");
  assert.equal(df.disciplinas.length, 18);
  const topicos = df.disciplinas.flatMap(d => d.topicos);
  assert.equal(topicos.length, 233);
  const contagem = Object.fromEntries(df.disciplinas.map(d => [d.id, d.topicos.length]));
  assert.deepEqual(
    [contagem.direito_constitucional, contagem.direito_penal, contagem.direito_processual_penal, contagem.direitos_humanos, contagem.direito_institucional_defensoria_publica],
    [10, 41, 34, 33, 10],
  );
  for (const t of topicos) {
    assert.match(t.pagina, /^DODF nº 199, p\. 5[345]$/);
    assert.doesNotMatch(t.texto, /Documento assinado|Diário Oficial|PÁGINA \d/, `${t.id} contém resto de cabeçalho`);
  }
  assert.ok(df.lacunas.some(l => /numerado como 42/.test(l)), "a anomalia de numeração em Penal fica registrada");
  const pena = df.disciplinas.find(d => d.id === "direito_penal").topicos.find(t => t.id === "d012_t028");
  assert.match(pena.texto, /^42 Lei Federal nº 7\.716\/1989/);
});

test("o perfil de pontos soma 119, respeita os blocos e casa cada grupo com uma rubrica", () => {
  const { programas, pesos } = catalogos();
  const perfil = pesos["df-2026"], df = programas["df-2026"];
  assert.equal(perfil.tipo, "pontos");
  const soma = grupos => grupos.reduce((n, g) => n + g.valor, 0);
  assert.equal(soma(perfil.grupos), 119);
  assert.equal(soma(perfil.grupos.filter(g => /Básicos/.test(g.evidencia))), 21);
  assert.equal(soma(perfil.grupos.filter(g => /Específicos/.test(g.evidencia))), 98);
  for (const d of df.disciplinas) {
    const grupos = perfil.grupos.filter(g => norm(g.label) === norm(d.nome));
    assert.equal(grupos.length, 1, `rubrica ${d.nome} precisa de um grupo com o mesmo nome`);
  }
});

test("o validador aceita cargo e plano somente nos formatos previstos", () => {
  const base = catalogos();
  assert.equal(validarCatalogoConteudo(base).editais, 20);
  const copia = () => JSON.parse(JSON.stringify(base));
  for (const [campo, valor] of [["cargo", "estagiario"], ["plano", "https://exemplo.invalid/x.html"], ["plano", "../plano.html"], ["plano", "plano.js"]]) {
    const c = copia();
    c.programas["df-2026"][campo] = valor;
    assert.throws(() => validarCatalogoConteudo(c), new RegExp(campo));
  }
});

test("o plano é publicado, guardado offline e aberto pelo Cronograma só como arquivo local", () => {
  assert.match(ler("sw.js"), /"plano-dpdf-2026\.html"/);
  assert.match(ler(".github/workflows/pages.yml"), /cp [^\n]*plano-dpdf-2026\.html/);
  const cronograma = ler("arquivos/cronograma.js");
  assert.match(cronograma, /\["df-2026","DF",2026,/);
  assert.match(cronograma, /planoSeguro\(source\.plano\)/);
  assert.match(cronograma, /rel="noopener"/);
});

test("a página do plano funciona sem rede e guarda marcações só no aparelho", async () => {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM(ler("plano-dpdf-2026.html"), { url: "https://review-dpe.test/plano-dpdf-2026.html", runScripts: "dangerously", pretendToBeVisual: true });
  try {
    await new Promise(r => setTimeout(r, 0));
    const { document, localStorage, Event } = dom.window;
    assert.equal(document.querySelectorAll("#bars .bar-row").length, 18);
    assert.equal(document.querySelectorAll("#bars .bar-row.core").length, 4);
    assert.equal(document.querySelectorAll("#weeks .week").length, 4);
    assert.equal(document.querySelectorAll("#checklist [data-check]").length, 10);
    assert.match(document.querySelector("#countdown").textContent, /prova/);
    const caixa = document.querySelector('[data-check="4"]');
    caixa.checked = true;
    caixa.dispatchEvent(new Event("change", { bubbles: true }));
    assert.deepEqual(JSON.parse(localStorage.getItem("review-dpe:plano-dpdf-2026:datas:v1")), [4]);
    document.querySelector("#resetChecklist").click();
    assert.equal(localStorage.getItem("review-dpe:plano-dpdf-2026:datas:v1"), "[]");
    assert.equal(document.querySelectorAll("script[src]").length, 0);
  } finally { dom.window.close(); }
});
