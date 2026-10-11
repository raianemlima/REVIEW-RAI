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
- Depois de trocar a senha, aumente o número da versão em `sw.js` (`CACHE`) e avise quem usa: cada pessoa precisará digitar a nova senha.

## App de iPhone
O mesmo site vira app de iPhone com o Capacitor (pasta `ios/`). Veja o passo a passo completo em [`docs/PUBLICAR-IOS.md`](docs/PUBLICAR-IOS.md) e os textos da loja em [`docs/loja-apple.md`](docs/loja-apple.md).
