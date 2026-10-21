# Novo visual sobre o aplicativo que já funciona

## Origem e decisão

Esta etapa usa como referência o repositório privado `raianemlima/MelhorarDesignDoApp`, commit `7467241`, cujo conteúdo é idêntico ao ZIP fornecido. A escolha aprovada foi aplicar o visual ao REVIEW-RAI, e não substituir o aplicativo por um protótipo novo.

O protótipo fornecido é React/Vite e usa cinco cartões demonstrativos, nome, sequência, datas e indicadores de exemplo. Também possui armazenamento próprio e não implementa todos os recursos do REVIEW-RAI. Copiá-lo como aplicativo final poderia criar uma segunda história de progresso e perder funções existentes. Por isso, reaproveitamos sua composição e linguagem visual, mantendo o aplicativo real.

## O que muda na interface

No computador, as cinco áreas principais passam para um menu lateral. No celular, o mesmo conjunto de controles fica na barra inferior. Busca, seleção de tema e Ajustes continuam no cabeçalho; Ajustes também fica disponível no menu lateral. A navegação utiliza os botões existentes, com os mesmos identificadores e ações — não são links decorativos para seções de exemplo.

A tela Hoje ganha uma abertura com data calculada e o cartão de foco em destaque. Semana, fila e extras ficam numa região complementar quando há espaço. No celular, o conteúdo se organiza em uma coluna. Novos atalhos levam a Lei seca, Modos de estudo e Biblioteca reais.

O botão principal continua iniciando ou retomando o bloco diário; os controles de meta e o texto explicativo ficam recolhidos para reduzir a altura do cartão. O atalho secundário diz “Ver modos” para deixar claro que abre a biblioteca de formatos de estudo.

O visual utiliza violeta, superfícies claras e lavanda, verde para progresso, sombras discretas e os tipos Rubik e Newsreader fornecidos. O tema automático/claro/escuro permanece o mesmo do aplicativo. A marca e o mascote escolhido pelo aluno foram preservados. Planejamento, cartão, notas e reflexão recebem a aparência nova sem exigir etapas adicionais.

A tela de login também usa essa identidade visual, sem mostrar navegação do conteúdo bloqueado. O gate ativa o tema antes de renderizar o formulário; depois da autorização, a navegação e o shell são preparados antes do primeiro render do app para evitar a alternância entre o CSS antigo e o novo.

## O que não muda

A meta diária continua sendo uma quantidade ajustável de cartões diferentes, não o total de pendências. Hoje, só 5, blocos finitos, planejamento opcional e descanso após a meta permanecem. XP e sugestões continuam opcionais e recolhidos.

O motor FSRS continua definindo a revisão a partir das notas existentes. Não foram importados os intervalos fixos de amanhã/2/7 dias do protótipo. “Acerto com confiança” não foi substituído por “Dominado”, e não foi trazido o percentual simplificado de calibração.

Não existe um cadastro “Marina Alves” de exemplo, assinatura fictícia ou rótulo de sincronização falsa. O cabeçalho continua mostrando o status de salvamento real. Sequência e semana vêm do histórico existente. Nenhuma resposta, reflexão ou preferência é movida para um novo banco ou chave de armazenamento.

## Organização do código

`arquivos/interface.js` é a camada de apresentação: aguarda o aplicativo estar disponível, move os próprios elementos com seus eventos e reorganiza o painel. Sua instalação e suas renderizações são idempotentes. `arquivos/interface.css` traz os tokens e os estilos adaptados ao HTML funcional.

O HTML carrega os arquivos depois dos estilos existentes e da metacognição. A pasta de publicação já inclui `arquivos/`. O service worker passa para a versão `v119` e guarda os novos CSS e JavaScript junto das dependências anteriores, sem mudar o nome do cache de dados. O validador confere referências, sintaxe, arquivos e inclusão no cache.

## Alcance desta primeira etapa

Navegação, Hoje e sessão de estudo receberam a integração principal. Recursos de leitura, simulados, estatísticas, materiais e Ajustes permanecem acessíveis, recebendo os estilos comuns; não foi feita uma reescrita completa de todos esses módulos. A interface protegida continua dependendo do login/desbloqueio existente.

## Verificação e entrega

```bash
npm test
npm run check
node ferramentas/ci/validar_site.mjs .
```

Os testes usam o código real com um baralho fictício, sem autenticar estudantes ou gravar em serviços de produção. Comparações de preservação são feitas contra a base `d21fdd3`. Testes em DOM simulado verificam eventos e dados, mas não demonstram sozinhos a renderização visual em todos os navegadores ou uso offline autenticado.

Na integração inicial, 66 testes cobriam o comportamento anterior e visual. Com a cobertura acrescentada desde então, **136 testes passaram** nesta revisão, incluindo os fluxos de autorização e a sincronização do gate embutido. Os blocos originais de scripts, motor FSRS, conteúdo protegido, carregador, build e módulo de metacognição foram comparados com a base e permaneceram intactos. A pasta pública foi validada com 34 entradas obrigatórias no cache.

Uma conferência pontual no Chromium, motivada pelos conflitos de CSS encontrados na revisão, mediu as larguras reais de 320, 390, 1024 e 1440 pixels sem transbordamento horizontal. Também foram conferidos o cartão no celular e o planejamento em tema escuro com um baralho fictício. Menu herdado, link de acessibilidade, logotipo e respiro do planejamento foram corrigidos. Isso não é teste autenticado de produção nem garantia de compatibilidade com todos os navegadores.

A entrega é feita em branch separada e pull request em rascunho. Não altera o repositório original de design e não publica uma nova versão automaticamente.

## Acadêmico Moderno (outubro de 2026)

Decisões aprovadas: cor primária **verde Defensoria** (unifica app, manifesto, páginas legais e a página de vendas) e **Newsreader nos textos de estudo**. O `app-src.txt` não foi editado; tudo é apresentação.

- **Tokens.** `arquivos/interface.css` é a fonte única de cor. Verde `#08775c` (claro) / `#4dd6a6` com texto `#08251c` (escuro); neutros levemente esverdeados; estados (`--rd-ok`, `--rd-amber`, `--rd-bad`, `--rd-info`) com contraste AA nos dois temas. Aliases semânticos `--c-*`, escala de espaço `--s-1…7` (base 4), tipos `--t-page…--t-micro`, raios `--r-*`, contorno de campo `--rd-line-strong` (≥ 3:1).
- **Tipografia.** Rubik na interface (pesos 500–650); Newsreader em enunciado, alternativas, resposta, súmulas, teses, lei seca, doutrina e caderno (altura de linha 1,6, até ~70 caracteres); IBM Plex Mono só nos atalhos de teclado (`--f-code`).
- **Componentes.** Botões em frase normal; texto sobre a primária usa `--accent-ink`; segmentos marcados com fundo suave; cabeçalhos de seção (`.dpe-hero`, `.es-hoje`) como superfície discreta; ícones do cabeçalho com o mesmo tamanho; selos "novo" em `#b42318`.
- **Temas.** Mesmo mecanismo (`revisao-dpe-tema`: automático/claro/escuro). Script mínimo no `<head>` aplica o tema antes do primeiro pixel; `meta theme-color` por esquema e `color-scheme`. Ícones do app com fundo verde.
- **Correções.** Provas não transborda mais em 360 px; Ajustes mostra o título antes do atalho do cronograma; cache `review-dpe-assuntos-v7`.
- **Pendências.** Capturas da página de vendas (`screenshots/site-*.webp`) ainda mostram o app violeta e precisam ser refeitas com conta real; cores do PDF exportado (no `app-src.txt`) seguem violetas; Lei seca, Doutrina e Jogo só foram vistos sem conteúdo.
