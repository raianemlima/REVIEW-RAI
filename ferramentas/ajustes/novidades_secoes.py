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
</style>
"""

JS = r'''function renderNov() {
  const all = nvItens(), lidas = S.ajustes.nvLidas || [], tipoDe = n => n.tipo || "lei";
  const SEC = { lei: ["📜", "Leis", "Atualizações legislativas", "Só o que muda a rotina da Defensoria", "publicada em", "O que mudou"],
                jur: ["⚖️", "Jurisprudência", "Temas repetitivos e julgados", "Teses fixadas e decisões recentes do STF e do STJ", "divulgado em", "O que foi decidido"] };
  const repetitivo = n => /\bTema\b|repercuss|repetitiv/i.test(n.lei);
  const por = { lei: all.filter(n => tipoDe(n) === "lei"), jur: all.filter(n => tipoDe(n) !== "lei") };
  let tp = S.novTipo === "jur" || S.novTipo === "lei" ? S.novTipo : "lei";
  if (!por[tp].length && por[tp === "lei" ? "jur" : "lei"].length) tp = tp === "lei" ? "jur" : "lei";
  S.novTipo = tp;
  const base = por[tp], temas = [...new Set(base.flatMap(n => n.temas))].sort((a, b) => a.localeCompare(b, "pt"));
  if (S.novTema && !temas.includes(S.novTema)) S.novTema = "";
  const f = S.novTema || "", list = base.filter(n => !f || n.temas.includes(f)).sort((a, b) => b.pub.localeCompare(a.pub));
  const naoLidas = arr => arr.filter(n => !lidas.includes(n.id)).length, s = SEC[tp];
  const ul = (arr) => `<ul class="nv-ul">${arr.map(x => `<li>${md(x)}</li>`).join("")}</ul>`;
  const card = n => `
      <article class="nov"><details data-id="${n.id}">
        <summary>
          <div class="nv-top"><span class="nv-lei">${esc(n.lei)}</span><span class="count">${s[4]} ${fmtISO(n.pub)}</span>${lidas.includes(n.id) ? "" : `<span class="badge new">novo</span>`}</div>
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
    ${temas.length > 1 ? `<div class="nv-filters" role="group" aria-label="Filtrar por tema"><button class="fchip" data-t="" aria-pressed="${!f}">Todas</button>${temas.map(t => `<button class="fchip" data-t="${esc(t)}" aria-pressed="${f === t}">${esc(t)}</button>`).join("")}</div>` : ""}
    ${list.length ? "" : `<p class="count">Nenhuma novidade neste tema.</p>`}
    ${corpo}`;
  document.querySelectorAll(".fchip[data-t]").forEach(b => b.onclick = () => { S.novTema = b.dataset.t; renderNov(); });
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
