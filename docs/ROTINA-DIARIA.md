# Uma rotina diária que cabe no seu dia

A fila de revisão não é uma obrigação de concluir tudo hoje. Antes, a tela somava todas as pendências à meta: um aluno com 71 cartões disponíveis via “faltam 71 para fechar a meta”. Repetições podiam aumentar o lote e manter a sessão aberta por muito tempo. Esta etapa separa fila, meta e bloco.

## Meta: um compromisso escolhido

O padrão inicial é **10 cartões diferentes por dia**. É uma escolha de produto para começar pequeno, não uma quantidade cientificamente ideal para todas as pessoas. Os atalhos da tela Hoje permitem 5, 10, 15 ou 20. Nos Ajustes, a meta habitual pode ficar entre 5 e 50.

Um cartão conta uma vez no dia, mesmo que volte para uma nova tentativa. Uma resposta errada também conta como participação: a meta registra atividade de estudo, não aprovação ou domínio. O resultado e a confiança continuam sendo analisados separadamente.

**Hoje, só 5 cartões** reduz a meta apenas nesse dia e abre um bloco leve sem perguntar o objetivo antes. No dia seguinte, volta sua meta habitual. O app não aumenta a meta sozinho para compensar dias sem uso.

## Bloco: a pequena sessão de agora

O bloco diário normal reúne até 10 cartões diferentes; o leve, até 5. Se faltarem menos cartões para sua meta, o próximo bloco pode ser menor. O orçamento de minutos e os limites de questões longas também são respeitados. O tempo exibido é uma estimativa, não um cronômetro ou garantia de duração.

Revisões têm prioridade. Cartões novos só entram quando há espaço na meta e na disponibilidade escolhida. Em uma retomada depois de três ou mais dias sem uso, o bloco começa pelas revisões pendentes sem adicionar novos. Isso não altera a agenda do FSRS nem elimina as pendências.

Cada cartão pode ter no máximo uma repetição adicional dentro do bloco diário. Há também um teto de tentativas: 10 cartões iniciais permitem até 15 tentativas; 5 permitem até 8. Erros não tornam a sessão infinita. Ao acabar, você pode encerrar por hoje ou escolher outro bloco; nada começa automaticamente.

Se você mudar de tela sem fechar o app, pode retomar o bloco que estava aberto. Se fechar/recarregar, as respostas já dadas continuam no histórico e os cartões ainda não respondidos continuam disponíveis. Esta etapa não salva o ponto exato da sessão aberta para retomada após recarregar.

## Fila: informação para planejar, não pressão

O conjunto disponível fica em **Ver fila de revisão e próximos passos**. Os cartões não escolhidos não viram concluídos nem têm suas datas movidas artificialmente. Adiar revisões repetidamente pode reduzir a chance estimada de lembrar; a proposta é retomar aos poucos, não esconder o custo de adiá-las.

Depois de cumprir a meta escolhida, o app reconhece o esforço e oferece descanso. A fila pode continuar grande, mas estudar mais permanece opcional. Seus registros, XP e conquistas não são apagados por um descanso.

## Foco e menor fricção

A primeira tela destaca o próximo bloco e o progresso da meta. XP e missões ficam em **Meu progresso e extras (opcional)**. Informações de matérias e outras tarefas ficam recolhidas, disponíveis quando você quiser explorar.

O planejamento metacognitivo é perguntado no máximo uma vez por dia, e o foco escolhido pode acompanhar os outros blocos daquele dia. É possível pular ou desativar a pergunta. Confiança e reflexão continuam funcionando. As sugestões de reflexão na tela Hoje são opcionais e ficam recolhidas.

## O que foi preservado

A fórmula do FSRS, as notas enviadas a ele, o conteúdo protegido, autenticação, histórico, backups e integrações anteriores permanecem. Preferências novas são guardadas em `S.ajustes`, pelo mesmo mecanismo de sincronização. Configurações de minutos e limite de novos já salvas por contas existentes não são substituídas; os padrões mais leves só se aplicam onde ainda não existe uma escolha anterior.

## Como conferir

```bash
npm test
npm run check
node ferramentas/ci/validar_site.mjs .
```

Nesta etapa, **51 testes passaram**, incluindo 6 testes da interface real do aplicativo em DOM simulado. O caso com 71 pendências abriu apenas 10 cartões; responder todos como Errei encerrou o bloco em 15 tentativas e contou 10 cartões diferentes. Foi validada também uma cópia da pasta pública, com as 22 dependências obrigatórias de cache, e os blocos protegidos e o motor permaneceram iguais à base.

Os testes usam dados fictícios, sem autenticar estudantes, decifrar o baralho ou gravar em serviços de produção. Conferência em DOM simulado e inspeção de código não substituem testes posteriores do aplicativo protegido com uma conta autorizada. Esta entrega é código para revisão; não publica uma nova versão automaticamente.

## Pesquisas que orientaram a etapa

Os PDFs **Metacognição nos Estudos**, páginas 1–6 e 11, e **Engajamento em Apps Educacionais**, páginas 2–4, fornecidos nesta tarefa, orientam o ciclo de autorregulação, microações e a cautela com sequências e ameaças de perda. Seus percentuais de eficácia e retenção não foram tratados como promessas deste aplicativo.

A hipótese é que uma meta escolhida, uma ação pequena e menos ruído tornem a retomada mais fácil. A melhoria efetiva na continuidade precisa ser observada no produto; concluir cartões ou ganhar XP não prova aprendizagem.
