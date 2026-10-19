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
  root.DPE_CRONOGRAMA_MOTOR = { gerarAgenda, obterDisciplinas, chaveTopico, materiais };
})(typeof window !== 'undefined' ? window : globalThis);
