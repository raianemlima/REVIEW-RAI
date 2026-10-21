import vm from "node:vm";

const ID_VALIDO = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const objeto = valor => valor !== null && typeof valor === "object" && !Array.isArray(valor);
const texto = valor => typeof valor === "string" && valor.trim().length > 0;
const identificador = valor => texto(valor) && ID_VALIDO.test(valor);
const listaDeTextos = valor => Array.isArray(valor) && valor.every(texto);
const normalizarAlias = valor => valor.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

function falha(caminho, motivo) {
  throw new Error(`Contrato do catálogo inválido em ${caminho}: ${motivo}`);
}

/** Valida a taxonomia canônica e o catálogo editorial sem alterar os dados. */
export function validarCatalogoConteudo({ taxonomia, programas, pesos }) {
  if (!Array.isArray(taxonomia) || taxonomia.length === 0) falha("taxonomia", "esperado um array não vazio.");
  if (!objeto(programas) || Object.keys(programas).length === 0) falha("programas", "esperado um objeto de editais não vazio.");

  const canonicos = new Map();
  for (const [i, disciplina] of taxonomia.entries()) {
    const caminho = `taxonomia[${i}]`;
    if (!objeto(disciplina) || !identificador(disciplina.id)) falha(caminho, "id estável inválido.");
    if (canonicos.has(disciplina.id)) falha(caminho, `id canônico duplicado: ${disciplina.id}.`);
    if (!texto(disciplina.nome) || !texto(disciplina.cobertura)) falha(caminho, "nome e cobertura são obrigatórios.");
    if (!Array.isArray(disciplina.aliases) || disciplina.aliases.length === 0 || !listaDeTextos(disciplina.aliases)) falha(caminho, "aliases deve ser um array não vazio de textos.");
    const aliases = disciplina.aliases.map(normalizarAlias);
    if (new Set(aliases).size !== aliases.length) falha(caminho, "aliases duplicados após normalização.");
    if (typeof disciplina.nucleoComum !== "boolean") falha(caminho, "nucleoComum deve ser booleano.");
    if (disciplina.somenteUI !== undefined && typeof disciplina.somenteUI !== "boolean") falha(caminho, "somenteUI, quando presente, deve ser booleano.");
    canonicos.set(disciplina.id, disciplina);
  }
  if (![...canonicos.values()].some(d => d.nucleoComum)) falha("taxonomia", "ao menos uma disciplina deve integrar o núcleo comum.");

  const usados = new Set();
  const idsTopicos = new Set();
  let quantidadeDisciplinas = 0;
  for (const [chave, programa] of Object.entries(programas)) {
    const caminho = `programas.${chave}`;
    if (!objeto(programa) || programa.id !== chave || !identificador(programa.id)) falha(caminho, "id deve ser válido e igual à chave do programa.");
    if (!texto(programa.fonte)) falha(caminho, "fonte é obrigatória.");
    if (programa.fonteUrl !== undefined) {
      if (!texto(programa.fonteUrl)) falha(caminho, "fonteUrl não pode ser vazia.");
      let url;
      try { url = new URL(programa.fonteUrl); } catch { falha(caminho, "fonteUrl deve ser uma URL absoluta."); }
      if (!['http:', 'https:'].includes(url.protocol)) falha(caminho, "fonteUrl deve usar HTTP ou HTTPS.");
    }
    if (programa.lacunas !== undefined && !listaDeTextos(programa.lacunas)) falha(caminho, "lacunas deve ser um array de textos não vazios.");
    if (!Array.isArray(programa.disciplinas) || programa.disciplinas.length === 0) falha(caminho, "disciplinas deve ser um array não vazio.");
    const idsDisciplinas = new Set();
    for (const [di, disciplina] of programa.disciplinas.entries()) {
      const caminhoDisciplina = `${caminho}.disciplinas[${di}]`;
      quantidadeDisciplinas++;
      if (!objeto(disciplina) || !identificador(disciplina.id) || !texto(disciplina.nome)) falha(caminhoDisciplina, "id e nome são obrigatórios.");
      if (idsDisciplinas.has(disciplina.id)) falha(caminhoDisciplina, `id de rubrica duplicado no edital: ${disciplina.id}.`);
      idsDisciplinas.add(disciplina.id);
      if (!Array.isArray(disciplina.canonicais) || !disciplina.canonicais.every(identificador)) falha(caminhoDisciplina, "canonicais deve ser um array de IDs canônicos; vazio é permitido quando não há correspondência segura.");
      if (new Set(disciplina.canonicais).size !== disciplina.canonicais.length) falha(caminhoDisciplina, "canonicais contém IDs repetidos.");
      for (const id of disciplina.canonicais) {
        if (!canonicos.has(id)) falha(caminhoDisciplina, `ID canônico desconhecido: ${id}.`);
        usados.add(id);
      }
      for (const campo of ["nomeOriginal", "observacao"]) {
        if (disciplina[campo] !== undefined && !texto(disciplina[campo])) falha(caminhoDisciplina, `${campo}, quando presente, não pode ser vazio.`);
      }
      if (!Array.isArray(disciplina.topicos) || disciplina.topicos.length === 0) falha(caminhoDisciplina, "topicos deve ser um array não vazio.");
      const ids = new Set();
      for (const [ti, topico] of disciplina.topicos.entries()) {
        const caminhoTopico = `${caminhoDisciplina}.topicos[${ti}]`;
        if (!objeto(topico) || !identificador(topico.id)) falha(caminhoTopico, "id estável inválido.");
        if (ids.has(topico.id)) falha(caminhoTopico, `id de tópico duplicado na rubrica: ${topico.id}.`);
        ids.add(topico.id);
        if (!texto(topico.titulo) || !texto(topico.texto) || !(texto(topico.pagina) || Number.isSafeInteger(topico.pagina) && topico.pagina > 0)) falha(caminhoTopico, "titulo, texto e localizador pagina (texto ou inteiro positivo) são obrigatórios.");
        if (!listaDeTextos(topico.leis) || !listaDeTextos(topico.juris)) falha(caminhoTopico, "leis e juris devem ser arrays de textos (podem estar vazios).");
        idsTopicos.add(`${programa.id}:${disciplina.id}:${topico.id}`);
      }
    }
  }

  for (const [id, disciplina] of canonicos) {
    if (disciplina.somenteUI === true && usados.has(id)) falha(`taxonomia.${id}`, "somenteUI não pode ser usado como referência de conteúdo.");
    if (!usados.has(id) && disciplina.somenteUI !== true) falha(`taxonomia.${id}`, "disciplina não referenciada no conteúdo; marque somenteUI apenas se for realmente exclusiva da interface.");
  }

  if (pesos !== undefined) {
    if (!objeto(pesos)) falha("pesos", "esperado um objeto de perfis.");
    for (const [editalId, perfil] of Object.entries(pesos)) {
      const caminho = `pesos.${editalId}`;
      if (!Object.hasOwn(programas, editalId)) falha(caminho, "perfil sem edital correspondente no catálogo de conteúdo.");
      if (!objeto(perfil) || !Array.isArray(perfil.grupos)) falha(caminho, "grupos deve ser um array.");
      const presentesNoEdital = new Set(programas[editalId].disciplinas.flatMap(d => d.canonicais));
      for (const [gi, grupo] of perfil.grupos.entries()) {
        const cg = `${caminho}.grupos[${gi}]`;
        if (!objeto(grupo) || !texto(grupo.label) || !Array.isArray(grupo.subjects)) falha(cg, "label e array subjects são obrigatórios; vazio indica que não há vínculo seguro no catálogo.");
        if (!grupo.subjects.every(identificador)) falha(cg, "subjects deve conter IDs canônicos válidos.");
        if (new Set(grupo.subjects).size !== grupo.subjects.length) falha(cg, "subjects contém IDs repetidos.");
        for (const id of grupo.subjects) {
          if (!canonicos.has(id)) falha(cg, `ID canônico desconhecido: ${id}.`);
          if (canonicos.get(id).somenteUI === true) falha(cg, `ID exclusivo da interface não pode ser peso documental: ${id}.`);
          if (!presentesNoEdital.has(id)) falha(cg, `ID canônico ${id} não está ligado a rubrica de programas.${editalId}.`);
        }
      }
    }
  }

  return { editais: Object.keys(programas).length, disciplinas: quantidadeDisciplinas, topicos: idsTopicos.size, canonicas: canonicos.size, usadas: usados.size };
}

/** Carrega somente módulos de dados em VM sem rede, DOM ou acesso ao processo. */
export function validarFontesCatalogo({ fonteTaxonomia, fonteProgramas, fontePesos, nomes = {} }) {
  const ambiente = { window: {} };
  const módulos = [
    ["taxonomia", fonteTaxonomia, nomes.taxonomia || "cronograma-taxonomia.js"],
    ["programas", fonteProgramas, nomes.programas || "cronograma-conteudo.js"],
  ];
  if (fontePesos !== undefined && fontePesos !== null) módulos.push(["pesos", fontePesos, nomes.pesos || "cronograma-pesos.js"]);
  for (const [tipo, fonte, nome] of módulos) {
    if (typeof fonte !== "string" || !fonte.trim()) falha(nome, "arquivo de dados vazio ou ausente.");
    try {
      const script = new vm.Script(fonte, { filename: nome, displayErrors: true });
      script.runInNewContext(ambiente, { timeout: 2000, codeGeneration: { strings: false, wasm: false } });
    } catch (cause) {
      throw new Error(`Não foi possível carregar ${nome}: ${cause.message}`, { cause });
    }
    if (tipo === "taxonomia" && ambiente.window.DPE_DISCIPLINAS_CANONICAS === undefined) falha(nome, "não publica window.DPE_DISCIPLINAS_CANONICAS.");
    if (tipo === "programas" && ambiente.window.DPE_CONTEUDOS_EDITAIS === undefined) falha(nome, "não publica window.DPE_CONTEUDOS_EDITAIS.");
    if (tipo === "pesos" && ambiente.window.DPE_PESOS_EDITAIS === undefined) falha(nome, "não publica window.DPE_PESOS_EDITAIS.");
  }
  return validarCatalogoConteudo({
    taxonomia: ambiente.window.DPE_DISCIPLINAS_CANONICAS,
    programas: ambiente.window.DPE_CONTEUDOS_EDITAIS,
    pesos: ambiente.window.DPE_PESOS_EDITAIS,
  });
}
