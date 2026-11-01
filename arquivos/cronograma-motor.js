// Ciclo de conteúdo independente do baralho e do FSRS.
(function (root) {
  'use strict';
  const arr = x => Array.isArray(x) ? x : [];
  const unique = xs => [...new Set(arr(xs).filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()))];
  const finite = (x, fallback = 0) => Number.isFinite(Number(x)) ? Number(x) : fallback;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function obterDisciplinas(id) { return arr(root.DPE_CONTEUDOS_EDITAIS?.[id]?.disciplinas); }
  function chaveTopico(edital, disciplina, topico) { return [edital, disciplina, topico].map(x => String(x ?? '')).join(':'); }
  function materiais(topico, nomeDisciplina = '') {
    const leis = unique(topico?.leis), juris = unique(topico?.juris);
    const nome = nomeDisciplina.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if (nome.includes('portugues')) return {tipo:'idioma',leis,juris,consulta:{volp:'https://www.academia.org.br/nossa-lingua/busca-no-vocabulario'},orientacao:[
      'Leia a regra gramatical do assunto e identifique exemplos e exceções.',
      'Para dúvidas de grafia, consulte o VOLP da Academia Brasileira de Letras; ele não substitui uma gramática.',
      'Resolva questões de Português do tópico, explique cada alternativa e anote os erros recorrentes.'
    ]};
    if (nome.includes('historia') || nome.includes('geografia') || nome.includes('formacao da populacao')) return {tipo:'local',leis,juris,consulta:{ibge:'https://cidades.ibge.gov.br/'},orientacao:[
      'Identifique o estado e o recorte histórico/geográfico exigido no item.',
      'Consulte as informações históricas e territoriais do IBGE e compare com a bibliografia exigida pelo edital.',
      'Produza um resumo e resolva questões do assunto; não trate dados atuais como fatos históricos de outro período.'
    ]};
    return { leis, juris, consulta: {
      lexml: 'https://www.lexml.gov.br/',
      stf: 'https://portal.stf.jus.br/jurisprudencia/',
      stj: 'https://www.stj.jus.br/sites/portalp/paginas/Sob-medida/Advogado/Jurisprudencia/Pesquisa-de-Jurisprudencia.aspx'
    }, orientacao: [
      'Leia o item do edital e explique seus conceitos com suas palavras.',
      ...(leis.length ? ['Localize e leia a norma citada: ' + leis.join('; ') + '.'] : ['Localize a legislação pertinente ao assunto; o item não fornece uma norma numerada específica.']),
      ...(juris.length ? ['Consulte a referência citada: ' + juris.join('; ') + '.'] : ['Pesquise no STF/STJ os termos do assunto, verificando contexto, tese e vigência; não há julgado numerado citado neste item.']),
      'Resolva questões do assunto e registre dúvidas. Marque concluído somente após estudar; o tempo do bloco não conclui o tópico automaticamente.'
    ] };
  }
  function gerarAgenda(p = {}, semana = 0) {
    semana = clamp(Math.floor(finite(semana)), 0, 51);
    const unidades = obterDisciplinas(p.conteudoId || p.editalId);
    const byId = new Map(unidades.map(d => [d.id, d]));
    const ids = unique(p.subjects).filter(id => byId.has(id));
    const pesos = p.pesos || {}, filtro = p.topicosSelecionados || {};
    const elegiveis = ids.map(id => {
      const d = byId.get(id), ts = arr(d.topicos);
      const topics = Object.hasOwn(filtro, id) ? ts.filter(t => arr(filtro[id]).includes(t.id)) : ts;
      return { id, d, topics, peso: Math.max(0, finite(pesos[id])) };
    }).filter(x => x.peso > 0 && x.topics.length);
    const fora = ids.filter(id => !elegiveis.some(x => x.id === id));
    const dias = [...new Set(arr(p.dias).map(Number).filter(d => Number.isInteger(d) && d >= 1 && d <= 7))].sort((a,b) => a-b);
    const totalDesejado = Math.max(0, Math.round(finite(p.horasSemana) * 60));
    const pref = clamp(finite(p.blocoMin, 40), 15, 180);
    const revisao = Math.max(0, Math.floor(finite(p.revisaoMin)));
    const saida = Array.from({length:7}, (_,i) => ({dia:i+1,minutos:0,conteudoMin:0,revisaoMin:0,blocos:[]}));
    const slots = [];
    for (let i = 0; i < dias.length; i++) {
      const dia = dias[i], budget = Math.floor(totalDesejado / dias.length) + (i < totalDesejado % dias.length ? 1 : 0);
      const rev = Math.min(revisao, Math.max(0, budget - 15)), content = budget - rev;
      const out = saida[dia-1];
      if (rev > 0) {
        out.revisaoMin = rev; out.minutos = rev;
        out.blocos.push({id:`w${semana}-d${dia}-r0`,disciplinaId:null,nome:'Revisão complementar',topicoId:null,topico:null,objeto:null,minutos:rev,tipo:'revisao'});
      }
      if (!elegiveis.length || content <= 0) continue;
      // Não fragmentar um resto de 3–14 minutos: ele entra nos blocos úteis.
      let n = Math.max(1, Math.floor(content / pref));
      if (content - n * pref >= 15) n++;
      n = Math.max(1, Math.min(n, Math.floor(content / 15) || 1));
      for (let b = 0; b < n; b++) slots.push({dia,b,minutos:Math.floor(content / n) + (b < content % n ? 1 : 0)});
    }
    const ordenadas = elegiveis.slice().sort((a,b) => b.peso-a.peso || a.id.localeCompare(b.id));
    const ciclo = ordenadas.slice();
    if (ordenadas.length) {
      const soma = ordenadas.reduce((n,x) => n+x.peso,0), extras = ordenadas.length;
      const quotas = ordenadas.map((x,i) => { const v=extras*x.peso/soma; return {x,i,n:Math.floor(v),resto:v-Math.floor(v)}; });
      let saldo = extras - quotas.reduce((n,x) => n+x.n,0);
      const restos = quotas.slice().sort((a,b) => b.resto-a.resto || a.i-b.i);
      for (let i=0;i<saldo;i++) restos[i].n++;
      let anterior = ciclo.at(-1)?.id;
      while (quotas.some(x => x.n > 0)) {
        const disponiveis = quotas.filter(x => x.n > 0).sort((a,b) => b.n-a.n || a.i-b.i);
        const proxima = disponiveis.find(x => x.x.id !== anterior) || disponiveis[0];
        ciclo.push(proxima.x); proxima.n--; anterior = proxima.x.id;
      }
    }
    const usados = {}, voltas = {}, escolhas = p.escolhas || {};
    // Percorrer as semanas anteriores mantém sequência e IDs estáveis no horizonte.
    if (ciclo.length && slots.length) for (let w=0;w<=semana;w++) for (let k=0;k<slots.length;k++) {
      const unidade = ciclo[(w*slots.length+k)%ciclo.length];
      const slot = slots[k], id = `w${w}-d${slot.dia}-b${slot.b}`;
      const fila = usados[unidade.id] || (usados[unidade.id] = new Set());
      if (fila.size === unidade.topics.length) {
        fila.clear(); voltas[unidade.id] = (voltas[unidade.id] || 0) + 1;
      }
      const manual = unidade.topics.find(t => t.id === escolhas[id]);
      const topico = manual || unidade.topics.find(t => !fila.has(t.id));
      fila.add(topico.id);
      if (w !== semana) continue;
      const bloco = {id,disciplinaId:unidade.id,nome:unidade.d.nome,topicoId:topico.id,topico:topico.titulo,objeto:topico,minutos:slot.minutos,tipo:voltas[unidade.id] ? 'revisita' : 'estudo'};
      const out = saida[slot.dia-1];out.blocos.push(bloco);out.minutos+=slot.minutos;out.conteudoMin+=slot.minutos;
    }
    const naSemana = unique(saida.flatMap(d => d.blocos.map(b => b.disciplinaId)));
    return {dias:saida,semana,totalMin:saida.reduce((n,d) => n+d.minutos,0),totalConteudoMin:saida.reduce((n,d) => n+d.conteudoMin,0),totalRevisaoMin:saida.reduce((n,d) => n+d.revisaoMin,0),
      cicloSemanas:Math.max(1,Math.ceil(ciclo.length/Math.max(1,slots.length))),naSemana,proximas:elegiveis.map(x => x.id).filter(id => !naSemana.includes(id)),fora,
      naoAlocado:Math.max(0,totalDesejado-saida.reduce((n,d) => n+d.minutos,0)),aviso: 'Rodízio com visita mínima por disciplina. Percentuais orientam a frequência aproximada; o tempo real depende de blocos inteiros.'};
  }
  // ---- ligação assunto do cronograma → conteúdo do próprio app (cartões, lei seca, teses/súmulas, questões) ----
  const normB = v => String(v ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/(\d)\.(?=\d{3}\b)/g,'$1').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const IGNORADAS = new Set('a ao aos as com da das de do dos e em entre fazer geral gerais uma um uns umas na nas no nos o os ou para pela pelas pelo pelos por que se seu sua seus suas sobre ate apos aplicacao conceito conceitos direito direitos lei leis normas norma principios processo processos teoria disposicoes parte partes forma formas especie especies regime regras tipos tipo natureza juridica juridico juridicos efeitos caracteristicas classificacao nocoes legislacao brasileiro brasileira codigo artigo artigos inclusive demais outros outras decreto constituicao constitucional federal brasil relativo relativa relativos relativas acordo especial especiais'.split(' '));
  const raiz = w => w.length >= 7 ? w.slice(0, 6) : w.replace(/s$/, '');
  const raizes = txt => [...new Set(normB(txt).split(' ').filter(w => w.length >= 4 && !IGNORADAS.has(w) && !/^\d+$/.test(w)).map(raiz))];
  const numerosLei = txt => [...new Set([...normB(txt).matchAll(/\b(\d{3,6})(?: (?:de )?\d{4}| \d{2}\b)?/g)].map(m => m[1]).filter(n => !/^(19|20)\d\d$/.test(n)))];
  const NOMES_CODIGO = [['codigo penal','cp'],['processo penal','cpp'],['codigo civil','cc'],['processo civil','cpc'],['constituicao','cf'],['execucao penal','lep'],['crianca e do adolescente','eca'],['defesa do consumidor','cdc'],['introducao as normas','lindb']];
  function siglasLei(txt) { const n = normB(txt); return NOMES_CODIGO.filter(([nome]) => n.includes(nome)).map(([, s]) => s); }
  function refsJuris(txt) { const n = normB(txt), out = []; for (const m of n.matchAll(/\bsumula (vinculante )?(?:n )?(\d{1,3})\b/g)) out.push((m[1] ? 'sv' : 's') + m[2]); for (const m of n.matchAll(/\btema (?:n )?(\d{1,4})\b/g)) out.push('t' + m[1]); return out; }
  const _cacheIdx = new WeakMap();
  function prep(texto, extra = '') { return { n: ' ' + normB(texto) + ' ', r: new Set(raizes(texto + ' ' + extra)), refs: new Set(refsJuris(texto)) }; }
  function indexar(fontes) {
    const chaveLen = (fontes.cartoes || []).length + ':' + (fontes.leiseca || []).length;
    const hit = _cacheIdx.get(fontes); if (hit && hit.k === chaveLen) return hit.idx;
    const cartoes = arr(fontes.cartoes).map(c => ({ c, p: prep(`${c.tema || ''} ${c.frente || ''} ${c.verso || ''} ${c.porque || ''} ${c.origem || ''}`), t: new Set(raizes(c.tema || '')) }));
    const leis = arr(fontes.leiseca).map(d => {
      const nome = `${d.nome || ''} ${d.curto || ''} ${d.id || ''}`, arts = [];
      arr(d.grupos).forEach((g, gi) => arr(g?.itens).forEach(x => { if (x && x.a !== undefined && x.a !== '') arts.push({ a: x.a, r: x.r, gi, p: prep(x.x || '') }); }));
      return { d, nome: ' ' + normB(nome) + ' ', nums: new Set(numerosLei(nome)), siglas: new Set([...siglasLei(nome), normB(d.id)]), r: new Set(raizes(nome)), arts };
    });
    const teses = arr(fontes.teses).map(x => ({ x, p: prep(`${x.tipo || ''} ${x.num ? 'tema ' + x.num : ''} ${x.processo || ''} ${x.texto || ''}`), ramo: x.ramo || '' }));
    const sumulas = arr(fontes.sumulas).map(x => ({ x, p: prep(`${x.tipo || ''} ${x.enunciado || ''}`), ramo: x.ramo || '' }));
    const questoes = []; arr(fontes.provas).forEach(P => arr(P?.questoes).forEach(q => questoes.push({ P, q, p: prep(`${q.enunciado || ''} ${Object.values(q.alternativas || {}).join(' ')}`), t: new Set(raizes(`${q.assunto || ''}`)), ramo: q.materia || '' })));
    const idx = { cartoes, leis, teses, sumulas, questoes }; _cacheIdx.set(fontes, { k: chaveLen, idx }); return idx;
  }
  const semDireito = s => normB(s).replace(/^(direitos? |nocoes de |legislacao )(do |da |de |dos |das )?/, '').trim();
  function ramoCompativel(ramo, nomes) { if (!ramo) return null; const partes = String(ramo).split(/[\/,;·]| e /).map(semDireito).filter(x => x.length >= 4); return partes.some(r => nomes.some(n => n && (n === r || n.includes(r) || r.includes(n)))); }
  function avaliar(p, q, extraTitulo) {
    const tit = q.tit.filter(r => p.r.has(r) || (extraTitulo && extraTitulo.has(r))).length;
    const txt = q.txt.filter(r => p.r.has(r)).length;
    const lei = q.nums.some(n => p.n.includes(' ' + n + ' ')) || q.siglas.some(s => p.n.includes(' ' + s + ' '));
    const ref = q.refs.some(r => p.refs.has(r));
    return { tit, txt, lei, ref };
  }
  function aceita(a, q, discOk) {
    if (a.ref) return discOk !== false || a.tit >= 1;
    if (discOk === false) return false;
    const n = q.tit.length, minTit = n <= 2 ? n : Math.max(2, Math.ceil(n * 0.5));
    if (n === 1 && q.txt.length && !a.lei && a.txt < 1) return false;
    if (a.lei) return a.tit >= Math.min(1, n) && (discOk || a.tit >= Math.min(2, n));
    if (!n) return false;
    return discOk === null ? a.tit >= Math.max(minTit, Math.min(n, 3)) : a.tit >= minTit;
  }
  const pontos = (a, discOk) => a.ref * 60 + a.lei * 30 + a.tit * 12 + a.txt * 2 + (discOk ? 6 : 0);
  // consulta: {titulo, texto, leis[], juris[], discIds[], discNomes[]}; devolve grupos tema/lei/juris/questoes já ordenados
  function montarConsulta(c) {
    const titulo = String(c.titulo || '').replace(/^\s*\d+(?:\.\d+)*\.?\s*/, '').split(/\s\d+\.\d+\.?\s/)[0].split(/[:;]/)[0], textoLeis = arr(c.leis).join(' ') + ' ' + titulo + ' ' + (c.texto || '');
    const q = { tit: raizes(titulo), txt: raizes(c.texto || '').filter(r => !raizes(titulo).includes(r)).slice(0, 14), nums: numerosLei(arr(c.leis).join(' ') + ' ' + titulo), siglas: siglasLei(arr(c.leis).join(' ')), refs: refsJuris(arr(c.juris).join(' ') + ' ' + textoLeis) };
    if (!q.tit.length) q.tit = q.txt.splice(0, 3);
    return { titulo, q };
  }
  // todos os cartões ligados ao assunto (mesmo critério de relacionarConteudo, sem limite): liberam a revisão depois do estudo
  function cartoesDoAssunto(fontes, consulta) {
    const idx = indexar(fontes || {}), c = consulta || {}, { q } = montarConsulta(c), discIds = new Set(arr(c.discIds)), out = [];
    for (const it of idx.cartoes) {
      const discOk = it.c.disc == null ? null : discIds.has(it.c.disc);
      if (aceita(avaliar(it.p, q, it.t), q, discOk)) out.push(it.c.id);
    }
    return out;
  }
  function relacionarConteudo(fontes, consulta, limite = 4) {
    const idx = indexar(fontes || {}), c = consulta || {};
    const { titulo, q } = montarConsulta(c);
    const discIds = new Set(arr(c.discIds)), nomes = arr(c.discNomes).map(semDireito).filter(Boolean);
    const top = l => l.sort((a, b) => b.s - a.s || String(a.k).localeCompare(String(b.k)));
    const tema = [], lei = [], juris = [], questoes = [];
    for (const it of idx.cartoes) {
      const discOk = it.c.disc == null ? null : discIds.has(it.c.disc), a = avaliar(it.p, q, it.t);
      if (!aceita(a, q, discOk)) continue;
      const tipo = it.c.tipo, alvo = tipo === 'lei_seca' ? lei : tipo === 'jurisprudencia' ? juris : tipo === 'multipla_escolha' ? questoes : tema;
      alvo.push({ fonte: 'cartao', k: it.c.id, s: pontos(a, discOk), item: it.c, motivo: a.ref ? 'referência citada' : a.lei ? 'mesma lei' : 'mesmo assunto' });
    }
    for (const L of idx.leis) {
      const porLei = q.nums.some(n => L.nums.has(n)) || q.siglas.some(s => L.siglas.has(s)), arts = [];
      for (const art of L.arts) { const a = avaliar(art.p, q); if (a.tit >= Math.min(2, q.tit.length || 2) || (porLei && a.tit + a.txt >= 2)) arts.push({ art, s: a.tit * 12 + a.txt * 2 }); }
      top(arts.map(x => ({ ...x, k: x.art.a })));
      if (porLei || arts.length) lei.push({ fonte: 'leiseca', k: L.d.id, s: (porLei ? 50 : 0) + (arts[0]?.s || 0), item: L.d, artigos: arts.slice(0, 3).map(x => ({ a: x.art.a, r: x.art.r, gi: x.art.gi })), motivo: porLei ? 'lei citada no edital' : 'artigos sobre o assunto' });
    }
    for (const [lista, fonte] of [[idx.teses, 'tese'], [idx.sumulas, 'sumula']]) for (const it of lista) {
      const discOk = ramoCompativel(it.ramo, nomes), a = avaliar(it.p, q);
      if (aceita(a, q, discOk === null ? null : discOk)) juris.push({ fonte, k: fonte + (it.x.num || it.x.tipo || ''), s: pontos(a, discOk), item: it.x, motivo: a.ref ? 'precedente citado' : a.lei ? 'mesma lei' : 'mesmo assunto' });
    }
    for (const it of idx.questoes) {
      const discOk = ramoCompativel(it.ramo, nomes), a = avaliar(it.p, q, it.t), b = avaliar({ n: it.p.n, r: it.t, refs: it.p.refs }, q);
      if (aceita({ ...a, tit: b.tit }, q, discOk)) questoes.push({ fonte: 'prova', k: it.P.id + ':' + it.q.n, s: pontos(a, discOk) + (it.q.gabarito === 'X' ? -20 : 0), item: it.q, prova: it.P, motivo: a.ref ? 'referência citada' : a.lei ? 'mesma lei' : 'mesmo assunto' });
    }
    const g = (l) => ({ total: l.length, itens: top(l).slice(0, limite) });
    // lei que o próprio edital cita sempre aparece (até 12), antes das sugestões por assunto; o limite vale para o resto
    const gLei = (l) => { const t = top(l), cit = t.filter(x => x.motivo === 'lei citada no edital').slice(0, 12); return { total: l.length, itens: [...cit, ...t.filter(x => !cit.includes(x))].slice(0, Math.max(limite, cit.length)) }; };
    return { tema: g(tema), lei: gLei(lei), juris: g(juris), questoes: g(questoes), termos: q.tit.slice(0, 4), assunto: titulo.trim().replace(/[.;:,]+$/, ''), leisCitadas: q.nums, total: tema.length + lei.length + juris.length + questoes.length };
  }
  root.DPE_CRONOGRAMA_MOTOR = { gerarAgenda, obterDisciplinas, chaveTopico, materiais, relacionarConteudo, cartoesDoAssunto };
})(typeof window !== 'undefined' ? window : globalThis);
