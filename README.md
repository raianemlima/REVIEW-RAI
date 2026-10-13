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
