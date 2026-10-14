"""Aba "Defensoria" (verde, com a cara da DPE): súmulas e temas que mais interessam à Defensoria.

    python ferramentas/ajustes/aba_defensoria.py fonte.html                 # só o código da aba
    python ferramentas/ajustes/aba_defensoria.py fonte.html defensoria.json # código + conteúdo (DECK.dpe)

O conteúdo fica dentro do baralho cifrado (DECK.dpe), por isso a aba só aparece depois do build com a senha.
Sem DECK.dpe a aba fica escondida. Rodar de novo não duplica nada.
"""
import json, re, sys
from pathlib import Path

NAV_BTN = ('\n      <button role="tab" data-tab="defensoria" aria-selected="false" id="tab-defensoria" hidden>'
           '<svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" '
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/>'
           '<path d="M8.5 12l2.5 2.5 4.5-5"/></svg><span>Defensoria</span></button>')

CSS = """
/* ---- aba Defensoria ---- */
.dpe-hero { position: relative; overflow: hidden; border-radius: 22px; padding: 22px 20px 20px; margin: 16px 0 14px; color: #f1fbf6;
  background: radial-gradient(120% 140% at 100% 0%, #2fa37a 0%, transparent 55%), linear-gradient(135deg, #0f4a3a 0%, #155e4a 55%, #1b7a5c 100%); }
.dpe-hero::after { content: ""; position: absolute; right: -40px; bottom: -60px; width: 200px; height: 200px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,.14), transparent 70%); pointer-events: none; }
.dpe-kicker { font: 600 .7rem var(--f-ui); letter-spacing: .14em; text-transform: uppercase; opacity: .8; margin: 0; }
.dpe-hero h2 { color: #fff; margin: 6px 0 6px; font-size: 1.7rem; }
.dpe-hero p { margin: 0; opacity: .9; max-width: 34em; }
.dpe-stats { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
.dpe-stat { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18); border-radius: 14px; padding: 8px 12px; min-width: 84px; }
.dpe-stat b { display: block; font: 600 1.25rem var(--f-ui); color: #fff; }
.dpe-stat span { font-size: .75rem; opacity: .85; }
.dpe-sec { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin: 22px 0 8px; }
.dpe-sec h3 { margin: 0; }
.dpe-filtros { display: flex; gap: 6px; flex-wrap: wrap; margin: 0 0 10px; }
.dpe-card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 16px; margin: 0 0 12px;
  box-shadow: 0 1px 0 rgba(0,0,0,.02), 0 8px 24px -18px rgba(21,94,74,.45); border-left: 4px solid var(--accent); }
.dpe-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.dpe-num { font: 600 .82rem var(--f-mono); padding: 4px 10px; border-radius: 999px; background: var(--accent); color: var(--accent-ink); }
.dpe-data { color: var(--muted); font-size: .8rem; margin-left: auto; }
.dpe-enun { font-family: var(--f-read); font-size: 1.12rem; line-height: 1.5; margin: 4px 0 12px; }
.dpe-por { background: var(--accent-soft); border-radius: 12px; padding: 10px 12px; font-size: .92rem; }
.dpe-por b { color: var(--accent); }
.dpe-pe { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 10px; font-size: .8rem; color: var(--muted); }
.dpe-pe a { color: var(--accent); font-weight: 600; text-decoration: none; }
.dpe-nota { color: var(--muted); font-size: .8rem; margin: 18px 0 8px; }
"""

JS = r"""
// ===================== aba Defensoria: súmulas e temas da DPE (conteúdo em DECK.dpe) =====================
function renderDef() {
  const D = DECK.dpe || {}, sum = D.sumulas || [], E = D.estatisticas || {}, f = S.defRamo || "";
  const ramos = [...new Set(sum.map(x => x.ramo))].sort((a, b) => a.localeCompare(b, "pt"));
  const lista = sum.filter(x => !f || x.ramo === f);
  const nivel = r => /^essencial/i.test(r) ? "Essencial" : /^alta/i.test(r) ? "Alta" : "";
  $("#main").innerHTML = `
    <section class="dpe-hero">
      <p class="dpe-kicker">Defensoria em foco</p>
      <h2>O que mais cai e mais importa para a DPE</h2>
      <p>Súmulas com maior relevância para concursos e para a atuação da Defensoria Pública.${D.atualizado ? " Atualizado em " + fmtISO(D.atualizado) + "." : ""}</p>
      <div class="dpe-stats">
        ${E.total_sumulas_tradicionais ? `<div class="dpe-stat"><b>${E.total_sumulas_tradicionais}</b><span>súmulas do STF</span></div>` : ""}
        ${E.total_sumulas_vinculantes ? `<div class="dpe-stat"><b>${E.total_sumulas_vinculantes}</b><span>vinculantes</span></div>` : ""}
        <div class="dpe-stat"><b>${sum.length}</b><span>em destaque</span></div>
      </div>
    </section>
    <div class="dpe-sec"><h3>Súmulas em destaque</h3><span class="count">${plural(lista.length, "súmula", "súmulas")}</span></div>
    <div class="dpe-filtros" role="group" aria-label="Filtrar por ramo"><button class="fchip" data-r="" aria-pressed="${!f}">Todas</button>${ramos.map(r => `<button class="fchip" data-r="${esc(r)}" aria-pressed="${f === r}">${esc(r)}</button>`).join("")}</div>
    ${lista.map(x => `
      <article class="dpe-card">
        <div class="dpe-top"><span class="dpe-num">${esc(x.tipo)}</span><span class="chip">${esc(x.ramo)}</span>${x.aprovacao ? `<span class="dpe-data">aprovada em ${esc(x.aprovacao)}</span>` : ""}</div>
        <p class="dpe-enun">${md(x.enunciado)}</p>
        ${x.relevancia_dpe ? `<div class="dpe-por"><b>Relevância para a DPE${nivel(x.relevancia_dpe) ? " · " + nivel(x.relevancia_dpe) : ""}:</b> ${esc(x.relevancia_dpe.replace(/^(Essencial|Alta|Média|Media)\s*/i, "").replace(/^\((.*)\)$/, "$1"))}</div>` : ""}
      </article>`).join("")}
    <p class="dpe-nota">${E.fonte ? "Fonte: " + esc(E.fonte) + ". " : ""}Confira sempre a redação oficial antes de citar em peça ou prova.</p>`;
  document.querySelectorAll(".fchip[data-r]").forEach(b => b.onclick = () => { S.defRamo = b.dataset.r; renderDef(); });
}
(() => { const t = document.getElementById("tab-defensoria"); if (t) t.hidden = !(DECK.dpe && (DECK.dpe.sumulas || []).length); })();
"""

DECK_RE = re.compile(r"^const DECK = (\{.*\});$", re.M)

def trocar(html, antes, depois, marca):
    if marca in html: return html, 0
    if html.count(antes) != 1: sys.exit(f"trecho não encontrado (ou repetido), nada foi gravado: {antes[:80]!r}")
    return html.replace(antes, depois), 1

def aplicar(caminho: Path, dados: Path | None):
    html = caminho.read_text(encoding="utf-8"); n = 0
    i = html.index('id="tab-novidades"'); j = html.index("</button>", i) + len("</button>")
    if 'id="tab-defensoria"' not in html: html = html[:j] + NAV_BTN + html[j:]; n += 1
    k = html.index("</style>", html.index(".tabs {"))
    if "/* ---- aba Defensoria ---- */" not in html: html = html[:k] + CSS + html[k:]; n += 1
    html, x = trocar(html, "novidades: renderNov,", "novidades: renderNov, defensoria: renderDef,", "defensoria: renderDef"); n += x
    html, x = trocar(html, "function renderNov() {", JS.lstrip("\n") + "function renderNov() {", "function renderDef()"); n += x
    if dados:
        m = DECK_RE.search(html)
        if not m: sys.exit("const DECK não encontrado: o conteúdo só pode ir para o fonte.html (no index.html o baralho é cifrado).")
        deck = json.loads(m.group(1)); deck["dpe"] = json.loads(dados.read_text(encoding="utf-8"))
        html = html[:m.start()] + "const DECK = " + json.dumps(deck, ensure_ascii=False) + ";" + html[m.end():]
        print(f"conteúdo: {len(deck['dpe'].get('sumulas', []))} súmulas em DECK.dpe")
    caminho.write_text(html, encoding="utf-8")
    print(f"{caminho}: {n} alterações de código" + (" (já estava aplicado)" if not n else ""))

if __name__ == "__main__":
    if len(sys.argv) not in (2, 3): sys.exit(__doc__)
    aplicar(Path(sys.argv[1]), Path(sys.argv[2]) if len(sys.argv) == 3 else None)
