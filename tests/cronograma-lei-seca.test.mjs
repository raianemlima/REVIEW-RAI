// Atalho "⚖️ Lei seca" do Cronograma: só sai quando a lei é a da disciplina do assunto (ou citada no edital).
// A tabela LEI_DA_DISCIPLINA usa os ids base (cf, idoso, epcd...), mas no baralho publicado essas leis têm outros ids:
// as do curso ganham o sufixo -dls (e substituem a seleção antiga) e o EPD é a l13146 (texto oficial) ou a epd-dls (grifada).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vm from "node:vm";
import { JSDOM } from "jsdom";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ler = f => readFileSync(join(raiz, f), "utf8");
const html = ler("index.html"), app = ler("app-src.txt").replace(/\nboot\(\);\s*$/, "\n");
const m0 = html.indexOf("// Motor de revisão:"), fsrs = html.slice(m0, html.indexOf("</script>", m0));
const fontes = ["cronograma-pesos.js", "cronograma-taxonomia.js", "cronograma-conteudo.js", "cronograma-motor.js", "cronograma.js"].map(f => ler("arquivos/" + f));
const programa = (() => { const c = { window: {} }; vm.createContext(c); vm.runInContext(ler("arquivos/cronograma-conteudo.js"), c); return c.window.DPE_CONTEUDOS_EDITAIS["am-2026-servidor"]; })();
// o artigo de teste traz os títulos de todos os assuntos da rubrica: qualquer assunto do dia casa com a lei, e o resultado depende só do id
const textoDe = rub => "Art. 1º " + programa.disciplinas.find(d => d.id === rub).topicos.map(t => t.titulo).join(". ");

function atalhoDeLei(idLei, rubrica) {
  const dom = new JSDOM('<!doctype html><html><body><header><button id="goBusca"></button><button id="goAjustes"></button><span id="save"></span><nav id="tabs"></nav></header><main id="main"></main></body></html>', { url: "https://fixture.invalid/", runScripts: "outside-only", pretendToBeVisual: true });
  dom.window.scrollTo = () => {}; dom.window.fetch = () => { throw Error("Rede bloqueada"); };
  const run = s => vm.runInContext(s, dom.getInternalVMContext());
  const lei = { id: idLei, nome: `Lei fictícia ${idLei}`, curto: "X", disc: "dc", completa: true, grupos: [{ itens: [{ a: "1", x: textoDe(rubrica) }] }] };
  run(`const DECK={versao:"f",disciplinas:[{id:"dc",nome:"Direito Constitucional",curto:"Constitucional",peso:1}],cartoes:[],leiseca:${JSON.stringify([lei])},ebooks:[]};`);
  run(fsrs); run(app); run('S.mode="local";S.ajustes.metaOn=false;S.ajustes.onboard=true;S.ajustes.minutos=10;S.ajustes.metaDiaria=10;ensureAj();'); fontes.forEach(run);
  run('go("cronograma")');
  try {
    const d = dom.window.document, ev = n => new dom.window.Event(n, { bubbles: true });
    const ed = d.querySelector("#crEdital"); ed.value = "am-2026-servidor"; ed.dispatchEvent(ev("change"));
    d.querySelectorAll("[data-cr-subject]").forEach(x => { x.checked = x.dataset.crSubject === rubrica; x.dispatchEvent(ev("change")); });
    d.querySelector("#crForm").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    run("S.ajustes.cronograma.dias=[1,2,3,4,5,6,7];"); run("renderHoje()");
    const b = d.querySelector('#cronogramaHoje [data-cr-acao="lei"]');
    return b ? JSON.parse(b.dataset.crIr).dip : null;
  } finally { dom.window.close(); }
}

test("o atalho de Lei seca sai com o id antigo e com os ids que o baralho publicado realmente tem (-dls, l13146, epd-dls)", () => {
  const casos = [
    ["cf", "direito_constitucional"], ["cf-dls", "direito_constitucional"],
    ["epcd", "direito_crianca_idoso_pcd_mulher"], ["l13146", "direito_crianca_idoso_pcd_mulher"], ["epd-dls", "direito_crianca_idoso_pcd_mulher"],
    ["idoso", "direito_crianca_idoso_pcd_mulher"], ["idoso-dls", "direito_crianca_idoso_pcd_mulher"],
    ["lmp", "direito_crianca_idoso_pcd_mulher"], ["lmp-dls", "direito_crianca_idoso_pcd_mulher"],
  ];
  for (const [id, rub] of casos) assert.equal(atalhoDeLei(id, rub), id, `${id} em ${rub}`);
});

test("lei que não é a da disciplina não ganha o atalho só por coincidência de palavras (controle negativo)", () => {
  assert.equal(atalhoDeLei("l9784-dls", "direito_constitucional"), null);
  assert.equal(atalhoDeLei("l8987-dls", "direito_crianca_idoso_pcd_mulher"), null);
  assert.equal(atalhoDeLei("cp-dls", "direito_constitucional"), null);
});
