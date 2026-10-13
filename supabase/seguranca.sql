-- Segurança do Supabase para o app por assinatura.
-- Rode no painel do Supabase: SQL Editor → New query. Este arquivo NÃO vai para o site (o deploy só publica index.html, sw.js etc.).
-- Faça na ordem. A parte 1 só lê; mande o resultado dela para ajustar a parte 3.

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

-- ============ 2) Endurecimento seguro (pode rodar já) ============
-- Visitante sem login (anon) não chama a função; só quem entrou na conta.
revoke execute on function public.chave_do_app() from public, anon;
grant execute on function public.chave_do_app() to authenticated;
-- Fixa o search_path (evita que alguém sequestre a função criando objetos com o mesmo nome em outro schema).
alter function public.chave_do_app() set search_path = public, pg_temp;
-- Validade da assinatura. Vazio (null) = sem prazo, para não cortar quem já está liberado hoje.
alter table public.liberados add column if not exists valido_ate timestamptz;

-- ============ 3) Depois do diagnóstico ============
-- a) A chave_do_app deve conferir a validade. Na consulta que procura o e-mail em liberados, acrescente:
--      and (l.valido_ate is null or l.valido_ate > now())
--    e só entregue a chave a e-mail confirmado:
--      and exists (select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null)
-- b) Toda tabela do item 1 com rls_ligada = false:  alter table public.<tabela> enable row level security;
--    (liberados e a tabela onde fica a senha do baralho não precisam de policy nenhuma: só a função, como SECURITY DEFINER, lê.)
-- c) Liberar / renovar um aluno por 1 mês (até o webhook do pagamento fazer isso sozinho):
--      insert into public.liberados (email, valido_ate) values ('aluno@exemplo.com', now() + interval '1 month')
--      on conflict (email) do update set valido_ate = excluded.valido_ate;

-- ============ 4) Asaas: liberação automática pelo pagamento ============
-- Usado pela Edge Function asaas-webhook (supabase/functions/asaas-webhook). Requer que liberados.email seja chave primária ou único
-- (se a parte 1 mostrar que não é:  alter table public.liberados add constraint liberados_email_key unique (email); ).
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
