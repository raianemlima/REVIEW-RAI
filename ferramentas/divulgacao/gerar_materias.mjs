// Gera materias-dpe.html (material gratuito de captação) a partir de docs/RELATORIO-MATERIAS-E-PESOS-DPE.md.
// Uso: node ferramentas/divulgacao/gerar_materias.mjs            → grava materias-dpe.html
//      node ferramentas/divulgacao/gerar_materias.mjs --conferir → falha se o arquivo publicado estiver desatualizado
// O resumo (seção 1) fica aberto; o restante aparece depois do cadastro do e-mail.
import { readFileSync, writeFileSync } from "node:fs";

const raiz = new URL("../../", import.meta.url);
const md = readFileSync(new URL("docs/RELATORIO-MATERIAS-E-PESOS-DPE.md", raiz), "utf8");
const SB_URL = "https://hlenhmgnqqnkjqmntnpz.supabase.co", SB_KEY = "sb_publishable_UbPHvOFSbd-dgyDx6SI7mg_UBx4_o9l";   // chave pública: a proteção é a RLS (supabase/leads.sql)

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// links para arquivos internos do projeto viram texto; links externos continuam links
const inline = s => esc(s)
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => /^https:\/\//.test(u) ? `<a href="${u}" target="_blank" rel="noopener">${t}</a>` : t)
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  .replace(/\*([^*]+)\*/g, "<em>$1</em>");

export function mdParaHtml(texto) {
  const linhas = texto.split("\n"), out = [];
  let i = 0;
  while (i < linhas.length) {
    const l = linhas[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{1,3}) (.*)$/))) { const n = m[1].length + 1; out.push(`<h${n}>${inline(m[2])}</h${n}>`); i++; continue; }
    if (/^\|/.test(l)) {
      const linhasTab = []; while (i < linhas.length && /^\|/.test(linhas[i])) linhasTab.push(linhas[i++]);
      const cel = r => r.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
      const alin = cel(linhasTab[1]).map(c => /:$/.test(c) ? ' class="n"' : "");
      const cab = cel(linhasTab[0]).map((c, k) => `<th${alin[k]}>${inline(c)}</th>`).join("");
      const corpo = linhasTab.slice(2).map(r => `<tr>${cel(r).map((c, k) => `<td${alin[k]}>${inline(c)}</td>`).join("")}</tr>`).join("\n");
      out.push(`<div class="tab"><table><thead><tr>${cab}</tr></thead><tbody>\n${corpo}\n</tbody></table></div>`);
      continue;
    }
    if (/^(\d+\.|-) /.test(l)) {
      const ordenada = /^\d+\./.test(l), itens = [];
      while (i < linhas.length && /^(\d+\.|-) /.test(linhas[i])) itens.push(linhas[i++].replace(/^(\d+\.|-) /, ""));
      const tag = ordenada ? "ol" : "ul";
      out.push(`<${tag}>${itens.map(t => `<li>${inline(t)}</li>`).join("")}</${tag}>`);
      continue;
    }
    const par = []; while (i < linhas.length && linhas[i].trim() && !/^(#|\||\d+\. |- )/.test(linhas[i])) par.push(linhas[i++].trim());
    out.push(`<p>${inline(par.join(" "))}</p>`);
  }
  return out.join("\n");
}

const [cabecalho, ...secoes] = md.split(/\n(?=## )/);
const intro = cabecalho.split("\n").filter(l => !/^# /.test(l)).join("\n");
const aberto = mdParaHtml(intro + "\n\n" + secoes[0]);
const fechado = mdParaHtml(secoes.slice(1).join("\n"));

const CSP = `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src ${SB_URL}; object-src 'none'; base-uri 'none'; form-action 'none'`;

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Quais matérias mais caem na Defensoria? · Relatório grátis · Review DPE</title>
<meta name="description" content="Relatório gratuito com as matérias e os pesos mais comuns em 18 editais de Defensor(a) Público(a), de 16 estados, publicados entre 2021 e 2026.">
<meta name="theme-color" content="#08775c">
<meta property="og:type" content="article">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="Quais matérias mais caem na Defensoria? Relatório de 18 editais">
<meta property="og:description" content="Núcleo universal, matérias recorrentes e quantas questões cada uma costuma ter. Grátis, do Review DPE.">
<meta property="og:url" content="https://reviewdpe.com.br/materias-dpe.html">
<meta property="og:image" content="https://reviewdpe.com.br/screenshots/og-review-dpe.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://reviewdpe.com.br/materias-dpe.html">
<link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<link rel="stylesheet" href="fonts/fonts.css">
<style>
:root { --bg: #f5f8f5; --surface: #ffffff; --ink: #173b32; --muted: #53685f; --line: #ccddd3; --accent: #08775c; --accent-deep: #055642; --accent-soft: #e5f1ea;
  --ouro: #e9bf63; --erro: #b3261e; --f: "Rubik", system-ui, -apple-system, "Segoe UI", sans-serif; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg: #061f1b; --surface: #0d352c; --ink: #f5fbf7; --muted: #c3dcd0; --line: #245143; --accent: #4dd6a6; --accent-deep: #70e0ba; --accent-soft: #123f31; --erro: #ffb4ab; color-scheme: dark; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 400 16px/1.65 var(--f); -webkit-font-smoothing: antialiased; }
a { color: var(--accent); }
.wrap { max-width: 860px; margin: 0 auto; padding: 0 16px; }
.top { border-bottom: 2px solid var(--line); background: var(--bg); }
.top .wrap { display: flex; align-items: center; justify-content: space-between; height: 62px; gap: 12px; }
.brand { display: flex; align-items: center; gap: 8px; text-decoration: none; color: var(--ink); font: 800 1.25rem var(--f); }
.brand b { color: var(--accent); }
.brand img { width: 30px; height: 30px; }
.top .app { font-weight: 700; text-decoration: none; color: var(--accent-deep); border: 2px solid var(--line); border-bottom-width: 4px; padding: 6px 14px; border-radius: 14px; background: var(--surface); white-space: nowrap; }
.hero { color: #fff; padding: 48px 0 56px; background: linear-gradient(160deg, #0b3b30 0%, #08775c 50%, #055642 100%); }
.tag { display: inline-block; font: 700 .78rem var(--f); letter-spacing: .08em; text-transform: uppercase; background: rgba(255,255,255,.16); border: 2px solid rgba(255,255,255,.3); padding: 6px 12px; border-radius: 999px; }
.hero h1 { font: 800 clamp(2.1rem, 7vw, 3.4rem)/1.08 var(--f); margin: 16px 0 0; letter-spacing: -.02em; }
.hero h1 em { font-style: normal; color: var(--ouro); }
.hero p { color: #e5f1ea; font-size: 1.1rem; max-width: 36em; margin: 16px 0 0; }
main { padding: 40px 0 72px; }
article h2 { font: 800 1.5rem/1.2 var(--f); margin: 40px 0 12px; }
article h3 { font: 700 1.15rem/1.3 var(--f); margin: 28px 0 8px; }
article p, article li { color: var(--ink); }
.tab { overflow-x: auto; margin: 16px 0; border: 2px solid var(--line); border-radius: 16px; background: var(--surface); }
table { border-collapse: collapse; width: 100%; font-size: .92rem; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--line); vertical-align: top; }
th { background: var(--accent-soft); font-weight: 700; }
tr:last-child td { border-bottom: none; }
.n { text-align: right; white-space: nowrap; }
.caixa { margin: 40px 0; background: var(--surface); border: 2px solid var(--line); border-bottom-width: 5px; border-radius: 22px; padding: 24px; }
.caixa h2 { margin: 0 0 6px; font: 800 1.4rem/1.2 var(--f); }
.caixa p { margin: 0 0 16px; color: var(--muted); }
form { display: grid; gap: 12px; }
label { font-weight: 600; font-size: .95rem; display: grid; gap: 6px; }
input[type=email], input[type=text], select { font: inherit; color: var(--ink); background: var(--bg); border: 2px solid var(--line); border-radius: 12px; padding: 12px 14px; min-height: 48px; width: 100%; }
input:focus, select:focus, button:focus-visible, a:focus-visible { outline: 3px solid var(--ouro); outline-offset: 2px; }
.ok { display: flex; gap: 10px; align-items: flex-start; font-weight: 400; font-size: .92rem; color: var(--muted); }
.ok input { width: 22px; height: 22px; margin: 2px 0 0; flex: none; accent-color: var(--accent); }
.btn { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 0 24px; border-radius: 16px; border: 0; font: 800 1rem var(--f); letter-spacing: .04em; text-transform: uppercase; cursor: pointer; text-decoration: none; }
.btn.ouro { background: var(--ouro); color: #072d27; box-shadow: 0 5px 0 #b78a32; }
.btn.verde { background: #08775c; color: #fff; box-shadow: 0 5px 0 #055642; }
.btn:disabled { opacity: .6; cursor: wait; }
.msg { min-height: 1.4em; margin: 0; font-weight: 600; }
.msg.erro { color: var(--erro); }
.fim { margin-top: 48px; text-align: center; background: var(--accent-soft); border-radius: 22px; padding: 32px 20px; }
.fim h2 { margin: 0 0 8px; }
.fim p { margin: 0 0 20px; color: var(--muted); }
footer { border-top: 2px solid var(--line); padding: 24px 0 40px; color: var(--muted); font-size: .85rem; }
footer a { color: var(--muted); }
[hidden] { display: none !important; }
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="conheca.html" data-utm><img src="icons/icon.svg" alt=""> Review <b>DPE</b></a>
  <a class="app" href="conheca.html" data-utm>Conheça o app</a>
</div></header>

<section class="hero"><div class="wrap">
  <span class="tag">Relatório gratuito</span>
  <h1>Quais matérias mais caem na <em>Defensoria?</em></h1>
  <p>Analisamos 18 editais de Defensor(a) Público(a), de 16 estados, publicados entre 2021 e 2026: o núcleo que aparece em todos, as matérias recorrentes e quantas questões cada uma costuma ter.</p>
</div></section>

<main><div class="wrap">
<article id="aberto">
${aberto}
</article>

<div class="caixa" id="cadastro">
  <h2>Receba o relatório completo</h2>
  <p>Pesos por matéria, editais com blocos agrupados, como montar o cronograma e os limites da análise. Grátis: só precisamos do seu e-mail.</p>
  <form id="form" novalidate>
    <label>E-mail <input type="email" id="email" autocomplete="email" required maxlength="254" placeholder="voce@exemplo.com"></label>
    <label>Nome (opcional) <input type="text" id="nome" autocomplete="given-name" maxlength="80"></label>
    <label>Para qual concurso você estuda? (opcional)
      <select id="concurso">
        <option value="">Ainda não sei</option>
        <option>DPU</option>
        <option>DPE-AC</option><option>DPE-AL</option><option>DPE-AM</option><option>DPE-AP</option><option>DPE-BA</option><option>DPE-CE</option><option>DPDF</option><option>DPE-ES</option><option>DPE-GO</option><option>DPE-MA</option><option>DPE-MG</option><option>DPE-MS</option><option>DPE-MT</option><option>DPE-PA</option><option>DPE-PB</option><option>DPE-PE</option><option>DPE-PI</option><option>DPE-PR</option><option>DPE-RJ</option><option>DPE-RN</option><option>DPE-RO</option><option>DPE-RR</option><option>DPE-RS</option><option>DPE-SC</option><option>DPE-SE</option><option>DPE-SP</option><option>DPE-TO</option>
      </select>
    </label>
    <label class="ok"><input type="checkbox" id="consente" required> <span>Quero receber o relatório e dicas de estudo do Review DPE por e-mail. Posso sair da lista quando quiser. Veja a <a href="privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a>.</span></label>
    <button class="btn ouro" id="enviar" type="submit">Liberar o relatório</button>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
  </form>
</div>

<article id="completo" hidden>
${fechado}
</article>

<div class="fim">
  <h2>Agora, não esqueça o que você estudou</h2>
  <p>O Review DPE traz de volta cada assunto antes de você esquecer, começando pelo que mais cai na Defensoria.</p>
  <a class="btn verde" href="conheca.html#preco" data-utm>Conhecer o Review DPE</a>
</div>
</div></main>

<footer><div class="wrap">
  <p>Material de apoio ao estudo. Não tem vínculo com a Defensoria Pública nem com bancas organizadoras e não garante aprovação. Confira sempre o edital oficial do seu concurso.</p>
  <p><a href="conheca.html" data-utm>Review DPE</a> · <a href="termos.html">Termos de Uso</a> · <a href="privacidade.html">Privacidade</a> · Review DPE é um produto Multiversão · CNPJ 69.592.887/0001-50</p>
</div></footer>

<script>
(() => {
  const SB_URL = "${SB_URL}", SB_KEY = "${SB_KEY}", LIBERADO = "rdpe-materias-liberado";
  const $ = id => document.getElementById(id);
  const q = new URLSearchParams(location.search);
  const corta = (s, n) => (s || "").trim().slice(0, n) || null;
  const origem = corta(q.get("ref") || q.get("cupom") || q.get("utm_source"), 80), campanha = corta(q.get("utm_campaign"), 80);
  // leva a origem da visita para a página de vendas (mesmo rastreio de ponta a ponta)
  const repassa = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref", "cupom"].filter(k => q.has(k));
  if (repassa.length) for (const a of document.querySelectorAll("a[data-utm]")) {
    const u = new URL(a.getAttribute("href"), location.href);
    for (const k of repassa) u.searchParams.set(k, q.get(k));
    a.href = u.pathname.replace(/^\\//, "") + u.search + u.hash;
  }
  const liberar = rolar => {
    $("completo").hidden = false; $("cadastro").hidden = true;
    if (rolar) $("completo").scrollIntoView({ behavior: "smooth", block: "start" });
  };
  try { if (localStorage.getItem(LIBERADO)) liberar(false); } catch (_) {}
  const aviso = (t, erro) => { $("msg").textContent = t; $("msg").classList.toggle("erro", !!erro); };
  $("form").addEventListener("submit", async ev => {
    ev.preventDefault();
    const email = $("email").value.trim().toLowerCase();
    if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email) || email.length > 254) { aviso("Digite um e-mail válido.", true); $("email").focus(); return; }
    if (!$("consente").checked) { aviso("Marque a caixa de consentimento para receber o relatório por e-mail.", true); $("consente").focus(); return; }
    $("enviar").disabled = true; aviso("Enviando…");
    try {
      const r = await fetch(SB_URL + "/rest/v1/leads", { method: "POST", cache: "no-store",
        headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ email, nome: corta($("nome").value, 80), concurso: corta($("concurso").value, 60), origem, campanha, material: "materias-dpe", consentimento: true }) });
      if (!r.ok && r.status !== 409) throw new Error(String(r.status));   // 409: e-mail já cadastrado, tudo certo
      try { localStorage.setItem(LIBERADO, "1"); } catch (_) {}
      aviso("Pronto! O relatório completo está liberado logo abaixo.");
      liberar(true);
    } catch (_) {
      aviso("Não consegui registrar agora. Verifique a conexão e tente de novo.", true);
    } finally { $("enviar").disabled = false; }
  });
})();
</script>
</body>
</html>
`;

const destino = new URL("materias-dpe.html", raiz);
if (process.argv.includes("--conferir")) {
  let atual = ""; try { atual = readFileSync(destino, "utf8"); } catch (_) {}
  if (atual !== html) { console.error("materias-dpe.html desatualizado: rode node ferramentas/divulgacao/gerar_materias.mjs"); process.exit(1); }
  console.log("ok: materias-dpe.html em dia com o relatório");
} else {
  writeFileSync(destino, html);
  console.log("ok: materias-dpe.html", (html.length / 1024).toFixed(0) + " KB");
}
