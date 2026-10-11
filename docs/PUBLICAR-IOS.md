# Publicar o Revisão DPE na App Store (iPhone)

O app de iPhone é o **mesmo site**, empacotado com o Capacitor. O conteúdo continua protegido pela senha e o app funciona sem internet. A compilação é feita nos servidores macOS do GitHub, então **você não precisa de um Mac**.

> Estado atual: o projeto está pronto no repositório (pasta `ios/`), mas **ainda não foi compilado nem enviado à Apple**. A primeira execução dos fluxos pode pedir ajustes.

## O que você precisa
| Item | Custo | Observação |
|---|---|---|
| Conta **Apple Developer Program** | US$ 99 por ano | Necessária para TestFlight e App Store. Pessoa física serve. |
| Repositório no GitHub (este) | grátis | Em repositório público, os servidores macOS são grátis. |
| Um iPhone | | Para testar pelo TestFlight. |

## Passo a passo

### 1. Criar o identificador do app
1. Entre em <https://developer.apple.com/account> → **Certificates, IDs & Profiles → Identifiers → +**.
2. Escolha **App IDs → App** e use o Bundle ID **`br.com.raianemlima.revisaodpe`**. Se quiser outro, altere também em `capacitor.config.json` e no `ios/App/App.xcodeproj/project.pbxproj` (campo `PRODUCT_BUNDLE_IDENTIFIER`).

### 2. Criar o app no App Store Connect
1. <https://appstoreconnect.apple.com> → **Apps → + → Novo app**.
2. Plataforma **iOS**, nome **Revisão DPE** (se já existir, a Apple pede outro), idioma **Português (Brasil)**, Bundle ID acima, SKU livre (por exemplo `revisao-dpe-1`).

### 3. Criar a chave da API (permite assinar e enviar sem Mac)
1. App Store Connect → **Usuários e Acesso → Integrações → Chaves da App Store Connect → +**.
2. Função **Gerente de app** (App Manager) ou **Admin**. Baixe o arquivo `.p8` (só dá para baixar uma vez).
3. Anote o **ID da chave** (Key ID) e o **ID do emissor** (Issuer ID).
4. Anote também o **Team ID**, em <https://developer.apple.com/account> → **Membership**.

### 4. Guardar os 4 segredos no GitHub
Repositório → **Settings → Secrets and variables → Actions → New repository secret**:
| Nome | Valor |
|---|---|
| `APPLE_TEAM_ID` | seu Team ID |
| `ASC_KEY_ID` | ID da chave |
| `ASC_ISSUER_ID` | ID do emissor |
| `ASC_KEY_P8` | **todo o conteúdo** do arquivo `.p8`, incluindo as linhas BEGIN e END |

Nunca coloque esses valores no código nem em conversas.

### 5. Validar que o projeto compila (sem conta Apple)
**Actions → "iOS · validar compilação" → Run workflow.** Deve ficar verde. Se falhar, mande o log.

### 6. Enviar ao TestFlight
**Actions → "iOS · enviar ao TestFlight" → Run workflow** (informe a versão, por exemplo 1.0.0). Em 10 a 30 minutos o build aparece em **App Store Connect → seu app → TestFlight**, depois do processamento.
- Baixe o app **TestFlight** no iPhone, adicione você mesma como testadora interna e instale.
- Na primeira vez, o App Store Connect pergunta sobre **criptografia de exportação**. O app só usa criptografia padrão do sistema para proteger o conteúdo (já declarado no `Info.plist` como isenta). Confirme a resposta conforme a sua situação.

### 7. Publicar na loja
No App Store Connect, na versão do app:
1. Preencha os textos (veja `docs/loja-apple.md`) e envie as capturas de tela da pasta `docs/loja/` (iPhone 6,9 pol., 1320 × 2868).
2. **URL de política de privacidade:** `https://raianemlima.github.io/REVIEW-RAI/privacidade.html` (antes, edite `privacidade.html` e coloque o seu e-mail de contato no lugar de `[e-mail de contato]`).
3. **Privacidade do app:** marque **"Não coletamos dados"**.
4. **Notas para o revisor:** informe a **senha de acesso** do app (o revisor precisa dela para ver o conteúdo). Não coloque a senha em arquivos do repositório.
5. Classificação etária, categoria **Educação**, preço **Grátis**.
6. Escolha o build do TestFlight e clique em **Enviar para revisão**. A análise costuma levar de 1 a 3 dias.

## Pontos que podem causar rejeição (leia antes de enviar)
1. **App que parece só um site (diretriz 4.2).** A Apple pode recusar apps que são só um site empacotado. O seu tem conteúdo próprio dentro do app, funciona offline e usa recursos do aparelho (progresso salvo no iPhone, vibração, compartilhamento, voz, tela ligada). Isso ajuda, mas **não garante** a aprovação.
2. **Direitos sobre o conteúdo (diretriz 5.2).** O baralho foi montado a partir do seu material de estudo e de comentários de terceiros (Extensivo, Cursos Duo, Buscador Dizer o Direito e outros). **Confirme que você tem direito de distribuir esse conteúdo publicamente.** Se não tiver, não publique na loja pública: use apenas o TestFlight ou peça autorização.
3. **App com senha.** A Apple exige que o revisor consiga entrar. Se a senha não for informada nas notas, o app será recusado.
4. **Conteúdo jurídico.** Os textos são resumos de apoio. A política de privacidade já traz o aviso de que não substituem a lei nem constituem aconselhamento jurídico.

## Alternativas de distribuição
- **TestFlight** (recomendado para começar): até 10.000 testadores por link ou convite, sem análise completa na versão interna. Os builds duram 90 dias e precisam ser reenviados.
- **App Store pública:** qualquer pessoa baixa, mas só vê o conteúdo com a senha.
- **Distribuição não listada (Unlisted App):** fica na loja, só acessível por link. Exige solicitação à Apple.
- **Site instalável (PWA):** já funciona hoje, sem Apple, e continua sendo a versão principal.

## Manutenção
- **Atualizou o baralho ou o código?** Gere o `index.html` novo (`build.mjs`), faça o merge na `main` e rode de novo **"iOS · enviar ao TestFlight"**. Cada execução usa um número de build novo.
- **Renovação:** a conta Apple Developer é anual. O build do TestFlight expira em 90 dias.
- **Seus dados no iPhone** ficam no arquivo `revisao-dpe.json` do app (pasta Documentos), que entra no backup do iPhone. O botão "Apagar todos os dados" em Ajustes remove tudo.

## Comandos úteis (para quem tiver um Mac)
```bash
npm ci
npm run sync          # monta www/ e sincroniza o projeto iOS
npx cap open ios      # abre no Xcode
npm run assets        # regenera ícone e abertura a partir de assets/
```
