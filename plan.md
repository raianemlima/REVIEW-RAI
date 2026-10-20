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

# Etapa 5 — percentuais automáticos por edital

Corrigir o erro de validação que rejeita percentuais como 7,69 no celular. Aceitar vírgula ou ponto com duas casas decimais; distribuir centésimos pelo método dos maiores restos para fechar exatamente 100%. Sugerir tempo com base nas quantidades da prova objetiva do edital; quando o quadro é por grupo, repartir internamente sem duplicar o peso. Não misturar pesos de fases diferentes. Na ausência de ponderação verificável, usar distribuição equilibrada explicitamente identificada como sugestão, não peso oficial.

Recalcular ao escolher edital/matérias e oferecer “Sugerir pelo edital”, “Dividir igualmente” e ajuste manual com redistribuição do restante. Exibir soma, método, fonte e limites. Preservar horas/dias durante troca de edital, planos já salvos e o mecanismo existente de metas/persistência. Usar cronograma.js para interação e um catálogo estático de perfis documentados carregado antes dele; incluir o catálogo no cache/validador de publicação. Não modificar FSRS, login, cartões ou histórico. Entregar branch/PR rascunho a partir da main que já recebeu o cronograma, sem publicação ou merge automático.

# Etapa 6 — cronograma de conteúdo e navegação móvel

A prévia atual repete as mesmas matérias em todos os dias e organiza o plano em torno de cartões. Substituir por ciclo de estudos com blocos reais de assuntos do programa escolhido: todas as disciplinas do anexo, inclusive Português e legislação estadual quando previstas; tópicos com texto e página rastreáveis; normas/jurisprudência citadas no item e acesso a fontes oficiais para consultar. Não inventar artigos, súmulas ou julgados. O modo comum deve pedir edital de conteúdo para fornecer assuntos concretos, em vez de atribuir programa genérico a todos os estados.

Distribuir o orçamento semanal inteiro em dias e blocos de duração útil, com rodízio de disciplinas e avanço dos tópicos. Com pouco tempo e muitas matérias, mostrar ciclo de várias semanas e as matérias agendadas para a próxima semana, sem minissessões de 3 minutos ou matérias silenciosamente omitidas. Separar plano de conteúdo de revisão espaçada: horas/blocos e conclusão de assuntos têm metas próprias; não transformar automaticamente toda a carga semanal em cartões. Revisão opcional tem orçamento próprio, permanece independente do estudo e não altera o FSRS. Preservar planos antigos, percentuais, backup e sincronização; conclusão de assunto não significa domínio.

Estrutura: arquivos/cronograma.js integra editor e Hoje ao app; arquivos/cronograma-conteudo.js fornece o catálogo documental; arquivos/cronograma-motor.js calcula ciclos e materiais sem depender do baralho; arquivos/cronograma.css estiliza agenda/assuntos; arquivos/interface.js e interface.css corrigem apenas a barra móvel. Fontes oficiais verificadas ficam em catálogo de materiais e links de consulta, sem dependência de IA paga em execução. Reutilizar visual e serviços atuais.

Corrigir barra inferior com posicionamento estável no viewport, fora de ancestrais transformados e com espaço reservado medido; áreas seguras e teclado móvel não podem esconder botões de reflexão/salvar. Conferir defeito real em navegador com fixtures offline de celular, sem conta de produção. Entrega em branch/PR rascunho, incorporando correção de percentuais ainda não integrada; sem merge/publicação automática.

# Etapa 7 — revisão visual e dashboard de matérias/pesos

## Design Read

- **Artefato:** dashboard analítico dentro da rota Progresso, com uma leitura rápida para orientar decisões de estudo e uma camada detalhada de frequência/pesos dos editais.
- **Público:** alunos de Defensoria Pública usando celular como dispositivo principal e desktop para planejamento mais longo.
- **Linguagem visual:** editorial institucional orientada a dados — calma, legível e comparativa, sem transformar o relatório em um cockpit de métricas.
- **Modo:** extensão / redesign-preserve. A identidade atual, rotas e fluxos de estudo permanecem; o dashboard entra como uma camada de análise.
- **Dials:** variação 3/10, movimento 2/10, densidade 7/10, dependência de assets 2/10, fidelidade à marca 9/10.

## Auditoria visual executável

A fixture offline foi conferida em 1440×900, 1280×720, 1024×900, 768×1024, 390×844 e 320×720, além de sessão de estudo e planejamento escuro. Não houve acesso a conta, rede de produção ou dados de alunos. A navegação não apresentou overflow horizontal; a barra inferior permaneceu estável no celular; o CTA do bloco e os controles do cartão ficaram alcançáveis; o tema escuro preservou contraste suficiente.

Pontos de melhoria observados: a tela Progresso começa com uma área extensa de conquistas e deixa o conteúdo analítico abaixo da primeira viewport; no celular, a primeira tela é quase toda ocupada por medalhas, enquanto o aluno precisa rolar para chegar às estatísticas; a tela Hoje possui boa hierarquia de ação, mas o relatório precisa de um ponto de entrada explícito; o planejamento escuro tem boa legibilidade, mas muito espaço vazio no desktop. O dashboard deve resolver descoberta e hierarquia sem remover conquistas, FSRS ou dados existentes.

## Direção visual proposta

- **Preservar:** logotipo, Rubik, violeta da marca, superfícies claras/escuras, navegação lateral/ inferior, estados de foco, rotas existentes, cartões, FSRS e chaves de persistência.
- **Melhorar:** criar um cabeçalho “Relatório dos editais” com contexto e CTA “Usar no cronograma”; mostrar 18 editais, 7 matérias universais, 14 perfis com peso numérico e 16 estados como sinais de orientação; ordenar a leitura por frequência antes de expor pesos e limitações.
- **Compor:** painel de resumo + ranking de frequência + matriz de mediana/faixa de questões + grupos compartilhados em disclosure; em telas pequenas, uma coluna com barras horizontais e tabelas convertidas em cartões legíveis.
- **Não fazer:** não colocar 5.364 tópicos na primeira vista, não transformar frequência em promessa de aprovação, não substituir a tela de conquistas, não introduzir uma nova barra de navegação principal, não inventar pesos individuais para blocos.

## Sistema visual

- **Paleta:** tokens atuais `--rd-bg`, `--rd-surface`, `--rd-brand`, `--rd-ok`, `--rd-amber` e `--rd-line`; violeta identifica a ação e o relatório, verde indica dado concluído/estável, âmbar sinaliza atenção metodológica e vermelho fica reservado a erro.
- **Tipografia:** Rubik para interface e números; Newsreader/itálico apenas em notas metodológicas curtas, preservando o contraste editorial já usado pelo app.
- **Espaçamento:** base de 8 px, agrupamentos de 16/24 px, largura confortável de leitura e barras com rótulo textual — nenhum dado dependerá apenas de cor.
- **Raio e elevação:** cartões de dados com os mesmos raios do produto; sombra suave só para a camada de resumo; linhas finas para tabelas e disclosures.
- **Movimento:** apenas entrada suave e feedback de filtro; respeitar `prefers-reduced-motion`.

## Arquitetura proposta

1. A rota **Progresso** mantém conquistas e estatísticas existentes, mas recebe um CTA/atalho claro para **Relatório dos editais**.
2. O dashboard usa os catálogos estáticos existentes (`cronograma-conteudo.js` e `cronograma-pesos.js`) e não grava dados de aluno.
3. O primeiro bloco resume a amostra; o segundo apresenta o núcleo universal e a frequência; o terceiro compara pesos individuais com mediana e intervalo; o quarto explica grupos e limitações.
4. Um filtro por edital permite ver o programa selecionado e encaminha ao Cronograma; não haverá uma nova aba principal.
5. Todos os componentes reaproveitam a camada `interface.css`, com estados claros para carregamento, vazio e sem peso verificável. A implementação fica em `arquivos/dashboard-editais.js` e `arquivos/dashboard-editais.css`; a validação de publicação exige referências únicas e cache offline; o relatório é copiado para `docs/` no artefato do GitHub Pages.

## Contratos protegidos

Não alterar IDs de cartões, FSRS, login, sincronização, backup, chaves `S.ajustes`/`S.cards`/`S.logs`, rotas existentes, labels principais de navegação, conteúdo protegido, ações de estudo ou comportamento da barra móvel. O dashboard é informativo e não modifica automaticamente o cronograma do aluno.

## Maior risco e fallback

O maior risco é aumentar a densidade do Progresso e esconder novamente a ação principal. A entrega reduz esse risco colocando o dashboard no início de Progresso, com resumo curto e detalhes progressivos; conquistas e estatísticas antigas continuam abaixo. Se a densidade precisar ser reduzida no futuro, o painel pode virar uma subvista recolhida sem alterar contratos de estudo ou dados.

# Etapa 8 — contrato de conteúdo e taxonomia

Separar o registro semântico de disciplinas da lógica da interface, em `arquivos/cronograma-taxonomia.js`, mantendo a classificação editorial e os textos por edital em `arquivos/cronograma-conteudo.js`. Cada rubrica conserva seu identificador de origem e relaciona zero ou mais IDs canônicos; o vazio é válido para itens sem equivalência segura, e rubricas combinadas podem apontar para vários canônicos. Não deduplicar tópicos repetidos entre editais nem alterar texto, IDs ou localizadores de origem.

Derivar o núcleo comum e os metadados de disciplinas do catálogo, deixando `EDITAIS_DPE` apenas com os metadados do edital e matérias canônicas derivadas do crosswalk. Adicionar validação estrutural e de referências de pesos em sandbox isolado, incluindo campos obrigatórios, unicidade de IDs e presença de referências válidas. A publicação deve carregar taxonomia, conteúdo e motor nessa ordem, incluir todos no cache offline e falhar claramente se o contrato estiver incompleto.

Documentar campos, relações, proveniência, estabilidade de IDs e casos legítimos sem vínculo. Testar contra os dados reais e fixtures inválidas, preservando planos/progresso sincronizados, o baralho, FSRS e conteúdo protegido. Não migrar para CMS, não acessar dados de estudantes e não publicar nem mesclar automaticamente.


# Etapa 9 — carregamento inicial e acessibilidade do gate

Reduzir o custo perceptível da tela pública de entrada sem redesign nem alteração do FSRS, dos dados de estudante, do esquema de armazenamento ou da autenticação. O HTML deve conter somente o shell/gate e referências. Separar o baralho cifrado em `deck.enc` e o código do app em `app-src.txt`; o gate os consome somente no caminho de desbloqueio. Manter módulos dependentes em referências lazy, respeitando sua ordem. O service worker deve precachear os artefatos necessários para o uso offline.

Atualizar `build.mjs`, `gate.js`, `sw.js`, `.github/workflows/pages.yml`, `ferramentas/ci/validar_site.mjs` e `ferramentas/ajustes/sincronizar_fonte.py` em conjunto. O build gera `index.html`, `deck.enc` e `app-src.txt`; CI exige os artefatos, o contrato criptográfico e a sintaxe do código externo. A sincronização deve ler o arquivo irmão `app-src.txt` e restaurar referências lazy para tags `src` na fonte, para que a preparação seguinte continue compatível com o build. As revisões editoriais e a injeção dos PDFs devem recriptografar `deck.enc`, sem inserir dados no HTML. Versionar sincronizadamente `CACHE` e `APP_CACHE`. Atualizar testes que extraíam o código do HTML para ler `app-src.txt`; usar somente baralho, credencial e chave fictícios nos testes de desbloqueio.

Preservar marca e composição da entrada. Rótulos devem estar associados aos campos; área tocável do botão primário deve ter ao menos 44 px. Conferir overflow em 375, 768, 1280 e 1920 px. Medir antes/depois em condições idênticas e registrar método e limitações; não tratar teste local como telemetria de produção. Não usar contas ou segredos reais para validar o fluxo.
