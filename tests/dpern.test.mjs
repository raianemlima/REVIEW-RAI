import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vm from "node:vm";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ler = f => readFileSync(join(raiz, f), "utf8");
function catalogos() {
  const ctx = { window: {} }; vm.createContext(ctx);
  for (const f of ["arquivos/cronograma-taxonomia.js", "arquivos/cronograma-conteudo.js", "arquivos/cronograma-pesos.js"]) vm.runInContext(ler(f), ctx);
  return ctx.window;
}
const embutido = (nome) => { const a = ler("app-src.txt"), i = a.indexOf(`const ${nome} = `); return JSON.parse(a.slice(i + nome.length + 9, a.indexOf(";\n", i)).replace(/<\\\//g, "</")); };

test("III Concurso da DPE/RN no Cronograma: 12 matérias do regulamento, 4 grupos de 25 e lacunas do PDF declaradas", () => {
  const w = catalogos(), rn = w.DPE_CONTEUDOS_EDITAIS["rn-2025"], pesos = w.DPE_PESOS_EDITAIS["rn-2025"];
  assert.equal(rn.disciplinas.length, 12);
  assert.equal(rn.relatorio, false, "fora do relatório de frequência enquanto o programa estiver incompleto");
  assert.match(rn.fonte, /Resolução nº 344\/2025/);
  assert.ok(rn.lacunas.some(l => /perde texto em toda virada de página/.test(l)));
  assert.ok(rn.lacunas.some(l => /DIREITO DA CRIANÇA E DO ADOLESCENTE: itens 1, 2, .* 18 ausentes/.test(l)));
  // trechos cortados ficam marcados, nada é completado de memória
  const topicos = rn.disciplinas.flatMap(d => d.topicos);
  assert.ok(topicos.length > 150);
  assert.ok(topicos.filter(t => /\[(início|final) ausente no PDF do DOE\]/.test(t.texto)).length >= 10);
  for (const t of topicos) assert.match(t.pagina, /^Res\. 344\/2025, Anexo I, p\. (8|9|1[0-5]) do DOE nº 15\.871$/);
  const completas = Object.fromEntries(rn.disciplinas.map(d => [d.id, d.topicos.length]));
  assert.equal(completas.direito_processual_penal, 30);
  assert.equal(completas.principios_institucionais, 13);
  // quadro da objetiva: 4 grupos de 25, só com canônicos do próprio programa
  assert.equal(pesos.tipo, "grupos");
  assert.deepEqual(Array.from(pesos.grupos, g => g.valor), [25, 25, 25, 25]);
  const canonicos = new Set(rn.disciplinas.flatMap(d => d.canonicais));
  for (const g of pesos.grupos) for (const s of g.subjects) assert.ok(canonicos.has(s), s);
  assert.match(ler("arquivos/cronograma.js"), /\["rn-2025","RN",2025,"DPE\/RN · III Concurso · Regulamento \(Res\. 344\/2025\)"\]/);
  assert.match(ler("arquivos/dashboard-editais.js"), /programa\?\.relatorio !== false/);
});

test("prova da DPE/RN 2015 (Cespe) para resolver no app: 100 questões, gabarito definitivo e anuladas", () => {
  const p = embutido("PROVAS_PUBLICO").find(x => x.id === "dpe-rn-2015");
  assert.ok(p, "dpe-rn-2015 embutida em PROVAS_PUBLICO");
  assert.equal(p.gabarito, "definitivo");
  assert.equal(p.questoes.length, 100);
  assert.deepEqual(p.questoes.map(q => q.n), Array.from({ length: 100 }, (_, i) => i + 1));
  assert.deepEqual(p.questoes.filter(q => q.gabarito === "X").map(q => q.n), [14, 35, 37, 97]);
  for (const q of p.questoes) {
    assert.deepEqual(Object.keys(q.alternativas), ["A", "B", "C", "D", "E"], `questão ${q.n}`);
    assert.match(q.gabarito, /^[A-EX]$/);
    assert.ok(q.enunciado.length > 20 && q.materia, `questão ${q.n}`);
    assert.doesNotMatch(q.enunciado + Object.values(q.alternativas).join(" "), /CEBRASPE – DPERN|\|\|208DPERN|Espaço livre/);
  }
  assert.equal(p.questoes[0].gabarito, "A");
  assert.equal(p.questoes[99].gabarito, "B");
  assert.equal(p.questoes.find(q => q.n === 81).gabarito, "C");
});

test("documentos oficiais da DPE/RN publicados sem metadados pessoais e listados em Provas anteriores", () => {
  const pasta = join(raiz, "documentos/dpe-rn"), arquivos = readdirSync(pasta).sort();
  assert.deepEqual(arquivos, ["dpe-rn-2015-edital-abertura.pdf", "dpe-rn-2015-gabarito-definitivo.pdf", "dpe-rn-2015-prova-objetiva.pdf", "res-344-2025-regulamento-iii-concurso.pdf"]);
  for (const f of arquivos) {
    const bin = readFileSync(join(pasta, f)).toString("latin1");
    assert.doesNotMatch(bin, /jacson|gisele|\/Author|x:xmpmeta/i, f);
  }
  const provas = embutido("DPE_PUBLICO").provas.filter(v => v.orgao === "DPE-RN");
  assert.deepEqual(provas.map(v => v.ano), [2025, 2015]);
  const links = provas.flatMap(v => v.links.map(l => l.url));
  assert.deepEqual(links.map(u => u.replace("documentos/dpe-rn/", "")).sort(), arquivos);
  assert.deepEqual(JSON.parse(ler("ferramentas/conteudo/dados/defensoria.json")).provas.filter(v => v.orgao === "DPE-RN"), provas);
  assert.match(ler(".github/workflows/pages.yml"), /cp -r documentos _site\//);
});
