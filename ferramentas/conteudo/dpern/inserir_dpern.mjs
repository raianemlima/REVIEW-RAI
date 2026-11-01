// Insere no Cronograma o programa do III Concurso da DPE/RN (Res. nº 344/2025) e o quadro da prova objetiva.
// Uso: node ferramentas/conteudo/dpern/inserir_dpern.mjs <repo> <rn-2025.json>   (o JSON sai de extrair_dpern.py)
// Rodar de novo troca o que já estiver no catálogo (o programa pode ser completado quando chegar o texto integral).
import { readFileSync, writeFileSync } from "node:fs";

const [repo, origem] = process.argv.slice(2);
if (!repo || !origem) { console.error("Uso: node inserir_dpern.mjs <repo> <rn-2025.json>"); process.exit(1); }
const programa = JSON.parse(readFileSync(origem, "utf8"));

function regravar(arquivo, transformar, indent) {
  const caminho = `${repo}/${arquivo}`;
  const s = readFileSync(caminho, "utf8");
  const i = s.indexOf("{"), f = s.lastIndexOf("}");
  const obj = JSON.parse(s.slice(i, f + 1));
  transformar(obj);
  writeFileSync(caminho, s.slice(0, i) + JSON.stringify(obj, null, indent) + s.slice(f + 1));
}

const { id, fonte, relatorio, lacunas, disciplinas } = programa;
regravar("arquivos/cronograma-conteudo.js", obj => { obj[id] = { id, fonte, relatorio, lacunas, disciplinas }; });

// Quadro da p. 5 do DOE nº 15.871 (antes do art. 43): 4 grupos de 25 questões, sem divisão por disciplina.
const GRUPOS = [
  ["I", "Grupo I: Direito Constitucional, Direito Administrativo e Princípios Institucionais da Defensoria Pública"],
  ["II", "Grupo II: Direito Penal, Direito Processual Penal e Execução Penal"],
  ["III", "Grupo III: Direito Civil, Direito Processual Civil e Direito do Consumidor"],
  ["IV", "Grupo IV: Direitos Humanos, Direitos Difusos e Coletivos e Direito da Criança e do Adolescente"],
];
const grupos = GRUPOS.map(([g, label]) => ({
  label, valor: 25,
  subjects: [...new Set(disciplinas.filter(d => d.observacao.startsWith(`Grupo ${g} `)).flatMap(d => d.canonicais))],
  evidencia: `Res. nº 344/2025, quadro da prova objetiva (p. 5 do DOE nº 15.871, antes do art. 43): Grupo ${g}, 25 questões.`,
}));
if (grupos.some(g => !g.subjects.length)) throw new Error("grupo sem disciplina: confira o campo observacao");
regravar("arquivos/cronograma-pesos.js", obj => {
  obj[id] = {
    fonte, tipo: "grupos", grupos,
    nota: "Distribuição da prova objetiva do III Concurso (Res. nº 344/2025): 100 questões em 4 grupos de 25, sem divisão por disciplina dentro do grupo. Reservar 25% do tempo a cada grupo e repartir entre as disciplinas listadas é hipótese de tempo, não peso oficial individual. Habilitação para a discursiva com 60% da nota global e até a 400ª posição (art. 43). Discursivas, peças, prova oral e títulos não foram somados. O edital do Cebraspe pode ajustar o quadro.",
  };
}, 2);

console.log("ok", id, disciplinas.length, "rubricas", disciplinas.reduce((n, d) => n + d.topicos.length, 0), "tópicos");
