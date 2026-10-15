// Tela de entrada: conta (e-mail e senha). Decifra o baralho (PBKDF2 + AES-GCM) e só então inicia o app.
// A senha do baralho vem do Supabase (função chave_do_app), entregue só a e-mails liberados, confirmados e com assinatura válida.
// A chave fica guardada no aparelho para abrir offline, mas só por PRAZO: depois disso o app exige confirmar a assinatura online.
// tema escolhido no app (diurno/noturno) já na tela de entrada
try { const t = localStorage.getItem("revisao-dpe-tema"); if (t === "claro" || t === "escuro") document.documentElement.dataset.theme = t === "claro" ? "light" : "dark"; } catch (e) {}
(() => {
  const KEY = "revisao-dpe-chave", CONTA = "revisao-dpe-conta", VERIF = "revisao-dpe-verif", PRAZO = 7 * 86400000;
  const SB_URL = "https://hlenhmgnqqnkjqmntnpz.supabase.co", SB_KEY = "sb_publishable_UbPHvOFSbd-dgyDx6SI7mg_UBx4_o9l";   // chave pública: a proteção é a RLS
  const $ = s => document.querySelector(s);
  const enc = JSON.parse($("#deck-enc").textContent);
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u)));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---- baralho ----
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
  async function guardarChave(key) { try { localStorage.setItem(KEY, b64(await crypto.subtle.exportKey("raw", key))); localStorage.setItem(VERIF, String(Date.now())); } catch (_) {} }
  const esquecerChave = () => { try { localStorage.removeItem(KEY); localStorage.removeItem(VERIF); } catch (_) {} };
  const verificadoEm = () => { try { return +localStorage.getItem(VERIF) || 0; } catch (_) { return 0; } };
  const msgDecifrar = err => err && err.message === "sem-gzip" ? "Este navegador é antigo demais para abrir o app. Atualize o navegador e tente de novo." : null;

  // ---- conta (mesmo formato que o app usa para sincronizar) ----
  const lerConta = () => { try { return JSON.parse(localStorage.getItem(CONTA) || "null"); } catch (_) { return null; } };
  const gravarConta = c => { try { c ? localStorage.setItem(CONTA, JSON.stringify(c)) : localStorage.removeItem(CONTA); } catch (_) {} };
  const sessao = (j, ult) => ({ email: j.user && j.user.email, uid: j.user && j.user.id, at: j.access_token, rt: j.refresh_token, exp: j.expires_at ? j.expires_at * 1000 : Date.now() + (j.expires_in || 3600) * 1000, ult: ult || 0 });
  class Erro extends Error { constructor(m, st, srv) { super(m); this.st = st; this.srv = srv || ""; } }
  async function sb(path, body, tok, method) {
    let r;
    try { r = await fetch(SB_URL + path, { method: method || (body ? "POST" : "GET"), cache: "no-store", headers: { apikey: SB_KEY, "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }); }
    catch (_) { throw Object.assign(new Erro("Sem conexão com a internet. Conecte-se para entrar.", 0), { rede: true }); }
    let j = null; try { j = await r.json(); } catch (_) {}
    if (!r.ok) {
      const m = (j && (j.msg || j.message || j.error_description || j.error)) || "";
      const envio = /sending|smtp|mail.*(send|deliver)|not authorized/i.test(m);   // falha do serviço de e-mail do Supabase
      throw new Erro(envio ? "Não consegui enviar o e-mail com o código agora. Tente de novo em alguns minutos; se continuar, fale com o suporte." : r.status === 429 ? (/email/i.test(m) ? "Limite de envio de e-mails atingido. Espere alguns minutos e toque em Enviar outro código." : "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.") : r.status >= 500 ? "O servidor não respondeu. Tente de novo em instantes." : m, r.status, m);
    }
    return j;
  }
  const volta = () => encodeURIComponent(location.origin + location.pathname);
  const normEmail = e => { e = String(e || "").trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Erro("Digite um e-mail válido.", 0); return e; };
  function checarSenha(a, b) {
    if (String(a || "").length < 8) throw new Erro("A senha precisa ter pelo menos 8 caracteres.", 0);
    if (a !== b) throw new Erro("As duas senhas não são iguais.", 0);
  }
  const erroSenha = m => /same|different from the old/i.test(m) ? "A nova senha precisa ser diferente da atual." : /weak|short|characters|pwned|leaked/i.test(m) ? "Senha fraca: use pelo menos 8 caracteres, misturando letras e números." : "";
  async function verificar(email, codigo, tipos) {
    codigo = String(codigo || "").replace(/\D/g, "");
    if (codigo.length < 6) throw new Erro("Digite o código que chegou no seu e-mail.", 0);
    let ult;
    for (const type of tipos) {
      try { return await sb("/auth/v1/verify", { type, email, token: codigo }); }
      catch (e) { ult = e; if (e.st === 429 || e.st === 0 || e.st >= 500) break; }
    }
    if (ult.st >= 400 && ult.st < 500 && ult.st !== 429) throw new Erro("Código inválido ou expirado. Confira ou peça um novo.", ult.st);
    throw ult;
  }
  async function token() {
    const c = lerConta(); if (!c || !c.at) return null;
    if (Date.now() < (c.exp || 0) - 60000) return c;
    try { const n = sessao(await sb("/auth/v1/token?grant_type=refresh_token", { refresh_token: c.rt }), c.ult); gravarConta(n); return n; }
    catch (e) { if (e.st >= 400 && e.st < 500) { gravarConta({ email: c.email, expirada: true }); return null; } throw e; }
  }
  // abre o app pela conta; devolve false se não há sessão válida
  async function abrirComConta() {
    const c = await token(); if (!c) return false;
    const pw = await sb("/rest/v1/rpc/chave_do_app", {}, c.at);
    if (!pw) { esquecerChave(); st.email = c.email; tela("aguardando"); return true; }
    let deck, key;
    try { key = await deriveFromPassword(pw); deck = await tryKey(key); }
    catch (err) { throw new Erro(msgDecifrar(err) || "Sua conta está liberada, mas a chave do app no servidor não confere com esta versão. Avise o suporte.", 0); }
    await guardarChave(key); start(deck); return true;
  }
  // com o app já aberto pela chave guardada: confirma a assinatura em segundo plano. Sem internet ou sessão, não faz nada (o PRAZO cuida disso).
  async function revalidar() {
    try {
      const c = await token(); if (!c) return;
      const pw = await sb("/rest/v1/rpc/chave_do_app", {}, c.at);
      if (pw) { try { localStorage.setItem(VERIF, String(Date.now())); } catch (_) {} }
      else esquecerChave();   // assinatura encerrada: na próxima abertura, o app volta para a tela de entrada
    } catch (_) {}
  }
  const entrou = async j => { gravarConta(sessao(j)); st.msg = ""; if (!(await abrirComConta())) tela("entrar", "Não consegui abrir a sessão. Tente de novo."); };

  // ---- telas ----
  const st = { tela: "entrar", email: "", msg: "", ok: false };
  const inp = "padding:12px;font:16px var(--f-ui);border:1px solid var(--line);border-radius:var(--r);background:var(--surface);color:var(--ink);width:100%;box-sizing:border-box";
  const btn = "padding:12px;font:600 16px var(--f-ui);border:0;border-radius:var(--r);background:var(--accent);color:var(--accent-ink);cursor:pointer";
  const btn2 = "padding:10px 12px;font:500 15px var(--f-ui);border:1px solid var(--line);border-radius:var(--r);background:var(--surface);color:var(--ink);cursor:pointer";
  const lnk = "padding:6px 0;font:500 15px var(--f-ui);border:0;background:none;color:var(--accent);text-decoration:underline;cursor:pointer;text-align:left";
  const campoEmail = () => `<input id="gEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" placeholder="E-mail" value="${esc(st.email)}" required style="${inp}">`;
  const campoSenha = (id, ph, auto) => `<div style="display:flex;gap:6px"><input id="${id}" type="password" autocomplete="${auto}" placeholder="${ph}" required style="${inp};flex:1;min-width:0"><button type="button" data-ver="${id}" style="${btn2}">Mostrar</button></div>`;
  const campoCod = () => `<label for="gCod" style="color:var(--muted)">Código enviado para <b>${esc(st.email)}</b></label><input id="gCod" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="000000" required style="${inp};letter-spacing:.2em;font-size:20px">`;
  const ir = (t, txt) => `<button type="button" data-ir="${t}" style="${lnk}">${txt}</button>`;
  const naoChegou = `<p style="margin:0;color:var(--muted);font-size:14px">Não chegou? Veja a caixa de spam e as promoções. O código vale por 1 hora.</p>`;
  const TELAS = {
    entrar: () => [`Entre na sua conta.`, `${campoEmail()}${campoSenha("gSenha", "Senha", "current-password")}<button id="gOk" style="${btn}">Entrar</button>`,
      ir("criar", "Criar conta") + ir("esqueci", "Esqueci minha senha")],
    criar: () => [`Crie a sua conta com o <b>e-mail liberado na compra</b> e uma senha de pelo menos 8 caracteres.`, `${campoEmail()}${campoSenha("gSenha", "Senha", "new-password")}${campoSenha("gSenha2", "Repita a senha", "new-password")}<p style="margin:0;color:var(--muted);font-size:14px">Ao criar a conta, você concorda com os <a href="termos.html" target="_blank" rel="noopener" style="color:var(--accent)">Termos de Uso</a> e a <a href="privacidade.html" target="_blank" rel="noopener" style="color:var(--accent)">Política de Privacidade</a>.</p><button id="gOk" style="${btn}">Criar conta</button>`, ir("entrar", "Já tenho conta")],
    confirmar: () => [`Falta só <b>confirmar o seu e-mail</b> com o código que enviamos.`, `${campoCod()}<button id="gOk" style="${btn}">Confirmar e entrar</button><button type="button" id="gReenviar" style="${btn2}">Enviar outro código</button>${naoChegou}<p style="margin:0;color:var(--muted);font-size:14px">Se você já tinha conta com esse e-mail, volte e use Entrar ou Esqueci minha senha.</p>`, ir("entrar", "Voltar")],
    esqueci: () => [`Digite o seu e-mail. Enviamos um código para você criar uma senha nova.`, `${campoEmail()}<button id="gOk" style="${btn}">Enviar código</button>`, ir("entrar", "Voltar")],
    esqueci2: () => [`Crie a sua senha nova.`, `${campoCod()}${campoSenha("gSenha", "Nova senha (mínimo 8 caracteres)", "new-password")}${campoSenha("gSenha2", "Repita a nova senha", "new-password")}<button id="gOk" style="${btn}">Salvar senha e entrar</button><button type="button" id="gReenviar" style="${btn2}">Enviar outro código</button>${naoChegou}`, ir("entrar", "Voltar")],
    codigo: () => [`Entre sem senha: enviamos um código para o seu e-mail.`, `${campoEmail()}<button id="gOk" style="${btn}">Enviar código</button>`, ir("entrar", "Entrar com senha")],
    codigo2: () => [`Digite o código para entrar.`, `${campoCod()}<button id="gOk" style="${btn}">Entrar</button><button type="button" id="gReenviar" style="${btn2}">Enviar outro código</button>${naoChegou}`, ir("codigo", "Usar outro e-mail")],
    novaSenha: () => [`Você entrou pelo link do e-mail. Agora crie a sua senha nova.`, `${campoSenha("gSenha", "Nova senha (mínimo 8 caracteres)", "new-password")}${campoSenha("gSenha2", "Repita a nova senha", "new-password")}<button id="gOk" style="${btn}">Salvar senha e entrar</button>`, ""],
    aguardando: () => [`Olá, <b>${esc(st.email)}</b>. Sua conta está criada, mas o acesso ao conteúdo <b>ainda não foi liberado</b>. Se você já comprou, aguarde a liberação ou fale com o suporte.`, `<button id="gOk" style="${btn}">Verificar de novo</button><button type="button" id="gSair" style="${btn2}">Sair desta conta</button>`, ""]
  };
  function tela(nome, msg, ok) {
    if (nome) st.tela = nome;
    if (msg !== undefined) { st.msg = msg; st.ok = !!ok; }
    const [intro, corpo, links] = TELAS[st.tela]();
    $("#main").innerHTML = `<form id="gate" novalidate style="max-width:380px;margin:48px auto 0;padding:0 16px;display:grid;gap:12px">
      <h1 style="font:600 22px var(--f-ui);margin:0">Revisão Espaçada DPE</h1>
      <p style="margin:0;color:var(--muted)">${intro}</p>${corpo}
      <p id="gmsg" role="alert" style="margin:0;color:${st.ok ? "var(--ink)" : "var(--bad)"}">${esc(st.msg)}</p>
      <div style="display:grid;gap:2px;justify-items:start">${links}</div></form>`;
    const f = $("#gate");
    f.querySelectorAll("[data-ir]").forEach(b => b.onclick = () => { const e = $("#gEmail"); if (e) st.email = e.value.trim(); tela(b.dataset.ir, ""); });
    f.querySelectorAll("[data-ver]").forEach(b => b.onclick = () => { const i = $("#" + b.dataset.ver), v = i.type === "password"; i.type = v ? "text" : "password"; b.textContent = v ? "Ocultar" : "Mostrar"; });
    const cod = $("#gCod"); if (cod) cod.oninput = () => { cod.value = cod.value.replace(/\D/g, ""); };
    const reenviar = $("#gReenviar"); if (reenviar) reenviar.onclick = () => rodar(reenviar, "Enviando…", REENVIAR[st.tela]);
    const sair = $("#gSair"); if (sair) sair.onclick = () => { const c = lerConta(); gravarConta(c && c.email ? { email: c.email } : null); if (c && c.at) sb("/auth/v1/logout", {}, c.at).catch(() => {}); tela("entrar", ""); };
    f.onsubmit = e => { e.preventDefault(); rodar($("#gOk"), "Aguarde…", ACOES[st.tela]); };
    const foco = f.querySelector("#gCod,#gSenha" + (st.email ? "" : ",#gEmail")) || f.querySelector("input"); if (foco) foco.focus();
  }
  async function rodar(b, txt, fn) {
    if (!fn) return;
    const orig = b.textContent; b.disabled = true; b.textContent = txt;
    try { await fn(); }
    catch (e) { if (document.body.contains(b)) { b.disabled = false; b.textContent = orig; } const m = $("#gmsg"); if (m) { m.style.color = "var(--bad)"; m.textContent = e.message || "Algo deu errado. Tente de novo."; } }
  }
  const val = id => ($(id) || {}).value || "";
  const pegaEmail = () => (st.email = normEmail(val("#gEmail")));
  const ACOES = {
    entrar: async () => {
      const email = pegaEmail(), senha = val("#gSenha"); if (!senha) throw new Erro("Digite a sua senha.", 0);
      let j;
      try { j = await sb("/auth/v1/token?grant_type=password", { email, password: senha }); }
      catch (e) {
        if (/not confirmed/i.test(e.srv)) { await sb("/auth/v1/resend?redirect_to=" + volta(), { type: "signup", email }); return tela("confirmar", "Seu e-mail ainda não foi confirmado. Enviamos um código.", true); }
        if (e.st === 400 || e.st === 401) throw new Erro("E-mail ou senha incorretos. Se você criou a conta só com código, toque em Esqueci minha senha para criar uma.", e.st);
        throw e;
      }
      await entrou(j);
    },
    criar: async () => {
      const email = pegaEmail(); checarSenha(val("#gSenha"), val("#gSenha2"));
      let j;
      try { j = await sb("/auth/v1/signup?redirect_to=" + volta(), { email, password: val("#gSenha") }); }
      catch (e) {
        if (/already|exists|registered/i.test(e.srv)) throw new Erro("Já existe uma conta com esse e-mail. Use Entrar ou Esqueci minha senha.", e.st);
        if (/database error saving new user|nao_liberado/i.test(e.srv)) throw new Erro("Esse e-mail ainda não foi liberado. Use o mesmo e-mail da compra ou fale com o suporte.", e.st);   // gatilho no Supabase: só e-mails da tabela liberados criam conta
        throw new Erro(erroSenha(e.srv) || e.message || "Não consegui criar a conta.", e.st);
      }
      if (j && j.access_token) return entrou(j);   // "Confirm email" desligado no Supabase: entra direto, sem código
      tela("confirmar", "Conta criada. Enviamos um código para o seu e-mail.", true);
    },
    confirmar: async () => entrou(await verificar(st.email, val("#gCod"), ["signup", "email"])),
    esqueci: async () => { await sb("/auth/v1/recover?redirect_to=" + volta(), { email: pegaEmail() }); tela("esqueci2", "Se houver uma conta com esse e-mail, o código chega em instantes.", true); },
    esqueci2: async () => {
      checarSenha(val("#gSenha"), val("#gSenha2")); const nova = val("#gSenha");
      const j = await verificar(st.email, val("#gCod"), ["recovery"]); gravarConta(sessao(j));
      try { await sb("/auth/v1/user", { password: nova }, j.access_token, "PUT"); }
      catch (e) { if (!erroSenha(e.srv)) throw e; return tela("novaSenha", erroSenha(e.srv)); }
      await entrou(j);
    },
    codigo: async () => { await sb("/auth/v1/otp?redirect_to=" + volta(), { email: pegaEmail(), create_user: true }); tela("codigo2", "Código enviado. Confira o seu e-mail.", true); },
    codigo2: async () => entrou(await verificar(st.email, val("#gCod"), ["email", "signup"])),
    novaSenha: async () => {
      checarSenha(val("#gSenha"), val("#gSenha2"));
      const c = await token(); if (!c) return tela("entrar", "Sua sessão expirou. Entre de novo.");
      try { await sb("/auth/v1/user", { password: val("#gSenha") }, c.at, "PUT"); } catch (e) { throw new Erro(erroSenha(e.srv) || e.message, e.st); }
      st.msg = ""; if (!(await abrirComConta())) tela("entrar", "Sua sessão expirou. Entre de novo.");
    },
    aguardando: async () => { if (!(await abrirComConta())) tela("entrar", "Sua sessão expirou. Entre de novo."); else if (st.tela === "aguardando") tela(null, "Ainda não liberado.", false); }
  };
  const REENVIAR = {
    confirmar: async () => { await sb("/auth/v1/resend?redirect_to=" + volta(), { type: "signup", email: st.email }); tela(null, "Código reenviado.", true); },
    esqueci2: async () => { await sb("/auth/v1/recover?redirect_to=" + volta(), { email: st.email }); tela(null, "Código reenviado.", true); },
    codigo2: async () => { await sb("/auth/v1/otp?redirect_to=" + volta(), { email: st.email, create_user: true }); tela(null, "Código reenviado.", true); }
  };

  // ---- início ----
  (async () => {
    // link do e-mail (confirmação ou recuperação): o Supabase volta com a sessão no #hash
    const h = new URLSearchParams(location.hash.slice(1)); let tipoLink = null;
    if (h.get("access_token") || h.get("error_description")) {
      try { history.replaceState(null, "", location.pathname + location.search); } catch (_) {}
      if (h.get("access_token")) {
        try { const u = await sb("/auth/v1/user", null, h.get("access_token")); gravarConta(sessao({ user: u, access_token: h.get("access_token"), refresh_token: h.get("refresh_token"), expires_at: +h.get("expires_at") || 0, expires_in: +h.get("expires_in") || 3600 })); tipoLink = h.get("type"); }
        catch (_) { st.msg = "Não consegui confirmar o link. Entre com e-mail e senha."; }
      } else st.msg = "Esse link expirou ou já foi usado. Entre ou peça um código novo.";
    }
    if (tipoLink === "recovery") return tela("novaSenha");
    // chave guardada e assinatura confirmada há menos de PRAZO: abre na hora (também offline) e confere a assinatura em segundo plano
    const verif = verificadoEm(), recente = verif > 0 && Date.now() - verif < PRAZO;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw && recente) { const key = await crypto.subtle.importKey("raw", unb64(raw), "AES-GCM", false, ["decrypt"]); start(await tryKey(key)); revalidar(); return; }
    } catch (_) { esquecerChave(); }   // versão nova do app: a chave muda e a conta busca a nova
    const c = lerConta();
    if (c && c.email) st.email = c.email;
    if (c && c.at) {
      try { if (await abrirComConta()) return; st.msg = "Sua sessão expirou. Entre de novo."; }
      catch (e) { st.msg = e.rede && verif ? "Conecte-se à internet para confirmar a sua assinatura. O app pede isso a cada 7 dias." : e.message; }
    }
    else if (c && c.expirada) st.msg = "Sua sessão expirou. Entre de novo.";
    tela("entrar");
  })();
})();
