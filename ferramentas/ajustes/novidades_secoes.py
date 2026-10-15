"""Aba Novidades em duas seções: atualizações legislativas e jurisprudência (temas repetitivos e outros julgados).

    python ferramentas/ajustes/novidades_secoes.py fonte.html

Troca a tela renderNov, que misturava leis e decisões numa lista só, por duas abas internas com contagem
e "novos" próprios. Na jurisprudência, Temas repetitivos e de repercussão geral vêm à parte dos demais julgados.
Os temas do filtro são só os da seção aberta. Rodar de novo não duplica: a tela é trocada inteira.
"""
import sys
from pathlib import Path

INICIO, FIM = "function renderNov() {", "\n}\n"
CSS_ID = '<style id="nv-secoes">'
CSS = CSS_ID + """
.nv-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 4px; margin: 12px 0 4px; border-radius: 14px; background: var(--accent-soft); }
.nv-seg button { font: 600 .86rem var(--f-ui); border: 0; border-radius: 10px; padding: 9px 8px; background: none; color: var(--ink); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap; }
.nv-seg button[aria-selected="true"] { background: var(--surface); color: var(--accent); box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.nv-seg .n { font: 600 .72rem var(--f-mono); opacity: .7; }
.nv-grupo { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin: 18px 0 8px; }
.nv-grupo h3 { margin: 0; }
.chip.rep { color: var(--accent); background: var(--accent-soft); border-color: transparent; font-weight: 600; }
.nv-barra { display: flex; align-items: center; gap: 10px; margin: 6px 0 10px; font: 600 .8rem var(--f-ui); color: var(--muted); }
.nv-prog { flex: 1; height: 8px; border-radius: 999px; background: var(--line); overflow: hidden; } .nv-prog i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--accent), var(--ok)); transition: width .3s; }
.nv-tools { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; justify-content: space-between; margin: 0 0 14px; }
.nv-st { display: inline-flex; gap: 4px; padding: 4px; border-radius: 999px; background: var(--surface); border: 1px solid var(--line); }
.nv-st button { font: 600 .82rem var(--f-ui); border: 0; border-radius: 999px; padding: 7px 12px; background: none; color: var(--muted); cursor: pointer; }
.nv-st button b { font: 600 .72rem var(--f-mono); opacity: .75; margin-left: 2px; }
.nv-st button[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); }
.nv-tema { display: flex; align-items: center; gap: 8px; font: 600 .82rem var(--f-ui); color: var(--muted); flex: 1 1 220px; max-width: 360px; }
.nv-tema select { flex: 1; min-width: 0; font: .9rem var(--f-ui); color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: 999px; padding: 8px 12px; }
.nv-ok { margin-left: auto; font: 600 .76rem var(--f-ui); border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; background: var(--surface); color: var(--muted); cursor: pointer; white-space: nowrap; }
.nv-ok:hover { border-color: var(--accent); color: var(--accent); }
.nv-ok[aria-pressed="true"] { background: var(--ok-soft); border-color: transparent; color: var(--ok); }
.nov.feita { opacity: .72; } .nov.feita .nv-t { text-decoration: line-through; text-decoration-color: color-mix(in srgb, var(--ok) 60%, transparent); }
.nv-fim { width: 100%; margin-top: 14px; }
.nv-vazio { text-align: center; padding: 28px 16px; border: 1px dashed var(--line); border-radius: 18px; color: var(--muted); }
</style>
"""

JS = r'''function renderNov() {
  ensureAj(); const all = nvItens(), lidas = S.ajustes.nvLidas || [], feitas = S.ajustes.nvFeitas || [], tipoDe = n => n.tipo || "lei";
  const SEC = { lei: ["📜", "Leis", "Atualizações legislativas", "Só o que muda a rotina da Defensoria", "publicada em", "O que mudou"],
                jur: ["⚖️", "Jurisprudência", "Temas repetitivos e julgados", "Teses fixadas e decisões recentes do STF e do STJ", "divulgado em", "O que foi decidido"] };
  const repetitivo = n => /\bTema\b|repercuss|repetitiv/i.test(n.lei);
  const por = { lei: all.filter(n => tipoDe(n) === "lei"), jur: all.filter(n => tipoDe(n) !== "lei") };
  let tp = S.novTipo === "jur" || S.novTipo === "lei" ? S.novTipo : "lei";
  if (!por[tp].length && por[tp === "lei" ? "jur" : "lei"].length) tp = tp === "lei" ? "jur" : "lei";
  S.novTipo = tp;
  const base = por[tp], temas = [...new Set(base.flatMap(n => n.temas))].sort((a, b) => a.localeCompare(b, "pt"));
  if (S.novTema && !temas.includes(S.novTema)) S.novTema = "";
  const st = ["pend", "ok", "todas"].includes(S.novSt) ? S.novSt : "pend", doTema = base.filter(n => !S.novTema || n.temas.includes(S.novTema));
  const nOk = doTema.filter(n => feitas.includes(n.id)).length, nPend = doTema.length - nOk;
  const f = S.novTema || "", list = doTema.filter(n => st === "todas" || (st === "ok") === feitas.includes(n.id)).sort((a, b) => b.pub.localeCompare(a.pub));
  const naoLidas = arr => arr.filter(n => !lidas.includes(n.id)).length, s = SEC[tp];
  const ul = (arr) => `<ul class="nv-ul">${arr.map(x => `<li>${md(x)}</li>`).join("")}</ul>`;
  const card = n => `
      <article class="nov${feitas.includes(n.id) ? " feita" : ""}"><details data-id="${n.id}">
        <summary>
          <div class="nv-top"><span class="nv-lei">${esc(n.lei)}</span><span class="count">${s[4]} ${fmtISO(n.pub)}</span>${lidas.includes(n.id) ? "" : `<span class="badge new">novo</span>`}<button class="nv-ok" data-nvok="${n.id}" aria-pressed="${feitas.includes(n.id)}" title="${feitas.includes(n.id) ? "Desmarcar" : "Marcar como concluída"}">${feitas.includes(n.id) ? "✓ Concluída" : "○ Concluir"}</button></div>
          <h3 class="nv-t">${esc(n.titulo)}</h3>
          <p class="nv-r">${md(n.resumo)}</p>
          <div class="nv-tags">${tp === "jur" && repetitivo(n) ? `<span class="chip rep">${/^STF/.test(n.lei) ? "Repercussão geral" : "Recurso repetitivo"}</span>` : ""}${n.temas.map(t => `<span class="chip">${esc(t)}</span>`).join("")}${(n.papeis || []).map(p => `<span class="chip role">${PAPEIS[p][0]} ${PAPEIS[p][1]}</span>`).join("")}</div>
        </summary>
        <div class="nv-body">
          <h4>${s[5]}</h4>${ul(n.mudou)}
          <h4>Por que interessa à Defensoria</h4>${ul(n.dpe)}
          <h4>Cai em prova</h4>${ul(n.prova)}
          ${(n.jur || []).length ? `<h4>Jurisprudência e direitos humanos relacionados</h4>${ul(n.jur)}` : ""}
          <h4>Treine: certo ou errado?</h4>
          ${(n.treino || []).map(q => `<details class="qz"><summary>${md(q.q)}</summary><p class="qa ${q.a ? "ok" : "no"}"><b>${q.a ? "CERTO" : "ERRADO"}.</b> ${md(q.e.replace(/^(Certo|Errado)\.\s*/, ""))}</p></details>`).join("")}
          <button class="btn${feitas.includes(n.id) ? "" : " primary"} nv-fim" data-nvok="${n.id}">${feitas.includes(n.id) ? "Desmarcar concluída" : "✓ Concluí: não mostrar mais"}</button>
          <p class="src" style="margin-top:12px">${esc((DECK.novidades || {}).fonte || "Resumos próprios: confira sempre o texto oficial.")}</p>
        </div>
      </details></article>`;
  const grupo = (titulo, arr) => arr.length ? `<div class="nv-grupo"><h3>${titulo}</h3><span class="count">${arr.length}</span></div><div class="nv-list">${arr.map(card).join("")}</div>` : "";
  const corpo = tp === "jur" ? grupo("Temas repetitivos e repercussão geral", list.filter(repetitivo)) + grupo("Outros julgados", list.filter(n => !repetitivo(n)))
                             : `<div class="nv-list">${list.map(card).join("")}</div>`;
  const recente = base.length ? ", a mais recente de " + fmtISO(base.map(n => n.pub).sort().pop()) : "";
  $("#main").innerHTML = `
    <h2>Novidades</h2>
    ${por.jur.length && por.lei.length ? `<div class="nv-seg" role="tablist" aria-label="Seção">${["lei", "jur"].map(k => `<button role="tab" data-tp="${k}" aria-selected="${tp === k}">${SEC[k][0]} ${SEC[k][1]} <span class="n">${por[k].length}</span>${naoLidas(por[k]) ? `<span class="badge new">${naoLidas(por[k])}</span>` : ""}</button>`).join("")}</div>` : ""}
    <p class="sub"><b>${s[2]}.</b> ${s[3]}: ${plural(base.length, tp === "lei" ? "lei" : "decisão", tp === "lei" ? "leis" : "decisões")}${recente}. São resumos próprios: confira sempre o texto oficial.</p>
    <div class="nv-barra"><div class="nv-prog"><i style="width:${doTema.length ? Math.round(100 * nOk / doTema.length) : 0}%"></i></div><span>${nOk} de ${doTema.length} concluídas</span></div>
    <div class="nv-tools"><div class="nv-st" role="group" aria-label="Mostrar">${[["pend", "Pendentes", nPend], ["ok", "Concluídas", nOk], ["todas", "Todas", doTema.length]].map(([k, t, c]) => `<button data-st="${k}" aria-pressed="${st === k}">${t} <b>${c}</b></button>`).join("")}</div>
      ${temas.length > 1 ? `<label class="nv-tema"><span>Tema</span><select id="nvTema"><option value="">Todos os temas</option>${temas.map(t => `<option ${f === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>` : ""}</div>
    ${list.length ? "" : `<div class="nv-vazio">${st === "pend" && doTema.length ? "🎉 Tudo concluído aqui. Novas leis e julgados aparecem como pendentes." : "Nada por aqui."}</div>`}
    ${corpo}`;
  $("#nvTema")?.addEventListener("change", e => { S.novTema = e.target.value; renderNov(); });
  document.querySelectorAll(".nv-st [data-st]").forEach(b => b.onclick = () => { S.novSt = b.dataset.st; renderNov(); });
  document.querySelectorAll("[data-nvok]").forEach(b => b.addEventListener("click", e => {
    e.preventDefault(); e.stopPropagation(); ensureAj(); const id = b.dataset.nvok, a = S.ajustes;
    a.nvFeitas = a.nvFeitas.includes(id) ? a.nvFeitas.filter(x => x !== id) : [...a.nvFeitas, id];
    if (!a.nvLidas.includes(id)) a.nvLidas = [...a.nvLidas, id];
    queue("ajustes"); updNavBadge(); const y = scrollY; renderNov(); scrollTo(0, y);
    toast(a.nvFeitas.includes(id) ? "Concluída. Ela sai da lista de pendentes." : "Voltou para as pendentes.");
  }));
  document.querySelectorAll(".nv-seg [data-tp]").forEach(b => b.onclick = () => { S.novTipo = b.dataset.tp; S.novTema = ""; renderNov(); });
  document.querySelectorAll(".nov details[data-id]").forEach(dt => dt.addEventListener("toggle", () => {
    if (!dt.open) return; ensureAj(); const id = dt.dataset.id;
    if (!S.ajustes.nvLidas.includes(id)) { S.ajustes.nvLidas = [...S.ajustes.nvLidas, id]; queue("ajustes"); dt.querySelector(".badge.new")?.remove(); updNavBadge();
      const sb = document.querySelector('.nv-seg [aria-selected="true"] .badge.new'); if (sb) { const k = +sb.textContent - 1; if (k) sb.textContent = k; else sb.remove(); } }
  }));
}
'''

# busca: o atalho para a aba Novidades abre a seção certa
BUSCA_ANTES = ('sec("Novidades legislativas", nv.length, `<ul class="lib">${nv.slice(0, 6).map(n => `<li><details><summary><span class="q">${esc(n.lei)}: ${esc(n.titulo)}</span></summary>'
               '<div class="body"><p class="answer" style="font-size:1rem">${md(n.resumo)}</p><button class="btn small" data-gonv="1">')
BUSCA_DEPOIS = ('sec("Novidades", nv.length, `<ul class="lib">${nv.slice(0, 6).map(n => `<li><details><summary><span class="q">${esc(n.lei)}: ${esc(n.titulo)}</span></summary>'
                '<div class="body"><p class="answer" style="font-size:1rem">${md(n.resumo)}</p><button class="btn small" data-gonv="${(n.tipo || "lei") === "lei" ? "lei" : "jur"}">')
GO_ANTES = 'out.querySelectorAll("[data-gonv]").forEach(b => b.onclick = () => go("novidades"));'
GO_DEPOIS = 'out.querySelectorAll("[data-gonv]").forEach(b => b.onclick = () => { S.novTipo = b.dataset.gonv; S.novTema = ""; go("novidades"); });'

def main(html_path: Path) -> None:
    html = html_path.read_text(encoding="utf-8")
    if html.count(INICIO) != 1: sys.exit("função renderNov não encontrada; nada foi gravado.")
    i = html.index(INICIO); j = html.index(FIM, i) + len(FIM)
    html = html[:i] + JS + html[j:]
    if CSS_ID in html:
        a = html.index(CSS_ID); b = html.index("</style>\n", a) + len("</style>\n")
        html = html[:a] + CSS + html[b:]
    else:
        if html.count("</head>") != 1: sys.exit("</head> não encontrado; nada foi gravado.")
        html = html.replace("</head>", CSS + "</head>")
    for antes, depois in ((BUSCA_ANTES, BUSCA_DEPOIS), (GO_ANTES, GO_DEPOIS)):
        if depois not in html:
            if html.count(antes) != 1: sys.exit("trecho da busca não encontrado; nada foi gravado.")
            html = html.replace(antes, depois)
    html_path.write_text(html, encoding="utf-8")
    print(f"{html_path}: aba Novidades em duas seções")

if __name__ == "__main__":
    if len(sys.argv) != 2: sys.exit(__doc__)
    main(Path(sys.argv[1]))
