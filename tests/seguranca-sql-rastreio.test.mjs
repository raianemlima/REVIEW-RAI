import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(resolve(raiz, "supabase/seguranca.sql"), "utf8");
const doc = readFileSync(resolve(raiz, "docs/SEGURANCA-CONTEUDO.md"), "utf8");
const parte2 = sql.slice(sql.indexOf("-- ============ 2)"), sql.indexOf("-- ============ 3)"));
const parte6 = sql.slice(sql.indexOf("-- ============ 6)"), sql.indexOf("-- ============ 7)"));
const parte7 = sql.slice(sql.indexOf("-- ============ 7)"));
const norm = s => s.replace(/\s+/g, " ").trim();
const regra = s => { const i = s.indexOf("where exists ("); return norm(s.slice(i, s.indexOf(")\n", s.indexOf("valido_ate > now())", i)) + 1)); };

test("a regra de quem recebe a chave na parte 6 é idêntica à da parte 2", () => {
  const r2 = regra(parte2), r6 = regra(parte6);
  assert.ok(r2.includes("email_confirmed_at is not null") && r2.includes("valido_ate > now()"));
  assert.equal(r6, r2);
});

test("o registro não bloqueia a entrega: o insert está em bloco que engole falhas", () => {
  const corpo = parte6.slice(parte6.indexOf("create or replace function public.chave_do_app"), parte6.indexOf("revoke execute on function public.chave_do_app"));
  assert.match(corpo, /begin\s+begin\s+v_h :=[\s\S]*?exception when others then\s+v_h := '\{\}'::jsonb;\s+end;\s+insert into public\.chave_acessos[\s\S]*?exception when others then\s+null;\s+end;/);
  assert.ok(corpo.indexOf("return v_senha") > corpo.lastIndexOf("exception when others"), "o return vem depois do bloco de registro");
  assert.match(corpo, /security definer set search_path = ''/);
});

test("a tabela de registro não é acessível por anon nem authenticated", () => {
  assert.match(parte6, /alter table public\.chave_acessos enable row level security;/);
  assert.match(parte6, /revoke all on public\.chave_acessos from public, anon, authenticated;/);
  assert.doesNotMatch(parte6, /create policy/i);
  assert.doesNotMatch(parte6, /grant [^;]*chave_acessos/i);
});

test("só authenticated executa chave_do_app e anon continua sem acesso", () => {
  assert.match(parte6, /revoke execute on function public\.chave_do_app\(\) from public, anon;/);
  assert.match(parte6, /grant execute on function public\.chave_do_app\(\) to authenticated;/);
  assert.doesNotMatch(parte6, /grant execute on function public\.chave_do_app\(\) to [^;]*\banon\b/);
});

test("detecção e retenção vêm comentadas, e nada na parte 6 apaga dado ativo", () => {
  assert.match(parte6, /^-- select u\.email, count\(\*\) as entregas/m);
  assert.match(parte6, /^-- delete from public\.chave_acessos where em </m);
  assert.doesNotMatch(parte6, /^(delete|truncate|drop table)\b/im);
});

test("o guia avisa sobre privacidade, limites e rotação, e a parte 6 aponta para ele", () => {
  assert.match(parte6, /docs\/SEGURANCA-CONTEUDO\.md/);
  assert.match(parte6, /Política de Privacidade/);
  for (const trecho of ["Não existe correção técnica", "Privacidade", "Rotação da senha", "histórico do Git", "IP e navegador"]) assert.ok(doc.includes(trecho), trecho);
});

test("Termos e Política descrevem o registro antes de ele ser ativado, com o mesmo prazo do passo 6.4", () => {
  const priv = readFileSync(resolve(raiz, "privacidade.html"), "utf8");
  const termos = readFileSync(resolve(raiz, "termos.html"), "utf8");
  assert.match(priv, /<h2>Registro de acesso ao conteúdo<\/h2>/);
  for (const t of ["endereço IP", "user agent", "180 dias", "compartilhamento da conta"]) assert.ok(priv.includes(t), t);
  assert.match(termos, /registramos a data, o IP e o navegador/);
  assert.match(termos, /href="privacidade\.html">Política de Privacidade<\/a>\. Se esse registro/);
  assert.match(parte6, /180 days/);
  assert.doesNotMatch(priv, /não usamos rastreamento\.<\/b>/);
  // a política pode ser atualizada sozinha (ex.: lista de e-mails do material gratuito), mas nunca fica mais antiga que os Termos
  const data = html => { const [d, m, a] = html.match(/Última atualização: (\d{2})\/(\d{2})\/(\d{4})</).slice(1); return a + m + d; };
  assert.ok(data(priv) >= data(termos), "privacidade.html não pode ter data anterior à dos Termos de Uso");
});

test("o hook de cadastro usa a mesma regra de liberação e só o Auth o executa", () => {
  assert.match(parte7, /create or replace function public\.hook_before_user_created\(event jsonb\)/);
  assert.match(parte7, /security definer set search_path = ''/);
  assert.ok(norm(parte7).includes("lower(btrim(l.email)) = v_email and (l.valido_ate is null or l.valido_ate > now())"));
  assert.match(parte7, /'message', 'email_nao_liberado'/);
  assert.match(parte7, /revoke all on function public\.hook_before_user_created\(jsonb\) from public, anon, authenticated;/);
  assert.match(parte7, /grant execute on function public\.hook_before_user_created\(jsonb\) to supabase_auth_admin;/);
  assert.doesNotMatch(parte7, /grant execute[^;]*\b(anon|authenticated)\b/);
});
