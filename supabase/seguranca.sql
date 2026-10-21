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

-- Impede a criação de contas por senha ou código para e-mails sem liberação ativa.
-- Contas existentes ainda podem autenticar no Supabase, mas a RPC abaixo continua
-- sendo a autorização efetiva para receber a chave e abrir o conteúdo do app.
create or replace function public.validar_email_liberado()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null or not exists (
    select 1 from public.liberados l
    where lower(btrim(l.email)) = lower(btrim(new.email))
      and (l.valido_ate is null or l.valido_ate > now())
  ) then
    raise exception 'email_nao_liberado' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public.validar_email_liberado() from public, anon, authenticated;
drop trigger if exists review_dpe_email_liberado on auth.users;
create trigger review_dpe_email_liberado
before insert on auth.users
for each row execute function public.validar_email_liberado();

-- Mesma função de antes (só e-mail liberado e confirmado), agora também exigindo assinatura em dia.
create or replace function public.chave_do_app()
returns text language sql stable security definer set search_path to '' as $$
  select c.senha from public.chave_app c
  where exists (
    select 1 from auth.users u
    join public.liberados l on lower(btrim(l.email)) = lower(btrim(u.email))
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

-- ============ 5) Endurecimento (S7 e E2) — NÃO rodar às cegas ============
-- Rode DEPOIS das partes 2 e 4. Faça um passo por vez, no SQL Editor, lendo o resultado de cada diagnóstico.
-- Nenhum passo apaga dado. Os passos 5.2 a 5.4 alteram a tabela public.liberados: faça um backup antes
-- (Database → Backups, ou: create table public.liberados_bkp as select * from public.liberados;).

-- 5.1) S7: asaas_aplicar com search_path vazio (as outras funções já usam). Todas as referências já são qualificadas
--      (public.liberados, public.asaas_log); lower/greatest/coalesce/now vêm do pg_catalog, que é sempre pesquisado.
create or replace function public.asaas_aplicar(p_email text, p_acao text, p_ate timestamptz, p_evento_id text, p_evento text, p_pagamento text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_ate timestamptz;
begin
  if p_acao = 'liberar' then
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

-- 5.2) E2, diagnóstico (só leitura): e-mails fora do padrão (maiúsculas ou espaços) e colisões depois de normalizar.
select email, lower(btrim(email)) as normalizado from public.liberados where email <> lower(btrim(email));
select lower(btrim(email)) as normalizado, count(*) as linhas from public.liberados group by 1 having count(*) > 1;
--    Se a segunda consulta devolver linhas, NÃO siga: duas linhas virariam a mesma e o índice único falharia.
--    Resolva à mão (mantenha a de maior valido_ate e apague a outra) e refaça o diagnóstico.

-- 5.3) E2, correção (só depois de 5.2 sem colisões): normaliza os e-mails existentes.
-- update public.liberados set email = lower(btrim(email)) where email <> lower(btrim(email));

-- 5.4) E2, prevenção: a partir daqui qualquer inserção ou alteração manual grava o e-mail já normalizado.
--      A restrição entra "not valid" (vale para linhas novas) e é validada em seguida; se a validação falhar, o passo 5.3 não foi feito.
create or replace function public.normalizar_email_liberado()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.email := lower(btrim(new.email));
  return new;
end $$;
drop trigger if exists liberados_email_normalizado on public.liberados;
create trigger liberados_email_normalizado
before insert or update of email on public.liberados
for each row execute function public.normalizar_email_liberado();
alter table public.liberados drop constraint if exists liberados_email_normalizado_ck;
alter table public.liberados add constraint liberados_email_normalizado_ck check (email = lower(btrim(email))) not valid;
-- alter table public.liberados validate constraint liberados_email_normalizado_ck;   -- rode só depois do passo 5.3

-- ============ 6) Registro de entregas da chave (S2): detectar compartilhamento — NÃO rodar às cegas ============
-- A senha do baralho é única e o deck.enc é público: um assinante que a repassa dá acesso a quem a receber.
-- Isso não tem correção técnica no navegador. O que dá para fazer é DETECTAR contas usadas em muitos lugares.
-- Antes de rodar: (1) leia docs/SEGURANCA-CONTEUDO.md; (2) publique a Política de Privacidade e os Termos atualizados e avise os assinantes (o registro guarda IP e navegador
-- por conta, o que é dado pessoal); (3) rode depois das partes 2 e 5; (4) faça backup. Um passo por vez.

-- 6.1) Tabela do registro. Sem policy e sem permissão para anon/authenticated: só o painel e a função (security definer) acessam.
create table if not exists public.chave_acessos (
  id bigserial primary key,
  em timestamptz not null default now(),
  uid uuid not null,
  ip text,
  agente text
);
alter table public.chave_acessos enable row level security;
revoke all on public.chave_acessos from public, anon, authenticated;
revoke all on sequence public.chave_acessos_id_seq from public, anon, authenticated;
create index if not exists chave_acessos_uid_em on public.chave_acessos (uid, em desc);

-- 6.2) chave_do_app passa a registrar cada entrega. A regra de quem recebe a chave é IDÊNTICA à da parte 2.
--      O registro nunca bloqueia a entrega: se o insert falhar por qualquer motivo, a chave é entregue do mesmo jeito.
--      Deixa de ser "stable" porque grava; o app chama por POST, que o PostgREST aceita para funções voláteis.
create or replace function public.chave_do_app()
returns text language plpgsql volatile security definer set search_path = '' as $$
declare v_senha text; v_h jsonb;
begin
  select c.senha into v_senha from public.chave_app c
  where exists (
    select 1 from auth.users u
    join public.liberados l on lower(btrim(l.email)) = lower(btrim(u.email))
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
      and (l.valido_ate is null or l.valido_ate > now())
  );
  if v_senha is not null then
    begin
      begin
        v_h := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
      exception when others then
        v_h := '{}'::jsonb;
      end;
      insert into public.chave_acessos (uid, ip, agente)
      values (auth.uid(), nullif(btrim(split_part(coalesce(v_h->>'x-forwarded-for', ''), ',', 1)), ''), left(v_h->>'user-agent', 300));
    exception when others then
      null;
    end;
  end if;
  return v_senha;
end $$;
revoke execute on function public.chave_do_app() from public, anon;
grant execute on function public.chave_do_app() to authenticated;

-- 6.3) Detecção (só leitura). Contas com a chave pedida de muitos IPs ou navegadores nos últimos 30 dias.
--      É um indício, não uma prova: quem usa dados móveis troca de IP. Compare com a quantidade de acessos e investigue caso a caso.
-- select u.email, count(*) as entregas, count(distinct a.ip) as ips, count(distinct a.agente) as navegadores, min(a.em) as primeira, max(a.em) as ultima
-- from public.chave_acessos a join auth.users u on u.id = a.uid
-- where a.em > now() - interval '30 days'
-- group by u.email
-- having count(distinct a.ip) >= 6 or count(distinct a.agente) >= 4
-- order by ips desc, entregas desc;

-- 6.4) Retenção: apague registros antigos (guarde só o necessário; combine o prazo com a Política de Privacidade).
-- delete from public.chave_acessos where em < now() - interval '180 days';
