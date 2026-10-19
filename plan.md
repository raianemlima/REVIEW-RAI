# Continuidade aprovada — metacognição

## Escopo

Restaurar e melhorar a metacognição na branch de continuidade `manus/restaurar-metacognicao`, baseada em `claude/dpe-spaced-review-app-1h0ks9` (`77a7af9`). Preservar o visual atual, HTML/CSS/JavaScript, o motor FSRS-4.5, o conteúdo cifrado, o esquema dos registros de revisão, o backup e as integrações existentes. Sem redesign, migração de serviços, merge em `main` ou publicação.

## Implementação

Recuperar `arquivos/metacognicao.js` do histórico e corrigir sua integração com o aplicativo, publicação e cache offline. A publicação deve falhar claramente se uma dependência obrigatória estiver ausente.

A sessão terá planejamento opcional, monitoramento por confiança versus resultado e reflexão opcional ao terminar. O estudante poderá pular ou desativar o planejamento e reativá-lo nas estatísticas. Modos cronometrados não terão uma etapa inicial que consuma seu tempo. Planos e reflexões continuarão salvos em `S.ajustes`, com limites de histórico e merge entre aparelhos.

Usar linguagem didática e proporcional à evidência. Um acerto com confiança não será chamado de domínio consolidado. Remover o percentual simplificado chamado de calibração científica; apresentar contagens, origem do resultado e limites da amostra. Separar correção com gabarito (múltipla escolha/certo ou errado) de autoavaliação (cartões abertos e lacunas de correção aproximada). Manter os registros antigos legíveis e o formato de histórico `calib` compatível.

O motor FSRS seguirá usando as notas de revisão já existentes; confiança não substituirá a nota ou comandará mudanças de algoritmo nesta etapa. Informações metacognitivas não serão usadas para prometer aprovação, diagnosticar capacidade ou estabelecer domínio por uma tentativa isolada.

## Estrutura

- `index.html`: lógica e interface existentes; integração pontual e explicação do histórico de confiança.
- `arquivos/metacognicao.js`: ciclo Antes/Durante/Depois, objetivos, resultados e reflexões.
- `sw.js`: versão e arquivos obrigatórios offline.
- `ferramentas/ci/`: validação da pasta publicada e integração dos módulos.
- `tests/`: testes com dados fictícios e nenhuma chamada a serviços de produção.
- `package.json`: ferramentas de teste de desenvolvimento; não muda a execução estática do aplicativo.
- `docs/METACOGNICAO.md`: uso, limites dos indicadores e instruções para executar os testes.

## Design

Reutilizar integralmente cores, tipografia, componentes e identidade do aplicativo atual. Os painéis metacognitivos usarão as variáveis CSS existentes, serão responsivos e terão campos rotulados, estados acessíveis e textos curtos. Não serão adicionadas imagens ou ilustrações decorativas.

## Restrições operacionais

O repositório é externo e não está vinculado a um projeto gerenciado do Manus. Os diagnósticos gerenciados não estão disponíveis nesta sessão; usar verificações nativas de JavaScript e testes automatizados antes da entrega, sem migrar o projeto apenas para ativar infraestrutura. Testes usarão conteúdo fictício, sem senha do baralho, sem login de estudantes e sem gravar em produção. As pesquisas fornecidas orientam o produto, mas seus resultados quantitativos não foram validados independentemente.

# Etapa 2 — rotina diária sustentável

Implementar o pedido de melhorar foco, usabilidade, persistência de uso e metas diárias condizentes na branch `manus/metas-diarias-sustentaveis`, baseada em `3b3ffd4`, que já incorpora a metacognição. Preservar arquitetura, marca, dados, FSRS, autenticação e publicação. Não publicar nem fazer merge automaticamente.

Separar três conceitos: a fila disponível é o conjunto de revisões; a meta é uma quantidade escolhida de cartões distintos para o dia; o bloco é a pequena seleção que a pessoa vai estudar agora. Adotar 10 cartões distintos como padrão inicial ajustável de produto, não como quantidade cientificamente ideal. Permitir metas de 5 a 50 nos Ajustes e atalhos de 5/10/15/20 na tela Hoje. A opção Hoje, só 5 deve reduzir a meta apenas no dia atual, sem apagar pendências ou alterar o objetivo habitual de amanhã. Não aumentar a meta automaticamente quando há repetições ou mais pendências.

Cada bloco diário terá até 10 cartões distintos, ou até 5 no modo leve, respeitando também o orçamento de minutos. Permitir no máximo uma repetição adicional por cartão e um teto de tentativas de aproximadamente 1,5 vez o bloco inicial, sem prolongamento infinito em erros repetidos. Notas continuam indo ao FSRS sem alterações, e cartões não escolhidos permanecem pendentes. Priorizar revisões na seleção. Limitar novos pela meta restante e não acrescentá-los na retomada após três ou mais dias sem uso enquanto houver revisões pendentes.

Manter uma ação principal clara. Exibir quantidade do próximo bloco, estimativa de tempo e progresso de cartões distintos. Depois da meta, oferecer descanso/retorno e deixar estudo extra realmente opcional. Mostrar fila e matérias em áreas secundárias expansíveis, com explicação de que adiar sem revisar pode reduzir a retenção estimada. Não transformar o passivo em obrigação de concluir tudo hoje. Reduzir pressão de sequência e eliminar contagem regressiva de perda; preservar XP e conquistas já existentes em uma área opcional, sem recalcular recompensas antigas.

Reduzir fricção: perguntar planejamento no máximo uma vez no dia, dispensar essa tela em Hoje, só 5 e reaproveitar o foco escolhido no mesmo dia. Deixar sugestões metacognitivas recolhidas. Manter reflexão, confiança e backups funcionando. Preferências novas entram em `S.ajustes` e seguem o mecanismo existente de sincronização, com override diário datado para não persistir acidentalmente amanhã.

Reutilizar CSS e cores do aplicativo e o mascote atual. Ajustar a hierarquia por composição e elementos nativos `details/summary`, com estados e rótulos acessíveis, campos rotulados e layout responsivo. Não criar novas imagens ou migrar infraestrutura. A estrutura continua em `index.html` para as integrações pontuais; `arquivos/metacognicao.js` cuida da fricção de planejamento; testes nativos/JSDOM e documentação acompanham a etapa. Usar as verificações nativas já existentes, pois não há projeto Manus gerenciado vinculado.
