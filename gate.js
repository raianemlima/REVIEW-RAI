// Tela de entrada: conta (e-mail e senha). Decifra o baralho (PBKDF2 + AES-GCM) e só então inicia o app.
// A senha do baralho vem do Supabase (função chave_do_app), entregue só a e-mails liberados, confirmados e com assinatura válida.
// A chave fica guardada no aparelho para abrir offline, mas só por PRAZO: depois disso o app exige confirmar a assinatura online.
// tema escolhido no app (diurno/noturno) já na tela de entrada
try {
  const t = localStorage.getItem("revisao-dpe-tema");
  if (t === "claro" || t === "escuro") document.documentElement.dataset.theme = t === "claro" ? "light" : "dark";
} catch (e) {}
document.documentElement.dataset.rdDesign = "figma";
document.body.classList.add("rd-gate");
(() => {
  const KEY = "revisao-dpe-chave", KEY_UID = "revisao-dpe-chave-uid", CONTA = "revisao-dpe-conta", VERIF = "revisao-dpe-verif", PRAZO = 7 * 86400000;
  const SB_URL = "https://hlenhmgnqqnkjqmntnpz.supabase.co", SB_KEY = "sb_publishable_UbPHvOFSbd-dgyDx6SI7mg_UBx4_o9l";   // chave pública: a proteção é a RLS
  const $ = s => document.querySelector(s);
  const APP_CACHE = "review-dpe-assuntos-v22";
  async function carregarTexto(url, tipo, motivo) {
    let resposta;
    try { resposta = await fetch(url); } catch (_) { throw new Error(motivo); }
    if (!resposta.ok) throw new Error(motivo);
    const texto = await resposta.text();
    try { const cache = await caches.open(APP_CACHE); await cache.put(url, new Response(texto, { headers: { "Content-Type": tipo } })); } catch (_) {}
    return texto;
  }
  async function carregarDeck() {
    const bruto = await carregarTexto(new URL("deck.enc", document.baseURI).href, "application/json", "deck-indisponivel");
    let deck; try { deck = JSON.parse(bruto); } catch (_) { throw new Error("deck-invalido"); }
    if (!deck || deck.v !== 2 || deck.z !== "gzip" || !Number.isInteger(deck.it) || deck.it < 100000 || ![deck.s, deck.iv, deck.ct].every(x => typeof x === "string" && /^[A-Za-z0-9+/]+={0,2}$/.test(x))) throw new Error("deck-invalido");
    try { if (unb64(deck.s).length !== 16 || unb64(deck.iv).length !== 12 || unb64(deck.ct).length < 16) throw new Error(); }
    catch (_) { throw new Error("deck-invalido"); }
    return deck;
  }
  const modulosCarregados = new Set(); let carregandoModulos = null;
  async function carregarModulos() {
    if (!carregandoModulos) carregandoModulos = (async () => {
      for (const ref of document.querySelectorAll("script[data-lazy-src]")) {
        const url = new URL(ref.getAttribute("data-lazy-src"), document.baseURI).href;
        if (modulosCarregados.has(url)) continue;
        const codigo = await carregarTexto(url, "text/javascript; charset=utf-8", "modulo-indisponivel");
        const script = document.createElement("script"); script.textContent = codigo; document.body.appendChild(script);
        modulosCarregados.add(url);
      }
    })().catch(e => { carregandoModulos = null; throw e; });
    return carregandoModulos;
  }
  const unb64 = s => { const d = atob(s), n = d.length, o = new Uint8Array(n); for (let i = 0; i < n; i++) o[i] = d.charCodeAt(i); return o; };
  const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u)));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---- baralho ----
  async function tryKey(key, enc) {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(enc.iv) }, key, unb64(enc.ct));
    if (!enc.z) return new TextDecoder().decode(pt);
    if (typeof DecompressionStream === "undefined") throw new Error("sem-gzip");
    return new Response(new Blob([pt]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
  }
  async function start(deckJson) {
    const status = $("#save");
    if (status) { status.hidden = false; status.textContent = "Carregando o app…"; }
    try {
      await carregarModulos();
      const marcador = $("#app-src"), referência = marcador && marcador.getAttribute("data-src");
      const appSrc = referência ? await carregarTexto(new URL(referência, document.baseURI).href, "text/plain; charset=utf-8", "app-indisponivel") : marcador && marcador.textContent;
      if (typeof appSrc !== "string") throw new Error("app-indisponivel");
      $("#main").innerHTML = "";
      document.body.classList.remove("rd-gate");
      document.body.classList.add("rd-shell");
      document.documentElement.dataset.rdDesign = "figma";
      const script = document.createElement("script");
      script.textContent = "const DECK = " + deckJson + ";\n" + appSrc;
      document.body.appendChild(script);
    }
    catch (e) { if (status) { status.hidden = true; status.textContent = ""; } throw e; }
  }
  async function deriveFromPassword(pw, enc) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: unb64(enc.s), iterations: enc.it, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
  }
  async function guardarChave(key, uid) {
    try {
      if (!uid) throw new Error("conta-invalida");
      localStorage.setItem(KEY, b64(await crypto.subtle.exportKey("raw", key)));
      localStorage.setItem(KEY_UID, uid);
      localStorage.setItem(VERIF, String(Date.now()));
    } catch (_) { esquecerChave(); }
  }
  const esquecerChave = () => { try { localStorage.removeItem(KEY); localStorage.removeItem(KEY_UID); localStorage.removeItem(VERIF); } catch (_) {} };
  const verificadoEm = () => { try { return +localStorage.getItem(VERIF) || 0; } catch (_) { return 0; } };
  const msgDecifrar = err => !err ? null : err.message === "sem-gzip" ? "Este navegador é antigo demais para abrir o app. Atualize o navegador e tente de novo." : err.message === "deck-indisponivel" || err.message === "modulo-indisponivel" || err.message === "app-indisponivel" ? "Não consegui carregar o app. Verifique a conexão e tente novamente." : err.message === "deck-invalido" ? "O conteúdo do app está indisponível nesta versão. Atualize a página e tente de novo." : null;

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
    let pw;
    try { pw = await sb("/rest/v1/rpc/chave_do_app", {}, c.at); }
    catch (e) {
      if (e.st === 401 || e.st === 403) { await negarAcesso(c, "O Supabase não autorizou esta conta a abrir o conteúdo. Confirme a liberação do e-mail da compra com o suporte."); return true; }
      throw e;
    }
    if (typeof pw !== "string" || !pw.trim()) { await negarAcesso(c); return true; }
    let deck, key;
    try { const enc = await carregarDeck(); key = await deriveFromPassword(pw, enc); deck = await tryKey(key, enc); }
    catch (err) { throw new Erro(msgDecifrar(err) || "Sua conta está liberada, mas a chave do app no servidor não confere com esta versão. Avise o suporte.", 0); }
    await guardarChave(key, c.uid); await start(deck); return true;
  }
  // com o app já aberto pela chave guardada: confirma a assinatura em segundo plano. Sem internet ou sessão, não faz nada (o PRAZO cuida disso).
  async function revalidar() {
    try {
      const antes = lerConta(), c = await token();
      if (!c) {
        if (antes && (antes.at || antes.rt)) { esquecerChave(); gravarConta(antes.email ? { email: antes.email } : null); location.reload(); }
        return;
      }
      const pw = await sb("/rest/v1/rpc/chave_do_app", {}, c.at);
      if (typeof pw === "string" && pw.trim() && localStorage.getItem(KEY_UID) === c.uid) { try { localStorage.setItem(VERIF, String(Date.now())); } catch (_) {} }
      else { esquecerChave(); gravarConta(c.email ? { email: c.email } : null); location.reload(); }
    } catch (e) {
      if (e.st === 401 || e.st === 403) {
        const c = lerConta(); esquecerChave(); gravarConta(c && c.email ? { email: c.email } : null); location.reload();
      }
    }
  }
  const entrou = async j => { gravarConta(sessao(j)); st.msg = ""; if (!(await abrirComConta())) tela("entrar", "Não consegui abrir a sessão. Tente de novo."); };
  async function negarAcesso(c, mensagem = "Este e-mail não tem uma liberação ativa. Use o mesmo e-mail da compra ou fale com o suporte.") {
    esquecerChave();
    gravarConta(c && c.email ? { email: c.email } : null);
    if (c && c.at) { try { await sb("/auth/v1/logout", {}, c.at); } catch (_) {} }
    st.email = c && c.email || st.email;
    tela("entrar", mensagem);
  }

  // ---- telas ----
  const st = { tela: "entrar", email: "", msg: "", ok: false };
  const inp = "min-height:44px;padding:12px;font:16px var(--f-ui);border:1px solid var(--line);border-radius:var(--r);background:var(--surface);color:var(--ink);width:100%;box-sizing:border-box";
  const btn = "min-height:44px;padding:12px;font:600 16px var(--f-ui);border:0;border-radius:var(--r);background:var(--accent);color:var(--accent-ink);cursor:pointer";
  const btn2 = "min-width:44px;min-height:44px;padding:10px 12px;font:500 15px var(--f-ui);border:1px solid var(--line);border-radius:var(--r);background:var(--surface);color:var(--ink);cursor:pointer";
  const lnk = "min-height:44px;display:flex;align-items:center;padding:6px 0;font:500 15px var(--f-ui);border:0;background:none;color:var(--accent);text-decoration:underline;cursor:pointer;text-align:left";
  const campoEmail = () => `<label for="gEmail" style="display:grid;gap:5px;color:var(--muted);font-size:14px;font-weight:500">E-mail<input id="gEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" placeholder="nome@exemplo.com" value="${esc(st.email)}" required aria-describedby="gmsg" style="${inp}"></label>`;
  const campoSenha = (id, ph, auto) => { const nome = id === "gSenha2" ? "senha de confirmação" : /Nova senha/.test(ph) ? "nova senha" : "senha"; return `<div style="display:grid;gap:5px"><label for="${id}" style="color:var(--muted);font-size:14px;font-weight:500">${esc(ph)}</label><div style="display:flex;gap:6px"><input id="${id}" type="password" autocomplete="${auto}" placeholder="${esc(ph)}" required aria-describedby="gmsg" style="${inp};flex:1;min-width:0"><button type="button" data-ver="${id}" data-nome="${nome}" aria-controls="${id}" aria-pressed="false" aria-label="Mostrar ${nome}" style="${btn2}">Mostrar</button></div></div>`; };
  const campoCod = () => `<label for="gCod" style="display:grid;gap:5px;color:var(--muted);font-size:14px">Código enviado para <b>${esc(st.email)}</b><input id="gCod" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="000000" required aria-describedby="gmsg" style="${inp};letter-spacing:.2em;font-size:20px"></label>`;
  const ir = (t, txt) => `<button type="button" data-ir="${t}" style="${lnk}">${txt}</button>`;
  const naoChegou = `<p style="margin:0;color:var(--muted);font-size:14px">Não chegou? Veja a caixa de spam e as promoções. O código vale por 1 hora.</p>`;
  const TITULOS = { entrar: "Acesse sua conta", criar: "Crie sua conta", confirmar: "Confirme seu e-mail", esqueci: "Recuperar acesso", esqueci2: "Defina uma nova senha", codigo: "Entrar sem senha", codigo2: "Confirme o código", novaSenha: "Atualize sua senha", aguardando: "Acesso pendente" };
  const TELAS = {
    entrar: () => [`Entre na sua conta.`, `${campoEmail()}${campoSenha("gSenha", "Senha", "current-password")}<button id="gOk" style="${btn}">Entrar</button>`,
      ir("criar", "Criar conta") + ir("esqueci", "Esqueci minha senha")],
    criar: () => [`Crie a sua conta com o <b>e-mail liberado na compra</b> e uma senha de pelo menos 8 caracteres.`, `${campoEmail()}${campoSenha("gSenha", "Senha", "new-password")}${campoSenha("gSenha2", "Repita a senha", "new-password")}<p style="margin:0;color:var(--muted);font-size:14px">Ao criar a conta, você concorda com os <a href="termos.html" target="_blank" rel="noopener" style="color:var(--accent)">Termos de Uso</a> e a <a href="privacidade.html" target="_blank" rel="noopener" style="color:var(--accent)">Política de Privacidade</a>.</p><button id="gOk" style="${btn}">Criar conta</button>`, ir("entrar", "Já tenho conta") + `<p style="margin:10px 0 0;text-align:center;font-size:14px;color:var(--muted)">Ainda não assinou? <a href="conheca.html#preco" target="_blank" rel="noopener" style="color:var(--accent);font-weight:700">Ver planos</a> · mensal R$ 15,99 ou anual em 12x de R$ 11,20</p>`],
    confirmar: () => [`Falta só <b>confirmar o seu e-mail</b> com o código que enviamos.`, `${campoCod()}<button id="gOk" style="${btn}">Confirmar e entrar</button><button type="button" id="gReenviar" style="${btn2}">Enviar outro código</button>${naoChegou}<p style="margin:0;color:var(--muted);font-size:14px">Se você já tinha conta com esse e-mail, volte e use Entrar ou Esqueci minha senha.</p>`, ir("entrar", "Voltar")],
    esqueci: () => [`Digite o seu e-mail. Enviamos um código para você criar uma senha nova.`, `${campoEmail()}<button id="gOk" style="${btn}">Enviar código</button>`, ir("entrar", "Voltar")],
    esqueci2: () => [`Crie a sua senha nova.`, `${campoCod()}${campoSenha("gSenha", "Nova senha (mínimo 8 caracteres)", "new-password")}${campoSenha("gSenha2", "Repita a nova senha", "new-password")}<button id="gOk" style="${btn}">Salvar senha e entrar</button><button type="button" id="gReenviar" style="${btn2}">Enviar outro código</button>${naoChegou}`, ir("entrar", "Voltar")],
    codigo: () => [`Entre sem senha: enviamos um código para o seu e-mail.`, `${campoEmail()}<button id="gOk" style="${btn}">Enviar código</button>`, ir("entrar", "Entrar com senha")],
    codigo2: () => [`Digite o código para entrar.`, `${campoCod()}<button id="gOk" style="${btn}">Entrar</button><button type="button" id="gReenviar" style="${btn2}">Enviar outro código</button>${naoChegou}`, ir("codigo", "Usar outro e-mail")],
    novaSenha: () => [`Você entrou pelo link do e-mail. Agora crie a sua senha nova.`, `${campoSenha("gSenha", "Nova senha (mínimo 8 caracteres)", "new-password")}${campoSenha("gSenha2", "Repita a nova senha", "new-password")}<button id="gOk" style="${btn}">Salvar senha e entrar</button>`, ""],
    aguardando: () => [`Olá, <b>${esc(st.email)}</b>. Sua conta está criada, mas o acesso ao conteúdo <b>ainda não foi liberado</b>. Se você já comprou, aguarde a liberação ou fale com o suporte. Ainda não assinou? Mensal de <b>R$ 15,99</b> ou anual em <b>12x de R$ 11,20</b>.`, `<button id="gOk" style="${btn}">Verificar de novo</button><a href="conheca.html?plano=anual#preco" target="_blank" rel="noopener" style="${btn2};display:block;text-align:center;text-decoration:none;box-sizing:border-box">Ver planos e assinar</a><button type="button" id="gSair" style="${btn2}">Sair desta conta</button>`, ""]
  };
  function tela(nome, msg, ok) {
    if (nome) st.tela = nome;
    if (msg !== undefined) { st.msg = msg; st.ok = !!ok; }
    const [intro, corpo, links] = TELAS[st.tela]();
    $("#main").innerHTML = `<form id="gate" novalidate style="max-width:380px;margin:48px auto 0;padding:0 16px;display:grid;gap:12px">
      <h1 style="font:600 22px var(--f-ui);margin:0">${TITULOS[st.tela] || "Acesse sua conta"}</h1>
      <p style="margin:0;color:var(--muted)">${intro}</p>${corpo}
      <p id="gmsg" role="alert" style="margin:0;color:${st.ok ? "var(--ink)" : "var(--bad)"}">${esc(st.msg)}</p>
      <p id="gstatus" role="status" aria-live="polite" aria-atomic="true" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0"></p>
      <div style="display:grid;gap:2px;justify-items:start">${links}</div></form>`;
    const f = $("#gate");
    const save = $("#save"); if (save) { save.hidden = true; save.textContent = ""; }
    f.querySelectorAll("[data-ir]").forEach(b => b.onclick = () => { const e = $("#gEmail"); if (e) st.email = e.value.trim(); tela(b.dataset.ir, ""); });
    f.querySelectorAll("[data-ver]").forEach(b => b.onclick = () => { const i = $("#" + b.dataset.ver), v = i.type === "password"; i.type = v ? "text" : "password"; b.textContent = v ? "Ocultar" : "Mostrar"; b.setAttribute("aria-pressed", String(v)); b.setAttribute("aria-label", (v ? "Ocultar " : "Mostrar ") + b.dataset.nome); });
    const cod = $("#gCod"); if (cod) cod.oninput = () => { cod.value = cod.value.replace(/\D/g, ""); };
    const reenviar = $("#gReenviar"); if (reenviar) reenviar.onclick = () => rodar(reenviar, "Enviando…", REENVIAR[st.tela]);
    const sair = $("#gSair"); if (sair) sair.onclick = () => negarAcesso(lerConta(), "Você saiu da conta.");
    f.onsubmit = e => { e.preventDefault(); rodar($("#gOk"), "Aguarde…", ACOES[st.tela]); };
    const foco = f.querySelector("#gCod,#gSenha" + (st.email ? "" : ",#gEmail")) || f.querySelector("input"); if (foco) foco.focus();
  }
  async function rodar(b, txt, fn) {
    if (!fn) return;
    const orig = b.textContent, form = b.closest("form"), status = $("#gstatus");
    b.disabled = true; b.textContent = txt;
    if (form) form.setAttribute("aria-busy", "true");
    if (status) status.textContent = txt;
    try { await fn(); }
    catch (e) { if (document.body.contains(b)) { b.disabled = false; b.textContent = orig; } const m = $("#gmsg"); if (m) { m.style.color = "var(--bad)"; m.textContent = msgDecifrar(e) || e.message || "Algo deu errado. Tente de novo."; } }
    finally { if (form && document.body.contains(form)) form.removeAttribute("aria-busy"); if (status && document.body.contains(status)) status.textContent = ""; }
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

  // Visitante novo: nunca usou o app neste aparelho, abriu pelo navegador (não pelo app instalado) e está online.
  // ?entrar (links "Entrar" da divulgação) e ?origem=pwa (atalho do app instalado) sempre mostram a tela de entrada.
  function visitanteNovo(c) {
    try {
      if (c || st.msg) return false;
      const q = new URLSearchParams(location.search);
      if (q.has("entrar") || q.get("origem") === "pwa") return false;
      if (navigator.standalone === true) return false;
      if (typeof matchMedia === "function" && (matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: minimal-ui)").matches)) return false;
      if (navigator.onLine === false) return false;
      for (let i = 0; i < localStorage.length; i++) if (/^revisao-dpe/.test(localStorage.key(i) || "")) return false;
      return true;
    } catch (_) { return false; }
  }

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
      const c = lerConta(), chaveDaConta = !!(raw && c && c.uid && localStorage.getItem(KEY_UID) === c.uid);
      if (raw && recente && chaveDaConta) {
        let enc;
        try { enc = await carregarDeck(); }
        catch (e) { st.msg = msgDecifrar(e) || "Não consegui carregar o conteúdo offline. Conecte-se e tente novamente."; }
        if (enc) {
          let deck = null;
          try { const key = await crypto.subtle.importKey("raw", unb64(raw), "AES-GCM", false, ["decrypt"]); deck = await tryKey(key, enc); }
          catch (_) { esquecerChave(); }   // versão nova do app: a chave muda e a conta busca a nova
          if (deck !== null) {
            try { await start(deck); revalidar(); return; }
            catch (e) { st.msg = msgDecifrar(e) || "Não consegui iniciar o app. Atualize a página e tente de novo."; }
          }
        }
      }
    } catch (_) { esquecerChave(); }
    const c = lerConta();
    if (c && c.email) st.email = c.email;
    if (c && c.at) {
      try { if (await abrirComConta()) return; st.msg = "Sua sessão expirou. Entre de novo."; }
      catch (e) { st.msg = e.rede && verif ? "Conecte-se à internet para confirmar a sua assinatura. O app pede isso a cada 7 dias." : msgDecifrar(e) || e.message; }
    }
    else if (c && c.expirada) st.msg = "Sua sessão expirou. Entre de novo.";
    // quem chega pela primeira vez pelo navegador (link da bio, busca, indicação) vê antes a página de divulgação
    if (visitanteNovo(c)) { location.replace("conheca.html" + location.search); return; }
    tela("entrar");
  })();
})();
