# Política de segurança

## Versões com suporte
Só a versão publicada em https://reviewdpe.com.br/ recebe correções.

## Como relatar uma falha
Não abra uma issue pública. Use **Security → Report a vulnerability** neste repositório (aviso privado) ou escreva para o e-mail de suporte do app.

Inclua o que você encontrou, como reproduzir e o que dá para acessar com a falha. Respondemos em até 5 dias úteis e avisamos quando a correção for publicada.

## Como o app se protege
- O conteúdo (baralho) é publicado cifrado (AES-256-GCM). A chave é entregue pelo Supabase só a contas liberadas, confirmadas e com assinatura válida.
- A chave fica guardada no aparelho para uso offline, mas o app exige confirmar a assinatura online a cada 7 dias e apaga a chave quando a assinatura acaba.
- Os dados de cada aluno ficam protegidos por RLS no Supabase. A chave `sb_publishable` no código é pública por design.
- Uma Content-Security-Policy restringe para onde o app pode enviar dados (Supabase e API do GitHub).
