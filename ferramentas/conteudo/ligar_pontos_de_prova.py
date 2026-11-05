"""Liga os e-books "Pontos de prova" aos assuntos dos editais do Cronograma (botão "Ler o resumo").

    python3 -I ferramentas/conteudo/ligar_pontos_de_prova.py PASTA_JSON [--ver edital]

Lê os pdp-*.json (gerados por pontos_de_prova.py) e arquivos/cronograma-conteudo.js, e grava em cada JSON o campo
"editais": {edital: {id do assunto: [capítulo, posição do título no capítulo, 1]}}, o mesmo formato dos resumos por
matéria (a posição é o índice do título, ## a ######, dentro do capítulo, como o leitor do app numera as âncoras).

A ligação é por REGRAS revisadas à mão (RE_*): cada regra diz, para uma disciplina do catálogo, qual seção de qual
e-book trata do assunto cujo título casa com a expressão. Vale a primeira regra que casar. Assunto sem regra fica de
fora (não vira "sem resumo"), para o Cronograma continuar mostrando o resumo de outro e-book, se houver.
"""
import json
import os
import re
import sys
import unicodedata

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


# (disciplinas canônicas, e-book, início do título da seção, expressão sobre o título do assunto normalizado)
R = lambda canon, eb, sec, rx: (set(canon.split()), eb, norm(sec), re.compile(rx))
CIV, PC, PEN, CRI, ADM, TRI, CON = "direito_civil", "direito_processual_civil", "direito_penal", "criminologia", "direito_administrativo", "direito_tributario", "direito_do_consumidor"
REGRAS = [
    # ---- Civil
    R(CIV, "pdp-cpc-e-direito-civil", "Desconsideração da personalidade", r"desconsideracao"),
    R(CIV, "pdp-cpc-e-direito-civil", "Responsabilidade patrimonial", r"fraude (a execucao|contra credores)|responsabilidade patrimonial"),
    R(CIV, "pdp-cpc-e-direito-civil", "Sucessões: inventário", r"inventario|partilha"),
    R(CIV, "pdp-civil", "Prescrição e decadência", r"prescricao|decadencia"),
    R(CIV, "pdp-civil", "LINDB e fontes", r"introducao as normas|lindb|fontes do direito|vigencia|conflito (das )?leis|eficacia das leis|interpretacao e integracao|lei de introducao"),
    R(CIV, "pdp-civil", "Pessoa jurídica", r"pessoas? juridicas?|associac|fundac"),
    R(CIV, "pdp-civil", "Pessoa natural", r"pessoas? naturais?|personalidade|nascituro|domicilio|nome civil|ausencia"),
    R(CIV, "pdp-civil", "Bens", r"\bbens\b|dos bens|bem de familia"),
    R(CIV, "pdp-cpc-e-direito-civil", "Provas (CC", r"\bprovas?\b|da prova"),
    R(CIV, "pdp-civil", "Negócio jurídico", r"negocio juridico|negocios juridicos|fatos? juridicos?|atos? juridicos?|defeitos|invalidade|nulidade|lesao|simulacao|representacao"),
    R(CIV, "pdp-civil", "Elementos e espécies", r"responsabilidade civil|ato ilicito|extracontratual|\bdano|indenizac"),
    R(CIV, "pdp-civil", "Contratos em espécie", r"contratos? em especie|compra e venda|doacao|locacao|emprestimo|mutuo|fianca|mandato|deposito|seguro|transacao|contratos tipicos|empreitada|prestacao de servicos|corretagem|transporte"),
    R(CIV, "pdp-civil", "Teoria geral e princípios", r"\bcontratos?\b"),
    R(CIV, "pdp-civil", "Teoria geral", r"obrigac|adimplemento|inadimplemento|\bmora\b|cessao de credito|assuncao de divida|pagamento|clausula penal|transmissao"),
    R(CIV, "pdp-civil", "Elementos e espécies", r"responsabilidade civil|ato ilicito|\bdano|indenizac"),
    R(CIV, "pdp-civil", "Propriedade e aquisição", r"propriedade|usucapiao|condominio|superficie|servidao|usufruto|laje|hipoteca|penhor|alienacao fiduciaria|direitos? reais?|multipropriedade"),
    R(CIV, "pdp-civil", "Posse", r"posse|direito das coisas"),
    R(CIV, "pdp-civil", "Alimentos", r"alimentos"),
    R(CIV, "pdp-civil", "Filiação e parentesco", r"filiacao|parentesco|poder familiar|protecao da pessoa dos filhos|guarda|adocao|reconhecimento de filhos|tutela|curatela"),
    R(CIV, "pdp-civil", "Casamento e união estável", r"esponsais|casamento|uniao estavel|regime de bens|divorcio|entidades familiares|direito de familia|conjugal|separacao|familia"),
    R(CIV, "pdp-civil", "Sucessão testamentária", r"testament|legado|codicilo"),
    R(CIV, "pdp-civil", "Ordem da vocação", r"vocacao hereditaria|herdeiros"),
    R(CIV, "pdp-civil", "Sucessão em geral", r"sucess|heranca"),
    # ---- Processo civil
    R(PC, "pdp-processo-civil", "Aplicação do CPC/2015 no tempo", r"^(direito|direito processual) intertemporal|sucessao de leis|^transicao"),
    R(PC, "pdp-processo-civil", "Estabilização", r"estabiliza"),
    R(PC, "pdp-processo-civil", "Tutela da evidência", r"evidencia"),
    R(PC, "pdp-processo-civil", "Tutela de urgência", r"urgencia"),
    R(PC, "pdp-processo-civil", "Tutela cautelar antecedente", r"cautelar"),
    R(PC, "pdp-processo-civil", "Conceitos (arts. 294", r"tutelas? provisoria|tutela antecipada|tutelas? de urgencia"),
    R(PC, "pdp-processo-civil", "Ação de exigir contas", r"exigir contas|prestacao de contas"),
    R(PC, "pdp-processo-civil", "Ações possessórias", r"possess|reintegracao|interdito|manutencao de posse"),
    R(PC, "pdp-processo-civil", "Demarcação e divisão", r"demarca|divisao de terras|divisao e demarcacao"),
    R(PC, "pdp-processo-civil", "Dissolução parcial", r"dissolucao (parcial )?de sociedade|dissolucao parcial"),
    R(PC, "pdp-processo-civil", "Inventário e partilha", r"inventario|partilha|arrolamento"),
    R(PC, "pdp-processo-civil", "Embargos de terceiro", r"embargos de terceiro"),
    R(PC, "pdp-processo-civil", "Ações de família", r"acoes de familia|divorcio|separacao|uniao estavel|\bguarda\b|acoes? de alimentos|alimentos"),
    R(PC, "pdp-processo-civil", "Ação monitória", r"monitori"),
    R(PC, "pdp-processo-civil", "Jurisdição voluntária", r"jurisdicao voluntaria|interdicao|curatela|alvara|usucapiao extrajudicial"),
    R(PC, "pdp-processo-civil", "Teoria geral", r"^procedimentos? especiais?|^procedimentos do processo de conhecimento"),
    R(PC, "pdp-cpc-e-direito-civil", "Negócios jurídicos processuais", r"^negocios? (juridicos? )?processuais?|^calendario|^convencoes processuais"),
    R(PC, "pdp-cpc-e-direito-civil", "Responsabilidade patrimonial", r"responsabilidade patrimonial|fraude a execucao"),
    R(PC, "pdp-processo-civil-geral", "Ação rescisória e reclamação", r"rescisoria|reclamacao"),
    R(PC, "pdp-processo-civil-geral", "Recursos", r"processos? nos tribunais|meios de impugnacao"),
    R(PC, "pdp-processo-civil-geral", "Execução de título", r"tutela jurisdicional executiva|execucao|executiv"),
    R(PC, "pdp-processo-civil-geral", "Precedentes", r"precedente|sumulas? vinculante|irdr|incidente de resolucao de demandas|assuncao de competencia|jurisprudencia"),
    R(PC, "pdp-processo-civil-geral", "Recursos", r"recurso|apelacao|agravo|embargos de declaracao|embargos de divergencia|ordem dos processos|processos? nos tribunais"),
    R(PC, "pdp-processo-civil-geral", "Cumprimento de sentença", r"cumprimento de sentenca|cumprimento provisorio"),
    R(PC, "pdp-processo-civil-geral", "Execução de título", r"execucao|titulo executivo|penhora|embargos a execucao|expropriacao|adjudicacao"),
    R(PC, "pdp-processo-civil-geral", "Coisa julgada", r"coisa julgada"),
    R(PC, "pdp-processo-civil-geral", "Sentença", r"sentenca|liquidacao|julgamento do processo"),
    R(PC, "pdp-processo-civil-geral", "Provas", r"\bprovas?\b|da prova|prova pericial|prova testemunhal|prova documental|ata notarial"),
    R(PC, "pdp-processo-civil-geral", "Resposta do réu", r"resposta do reu|contestacao|reconvencao|revelia|audiencia de conciliacao|providencias preliminares|julgamento conforme"),
    R(PC, "pdp-processo-civil-geral", "Petição inicial", r"peticao inicial|improcedencia liminar|pedido|processo de conhecimento|procedimento comum"),
    R(PC, "pdp-processo-civil-geral", "Formação, suspensão", r"formacao|suspensao do processo|extincao do processo|suspensao e extincao"),
    R(PC, "pdp-processo-civil-geral", "Atos processuais", r"atos processuais|prazos|comunicacao dos atos|citacao|intimacao|nulidade|processo eletronico|cooperacao nacional|calendario"),
    R(PC, "pdp-processo-civil-geral", "Atos processuais", r"prerrogativas"),
    R(PC, "pdp-processo-civil-geral", "Litisconsórcio", r"litisconsorcio|intervencao de terceiros|assistente|assistencia (simples|litisconsorcial)|denunciacao|chamamento|amicus|desconsideracao"),
    R(PC, "pdp-processo-civil-geral", "Honorários", r"honorarios|gratuidade|justica gratuita|assistencia juridica|custas|despesas processuais"),
    R(PC, "pdp-processo-civil-geral", "Competência", r"competencia|cooperacao|conflito de competencia"),
    R(PC, "pdp-cpc-novidades", "Estrutura e normas", r"normas fundamentais do processo|^codigo de processo civil|^novo codigo"),
    R(PC, "pdp-processo-civil-geral", "Jurisdição, ação e processo", r"jurisdicao|normas fundamentais|principios do processo|teoria geral do processo|pressupostos processuais|condicoes da acao|sujeitos do processo"),
    # ---- Penal
    R(PEN, "pdp-penal", "Medidas de segurança, ação penal", r"medidas? de seguranca|acao penal|punibilidade|prescricao|extincao da punibilidade|saude mental|perdao|decadencia"),
    R(PEN, "pdp-penal", "Concurso de pessoas", r"concurso de pessoas|autoria|participacao"),
    R(PEN, "pdp-penal", "Penas", r"\bpenas?\b|penologia|sancao penal|livramento|suspensao condicional|reincidencia|efeitos da condenacao|dosimetria|concurso de crimes|aplicacao da pena|sistema progressivo"),
    R(PEN, "pdp-penal", "Crimes contra a pessoa", r"contra a pessoa|homicidio|lesao corporal|crimes contra a honra|feminicidio|aborto"),
    R(PEN, "pdp-penal", "Crimes contra o patrimônio", r"contra o patrimonio|furto|roubo|estelionato|receptacao|extorsao"),
    R(PEN, "pdp-penal", "Dignidade sexual", r"dignidade sexual|fe publica|paz publica|contra a administracao publica|estupro"),
    R(PEN, "pdp-penal", "Teoria do crime", r"teoria do (delito|crime)|\bcrime\b|tipicidade|tipo penal|o tipo e|ilicitude|antijuridicidade|culpabilidade|imputabilidade|\bdolo\b|\bculpa\b|iter criminis|tentativa|consumacao|arrependimento|desistencia|\berro\b|excludentes|causalidade|conduta|crime impossivel|elementos do crime"),
    R(PEN, "pdp-penal", "Noções e princípios", r"principios|fontes do direito penal|conceito|aplicacao da lei penal|lei penal|constituicao|historia|evolucao|ciencia do direito penal|garantismo|direito penal e poder punitivo|imunidades penais|disposicoes constitucionais"),
    # ---- Criminologia (e temas criminológicos dentro de Penal)
    R(CRI + " " + PEN, "pdp-criminologia", "Sistema carcerário", r"carcerari|encarceramento|prisionizacao|sistema penitenciario|politica criminal e penitenciaria|privatizacao"),
    R(CRI + " " + PEN, "pdp-criminologia", "Crime organizado", r"crime organizado|bullying|assedio|stalking|guerra as drogas"),
    R(CRI + " " + PEN, "pdp-criminologia", "Modelos de justiça", r"justica restaurativa|justica terapeutica"),
    R(CRI + " " + PEN, "pdp-criminologia", "Abolicionismo", r"abolicion|minimalismo|neorrealismo|inimigo|velocidades|emergencia|midia|modernas tendencias|tendencias do pensamento|garantismo"),
    R(CRI + " " + PEN, "pdp-criminologia", "Cifras criminais", r"cifras?|estatistica criminal"),
    R(CRI + " " + PEN, "pdp-criminologia", "Teorias legitimadoras da pena", r"teorias da pena|funcoes da pena|finalidades? da pena|legitimadoras"),
    R(CRI + " " + PEN, "pdp-criminologia", "Prevenção do delito", r"prevencao|reacao ao delito|politica criminal"),
    R(CRI + " " + PEN, "pdp-criminologia", "Origem e conceito", r"vitim"),
    R(CRI + " " + PEN, "pdp-criminologia", "Labelling approach", r"labelling|reacao social|etiquetamento|criminalizacao"),
    R(CRI + " " + PEN, "pdp-criminologia", "Criminologia crítica", r"criminologia critica|marxis|criminologia (feminista|queer|cultural|radical)|racismo"),
    R(CRI + " " + PEN, "pdp-criminologia", "Escola de Chicago", r"chicago|janelas quebradas|associacao diferencial|aprendizagem social|ecologica"),
    R(CRI + " " + PEN, "pdp-criminologia", "Anomia", r"anomia"),
    R(CRI + " " + PEN, "pdp-criminologia", "Subcultura", r"subcultura"),
    R(CRI + " " + PEN, "pdp-criminologia", "Quadro comparativo", r"escolas? (criminologicas?|penais|classica|positiva)|positivismo|iluminismo|pensamento penal|genealogia|modelos teoricos"),
    R(CRI, "pdp-criminologia", "Conceito e características", r"conceito|objeto|metodo|funcoes da criminologia|^criminologia$|sistema penal e controle social"),
    # ---- Administrativo
    R(ADM, "pdp-administrativo", "Estrutura", r"improbidade|8\.429|14\.230"),
    R(ADM, "pdp-administrativo", "PAD", r"processo (administrativo )?disciplinar|sindicancia"),
    R(ADM, "pdp-administrativo", "Lei 9.784/99", r"processo administrativo|9\.784|9784"),
    R(ADM, "pdp-administrativo", "Controle da administração", r"controle"),
    R(ADM, "pdp-administrativo", "Intervenção na propriedade", r"intervencao do estado na propriedade|intervencao na propriedade|desapropriacao|tombamento|servidao administrativa|requisicao|limitacoes administrativas"),
    R(ADM, "pdp-administrativo", "Bens públicos", r"bens publicos|uso de bem|dominio publico"),
    R(ADM, "pdp-administrativo", "Regra geral (CF art. 37", r"responsabilidade (civil )?do estado|responsabilidade extracontratual|responsabilidade civil da administracao"),
    R(ADM, "pdp-administrativo", "Concessões", r"concessa|permissao|parcerias? publico-privada|\bppp\b|delegacao de servicos|autorizacao de servico"),
    R(ADM, "pdp-administrativo", "Serviço público", r"servicos? publicos?|prestacao de servicos publicos"),
    R(ADM, "pdp-administrativo", "Estatais", r"13\.303|empresas estatais|estatuto juridico da empresa"),
    R(ADM, "pdp-administrativo", "Sanções e controle", r"sancoes|lei anticorrupcao|12\.846|responsabilizacao.*pessoas juridicas|inidoneidade"),
    R(ADM, "pdp-administrativo", "Registro de preços", r"registro de precos"),
    R(ADM, "pdp-administrativo", "Contratação direta", r"dispensa|inexigibilidade|contratacao direta"),
    R(ADM, "pdp-administrativo", "Contratos (Lei 14.133", r"contratos? administrativos?|contratos da administracao|negocios juridicos da administracao|convenios|14\.133"),
    R(ADM, "pdp-administrativo", "Modalidades e critérios", r"modalidades|pregao|concorrencia|diálogo competitivo|dialogo competitivo"),
    R(ADM, "pdp-administrativo", "Quadro geral", r"licitac|licitacoes|8\.666|10\.520"),
    R(ADM, "pdp-administrativo", "Aposentadoria", r"aposentadoria|previdencia do servidor|regime proprio"),
    R(ADM, "pdp-administrativo", "Responsabilidade do servidor", r"responsabilidade dos servidores|abuso de autoridade|responsabilidade administrativa do servidor"),
    R(ADM, "pdp-administrativo", "Classificação e regime", r"agentes publicos|servidores? publicos?|cargos?|concurso|acumulacao|estabilidade|regime juridico dos servidores|8\.112"),
    R(ADM, "pdp-administrativo", "Poderes administrativos", r"poderes? administrativos?|poder de policia|poder regulamentar|poder hierarquico|poder disciplinar|\bpoderes\b"),
    R(ADM, "pdp-administrativo", "Extinção: anulação", r"anulacao|revogacao|convalidacao|invalidacao"),
    R(ADM, "pdp-administrativo", "Atos administrativos: requisitos", r"atos? administrativos?|requisitos|atributos|elementos do ato|vicios"),
    R(ADM, "pdp-administrativo", "Entes de cooperação", r"terceiro setor|organizacoes sociais|oscip|servicos sociais autonomos|entes de cooperacao|entidades paraestatais|parcerias com"),
    R(ADM, "pdp-administrativo", "Administração direta e indireta", r"administracao (direta|indireta|publica indireta)|autarqui|fundacoes publicas|empresas publicas|sociedades? de economia mista|agencias|organizacao administrativa|descentralizacao|desconcentracao|consorcios? publicos?|entidades da administracao"),
    R(ADM, "pdp-administrativo", "Princípios (CF art. 37", r"principios"),
    R(ADM, "pdp-administrativo", "Função administrativa", r"regime juridico|funcao administrativa|^direito administrativo|conceito|fontes|sistemas administrativos|reforma administrativa|^administracao publica"),
    # ---- Tributário
    R(TRI, "pdp-tributario", "Reforma tributária", r"reforma tributaria|\bibs\b|\bcbs\b|214|economia digital|liberdade, estado fiscal"),
    R(TRI, "pdp-tributario", "Planejamento tributário", r"planejamento|elisao"),
    R(TRI, "pdp-tributario", "Isenção, anistia", r"isencao|anistia|remissao|beneficios fiscais|123/2006|simples nacional|microempresa"),
    R(TRI, "pdp-tributario", "Repartição de receitas", r"reparticao|distribuic(ao|oes) de receitas|participacao.*receitas"),
    R(TRI, "pdp-tributario", "Municipais", r"municip|\biptu\b|\biss\b|\bitbi\b"),
    R(TRI, "pdp-tributario", "Estaduais e distrital", r"dos estados|\bicms\b|\bipva\b|itcmd|estaduais"),
    R(TRI, "pdp-tributario", "Federais", r"impostos da uniao|tributos da uniao|imposto de renda|\bipi\b|\biof\b|imposto de importacao|\bitr\b|tributos federais"),
    R(TRI, "pdp-tributario", "Execução fiscal", r"execucao fiscal|processo judicial tributario|6\.830|6830"),
    R(TRI, "pdp-tributario", "Fiscalização e dívida ativa", r"administracao tributaria|fiscalizacao|divida ativa|certidoes|processo administrativo tributario"),
    R(TRI, "pdp-tributario", "Garantias e privilégios", r"garantias|privilegios"),
    R(TRI, "pdp-tributario", "Exclusão do crédito", r"exclusao"),
    R(TRI, "pdp-tributario", "Extinção do crédito", r"extincao"),
    R(TRI, "pdp-tributario", "Suspensão da exigibilidade", r"suspensao"),
    R(TRI, "pdp-tributario", "Decadência e prescrição", r"decadencia|prescricao"),
    R(TRI, "pdp-tributario", "Lançamento", r"lancamento|credito tributario"),
    R(TRI, "pdp-tributario", "Sujeição passiva", r"responsabilidade tributaria|sujeicao passiva|sujeito passivo|contribuinte|substituicao tributaria"),
    R(TRI, "pdp-tributario", "Obrigação tributária e fato gerador", r"obrigacao tributaria|fato gerador"),
    R(TRI, "pdp-tributario", "Legislação tributária", r"legislacao tributaria|vigencia|interpretacao|integracao|fontes do direito tributario|normas gerais|aplicacao"),
    R(TRI, "pdp-tributario", "Imunidades", r"imunidade"),
    R(TRI, "pdp-tributario", "Princípios (CF art. 150)", r"principios|limitacoes ao poder de tributar|limitacoes"),
    R(TRI, "pdp-tributario", "Competência tributária", r"competencia tributaria|sistema tributario|federalismo fiscal"),
    R(TRI, "pdp-tributario", "Espécies", r"especies tributarias|impostos, taxas|\btaxas?\b|contribuicoes|emprestimos compulsorios|contribuicao de melhoria"),
    R(TRI, "pdp-tributario", "Conceito de tributo", r"^tributos?$|conceito de tributo|nocao de tributo|^tributos\b|^direito tributario$"),
    # ---- Consumidor
    R(CON, "pdp-consumidor", "Sistema de proteção", r"sistema nacional|sancoes administrativas|infracoes penais|decreto.*2\.181|2\.181|infracoes|senacon|procon"),
    R(CON, "pdp-consumidor", "Tutela individual e coletiva", r"em juizo|acoes coletivas|interesses (difusos|coletivos)|acoes de responsabilidade do fornecedor"),
    R(CON, "pdp-consumidor", "Contratos e cláusulas abusivas", r"contratual|contratos|clausulas|superendividamento|planos? e seguros|14\.181|planos de saude"),
    R(CON, "pdp-consumidor", "Práticas comerciais", r"praticas comerciais|publicidade|oferta|cobranca|cadastro|banco de dados|comercio eletronico|ambiente digital|marketing"),
    R(CON, "pdp-consumidor", "Desconsideração", r"desconsideracao"),
    R(CON, "pdp-consumidor", "Responsabilidade pelo fato", r"fato (ou defeito )?do produto|responsabilidade (civil )?pelo fato|pelo fato|defeito|acidente de consumo|responsabilidade do fornecedor|qualidade de produtos"),
    R(CON, "pdp-consumidor", "Responsabilidade por vício", r"vicio|prazos decadenciais|decadencia|garantia legal|garantia contratual"),
    R(CON, "pdp-consumidor", "Elementos da relação", r"servicos publicos|relacao (juridica )?de consumo|\bconsumidor\b.*conceito|fornecedor|integrantes|servicos publicos e o cdc|objeto da relacao|destinatario final"),
    R(CON, "pdp-consumidor", "Natureza do CDC", r"natureza|fontes?|fundamentos constitucionais|principios|caracteristicas|politica nacional|direito do consumidor|8\.078|direitos basicos|codigo de defesa"),
    # ---- Pessoa com deficiência (só se o assunto citar deficiência etc.)
    R("direitos_humanos direito_antidiscriminatorio direito_pessoas_idosas_deficiencia direitos_difusos_e_coletivos direito_do_idoso", "pdp-pessoa-com-deficiencia", "Crimes contra a pessoa com", r"(defici|inclus).*(crime|infracao)|crimes?.*defici"),
    R("direitos_humanos direito_antidiscriminatorio direito_pessoas_idosas_deficiencia direitos_difusos_e_coletivos direito_do_idoso", "pdp-pessoa-com-deficiencia", "Acessibilidade", r"acessibilidade"),
    R("direitos_humanos direito_antidiscriminatorio direito_pessoas_idosas_deficiencia direitos_difusos_e_coletivos direito_do_idoso", "pdp-pessoa-com-deficiencia", "Capacidade civil", r"capacidade.*defici|defici.*capacidade|tomada de decisao apoiada"),
    R("direitos_humanos direito_antidiscriminatorio direito_pessoas_idosas_deficiencia direitos_difusos_e_coletivos direito_do_idoso", "pdp-pessoa-com-deficiencia", "Hierarquia normativa", r"convencao.*pessoas com deficiencia|nova york|estatuto da pessoa com deficiencia|13\.146|lei brasileira de inclusao"),
    R("direitos_humanos direito_antidiscriminatorio direito_pessoas_idosas_deficiencia direitos_difusos_e_coletivos direito_do_idoso", "pdp-pessoa-com-deficiencia", "Conceito jurídico", r"pessoas? com deficiencia|deficiencia"),
]


# assuntos que os e-books não tratam (legislação penal especial, execução penal etc.)
SEM_RESUMO = re.compile(r"^legislacao penal especial|^lei |execucao penal|^direito da execucao")


def indice_secoes(e):
    """{início do título normalizado -> [capítulo, índice do título no capítulo]} só para '##'; guarda a ordem."""
    res = []
    for ci, c in enumerate(e["caps"]):
        k = 0
        for l in c["md"].split("\n"):
            m = re.match(r"^(#{2,6})\s+(.*)$", l)
            if m:
                if len(m.group(1)) == 2:
                    res.append((norm(m.group(2).replace("*", "")), ci, k))
                k += 1
    return res


def carregar_editais():
    s = open(os.path.join(RAIZ, "arquivos", "cronograma-conteudo.js"), encoding="utf-8").read()
    i = s.index("window.DPE_CONTEUDOS_EDITAIS = ") + len("window.DPE_CONTEUDOS_EDITAIS = ")
    return json.loads(s[i:s.index("\n", i)].rstrip(";"))


def titulo_limpo(t):
    t = re.sub(r"\[[^\]]*\]", " ", t)
    t = re.sub(r"^\s*[\d.]+\s*", "", t)
    return norm(t).strip(" .;:")


def cabeca(t):
    """Primeira frase do título (sem 'Ponto I · alínea a —'): o tema principal de um assunto composto."""
    t = re.sub(r"^\s*ponto [ivx]+\s*·?\s*(alinea [a-z]\s*)?[—-]?\s*", "", titulo_limpo(t))
    return re.split(r"\.\s|:\s|;\s", t)[0].strip(" .;:")


def ligar(ebooks, editais, ver=None, estrito=True):
    por_id = {e["id"]: e for e in ebooks}
    sec = {i: indice_secoes(e) for i, e in por_id.items()}
    # cada regra aponta para uma seção que precisa existir
    prontas = []
    for canon, eb, ini, rx in REGRAS:
        if eb not in por_id:
            continue
        alvo = next(((ci, k) for t, ci, k in sec[eb] if t.startswith(ini)), None)
        if alvo is None:
            if estrito:
                sys.exit(f"seção não encontrada em {eb}: {ini!r}")
            continue
        prontas.append((canon, eb, alvo, rx, ini))
    saida = {i: {} for i in por_id}
    for ed, dados in editais.items():
        for disc in dados["disciplinas"]:
            cs = set(disc.get("canonicais", []))
            for t in disc["topicos"]:
                tit = titulo_limpo(t["titulo"])
                if not tit or SEM_RESUMO.search(tit):
                    continue
                achou = False
                # 1º o tema principal (primeira frase); só se nada casar, o título inteiro
                composto = bool(re.match(r"^\s*ponto [ivx]+", norm(t["titulo"])))
                for alvo in ((cabeca(t["titulo"]),) if composto else (cabeca(t["titulo"]), tit)):
                    for canon, eb, (ci, k), rx, ini in prontas:
                        if cs & canon and alvo and rx.search(alvo):
                            saida[eb].setdefault(ed, {})[t["id"]] = [ci, k, 1]
                            if ver == ed:
                                print(f"{t['titulo'][:62]!r:66} -> {eb} › {ini[:34]}")
                            achou = True
                            break
                    if achou:
                        break
    return saida


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    pasta = a[0]
    ver = a[a.index("--ver") + 1] if "--ver" in a else None
    arqs = sorted(f for f in os.listdir(pasta) if f.startswith("pdp-") and f.endswith(".json"))
    ebooks = [json.load(open(os.path.join(pasta, f), encoding="utf-8")) for f in arqs]
    res = ligar(ebooks, carregar_editais(), ver)
    for f, e in zip(arqs, ebooks):
        e["editais"] = res[e["id"]]
        json.dump(e, open(os.path.join(pasta, f), "w", encoding="utf-8"), ensure_ascii=False)
        print(f"{e['id']}: {sum(len(v) for v in e['editais'].values())} assuntos ligados em {len(e['editais'])} editais")
