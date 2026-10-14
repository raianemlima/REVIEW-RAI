"""Provas de concurso para resolver no app (Estudar › Treinar e testar › Provas de concurso).

    python ferramentas/conteudo/simulado_json.py dpe-pr-2024 "DPE-PR 2024" "Defensor(a) Público(a) Substituto(a)" Fundatec
    python ferramentas/ajustes/aba_provas.py index.html

Embute em PROVAS_PUBLICO todas as provas de ferramentas/conteudo/dados/simulados/<id>.json (texto público das provas
e gabaritos oficiais). Correção na hora, filtro por matéria, placar por matéria e as erradas viram cartões de revisão.
As respostas ficam em S.ajustes.provas (sincronizam com a conta). Rodar de novo não duplica nada.
"""
import json, sys
from pathlib import Path

DADOS = Path(__file__).resolve().parents[1] / "conteudo" / "dados" / "simulados"

CSS = """
/* ---- provas de concurso ---- */
.pv-card { background: var(--surface); border: 1px solid var(--line); border-left: 4px solid var(--accent); border-radius: 18px; padding: 16px; margin: 0 0 12px; }
.pv-card h3 { margin: 0 0 4px; }
.pv-meta { color: var(--muted); font-size: .88rem; margin: 0 0 10px; }
.pv-barra { height: 8px; border-radius: 999px; background: var(--line); overflow: hidden; margin: 8px 0; }
.pv-barra i { display: block; height: 100%; background: var(--accent); }
.pv-acoes { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 10px; }
.pv-acoes select { font: inherit; font-size: .9rem; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); max-width: 100%; }
.pv-top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin: 6px 0 2px; color: var(--muted); font-size: .85rem; }
.pv-enun { font-family: var(--f-read); font-size: 1.08rem; line-height: 1.55; margin: 10px 0 4px; }
.pv-enun p { margin: 0 0 8px; }
.pv-res { border-radius: 12px; padding: 10px 12px; margin-top: 12px; font-weight: 600; }
.pv-res.ok { background: var(--ok-soft); color: var(--ok); } .pv-res.no { background: var(--bad-soft); color: var(--bad); }
.pv-nav { display: flex; gap: 8px; justify-content: space-between; margin-top: 14px; }
.pv-mapa { display: grid; grid-template-columns: repeat(auto-fill, minmax(38px, 1fr)); gap: 6px; margin: 12px 0; }
.pv-mapa button { font: 600 .8rem var(--f-mono); padding: 7px 0; border-radius: 8px; border: 1px solid var(--line); background: var(--surface); color: var(--muted); cursor: pointer; }
.pv-mapa button.ok { background: var(--ok-soft); border-color: var(--ok); color: var(--ok); }
.pv-mapa button.no { background: var(--bad-soft); border-color: var(--bad); color: var(--bad); }
.pv-mapa button.at { outline: 2px solid var(--accent); }
.pv-mapa button.nu { border-style: dashed; opacity: .6; }
.pv-res.nu { background: var(--line); color: var(--muted); }
.pv-disc { margin-top: 12px; } .pv-disc summary { cursor: pointer; font-weight: 600; color: var(--accent); }
.pv-tab { width: 100%; border-collapse: collapse; font-size: .9rem; }
.pv-tab td { padding: 6px 4px; border-bottom: 1px solid var(--line); } .pv-tab td:last-child { text-align: right; white-space: nowrap; }
"""

JS = r"""
// ===================== provas de concurso: resolver a prova real, com gabarito =====================
const provasDados = () => typeof PROVAS_PUBLICO !== "undefined" ? PROVAS_PUBLICO : [];
const pvEst = id => { ensureAj(); const P = S.ajustes.provas = S.ajustes.provas || {}; return P[id] = P[id] || { r: {}, rev: [] }; };
const pvParas = t => String(t || "").split("\n").map(p => `<p>${esc(p)}</p>`).join("");
function pvLista(P) { return P.questoes.filter(q => !S.pvMat || q.materia === S.pvMat); }
function pvPlacar(P, qs) { const e = pvEst(P.id), vale = qs.filter(q => q.gabarito !== "X"), feitas = vale.filter(q => e.r[q.n]);   // anulada não entra no placar
  return { feitas: feitas.length, certas: feitas.filter(q => e.r[q.n] === q.gabarito).length, total: vale.length }; }
const pvDisc = P => P.discursiva ? `<details class="pv-disc"><summary>✍️ Questão discursiva</summary><div class="pv-enun">${pvParas(P.discursiva)}</div></details>` : "";
function pvDiscId(materia) {
  const n = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(), m = n(materia);
  const d = (DECK.disciplinas || []).find(x => m.includes(n(x.nome)) || n(x.nome).includes(m.replace(/^direitos? (do |da |de )?/, "")));
  return d ? d.id : undefined;
}
function pvRevisar(P) {
  const e = pvEst(P.id), novas = pvLista(P).filter(q => e.r[q.n] && e.r[q.n] !== q.gabarito && !e.rev.includes(q.n));
  novas.forEach(q => addMeu({ disc: pvDiscId(q.materia), tema: `${P.nome} · ${q.materia}`,
    frente: `${P.nome}, questão ${q.n}\n\n${q.enunciado}\n\n${Object.entries(q.alternativas).map(([k, v]) => k + ") " + v).join("\n")}`,
    verso: `Gabarito: ${q.gabarito}) ${q.alternativas[q.gabarito] || ""}`, porque: `Você marcou ${e.r[q.n]}. Gabarito ${P.gabarito} da banca ${P.banca}.` }));
  e.rev.push(...novas.map(q => q.n)); queue("ajustes");
  toast(novas.length ? `${plural(novas.length, "questão errada foi", "questões erradas foram")} para a revisão.` : "Nenhuma errada nova para mandar.");
  renderProva();
}
function renderProva() {
  const L = provasDados(), P = L.find(p => p.id === S.pvId);
  if (!P) {
    $("#main").innerHTML = `<h2>Provas de concurso</h2><p class="sub">Resolva provas reais da Defensoria e veja na hora se acertou. As erradas viram cartões de revisão.</p>
      ${L.map(p => { const pl = pvPlacar(p, p.questoes), mats = [...new Set(p.questoes.map(q => q.materia))]; return `
      <article class="pv-card"><h3>${esc(p.nome)}</h3><p class="pv-meta">${esc(p.cargo)} · ${esc(p.banca)} · ${p.questoes.length} questões · gabarito ${esc(p.gabarito)}</p>
        ${pl.feitas ? `<div class="pv-barra"><i style="width:${Math.round(100 * pl.feitas / pl.total)}%"></i></div><p class="pv-meta">${pl.feitas} respondidas · ${pl.certas} certas (${Math.round(100 * pl.certas / pl.feitas)}%)</p>` : ""}
        <div class="pv-acoes"><select data-pvmat="${esc(p.id)}" aria-label="Matéria"><option value="">Prova inteira</option>${mats.map(m => `<option>${esc(m)}</option>`).join("")}</select>
          <button class="btn" data-pvabrir="${esc(p.id)}">${pl.feitas ? "Continuar" : "Começar"}</button>${pl.feitas ? `<button class="btn small ghost" data-pvzerar="${esc(p.id)}">Recomeçar</button>` : ""}</div>
        ${pvDisc(p)}
      </article>`; }).join("")}`;
    document.querySelectorAll("[data-pvabrir]").forEach(b => b.onclick = () => {
      const p = L.find(x => x.id === b.dataset.pvabrir); S.pvId = p.id; S.pvMat = document.querySelector(`[data-pvmat="${p.id}"]`).value;
      const qs = pvLista(p), e = pvEst(p.id), prox = qs.find(q => !e.r[q.n] && q.gabarito !== "X"); S.pvI = prox ? qs.indexOf(prox) : qs.length; renderProva(); scrollTo(0, 0); });
    document.querySelectorAll("[data-pvzerar]").forEach(b => b.onclick = () => { if (!confirm("Apagar as respostas desta prova e começar do zero?")) return;
      S.ajustes.provas[b.dataset.pvzerar] = { r: {}, rev: [] }; queue("ajustes"); renderProva(); });
    if (typeof esVoltar === "function") esVoltar(); return;
  }
  const qs = pvLista(P), e = pvEst(P.id), i = Math.max(0, Math.min(S.pvI || 0, qs.length)), pl = pvPlacar(P, qs);
  const mapa = `<div class="pv-mapa">${qs.map((q, k) => `<button data-pvir="${k}" class="${q.gabarito === "X" ? "nu" : e.r[q.n] ? (e.r[q.n] === q.gabarito ? "ok" : "no") : ""}${k === i ? " at" : ""}" aria-label="Questão ${q.n}">${q.n}</button>`).join("")}</div>`;
  const voltar = `<button class="btn small ghost" id="pvSair">← Provas</button>`;
  if (i >= qs.length) {
    const porMat = [...new Set(qs.map(q => q.materia))].map(m => [m, pvPlacar(P, qs.filter(q => q.materia === m))]);
    const erradas = qs.filter(q => e.r[q.n] && e.r[q.n] !== q.gabarito), novas = erradas.filter(q => !e.rev.includes(q.n)).length;
    $("#main").innerHTML = `${voltar}<h2>Resultado · ${esc(P.nome)}</h2><p class="sub">${esc(S.pvMat || "Prova inteira")}</p>
      <article class="pv-card"><h3>${pl.certas} de ${pl.feitas} certas${pl.feitas ? ` (${Math.round(100 * pl.certas / pl.feitas)}%)` : ""}</h3>
        <p class="pv-meta">${pl.feitas < pl.total ? `${pl.total - pl.feitas} sem resposta. ` : ""}${pl.total < qs.length ? `${plural(qs.length - pl.total, "questão anulada", "questões anuladas")} fora do placar. ` : ""}Gabarito ${esc(P.gabarito)} da banca ${esc(P.banca)}.</p>
        <div class="pv-acoes">${erradas.length ? `<button class="btn" id="pvRev" ${novas ? "" : "disabled"}>${novas ? `Mandar ${plural(novas, "errada", "erradas")} para a revisão` : "Erradas já estão na revisão ✓"}</button>` : ""}</div></article>
      ${S.pvMat ? "" : pvDisc(P)}${S.pvMat ? "" : `<table class="pv-tab">${porMat.map(([m, x]) => `<tr><td>${esc(m)}</td><td>${x.certas}/${x.feitas || 0}</td></tr>`).join("")}</table>`}
      <h3 style="margin-top:18px">Rever questões</h3>${mapa}`;
  } else {
    const q = qs[i], nula = q.gabarito === "X", r = e.r[q.n], certa = r === q.gabarito;
    $("#main").innerHTML = `${voltar}
      <div class="pv-top"><span>${esc(P.nome)} · ${esc(q.materia)}</span><span>${i + 1}/${qs.length}</span></div>
      <div class="pv-barra"><i style="width:${Math.round(100 * pl.feitas / (pl.total || 1))}%"></i></div>
      <h3>Questão ${q.n}</h3><div class="pv-enun">${pvParas(q.enunciado)}</div>
      <div class="opts">${Object.entries(q.alternativas).map(([k, v]) => `<button class="opt${r ? (k === q.gabarito ? " right" : k === r ? " wrong" : "") : ""}" data-pvalt="${k}" ${r || nula ? "disabled" : ""}><span class="k">${k}</span><span>${esc(v)}</span></button>`).join("")}</div>
      ${nula ? `<div class="pv-res nu">Questão anulada pela banca: não entra no placar.</div>` : ""}
      ${r ? `<div class="pv-res ${certa ? "ok" : "no"}">${certa ? "✓ Certa!" : `✗ Você marcou ${r}. Gabarito: ${q.gabarito}.`}</div>` : ""}
      <div class="pv-nav"><button class="btn small ghost" id="pvAnt" ${i ? "" : "disabled"}>← Anterior</button>
        ${r ? `<button class="btn small ghost" id="pvRefazer">Refazer</button>` : ""}<button class="btn small${r ? "" : " ghost"}" id="pvProx">${i + 1 < qs.length ? (r ? "Próxima →" : "Pular →") : "Ver resultado"}</button></div>
      <details style="margin-top:16px"><summary class="pv-meta">Mapa da prova · ${pl.feitas}/${pl.total} respondidas · ${pl.certas} certas</summary>${mapa}</details>`;
    document.querySelectorAll("[data-pvalt]").forEach(b => b.onclick = () => { e.r[q.n] = b.dataset.pvalt; queue("ajustes"); renderProva(); });
    $("#pvAnt").onclick = () => { S.pvI = i - 1; renderProva(); };
    $("#pvProx").onclick = () => { S.pvI = i + 1; renderProva(); scrollTo(0, 0); };
    const rf = $("#pvRefazer"); if (rf) rf.onclick = () => { delete e.r[q.n]; queue("ajustes"); renderProva(); };
  }
  document.querySelectorAll("[data-pvir]").forEach(b => b.onclick = () => { S.pvI = +b.dataset.pvir; renderProva(); scrollTo(0, 0); });
  $("#pvSair").onclick = () => { S.pvId = ""; renderProva(); };
  const rv = $("#pvRev"); if (rv) rv.onclick = () => pvRevisar(P);
  if (typeof esVoltar === "function") esVoltar();
}
"""

TROCAS = [  # (antes, depois, marca): pontos do app onde a tela entra
    ("teses: renderTeses,", "teses: renderTeses, prova: renderProva,", "prova: renderProva"),
    ('["defensoria", "teses", "doutrina", "jogo"', '["defensoria", "teses", "doutrina", "prova", "jogo"', '"doutrina", "prova", "jogo"'),
    ('!["defensoria", "teses", "doutrina"].includes(S.tab)', '!["defensoria", "teses", "doutrina", "prova"].includes(S.tab)', '"doutrina", "prova"].includes(S.tab) ||'),
    ('modo("provas"), modo("simulado"),', 'modo("provas"), modo("simulado"),\n    provasDados().length ? tile({ tab: "prova", i: "📝", t: "Provas de concurso", d: "Resolva a prova real, com gabarito", n: plural(provasDados().length, "prova", "provas") }) : "",', 'tab: "prova"'),
]

def aplicar(caminho: Path):
    html = caminho.read_text(encoding="utf-8"); n = 0
    c0 = html.find("\n/* ---- provas de concurso ---- */")
    if c0 >= 0:
        c1 = min(k for k in (html.find("\n/* ---- ", c0 + 1), html.index("</style>", c0)) if k >= 0)
        if html[c0:c1] != CSS.rstrip("\n") + "\n": html = html[:c0] + CSS + html[c1:]; n += 1
    else:
        k = html.index("</style>", html.index(".tabs {")); html = html[:k] + CSS + html[k:]; n += 1
    for antes, depois, marca in TROCAS:
        if marca in html: continue
        if html.count(antes) != 1: sys.exit(f"trecho não encontrado (ou repetido), nada foi gravado: {antes[:70]!r}")
        html = html.replace(antes, depois); n += 1
    novo = JS.lstrip("\n"); j0 = html.find("// ===================== provas de concurso")
    if j0 >= 0:
        j1 = html.index("\n}\n", html.index("function renderProva()", j0)) + 3
        if html[j0:j1] != novo: html = html[:j0] + novo + html[j1:]; n += 1
    else:
        i = html.index("function renderNov() {"); html = html[:i] + novo + html[i:]; n += 1
    provas = [json.loads(p.read_text(encoding="utf-8")) for p in sorted(DADOS.glob("*.json")) if not p.stem.endswith("-correcoes")]
    bloco = "const PROVAS_PUBLICO = " + json.dumps(provas, ensure_ascii=False).replace("</", "<\\/") + ";\n"
    a = html.find("const PROVAS_PUBLICO = ")
    if a >= 0: html = html[:a] + bloco + html[html.index(";\n", a) + 2:]
    else: i = html.index("// ===================== provas de concurso"); html = html[:i] + bloco + html[i:]
    caminho.write_text(html, encoding="utf-8")
    print(f"{caminho}: {n} alterações de código; {len(provas)} prova(s) embutida(s): {', '.join(p['nome'] for p in provas)}")

if __name__ == "__main__":
    if len(sys.argv) != 2: sys.exit(__doc__)
    aplicar(Path(sys.argv[1]))
