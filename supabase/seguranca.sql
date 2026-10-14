-- Segurança do Supabase para o app por assinatura.
-- Rode no painel do Supabase: SQL Editor → New query. Este arquivo NÃO vai para o site (o deploy só publica index.html, sw.js etc.).
-- Faça na ordem. A parte 1 só lê. As partes 2 e 4 podem ser rodadas juntas.

-- ============ 1) Diagnóstico (só leitura) ============
-- Como a função que entrega a chave está escrita hoje:
select pg_get_functiondef('public.chave_do_app'::regproc);
-- Tabelas do schema public e se a RLS está ligada (relrowsecurity = false é problema se a tabela tem dado de aluno):
select c.relname as tabela, c.relrowsecurity as rls_ligada
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' order by 2, 1;
-- Regras (policies) existentes:
select tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public' order by 1, 2;
-- Quem pode chamar a função:
select grantee, privilege_type from information_schema.routine_privileges where routine_schema = 'public' and routine_name = 'chave_do_app';

-- ============ 2) Assinatura com validade (pode rodar já) ============
-- Validade da assinatura. Vazio (null) = sem prazo, para não cortar quem foi liberado à mão antes do Asaas.
alter table public.liberados add column if not exists valido_ate timestamptz;
-- Um e-mail por linha (o Asaas atualiza a linha existente em vez de duplicar).
create unique index if not exists liberados_email_unico on public.liberados (email);

-- Mesma função de antes (só e-mail liberado e confirmado), agora também exigindo assinatura em dia.
create or replace function public.chave_do_app()
returns text language sql stable security definer set search_path to '' as $$
  select c.senha from public.chave_app c
  where exists (
    select 1 from auth.users u
    join public.liberados l on l.email = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
      and (l.valido_ate is null or l.valido_ate > now())
  )
$$;
-- Visitante sem login (anon) não chama a função; só quem entrou na conta.
revoke execute on function public.chave_do_app() from public, anon;
grant execute on function public.chave_do_app() to authenticated;

-- ============ 3) Liberar à mão (opcional) ============
-- Liberar / renovar um aluno por 1 mês sem passar pelo Asaas:
--   insert into public.liberados (email, valido_ate) values ('aluno@exemplo.com', now() + interval '1 month')
--   on conflict (email) do update set valido_ate = excluded.valido_ate;
-- Dar prazo a quem foi liberado antes, sem data (senão continua sem prazo):
--   update public.liberados set valido_ate = now() + interval '1 month' where valido_ate is null;

-- ============ 4) Asaas: liberação automática pelo pagamento ============
-- Usado pela Edge Function asaas-webhook (supabase/functions/asaas-webhook). Rode a parte 2 antes (ela cria o índice único em email).
create table if not exists public.asaas_log (
  id bigserial primary key,
  criado_em timestamptz not null default now(),
  evento_id text, evento text, pagamento text, email text, acao text, valido_ate timestamptz
);
alter table public.asaas_log enable row level security;   -- sem policy: só o painel e a função leem

create or replace function public.asaas_aplicar(p_email text, p_acao text, p_ate timestamptz, p_evento_id text, p_evento text, p_pagamento text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_ate timestamptz;
begin
  if p_acao = 'liberar' then
    -- renovação nunca encurta: fica a data mais distante (eventos repetidos ou fora de ordem não atrapalham)
    insert into public.liberados (email, valido_ate) values (lower(p_email), p_ate)
    on conflict (email) do update set valido_ate = greatest(coalesce(public.liberados.valido_ate, excluded.valido_ate), excluded.valido_ate)
    returning valido_ate into v_ate;
  elsif p_acao = 'cortar' then
    update public.liberados set valido_ate = now() where email = lower(p_email) returning valido_ate into v_ate;
  end if;
  insert into public.asaas_log (evento_id, evento, pagamento, email, acao, valido_ate) values (p_evento_id, p_evento, p_pagamento, lower(p_email), p_acao, v_ate);
end $$;
revoke all on function public.asaas_aplicar(text, text, timestamptz, text, text, text) from public, anon, authenticated;
grant execute on function public.asaas_aplicar(text, text, timestamptz, text, text, text) to service_role;

-- Consultas úteis:
--   últimos eventos:            select * from public.asaas_log order by id desc limit 50;
--   pagou mas sem e-mail:       select * from public.asaas_log where acao = 'sem_email' order by id desc;
--   assinaturas que vencem em 7 dias: select email, valido_ate from public.liberados where valido_ate between now() and now() + interval '7 days';
