// Insere o programa e o perfil por questões do Edital nº 01/2026 – DPE/AM (cargo R) nos catálogos.
// Uso: node inserir_dpeam.mjs <repo> <dpeam.json>
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

// O edital (item 7.1) só dá o total por prova: 20 gerais e 40 específicas. Dentro de cada prova a divisão
// é igual e serve de ponto de partida para o TEMPO; não é peso oficial por disciplina.
const GERAIS = {
  lingua_portuguesa: "Língua Portuguesa",
  legislacao_defensoria: "Legislação da Defensoria",
  conhecimentos_juridicos_institucionais: "Conhecimentos Jurídicos e Institucionais",
};
const ESPECIFICOS = {
  direito_constitucional: "Direito Constitucional",
  direito_administrativo: "Direito Administrativo",
  direito_civil: "Direito Civil",
  direito_processual_civil: "Direito Processual Civil",
  direito_penal: "Direito Penal",
  direito_processual_penal: "Direito Processual Penal",
  direitos_humanos: "Direitos Humanos",
  direito_crianca_idoso_pcd_mulher: "Direito da Criança e do Adolescente, do Idoso, da Pessoa com Deficiência e da Mulher",
};

const grupo = (rid, label, valor, evidencia) => {
  const d = disciplinas.find(x => x.id === rid);
  if (!d) throw new Error(`rubrica ${rid} ausente do programa`);
  return { label, valor, subjects: d.canonicais, evidencia };
};
const gGeral = (rid, label) => grupo(rid, label, 20 / Object.keys(GERAIS).length,
  "Item 7.1, quadro da prova objetiva (cargo R): Conhecimentos Gerais, 20 questões de peso 1, sem divisão por rubrica no edital; divisão igual entre as três rubricas (6,67 cada).");
const gEspecifico = (rid, label) => grupo(rid, label, 40 / Object.keys(ESPECIFICOS).length,
  "Item 7.1, quadro da prova objetiva (cargo R): Conhecimentos Específicos, 40 questões de peso 2, sem divisão por disciplina no edital; divisão igual entre as oito rubricas (5 cada).");

regravar("arquivos/cronograma-pesos.js", obj => {
  if (obj[id]) throw new Error(`${id} já existe nos pesos`);
  obj[id] = {
    fonte,
    tipo: "questoes",
    grupos: [
      ...Object.entries(GERAIS).map(([rid, label]) => gGeral(rid, label)),
      ...Object.entries(ESPECIFICOS).map(([rid, label]) => gEspecifico(rid, label)),
    ],
    nota: "Cargo de servidor (Analista Jurídico de Defensoria – Ciência Jurídica, código R). A prova objetiva tem 60 questões de múltipla escolha com cinco alternativas, em 3 horas: 20 de Conhecimentos Gerais (peso 1) e 40 de Conhecimentos Específicos (peso 2), itens 7.1 e 7.2. Pelo item 9.2, a nota é a média ponderada das duas notas (0 a 10). Como cada prova é medida sobre o seu próprio número de questões, toda questão vale o mesmo (1/6 de ponto): o peso 2 não torna a questão específica mais valiosa e os Específicos respondem por 40/60 da nota, não por 80%. Por isso o perfil usa o número de questões, e não questões × peso. O edital não divide as 20 questões gerais entre as três rubricas nem as 40 específicas entre as oito; aqui vale a divisão igual (6,67 e 5), que orienta TEMPO e não é peso de aprovação. Nota mínima 6,00 (item 9.3), o que equivale a 36 acertos em 60 se a conversão para a escala 0 a 10 for linear (o edital não detalha). Desempate: maior número de acertos nos Específicos e depois em Língua Portuguesa (itens 10.3.2 e 10.3.3). Não há discursiva, prova prática nem títulos. O cronograma é sujeito a alteração.",
  };
}, 2);

console.log("ok", id, disciplinas.length, "rubricas", disciplinas.reduce((n, d) => n + d.topicos.length, 0), "tópicos");
