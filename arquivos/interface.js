// Review DPE · apresentação do design fornecido, sobre a lógica existente.
// Referência: MelhorarDesignDoApp @ 7467241. Sem agenda, dados ou backend próprios.
(function () {
  "use strict";
  const MARCA = "rdSidebar";
  const $rd = s => document.querySelector(s);
  const caminhos = {
    book: '<path d="M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2zM20 5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2z"/>',
    library: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7M8 11h7"/>',
    scale: '<path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0zM8 21h8"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M4 7h5M15 7h5M4 17h5M15 17h5M7 4v6M17 14v6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
  };
  function icone(nome) {
    return `<svg class="rd-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${caminhos[nome] || caminhos.book}</svg>`;
  }
  function atributosNavegacao() {
    const tabs = $rd("#tabs");
    if (tabs) tabs.setAttribute("aria-orientation", window.innerWidth > 900 ? "vertical" : "horizontal");
  }
  function atualizarShell() {
    const main = $rd("#main");
    if (main) main.dataset.rdView = S.mode === "loading" ? "carregando" : S.tab;
    const ajustes = $rd("#rdAjustes");
    ajustes?.setAttribute("aria-pressed", String(S.tab === "ajustes"));
    const presenca = $rd("#rdSequencia"), legenda = $rd("#rdLegenda");
    if (presenca && legenda) {
      if (S.mode === "loading") { presenca.textContent = "Seu progresso"; legenda.textContent = "carregando os registros"; }
      else {
        const n = streakInfo().n;
        presenca.textContent = `${n} ${n === 1 ? "dia com estudo" : "dias com estudo"}`;
        legenda.textContent = "Descansar não apaga o que você fez.";
      }
    }
    atributosNavegacao();
  }
  function montarShell() {
    if ($rd("#" + MARCA)) return;
    const tabs = $rd("#tabs"), header = $rd("header.top"), logo = header?.querySelector(".brand h1");
    if (!tabs || !header || !logo) return;
    const skip = document.createElement("a");
    skip.className = "rd-skip-link"; skip.href = "#main"; skip.textContent = "Ir para o conteúdo";
    skip.onclick = () => $rd("#main")?.focus();
    document.body.prepend(skip);
    const side = document.createElement("aside");
    side.id = MARCA; side.className = "rd-sidebar"; side.setAttribute("aria-label", "Menu do Review DPE");
    const marca = document.createElement("button");
    marca.type = "button"; marca.className = "rd-logo"; marca.setAttribute("aria-label", "Review DPE — ir para Hoje");
    marca.innerHTML = logo.innerHTML; marca.onclick = () => go("hoje");
    side.appendChild(marca);
    tabs.setAttribute("aria-label", "Navegação principal");
    side.appendChild(tabs);   // o próprio nó mantém os listeners, IDs, abas e badges existentes
    const rodape = document.createElement("div");
    rodape.className = "rd-sidebar-footer";
    rodape.innerHTML = `<div class="rd-presenca"><strong id="rdSequencia">Seu progresso</strong><p id="rdLegenda">carregando os registros</p></div><button type="button" id="rdAjustes" class="rd-settings">${icone("settings")}<span>Ajustes</span></button>`;
    side.appendChild(rodape);
    // O fixed precisa ficar fora de shells que possam criar containing block.
    document.body.appendChild(side);
    $rd("#rdAjustes").onclick = () => go("ajustes");
    logo.classList.add("rd-mobile-logo");
    $rd("#goBusca").innerHTML = icone("search");
    $rd("#main")?.setAttribute("tabindex", "-1");
    tabs.addEventListener("keydown", e => {
      if (!e.target.matches("button[role=tab]")) return;
      const vertical = tabs.getAttribute("aria-orientation") === "vertical";
      const avancar = vertical ? "ArrowDown" : "ArrowRight", voltar = vertical ? "ArrowUp" : "ArrowLeft";
      if (![avancar, voltar, "Home", "End"].includes(e.key)) return;
      const botoes = [...tabs.querySelectorAll("button[role=tab]")].filter(b => !b.hidden && !b.disabled);
      const i = botoes.indexOf(e.target); if (i < 0 || !botoes.length) return;
      const j = e.key === "Home" ? 0 : e.key === "End" ? botoes.length - 1 : (i + (e.key === avancar ? 1 : -1) + botoes.length) % botoes.length;
      e.preventDefault(); botoes[j].focus(); botoes[j].click();
    });
    window.addEventListener("resize", atributosNavegacao);
    const medirNavegacao = () => {
      const altura = side.getBoundingClientRect().height;
      document.documentElement.style.setProperty("--rd-nav-space", `${Math.ceil(altura)}px`);
    };
    medirNavegacao();
    if (typeof ResizeObserver === "function") {
      const observador = new ResizeObserver(medirNavegacao);
      observador.observe(side);
    } else {
      window.addEventListener("resize", medirNavegacao);
    }
    const ajustarTeclado = evento => {
      const alvo = evento?.type === "focusin" ? evento.target : document.activeElement;
      const campo = alvo?.matches?.("textarea, select, input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit])");
      document.documentElement.classList.toggle("rd-editando", window.innerWidth <= 900 && !!campo);
      medirNavegacao();
    };
    document.addEventListener("focusin", ajustarTeclado, true);
    document.addEventListener("focusout", () => requestAnimationFrame(ajustarTeclado));
    window.addEventListener("resize", ajustarTeclado);
    window.visualViewport?.addEventListener("resize", ajustarTeclado);
    document.documentElement.dataset.rdDesign = "figma";
    document.body.classList.add("rd-shell");
    if (typeof S === "object") atualizarShell();
    ajustarTeclado();
  }
  function decorarHoje() {
    atualizarShell();
    if (S.mode === "loading" || S.tab !== "hoje") return;
    const main = $rd("#main"), hero = main?.querySelector(".hero");
    if (!main || !hero || main.querySelector(".rd-dashboard")) return;
    const frase = hero.querySelector(".frase"), metas = hero.querySelector(".day-metas");
    if ((frase || metas) && !hero.querySelector(".rd-goal-details")) {
      const detalhes = document.createElement("details"); detalhes.className = "rd-goal-details";
      const resumo = document.createElement("summary"); resumo.textContent = "Ajustar meta diária e ver detalhes";
      detalhes.appendChild(resumo);
      const explicacao = metas?.nextElementSibling;
      if (frase) detalhes.appendChild(frase);
      if (metas) {
        detalhes.appendChild(metas);
        if (explicacao?.classList.contains("count")) detalhes.appendChild(explicacao);
      }
      hero.appendChild(detalhes);
    }
    const data = dayToDate(today()), hora = new Date().getHours(), oi = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
    const welcome = document.createElement("section");
    welcome.className = "rd-welcome";
    welcome.innerHTML = `<div><span class="rd-eyebrow">${oi}</span><h2 class="rd-title">Seu estudo, no seu ritmo.</h2><p>Uma sessão pequena, com atenção ao que você sabe e ao que precisa revisar.</p></div><div class="rd-date" aria-label="Dia de estudo: ${esc(data.toLocaleDateString("pt-BR"))}"><span>HOJE</span><b>${data.getDate()}</b><small>${esc(data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase())}</small></div>`;
    main.prepend(welcome);
    const dashboard = document.createElement("div"); dashboard.className = "rd-dashboard";
    const lado = document.createElement("div"); lado.className = "rd-side";
    const semana = [...main.querySelectorAll(":scope > section.panel")].find(p => p.querySelector("h3")?.textContent.trim() === "Sua semana");
    hero.before(dashboard); dashboard.appendChild(hero); dashboard.appendChild(lado);
    if (semana) { semana.classList.add("rd-week"); lado.appendChild(semana); }
    for (const id of ["filaHoje", "mcMissoes", "extrasHoje"]) {
      const el = main.querySelector("#" + id); if (el) lado.appendChild(el);
    }
    const recursos = document.createElement("section"); recursos.className = "rd-resources";
    recursos.innerHTML = `<div class="rd-section-heading"><div><span class="rd-eyebrow">Escolha seu caminho</span><h2>Seu estudo, organizado</h2><p>Os recursos completos continuam aqui. Explore quando fizer sentido para você.</p></div></div><div class="rd-resource-grid">${[
      ["leiseca", "scale", "Ler e aprender", "Lei seca", "Artigos e novidades legislativas"],
      ["sessao", "book", "Praticar e revisar", "Modos de estudo", "Temas, questões, erros e segunda fase"],
      ["biblioteca", "library", "Consultar e organizar", "Biblioteca", "Seu baralho, filtros e cartões sinalizados"],
    ].map(([aba, icon, tag, titulo, desc]) => `<button type="button" class="rd-resource" data-rd-go="${aba}">${icone(icon)}<span class="rd-resource-copy"><small>${tag}</small><b>${titulo}</b><span>${desc}</span></span>${icone("arrow")}</button>`).join("")}</div>`;
    dashboard.after(recursos);
    recursos.querySelectorAll("[data-rd-go]").forEach(b => b.onclick = () => go(b.dataset.rdGo));
    hero.classList.add("rd-focus");
    const modos = main.querySelector("#goEstudar");
    if (modos) modos.textContent = "Ver modos →";
  }
  function decorarSessao() {
    atualizarShell();
    const main = $rd("#main");
    if (!main || S.mode === "loading" || S.tab !== "sessao") return;
    main.classList.toggle("rd-studying", !!S.session);
    main.querySelector(".card")?.classList.add("rd-flashcard");
    main.querySelector(".mc-plan")?.classList.add("rd-planning");
  }
  function instalar() {
    if (document.documentElement.dataset.rdInterfaceReady === "true") return;
    document.documentElement.dataset.rdDesign = "figma";
    document.body.classList.add("rd-shell");
    montarShell();
    if (!document.body.classList.contains("rd-shell")) return;
    const antesHoje = renderHoje;
    renderHoje = function () { const out = antesHoje.apply(this, arguments); decorarHoje(); return out; };
    const antesSessao = renderSession;
    renderSession = function () { const out = antesSessao.apply(this, arguments); decorarSessao(); return out; };
    const antesRender = render;
    render = function () {
      const out = antesRender.apply(this, arguments);
      atualizarShell();
      $rd("#main")?.classList.toggle("rd-studying", S.tab === "sessao" && !!S.session);
      return out;
    };
    const antesTema = temaAplicar;
    temaAplicar = function () {
      const out = antesTema.apply(this, arguments), btn = $rd("#goTema");
      if (btn) btn.innerHTML = icone(temaEscuro() ? "sun" : "moon");
      document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute("content", temaEscuro() ? "#11101d" : "#f7f7fc"));
      return out;
    };
    temaAplicar();
    render();
    document.documentElement.dataset.rdInterfaceReady = "true";
  }
  function pronto() {
    try { return typeof S === "object" && S.ajustes && typeof render === "function" && typeof renderHoje === "function" && typeof renderSession === "function" && typeof temaAplicar === "function" && typeof dayToDate === "function" && !!$rd("#tabs") && !!$rd("header.top .brand h1"); }
    catch (_) { return false; }
  }
  // Prepara tokens e navegação antes do primeiro render do app, evitando o flash do tema legado.
  if ($rd("#tabs") && $rd("header.top .brand h1")) {
    document.documentElement.dataset.rdDesign = "figma";
    document.body.classList.add("rd-shell");
    montarShell();
  }
  (function esperar() { if (pronto()) instalar(); else setTimeout(esperar, 250); })();
})();
