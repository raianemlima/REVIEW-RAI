# Cronograma por editais de Defensoria

## O que foi analisado

Foram recebidos 24 arquivos em Markdown derivados de documentos oficiais. A triagem foi feita apenas com o material anexado, sem completar lacunas com busca externa. O filtro usado foi: concurso para a carreira de Defensor(a) Público(a), edital de 2021 a 2026 inclusive e conteúdo programático verificável.

O catálogo final contém **18 editais de carreira**, distribuídos por **16 estados**: AC, AP, AM, CE, ES, MA, MG, MT, PE, RJ, RO, RS, SC, SE, SP e TO. Mato Grosso e Santa Catarina aparecem em mais de um edital. Isso é uma amostra relevante para iniciar o recurso, mas **não representa todos os estados brasileiros** e não autoriza afirmar que uma matéria é universal em todas as DPEs do país.

Ficaram fora dois cadernos/provas discursivas isoladas, um caderno de prova objetiva sem lista formal de disciplinas, o edital de 2014 do RJ e dois concursos para servidores de Defensoria. O arquivo `EDITAL01_2026DEABERTURADEINSCRICAO.md` foi conferido separadamente: apesar do nome anterior ter divergido do anexo, ele é o VII Concurso da DPE/MA, publicado em 2026, e entrou no corpus.

## Núcleo comum do corpus

Após normalizar variações evidentes de nomenclatura — por exemplo, “Direito Penal e Criminologia” conta para Direito Penal e “Direito Processual Penal e Execução Penal” conta para Direito Processual Penal — as sete áreas abaixo aparecem nos 18 editais elegíveis:

1. Direito Constitucional;
2. Direito Administrativo;
3. Direito Civil;
4. Direito Processual Civil;
5. Direito Penal;
6. Direito Processual Penal;
7. Direito Institucional da Defensoria Pública, incluindo títulos como princípios, atribuições, legislação ou organização institucional.

“Comum” aqui significa **presente no conteúdo programático dos 18 editais da amostra, depois da normalização documentada**. Não significa mesmo peso, mesma extensão, mesma fase ou garantia de cobrança. Os editais variam bastante: alguns juntam disciplinas, outros não distribuem o conteúdo por fase e alguns dão peso maior a peças, questões, prova oral ou tribuna.

## Matérias recorrentes e opcionais

Direitos Humanos, Direito do Consumidor, Direito da Criança e do Adolescente, Execução Penal e Direitos Difusos e Coletivos são oferecidos como recorrentes, porém não entram automaticamente no núcleo de sete áreas. Tributário, Criminologia, Empresarial, Direito do Idoso, Filosofia/Sociologia Jurídica, Antidiscriminatório, Ambiental/Urbanístico, Agrário, Tutela Coletiva, Sanitário, Trabalho, Previdenciário, Saúde, Medicina Legal e legislação penal extravagante ficam disponíveis como matérias opcionais ou específicas do edital selecionado.

A escolha do aluno parte do edital-alvo. Assim, uma matéria específica do Maranhão, Rondônia ou Tocantins não aparece como obrigação para quem seleciona outro estado. O modo “Núcleo comum documentado” é um ponto de partida comparativo, não um edital real.

## Como o recurso funciona no app

O módulo `arquivos/cronograma.js` guarda o plano em `S.ajustes.cronograma`, usando o mesmo mecanismo de backup, sincronização e persistência das preferências existentes. O plano registra:

- edital de referência;
- horas por semana;
- dias escolhidos;
- disciplinas escolhidas;
- distribuição percentual editável;
- duração preferida do bloco;
- se o ritmo deve ser aplicado às metas já existentes.

Ao salvar com a opção de aplicação ativada, o app atualiza o tempo diário, deriva uma meta moderada de cartões e restringe as sessões às disciplinas do baralho que puderem ser associadas com segurança. A associação é conservadora: quando uma matéria documental não tem cartão correspondente no baralho atual, ela continua visível no plano, mas não é inventado um conteúdo para ela.

A fila do FSRS, o histórico de respostas, as notas e os cartões não são recriados nem apagados. O cronograma organiza a capacidade informada; ele não converte horas em promessa de aprendizagem. A meta de cartões continua sendo uma medida de atividade, não de aprovação ou domínio.

## Critérios de produto

O editor não exige zerar a fila. Dias não selecionados são apresentados como dias livres, não como falhas. A distribuição precisa somar 100%, pode ser dividida igualmente e pode ser ajustada depois. O resumo semanal mostra o custo aproximado de cada área e o número de cartões é apresentado como referência compatível com a rotina, não como obrigação inflexível.

O recurso também preserva a distinção entre disciplina e formato de avaliação. Peça processual, questão discursiva, prova oral, prova de tribuna e prova de títulos são mostrados apenas como diferenças de edital no diagnóstico; não viram disciplinas artificiais no plano.

## Limites da evidência

A contagem é por edital/documento, não por estado, número de questões ou peso final. A seleção de 18 editais cobre 16 estados, não todas as unidades da federação. A normalização de rótulos combinados é útil para planejamento, mas precisa ser revisada quando o aluno escolher um edital específico. Uma frequência documental não é probabilidade de aprovação, e uma meta cumprida não é prova de retenção.

A ferramenta deve ser tratada como uma hipótese revisável de organização. O aluno pode começar pelo núcleo comum, selecionar o edital que pretende prestar, acrescentar matérias opcionais, ajustar horas e dias e observar seu próprio histórico para recalibrar o plano.

## Percentuais automáticos por edital

O erro que rejeitava `7,69` vinha da combinação de um campo numérico com `step="0.5"` e valores gerados com duas casas decimais. Os percentuais agora usam um campo de texto com teclado decimal, aceitam vírgula ou ponto e validam de 0 a 100 com até duas casas. Texto inválido, valores negativos, acima de 100 e uma distribuição inteiramente zerada não podem ser salvos. O app não converte uma entrada inválida silenciosamente em zero.

Ao escolher um edital ou mudar as matérias, o botão **Sugerir pelo edital** usa as quantidades verificadas da **prova objetiva**. Foram conferidos os 18 anexos do catálogo: 14 permitem uma referência numérica por rubrica ou grupo; AC/2024, RJ/2026, SE/2021 e SP/2026 ficam com sugestão equilibrada, porque não foi identificada uma distribuição verificável por disciplina. O modo Núcleo comum também usa equilíbrio, sem fingir que possui pesos oficiais. Abaixo dos campos aparecem o critério, o arquivo-fonte e os itens/páginas utilizados.

Uma contagem conjunta, por exemplo Penal e Criminologia, entra uma única vez. O valor é repartido internamente entre os IDs associados como hipótese de tempo. Os pesos por grupos de RO/2022, RS/2025 e TO/2021 recebem o mesmo tratamento: o total do grupo é preservado antes de renormalizar apenas as matérias escolhidas. Questões discursivas, peças, prova oral e pesos entre fases não são somados à objetiva.

Os valores representam **tempo sugerido**, não pesos oficiais individuais de aprovação. Se o catálogo oferece uma matéria sem quantidade própria no quadro objetivo, ela recebe uma reserva média calculada a partir das matérias numericamente cobertas; o app informa essa hipótese. Disciplinas sem ID catalogado, como Português em RS/2025 e SC/2026 e legislação local específica do Acre, permanecem declaradas como lacunas na fonte; não se cria um conteúdo de baralho fictício.

**Dividir igualmente** distribui o tempo uniformemente. **Sugerir pelo edital** restaura a proposta documental. Na edição manual, ao confirmar o percentual de uma disciplina, esse valor fica fixado e as demais dividem proporcionalmente o saldo. Com uma única matéria selecionada, seu percentual é 100%. A soma e a prévia respondem aos campos atuais, inclusive depois de alterar as matérias.

O cálculo trabalha em centésimos inteiros e distribui o arredondamento pelo método dos maiores restos. Assim, 13 matérias não ficam com um total de 99,97%: os centésimos restantes são distribuídos de forma determinística e o resultado fecha em **100,00%**. A prévia também conserva o orçamento semanal em minutos inteiros, com possíveis ajustes de um minuto por arredondamento; seus valores por matéria são referências da semana, não tarefas repetidas integralmente em cada dia.

Horas, dias e tamanho do bloco são preservados ao trocar o edital no rascunho. Percentuais de um plano ativo já salvo continuam como foram escolhidos; uma nova sugestão não os substitui sem confirmação de salvamento. O plano persiste no mesmo objeto de ajustes/backup e conserva a aplicação das metas existentes.

### Verificações e limites desta correção

A revisão independente não encontrou falha funcional crítica. Foram executados testes de campos com vírgula/ponto, soma em centésimos, proporção documental, redistribuição, entradas inválidas, rascunho e reabertura de pesos personalizados. Os perfis foram extraídos exclusivamente dos anexos; não houve pesquisa de retificações posteriores na internet nem certificação de todos os conteúdos locais. A conferência em DOM simulado não equivale a teste no Safari/iPhone da captura nem a teste autenticado de produção. A entrega segue em branch/PR de revisão, sem merge ou publicação automática.
