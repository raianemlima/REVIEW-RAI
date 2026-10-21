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

## Planos
| Plano | Preço | Como criar no Asaas | Acesso liberado |
|---|---|---|---|
| Mensal | R$ 15,99/mês | link de pagamento do tipo **Assinatura**, ciclo **Mensal** | até o vencimento + 1 mês + 3 dias; renova a cada pagamento |
| Anual | R$ 129,99 à vista ou até 12x de R$ 11,20 no cartão (taxas repassadas) | link de pagamento do tipo **Cobrança parcelada**, até 12 parcelas | 12 meses + 3 dias, contados da 1ª parcela (valor total ≥ `ANUAL_VALOR_MIN`, padrão R$ 100). No cartão as parcelas são confirmadas juntas e libera o ano todo; no boleto parcelado, libera a fração já paga |

Criar os links: no Asaas, **Cobranças → Links de pagamento → Criar link**.
- Nome: "Review DPE · Mensal" / "Review DPE · Anual". Valor: 15,99 / 130,00.
- Formas de pagamento: Pix, boleto e cartão. O anual pode ser parcelado em até 12x: o webhook soma as parcelas e libera conforme o que já foi pago.
- Em **Dados do cliente**, deixe o **e-mail obrigatório**: é ele que libera o app.
- Copie cada link e cole em `conheca.html`, no bloco `VENDA` (`linkMensal` e `linkAnual`). Os botões "Assinar o mensal" e "Assinar o anual" passam a abrir o pagamento; sem link, eles abrem o WhatsApp.

## Configurar (uma vez), tudo pelo navegador
Painel do Supabase: https://supabase.com/dashboard/project/hlenhmgnqqnkjqmntnpz

**1. Banco de dados.** Menu lateral **SQL Editor → New query**. Cole e rode (**Run**) cada parte de [`supabase/seguranca.sql`](../supabase/seguranca.sql) separadamente:
   - parte 2 (gatilho que bloqueia novos cadastros sem liberação, validade da assinatura e autorização da `chave_do_app`);
   - parte 4 (Asaas).

O Supabase Auth pode ainda autenticar uma conta antiga que não esteja em `liberados`. O app agora encerra essa sessão assim que a RPC negar a chave. A `chave_do_app` é a autorização efetiva do conteúdo; o gatilho de `auth.users` também impede novos cadastros por senha ou código fora da lista. Este SQL precisa ser aplicado no projeto Supabase para que a trava de novos cadastros passe a valer em produção.

**2. Chave da API do Asaas.** No Asaas: **Integrações → Chaves de API → Gerar chave**. Copie (começa com `$aact_`). Ela não vai para o repositório nem para o app.

**3. Token do webhook.** Um texto aleatório com 32 ou mais caracteres, só letras e números. Pode gerar em https://www.random.org/strings/ (comprimento 20, 2 strings, e juntar as duas) ou com `openssl rand -hex 32`. Guarde: ele vai em dois lugares.

**4. Segredos no Supabase.** Menu **Edge Functions → Secrets → Add new secret**:
   | Nome | Valor |
   |---|---|
   | `ASAAS_API_KEY` | a chave do passo 2 |
   | `ASAAS_WEBHOOK_TOKEN` | o token do passo 3 |

   Para testar no sandbox do Asaas, use a chave do sandbox e acrescente `ASAAS_API_URL` = `https://api-sandbox.asaas.com/v3` (apague esse segredo ao ir para produção).

**5. Criar a função.** Menu **Edge Functions → Deploy a new function → Via Editor**.
   - Nome: `asaas-webhook` (exatamente assim).
   - Apague o código de exemplo e cole todo o conteúdo de [`supabase/functions/asaas-webhook/index.ts`](../supabase/functions/asaas-webhook/index.ts).
   - **Deploy function**.
   - Na página da função, aba **Details** (ou Settings): **desligue "Enforce JWT Verification"** e salve. Sem isso o Supabase recusa os avisos do Asaas (o Asaas não tem login do Supabase; quem protege a função é o token).

   *Pela linha de comando, se preferir:* `supabase secrets set ...` e `supabase functions deploy asaas-webhook` (o `supabase/config.toml` já desliga o JWT).

**6. Webhook no Asaas.** **Integrações → Webhooks → Adicionar webhook**:
   - URL: `https://hlenhmgnqqnkjqmntnpz.supabase.co/functions/v1/asaas-webhook`
   - E-mail para avisos de falha: o seu
   - Token de autenticação: o mesmo do passo 3
   - Tipo de envio: **sequencial**; versão da API: v3; fila ativada
   - Eventos: marque os de **Cobranças**

**7. Autenticação do Supabase.** Menu **Authentication**:
   - **Sign In / Providers → Email:** "Confirm email" **ligado**; tamanho mínimo da senha 8; ligue **"Prevent use of leaked passwords"** (se o seu plano tiver).
   - **URL Configuration:** Site URL = `https://reviewdpe.com.br/`; em Redirect URLs deixe só esse endereço.
   - **Rate Limits:** mantenha os padrões (não aumente o de e-mails sem SMTP próprio).
   - **Emails → SMTP Settings:** para vender, configure um SMTP próprio (Resend, Brevo, Amazon SES). O do Supabase manda poucos e-mails por hora e os códigos de login vão parar no spam ou não chegam.

**8. Conta.** No canto do painel: **Account → Security → ative a verificação em dois fatores**. Faça o mesmo no Asaas e no GitHub.

**9. Testar no sandbox.** Crie no Asaas (sandbox) um cliente com o seu e-mail e uma assinatura mensal; na cobrança, use **Confirmar recebimento**. Depois, no SQL Editor:
   ```
   select * from public.asaas_log order by id desc limit 5;
   select email, valido_ate from public.liberados where email = 'seu@email.com';
   ```
   Deve aparecer `liberar` e uma data cerca de um mês à frente. Se não aparecer nada: **Edge Functions → asaas-webhook → Logs** mostra o erro; e no Asaas, **Webhooks → Ver logs** mostra se o envio foi recusado (401 = token diferente; 401 sem mensagem nossa = JWT ainda ligado).

## Segurança
- A função **não confia no conteúdo do webhook**: ela busca a cobrança, a assinatura e o cliente direto na API do Asaas. Um evento falso não libera ninguém.
- Sem `ASAAS_WEBHOOK_TOKEN` configurado (ou com menos de 32 caracteres), a função recusa tudo.
- A tabela `asaas_log` registra cada decisão, para suporte e auditoria.
- Se trocar a chave da API do Asaas, atualize o segredo `ASAAS_API_KEY`.

## Testes da lógica
```
node --experimental-strip-types --test supabase/functions/asaas-webhook/index.test.ts
```
