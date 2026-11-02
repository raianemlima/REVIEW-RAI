# Estudo direcionado: erro vira revisão, mapa de incidência, lacunas e varredura mensal

Quatro recursos que ligam o que cai em prova ao que você revisa. Código em `app-src.txt` (bloco "v5"); testes em `tests/estudo-direcionado.test.mjs` e `tests/varredura.test.mjs`.

## 1. Erro vira revisão

- **Provas de concurso:** ao marcar uma alternativa errada, o app cria o cartão da questão, no tema do baralho mais parecido com o enunciado (`afinidade`), e **antecipa para hoje até 2 cartões já estudados do mesmo assunto** (os de menor chance de lembrança; teto de 24 por dia). Id estável (`mc-pv-<prova>-<n>`): o mesmo erro nunca gera dois cartões. O botão antigo "Mandar erradas para a revisão" continua valendo.
- **Treino das Novidades, Informativos e Teses:** o "certo ou errado" agora tem botões. Quem erra ganha um cartão `Certo ou errado` (id `mc-tr-…`) e antecipa cartões parecidos; quem acerta só vê a explicação. O resultado fica em `S.ajustes.nvTreino` e sincroniza entre aparelhos.
- **Ranking e fila:** "Temas em que mais erra" (Estatísticas › Caderno de erros) soma cartões errados e questões erradas (`S.ajustes.errosQ`). Cada tema com erro nos últimos 30 dias ganha **+12% de prioridade por erro, até +60%** em `prio()` (`fatorTema`), então sobe na fila da revisão diária. O botão "Treinar" só aparece se o tema existir no baralho.
- **Desligar:** caixa "Erro em questão vira cartão de revisão…" no Caderno de erros (`S.ajustes.erroAuto`).

O casamento enunciado × cartão usa palavras raras em comum (pelo menos 2, peso por raridade). Não é inteligência: se o tema vier errado, apague o cartão em Biblioteca › Meus cartões.

## 2. Mapa de incidência (Estudar › Mapa de incidência)

Para o edital escolhido (padrão: o do seu estado em Ajustes, ou TJPB na direção Tribunal), mostra por assunto: **questões do banco** (filtro por banca), **cartões do baralho**, **seu acerto** nas provas resolvidas, e marca "Cai muito, pouco coberto", "Você erra" e "Bem coberto". No topo, "Comece por aqui" ordena por incidência × falta de cobertura × erro.

- Cada questão vai para **um** assunto do edital: o da disciplina dela (campo `d`) cujas palavras do título aparecem no enunciado ou nas alternativas.
- A disciplina `d` de cada questão vem de `ferramentas/conteudo/questoes/materias.py`: usa a matéria do caderno quando ela nomeia uma disciplina só e, nas demais, palavras-chave. **Medida: 79% de acerto em 58% das questões de matéria conhecida**; hoje 64% do banco tem `d` e o resto fica de fora do mapa. Trate os números como tendência. `para_banco.py` já chama o classificador; para reclassificar o banco inteiro: `python ferramentas/conteudo/questoes/materias.py app-src.txt --gravar`.
- Peso do edital por disciplina vem de `cronograma-pesos.js` (no DPE/RN, por grupo de disciplinas).

## 3. Lacunas (cartões "____")

- **Novidades:** cada item tem o campo `lacunas` (`d` = disciplina do baralho, `f` = frase com um `____`, `v` = resposta curta). O botão "Criar N cartões de lacuna" no item cria os cartões (`lz-nv-<id>-<i>`), uma vez só. Os 27 itens de 2026 trazem 94 lacunas, em `ferramentas/conteudo/dados/novidades-lacunas-2026.json` (mesclado nos JSON de Novidades).
- **Lei seca:** o botão na tela da lei cria até 12 lacunas por clique dos artigos **mais cobrados** (campo `n` ≥ 2) que têm prazo, percentual ou quórum no texto. Lê o baralho aberto no aparelho; nada disso vai para o repositório.
- Corrige pela digitação aproximada (`fillMatch`); a resposta fica no verso.

## 4. Varredura mensal

O script `ferramentas/conteudo/varredura/varredura.py` (só biblioteca padrão, sem segredo):

- procura no Planalto leis, leis complementares e emendas com número acima do último conferido (`ferramentas/conteudo/dados/varredura-estado.json`) e confere as **pendentes** do lote anterior;
- procura no STF e no STJ as edições de informativo seguintes às de `arquivos/informativos/indice.json`;
- escreve `varredura-AAAA-MM.md` (relatório, por prioridade), `candidatos-AAAA-MM.json` (esboço de item) e `status.txt`.

Se o site não responde como esperado (primeiro confere uma norma conhecida, a Lei 15.471), o relatório diz **"Atenção"** em vez de "nada de novo".

**Onde roda**

- **GitHub Actions** (`.github/workflows/varredura-mensal.yml`, dia 1º, 8h de Brasília, ou "Run workflow"): abre/atualiza a issue "Varredura de MM/AAAA" quando acha algo. **O Planalto bloqueia os servidores do GitHub** ("Acesso Negado"), então ali só os informativos chegam; o aviso aparece no relatório.
- **Na sua máquina:** `python ferramentas/conteudo/varredura/varredura.py` (o Planalto responde a conexões do Brasil).
- **Rotina do Claude** (cloud, mensal): roda o script, lê o texto oficial de cada norma, redige o lote no formato de `novidades-2026-11-0*.json` e abre uma **PR** para você aprovar. Nunca faz merge sozinha.

Depois de um lote: suba `desde` no estado e, para largar uma norma de propósito, ponha o número em `deixadas`. Quem redige lê o texto oficial; nada entra no app sem revisão.
