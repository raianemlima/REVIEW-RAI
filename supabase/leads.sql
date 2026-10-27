-- Captação de e-mails da página gratuita (materias-dpe.html).
-- Rode no painel do Supabase: SQL Editor → New query → cole tudo → Run. Pode rodar mais de uma vez.
-- Este arquivo NÃO vai para o site.
--
-- O que garante:
--   * Visitante sem login (anon) só consegue INSERIR o próprio cadastro, e só com consentimento marcado.
--   * Ninguém de fora lê, altera ou apaga a lista (não há policy de select/update/delete): só você, pelo painel.
--   * Um e-mail por linha (cadastro repetido é ignorado pelo site, sem erro para o visitante).
--   * Campos com tamanho limitado, para ninguém usar a tabela como depósito de texto.

create table if not exists public.leads (
  id            bigint generated always as identity primary key,
  criado_em     timestamptz not null default now(),
  email         text not null,
  nome          text,
  concurso      text,
  origem        text,          -- utm_source / ref / cupom de parceiro, como chegou
  campanha      text,          -- utm_campaign
  material      text not null default 'materias-dpe',
  consentimento boolean not null,
  descadastrado_em timestamptz,
  constraint leads_email_formato check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  constraint leads_nome_tam check (nome is null or length(nome) <= 80),
  constraint leads_concurso_tam check (concurso is null or length(concurso) <= 60),
  constraint leads_origem_tam check (origem is null or length(origem) <= 80),
  constraint leads_campanha_tam check (campanha is null or length(campanha) <= 80),
  constraint leads_material_tam check (length(material) <= 40),
  constraint leads_consentimento check (consentimento)
);

create unique index if not exists leads_email_unico on public.leads (lower(email));

alter table public.leads enable row level security;

-- anon pode só inserir; os campos de controle ficam com o padrão do banco
revoke all on public.leads from anon, authenticated;
grant insert (email, nome, concurso, origem, campanha, material, consentimento) on public.leads to anon;

drop policy if exists leads_insere_com_consentimento on public.leads;
create policy leads_insere_com_consentimento on public.leads
  for insert to anon
  with check (consentimento and descadastrado_em is null);

-- ============ Consultas úteis (painel) ============
-- Novos cadastros da semana, por origem:
--   select origem, count(*) from public.leads where criado_em > now() - interval '7 days' group by 1 order by 2 desc;
-- Exportar para a ferramenta de e-mail (só quem não pediu para sair):
--   select email, nome, concurso, criado_em from public.leads where descadastrado_em is null order by criado_em;
-- Pedido de descadastro ou de exclusão (LGPD, art. 18):
--   update public.leads set descadastrado_em = now() where lower(email) = lower('pessoa@exemplo.com');
--   delete from public.leads where lower(email) = lower('pessoa@exemplo.com');
