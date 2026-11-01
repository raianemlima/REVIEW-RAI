// Review DPE · dashboard documental. Lê apenas catálogos estáticos e não modifica o progresso do aluno.
(function () {
  "use strict";

  const NOMES = {
    direito_constitucional: "Direito Constitucional", direito_administrativo: "Direito Administrativo",
    direito_civil: "Direito Civil", direito_processual_civil: "Direito Processual Civil",
    direito_penal: "Direito Penal", direito_processual_penal: "Direito Processual Penal",
    direito_institucional_defensoria_publica: "Direito Institucional da Defensoria Pública",
    direitos_humanos: "Direitos Humanos", direito_da_crianca_e_adolescente: "Criança e Adolescente",
    direito_do_consumidor: "Direito do Consumidor", execucao_penal: "Execução Penal",
    direitos_difusos_e_coletivos: "Difusos e Coletivos", criminologia: "Criminologia",
    direito_tributario: "Direito Tributário", direito_empresarial: "Direito Empresarial",
    filosofia_sociologia_juridica: "Filosofia e Sociologia Jurídica",
    direito_ambiental_urbanistico: "Ambiental e Urbanístico", direito_do_idoso: "Direito do Idoso",
    direito_agrario: "Direito Agrário", direito_antidiscriminatorio: "Antidiscriminatório",
    historia_geografia_local: "História e Geografia local",
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const escapar = value => {
    const texto = String(value ?? "");
    return typeof window.esc === "function" ? window.esc(texto) : texto.replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
  };
  const tituloEdital = id => {
    const partes = String(id).split("-");
    return partes.length === 2 ? `DPE ${partes[0].toUpperCase()} · ${partes[1]}` : String(id).toUpperCase();
  };
  const nomeMateria = id => NOMES[id] || String(id || "matéria sem identificação")
    .replaceAll("_", " ").replace(/\b\w/g, letra => letra.toUpperCase());
  const mediana = numeros => {
    const ordenados = [...numeros].sort((a, b) => a - b), meio = Math.floor(ordenados.length / 2);
    return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
  };
  const numero = valor => Number.isInteger(valor) ? String(valor) : String(valor).replace(".", ",");

  function dados() {
    // O relatório compara editais de Defensor(a); programas de servidor e os marcados com relatorio: false
    // (ex.: regulamento da DPE/RN com programa incompleto) ficam só no Cronograma.
    const deDefensor = ([, programa]) => programa?.cargo !== "servidor" && programa?.relatorio !== false;
    const conteudos = Object.fromEntries(Object.entries(window.DPE_CONTEUDOS_EDITAIS || {}).filter(deDefensor));
    const pesos = Object.fromEntries(Object.entries(window.DPE_PESOS_EDITAIS || {}).filter(([id]) => Object.hasOwn(conteudos, id)));
    const frequencia = new Map(), diretos = new Map();
    for (const programa of Object.values(conteudos)) {
      const vistos = new Set();
      for (const disciplina of Array.isArray(programa?.disciplinas) ? programa.disciplinas : []) {
        const ids = Array.isArray(disciplina.canonicais) && disciplina.canonicais.length ? disciplina.canonicais : [disciplina.id];
        ids.forEach(id => { if (typeof id === "string" && id) vistos.add(id); });
      }
      vistos.forEach(id => frequencia.set(id, (frequencia.get(id) || 0) + 1));
    }
    for (const perfil of Object.values(pesos)) {
      for (const grupo of Array.isArray(perfil?.grupos) ? perfil.grupos : []) {
        if ((grupo.subjects || []).length !== 1 || typeof grupo.subjects[0] !== "string") continue;
        const id = grupo.subjects[0];
        if (!diretos.has(id)) diretos.set(id, []);
        diretos.get(id).push(grupo.valor);
      }
    }
    const ranking = [...frequencia.entries()].map(([id, editais]) => ({ id, nome: nomeMateria(id), editais, valores: diretos.get(id) || [] }))
      .sort((a, b) => b.editais - a.editais || a.nome.localeCompare(b.nome, "pt-BR"));
    return { conteudos, pesos, total: Object.keys(conteudos).length, ranking };
  }

  function barra(item, total) {
    const percentual = total ? Math.round(item.editais / total * 100) : 0;
    return `<li class="rd-edital-rank"><div><b>${escapar(item.nome)}</b><span>${item.editais}/${total} editais</span></div><div class="rd-edital-track" aria-hidden="true"><i style="width:${percentual}%"></i></div><strong>${percentual}%</strong></li>`;
  }

  function linhasPesos(ranking) {
    const itens = ranking.filter(item => item.valores.length).sort((a, b) => mediana(b.valores) - mediana(a.valores) || b.valores.length - a.valores.length);
    return itens.map(item => {
      const min = Math.min(...item.valores), max = Math.max(...item.valores), md = mediana(item.valores);
      return `<tr><th scope="row">${escapar(item.nome)}</th><td>${item.valores.length}</td><td><b>${numero(md)}</b></td><td>${min}–${max}</td></tr>`;
    }).join("");
  }

  function perfilHtml(id, peso) {
    if (!id || !peso) return `<p class="rd-edital-empty">Selecione um edital para conferir a forma de distribuição registrada no corpus.</p>`;
    if (!(peso.grupos || []).length) {
      return `<div class="rd-edital-alert"><b>Sem peso individual verificável</b><p>Este edital permanece com distribuição equilibrada no cronograma. Isso organiza o tempo, mas não afirma que todas as matérias tenham o mesmo peso oficial.</p></div>`;
    }
    const grupos = peso.grupos.map(grupo => {
      const assuntos = (grupo.subjects || []).map(nomeMateria).join(", ") || "Matéria fora do catálogo normalizado";
      const unidade = peso.tipo === "questoes" ? "questões" : "questões no grupo";
      const valor = Number.isFinite(Number(grupo.valor)) ? Number(grupo.valor) : "—";
      return `<li><b>${escapar(grupo.label)} · ${valor} ${unidade}</b><span>${escapar(assuntos)}</span></li>`;
    }).join("");
    const tipo = peso.tipo === "grupos" ? "Peso compartilhado por grupo" : "Questões discriminadas pela matéria";
    return `<div class="rd-edital-profile-head"><b>${tipo}</b><span>Fonte: ${escapar(peso.fonte || "documento do corpus")}</span></div><ul class="rd-edital-profile-list">${grupos}</ul><p class="rd-edital-caveat">${escapar(peso.nota || "Confira o edital antes de converter esse dado em prioridade de estudo.")}</p>`;
  }

  function montar() {
    const destino = $("#main");
    if (!destino || typeof S !== "object" || S.tab !== "estatisticas" || $("#rdDashboardEditais", destino)) return;
    const d = dados();
    if (!d.total) return;
    const comNumero = Object.values(d.pesos).filter(p => Array.isArray(p.grupos) && p.grupos.length).length;
    const nucleo = d.ranking.filter(item => item.editais === d.total);
    const estados = new Set(Object.keys(d.conteudos).map(id => String(id).split("-")[0]).filter(Boolean)).size;
    const pesoFiltrado = id => d.pesos[id];
    const opcoes = Object.keys(d.pesos).sort().map(id => `<option value="${escapar(id)}">${tituloEdital(id)}</option>`).join("");
    const painel = document.createElement("section");
    painel.id = "rdDashboardEditais";
    painel.className = "rd-edital-dashboard";
    painel.setAttribute("aria-labelledby", "rdEditaisTitulo");
    painel.innerHTML = `
      <div class="rd-edital-hero">
        <div><span class="rd-eyebrow">DADOS PARA PLANEJAR</span><h2 id="rdEditaisTitulo">Relatório dos editais</h2><p>Compare recorrência e peso da prova objetiva sem confundir tendência da amostra com regra do seu concurso.</p></div>
        <button type="button" class="btn primary" id="rdUsarCronograma">Usar no cronograma <span aria-hidden="true">→</span></button>
      </div>
      <div class="rd-edital-kpis" aria-label="Resumo do corpus documental">
        <div><b>${d.total}</b><span>editais analisados</span></div><div><b>${nucleo.length}</b><span>matérias universais</span></div><div><b>${comNumero}</b><span>perfis com números</span></div><div><b>${estados}</b><span>estados no recorte</span></div>
      </div>
      <div class="rd-edital-grid">
        <section class="rd-edital-card rd-edital-frequency"><div class="rd-edital-card-heading"><div><span class="rd-eyebrow">FREQUÊNCIA</span><h3>Núcleo mais recorrente</h3></div><span class="rd-edital-chip">${d.total} editais</span></div>
          <p class="rd-edital-intro">Presença no programa, depois de normalizar títulos combinados. A ordem sugere onde começar quando você ainda não escolheu edital.</p>
          <ol>${d.ranking.slice(0, 12).map(item => barra(item, d.total)).join("")}</ol>
          <details class="rd-edital-details"><summary>Ver todas as matérias mapeadas</summary><ol>${d.ranking.slice(12).map(item => barra(item, d.total)).join("")}</ol></details>
        </section>
        <section class="rd-edital-card rd-edital-weights"><div class="rd-edital-card-heading"><div><span class="rd-eyebrow">QUESTÕES</span><h3>Faixa mais observada</h3></div><span class="rd-edital-chip rd-edital-chip-amber">somente dado direto</span></div>
          <p class="rd-edital-intro">Mediana e intervalo nos editais que informaram questão por matéria. Blocos compartilhados não foram repartidos artificialmente.</p>
          <div class="rd-edital-table-wrap"><table><thead><tr><th scope="col">Matéria</th><th scope="col" aria-label="Editais com peso individual">n</th><th scope="col">Mediana</th><th scope="col">Faixa</th></tr></thead><tbody>${linhasPesos(d.ranking)}</tbody></table></div>
        </section>
      </div>
      <section class="rd-edital-card rd-edital-filter"><div class="rd-edital-filter-top"><div><span class="rd-eyebrow">LEIA O EDITAL</span><h3>Distribuição registrada por concurso</h3><p>Veja se o documento informa questões individuais, grupos compartilhados ou nenhum peso verificável.</p></div><label for="rdEditalFiltro">Editar recorte<select id="rdEditalFiltro"><option value="">Escolha um edital</option>${opcoes}</select></label></div><div id="rdEditalPerfil" aria-live="polite">${perfilHtml("", null)}</div></section>
      <aside class="rd-edital-method"><b>Como ler este painel</b><p><strong>Frequência</strong> mostra em quantos programas a matéria aparece. <strong>Peso</strong> mostra apenas contagens expressas na prova objetiva. Nenhuma das duas medidas prevê aprovação ou substitui o edital escolhido.</p><a href="docs/RELATORIO-MATERIAS-E-PESOS-DPE.md" target="_blank" rel="noopener">Abrir relatório metodológico completo <span aria-hidden="true">↗</span></a></aside>`;
    destino.prepend(painel);
    $("#rdUsarCronograma", painel).onclick = () => { if (typeof go === "function") go("cronograma"); };
    $("#rdEditalFiltro", painel).onchange = evento => { $("#rdEditalPerfil", painel).innerHTML = perfilHtml(evento.target.value, pesoFiltrado(evento.target.value)); };
  }

  function pronto() {
    try { return typeof S === "object" && typeof renderStats === "function" && !!window.DPE_CONTEUDOS_EDITAIS && !!window.DPE_PESOS_EDITAIS; }
    catch (_) { return false; }
  }
  function instalar() {
    if (window.__rdDashboardEditais) return;
    window.__rdDashboardEditais = true;
    const anterior = renderStats;
    renderStats = function () { const resultado = anterior.apply(this, arguments); montar(); return resultado; };
    if (S.tab === "estatisticas") render();
  }
  (function esperar() { if (pronto()) instalar(); else setTimeout(esperar, 200); })();
})();
