# Redesign React/Vite do Review DPE

Esta branch contém a proposta visual criada no Figma Make para a dashboard do Review DPE.

## Segurança e escopo

- A branch `main` e o aplicativo estático publicado não foram alterados.
- O baralho cifrado, as chaves, o gate de autenticação, o service worker e os materiais pagos não foram copiados nem modificados.
- Este frontend é uma proposta de interface independente. A integração com a lógica do app original deve preservar o fluxo de cifragem, o Supabase, o armazenamento local e o funcionamento offline documentados no projeto.

## Executar localmente

```bash
npm install
npm run dev
```

## Validar

```bash
npm run build
```

O redesign inclui layout responsivo, navegação desktop/mobile, tema escuro, busca expansível, missões, progresso e CTA de início da sessão.
