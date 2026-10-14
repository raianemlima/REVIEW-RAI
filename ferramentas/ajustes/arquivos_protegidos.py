"""Arquivos protegidos (PDFs cifrados) na subaba Defensoria › Provas.

    python ferramentas/ajustes/arquivos_protegidos.py fonte.html                       # só o código
    python ferramentas/ajustes/arquivos_protegidos.py fonte.html chave-arquivos.json   # código + chaves (DECK.arquivos)

O PDF vai para o site já cifrado (arquivos/<id>.bin, feito pelo cifrar_arquivo.mjs). A chave fica em chave-arquivos.json,
que NÃO vai para o GitHub: o script a coloca dentro do baralho, que só abre para quem tem assinatura.
Sem DECK.arquivos nada aparece. Rodar de novo não duplica nada.
Entradas com "tipo": "doutrina" são pacotes de conceitos (JSON cifrado) que o app junta à aba Doutrina ao abrir.
"""
import json, re, sys
from pathlib import Path

JS = r"""
// ===================== arquivos protegidos: PDFs cifrados que só abrem com o baralho =====================
const arqLista = () => (DECK.arquivos || []).filter(a => !a.tipo || a.tipo === "pdf");
// pacotes de doutrina cifrados (tipo "doutrina"): entram em DECK.doutrina quando o app abre; offline depois da 1ª vez
async function arqPacotes() {
  const un = s => Uint8Array.from(atob(s), c => c.charCodeAt(0)); let novos = 0;
  for (const a of (DECK.arquivos || []).filter(x => x.tipo === "doutrina")) {
    try {
      const r = await fetch(a.arquivo); if (!r.ok) continue;
      const key = await crypto.subtle.importKey("raw", un(a.k), "AES-GCM", false, ["decrypt"]);
      const P = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: un(a.iv) }, key, await r.arrayBuffer())));
      const D = DECK.doutrina = DECK.doutrina || { obras: [], conceitos: [] }, ob = new Set(D.obras.map(o => o.id)), co = new Set(D.conceitos.map(c => c.id));
      (P.obras || []).forEach(o => { if (!ob.has(o.id)) D.obras.push(o); });
      (P.conceitos || []).forEach(c => { if (!co.has(c.id)) { D.conceitos.push(c); novos++; } });
    } catch (_) {}
  }
  if (!novos) return;
  const t = document.getElementById("tab-doutrina"); if (t) t.hidden = false;
  if (["doutrina", "sessao"].includes(S.tab)) render();
}
setTimeout(arqPacotes, 0);
const arqUrls = {};
async function arqAbrir(a) {
  if (arqUrls[a.id]) return arqUrls[a.id];
  const r = await fetch(a.arquivo); if (!r.ok) throw new Error("rede");
  const un = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", un(a.k), "AES-GCM", false, ["decrypt"]);
  const pdf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: un(a.iv) }, key, await r.arrayBuffer());
  return (arqUrls[a.id] = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" })));
}
function arqCards() {
  return arqLista().map(a => `
    <article class="dpe-card dpe-arq">
      <div class="dpe-top"><span class="dpe-num">📘 ${esc(a.titulo)}</span><span class="chip">PDF · ${(a.bytes / 1e6).toFixed(1).replace(".", ",")} MB</span></div>
      <p class="dpe-cargo" style="font-weight:400">${esc(a.descricao || "")}</p>
      <div class="dpe-links"><button class="btn small" data-arq="${esc(a.id)}" data-modo="abrir">Abrir</button><button class="btn small" data-arq="${esc(a.id)}" data-modo="baixar">Baixar</button></div>
      <p class="dpe-nota" data-arq-msg="${esc(a.id)}" style="margin:8px 0 0"></p>
    </article>`).join("");
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-arq]"); if (!b) return;
  const a = arqLista().find(x => x.id === b.dataset.arq); if (!a) return;
  const msg = document.querySelector(`[data-arq-msg="${a.id}"]`), txt = b.textContent;
  b.disabled = true; b.textContent = "Abrindo…"; if (msg) msg.textContent = "";
  try {
    const url = await arqAbrir(a), l = document.createElement("a");
    l.href = url; if (b.dataset.modo === "baixar") l.download = a.nome || a.id + ".pdf"; else { l.target = "_blank"; l.rel = "noopener"; }
    document.body.appendChild(l); l.click(); l.remove();
    if (msg) msg.textContent = b.dataset.modo === "baixar" ? "Download iniciado." : "Se não abriu, toque em Baixar.";
  } catch (_) { if (msg) msg.textContent = "Não consegui abrir agora. Na primeira vez é preciso internet; depois ele fica guardado no aparelho."; }
  b.disabled = false; b.textContent = txt;
});
"""
FIM = 'document.addEventListener("click", async e => {\n  const b = e.target.closest("[data-arq]")'
DECK_RE = re.compile(r"^const DECK = (\{.*\});$", re.M)

def aplicar(caminho: Path, chaves: Path | None):
    html = caminho.read_text(encoding="utf-8"); n = 0
    if "function renderDef()" not in html: sys.exit("rode antes o aba_defensoria.py.")
    novo = JS.lstrip("\n")
    j0 = html.find("// ===================== arquivos protegidos")
    if j0 >= 0:
        j1 = html.index("\n});\n", html.index(FIM, j0)) + 5
        if html[j0:j1] != novo: html = html[:j0] + novo + html[j1:]; n += 1
    else:
        i = html.index("// ===================== aba Defensoria"); html = html[:i] + novo + html[i:]; n += 1
    if chaves:
        m = DECK_RE.search(html)
        if not m: sys.exit("const DECK não encontrado: as chaves só podem ir para o fonte.html (no index.html o baralho é cifrado).")
        deck = json.loads(m.group(1)); deck["arquivos"] = json.loads(chaves.read_text(encoding="utf-8"))
        html = html[:m.start()] + "const DECK = " + json.dumps(deck, ensure_ascii=False) + ";" + html[m.end():]
        print(f"chaves: {len(deck['arquivos'])} arquivo(s) em DECK.arquivos")
    caminho.write_text(html, encoding="utf-8")
    print(f"{caminho}: {n} alterações de código" + (" (já estava aplicado)" if not n else ""))

if __name__ == "__main__":
    if len(sys.argv) not in (2, 3): sys.exit(__doc__)
    aplicar(Path(sys.argv[1]), Path(sys.argv[2]) if len(sys.argv) == 3 else None)
