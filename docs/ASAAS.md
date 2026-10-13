# Cobrança pelo Asaas

Quando o Asaas confirma um pagamento, ele avisa o Supabase (webhook), e o e-mail do cliente é liberado até o fim do período pago. Estorno ou chargeback cortam o acesso. Quem cancela a assinatura usa até o fim do que já pagou.

```
Cliente paga no Asaas → webhook → Edge Function asaas-webhook → confere a cobrança na API do Asaas → liberados.valido_ate
App abre → chave_do_app confere valido_ate → entrega (ou não) a chave do conteúdo
```

## Regras
- **Pago** (cartão confirmado, Pix ou boleto recebido): acesso até *vencimento da cobrança + 1 ciclo da assinatura + 3 dias de folga*. Renovar nunca encurta o acesso.
- **Cobrança avulsa** (sem assinatura): vale `AVULSO_MESES` meses (padrão 1).
- **Vencida/pendente:** não muda nada; o acesso acaba sozinho quando passa o `valido_ate`.
- **Estorno ou chargeback:** acesso cortado na hora.
- O e-mail liberado é o **e-mail do cliente no Asaas**. O aluno precisa criar a conta no app com esse mesmo e-mail, então deixe o e-mail como campo obrigatório no link de pagamento.

## Configurar (uma vez)
1. **Banco:** rode as partes 1, 2 e 4 de [`supabase/seguranca.sql`](../supabase/seguranca.sql) no SQL Editor do Supabase.
2. **Chave da API do Asaas:** Asaas → Integrações → Chaves de API → gerar. Guarde só no Supabase, nunca no repositório.
3. **Token do webhook:** gere um texto aleatório de 32+ caracteres, por exemplo com `openssl rand -hex 32`.
4. **Segredos no Supabase:** Project Settings → Edge Functions → Secrets (ou pela linha de comando):
   ```
   supabase secrets set ASAAS_API_KEY='$aact_...' ASAAS_WEBHOOK_TOKEN='o-token-do-passo-3'
   ```
   Para testar no sandbox do Asaas, acrescente `ASAAS_API_URL='https://api-sandbox.asaas.com/v3'` e use a chave do sandbox.
5. **Publicar a função:**
   ```
   supabase functions deploy asaas-webhook --no-verify-jwt
   ```
   O `--no-verify-jwt` é necessário porque o Asaas não envia login do Supabase; quem protege a função é o token do passo 3.
6. **Webhook no Asaas:** Integrações → Webhooks → Adicionar.
   - URL: `https://hlenhmgnqqnkjqmntnpz.supabase.co/functions/v1/asaas-webhook`
   - Token de autenticação: o mesmo do passo 3
   - Eventos: **cobranças** (todos os `PAYMENT_*`)
   - Tipo de envio: sequencial
7. **Testar no sandbox:** crie uma assinatura para um e-mail seu, marque a cobrança como recebida e confira `select * from public.asaas_log order by id desc;` e a linha em `liberados`.

## Segurança
- A função **não confia no conteúdo do webhook**: ela busca a cobrança, a assinatura e o cliente direto na API do Asaas. Um evento falso não libera ninguém.
- Sem `ASAAS_WEBHOOK_TOKEN` configurado (ou com menos de 32 caracteres), a função recusa tudo.
- A tabela `asaas_log` registra cada decisão, para suporte e auditoria.
- Se trocar a chave da API do Asaas, atualize o segredo `ASAAS_API_KEY`.

## Testes da lógica
```
node --experimental-strip-types --test supabase/functions/asaas-webhook/logica.test.ts
```
