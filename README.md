# Revisão Espaçada DPE

App de flashcards com revisão espaçada (FSRS) para a Defensoria Pública. É um site instalável (PWA): funciona offline e pode ser adicionado à tela inicial do celular.

Os dados de estudo ficam salvos no navegador do aparelho. Use "Exportar backup" nos ajustes para guardar uma cópia ou levar o progresso para outro aparelho.

## Instalar no celular
- **Android (Chrome):** menu ⋮ → "Instalar app".
- **iPhone (Safari):** Compartilhar → "Adicionar à Tela de Início".

## Acesso restrito
O baralho está criptografado dentro do `index.html` (AES-256-GCM, chave derivada da senha com PBKDF2). Sem a senha, o conteúdo não pode ser lido, nem pelo código-fonte do site.

- **Nunca** coloque o arquivo-fonte (sem criptografia) neste repositório. Guarde-o fora dele.
- Para gerar uma nova versão ou trocar a senha:
  `SENHA='nova-senha' node build.mjs caminho/fonte.html index.html`
- Depois de trocar a senha, atualize a senha no Supabase (a que a função `chave_do_app` entrega) e aumente o número da versão em `sw.js` (`CACHE`). Quem tem conta liberada recebe a chave nova sozinho ao abrir o app.
- O acesso é **só pela conta**: não existe mais "senha de acesso" para digitar. A chave fica no aparelho para uso offline, mas o app confirma a assinatura online a cada 7 dias e apaga a chave quando ela acaba.
- Configuração de segurança do Supabase: [`supabase/seguranca.sql`](supabase/seguranca.sql).
- Cobrança e liberação automática pelo Asaas: [`docs/ASAAS.md`](docs/ASAAS.md).

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

## Interface integrada ao design fornecido

O menu lateral no computador, a barra inferior no celular e o painel de estudo seguem a referência de MelhorarDesignDoApp, usando os controles e dados reais deste aplicativo. A camada visual não troca o FSRS, o login, o histórico ou os backups. Consulte o [guia da interface](docs/INTERFACE.md) para conhecer a integração e o alcance desta primeira etapa.
