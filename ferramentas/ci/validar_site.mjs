// Valida uma pasta pronta para publicação sem acessar a rede nem abrir o baralho cifrado.
// Uso: node ferramentas/ci/validar_site.mjs _site
import { readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const OPÇÕES_PADRÃO = Object.freeze({
  serviceWorker: "sw.js",
  index: "index.html",
  metacognicao: "arquivos/metacognicao.js",
  exigirAppSrc: false,
});

export class ErroValidacaoSite extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = "ErroValidacaoSite";
  }
}

function erro(message, cause) {
  return new ErroValidacaoSite(message, cause ? { cause } : undefined);
}

function arquivoRegular(caminho, descrição) {
  let info;
  try {
    info = statSync(caminho);
  } catch (cause) {
    throw erro(`${descrição} ausente: ${caminho}`, cause);
  }
  if (!info.isFile()) throw erro(`${descrição} não é um arquivo: ${caminho}`);
  return info;
}

function lerTexto(caminho, descrição) {
  arquivoRegular(caminho, descrição);
  try {
    return readFileSync(caminho, "utf8");
  } catch (cause) {
    throw erro(`Não foi possível ler ${descrição}: ${caminho}`, cause);
  }
}

function caminhoDentroDaPasta(pasta, entrada, descrição) {
  if (typeof entrada !== "string" || !entrada || entrada.includes("\0")) {
    throw erro(`${descrição} inválido no CORE: ${String(entrada)}`);
  }
  if (isAbsolute(entrada)) throw erro(`${descrição} absoluto não é permitido no CORE: ${entrada}`);

  const destino = resolve(pasta, entrada);
  const fora = relative(pasta, destino);
  if (fora === ".." || fora.startsWith(`..${sep}`) || isAbsolute(fora)) {
    throw erro(`${descrição} sai da pasta do site: ${entrada}`);
  }
  return destino;
}

/**
 * Executa somente o código necessário do service worker para obter CORE.
 * self.addEventListener é um stub: callbacks registrados nunca são chamados.
 */
export function extrairCore(caminhoSw) {
  const fonte = lerTexto(caminhoSw, "service worker");
  const sandbox = {
    self: { addEventListener() {} },
  };
  const marcador = "__validarSiteCore_7e8a";
  try {
    vm.runInNewContext(
      `${fonte}\n;globalThis.${marcador} = typeof CORE === "undefined" ? undefined : CORE;`,
      sandbox,
      { filename: caminhoSw, timeout: 1000, displayErrors: true },
    );
  } catch (cause) {
    throw erro(`Não foi possível interpretar o service worker ${basename(caminhoSw)}: ${cause.message}`, cause);
  }

  const core = sandbox[marcador];
  if (!Array.isArray(core) || core.length === 0 || !core.every(item => typeof item === "string" && item.length > 0)) {
    throw erro(`O service worker ${basename(caminhoSw)} não declara um CORE válido.`);
  }
  return [...core];
}

function atributo(tag, nome) {
  // O espaço antes do nome impede que data-src/data-id sejam confundidos com o atributo real.
  const padrão = new RegExp("[\\t\\n\\f\\r ]" + nome + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'=<>`]+))", "i");
  const match = tag.match(padrão);
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : null;
}

function scriptsDoHtml(html) {
  const scripts = [];
  const padrão = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match;
  while ((match = padrão.exec(html))) {
    scripts.push({ abertura: `<script${match[1]}>`, conteúdo: match[2] });
  }
  return scripts;
}

function normalizarReferencia(referência) {
  if (typeof referência !== "string") return null;
  const semConsulta = referência.trim().split(/[?#]/, 1)[0];
  if (!semConsulta || /^[a-z][a-z\d+.-]*:/i.test(semConsulta) || semConsulta.startsWith("//")) return null;
  const semRaiz = semConsulta.replace(/^\/+/, "");
  const normalizada = semRaiz.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalizada || normalizada === "." || normalizada.startsWith("../") || normalizada.includes("/../")) return null;
  return normalizada;
}

function referenciaÉ(referência, esperado) {
  return normalizarReferencia(referência) === normalizarReferencia(esperado);
}

function validarSintaxeJavaScript(fonte, caminho, descrição) {
  try {
    // vm.Script apenas compila: não executa o módulo nem o app e não fornece acesso à rede.
    new vm.Script(fonte, { filename: caminho, displayErrors: true });
  } catch (cause) {
    throw erro(`Sintaxe JavaScript inválida em ${descrição} (${caminho}): ${cause.message}`, cause);
  }
}

function localizarAppSrc(html) {
  const encontrados = [];
  for (const script of scriptsDoHtml(html)) {
    if ((atributo(script.abertura, "id") || "") === "app-src") encontrados.push(script.conteúdo);
  }
  return encontrados;
}

/**
 * Valida uma pasta de site estático pronta para publicação.
 * @returns {{pastaSite: string, core: string[], arquivosCore: string[], avisos: string[]}}
 */
export function validarSite(pastaSite, opções = {}) {
  if (typeof pastaSite !== "string" || !pastaSite) throw erro("Informe a pasta do site a validar.");
  let site;
  try {
    site = resolve(pastaSite);
    if (!statSync(site).isDirectory()) throw erro(`A pasta do site não é um diretório: ${site}`);
  } catch (cause) {
    if (cause instanceof ErroValidacaoSite) throw cause;
    throw erro(`Pasta do site ausente ou ilegível: ${site}`, cause);
  }

  const config = { ...OPÇÕES_PADRÃO, ...opções };
  const caminhoSw = caminhoDentroDaPasta(site, config.serviceWorker, "service worker");
  const caminhoIndex = caminhoDentroDaPasta(site, config.index, "index");
  const caminhoMeta = caminhoDentroDaPasta(site, config.metacognicao, "módulo de metacognição");
  if (extname(config.metacognicao).toLowerCase() !== ".js") {
    throw erro(`O módulo de metacognição precisa ter extensão .js: ${config.metacognicao}`);
  }

  const core = extrairCore(caminhoSw);
  const arquivosCore = [];
  for (const entrada of core) {
    const caminho = caminhoDentroDaPasta(site, entrada, "entrada do CORE");
    // "./" é o marcador do diretório-raiz usado pelo cache; os demais itens precisam ser arquivos.
    if (entrada === "." || entrada === "./") {
      if (!statSync(caminho).isDirectory()) throw erro(`A entrada-raiz do CORE não é um diretório: ${entrada}`);
      continue;
    }
    arquivoRegular(caminho, `arquivo obrigatório do CORE (${entrada})`);
    arquivosCore.push(entrada);
  }

  const index = lerTexto(caminhoIndex, "index.html");
  const referênciaMeta = scriptsDoHtml(index).some(script => referenciaÉ(atributo(script.abertura, "src"), config.metacognicao));
  if (!referênciaMeta) {
    throw erro(`index.html não referencia o módulo servido ${config.metacognicao}.`);
  }

  const meta = lerTexto(caminhoMeta, "módulo de metacognição");
  validarSintaxeJavaScript(meta, caminhoMeta, "módulo de metacognição");

  // Retrocompatível com artefatos anteriores: se uma parte do design estiver
  // declarada, exigir as duas dependências e suas referências reais no HTML.
  const scriptVisual = "arquivos/interface.js", cssVisual = "arquivos/interface.css";
  const referencias = scriptsDoHtml(index).filter(s => referenciaÉ(atributo(s.abertura, "src"), scriptVisual));
  const links = [...index.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]).filter(tag => referenciaÉ(atributo(tag, "href"), cssVisual) && (atributo(tag, "rel") || "").toLowerCase() === "stylesheet");
  const temVisual = referencias.length || links.length || core.some(e => referenciaÉ(e, scriptVisual) || referenciaÉ(e, cssVisual));
  if (temVisual) {
    if (referencias.length !== 1 || links.length !== 1) throw erro("O design precisa de uma referência única a interface.js e interface.css no HTML.");
    for (const f of [scriptVisual, cssVisual]) if (!core.some(e => referenciaÉ(e, f))) throw erro(`O design precisa estar no CORE offline: ${f}.`);
    const js = lerTexto(caminhoDentroDaPasta(site, scriptVisual, "interface"), "interface.js");
    validarSintaxeJavaScript(js, scriptVisual, "interface.js");
    const css = lerTexto(caminhoDentroDaPasta(site, cssVisual, "estilos da interface"), "interface.css");
    if (!css.trim()) throw erro("interface.css não pode estar vazio.");
  }

  const scriptCronograma = "arquivos/cronograma.js", cssCronograma = "arquivos/cronograma.css";
  const refsCronograma = scriptsDoHtml(index).filter(s => referenciaÉ(atributo(s.abertura, "src"), scriptCronograma));
  const linksCronograma = [...index.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]).filter(tag => referenciaÉ(atributo(tag, "href"), cssCronograma) && (atributo(tag, "rel") || "").toLowerCase() === "stylesheet");
  const temCronograma = refsCronograma.length || linksCronograma.length || core.some(e => referenciaÉ(e, scriptCronograma) || referenciaÉ(e, cssCronograma));
  if (temCronograma) {
    if (refsCronograma.length !== 1 || linksCronograma.length !== 1) throw erro("O cronograma precisa de uma referência única a cronograma.js e cronograma.css no HTML.");
    for (const f of [scriptCronograma, cssCronograma]) if (!core.some(e => referenciaÉ(e, f))) throw erro(`O cronograma precisa estar no CORE offline: ${f}.`);
    const js = lerTexto(caminhoDentroDaPasta(site, scriptCronograma, "cronograma"), "cronograma.js");
    validarSintaxeJavaScript(js, scriptCronograma, "cronograma.js");
    const css = lerTexto(caminhoDentroDaPasta(site, cssCronograma, "estilos do cronograma"), "cronograma.css");
    if (!css.trim()) throw erro("cronograma.css não pode estar vazio.");
  }

  const appSrc = localizarAppSrc(index);
  const avisos = [];
  if (appSrc.length === 0) {
    const mensagem = "index.html não contém script id=app-src; a sintaxe do código do app não foi verificada.";
    if (config.exigirAppSrc) throw erro(mensagem);
    avisos.push(mensagem);
  } else {
    if (appSrc.length > 1) throw erro("index.html contém mais de um script id=app-src.");
    validarSintaxeJavaScript(appSrc[0], `${caminhoIndex}#app-src`, "app-src");
  }

  return { pastaSite: site, core, arquivosCore, avisos };
}

const executadoDiretamente = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executadoDiretamente) {
  const pasta = process.argv[2];
  if (!pasta) {
    console.error("Uso: node ferramentas/ci/validar_site.mjs _site");
    process.exitCode = 2;
  } else {
    try {
      const resultado = validarSite(pasta);
      console.log(`ok: site válido (${resultado.core.length} entrada(s) no CORE).`);
      for (const aviso of resultado.avisos) console.warn(`::warning::${aviso}`);
    } catch (cause) {
      console.error(`::error::${cause instanceof Error ? cause.message : String(cause)}`);
      process.exitCode = 1;
    }
  }
}
