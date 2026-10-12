// Tela de senha: decifra o baralho (PBKDF2 + AES-GCM) e só então inicia o app.
(() => {
  const KEY = "revisao-dpe-chave";
  const $ = s => document.querySelector(s);
  const enc = JSON.parse($("#deck-enc").textContent);
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u)));

  async function tryKey(key) {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(enc.iv) }, key, unb64(enc.ct));
    if (!enc.z) return new TextDecoder().decode(pt);
    if (typeof DecompressionStream === "undefined") throw new Error("sem-gzip");
    return new Response(new Blob([pt]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
  }
  function start(deckJson) {
    $("#main").innerHTML = "";
    const s = document.createElement("script");
    s.textContent = "const DECK = " + deckJson + ";\n" + $("#app-src").textContent;
    document.body.appendChild(s);
  }
  async function deriveFromPassword(pw) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: unb64(enc.s), iterations: enc.it, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
  }
  function form(msg) {
    $("#main").innerHTML = `<form id="gate" style="max-width:360px;margin:64px auto 0;display:grid;gap:12px">
      <h1 style="font:600 22px var(--f-ui);margin:0">Revisão Espaçada DPE</h1>
      <p style="margin:0;color:var(--muted)">Acesso restrito. Digite a senha para abrir.</p>
      <input id="gpw" type="password" autocomplete="current-password" placeholder="Senha" required style="padding:12px;font:16px var(--f-ui);border:1px solid var(--line);border-radius:var(--r);background:var(--surface);color:var(--ink)">
      <label style="display:flex;gap:8px;align-items:center;color:var(--muted)"><input id="gmem" type="checkbox" checked> Lembrar neste aparelho</label>
      <button id="gbtn" style="padding:12px;font:600 16px var(--f-ui);border:0;border-radius:var(--r);background:var(--accent);color:var(--accent-ink)">Entrar</button>
      <p id="gmsg" role="alert" style="margin:0;color:var(--bad)">${msg || ""}</p></form>`;
    $("#gate").onsubmit = async e => {
      e.preventDefault();
      $("#gbtn").disabled = true; $("#gbtn").textContent = "Verificando…";
      try {
        const key = await deriveFromPassword($("#gpw").value);
        const deck = await tryKey(key);
        try { if ($("#gmem").checked) localStorage.setItem(KEY, b64(await crypto.subtle.exportKey("raw", key))); } catch (_) {}
        start(deck);
      } catch (err) { form(err && err.message === "sem-gzip" ? "Este navegador é antigo demais para abrir o app. Atualize o navegador e tente de novo." : "Senha incorreta."); }
    };
    $("#gpw").focus();
  }
  (async () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const key = await crypto.subtle.importKey("raw", unb64(raw), "AES-GCM", false, ["decrypt"]);
        return start(await tryKey(key));
      }
    } catch (_) { try { localStorage.removeItem(KEY); } catch (__) {} }
    form();
  })();
})();
