// Review DPE · cronograma orientado por editais de Defensor(a) Público(a).
// O catálogo é uma síntese documental dos anexos fornecidos pelo usuário.
// Este módulo não cria cartões: ele organiza horas, dias, disciplinas e metas já existentes.
  (function () {
    "use strict";

  const DISCIPLINAS_EDITAIS = Array.isArray(window.DPE_DISCIPLINAS_CANONICAS) ? window.DPE_DISCIPLINAS_CANONICAS : [];
  const CORE = DISCIPLINAS_EDITAIS.filter(d => d.nucleoComum === true).map(d => d.id);
  const DISC_MAP = Object.fromEntries(DISCIPLINAS_EDITAIS.map(d => [d.id, { ...d }]));

  // 18 editais para a carreira de Defensor(a) Público(a), publicados entre 2021 e 2026.
  // Provas discursivas isoladas, caderno de prova, concurso de servidores e edital de 2014 ficaram fora.
  const EDITAIS_DPE = [
    ["ac-2024","AC",2024,"DPE/AC · VI Concurso"],
    ["ap-2022","AP",2022,"DPE/AP · II Concurso"],
    ["am-2025","AM",2025,"DPE/AM · V Concurso"],
    ["ce-2022","CE",2022,"DPE/CE · Edital 01/2022"],
    ["es-2023","ES",2023,"DPE/ES · V Concurso"],
    ["ma-2026","MA",2026,"DPE/MA · VII Concurso"],
    ["mg-2023","MG",2023,"DPE/MG · IX Concurso"],
    ["mt-2022","MT",2022,"DPE/MT · VI Concurso"],
    ["mt-2025","MT",2025,"DPE/MT · VII Concurso"],
    ["pe-2025","PE",2025,"DPE/PE · IV Concurso"],
    ["rj-2026","RJ",2026,"DPE/RJ · XXIX Concurso"],
    ["ro-2022","RO",2022,"DPE/RO · Edital 01/2022"],
    ["rs-2025","RS",2025,"DPE/RS · VII Concurso"],
    ["sc-2024","SC",2024,"DPE/SC · Concurso 01/2024"],
    ["sc-2026","SC",2026,"DPE/SC · Concurso 01/2026"],
    ["se-2021","SE",2021,"DPE/SE · Edital 01/2021"],
    ["sp-2026","SP",2026,"DPE/SP · X Concurso"],
    ["to-2021","TO",2021,"DPE/TO · Edital 01/2021"]
  ].map(([id, estado, ano, nome]) => {
    const canonicas = window.DPE_CONTEUDOS_EDITAIS?.[id]?.disciplinas.flatMap(d => d.canonicais || []) || [];
    return { id, estado, ano, nome, subjects: [...new Set(canonicas)] };
  });

  const dias = [[1,'Seg'],[2,'Ter'],[3,'Qua'],[4,'Qui'],[5,'Sex'],[6,'Sáb'],[7,'Dom']];
  const escLocal = v => typeof esc === 'function' ? esc(v) : String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normLocal = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
  const motor = () => window.DPE_CRONOGRAMA_MOTOR;
  const programas = () => window.DPE_CONTEUDOS_EDITAIS || {};
  const unidades = p => programas()[p.conteudoId || (p.editalId !== 'comum' ? p.editalId : '')]?.disciplinas || [];
  for (const programa of Object.values(programas())) for (const d of programa.disciplinas) {
    if (!DISC_MAP[d.id]) DISC_MAP[d.id] = {id:d.id,nome:d.nome,cobertura:'Rubrica do programa oficial',aliases:[],canonicais:d.canonicais};
  }
  function disciplina(id,p) { return unidades(p || S.cronogramaDraft || {}).find(d=>d.id===id) || DISC_MAP[id] || {id,nome:id,topicos:[]}; }
  function normalizarPercentuais(ids, weights = {}, totalCent = 10000) {
    if (!ids.length) return {};
    const vals=ids.map(id=>Number.isFinite(+weights[id]) && +weights[id]>0 ? +weights[id] : 0), soma=vals.reduce((a,b)=>a+b,0);
    const ps=ids.map((id,i)=>{const exato=(soma?vals[i]/soma:1/ids.length)*totalCent;return{id,i,cent:Math.floor(exato),resto:exato-Math.floor(exato)};});
    const ordem=ps.slice().sort((a,b)=>b.resto-a.resto||a.i-b.i), saldo=totalCent-ps.reduce((n,x)=>n+x.cent,0);
    for(let i=0;i<saldo;i++) ordem[i%ordem.length].cent++;
    return Object.fromEntries(ps.map(x=>[x.id,x.cent/100]));
  }
  const pesosIguais = ids => normalizarPercentuais(ids);
  function lerPercentual(v) { const s=String(v??'').trim(); if(!/^(?:\d+(?:[.,]\d{1,2})?|[.,]\d{1,2})$/.test(s))return NaN;const n=Number(s.replace(',','.'));return Number.isFinite(n)&&n>=0&&n<=100?n:NaN; }
  const fmt = n => Number(n||0).toFixed(2).replace('.',',');
  const somaPesos = pesos => Object.values(pesos||{}).reduce((s,n)=>s+(+n||0),0);
  function sugerirPesos(editalId, ids) {
    const perfil=window.DPE_PESOS_EDITAIS?.[editalId], bases={}, dados=programas()[editalId]?.disciplinas||[];
    if(!perfil?.grupos?.length)return pesosIguais(ids);
    for(const g of perfil.grupos) for(const id of g.subjects||[]) bases[id]=(bases[id]||0)+g.valor/Math.max(1,g.subjects.length);
    const vals={};
    for(const id of ids) {
      const d=dados.find(x=>x.id===id), refs=d?.canonicais||[id];
      vals[id]=refs.reduce((n,c)=>n+(bases[c]||0),0);
      const proprio=perfil.grupos.find(g=>normLocal(g.label)===normLocal(d?.nome||DISC_MAP[id]?.nome));
      if(proprio)vals[id]=proprio.valor;
    }
    const positivos=Object.values(vals).filter(n=>n>0), reserva=positivos.length?positivos.reduce((a,b)=>a+b,0)/positivos.length:1;
    return normalizarPercentuais(ids,Object.fromEntries(ids.map(id=>[id,vals[id]||reserva])));
  }
  function metodoHtml(id,ids,modo) {
    const perfil=window.DPE_PESOS_EDITAIS?.[id];
    const msg=modo==='manual'?'Distribuição personalizada.':modo==='igual'?'Divisão igual entre as disciplinas selecionadas.':perfil?.grupos?.length?'Sugestão pelo quadro da prova objetiva.':'Divisão equilibrada: não há ponderação numérica verificada para esta referência.';
    return `${msg} Percentuais orientam frequência aproximada dos blocos, não minissessões diárias. Cada disciplina recebe uma visita mínima no ciclo; por isso a proporção real pode diferir, principalmente com pouco tempo. Rubricas combinadas não são duplicadas.${perfil?`<details><summary>Fonte da sugestão de tempo</summary><p>${escLocal(perfil.fonte)} · ${escLocal(perfil.nota)}</p>${perfil.grupos.map(g=>`<p>${escLocal(g.label)}: ${g.valor} · ${escLocal(g.evidencia)}</p>`).join('')}</details>`:''}`;
  }
  function normalizarDias(a) { const ds=[...new Set((a||[]).map(Number).filter(d=>d>=1&&d<=7))].sort((a,b)=>a-b);return ds.length?ds:[1,2,3,4,5]; }
  function novoPlano(editalId='comum') {
    const ref=programas()[editalId], ed=EDITAIS_DPE.find(x=>x.id===editalId), subjects=ref?ref.disciplinas.map(d=>d.id):(ed?ed.subjects:CORE).slice();
    return {v:2,ativo:false,editalId,conteudoId:ref?editalId:'',horasSemana:5,dias:[1,2,3,4,5],subjects,pesos:pesosIguais(subjects),blocoMin:40,revisaoMin:0,aplicarMetas:true,topicosSelecionados:{},escolhas:{},atualizadoEm:0};
  }
  function planoAtual() {
    ensureAj(); const original=S.ajustes.cronograma || novoPlano();
    // Ler um plano anterior não o migra nem sobrescreve percentuais no armazenamento.
    const p=JSON.parse(JSON.stringify(original));
    p.horasSemana=clamp(Number(p.horasSemana)||5,1,60);p.dias=normalizarDias(p.dias);p.blocoMin=clamp(Number(p.blocoMin)||40,15,180);
    p.subjects=[...new Set((p.subjects||CORE).filter(id=>DISC_MAP[id]))];p.pesos=p.pesos||pesosIguais(p.subjects);
    return p;
  }
  function prepararDraft(p) {
    p.conteudoId=p.conteudoId||(p.editalId!=='comum'?p.editalId:'');p.revisaoMin=Number(p.revisaoMin)||0;p.topicosSelecionados=p.topicosSelecionados||{};p.escolhas=p.escolhas||{};
    const ds=unidades(p);
    if(ds.length) {
      const old=p.subjects, oldPesos=p.pesos;
      p.subjects=ds.filter(d=>old.includes(d.id)||(d.canonicais||[]).some(id=>old.includes(id))).map(d=>d.id);
      p.pesos=normalizarPercentuais(p.subjects,Object.fromEntries(p.subjects.map(id=>{const d=ds.find(x=>x.id===id);return[id,oldPesos[id]??d.canonicais.reduce((n,c)=>n+(oldPesos[c]||0),0)];})));
    }
    p.pesosModo=p.pesosModo||(S.ajustes.cronograma?.pesos?'manual':'edital');
    if(!p.ativo&&p.pesosModo==='edital')p.pesos=sugerirPesos(p.editalId,p.subjects);
    return p;
  }
  function editalSelecionado(p) { return EDITAIS_DPE.find(x=>x.id===p.editalId); }
  const minutosPorDia = p => Math.round(p.horasSemana*60/Math.max(1,p.dias.length));
  const metaCartoesPorDia = p => p.v===2 ? (p.revisaoMin>0?clamp(Math.round(p.revisaoMin/4),5,50):0) : clamp(Math.round(minutosPorDia(p)/4),5,50);
  function dataApp() { return typeof dayToDate==='function'?dayToDate(today()):new Date(); }
  function inicioSemana() { const d=dataApp();d.setDate(d.getDate()-((d.getDay()+6)%7));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function semanaAtual(p) { const parse=s=>{const a=s.split('-').map(Number);return Date.UTC(a[0],a[1]-1,a[2]);};return clamp(Math.floor((parse(inicioSemana())-parse(p.inicio||inicioSemana()))/604800000),0,51); }
  function disciplinasDoBaralho(subjects) {
    if(typeof DECK==='undefined')return[];
    return (DECK.disciplinas||[]).filter(d=>subjects.some(id=>{const refs=DISC_MAP[id]?.canonicais||[id];return refs.some(c=>{const nome=normLocal(DISC_MAP[c]?.nome||c),deck=normLocal(d.nome||d.curto||d.id);return deck===nome||deck===normLocal(DISC_MAP[c]?.aliases?.[0]);});})).map(d=>d.id);
  }
  const PALAVRAS_IGNORADAS = new Set('a ao aos as com da das de do dos e em entre fazer geral gerais uma um uns umas na nas no nos o os para por que seu sua suas sobre até após aplicação aplicacao conceito conceitos direito direitos lei leis normas norma princípios principios processo processos teoria disposições disposicoes parte partes forma formas'.split(' '));
  function palavrasAssunto(v) { return [...new Set(normLocal(v).split(' ').filter(p=>p.length>=4&&!PALAVRAS_IGNORADAS.has(p)))]; }
  function disciplinaDeckIds(subjectId,p) {
    if(typeof DECK==='undefined')return new Set();
    const d=disciplina(subjectId,p), nomes=[subjectId,d.nome,...(d.canonicais||[]),...(DISC_MAP[subjectId]?.aliases||[])].map(normLocal).filter(Boolean), ids=new Set([subjectId,...(d.canonicais||[])]);
    for(const item of DECK.disciplinas||[]) if(nomes.includes(normLocal(item.id))||nomes.includes(normLocal(item.nome))||nomes.includes(normLocal(item.curto))) ids.add(item.id);
    return ids;
  }
  function conteudoPlataforma(p,b) {
    const t=b.objeto||{}, cards=typeof DECK==='undefined'||!Array.isArray(DECK.cartoes)?[]:DECK.cartoes, ids=disciplinaDeckIds(b.disciplinaId,p), assunto=palavrasAssunto(`${t.titulo||''} ${t.texto||''}`), titulo=normLocal(t.titulo||'').replace(/^\d+(?:\.\d+)*\s*/,'');
    const daDisciplina=cards.filter(c=>ids.has(c.disc)), avaliados=daDisciplina.map(c=>{
      const tema=normLocal(c.tema||''), texto=normLocal(`${c.tema||''} ${c.frente||''} ${c.verso||''} ${c.porque||''}`), temaPalavras=palavrasAssunto(c.tema||''), inter=assunto.filter(x=>texto.includes(x)), interTema=assunto.filter(x=>temaPalavras.includes(x));
      const exato=!!titulo&&(tema===titulo||tema.includes(titulo)||titulo.includes(tema)), score=(exato?100:0)+interTema.length*12+inter.length*2;
      return {c,score,exato,inter:inter.length,interTema:interTema.length};
    }).filter(x=>x.exato||x.interTema>=2||(x.inter>=2&&assunto.length<=5)).sort((a,b)=>b.score-a.score||String(a.c.id).localeCompare(String(b.c.id))).slice(0,4).map(x=>x.c);
    const termo=(assunto.slice(0,3).join(' ')||titulo||b.topico||'').trim();
    return {cards:avaliados,totalDisciplina:daDisciplina.length,disciplinaId:[...ids].find(id=>cards.some(c=>c.disc===id))||b.disciplinaId,termo};
  }
  function bibliotecaUrlData(resultado) { return `data-cr-biblio-disc="${escLocal(resultado.disciplinaId)}" data-cr-biblio-query="${escLocal(resultado.termo)}"`; }
  function plataformaHtml(resultado) {
    if(resultado.cards.length) return `<section class="cr-platform"><div class="cr-platform-heading"><b>Já temos na plataforma</b><span>${resultado.cards.length} ${resultado.cards.length===1?'cartão relacionado':'cartões relacionados'}</span></div><p>Comece por estes cartões da Biblioteca; eles são a revisão disponível para este assunto, não substituem a leitura do edital.</p><ul class="cr-platform-list">${resultado.cards.map(c=>`<li><b>${escLocal(c.tema||'Cartão de revisão')}</b><span>${escLocal(String(c.frente||c.verso||'').replace(/\s+/g,' ').slice(0,220))}${String(c.frente||c.verso||'').length>220?'…':''}</span></li>`).join('')}</ul><button type="button" class="btn small" data-cr-biblioteca ${bibliotecaUrlData(resultado)}>Abrir estes conteúdos na Biblioteca</button></section>`;
    return `<section class="cr-platform cr-platform-empty"><div class="cr-platform-heading"><b>Conteúdo da plataforma</b><span>${resultado.totalDisciplina?`${resultado.totalDisciplina} cartões na disciplina`:'nenhum cartão associado'}</span></div><p>Não encontrei um cartão específico para este assunto. ${resultado.totalDisciplina?'Você pode consultar os cartões da disciplina e complementar a leitura do edital.':'Este assunto ainda não tem cartões associados no baralho atual.'}</p><button type="button" class="btn small" data-cr-biblioteca ${bibliotecaUrlData(resultado)}>Ver a disciplina na Biblioteca</button></section>`;
  }
  function resumoPlano(p) { return `${escLocal(editalSelecionado(p)?.nome||'Núcleo comum')} · ${p.horasSemana} h/semana · ${p.dias.map(id=>dias.find(x=>x[0]===id)[1]).join(', ')}`; }
  function distribuicaoHtml(ids,weights,p) { return ids.map(id=>`<label class="cr-peso"><span>${escLocal(disciplina(id,p).nome)}</span><input type="text" inputmode="decimal" required autocomplete="off" data-cr-peso="${escLocal(id)}" value="${fmt(weights[id])}" aria-label="Percentual de ${escLocal(disciplina(id,p).nome)}" aria-describedby="crTotal"><b>%</b></label>`).join(''); }
  const registros = () => S.ajustes.cronogramaProgresso || {};
  const chave = (p,b) => motor().chaveTopico(p.conteudoId,b.disciplinaId,b.topicoId);
  function materialHtml(p,b) {
    const t=b.objeto, m=motor().materiais(t,b.nome), origem=programas()[p.conteudoId], plataforma=conteudoPlataforma(p,b);
    const pagina=/^\d+$/.test(t.pagina)?`página ${t.pagina}`:t.pagina;
    const nomes={lexml:'Consultar normas · LexML',stf:'Pesquisar STF',stj:'Pesquisar STJ',volp:'Consultar grafia · VOLP/ABL',ibge:'Consultar dados locais · IBGE'};
    const links=Object.entries(m.consulta).map(([tipo,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${nomes[tipo]}</a>`).join(' ');
    return `<details class="cr-material"><summary>Assunto completo e materiais</summary>${plataformaHtml(plataforma)}<p class="cr-source">${escLocal(origem?.fonte)} · ${escLocal(pagina||'localizador não disponível')}${origem?.fonteUrl?` · <a href="${escLocal(origem.fonteUrl)}" target="_blank" rel="noopener noreferrer">Documento oficial</a>`:''}</p><p class="cr-texto">${escLocal(t.texto)}</p>${m.leis.length?`<p><b>Lei/norma citada neste item:</b> ${escLocal(m.leis.join('; '))}</p>`:m.tipo?'':'<p>O item não numera uma lei específica. Estude primeiro os conceitos; consulte a norma pertinente quando aplicável.</p>'}${m.juris.length?`<p><b>Jurisprudência citada no item:</b> ${escLocal(m.juris.join('; '))}</p>`:m.tipo?'':'<p><b>Jurisprudência:</b> pesquise o assunto abaixo; este item não cita um precedente numerado.</p>'}<p><b>Termo de consulta:</b> ${escLocal(t.titulo)}</p><details class="cr-consulta-externa" ${plataforma.cards.length?'':'open'}><summary>${plataforma.cards.length?'Conferência complementar (opcional)':'Não há cartão específico: conferir nas fontes externas'}</summary><p>Use estas consultas para confirmar vigência, texto original ou jurisprudência depois de estudar o conteúdo da plataforma. Elas não são acórdãos ou materiais didáticos selecionados.</p><div class="cr-fontes">${links}</div></details><ol>${m.orientacao.map(s=>`<li>${escLocal(s)}</li>`).join('')}</ol></details>`;
  }
  function blocoHtml(p,b,ativo=false) {
    if(!b.disciplinaId)return `<article class="cr-bloco cr-revisao"><b>Revisão complementar · ${b.minutos} min</b><p>Revisar não substitui ler o assunto. A fila e o FSRS continuam independentes.</p></article>`;
    const feito=!!registros()[chave(p,b)]?.concluido;
    const disponiveis=disciplina(b.disciplinaId,p).topicos||[];
    return `<article class="cr-bloco ${feito?'cr-feito':''}" data-cr-bloco="${b.id}"><small>${escLocal(b.nome)} · ${b.minutos} min${b.tipo==='revisita'?' · revisita após percorrer os assuntos':''}</small><h4>${escLocal(b.topico)}</h4>${materialHtml(p,b)}${ativo?`<label class="cr-concluir"><input type="checkbox" data-cr-concluir="${escLocal(chave(p,b))}" ${feito?'checked':''}> Estudei este assunto</label>`:`<label class="field cr-trocar"><span>Escolher outro assunto deste bloco</span><select data-cr-trocar="${b.id}">${disponiveis.filter(t=>t.id===b.topicoId||!registros()[motor().chaveTopico(p.conteudoId,b.disciplinaId,t.id)]?.concluido).map(t=>`<option value="${escLocal(t.id)}" ${t.id===b.topicoId?'selected':''}>${escLocal(t.titulo)}</option>`).join('')}</select></label>`}</article>`;
  }
  function semanaPreview(p,w=0) {
    if(!motor()||!unidades(p).length)return dias.map(([id,n])=>`<div class="cr-dia ${p.dias.includes(id)?'':'off'}"><b>${n}</b><small>${p.dias.includes(id)?minutosPorDia(p)+' min disponíveis':'dia livre'}</small>${p.dias.includes(id)?'<p>Escolha o edital de conteúdo para montar os assuntos.</p>':''}</div>`).join('');
    const a=motor().gerarAgenda(p,w);
    return a.dias.map(d=>`<div class="cr-dia ${d.minutos?'':'off'}"><b>${dias[d.dia-1][1]}</b><small>${d.minutos?`${d.minutos} min no dia · ${d.blocos.length} bloco(s)`:'dia livre'}</small>${d.blocos.map(b=>blocoHtml(p,b)).join('')}</div>`).join('');
  }
  function programaHtml(p) {
    const ds=unidades(p), escolhidas=new Set(p.subjects);
    if(!ds.length)return '<p class="hint">Selecione uma referência de conteúdo. O núcleo comum compara matérias, mas não atribui um programa genérico a todos os estados.</p>';
    return ds.filter(d=>escolhidas.has(d.id)).map(d=>`<details class="cr-programa"><summary>${escLocal(d.nome)} · ${d.topicos.length} assuntos</summary>${d.observacao?`<p class="hint">${escLocal(d.observacao)}</p>`:''}<div class="cr-assuntos">${d.topicos.map(t=>`<label data-cr-assunto-linha><input type="checkbox" data-cr-topico="${escLocal(t.id)}" data-cr-disc="${escLocal(d.id)}" ${!Object.hasOwn(p.topicosSelecionados,d.id)||p.topicosSelecionados[d.id].includes(t.id)?'checked':''}><span>${escLocal(t.titulo)} <small>· ${escLocal(/^\d+$/.test(t.pagina)?'p. '+t.pagina:t.pagina)}</small></span></label>`).join('')}</div></details>`).join('');
  }
  function renderCronograma() {
    const salvo=planoAtual();if(!S.cronogramaDraft)S.cronogramaDraft=prepararDraft(planoAtual());
    const draft=S.cronogramaDraft, source=programas()[draft.conteudoId], ds=unidades(draft);
    const offered=ds.length?ds.map(d=>d.id):DISCIPLINAS_EDITAIS.map(d=>d.id);
    const selected=draft.subjects.filter(id=>offered.includes(id));draft.subjects=selected;draft.topicosSelecionados=draft.topicosSelecionados||{};
    let w=semanaAtual(draft);
    const opcoes=selecionado=>EDITAIS_DPE.map(e=>`<option value="${e.id}" ${e.id===selecionado?'selected':''}>${escLocal(e.nome)}</option>`).join('');
    $('#main').innerHTML=`<button class="btn small ghost cr-back" id="crBack">← Hoje</button><section class="cr-hero"><span class="cr-eyebrow">Do edital ao estudo</span><h2>Seu cronograma por assuntos</h2><p>Escolha conteúdo, horas e dias. Estude um assunto de cada vez, com rodízio de disciplinas, lei e jurisprudência. Cartões ficam como revisão complementar.</p>${salvo.ativo?`<div class="cr-status"><b>Plano ativo</b><span>${resumoPlano(salvo)}</span></div>${salvo.v!==2?'<p class="hint">Seu plano anterior permanece salvo. Ative esta versão para trocar a prévia repetitiva por assuntos.</p>':''}`:''}</section>
    <form class="cr-form" id="crForm"><section class="panel"><div class="ph"><h3>1. Conteúdo de referência</h3><span class="count">18 editais</span></div><label class="field"><span>Referência para disciplinas e pesos</span><select id="crEdital"><option value="comum" ${draft.editalId==='comum'?'selected':''}>Núcleo comum dos editais</option>${opcoes(draft.editalId)}</select></label><label class="field"><span>Programa que fornece os assuntos</span><select id="crConteudo"><option value="">Escolha o edital de conteúdo</option>${opcoes(draft.conteudoId)}</select><small class="hint">Use o programa da sua prova. No núcleo comum, você escolhe de qual edital serão os assuntos; não misturamos conteúdos locais.</small></label>${source?`<p class="hint">${escLocal(source.fonte)} · ${ds.length} rubricas · ${ds.reduce((n,d)=>n+d.topicos.length,0)} assuntos${source.fonteUrl?` · <a href="${escLocal(source.fonteUrl)}" target="_blank" rel="noopener noreferrer">Fonte oficial complementar</a>`:''}</p>`:''}</section>
    <section class="panel"><div class="ph"><h3>2. Tempo que cabe na semana</h3></div><div class="cr-grid"><label class="field"><span>Horas por semana</span><input id="crHoras" type="number" min="1" max="60" step="0.5" required value="${draft.horasSemana}"></label><label class="field"><span>Bloco preferido (min)</span><input id="crBloco" type="number" min="15" max="180" step="5" required value="${draft.blocoMin}"><small class="hint">Restos pequenos são incorporados ao bloco, não viram sessões de 3 minutos.</small></label></div><fieldset class="field cr-days"><legend>Dias de estudo</legend><div>${dias.map(([id,n])=>`<label><input type="checkbox" data-cr-dia="${id}" ${draft.dias.includes(id)?'checked':''}> ${n}</label>`).join('')}</div></fieldset><label class="field"><span>Revisão complementar por dia (min)</span><input type="number" id="crRevisao" min="0" max="60" step="5" value="${draft.revisaoMin}"><small class="hint">Opcional. Este tempo sai do orçamento acima; não é uma carga extra. Zero mantém suas preferências atuais de cartões.</small></label></section>
    <section class="panel"><div class="ph"><h3>3. Disciplinas e assuntos</h3><span class="count" id="crSelecionadas">${selected.length} selecionadas</span></div><div class="row"><button type="button" class="btn small" id="crTodos">Selecionar todas do programa</button><button type="button" class="btn small" id="crComuns">Apenas núcleo comum</button></div><div class="cr-subjects">${offered.map(id=>{const d=disciplina(id,draft);return `<label class="cr-subject"><input type="checkbox" data-cr-subject="${escLocal(id)}" ${selected.includes(id)?'checked':''}><span><b>${escLocal(d.nome)}</b><small>${ds.length?d.topicos.length+' assuntos no programa':escLocal(d.cobertura)}</small></span></label>`;}).join('')}</div><p class="hint">Disciplinas sem cartões também entram. Títulos combinados mantêm os assuntos completos do edital.</p><label class="field"><span>Buscar assunto no programa</span><input id="crBuscaAssunto" type="search" placeholder="Ex.: alimentos, execução, português"></label><div id="crPrograma">${programaHtml(draft)}</div></section>
    <section class="panel"><div class="ph"><h3>4. Prioridade dos blocos</h3><div class="row"><button type="button" class="btn small primary" id="crSugerir">Sugerir pelo edital</button><button type="button" class="btn small" id="crIgual">Dividir igualmente</button></div></div><div id="crPesos">${distribuicaoHtml(selected,draft.pesos,draft)}</div><p id="crTotal" class="hint" role="status" aria-live="polite"></p><div id="crMetodo" class="hint">${metodoHtml(draft.editalId,selected,draft.pesosModo)}</div></section>
    <section class="panel"><div class="ph"><h3>Seu ciclo de estudo</h3><span class="count" id="crPrevResumo"></span></div><div class="row cr-semanas"><button type="button" class="btn small" id="crSemanaAnterior">← Semana</button><b id="crSemanaNumero"></b><button type="button" class="btn small" id="crSemanaProxima">Semana →</button></div><p id="crCicloInfo" class="hint" role="status"></p><div class="cr-week" id="crSemana">${semanaPreview(draft,w)}</div><p id="crFuturas" class="hint"></p><div class="cr-apply"><label><input type="checkbox" id="crAplicar" ${draft.aplicarMetas!==false?'checked':''}> Acompanhar os assuntos nas metas da tela Hoje</label><small>Concluir assuntos é uma meta diferente de responder cartões. Só a revisão complementar, se escolhida, ajusta tempo e meta de cartões; o FSRS não muda.</small></div><div class="row"><button class="btn primary" type="submit">Salvar e ativar cronograma</button>${salvo.ativo?'<button class="btn" type="button" id="crPausar">Pausar plano</button>':''}</div><p id="crMsg" class="count" role="status"></p></section></form><section class="cr-note"><b>Uma coisa de cada vez</b><p>Um assunto extenso pode ocupar mais de um bloco. Você pode escolher outro assunto na agenda e retomar o anterior. Registrar estudo não significa domínio; use recuperação ativa e revisões depois.</p>${source?.lacunas?.length?`<details><summary>Observações da fonte</summary>${source.lacunas.map(s=>`<p>${escLocal(s)}</p>`).join('')}</details>`:''}</section>`;
    const ids=()=>[...document.querySelectorAll('[data-cr-subject]:checked')].map(x=>x.dataset.crSubject);
    const capturar=()=>{draft.horasSemana=Number($('#crHoras').value);draft.blocoMin=Number($('#crBloco').value);draft.dias=[...document.querySelectorAll('[data-cr-dia]:checked')].map(x=>+x.dataset.crDia);draft.revisaoMin=Number($('#crRevisao').value)||0;draft.aplicarMetas=$('#crAplicar').checked;};
    const lerCampos=()=>{let valido=true;const pesos={};for(const f of document.querySelectorAll('[data-cr-peso]')){const n=lerPercentual(f.value),erro=!Number.isFinite(n);f.setCustomValidity(erro?'Digite de 0 a 100, até duas casas (ex.: 7,69).':'');f.setAttribute('aria-invalid',String(erro));valido=valido&&!erro;pesos[f.dataset.crPeso]=n;}return{pesos,valido};};
    const previa=()=>{capturar();const l=lerCampos();draft.subjects=ids();$('#crSelecionadas').textContent=`${draft.subjects.length} selecionadas`;$('#crTotal').textContent=!l.valido?'Confira os percentuais.':`Total: ${fmt(somaPesos(l.pesos))}%`;if(!l.valido)return;draft.pesos=l.pesos;
      const p={...draft,pesos:normalizarPercentuais(draft.subjects,draft.pesos)},a=motor()?.gerarAgenda(p,w);$('#crSemana').innerHTML=semanaPreview(p,w);bindBiblioteca($('#crSemana'));$('#crSemanaNumero').textContent=`Semana ${w+1}`;$('#crSemanaAnterior').disabled=w===0;$('#crSemanaProxima').disabled=w===51;$('#crPrevResumo').textContent=`${Math.round(p.horasSemana*60)} min na semana`;
      $('#crCicloInfo').textContent=!ds.length?'Escolha o edital de conteúdo.':a.naoAlocado?'Há tempo sem assunto selecionado. Confira disciplinas, percentuais e tópicos.':`${a.totalConteudoMin} min de conteúdo + ${a.totalRevisaoMin} min de revisão. Rodízio de aproximadamente ${a.cicloSemanas} semana(s). Percentuais são prioridade aproximada, ajustada a blocos úteis.`;
      $('#crFuturas').textContent=a?.proximas.length?'Outras matérias entram nas próximas semanas do ciclo: '+a.proximas.map(id=>disciplina(id,p).nome).join('; ')+'.':a?.fora.length?'Fora da agenda por 0% ou nenhum assunto marcado: '+a.fora.map(id=>disciplina(id,p).nome).join('; ')+'.':'';
    };
    const preencher=(pesos,modo)=>{draft.pesos=pesos;draft.pesosModo=modo;const campos=[...document.querySelectorAll('[data-cr-peso]')],s=ids();if(campos.length===s.length&&campos.every((f,i)=>f.dataset.crPeso===s[i]))campos.forEach(f=>f.value=fmt(pesos[f.dataset.crPeso]));else $('#crPesos').innerHTML=distribuicaoHtml(s,pesos,draft);$('#crMetodo').innerHTML=metodoHtml(draft.editalId,s,modo);previa();};
    const trocarConteudo=(id,pesoId)=>{capturar();draft.conteudoId=id;if(pesoId)draft.editalId=pesoId;const d=unidades(draft);draft.subjects=d.filter(x=>draft.editalId!=='comum'||x.canonicais.some(c=>CORE.includes(c))).map(x=>x.id);draft.pesos=sugerirPesos(draft.editalId,draft.subjects);draft.pesosModo='edital';draft.topicosSelecionados={};draft.escolhas={};draft.inicio=inicioSemana();renderCronograma();};
    $('#crBack').onclick=()=>{delete S.cronogramaDraft;go('hoje');};
    $('#crEdital').onchange=e=>trocarConteudo(e.target.value==='comum'?draft.conteudoId:e.target.value,e.target.value);
    $('#crConteudo').onchange=e=>trocarConteudo(e.target.value);
    const trocarSelecao=()=>{draft.subjects=ids();$('#crPrograma').innerHTML=programaHtml(draft);preencher(sugerirPesos(draft.editalId,draft.subjects),'edital');};
    document.querySelectorAll('[data-cr-subject]').forEach(f=>f.onchange=trocarSelecao);
    $('#crTodos').onclick=()=>{document.querySelectorAll('[data-cr-subject]').forEach(f=>f.checked=true);trocarSelecao();};
    $('#crComuns').onclick=()=>{document.querySelectorAll('[data-cr-subject]').forEach(f=>f.checked=(disciplina(f.dataset.crSubject,draft).canonicais||[f.dataset.crSubject]).some(id=>CORE.includes(id)));trocarSelecao();};
    $('#crSugerir').onclick=()=>preencher(sugerirPesos(draft.editalId,ids()),'edital');$('#crIgual').onclick=()=>preencher(pesosIguais(ids()),'igual');
    $('#crSemanaAnterior').onclick=()=>{w=Math.max(0,w-1);previa();};$('#crSemanaProxima').onclick=()=>{w=Math.min(51,w+1);previa();};
    $('#crBuscaAssunto').oninput=e=>{const q=normLocal(e.target.value);document.querySelectorAll('[data-cr-assunto-linha]').forEach(l=>l.hidden=!normLocal(l.textContent).includes(q));if(q)document.querySelectorAll('.cr-programa').forEach(d=>d.open=!!d.querySelector('[data-cr-assunto-linha]:not([hidden])'));};
    $('#crForm').addEventListener('input',e=>{if(e.target.id!=='crBuscaAssunto'&&!e.target.matches('[data-cr-trocar]'))previa();});
    $('#crForm').addEventListener('change',e=>{const f=e.target;
      if(f.matches('[data-cr-topico]')){const id=f.dataset.crDisc;draft.topicosSelecionados[id]=[...document.querySelectorAll('[data-cr-topico]')].filter(x=>x.dataset.crDisc===id&&x.checked).map(x=>x.dataset.crTopico);previa();return;}
      if(f.matches('[data-cr-trocar]')){draft.escolhas[f.dataset.crTrocar]=f.value;previa();return;}
      if(!f.matches('[data-cr-peso]'))return previa();const l=lerCampos();if(!l.valido)return previa();const fixo=f.dataset.crPeso,cent=Math.round(l.pesos[fixo]*100),outros=ids().filter(id=>id!==fixo);const pesos=normalizarPercentuais(outros,l.pesos,10000-cent);pesos[fixo]=outros.length?cent/100:100;preencher(pesos,'manual');
    });
    $('#crPausar')?.addEventListener('click',()=>{S.ajustes.cronograma={...salvo,ativo:false,atualizadoEm:Date.now()};queue('ajustes');delete S.cronogramaDraft;renderCronograma();});
    $('#crForm').onsubmit=e=>{e.preventDefault();capturar();const l=lerCampos(),s=ids();const msg=t=>$('#crMsg').textContent=t;
      if(!programas()[draft.conteudoId])return msg('Escolha o edital que fornece os assuntos.');if(!s.length)return msg('Escolha ao menos uma disciplina.');if(!l.valido||somaPesos(l.pesos)<=0)return msg('Informe percentuais válidos e reserve tempo para uma disciplina.');if(!$('#crForm').reportValidity())return;if(!draft.dias.length)return msg('Escolha ao menos um dia.');if(draft.horasSemana*60/draft.dias.length>720)return msg('Distribua as horas em mais dias: limite de 12 horas por dia.');if(draft.horasSemana*60/draft.dias.length<15)return msg('Reduza os dias ou aumente o tempo: reserve pelo menos 15 minutos por dia de estudo.');
      const next={...draft,v:2,ativo:true,subjects:s,pesos:normalizarPercentuais(s,l.pesos),inicio:draft.inicio||inicioSemana(),atualizadoEm:Date.now()};
      if(next.revisaoMin>Math.max(0,Math.floor(next.horasSemana*60/next.dias.length)-15))return msg('A revisão não cabe neste orçamento. Reduza a revisão ou aumente as horas, mantendo ao menos 15 minutos de conteúdo por dia.');
      const a=motor().gerarAgenda(next);if(!a.totalConteudoMin||a.naoAlocado)return msg('Marque assuntos e confira disciplinas com percentual positivo.');
      S.ajustes.cronograma=JSON.parse(JSON.stringify(next));
      if(next.aplicarMetas&&next.revisaoMin>0){const minRev=Math.min(...a.dias.filter(d=>d.minutos).map(d=>d.revisaoMin));S.ajustes.minutos=minRev;S.ajustes.metaDiaria=clamp(Math.round(minRev/4),5,50);const linked=disciplinasDoBaralho(s);if(linked.length)S.ajustes.disciplinas=linked.length===(DECK.disciplinas||[]).length?null:linked;}
      queue('ajustes');delete S.cronogramaDraft;msg('Cronograma por assuntos salvo. A revisão permanece separada.');setTimeout(()=>go('hoje'),550);
    };
    previa();
  }
  function hojeCard() {
    const p=planoAtual();if(!p.ativo)return '<section class="panel cr-today" id="cronogramaHoje"><div><b>Seu edital, por assuntos</b><p>Monte blocos de conteúdo com materiais e revisão opcional.</p></div><button class="btn primary small" id="goCronograma">Montar cronograma</button></section>';
    if(p.v!==2||!p.conteudoId||!motor())return '<section class="panel cr-today" id="cronogramaHoje"><div><b>Cronograma ativo · versão anterior preservada</b><p>Escolha o programa de conteúdo para passar a estudar por assuntos.</p></div><button class="btn small" id="goCronograma">Atualizar cronograma</button></section>';
    const a=motor().gerarAgenda(p,semanaAtual(p)),dia=a.dias[(dataApp().getDay()||7)-1],bs=[...new Map(dia.blocos.filter(b=>b.disciplinaId).map(b=>[chave(p,b),b])).values()],feitos=bs.filter(b=>registros()[chave(p,b)]?.concluido).length;
    return `<section class="panel cr-today cr-hoje-conteudo" id="cronogramaHoje"><div><span class="cr-eyebrow">Cronograma ativo · assuntos de hoje</span><b>${resumoPlano(p)}</b><p>${dia.minutos?`${feitos}/${bs.length} assuntos registrados · ${dia.conteudoMin} min de conteúdo · ${dia.revisaoMin} min de revisão`:'Dia livre. Seu ciclo continua no próximo dia escolhido, sem dívida de cartões.'}</p><small>Conclusão registrada não é medida de domínio.</small></div><button class="btn small" id="goCronograma">Editar cronograma</button>${p.aplicarMetas!==false?`<div class="cr-hoje-blocos">${dia.blocos.map(b=>blocoHtml(p,b,true)).join('')}</div>`:''}</section>`;
  }
  function bindBiblioteca(root=document) { root.querySelectorAll('[data-cr-biblioteca]').forEach(b=>b.onclick=()=>{S.libView='';S.libDisc=b.dataset.crBiblioDisc||'';S.libTema='';S.libTipo='';S.libStatus='';S.libQuery=b.dataset.crBiblioQuery||'';go('biblioteca');}); }
  function bindHoje() { $('#goCronograma')?.addEventListener('click',()=>go('cronograma'));bindBiblioteca($('#cronogramaHoje')||document);$('#cronogramaHoje')?.addEventListener('change',e=>{if(!e.target.matches('[data-cr-concluir]'))return;const k=e.target.dataset.crConcluir;S.ajustes.cronogramaProgresso={...registros(),[k]:{concluido:e.target.checked,em:Math.max(Date.now(),(registros()[k]?.em||0)+1)}};queue('ajustes');renderHoje();}); }
  function instalar() {
    if(window.__cronogramaInstalado)return;window.__cronogramaInstalado=true;window.renderCronograma=renderCronograma;
    if(typeof mesclar==='function'){const anterior=mesclar;mesclar=function(L,R){const out=anterior.apply(this,arguments),l=L.ajustes?.cronogramaProgresso||{},r=R.ajustes?.cronogramaProgresso||{},merged={};for(const k of new Set([...Object.keys(l),...Object.keys(r)])){const a=l[k],b=r[k];merged[k]=!a?b:!b?a:(b.em||0)>(a.em||0)?b:a;}out.ajustes.cronogramaProgresso=merged;return out;};}
    const antesHoje=renderHoje;renderHoje=function(){const r=antesHoje.apply(this,arguments),hero=$('#main .hero'),grade=$('#main .rd-dashboard');if(hero&&!$('#cronogramaHoje'))(grade||hero).insertAdjacentHTML(grade?'beforebegin':'afterend',hojeCard());bindHoje();return r;};
    const antesAjustes=renderAjustes;renderAjustes=function(){const r=antesAjustes.apply(this,arguments);if(!$('#ajCronograma')){$('#main').insertAdjacentHTML('afterbegin','<section class="panel cr-aj" id="ajCronograma"><div><b>Planejamento por assuntos do edital</b><p>Conteúdo, materiais e rodízio; revisão é complementar.</p></div><button class="btn small" id="ajCrGo">Abrir cronograma</button></section>');$('#ajCrGo').onclick=()=>go('cronograma');}return r;};
  }
  window.__cronogramaCatalogo={CORE,DISC_MAP,EDITAIS_DPE,novoPlano,minutosPorDia,metaCartoesPorDia,disciplinasDoBaralho,normalizarPercentuais,sugerirPesos,lerPercentual};
  (function esperar(){try{if(typeof S==='object'&&typeof renderHoje==='function'&&typeof renderAjustes==='function'&&typeof go==='function')instalar();else setTimeout(esperar,150);}catch(_){setTimeout(esperar,150);}})();
})();
