# Divulgação do Review DPE

Guia de uso das peças de divulgação que estão no site. Ele acompanha o plano de apresentação e divulgação (deck de 90 dias).

## 1. Ativar (uma vez)

1. **Banco de dados:** no Supabase, abra **SQL Editor → New query**, cole todo o [`supabase/leads.sql`](../supabase/leads.sql) e clique em **Run**. Sem isso, o formulário do material gratuito mostra "Não consegui registrar agora".
2. **Publicar:** faça o merge do PR no `main`. O workflow publica `materias-dpe.html`, `robots.txt` e `sitemap.xml` junto com o restante.
3. **Teste rápido depois de publicar:**
   - Abra `https://reviewdpe.com.br/` numa janela anônima. A página de vendas precisa aparecer, e não a tela de login.
   - Abra `https://reviewdpe.com.br/?entrar=1`. A tela de login precisa aparecer.
   - Cadastre o seu e-mail em `https://reviewdpe.com.br/materias-dpe.html?utm_source=teste` e confira no SQL Editor: `select * from public.leads order by id desc limit 5;`
4. **Google:** no [Search Console](https://search.google.com/search-console), adicione o domínio e envie `https://reviewdpe.com.br/sitemap.xml`.

### Como o domínio decide o que mostrar

| Quem abre `reviewdpe.com.br` | O que vê |
|---|---|
| Visitante novo no navegador (nunca usou o app naquele aparelho) | Página de vendas (`conheca.html`), com a UTM preservada |
| Quem já usou o app, tem conta salva ou abriu um link de e-mail de login | Tela de entrada |
| App instalado na tela inicial (`?origem=pwa`) | Tela de entrada |
| Link "Entrar" da página de vendas (`?entrar=1`) | Tela de entrada |
| Sem internet | Tela de entrada |

## 2. Links prontos com UTM

Use sempre estes links. A origem vai junto para a página de vendas e para o cadastro do material gratuito, e assim dá para saber que canal trouxe cada e-mail.

| Onde | Link |
|---|---|
| Bio do Instagram | `https://reviewdpe.com.br/?utm_source=instagram&utm_medium=bio` |
| Stories (link) | `https://reviewdpe.com.br/conheca.html?utm_source=instagram&utm_medium=stories` |
| Resposta automática "comente REVISÃO" | `https://reviewdpe.com.br/conheca.html?utm_source=instagram&utm_medium=direct&utm_campaign=revisao` |
| Material grátis no Instagram | `https://reviewdpe.com.br/materias-dpe.html?utm_source=instagram&utm_medium=bio` |
| TikTok | `https://reviewdpe.com.br/?utm_source=tiktok&utm_medium=bio` |
| Canal do Telegram | `https://reviewdpe.com.br/conheca.html?utm_source=telegram&utm_medium=canal` |
| Canal ou grupo de WhatsApp | `https://reviewdpe.com.br/conheca.html?utm_source=whatsapp&utm_medium=canal` |
| E-mails da lista | `https://reviewdpe.com.br/conheca.html?utm_source=email&utm_medium=sequencia&utm_campaign=boas-vindas` |
| Campanha de edital (troque o estado) | `https://reviewdpe.com.br/conheca.html?utm_source=instagram&utm_campaign=edital-dpe-ce` |
| Parceiro (troque o código) | `https://reviewdpe.com.br/conheca.html?cupom=PROFANA` |

O link da bio pode ser o domínio raiz: o visitante novo cai na página de vendas.

## 3. Lista de e-mails

**Exportar** (SQL Editor):

```sql
select email, nome, concurso, origem, criado_em from public.leads where descadastrado_em is null order by criado_em;
```

Baixe como CSV e importe numa ferramenta de envio com link de descadastro automático (por exemplo Brevo, Resend ou MailerLite). Quando alguém pedir para sair ou para apagar os dados, apague a linha (o comando está no fim do `leads.sql`).

**Sequência de boas-vindas (5 e-mails, um a cada 2 dias):**

1. **Seu relatório chegou.** Link para `materias-dpe.html`, com os três achados principais: o núcleo de 7 matérias, o segundo bloco de 5 e a faixa de 8 a 12 questões dos maiores blocos.
2. **Por que você esquece o que estudou.** A curva do esquecimento em linguagem simples, e o que muda quando a revisão acontece no momento certo.
3. **Como montar o cronograma pelo edital.** Seção 7 do relatório, e como o app monta o plano do seu edital.
4. **20 minutos por dia.** A rotina do app: meta de 10 cartões, "Hoje, só 5", modo ouvir. Prints da tela Hoje.
5. **Teste com garantia.** O convite para assinar, com os 7 dias de reembolso integral e o anual por cerca de R$ 0,36 por dia.

## 4. Parceiros (professores e cursos)

1. Escolha um código curto, só letras e números, por exemplo `PROFANA`.
2. **Com desconto:** no Asaas, crie links de pagamento próprios do parceiro (**Cobranças → Links de pagamento**), com o valor já reduzido e o **e-mail obrigatório**, como os links normais. O nome do link deve conter o código (por exemplo "Review DPE · Anual · PROFANA"), para contar as vendas no relatório do Asaas.
3. Em `conheca.html`, no bloco `PARCEIROS`, acrescente:

   ```js
   PROFANA: { nome: "Prof.ª Ana", texto: "10% de desconto no anual", linkMensal: "", linkAnual: "https://www.asaas.com/c/..." },
   ```

   Sem links próprios, deixe `linkMensal` e `linkAnual` vazios. O código ainda aparece na página e fica registrado na origem dos e-mails do material gratuito.
4. Envie ao parceiro o link `https://reviewdpe.com.br/conheca.html?cupom=PROFANA`. O cupom vale por 30 dias no aparelho de quem clicou.
5. A comissão é paga por fora, com base nas vendas dos links do parceiro no Asaas.

**Indique um colega:** use o mesmo mecanismo com um código por aluno (por exemplo `INDICA-MARIA`). O prêmio (por exemplo 1 mês grátis) é aplicado à mão em `liberados.valido_ate`, como no item 3 do `seguranca.sql`.

## 5. Depoimentos

A seção "O que dizem os alunos" da página de vendas fica escondida até haver pelo menos um depoimento no bloco `DEPOIMENTOS` de `conheca.html`. Só use depoimentos reais, com autorização por escrito. Nunca invente nem "melhore" o texto.

```js
{ texto: "Texto exatamente como a pessoa escreveu", nome: "Maria S.", detalhe: "estuda para a DPE-CE" },
```

**Modelo de autorização** (peça por e-mail ou WhatsApp e guarde a resposta):

> Autorizo a Multiversão (Review DPE, CNPJ 69.592.887/0001-50) a publicar, no site e nas redes sociais do Review DPE, o depoimento abaixo, acompanhado de [nome como deve aparecer] e [concurso que estudo], sem prazo definido e sem remuneração. Posso pedir a retirada a qualquer momento pelo e-mail multiversaoempreendimentos@gmail.com.
> Depoimento: "…"

## 6. Conteúdo da semana

| Dia | Tema | Formato |
|---|---|---|
| Seg | Lei seca que mais cai | Carrossel: artigo + questão real |
| Ter | Tese da semana | Reel de 30 s com tese do STF ou STJ |
| Qua | Questão comentada | Enquete nos stories, gabarito depois |
| Qui | Método de estudo | Reel sobre esquecimento, revisão e rotina |
| Sex | Por dentro do app | Tela gravada + link: o único post de venda |
| Sáb | Aluno real | Depoimento autorizado ou caixinha de dúvidas |
| Dom | Descanso | Só stories com a novidade do dia |

**Três posts para começar:**

- **Reel (método):** "Você não tem problema de memória. Tem problema de revisão." Mostre um cartão errado voltando no dia certo. Legenda: "Comente REVISÃO que eu te mando o link."
- **Carrossel (lei seca):** "5 artigos da LC 80/94 que as provas de Defensoria adoram." Um artigo por lâmina, com a questão real abaixo. Confira o texto vigente antes de publicar.
- **Stories (história):** "Sou advogada e criei o app que eu queria ter para estudar." O problema, a ideia, o app por dentro e uma caixinha: "o que você quer que eu coloque nele?".
- **Material grátis:** "Quais matérias mais caem na Defensoria? Analisei 18 editais." Mostre a tabela de frequência; link para `materias-dpe.html`.

**Pitch de 60 segundos** (vídeo, live ou conversa):

> Você estuda semanas uma matéria e, na hora da questão, dá branco? Não é falta de esforço: é a curva do esquecimento. Sem revisão, a memória vai embora em poucos dias, e reler o PDF não resolve. Criei o Review DPE: ele calcula quando você ia esquecer cada assunto e traz de volta antes, priorizando o que mais cai na Defensoria. Lei seca, teses, doutrina e provas reais, em 20 minutos por dia. Link na bio. Você tem 7 dias para testar e pedir o dinheiro de volta se não gostar.

## 7. Saiu edital, sai a campanha

- [ ] **D0:** post e stories com vagas, banca, data da prova e as matérias que mais pesam (use o Relatório dos editais do app).
- [ ] **D+2:** edital no Cronograma do app; reel mostrando o plano montado. Link com `utm_campaign=edital-<estado>`.
- [ ] **D+7:** live de análise com um professor parceiro daquele estado, com cupom do parceiro válido por 72 horas.
- [ ] **Até a prova:** uma tese ou artigo por dia, sempre do programa daquele edital.

## 8. Números para olhar toda segunda-feira

| Etapa | Número | Onde |
|---|---|---|
| Interesse | Novos e-mails por origem | `select origem, count(*) from public.leads where criado_em > now() - interval '7 days' group by 1 order by 2 desc;` |
| Compra | Assinaturas novas e % do anual | Asaas → Cobranças |
| Parceiros | Vendas por link de parceiro | Asaas → Links de pagamento |
| Retenção | Reembolsos em 7 dias e cancelamentos | Asaas |

## 9. Cuidados

- Não prometa aprovação. Fale em lembrar, priorizar e treinar.
- Não use brasões ou logos das Defensorias. Mantenha o aviso de que o Review DPE não tem vínculo com elas.
- Depoimentos só reais e autorizados (item 5).
- E-mails só com consentimento e com link para sair em todos os envios.
