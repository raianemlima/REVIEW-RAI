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

# Etapa 3 — integrar o design do Figma ao aplicativo funcional

## Escopo aprovado e referência

Aplicar o novo visual de `raianemlima/MelhorarDesignDoApp` (`7467241`, idêntico ao ZIP fornecido) ao aplicativo funcional REVIEW-RAI, em branch `manus/integrar-novo-design`, baseada em `d21fdd3`. A usuária aprovou explicitamente essa opção em vez de transformar o protótipo React em um aplicativo novo. Primeiro recorte: navegação, tela Hoje e interface da sessão de estudo. Preservar recursos e dados. Sem migração React, Supabase novo, troca de domínio, publicação ou merge automático.

## Implementação e estrutura

Adicionar uma camada externa de apresentação: `arquivos/interface.js` reorganiza os elementos reais, reaproveitando botões e listeners; `arquivos/interface.css` aplica tokens, composição e componentes da referência. O HTML inclui os arquivos depois das extensões existentes; o service worker usa nova versão e guarda ambos offline. `ferramentas/ci/validar_site.mjs` confere suas referências, sintaxe e existência quando presentes. A publicação já copia a pasta arquivos; não mudar hospedagem nem criar infraestrutura gerenciada para obter Preview. Testes em `tests/interface-design.test.mjs` exercitam o código real com dados fictícios. Documentar em `docs/INTERFACE.md` e README. O repositório específico permanece como referência original, sem alterações ou envio de dados privados.

Reutilizar navegação real `#tabs` em vez de duplicar sua lógica: menu lateral no desktop e navegação inferior no celular. Manter Busca, tema e Ajustes existentes no cabeçalho; Ajustes também acessível pelo menu lateral. Não quebrar abas secundárias, atalhos, links de materiais, badge real, relógios de sessão, aviso de atualização ou acessibilidade do teclado.

Hoje recebe saudação genérica e data calculada, cartão de foco à esquerda e semana/fila/áreas opcionais à direita. Meta de cartões distintos e Hoje, só 5 seguem intactos; missões, XP e metacognição continuam opcionais/recolhidos. Atalhos de estudo levam a telas reais. Nenhum nome fictício, sequência fixa, sincronização falsa, conta/plano ativo de exemplo ou quantidade decorativa é importado. O resumo de conta continua o status existente do aplicativo.

Planejamento, cartão, notas e reflexão recebem o visual novo, mas mantêm sua lógica real: quatro notas ao FSRS, confiança opcional, resultado com gabarito separado de autoavaliação, bloco finito, pular/reativar planejamento e encerrar antecipadamente. Não copiar “Dominado”, percentual falso de calibração ou intervalos fixos de 1/2/7 dias do protótipo.

## Design

Referência escolhida: painel de estudo editorial, calmo e contemporâneo. Base lavanda muito clara, superfícies brancas, violeta `#6653e7`, verde menta para progresso e âmbar secundário; tema escuro com superfícies violetas profundas. Tipografia Rubik já instalada, Newsreader nas frases e IBM Plex Mono nos dados. Menu lateral de aproximadamente 248px, cabeçalho leve, conteúdo com respiro e dashboard de duas regiões quando couber. No celular, uma coluna e navegação inferior respeitando área segura, sem rolagem horizontal.

Assinatura visual: marca dos quadrados sobrepostos existente, cantos arredondados sem excesso de bordas tridimensionais, sombras discretas e progresso fino. Preservar o mascote escolhido pelo aluno, em vez de obrigar a troca para o símbolo do protótipo. Ação principal violeta; animações curtas, respeitando movimento reduzido, sem brilho/pulsação permanentes. Textos didáticos e não punitivos: “Um pequeno bloco já conta” e “Estudar mais é opcional”. Nenhum novo ativo visual é necessário: usar marca, fontes, SVGs e mascote já fornecidos.

## Restrições

Preservar byte a byte o conteúdo protegido, gate.js e motor FSRS; não editar o esquema de registros ou o armazenamento. O repositório não tem projeto Manus gerenciado vinculado; diagnósticos gerenciados foram consultados e estão indisponíveis, portanto usar verificações nativas e testes existentes. Não autenticar estudante nem executar chamadas a produção. A primeira etapa não redesenha integralmente todos os módulos de leitura; eles permanecem acessíveis na nova navegação e recebem os tokens comuns.

# Etapa 4 — cronograma por editais de Defensoria

## Escopo aprovado

Criar uma ferramenta no app funcional para o aluno escolher edital de carreira, horas semanais, dias de estudo, disciplinas e distribuição percentual. Usar os arquivos fornecidos como corpus documental de referência e integrar o resultado às metas existentes, sem criar cartões, armazenamento paralelo, conta fictícia ou previsão de aprovação.

## Corpus e método

A triagem consolidou 24 anexos. O catálogo usa 18 editais de carreira de Defensor(a), publicados de 2021 a 2026, de 16 estados; exclui provas isoladas, caderno sem conteúdo programático, concurso de servidores e edital fora do intervalo. O núcleo comum normalizado é formado por Constitucional, Administrativo, Civil, Processo Civil, Penal, Processo Penal e Direito Institucional da Defensoria. A amostra não representa todos os estados brasileiros; matérias recorrentes e específicas ficam opcionais. O anexo do Maranhão/2026 foi corrigido após conferir o nome real do arquivo.

## Implementação

`arquivos/cronograma.js` contém catálogo, aliases conservadores, seleção de edital, dias, horas, distribuição, prévia semanal, associação com disciplinas do baralho e persistência em `S.ajustes.cronograma`. Ao ativar a aplicação às metas, o módulo atualiza minutos, meta de cartões e filtro de disciplinas compatíveis; o FSRS, fila, histórico, backup e sincronização continuam sendo os existentes. `arquivos/cronograma.css` contém a camada visual responsiva. `index.html`, `sw.js` e o validador incluem a nova rota e os arquivos offline.

## Critérios e limites

A soma dos percentuais deve ser 100%; o aluno pode dividir igualmente e editar. Dias não selecionados são dias livres, não falhas. O número de cartões derivado das horas é referência de atividade, não medida de domínio. Peças, discursivas, oral, tribuna e títulos permanecem formatos/fases, não disciplinas inventadas. A associação entre matérias do catálogo e o baralho só ocorre quando o nome/ID é identificável; conteúdos sem cartões são mostrados, mas não simulados.

## Verificação

Testes do módulo usam o app real com dados fictícios e cobrem catálogo, editor, prévia, metas, filtro do baralho, backup e tela Hoje. A pasta pública é montada sem segredos e validada com o service worker e os arquivos novos. O motor FSRS e `gate.js` são comparados à base remota e permanecem iguais.
