// Insere o programa e o perfil de pontos do Edital nº 1 – DPDF/2026 nos catálogos.
// Uso: node inserir_dpdf.mjs <repo> <dpdf.json>
import { readFileSync, writeFileSync } from "node:fs";

const [repo, origem] = process.argv.slice(2);
const programa = JSON.parse(readFileSync(origem, "utf8"));

function regravar(arquivo, transformar, indent) {
  const caminho = `${repo}/${arquivo}`;
  const s = readFileSync(caminho, "utf8");
  const i = s.indexOf("{"), f = s.lastIndexOf("}");
  const obj = JSON.parse(s.slice(i, f + 1));
  transformar(obj);
  writeFileSync(caminho, s.slice(0, i) + JSON.stringify(obj, null, indent) + s.slice(f + 1));
}

// Ordem de chaves igual à dos demais programas; cargo e plano são opcionais.
const { id, fonte, fonteUrl, cargo, plano, lacunas, disciplinas } = programa;
regravar("arquivos/cronograma-conteudo.js", obj => {
  if (obj[id]) throw new Error(`${id} já existe no catálogo`);
  obj[id] = { id, fonte, fonteUrl, cargo, plano, lacunas, disciplinas };
});

const g = (label, questoes, peso, subjects, bloco) => ({
  label,
  valor: questoes * peso,
  subjects,
  evidencia: `Item 10.1${bloco === "E" ? " e 10.2" : ""}, quadro da prova objetiva: ${questoes} ${questoes === 1 ? "questão" : "questões"} × peso ${peso} = ${questoes * peso} pontos (${bloco === "E" ? "Conhecimentos Específicos" : "Conhecimentos Básicos"}).`,
});

regravar("arquivos/cronograma-pesos.js", obj => {
  if (obj[id]) throw new Error(`${id} já existe nos pesos`);
  obj[id] = {
    fonte,
    tipo: "pontos",
    grupos: [
      g("Língua Portuguesa", 5, 1, [], "B"),
      g("Lei Orgânica do Distrito Federal e Lei Complementar Distrital nº 828/2010", 4, 1, ["direito_institucional_defensoria_publica"], "B"),
      g("Regime Jurídico dos Servidores Públicos do Distrito Federal", 3, 1, ["direito_administrativo"], "B"),
      g("Conhecimentos Acerca do Distrito Federal e da Política para Mulheres", 2, 1, [], "B"),
      g("Lei Maria da Penha", 3, 1, [], "B"),
      g("Noções de Informática", 2, 1, [], "B"),
      g("Noções de Primeiros Socorros", 2, 1, [], "B"),
      g("Direito Constitucional", 5, 2, ["direito_constitucional"], "E"),
      g("Direito Administrativo", 4, 2, ["direito_administrativo"], "E"),
      g("Direito Civil", 6, 2, ["direito_civil"], "E"),
      g("Direito Processual Civil", 6, 2, ["direito_processual_civil"], "E"),
      g("Direito Penal", 5, 2, ["direito_penal"], "E"),
      g("Direito Processual Penal", 5, 2, ["direito_processual_penal"], "E"),
      g("Direito da Criança e do Adolescente", 4, 2, ["direito_da_crianca_e_adolescente"], "E"),
      g("Direito do Consumidor", 3, 2, ["direito_do_consumidor"], "E"),
      g("Direitos Difusos e Coletivos", 3, 2, ["direitos_difusos_e_coletivos"], "E"),
      g("Direitos Humanos", 3, 2, ["direitos_humanos"], "E"),
      g("Normas Institucionais da Defensoria Pública e da Defensoria Pública do Distrito Federal", 5, 2, ["direito_institucional_defensoria_publica"], "E"),
    ],
    nota: "Cargo de servidor (Analista de Apoio à Assistência Judiciária – Direito e Legislação). A prova objetiva tem 70 questões: 21 de Conhecimentos Básicos com peso 1 (21 pontos) e 49 de Conhecimentos Específicos com peso 2 (98 pontos), total de 119 pontos (itens 10.1 e 10.2). Aqui o valor de cada grupo é a pontuação oficial (questões × peso), porque o peso dobrado muda o retorno de uma hora de estudo; ainda assim, os percentuais orientam TEMPO e não são pesos de aprovação. Cada grupo corresponde a uma rubrica do programa com o mesmo nome; o vínculo canônico de LODF/LC 828 e do Regime Jurídico serve só para relacionar conteúdo da Biblioteca e não soma pontos a Normas Institucionais ou Administrativo. Cortes da objetiva (item 10.14.4): 50% do total, 50% nos básicos, 50% nos específicos e Português diferente de zero. A prova discursiva (dissertação de 20 pontos e 3 questões de 10 pontos, item 11.1) e os títulos não foram somados.",
  };
}, 2);

console.log("ok", id, disciplinas.length, "rubricas", disciplinas.reduce((n, d) => n + d.topicos.length, 0), "tópicos");
