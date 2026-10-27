import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { test } from "node:test";

const ler = caminho => readFile(new URL(`../${caminho}`, import.meta.url), "utf8");

test("materias-dpe.html está em dia com o relatório dos editais", () => {
  execFileSync(process.execPath, [new URL("../ferramentas/divulgacao/gerar_materias.mjs", import.meta.url).pathname, "--conferir"], { stdio: "pipe" });
});

test("material gratuito: resumo aberto, restante só após cadastro com consentimento", async () => {
  const html = await ler("materias-dpe.html");
  assert.match(html, /<article id="aberto">[\s\S]*Resumo executivo[\s\S]*<\/article>/);
  assert.match(html, /<article id="completo" hidden>[\s\S]*Pesos individuais mais observados/);
  assert.match(html, /<input type="checkbox" id="consente" required>/);
  assert.match(html, /consentimento: true/);
  assert.match(html, /\/rest\/v1\/leads/);
  assert.match(html, /r\.status !== 409/, "e-mail repetido não pode virar erro para o visitante");
  assert.match(html, /connect-src https:\/\/hlenhmgnqqnkjqmntnpz\.supabase\.co;/);
  assert.doesNotMatch(html, /sb_secret|service_role/i);
});

test("tabela de leads: anon só insere, com consentimento e campos limitados", async () => {
  const sql = await ler("supabase/leads.sql");
  assert.match(sql, /alter table public\.leads enable row level security/i);
  assert.match(sql, /revoke all on public\.leads from anon, authenticated/i);
  assert.match(sql, /grant insert \([^)]*\) on public\.leads to anon/i);
  assert.match(sql, /for insert to anon\s+with check \(consentimento/i);
  assert.doesNotMatch(sql, /for (select|update|delete|all)\b/i);
  assert.match(sql, /create unique index if not exists leads_email_unico on public\.leads \(lower\(email\)\)/i);
});

test("publicação inclui as páginas de divulgação, robots e sitemap", async () => {
  const pages = await ler(".github/workflows/pages.yml");
  for (const arquivo of ["conheca.html", "materias-dpe.html", "robots.txt", "sitemap.xml"]) assert.match(pages, new RegExp(` ${arquivo.replace(".", "\\.")} `));
  const sitemap = await ler("sitemap.xml");
  assert.match(sitemap, /https:\/\/reviewdpe\.com\.br\/materias-dpe\.html/);
  assert.doesNotMatch(sitemap, /index\.html|\/<\/loc>/, "o app (tela de login) não entra no sitemap");
  const sw = await ler("sw.js");
  assert.match(sw, /conheca\|materias-dpe\)\\\.html\$/);
});

test("página de vendas: depoimentos só aparecem quando existirem de verdade", async () => {
  const conheca = await ler("conheca.html");
  assert.match(conheca, /const DEPOIMENTOS = \[/);
  assert.match(conheca, /id="depoimentos" hidden/);
  assert.match(conheca, /href="materias-dpe\.html"/);
});

test("privacidade explica a lista de e-mails do material gratuito", async () => {
  const p = await ler("privacidade.html");
  assert.match(p, /id="material-gratuito"/);
  assert.match(p, /consentimento/);
});
