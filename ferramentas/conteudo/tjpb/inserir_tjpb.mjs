// Insere o programa e o perfil de questões do Edital nº 01/2026 – TJPB (Analista Judiciário – Área Judiciária) nos catálogos.
// Uso: node inserir_tjpb.mjs <repo> <tjpb.json>   (tjpb.json sai de extrair_tjpb.py)
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

const especificas = disciplinas.slice(3);
const porEspecifica = Math.round((40 / especificas.length) * 100) / 100;
const ROTULOS = {
  lingua_portuguesa: "Língua Portuguesa", etica_gestao_servico_publico: "Ética e Gestão no Serviço Público",
  informatica_protecao_dados: "Noções de Informática e Proteção de Dados", direito_constitucional: "Direito Constitucional",
  direito_administrativo: "Direito Administrativo", direito_civil_consumidor: "Direito Civil e Direito do Consumidor",
  direito_processual_civil: "Direito Processual Civil", direito_penal: "Direito Penal", direito_processual_penal: "Direito Processual Penal",
  direitos_humanos_tutela_coletiva: "Direitos Humanos e Tutela Coletiva",
};
const g = (d, valor, evidencia) => ({ label: ROTULOS[d.id], valor, subjects: d.canonicais, evidencia });

regravar("arquivos/cronograma-pesos.js", obj => {
  if (obj[id]) throw new Error(`${id} já existe nos pesos`);
  obj[id] = {
    fonte,
    tipo: "questoes",
    grupos: [
      g(disciplinas[0], 10, "Item 10.8.3, quadro de Analista – Judiciário: Língua Portuguesa, 10 questões (Módulo de Conhecimentos Gerais)."),
      g(disciplinas[1], 5, "Item 10.8.3: Ética e Gestão no Serviço Público, 5 questões (Módulo de Conhecimentos Gerais)."),
      g(disciplinas[2], 5, "Item 10.8.3: Noções de Informática e Proteção de Dados, 5 questões (Módulo de Conhecimentos Gerais)."),
      ...especificas.map(d => g(d, porEspecifica, `Item 10.8.3: 40 questões de Conhecimentos Específicos sem divisão por disciplina; ${porEspecifica} = 40 ÷ ${especificas.length}, divisão igual que só orienta o tempo.`)),
    ],
    nota: `Cargo de servidor (Analista Judiciário – Área Judiciária). A prova objetiva tem 60 questões de 1 ponto: 20 de Conhecimentos Gerais (Português 10, Ética e Gestão 5, Informática e Proteção de Dados 5) e 40 de Conhecimentos Específicos (item 10.8.3). O edital não divide as 40 específicas entre as sete disciplinas; aqui cada uma recebe ${porEspecifica} (divisão igual), o que orienta TEMPO e não é peso de aprovação. Aprovação na objetiva com 60% do total, sem mínimo por módulo (item 10.12); desempate pela maior nota nos Específicos (item 13.1). A discursiva (estudo de caso de 30 linhas, 40 pontos, itens 10.7 e 12.1) não foi somada.`,
  };
}, 2);

console.log("ok", id, disciplinas.length, "rubricas", disciplinas.reduce((n, d) => n + d.topicos.length, 0), "tópicos");
