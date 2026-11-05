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
const ID = "am-2026-servidor";

function catalogos() {
  const ambiente = { window: {} };
  vm.createContext(ambiente);
  for (const f of ["cronograma-taxonomia.js", "cronograma-conteudo.js", "cronograma-pesos.js"]) vm.runInContext(ler(`arquivos/${f}`), ambiente);
  return { taxonomia: ambiente.window.DPE_DISCIPLINAS_CANONICAS, programas: ambiente.window.DPE_CONTEUDOS_EDITAIS, pesos: ambiente.window.DPE_PESOS_EDITAIS };
}

// Contagens lidas diretamente do Anexo II do Edital nº 01/2026 (DPE/AM), cargo R, e conferidas à mão:
// itens numerados do programa; os blocos sem numeração viram um tópico por frase (Conhecimentos Gerais)
// ou por seção rotulada pelo próprio edital (Criança, Idoso, Pessoa com deficiência, Mulher).
const ESPERADO = {
  lingua_portuguesa: 21,
  legislacao_defensoria: 9,
  conhecimentos_juridicos_institucionais: 7,
  direito_constitucional: 7,
  direito_administrativo: 13,
  direito_civil: 21,
  direito_processual_civil: 29, // o edital repete o item 6 e pula o 13
  direito_penal: 11, // o item 9 é desdobrado em pena, crimes em espécie e legislação penal especial
  direito_processual_penal: 40,
  direitos_humanos: 11,
  direito_crianca_idoso_pcd_mulher: 4,
};

test("o edital DPE/AM 2026 (cargo R) traz Conhecimentos Gerais e Específicos com localizador de página", () => {
  const { programas } = catalogos();
  const am = programas[ID];
  assert.ok(am, "programa precisa existir no catálogo");
  assert.equal(am.cargo, "servidor");
  assert.equal(am.plano, "plano-dpeam-2026.html");
  assert.ok(existsSync(resolve(raiz, am.plano)), "a página do plano precisa existir");
  assert.deepEqual(Object.fromEntries(am.disciplinas.map(d => [d.id, d.topicos.length])), ESPERADO);
  assert.equal(am.disciplinas.flatMap(d => d.topicos).length, 173);
  let ultima = 0;
  for (const d of am.disciplinas) {
    for (const t of d.topicos) {
      const m = /^Edital nº 01\/2026 – DPE\/AM, Anexo II, PDF p\. (\d+)$/.exec(t.pagina);
      assert.ok(m, `${t.id}: localizador fora do formato (${t.pagina})`);
      const pg = Number(m[1]);
      assert.ok(pg === 30 || (pg >= 43 && pg <= 47), `${t.id}: página ${pg} fora do trecho do cargo R`);
      if (["lingua_portuguesa", "legislacao_defensoria", "conhecimentos_juridicos_institucionais"].includes(d.id)) assert.equal(pg, 30, `${t.id}: Conhecimentos Gerais estão na p. 30`);
      else { assert.ok(pg >= Math.max(ultima, 43), `${t.id}: páginas devem seguir a ordem do programa`); ultima = pg; }
      assert.ok(t.texto.length > 5 && t.titulo.length > 3, `${t.id}: tópico vazio`);
    }
  }
});

test("o texto de cada tópico vem do edital sem número de rodapé de página no meio da frase", () => {
  const { programas } = catalogos();
  const todos = programas[ID].disciplinas.flatMap(d => d.topicos.map(t => [d.id, t]));
  const texto = id => todos.filter(([d]) => d === id).map(([, t]) => t.texto).join("\n");
  assert.match(texto("direito_administrativo"), /Procedimentos voltados ao processo administrativo sancionatório previsto na Lei Federal 14\.133\/2021/);
  assert.match(texto("direito_processual_civil"), /audiência de instrução e julgamento, provas, sentença e coisa julgada/);
  assert.match(texto("direito_processual_penal"), /30\. Rito ordinário\. Rito sumário\. Rito sumaríssimo\./);
  assert.match(texto("direitos_humanos"), /8\. Mecanismos de proteção aos direitos humanos na Constituição da República do Brasil\. Federalização de crimes contra os Direitos Humanos/);
  for (const [, t] of todos) assert.doesNotMatch(t.texto, /\s1[4-8]\s+(?:ao|instrução|ordinário|contra)\b/, `${t.id} contém número de página`);
});

test("a ordem e a numeração do programa seguem o edital, com as anomalias registradas", () => {
  const { programas } = catalogos();
  const am = programas[ID];
  const por = id => am.disciplinas.find(d => d.id === id);
  const civil = por("direito_processual_civil").topicos;
  assert.match(civil[5].texto, /^6\. Processo: pressupostos processuais/);
  assert.match(civil[6].texto, /^6\. Sujeitos do processo/);
  assert.match(civil[12].texto, /^12\. Tutelas declaratórias/);
  assert.match(civil[13].texto, /^14\. Processo de execução/);
  const penal = por("direito_penal").topicos;
  assert.match(penal[8].texto, /^9\. Pena: evolução histórica/);
  assert.match(penal[9].texto, /^Crimes em espécie\./);
  assert.match(penal[10].texto, /^Legislação Penal Especial:/);
  assert.match(penal[10].texto, /Lei nº 15\.343\/06/, "o texto do edital é mantido como impresso");
  const leg = por("legislacao_defensoria").topicos;
  assert.match(leg[7].texto, /^Lei n\.º 4\.077\/2014 e suas alterações\.$/);
  assert.deepEqual(leg[7].leis.length > 0, true);
  const dca = por("direito_crianca_idoso_pcd_mulher").topicos.map(t => t.titulo);
  assert.deepEqual([...dca], ["Criança e Adolescente", "Idoso", "Pessoa com deficiência", "Mulher"]);
  const lacunas = am.lacunas.join("\n");
  assert.match(lacunas, /servidor/i);
  assert.match(lacunas, /15\.343\/06[^\n]*11\.343\/2006/);
  assert.match(lacunas, /16\.869\/2019[^\n]*13\.869\/2019/);
  assert.match(lacunas, /item 6[^\n]*duas vezes[^\n]*item 13/);
  assert.match(lacunas, /item 9[^\n]*desdobrad/);
  assert.match(lacunas, /item 13\.2/);
});

test("o perfil por questões soma 60 (20 + 40), vale igual por questão e casa cada grupo com uma rubrica", () => {
  const { programas, pesos } = catalogos();
  const perfil = pesos[ID], am = programas[ID];
  assert.equal(perfil.tipo, "questoes");
  const soma = grupos => grupos.reduce((n, g) => n + g.valor, 0);
  assert.ok(Math.abs(soma(perfil.grupos) - 60) < 1e-9);
  const geral = perfil.grupos.filter(g => /Conhecimentos Gerais/.test(g.evidencia));
  const especifico = perfil.grupos.filter(g => /Conhecimentos Específicos/.test(g.evidencia));
  assert.equal(geral.length + especifico.length, perfil.grupos.length);
  assert.ok(Math.abs(soma(geral) - 20) < 1e-9);
  assert.ok(Math.abs(soma(especifico) - 40) < 1e-9);
  for (const d of am.disciplinas) {
    const grupos = perfil.grupos.filter(g => norm(g.label) === norm(d.nome));
    assert.equal(grupos.length, 1, `rubrica ${d.nome} precisa de um grupo com o mesmo nome`);
  }
  for (const g of perfil.grupos) assert.match(g.evidencia, /Item 7\.1, quadro da prova objetiva/);
  assert.match(perfil.nota, /60 questões/);
  assert.match(perfil.nota, /item 9\.2/);
  assert.match(perfil.nota, /vale o mesmo|mesmo valor/);
  assert.match(perfil.nota, /divisão igual/);
});

test("o validador aceita o catálogo com 22 editais e o edital novo fica fora do relatório de Defensor", () => {
  const base = catalogos();
  assert.equal(validarCatalogoConteudo(base).editais, 22);
  assert.equal(base.programas[ID].cargo, "servidor");
  assert.match(ler("arquivos/dashboard-editais.js"), /programa\?\.cargo !== "servidor"/);
});

test("o plano é publicado, guardado offline e a edição de cache fica sincronizada", () => {
  assert.match(ler("sw.js"), /"plano-dpeam-2026\.html"/);
  assert.match(ler(".github/workflows/pages.yml"), /cp [^\n]*plano-dpeam-2026\.html/);
  assert.match(ler("arquivos/cronograma.js"), /\["am-2026-servidor","AM",2026,"DPE\/AM · Analista Jurídico \(servidor\) · Edital 1\/2026"\]/);
  const versoes = [ler("sw.js").match(/const CACHE = "([^"]+)"/)[1], ler("gate.js").match(/APP_CACHE = "([^"]+)"/)[1], ler("index.html").match(/APP_CACHE = "([^"]+)"/)[1]];
  assert.equal(new Set(versoes).size, 1, `versões de cache divergentes: ${versoes}`);
  assert.equal(versoes[0], "review-dpe-assuntos-v29");
});

async function abrirPagina() {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM(ler("plano-dpeam-2026.html"), { url: "https://review-dpe.test/plano-dpeam-2026.html", runScripts: "dangerously", pretendToBeVisual: true });
  await new Promise(r => setTimeout(r, 0));
  return dom;
}
const digitar = (dom, el, valor) => { el.value = String(valor); el.dispatchEvent(new dom.window.Event("input", { bubbles: true })); };

test("a página do plano mostra o edital, as fases datadas e funciona sem rede", async () => {
  const { programas } = catalogos();
  const dom = await abrirPagina();
  try {
    const { document } = dom.window;
    assert.equal(document.querySelectorAll("script[src]").length, 0);
    assert.match(document.querySelector("#countdown").textContent, /prova/);
    assert.equal(document.querySelectorAll("#bars .bar-row").length, 2);
    assert.equal(document.querySelectorAll("#fases tbody tr").length, 4);
    assert.equal(document.querySelectorAll("#weeks .week").length, 4);
    assert.equal(document.querySelectorAll("#checklist [data-check]").length, 12);
    const texto = document.body.textContent;
    for (const trecho of ["07/03/2027", "04/01/2027", "05/01/2027", "04/12/2026", "Fundação Carlos Chagas", "item 13.2"]) assert.ok(texto.includes(trecho), `falta ${trecho}`);
    const linhas = [...document.querySelectorAll("#mapa tbody tr[data-rubrica]")];
    assert.equal(linhas.length, 11);
    for (const d of programas[ID].disciplinas) {
      const linha = document.querySelector(`#mapa tr[data-rubrica="${d.id}"]`);
      assert.ok(linha, `mapa sem ${d.id}`);
      assert.equal(Number(linha.dataset.assuntos), d.topicos.length, `contagem de assuntos de ${d.id} divergiu do catálogo`);
    }
  } finally { dom.window.close(); }
});

test("o simulador aplica a fórmula do item 9.2: toda questão vale o mesmo e 36 acertos dão 6,00", async () => {
  const dom = await abrirPagina();
  try {
    const { document } = dom.window;
    const cg = document.querySelector("#simCG"), ce = document.querySelector("#simCE"), nota = () => document.querySelector("#simNota").textContent.trim();
    digitar(dom, cg, 12); digitar(dom, ce, 24);
    assert.equal(nota(), "6,00");
    assert.match(document.querySelector("#simStatus").textContent, /piso/i);
    digitar(dom, cg, 20); digitar(dom, ce, 0);
    assert.equal(nota(), "3,33");
    digitar(dom, cg, 0); digitar(dom, ce, 40);
    assert.equal(nota(), "6,67");
    digitar(dom, cg, 1); digitar(dom, ce, 0);
    assert.equal(nota(), "0,17");
    assert.match(document.querySelector("#simStatus").textContent, /abaixo/i);
    digitar(dom, cg, 99); digitar(dom, ce, 99);
    assert.equal(nota(), "10,00", "valores acima do máximo são limitados a 20 e 40");
    digitar(dom, cg, -5); digitar(dom, ce, "abc");
    assert.equal(nota(), "0,00");
  } finally { dom.window.close(); }
});

test("o diagnóstico por disciplina ordena pelo erro, exige amostra mínima e guarda só no aparelho", async () => {
  const dom = await abrirPagina();
  try {
    const { document, localStorage } = dom.window;
    const campo = (id, tipo) => document.querySelector(`[data-diag-${tipo}="${id}"]`);
    assert.equal(document.querySelectorAll("#diag [data-diag-acertos]").length, 11);
    digitar(dom, campo("direito_civil", "total"), 10); digitar(dom, campo("direito_civil", "acertos"), 2);
    digitar(dom, campo("lingua_portuguesa", "total"), 10); digitar(dom, campo("lingua_portuguesa", "acertos"), 9);
    digitar(dom, campo("direito_constitucional", "total"), 4); digitar(dom, campo("direito_constitucional", "acertos"), 1);
    const ordem = [...document.querySelectorAll("#diagRank li[data-rubrica]")].map(li => li.dataset.rubrica);
    assert.deepEqual(ordem, ["direito_civil", "lingua_portuguesa"]);
    assert.ok(document.querySelector('#diagFalta [data-rubrica="direito_constitucional"]'), "amostra com menos de 5 questões não entra no ranking");
    digitar(dom, campo("direito_penal", "total"), 10); digitar(dom, campo("direito_penal", "acertos"), 12);
    assert.equal(campo("direito_penal", "acertos").value, "10", "acertos não passam do total");
    const guardado = JSON.parse(localStorage.getItem("review-dpe:plano-dpeam-2026:diag:v1"));
    assert.deepEqual(guardado.direito_civil, [2, 10]);
    document.querySelector("#resetDiag").click();
    assert.equal(localStorage.getItem("review-dpe:plano-dpeam-2026:diag:v1"), null);
    assert.equal(document.querySelectorAll("#diagRank li[data-rubrica]").length, 0);
  } finally { dom.window.close(); }
});

test("o checklist guarda marcações só neste aparelho e pode ser limpo", async () => {
  const dom = await abrirPagina();
  try {
    const { document, localStorage, Event } = dom.window;
    const caixa = document.querySelector('[data-check="4"]');
    caixa.checked = true;
    caixa.dispatchEvent(new Event("change", { bubbles: true }));
    assert.deepEqual(JSON.parse(localStorage.getItem("review-dpe:plano-dpeam-2026:datas:v1")), [4]);
    document.querySelector("#resetChecklist").click();
    assert.equal(localStorage.getItem("review-dpe:plano-dpeam-2026:datas:v1"), "[]");
  } finally { dom.window.close(); }
});

test("as datas das fases ficam dentro do intervalo entre hoje e a prova e em ordem", async () => {
  const dom = await abrirPagina();
  try {
    const linhas = [...dom.window.document.querySelectorAll("#fases tbody tr")];
    const datas = linhas.map(l => l.dataset);
    assert.deepEqual(datas.map(d => d.inicio), ["2026-11-05", "2026-11-30", "2027-01-25", "2027-03-01"]);
    assert.deepEqual(datas.map(d => d.fim), ["2026-11-29", "2027-01-24", "2027-02-28", "2027-03-07"]);
    for (let i = 1; i < datas.length; i++) {
      const anterior = new Date(`${datas[i - 1].fim}T00:00:00Z`), atual = new Date(`${datas[i].inicio}T00:00:00Z`);
      assert.equal((atual - anterior) / 86400000, 1, `fase ${i + 1} deve começar um dia depois da anterior`);
    }
  } finally { dom.window.close(); }
});
