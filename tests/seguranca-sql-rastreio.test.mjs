import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(resolve(raiz, "supabase/seguranca.sql"), "utf8");
const doc = readFileSync(resolve(raiz, "docs/SEGURANCA-CONTEUDO.md"), "utf8");
const parte2 = sql.slice(sql.indexOf("-- ============ 2)"), sql.indexOf("-- ============ 3)"));
const parte6 = sql.slice(sql.indexOf("-- ============ 6)"));
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
  assert.equal(priv.match(/Última atualização: (\S+)</)[1], termos.match(/Última atualização: (\S+)</)[1]);
});
