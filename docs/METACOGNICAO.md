# Metacognição no Review DPE

A proposta é ajudar você a perceber o que sabe, testar essa percepção e escolher como estudar depois. Não é um teste de inteligência, uma previsão de aprovação ou um diagnóstico de domínio.

## Antes: escolha um foco

No primeiro bloco comum do dia, você pode escolher um objetivo sugerido ou escrever até 140 caracteres. Por exemplo: “Explicar os prazos da LC 80/94 sem consultar”. Se houver uma reflexão anterior com uma mudança planejada, o app a apresenta como lembrete. Depois de começar ou pular, os outros blocos entram direto e reaproveitam o foco escolhido nesse dia, quando houver.

O planejamento é opcional. Use **Pular planejamento** para estudar imediatamente. A opção de não perguntar nas próximas sessões pode ser revertida em **Estatísticas**, junto das opções de confiança. Desativar essa pergunta não desativa o monitoramento nem a reflexão.

Simulados, treino de segunda fase e **Hoje, só 5 cartões** não recebem uma etapa inicial de planejamento: o módulo não acrescenta espera ao cronômetro dessas sessões nem atrapalha o começo do bloco leve.

Enquanto o progresso estiver sendo carregado, a interface não oferece ações de estudo. Isso evita criar uma sessão com o histórico ainda vazio. No planejamento, Enter e Espaço continuam funcionando nos botões, mas letras de resposta e atalhos de notas não atuam sobre os cartões.

## Durante: compare confiança e resultado

Antes de revelar a resposta, marque “Chutei”, “Acho” ou “Tenho certeza”, se quiser. Depois de responder, a faixa da sessão apresenta a classificação da tentativa anterior:

| Classificação | Como interpretar |
| --- | --- |
| Certeza não confirmada | Você estava confiante, mas o resultado não se confirmou. Confira a explicação. |
| Dúvida confirmada | A dúvida correspondia a uma dificuldade encontrada; agora existe um ponto concreto para revisar. |
| Acerto sem certeza | Houve resultado positivo, mas ainda havia dúvida. Teste novamente depois de um intervalo. |
| Acerto com confiança | Confiança e resultado coincidiram naquela tentativa. Isso ainda não comprova domínio duradouro. |

**De onde vem o resultado?** Em múltipla escolha e certo ou errado, ele vem do gabarito. A nota “Difícil”, “Bom” ou “Fácil” continua sendo enviada ao FSRS, mas não troca o certo/errado usado pelo indicador de confiança. Nos cartões abertos e nas lacunas de correção aproximada, o resultado depende da autoavaliação: “Errei” é negativo e as demais notas são positivas.

Respostas em branco no simulado e tentativas sem confiança marcada não entram nas categorias metacognitivas. Confiança não altera, por si só, a fórmula do FSRS.

## Depois: registre um ajuste

Quando a sessão termina, o painel apresenta contagens das tentativas com confiança marcada e informa quantas usaram gabarito ou autoavaliação. Os mesmos cartões podem aparecer mais de uma vez na sessão; essas repetições contam como novas tentativas, não como novas provas de domínio.

Você pode indicar se cumpriu o objetivo, escrever o que funcionou e escolher uma mudança concreta para o próximo estudo. Cada campo de texto admite até 400 caracteres. A reflexão é opcional: os botões normais de continuação permanecem disponíveis. Ao encerrar uma sessão depois de já ter respondido, o painel também permite refletir sem apagar as revisões registradas.

Um bom ajuste é específico: “Explicar em voz alta por que confundi prescrição e decadência”, em vez de “Estudar melhor”.

## Histórico, backup e sincronização

Planos e reflexões ficam em `S.ajustes`, por isso acompanham o backup e a sincronização existentes. O histórico mantém até 300 planos e 200 reflexões. O merge reúne os registros dos dois aparelhos e respeita a preferência mais recente para o planejamento.

O histórico antigo de confiança continua legível no formato `[timestamp, id, confiança, resultado]`. Registros anteriores à atualização podem representar apenas a nota escolhida, sem distinguir correção objetiva e autoavaliação. Não é possível reconstruir com segurança essa origem retroativamente.

Os percentuais do painel geral apenas descrevem os resultados registrados em cada faixa de confiança. Não são uma medida validada de calibração probabilística. Um acerto imediato ou repetido após ver o gabarito não substitui uma recuperação correta depois de dias sem consultar.

## Sugestões diárias

A tela Hoje oferece três sugestões opcionais e recolhidas: escolher um foco, observar a confiança em uma tentativa e guardar uma reflexão. Não há punição por pular, nem alteração do histórico de estudo por não concluir essas sugestões. A [rotina diária sustentável](ROTINA-DIARIA.md) separa a meta escolhida, o próximo bloco e a fila disponível.

## Desenvolvimento e verificação

O aplicativo continua estático. O `package.json` contém apenas ferramentas de desenvolvimento; `node_modules` não é incluído na pasta pública.

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run check
```

Os testes usam dados fictícios. Não é necessário fornecer senha do baralho, fazer login no Supabase ou conectar uma conta de estudante. Eles não enviam requisições aos serviços de produção.

Para verificar a pasta pública já preparada pelo fluxo de publicação:

```bash
node ferramentas/ci/validar_site.mjs _site
```

A preparação deve incluir `arquivos/metacognicao.js`. O injetor verifica sua existência antes de acrescentar a tag ao HTML, e o validador confere os arquivos obrigatórios do cache offline antes do upload. A validação não decifra o conteúdo protegido.

## Limites desta entrega

As pesquisas sobre metacognição e engajamento fornecidas pela usuária orientam a abordagem de produto. Seus números de eficácia, retenção e conversão não foram validados independentemente e não são promessas do aplicativo.

Esta etapa não troca a hospedagem, não modifica autenticação ou cobrança, não muda a fórmula do FSRS e não publica uma nova versão. Testes com dados fictícios e inspeção de código não substituem a conferência posterior do aplicativo protegido com uma conta de teste autorizada.
