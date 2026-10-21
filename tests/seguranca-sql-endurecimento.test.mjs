import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const sql = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "..", "supabase/seguranca.sql"), "utf8");
const inicio5 = sql.indexOf("-- ============ 5)"), fim5 = sql.indexOf("-- ============ 6)");
const parte5 = sql.slice(inicio5, fim5 < 0 ? undefined : fim5);

test("a parte 5 existe e vem depois das partes 2 e 4", () => {
  assert.ok(sql.indexOf("-- ============ 5)") > sql.indexOf("-- ============ 4)"));
});

test("S7: asaas_aplicar usa search_path vazio, continua security definer e só o service_role executa", () => {
  const corpo = parte5.slice(parte5.indexOf("create or replace function public.asaas_aplicar"), parte5.indexOf("-- 5.2)"));
  assert.match(corpo, /security definer set search_path = ''/);
  assert.doesNotMatch(corpo, /search_path = public/);
  assert.match(corpo, /revoke all on function public\.asaas_aplicar\([^)]*\) from public, anon, authenticated;/);
  assert.match(corpo, /grant execute on function public\.asaas_aplicar\([^)]*\) to service_role;/);
  for (const t of ["liberados", "asaas_log"]) assert.doesNotMatch(corpo, new RegExp(`(?<!public\\.)\\b(into|update|from) ${t}\\b`));
});

test("E2: a correção de dados vem comentada e precedida de diagnóstico sem colisões", () => {
  assert.ok(parte5.indexOf("-- 5.2)") < parte5.indexOf("-- 5.3)"));
  assert.match(parte5, /^-- update public\.liberados set email = lower\(btrim\(email\)\)/m);
  assert.doesNotMatch(parte5, /^update public\.liberados set email/m);
  assert.match(parte5, /having count\(\*\) > 1/);
});

test("E2: a restrição entra como not valid e a validação só roda depois da correção", () => {
  assert.match(parte5, /check \(email = lower\(btrim\(email\)\)\) not valid;/);
  assert.match(parte5, /^-- alter table public\.liberados validate constraint/m);
});

test("a parte 5 não apaga nem derruba nada além de recriar o próprio gatilho e a própria restrição", () => {
  assert.doesNotMatch(parte5, /\b(drop table|truncate|delete from)\b/i);
  const drops = [...parte5.matchAll(/^drop \w+ .*$/gim)].map(m => m[0]);
  assert.deepEqual(drops.map(d => d.replace(/\s+/g, " ")), ["drop trigger if exists liberados_email_normalizado on public.liberados;"]);
});
