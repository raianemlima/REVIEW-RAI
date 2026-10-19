// Review DPE · cronograma orientado por editais de Defensor(a) Público(a).
// O catálogo é uma síntese documental dos anexos fornecidos pelo usuário.
// Este módulo não cria cartões: ele organiza horas, dias, disciplinas e metas já existentes.
(function () {
  "use strict";

  const CORE = [
    "direito_constitucional", "direito_administrativo", "direito_civil",
    "direito_processual_civil", "direito_penal", "direito_processual_penal",
    "direito_institucional_defensoria_publica"
  ];

  const DISCIPLINAS_EDITAIS = [
    ["direito_constitucional", "Direito Constitucional", "núcleo comum documentado em 18/18 editais", ["constitucional"]],
    ["direito_administrativo", "Direito Administrativo", "núcleo comum documentado em 18/18 editais", ["administrativo"]],
    ["direito_civil", "Direito Civil", "núcleo comum; alguns editais agrupam com Empresarial", ["direito civil", "civil"]],
    ["direito_processual_civil", "Direito Processual Civil", "núcleo comum documentado em 18/18 editais", ["processual civil"]],
    ["direito_penal", "Direito Penal", "núcleo comum; alguns editais agrupam com Criminologia", ["direito penal", "penal"]],
    ["direito_processual_penal", "Direito Processual Penal", "núcleo comum; alguns editais agrupam com Execução Penal", ["processual penal"]],
    ["direito_institucional_defensoria_publica", "Direito Institucional da Defensoria Pública", "núcleo comum; títulos variam entre princípios, atribuições, legislação e organização", ["defensoria pública", "direito institucional", "princípios institucionais", "organização da defensoria"]],
    ["direitos_humanos", "Direitos Humanos", "recorrente, mas não universal no corpus", ["direitos humanos"]],
    ["direito_do_consumidor", "Direito do Consumidor", "recorrente, mas não universal no corpus", ["direito do consumidor", "consumidor"]],
    ["direito_da_crianca_e_adolescente", "Direito da Criança e do Adolescente", "recorrente; alguns editais agregam outros grupos vulnerabilizados", ["criança e do adolescente", "criança e adolescente", "infância e juventude"]],
    ["execucao_penal", "Execução Penal", "frequente, mas não presente com o mesmo título em todos", ["execução penal", "execuções penais"]],
    ["direitos_difusos_e_coletivos", "Direitos Difusos e Coletivos", "cobertura parcial relevante", ["direitos difusos e coletivos"]],
    ["direito_tributario", "Direito Tributário", "opcional; aparece em parte dos editais", ["direito tributário", "tributário"]],
    ["criminologia", "Criminologia", "opcional; às vezes vem junto de Direito Penal", ["criminologia"]],
    ["direito_empresarial", "Direito Empresarial", "opcional; às vezes vem junto de Direito Civil", ["direito empresarial", "civil e empresarial"]],
    ["direito_do_idoso", "Direito do Idoso", "opcional e frequentemente agrupado com outros grupos", ["direito do idoso", "pessoas idosas"]],
    ["filosofia_sociologia_juridica", "Filosofia/Sociologia Jurídica", "opcional; títulos e escopos variam", ["filosofia do direito", "sociologia jurídica", "filosofia jurídica"]],
    ["direito_antidiscriminatorio", "Direito Antidiscriminatório", "opcional e específico de alguns editais", ["antidiscriminatório", "antidiscriminatorio"]],
    ["direito_ambiental_urbanistico", "Direito Ambiental e Urbanístico", "opcional; às vezes agrupado com Agrário", ["ambiental e urbanístico", "ambiental e urbanistico", "direito ambiental"]],
    ["direito_agrario", "Direito Agrário", "opcional e específico de alguns editais", ["direito agrário", "direito agrario"]],
    ["tutela_coletiva", "Tutela Coletiva", "opcional; não foi fundida automaticamente a Direitos Difusos", ["tutela coletiva"]],
    ["direito_pessoas_idosas_deficiencia", "Direito das Pessoas Idosas e com Deficiência", "opcional e geralmente agrupado", ["pessoas idosas e com deficiência", "idoso e da pessoa com deficiência"]],
    ["direito_sanitario", "Direito Sanitário", "opcional e específico do edital de Rondônia", ["direito sanitário"]],
    ["direito_do_trabalho", "Direito do Trabalho", "opcional e específico do edital do Ceará", ["direito do trabalho"]],
    ["direito_previdenciario", "Direito Previdenciário", "opcional e específico do edital do Ceará", ["direito previdenciário"]],
    ["direito_a_saude", "Direito à Saúde", "opcional e específico de alguns editais", ["direito à saúde", "direito a saúde"]],
    ["historia_geografia_local", "História e Geografia do estado", "opcional; depende do edital escolhido", ["história e geografia"]],
    ["direito_filosofia_formacao_humanistica", "Formação Humanística e Relações Étnico-raciais", "opcional; aparece em conteúdos específicos", ["formação humanística", "relações étnico-raciais"]],
    ["legislacao_penal_extravagante", "Legislação Penal e Processual Penal Extravagante", "opcional e específica de alguns editais", ["legislação penal e processual penal extravagante"]],
    ["medicina_legal", "Medicina Legal", "opcional e específica do edital do Tocantins", ["medicina legal"]],
    ["direito_urbanistico_fundiario", "Direito Urbanístico e Fundiário", "opcional; título conjunto do edital de Rondônia", ["urbanístico e fundiário", "urbanistico e fundiario"]],
    ["direito_sociologia_estado", "Sociologia Jurídica e Teoria Geral do Estado", "opcional; título conjunto de alguns editais", ["sociologia jurídica e teoria geral do estado"]],
    ["direito_saude_local", "Direito à Saúde e legislação local", "opcional; não substitui o edital do aluno", ["direito à saúde e legislação"]]
  ];
  const DISC_MAP = Object.fromEntries(DISCIPLINAS_EDITAIS.map(([id, nome, cobertura, aliases]) => [id, { id, nome, cobertura, aliases }]));

  // 18 editais para a carreira de Defensor(a) Público(a), publicados entre 2021 e 2026.
  // Provas discursivas isoladas, caderno de prova, concurso de servidores e edital de 2014 ficaram fora.
  const EDITAIS_DPE = [
    ["ac-2024", "AC", 2024, "DPE/AC · VI Concurso", ["direito_civil", "direito_processual_civil", "direito_penal", "direito_processual_penal", "direito_constitucional", "direito_administrativo", "direito_da_crianca_e_adolescente", "direito_do_idoso", "direito_do_consumidor", "direitos_humanos", "direitos_difusos_e_coletivos", "direito_institucional_defensoria_publica"]],
    ["ap-2022", "AP", 2022, "DPE/AP · II Concurso", ["direito_constitucional", "direito_administrativo", "direito_penal", "direito_processual_penal", "execucao_penal", "direito_civil", "direito_processual_civil", "direito_do_consumidor", "direitos_difusos_e_coletivos", "direitos_humanos", "direito_da_crianca_e_adolescente", "direito_pessoas_idosas_deficiencia", "direito_agrario", "direito_ambiental_urbanistico", "direito_institucional_defensoria_publica"]],
    ["am-2025", "AM", 2025, "DPE/AM · V Concurso", ["direitos_humanos", "direito_constitucional", "direito_administrativo", "direito_penal", "direito_processual_penal", "execucao_penal", "criminologia", "direito_civil", "direito_do_idoso", "direito_do_consumidor", "direito_a_saude", "direito_antidiscriminatorio", "direito_processual_civil", "direito_da_crianca_e_adolescente", "direitos_difusos_e_coletivos", "direito_institucional_defensoria_publica", "filosofia_sociologia_juridica", "historia_geografia_local"]],
    ["ce-2022", "CE", 2022, "DPE/CE · Edital 01/2022", ["direito_constitucional", "direito_civil", "direito_penal", "direito_processual_civil", "direito_processual_penal", "direito_do_trabalho", "direito_administrativo", "direito_previdenciario", "direito_empresarial", "direito_do_consumidor", "direito_institucional_defensoria_publica"]],
    ["es-2023", "ES", 2023, "DPE/ES · V Concurso", ["direito_constitucional", "direitos_humanos", "direito_administrativo", "direito_tributario", "direito_institucional_defensoria_publica", "direito_civil", "direito_empresarial", "direito_do_consumidor", "direito_processual_civil", "direitos_difusos_e_coletivos", "direito_da_crianca_e_adolescente", "direito_penal", "direito_processual_penal", "execucao_penal", "criminologia"]],
    ["ma-2026", "MA", 2026, "DPE/MA · VII Concurso", ["direito_constitucional", "direito_do_consumidor", "direito_institucional_defensoria_publica", "direito_administrativo", "direito_civil", "direito_ambiental_urbanistico", "direito_agrario", "direito_processual_civil", "historia_geografia_local", "direitos_difusos_e_coletivos", "direito_da_crianca_e_adolescente", "direito_penal", "criminologia", "direito_processual_penal", "execucao_penal", "direitos_humanos", "direito_filosofia_formacao_humanistica"]],
    ["mg-2023", "MG", 2023, "DPE/MG · IX Concurso", ["direito_penal", "criminologia", "direito_processual_penal", "execucao_penal", "direito_constitucional", "direitos_humanos", "direito_administrativo", "direito_civil", "direito_processual_civil", "direitos_difusos_e_coletivos", "direito_da_crianca_e_adolescente", "direito_do_consumidor", "direito_institucional_defensoria_publica"]],
    ["mt-2022", "MT", 2022, "DPE/MT · VI Concurso", ["direito_civil", "direito_processual_civil", "direito_da_crianca_e_adolescente", "direito_do_consumidor", "direitos_difusos_e_coletivos", "direito_penal", "criminologia", "direito_processual_penal", "execucao_penal", "direito_constitucional", "direito_administrativo", "direito_tributario", "direitos_humanos", "direito_institucional_defensoria_publica"]],
    ["mt-2025", "MT", 2025, "DPE/MT · VII Concurso", ["direito_civil", "direito_processual_civil", "direito_da_crianca_e_adolescente", "direito_do_consumidor", "direitos_difusos_e_coletivos", "direito_penal", "criminologia", "direito_processual_penal", "execucao_penal", "direito_constitucional", "direito_administrativo", "direito_tributario", "direitos_humanos", "direito_institucional_defensoria_publica"]],
    ["pe-2025", "PE", 2025, "DPE/PE · IV Concurso", ["direito_constitucional", "direito_administrativo", "direito_civil", "direito_processual_civil", "direito_penal", "direito_processual_penal", "execucao_penal", "direito_do_consumidor", "direito_da_crianca_e_adolescente", "direitos_humanos", "direito_institucional_defensoria_publica"]],
    ["rj-2026", "RJ", 2026, "DPE/RJ · XXIX Concurso", ["direito_civil", "direito_processual_civil", "direito_do_consumidor", "tutela_coletiva", "direito_empresarial", "direito_penal", "direito_processual_penal", "execucao_penal", "criminologia", "direito_constitucional", "direito_administrativo", "direitos_humanos", "direito_da_crianca_e_adolescente", "direito_institucional_defensoria_publica"]],
    ["ro-2022", "RO", 2022, "DPE/RO · Edital 01/2022", ["direitos_humanos", "direito_constitucional", "direito_administrativo", "direito_urbanistico_fundiario", "direito_tributario", "direito_penal", "criminologia", "execucao_penal", "direito_processual_penal", "direito_civil", "direito_do_consumidor", "direito_processual_civil", "direito_sanitario", "direito_da_crianca_e_adolescente", "direito_sociologia_estado", "tutela_coletiva", "direito_pessoas_idosas_deficiencia", "direito_institucional_defensoria_publica"]],
    ["rs-2025", "RS", 2025, "DPE/RS · VII Concurso", ["direito_constitucional", "direitos_humanos", "direito_filosofia_formacao_humanistica", "direito_da_crianca_e_adolescente", "direito_processual_civil", "direito_civil", "direito_do_consumidor", "direitos_difusos_e_coletivos", "direito_ambiental_urbanistico", "direito_processual_penal", "execucao_penal", "direito_penal", "criminologia", "direito_administrativo", "direito_tributario", "direito_institucional_defensoria_publica"]],
    ["sc-2024", "SC", 2024, "DPE/SC · Concurso 01/2024", ["direito_constitucional", "direito_da_crianca_e_adolescente", "direitos_humanos", "direito_penal", "direito_processual_penal", "execucao_penal", "direito_civil", "direito_empresarial", "direito_processual_civil", "direitos_difusos_e_coletivos", "direito_do_consumidor", "direito_administrativo", "direito_tributario", "filosofia_sociologia_juridica", "direito_institucional_defensoria_publica"]],
    ["sc-2026", "SC", 2026, "DPE/SC · Concurso 01/2026", ["direito_constitucional", "direito_administrativo", "direito_ambiental_urbanistico", "direito_civil", "direito_empresarial", "direito_da_crianca_e_adolescente", "execucao_penal", "direito_do_consumidor", "direito_institucional_defensoria_publica", "direito_penal", "direito_processual_civil", "direito_processual_penal", "direito_tributario", "direitos_difusos_e_coletivos", "direitos_humanos", "filosofia_sociologia_juridica", "criminologia", "historia_geografia_local"]],
    ["se-2021", "SE", 2021, "DPE/SE · Edital 01/2021", ["direito_civil", "direito_processual_civil", "direito_do_consumidor", "direito_penal", "direito_processual_penal", "execucao_penal", "direito_constitucional", "direito_administrativo", "direito_da_crianca_e_adolescente", "direito_do_idoso", "direitos_humanos", "direitos_difusos_e_coletivos", "direito_institucional_defensoria_publica"]],
    ["sp-2026", "SP", 2026, "DPE/SP · X Concurso", ["direito_constitucional", "direito_administrativo", "direito_tributario", "direito_penal", "direito_processual_penal", "direito_civil", "direito_empresarial", "direito_processual_civil", "direitos_difusos_e_coletivos", "direito_da_crianca_e_adolescente", "direitos_humanos", "direito_institucional_defensoria_publica", "filosofia_sociologia_juridica"]],
    ["to-2021", "TO", 2021, "DPE/TO · Edital 01/2021", ["direito_constitucional", "direitos_humanos", "direito_administrativo", "direito_tributario", "direito_civil", "direito_empresarial", "direito_processual_civil", "direito_agrario", "direitos_difusos_e_coletivos", "filosofia_sociologia_juridica", "direito_institucional_defensoria_publica", "direito_antidiscriminatorio", "direito_penal", "direito_processual_penal", "execucao_penal", "legislacao_penal_extravagante", "criminologia", "medicina_legal"]]
  ].map(([id, estado, ano, nome, subjects]) => ({ id, estado, ano, nome, subjects }));

  const dias = [[1, "Seg"], [2, "Ter"], [3, "Qua"], [4, "Qui"], [5, "Sex"], [6, "Sáb"], [7, "Dom"]];
  const escLocal = value => typeof esc === "function" ? esc(value) : String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const normLocal = value => String(value || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const coreOrFirst = subjects => {
    const out = (subjects || []).filter(id => CORE.includes(id));
    return out.length ? out : (subjects || []).slice(0, 7);
  };
  // Distribui centésimos inteiros: não perde 0,01% nos arredondamentos.
  function normalizarPercentuais(ids, weights = {}, totalCent = 10000) {
    if (!ids.length) return {};
    const valores = ids.map(id => Number.isFinite(+weights[id]) && +weights[id] > 0 ? +weights[id] : 0);
    const soma = valores.reduce((a, b) => a + b, 0);
    const partes = ids.map((id, i) => {
      const exato = (soma ? valores[i] / soma : 1 / ids.length) * totalCent;
      return { id, i, cent: Math.floor(exato), resto: exato - Math.floor(exato) };
    });
    let restante = totalCent - partes.reduce((n, x) => n + x.cent, 0);
    const ordem = partes.slice().sort((a, b) => b.resto - a.resto || a.i - b.i);
    for (let i = 0; i < restante; i++) ordem[i % ordem.length].cent++;
    return Object.fromEntries(partes.map(x => [x.id, x.cent / 100]));
  }
  const pesosIguais = ids => normalizarPercentuais(ids);
  function lerPercentual(value) {
    const texto = String(value ?? "").trim();
    if (!/^(?:\d+(?:[.,]\d{1,2})?|[.,]\d{1,2})$/.test(texto)) return NaN;
    const n = Number(texto.replace(",", "."));
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : NaN;
  }
  const formatarPercentual = value => Number(value || 0).toFixed(2).replace(".", ",");
  const perfis = () => window.DPE_PESOS_EDITAIS || {};
  function sugerirPesos(editalId, ids) {
    const perfil = perfis()[editalId];
    if (!perfil || !perfil.grupos.length) return pesosIguais(ids);
    const bases = {};
    for (const g of perfil.grupos) {
      // A contagem de uma rubrica conjunta entra só uma vez; repartição interna é hipótese.
      for (const id of g.subjects) bases[id] = (bases[id] || 0) + g.valor / g.subjects.length;
    }
    const positivos = Object.values(bases).filter(n => n > 0);
    const reserva = positivos.length ? positivos.reduce((a, b) => a + b, 0) / positivos.length : 1;
    return normalizarPercentuais(ids, Object.fromEntries(ids.map(id => [id, bases[id] || reserva])));
  }
  function metodoHtml(editalId, ids, modo) {
    const perfil = perfis()[editalId];
    const inicio = modo === "manual" ? "Distribuição personalizada. O restante é redistribuído proporcionalmente ao editar." : modo === "igual" ? "Divisão igual entre as disciplinas selecionadas." : perfil?.grupos.length ? (perfil.tipo === "grupos" ? "Sugestão pelos grupos da prova objetiva." : "Sugestão pelas quantidades de questões da prova objetiva.") : "Sugestão equilibrada: não há ponderação numérica verificada para esta referência.";
    if (!perfil) return inicio + " Você pode ajustar. Isto é tempo sugerido, não peso oficial ou previsão de aprovação.";
    const cobertos = new Set(perfil.grupos.flatMap(g => g.subjects));
    const faltam = ids.filter(id => !cobertos.has(id));
    const extra = perfil.grupos.length && faltam.length ? " Matérias sem quantidade própria no quadro recebem uma reserva média de tempo (hipótese), não um peso oficial." : "";
    return `${inicio}${extra} Percentuais são renormalizados somente entre as matérias escolhidas. Uma rubrica conjunta é repartida igualmente internamente como hipótese de tempo, não peso oficial individual.<details><summary>Ver fonte e critério</summary><p>${escLocal(perfil.fonte)} · ${escLocal(perfil.nota)}</p>${perfil.grupos.map(g => `<p>${escLocal(g.label)}: ${g.valor} · ${escLocal(g.evidencia)}</p>`).join("")}</details>`;
  }
  const somaPesos = weights => Object.values(weights || {}).reduce((s, n) => s + (+n || 0), 0);
  function normalizarDias(values) {
    const out = [...new Set((values || []).map(Number).filter(n => n >= 1 && n <= 7))].sort((a, b) => a - b);
    return out.length ? out : [1, 2, 3, 4, 5];
  }
  function novoPlano(editalId = "comum") {
    const ed = EDITAIS_DPE.find(x => x.id === editalId);
    const ids = ed ? coreOrFirst(ed.subjects) : CORE.slice();
    return { v: 1, ativo: false, editalId, horasSemana: 5, dias: [1, 2, 3, 4, 5], subjects: ids, pesos: pesosIguais(ids), blocoMin: 40, aplicarMetas: true, atualizadoEm: 0 };
  }
  function planoAtual() {
    ensureAj();
    const a = S.ajustes;
    if (!a.cronograma || typeof a.cronograma !== "object") a.cronograma = novoPlano("comum");
    const p = a.cronograma;
    p.v = 1; p.horasSemana = clamp(Number(p.horasSemana) || 5, 1, 60); p.dias = normalizarDias(p.dias);
    p.subjects = [...new Set((p.subjects || CORE).filter(id => DISC_MAP[id]))];
    if (!p.subjects.length) p.subjects = CORE.slice();
    p.pesos = Object.fromEntries(p.subjects.map(id => [id, Number.isFinite(+((p.pesos || {})[id])) ? +p.pesos[id] : 0]));
    if (somaPesos(p.pesos) <= 0) p.pesos = pesosIguais(p.subjects);
    p.blocoMin = clamp(Number(p.blocoMin) || 40, 15, 180);
    return p;
  }
  function editalSelecionado(p) { return EDITAIS_DPE.find(x => x.id === p.editalId) || null; }
  function minutosPorDia(p) { return Math.max(5, Math.min(240, Math.round(p.horasSemana * 60 / Math.max(1, p.dias.length)))); }
  function metaCartoesPorDia(p) { return clamp(Math.round(minutosPorDia(p) / 4), 5, 50); }
  function diaSemanaApp() { const d = typeof dayToDate === "function" ? dayToDate(today()) : new Date(); return d.getDay() || 7; }
  function agendaHoje(p) { return p.dias.includes(diaSemanaApp()); }
  function idDeckCompativel(subjectId, d) {
    const text = normLocal([d.id, d.nome, d.curto].join(" "));
    const rules = {
      direito_constitucional: t => t.includes("constitucional") || /(^| )dc( |$)/.test(t),
      direito_administrativo: t => t.includes("administrativo") && !t.includes("processual"),
      direito_civil: t => t.includes("civil") && !t.includes("processual"),
      direito_processual_civil: t => t.includes("processual civil") || t === "pc" || /(^| )pc( |$)/.test(t),
      direito_penal: t => t.includes("penal") && !t.includes("processual") && !t.includes("execu") && !t.includes("crimin"),
      direito_processual_penal: t => t.includes("processual penal") || t === "pp" || /(^| )pp( |$)/.test(t),
      direito_institucional_defensoria_publica: t => t.includes("defensoria") || t.includes("institucional") || t.includes("organiza") || /(^| )inst( |$)/.test(t),
      direitos_humanos: t => t.includes("humano"),
      direito_do_consumidor: t => t.includes("consumidor"),
      direito_da_crianca_e_adolescente: t => t.includes("criança") || t.includes("crianca") || t.includes("infância") || t.includes("infancia"),
      execucao_penal: t => t.includes("execu") && t.includes("penal"),
      direitos_difusos_e_coletivos: t => t.includes("difuso") || t.includes("coletivo"),
      direito_tributario: t => t.includes("tribut"),
      criminologia: t => t.includes("crimin"),
      direito_empresarial: t => t.includes("empresarial"),
      direito_do_idoso: t => t.includes("idoso") || t.includes("idosa"),
      filosofia_sociologia_juridica: t => t.includes("filosof") || t.includes("sociolog"),
      direito_antidiscriminatorio: t => t.includes("antidiscrimin"),
      direito_ambiental_urbanistico: t => t.includes("ambiental") || t.includes("urban"),
      direito_agrario: t => t.includes("agrar"),
      tutela_coletiva: t => t.includes("tutela coletiva"),
      direito_pessoas_idosas_deficiencia: t => (t.includes("idos") && t.includes("defici")),
      direito_sanitario: t => t.includes("sanit"),
      direito_do_trabalho: t => t.includes("trabalho"),
      direito_previdenciario: t => t.includes("previd"),
      direito_a_saude: t => t.includes("saúde") || t.includes("saude")
    };
    return !!(rules[subjectId] && rules[subjectId](text));
  }
  function disciplinasDoBaralho(subjects) {
    if (typeof DECK === "undefined" || !Array.isArray(DECK.disciplinas)) return [];
    return DECK.disciplinas.filter(d => (subjects || []).some(id => idDeckCompativel(id, d))).map(d => d.id);
  }
  function distribuicaoHtml(ids, weights) {
    return ids.map(id => `<label class="cr-peso"><span>${escLocal(DISC_MAP[id].nome)}</span><input type="text" inputmode="decimal" required autocomplete="off" data-cr-peso="${id}" value="${formatarPercentual(weights[id])}" aria-label="Percentual de ${escLocal(DISC_MAP[id].nome)}" aria-describedby="crTotal"><b>%</b></label>`).join("");
  }
  function labelsDias(ids) { return ids.map(id => (dias.find(x => x[0] === id) || [id, ""])[1]).join(", "); }
  function semanaPreview(p) {
    const ordem = p.subjects.filter(id => p.pesos[id] > 0).sort((a, b) => (p.pesos[b] || 0) - (p.pesos[a] || 0));
    const totalMin = Math.round(p.horasSemana * 60);
    const tempo = normalizarPercentuais(ordem, p.pesos, totalMin);
    return dias.map(([id, label]) => {
      if (!p.dias.includes(id)) return `<div class="cr-dia off"><b>${label}</b><span>descanso ou revisão livre</span></div>`;
      const itens = ordem.map(s => `<span>${escLocal(DISC_MAP[s].nome)} · ${Math.round(tempo[s] * 100)} min/semana</span>`).join("");
      return `<div class="cr-dia"><b>${label}</b><small>${minutosPorDia(p)} min no dia · distribuição semanal de referência</small><div>${itens}</div></div>`;
    }).join("");
  }
  function resumoPlano(p) {
    const ed = editalSelecionado(p);
    return `${ed ? escLocal(ed.nome) : "Núcleo comum dos editais"} · ${p.horasSemana} h/semana · ${labelsDias(p.dias)}`;
  }
  function renderCronograma() {
    ensureAj();
    const salvo = planoAtual();
    if (!S.cronogramaDraft) {
      const inicial = JSON.parse(JSON.stringify(salvo));
      inicial.pesosModo = inicial.pesosModo || (inicial.ativo ? "manual" : "edital");
      inicial.pesos = inicial.pesosModo === "edital" && !inicial.ativo ? sugerirPesos(inicial.editalId, inicial.subjects) : normalizarPercentuais(inicial.subjects, inicial.pesos);
      S.cronogramaDraft = inicial;
    }
    const draft = S.cronogramaDraft;
    const draftId = draft.editalId || "comum";
    const ed = EDITAIS_DPE.find(x => x.id === draftId);
    const subjectIds = ed ? ed.subjects : DISCIPLINAS_EDITAIS.map(x => x[0]);
    const selected = draft.subjects.filter(id => DISC_MAP[id] && subjectIds.includes(id));
    const draftWeights = draft.pesos;
    const pPreview = { ...draft, subjects: selected };
    const selectedSet = new Set(selected);
    const daysSet = new Set(draft.dias);
    const title = salvo.ativo ? "Seu cronograma em andamento" : "Monte um cronograma que caiba";
    $("#main").innerHTML = `<button class="btn small ghost cr-back" id="crBack">← Hoje</button>
      <section class="cr-hero"><span class="cr-eyebrow">Planejamento por editais</span><h2>${title}</h2><p>Escolha um edital, seus dias, suas horas e as disciplinas que realmente quer acompanhar. O plano organiza o estudo; não promete resultado.</p>${salvo.ativo ? `<div class="cr-status"><b>Plano ativo</b><span>${resumoPlano(salvo)}</span><span>Hoje: ${agendaHoje(salvo) ? `${minutosPorDia(salvo)} min e meta de ${metaCartoesPorDia(salvo)} cartões` : "dia livre"}</span></div>` : ""}</section>
      <form class="cr-form" id="crForm">
        <section class="panel"><div class="ph"><h3>1. Escolha a referência</h3><span class="count">18 editais de carreira · 2021–2026</span></div>
          <label class="field"><span>Base do cronograma</span><select id="crEdital"><option value="comum" ${draftId === "comum" ? "selected" : ""}>Núcleo comum documentado em 18 editais</option>${EDITAIS_DPE.map(x => `<option value="${x.id}" ${x.id === draftId ? "selected" : ""}>${escLocal(x.nome)} · ${escLocal(ESTADO_NOME?.[x.estado] || x.estado)}</option>`).join("")}</select><small class="hint">O núcleo comum usa sete matérias presentes nos 18 editais filtrados. Um edital estadual acrescenta as matérias específicas dele.</small></label>
        </section>
        <section class="panel"><div class="ph"><h3>2. Defina o tempo real</h3><span class="count">sem compensação automática</span></div>
          <div class="cr-grid"><label class="field"><span>Horas por semana</span><input id="crHoras" type="number" min="1" max="60" step="0.5" value="${draft.horasSemana}"><small class="hint">O app dividirá o tempo pelos dias escolhidos.</small></label><label class="field"><span>Bloco preferido (min)</span><input id="crBloco" type="number" min="15" max="180" step="5" value="${draft.blocoMin}"><small class="hint">O bloco é uma sugestão; a meta leve continua disponível.</small></label></div>
          <fieldset class="field cr-days"><legend>Dias em que você pretende estudar</legend><div>${dias.map(([id, label]) => `<label><input type="checkbox" data-cr-dia="${id}" ${daysSet.has(id) ? "checked" : ""}> ${label}</label>`).join("")}</div><small class="hint">Você pode descansar sem perder histórico e sem criar uma dívida de cartões.</small></fieldset>
        </section>
        <section class="panel"><div class="ph"><h3>3. Escolha as disciplinas</h3><span class="count" id="crSelecionadas">${selected.length} selecionadas</span></div>
          <div class="cr-subjects">${subjectIds.map(id => { const d = DISC_MAP[id]; return `<label class="cr-subject"><input type="checkbox" data-cr-subject="${id}" ${selectedSet.has(id) ? "checked" : ""}><span><b>${escLocal(d.nome)}</b><small>${escLocal(d.cobertura)}</small></span></label>`; }).join("")}</div>
          <p class="hint">Peças processuais, prova oral e tribuna continuam sendo formatos de prova, não foram cadastrados como disciplinas.</p>
        </section>
        <section class="panel"><div class="ph"><h3>4. Distribua seu tempo</h3><div class="row"><button type="button" class="btn small primary" id="crSugerir">Sugerir pelo edital</button><button type="button" class="btn small" id="crIgual">Dividir igualmente</button></div></div>
          <div id="crPesos">${distribuicaoHtml(selected, draftWeights)}</div><p class="hint" id="crTotal" role="status" aria-live="polite"></p><div class="hint" id="crMetodo">${metodoHtml(draftId, selected, draft.pesosModo)}</div><p class="hint">Use vírgula ou ponto, até duas casas. Ao confirmar um percentual, o restante se ajusta para fechar 100%. Você mantém o controle.</p>
        </section>
        <section class="panel"><div class="ph"><h3>Prévia semanal</h3><span class="count" id="crPrevResumo">${minutosPorDia(pPreview)} min por dia selecionado</span></div><div class="cr-week" id="crSemana">${semanaPreview(pPreview)}</div><div class="cr-apply"><label><input type="checkbox" id="crAplicar" ${draft.aplicarMetas !== false ? "checked" : ""}> Aplicar este ritmo às metas do app (tempo, cartões e disciplinas compatíveis)</label><small>Ao salvar, o app atualiza o tempo diário e uma meta de cartões proporcional. A fila de revisão e o FSRS continuam intactos.</small></div><div class="row"><button class="btn primary" type="submit">Salvar e ativar cronograma</button>${salvo.ativo ? `<button class="btn" type="button" id="crPausar">Pausar plano</button>` : ""}</div><p id="crMsg" class="count" role="status"></p></section>
      </form>
      <section class="cr-note"><b>Como a pesquisa foi usada</b><p>O catálogo distingue recorrência documental de peso de prova. O app não chama uma matéria de universal fora do corpus, mostra escolhas opcionais e trata este cronograma como hipótese revisável de organização.</p></section>`;

    const idsSelecionados = () => [...document.querySelectorAll("[data-cr-subject]:checked")].map(x => x.dataset.crSubject);
    const lerCampos = () => {
      const fields = [...document.querySelectorAll("[data-cr-peso]")];
      const weights = {};
      let valido = true;
      for (const f of fields) {
        const n = lerPercentual(f.value);
        const erro = !Number.isFinite(n);
        f.setCustomValidity(erro ? "Digite um percentual de 0 a 100, com até duas casas (ex.: 7,69)." : "");
        f.setAttribute("aria-invalid", String(erro));
        valido = valido && !erro;
        weights[f.dataset.crPeso] = n;
      }
      return { weights, valido };
    };
    const capturarTempo = () => {
      draft.horasSemana = Number($("#crHoras").value);
      draft.blocoMin = Number($("#crBloco").value);
      draft.dias = [...document.querySelectorAll("[data-cr-dia]:checked")].map(x => +x.dataset.crDia);
      draft.aplicarMetas = $("#crAplicar").checked;
    };
    const atualizarPrevia = () => {
      capturarTempo();
      const ids = idsSelecionados(), { weights, valido } = lerCampos();
      const total = Math.round(somaPesos(weights) * 100) / 100;
      $("#crTotal").textContent = !ids.length ? "Selecione ao menos uma disciplina." : !valido ? "Confira os percentuais: 0 a 100, com até duas casas decimais." : `Total: ${formatarPercentual(total)}%${total === 100 ? " · distribuição completa" : " · será ajustado a 100% ao confirmar"}`;
      $("#crSelecionadas").textContent = `${ids.length} selecionadas`;
      if (!valido) return;
      draft.subjects = ids; draft.pesos = weights;
      const preview = { ...draft, pesos: normalizarPercentuais(ids, weights) };
      $("#crSemana").innerHTML = semanaPreview(preview);
      $("#crPrevResumo").textContent = `${minutosPorDia(preview)} min por dia selecionado`;
    };
    const preencher = (weights, modo) => {
      draft.pesos = weights; draft.pesosModo = modo;
      const ids = idsSelecionados(), campos = [...document.querySelectorAll("[data-cr-peso]")];
      if (campos.length === ids.length && campos.every((f, i) => f.dataset.crPeso === ids[i])) {
        campos.forEach(f => { f.value = formatarPercentual(weights[f.dataset.crPeso]); });
      } else $("#crPesos").innerHTML = distribuicaoHtml(ids, weights);
      $("#crMetodo").innerHTML = metodoHtml(draft.editalId, idsSelecionados(), modo);
      atualizarPrevia();
    };
    $("#crBack").onclick = () => { delete S.cronogramaDraft; go("hoje"); };
    $("#crEdital").onchange = e => {
      capturarTempo();
      draft.editalId = e.target.value;
      const referencia = EDITAIS_DPE.find(x => x.id === draft.editalId);
      draft.subjects = coreOrFirst(referencia ? referencia.subjects : CORE);
      draft.pesos = sugerirPesos(draft.editalId, draft.subjects); draft.pesosModo = "edital";
      renderCronograma();
    };
    document.querySelectorAll("[data-cr-subject]").forEach(input => input.onchange = () => {
      const ids = idsSelecionados();
      draft.subjects = ids;
      preencher(sugerirPesos(draft.editalId, ids), "edital");
    });
    $("#crSugerir").onclick = () => preencher(sugerirPesos(draft.editalId, idsSelecionados()), "edital");
    $("#crIgual").onclick = () => preencher(pesosIguais(idsSelecionados()), "igual");
    // Delegação: os novos campos continuam funcionando após trocar matérias.
    $("#crForm").addEventListener("input", atualizarPrevia);
    $("#crForm").addEventListener("change", e => {
      if (!e.target.matches("[data-cr-peso]")) { atualizarPrevia(); return; }
      const { weights, valido } = lerCampos();
      if (!valido) { atualizarPrevia(); return; }
      const ids = idsSelecionados(), fixo = e.target.dataset.crPeso;
      const cent = Math.round(weights[fixo] * 100);
      const outros = ids.filter(id => id !== fixo);
      const restante = normalizarPercentuais(outros, weights, 10000 - cent);
      restante[fixo] = outros.length ? cent / 100 : 100;
      preencher(restante, "manual");
    });
    $("#crPausar")?.addEventListener("click", () => { S.ajustes.cronograma = { ...planoAtual(), ativo: false, atualizadoEm: Date.now() }; queue("ajustes"); delete S.cronogramaDraft; renderCronograma(); });
    $("#crForm").onsubmit = e => {
      e.preventDefault();
      const selectedIds = idsSelecionados();
      if (!selectedIds.length) return $("#crMsg").textContent = "Escolha ao menos uma disciplina.";
      const { weights: informados, valido } = lerCampos();
      if (!valido || somaPesos(informados) <= 0) return $("#crMsg").textContent = "Informe percentuais válidos e reserve tempo para ao menos uma disciplina.";
      if (!$("#crForm").reportValidity()) return;
      capturarTempo();
      if (!draft.dias.length) return $("#crMsg").textContent = "Escolha ao menos um dia para estudar.";
      const days = normalizarDias(draft.dias);
      const weights = normalizarPercentuais(selectedIds, informados);
      const hours = clamp(draft.horasSemana || 5, 1, 60), block = clamp(draft.blocoMin || 40, 15, 180), apply = draft.aplicarMetas;
      const linked = disciplinasDoBaralho(selectedIds);
      const next = { v: 1, ativo: true, editalId: draftId, horasSemana: hours, dias: days, subjects: selectedIds, pesos: weights, pesosModo: draft.pesosModo, pesosMetodoVersao: 1, blocoMin: block, aplicarMetas: apply, deckDisciplinas: linked, atualizadoEm: Date.now() };
      ensureAj(); S.ajustes.cronograma = next;
      if (apply) {
        S.ajustes.minutos = minutosPorDia(next);
        S.ajustes.metaDiaria = metaCartoesPorDia(next);
        if (linked.length) S.ajustes.disciplinas = linked.length === (DECK.disciplinas || []).length ? null : linked;
        const edital = editalSelecionado(next); if (edital && edital.estado) S.ajustes.estado = edital.estado;
      }
      queue("ajustes"); delete S.cronogramaDraft; delete S.cronogramaDraftId; delete S.cronogramaDraftSubjects;
      $("#crMsg").textContent = `Cronograma salvo: ${minutosPorDia(next)} min por dia selecionado e meta de ${metaCartoesPorDia(next)} cartões.`;
      setTimeout(() => go("hoje"), 550);
    };
    atualizarPrevia();
  }

  function hojeCard() {
    const p = planoAtual(); if (!p.ativo) return `<section class="panel cr-today" id="cronogramaHoje"><div><b>Monte seu cronograma de editais</b><p>Escolha horas, dias e matérias; o app transforma a escolha em uma meta possível.</p></div><button class="btn primary small" id="goCronograma">Montar</button></section>`;
    const ed = editalSelecionado(p), dia = agendaHoje(p), minutes = minutosPorDia(p), cards = metaCartoesPorDia(p);
    return `<section class="panel cr-today" id="cronogramaHoje"><div><span class="cr-eyebrow">Cronograma ativo</span><b>${ed ? escLocal(ed.nome) : "Núcleo comum"}</b><p>${dia ? `${minutes} min hoje · ${cards} cartões como referência · ${p.subjects.length} disciplinas` : "Hoje é um dia livre no seu plano. A fila continua disponível sem cobrança."}</p></div><button class="btn small" id="goCronograma">Editar</button></section>`;
  }
  function instalar() {
    if (window.__cronogramaInstalado || typeof S !== "object" || typeof renderHoje !== "function" || typeof renderAjustes !== "function" || typeof render === "undefined") return;
    window.__cronogramaInstalado = true;
    window.renderCronograma = renderCronograma;
    const oldHoje = renderHoje;
    renderHoje = function () { const r = oldHoje.apply(this, arguments); const hero = $("#main .hero"); if (hero && !$("#cronogramaHoje")) hero.insertAdjacentHTML("afterend", hojeCard()); $("#goCronograma")?.addEventListener("click", () => go("cronograma")); return r; };
    const oldAjustes = renderAjustes;
    renderAjustes = function () { const r = oldAjustes.apply(this, arguments); const main = $("#main"); if (main && !$("#ajCronograma")) { main.insertAdjacentHTML("afterbegin", `<section class="panel cr-aj" id="ajCronograma"><div><b>Planejamento por editais</b><p>${planoAtual().ativo ? "Seu cronograma está ativo e conectado às metas diárias." : "Monte uma rotina por edital sem transformar a fila em obrigação."}</p></div><button class="btn small" id="ajCrGo">${planoAtual().ativo ? "Editar cronograma" : "Montar cronograma"}</button></section>`); $("#ajCrGo").onclick = () => go("cronograma"); } return r; };
  }
  window.__cronogramaCatalogo = { CORE, DISC_MAP, EDITAIS_DPE, novoPlano, minutosPorDia, metaCartoesPorDia, disciplinasDoBaralho, normalizarPercentuais, sugerirPesos, lerPercentual };
  (function esperar() { try { if (typeof S === "object" && typeof renderHoje === "function" && typeof renderAjustes === "function" && typeof go === "function") instalar(); else setTimeout(esperar, 150); } catch (_) { setTimeout(esperar, 150); } })();
})();
