# Revisão Espaçada DPE

App de flashcards com revisão espaçada (FSRS) para a Defensoria Pública. É um site instalável (PWA): funciona offline e pode ser adicionado à tela inicial do celular.

Os dados de estudo ficam salvos no navegador do aparelho. Use "Exportar backup" nos ajustes para guardar uma cópia ou levar o progresso para outro aparelho.

## Instalar no celular
- **Android (Chrome):** menu ⋮ → "Instalar app".
- **iPhone (Safari):** Compartilhar → "Adicionar à Tela de Início".

## Acesso restrito
O baralho fica em `deck.enc`, separado do `index.html`, cifrado com AES-256-GCM e chave derivada com PBKDF2. Sem a chave, o conteúdo não pode ser lido. O código do aplicativo fica em `app-src.txt` e nos módulos públicos; ele não contém o baralho.

- **Nunca** coloque o arquivo-fonte (sem criptografia) neste repositório. Guarde-o fora dele.
- Para gerar uma nova versão ou trocar a senha, o build cria `index.html`, `deck.enc` e `app-src.txt` a partir do arquivo-fonte:
  `SENHA='nova-senha' node build.mjs caminho/fonte.html index.html`
- Depois de trocar a senha, atualize a senha no Supabase (a que a função `chave_do_app` entrega) e aumente o número da versão em `sw.js` (`CACHE`). Quem tem conta liberada recebe a chave nova sozinho ao abrir o app.
- O acesso ao conteúdo é **só pela conta**: não existe mais "senha de acesso" para digitar. A chave offline fica vinculada ao UID Supabase que a recebeu; outra conta não pode reutilizá-la. O app confirma a assinatura online a cada 7 dias e remove a chave quando o Supabase nega o acesso. Na primeira abertura desta versão, aparelhos com chave antiga podem precisar de internet e de um novo login para vincular a conta; depois disso, o uso offline continua disponível.
- Configuração de segurança do Supabase: [`supabase/seguranca.sql`](supabase/seguranca.sql).
- Senha compartilhada do baralho, limites da proteção, detecção de compartilhamento e rotação da senha: [`docs/SEGURANCA-CONTEUDO.md`](docs/SEGURANCA-CONTEUDO.md).
- Cobrança e liberação automática pelo Asaas: [`docs/ASAAS.md`](docs/ASAAS.md).
- Divulgação (página de vendas no domínio, material gratuito com captação de e-mail, cupons de parceiro, depoimentos e links com UTM): [`docs/DIVULGACAO.md`](docs/DIVULGACAO.md).

## Carregamento inicial e uso offline

O HTML contém apenas o shell, o gate e referências aos recursos. O gate só descriptografa o baralho e executa `app-src.txt`/módulos após validar a chave; o service worker pré-armazena os arquivos do `CORE` para preservar a abertura offline. Ao mudar nomes ou dependências, atualize `CORE`, a lista de arquivos copiados em `.github/workflows/pages.yml` e o validador de publicação; mantenha `CACHE` e `APP_CACHE` sincronizados.

## Sincronizar notebook e celular
O progresso pode ser sincronizado por um repositório privado seu no GitHub. Veja [`docs/SINCRONIZAR.md`](docs/SINCRONIZAR.md).

## App no celular (PWA)
O site se instala como aplicativo, sem lojas e sem custo. Veja [`docs/INSTALAR-PWA.md`](docs/INSTALAR-PWA.md).

## Metacognição: planejar, monitorar e refletir

O planejamento e a reflexão são opcionais. O app compara confiança e resultado sem tratar um acerto isolado como domínio, e diferencia questões com gabarito de autoavaliação. Consulte o [guia de metacognição](docs/METACOGNICAO.md) para entender os indicadores, o backup e os testes com dados fictícios (`npm ci --ignore-scripts` e `npm test`).

## Rotina diária sustentável

A meta padrão é de 10 cartões diferentes, ajustável, sem confundir toda a fila com obrigação diária. O bloco tem até 10 cartões e tentativas limitadas; **Hoje, só 5** reduz a meta somente naquele dia. XP e missões ficam em áreas opcionais. Leia o [guia da rotina diária](docs/ROTINA-DIARIA.md) para conhecer a seleção, a retomada e os limites.

## Cronograma por editais

Em **Cronograma**, o aluno escolhe um edital de Defensoria, horas por semana, dias, disciplinas e percentuais de distribuição. O plano usa 18 editais de carreira de 16 estados como referência, com sete áreas presentes no corpus e matérias estaduais opcionais. Ao ativar a aplicação às metas, o tempo diário, a meta de cartões e as disciplinas compatíveis entram no mesmo armazenamento sincronizado do app. Leia o [diagnóstico dos editais e do cronograma](docs/EDITAIS-CRONOGRAMA.md) para ver o método e os limites da amostra.

Na aba **Progresso**, o **Relatório dos editais** resume a frequência das matérias e os pesos diretamente observados, com filtro por concurso e atalho para usar o edital no Cronograma. O [relatório de matérias e pesos](docs/RELATORIO-MATERIAS-E-PESOS-DPE.md) explica a amostra, a mediana, as faixas e por que pesos por grupo não são repartidos artificialmente.

O Cronograma também inclui o edital da **DPDF 2026 para Analista de Apoio à Assistência Judiciária – Direito e Legislação** (cargo de servidor, fora do relatório dos editais de Defensor), com o [plano estratégico](plano-dpdf-2026.html) offline vinculado.

O Cronograma também traz o **III Concurso da DPE/RN** pelo regulamento atual (Res. nº 344/2025), com o quadro da prova objetiva (4 grupos de 25 questões) e o programa do Anexo I. O PDF do Diário Oficial perde texto em cada virada de página, e os trechos ausentes ficam marcados. Em **Provas**, a prova da DPE/RN 2015 (Cespe) pode ser resolvida no app com o gabarito definitivo, e o regulamento, o edital, a prova e o gabarito abrem em PDF. Veja [DPE/RN · III Concurso](docs/DPE-RN.md).

A aba **Tribunal** traz o plano de 12 semanas para o **TJPB 2026 (Analista Judiciário – Área Judiciária, FGV)**, com cada bloco ligado ao conteúdo do app, o edital no Cronograma e o [plano estratégico](plano-tjpb-2026.html). O leitor de Lei seca mostra grifos, questões por artigo e jurisprudência da lei seca do curso quando ela é publicada cifrada. Veja [Tribunal de Justiça · TJPB 2026](docs/TRIBUNAL-TJPB.md).

O arquivo interativo [Direitos Humanos · DPESP](direitos-humanos-dpesp.html) separa o núcleo recorrente dos programas, as ampliações do X Concurso e a comparação com o III Concurso da DPE-RN. Ele funciona offline, tem busca, filtros, modo escuro, impressão e checklist salvo apenas no navegador.

## Interface integrada ao design fornecido

O menu lateral no computador, a barra inferior no celular e o painel de estudo seguem a referência de MelhorarDesignDoApp, usando os controles e dados reais deste aplicativo. A camada visual não troca o FSRS, o login, o histórico ou os backups. Consulte o [guia da interface](docs/INTERFACE.md) para conhecer a integração e o alcance desta primeira etapa.
