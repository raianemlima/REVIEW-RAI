"""Matéria de cada questão do banco "Provas de concurso" (campo "d" = id canônico da taxonomia do Cronograma).

    python ferramentas/conteudo/questoes/materias.py app-src.txt            # confere e mostra o relatório
    python ferramentas/conteudo/questoes/materias.py app-src.txt --gravar   # grava "d" em PROVAS_PUBLICO

Por que existe: a maioria das provas vem com a "matéria" do caderno ("Prova Objetiva", "Conhecimentos Específicos"
ou um bloco com quatro disciplinas juntas). Sem a matéria de verdade não dá para medir incidência por disciplina,
nem ligar o erro de uma questão ao tema certo.

Como decide:
1. matéria do caderno que nomeia UMA disciplina da taxonomia (ex.: "Direito Penal", "Criminologia") vale como está;
2. senão, pontua as palavras-chave de cada disciplina no enunciado e nas alternativas (frases inteiras, sem acento);
   a maior pontuação vence, desde que haja pelo menos 2 pontos e vantagem sobre a segunda;
3. sem confiança, a questão fica sem "d" (o app a trata como "matéria não identificada").

O item 2 é medido contra as questões do item 1 (que têm resposta certa conhecida): rode sem --gravar para ver a taxa.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path


def _n(t):
    return re.sub(r"\s+", " ", "".join(c for c in unicodedata.normalize("NFD", (t or "").lower()) if unicodedata.category(c) != "Mn"))


# id canônico -> (nomes que, sozinhos, identificam a matéria do caderno, palavras-chave)
D = {
    "direito_constitucional": (["constitucional", "direito constitucional"], [
        "constituicao federal", "controle de constitucionalidade", "acao direta de inconstitucionalidade", "adpf", "adi ", "adc ",
        "poder constituinte", "emenda constitucional", "direitos fundamentais", "remedios constitucionais", "mandado de injuncao",
        "habeas data", "clausula petrea", "nacionalidade", "direitos politicos", "estado de defesa", "estado de sitio", "ordem social",
        "ordem economica", "tribunal de contas", "processo legislativo", "reserva de plenario", "supremo tribunal federal", "medida provisoria",
        "congresso nacional", "senado federal", "camara dos deputados", "presidente da republica", "repercussao geral", "federalismo",
        "competencia legislativa", "separacao dos poderes", "constituicao estadual", "bloco de constitucionalidade", "supremacia da constituicao",
        "partidos politicos", "forcas armadas", "seguranca publica", "inviolabilidade", "devido processo legal", "principio da simetria",
        "cnj", "cnmp", "uniao, estados", "intervencao federal", "garantia da magistratura", "vitaliciedade", "quinto constitucional"]),
    "direito_administrativo": (["administrativo", "direito administrativo"], [
        "administracao publica", "ato administrativo", "licitacao", "contrato administrativo", "lei 14.133", "lei n. 14.133", "servidor publico",
        "improbidade", "poder de policia", "concessao de servico", "permissao de servico", "servico publico", "autarquia", "fundacao publica",
        "empresa publica", "sociedade de economia mista", "responsabilidade civil do estado", "desapropriacao", "bens publicos", "processo administrativo",
        "lei 9.784", "agente publico", "cargo publico", "concurso publico", "lei 8.112", "organizacao administrativa", "descentralizacao",
        "controle da administracao", "discricionariedade", "pregao", "dispensa de licitacao", "inexigibilidade", "parceria publico-privada",
        "poder disciplinar", "poder hierarquico", "agencia reguladora", "terceiro setor", "organizacao social", "estagio probatorio", "servidao administrativa",
        "tombamento", "requisicao administrativa", "mandado de seguranca contra ato", "lei de acesso a informacao", "lei anticorrupcao"]),
    "direito_civil": (["civil", "direito civil"], [
        "codigo civil", "negocio juridico", "obrigacoes", "responsabilidade civil", "usucapiao", "direitos reais", "sucessoes", "heranca", "testamento",
        "casamento", "uniao estavel", "regime de bens", "pensao alimenticia", "filiacao", "prescricao", "decadencia", "pessoa juridica",
        "desconsideracao da personalidade", "lindb", "vicios redibitorios", "evicao", "fianca", "locacao", "doacao", "compra e venda", "condominio edilicio",
        "registros publicos", "direito de familia", "curatela", "capacidade civil", "ato ilicito", "abuso de direito", "boa-fe objetiva", "clausula penal",
        "arras", "enriquecimento sem causa", "pagamento indevido", "contrato de prestacao", "empreitada", "mandato", "comodato", "mutuo", "contrato de seguro",
        "promessa de compra e venda", "posse", "propriedade", "bem de familia", "pessoa natural", "direitos da personalidade", "dano moral", "perdas e danos",
        "solidariedade", "obrigacao de fazer", "obrigacao de dar", "adimplemento", "inadimplemento", "cessao de credito", "novacao", "compensacao", "confusao", "remissao"]),
    "direito_processual_civil": (["processual civil", "direito processual civil", "processo civil"], [
        "codigo de processo civil", "cpc", "tutela provisoria", "tutela de urgencia", "tutela de evidencia", "peticao inicial", "contestacao", "reconvencao",
        "litisconsorcio", "intervencao de terceiros", "apelacao", "agravo de instrumento", "agravo interno", "embargos de declaracao", "recurso especial",
        "recurso extraordinario", "cumprimento de sentenca", "penhora", "coisa julgada", "prova pericial", "onus da prova", "audiencia de instrucao",
        "saneamento", "honorarios advocaticios", "gratuidade da justica", "acao rescisoria", "resolucao de demandas repetitivas", "prazos processuais",
        "citacao", "intimacao", "preclusao", "julgamento antecipado", "acoes possessorias", "inventario e partilha", "juizado especial civel", "execucao de titulo",
        "embargos a execucao", "impugnacao ao cumprimento", "ordem cronologica", "negocio juridico processual", "calendario processual", "incidente de desconsideracao",
        "competencia relativa", "competencia absoluta", "conflito de competencia", "assuncao de competencia", "cooperacao judiciaria", "amicus curiae", "precedentes"]),
    "direito_penal": (["penal", "direito penal"], [
        "codigo penal", "reclusao", "detencao", "dolo", "culpa consciente", "tentativa", "consumacao", "desistencia voluntaria", "arrependimento eficaz",
        "arrependimento posterior", "excludente de ilicitude", "legitima defesa", "estado de necessidade", "estrito cumprimento do dever", "concurso de crimes",
        "continuidade delitiva", "prescricao da pretensao punitiva", "extincao da punibilidade", "homicidio", "lesao corporal", "furto", "roubo", "estelionato",
        "latrocinio", "extorsao", "peculato", "corrupcao passiva", "corrupcao ativa", "concussao", "estupro", "lei de drogas", "trafico de drogas", "porte de arma",
        "estatuto do desarmamento", "crimes contra", "lei penal no tempo", "erro de tipo", "erro de proibicao", "culpabilidade", "imputabilidade", "tipicidade",
        "antijuridicidade", "coautoria", "participacao", "circunstancia agravante", "circunstancia atenuante", "dosimetria", "pena restritiva de direitos",
        "medida de seguranca", "abolitio criminis", "principio da insignificancia", "lei maria da penha", "feminicidio", "crime hediondo", "crime culposo",
        "crime omissivo", "crime formal", "crime material", "crime de perigo", "bem juridico", "nexo causal", "teoria finalista", "conduta tipica", "concurso aparente de normas"]),
    "direito_processual_penal": (["processual penal", "direito processual penal", "processo penal"], [
        "codigo de processo penal", "cpp", "inquerito policial", "denuncia", "queixa-crime", "acao penal", "prisao preventiva", "prisao em flagrante",
        "prisao temporaria", "medidas cautelares diversas", "audiencia de custodia", "liberdade provisoria", "habeas corpus", "revisao criminal",
        "recurso em sentido estrito", "apelacao criminal", "tribunal do juri", "jurados", "pronuncia", "impronuncia", "absolvicao sumaria", "interrogatorio",
        "provas ilicitas", "cadeia de custodia", "prova testemunhal", "reconhecimento de pessoas", "acordo de nao persecucao", "colaboracao premiada",
        "competencia criminal", "conexao", "continencia", "nulidades", "citacao por edital", "suspensao condicional do processo", "sentenca penal", "mutatio libelli",
        "emendatio libelli", "juizado especial criminal", "transacao penal", "composicao civil", "interceptacao telefonica", "busca e apreensao", "juiz das garantias",
        "ministerio publico", "assistente de acusacao", "defesa tecnica", "ampla defesa", "contraditorio", "tribunal do juri", "quesitos", "plenario do juri"]),
    "execucao_penal": (["execucao penal", "direito da execucao penal", "execucoes penais", "lep"], [
        "execucao penal", "lei de execucao penal", "progressao de regime", "regressao de regime", "livramento condicional", "remicao", "saida temporaria", "falta grave",
        "regime disciplinar diferenciado", "rdd", "indulto", "comutacao", "unificacao de penas", "detracao", "prisao domiciliar", "monitoramento eletronico",
        "apenado", "sentenciado", "estabelecimento penal", "casa do albergado", "colonia agricola", "juizo da execucao", "conselho da comunidade", "trabalho do preso",
        "regime disciplinar", "execucao da pena", "juiz da execucao", "pena em execucao"]),
    "direito_institucional_defensoria_publica": (["direito institucional", "principios institucionais", "defensoria publica", "legislacao institucional", "legislacao interna",
                                                   "principios institucionais da defensoria publica", "organizacao da defensoria"], [
        "defensoria publica", "defensor publico", "lei complementar 80", "lc 80", "lc n. 80", "autonomia funcional", "inamovibilidade", "assistencia juridica",
        "necessitados", "hipossuficiencia", "curador especial", "custos vulnerabilis", "defensoria geral", "conselho superior da defensoria", "ouvidoria-geral",
        "prerrogativas do defensor", "nomeacao dativa", "unidade, indivisibilidade", "corregedoria-geral", "defensoria publica da uniao", "defensor publico-geral"]),
    "direitos_humanos": (["direitos humanos"], [
        "direitos humanos", "convencao americana", "pacto de sao jose", "corte interamericana", "comissao interamericana", "corte idh", "declaracao universal",
        "pacto internacional", "tratado internacional", "convencao contra a tortura", "controle de convencionalidade", "onu", "oea", "bloco de convencionalidade",
        "jus cogens", "direito internacional", "refugiado", "apatridia", "tribunal penal internacional", "estatuto de roma", "dudh", "cidh", "protocolo facultativo",
        "convencao sobre os direitos da pessoa com deficiencia", "convencao de belem do para", "cedaw", "comite", "sistema interamericano", "sistema global"]),
    "direito_do_consumidor": (["consumidor", "direito do consumidor"], [
        "consumidor", "codigo de defesa do consumidor", "cdc", "fornecedor", "relacao de consumo", "vicio do produto", "fato do produto", "publicidade enganosa",
        "publicidade abusiva", "clausula abusiva", "contrato de adesao", "inversao do onus da prova", "bancos de dados e cadastros", "cobranca de dividas",
        "responsabilidade do fornecedor", "garantia legal", "superendividamento", "plano de saude", "recall", "direito de arrependimento", "pratica abusiva", "venda casada"]),
    "direito_da_crianca_e_adolescente": (["crianca e adolescente", "direito da crianca e do adolescente", "eca", "infancia e juventude", "estatuto da crianca e do adolescente"], [
        "estatuto da crianca", "eca", "crianca", "adolescente", "ato infracional", "medida socioeducativa", "conselho tutelar", "adocao", "poder familiar",
        "destituicao do poder", "acolhimento institucional", "semiliberdade", "liberdade assistida", "protecao integral", "sinase", "menor de 18", "guarda provisoria",
        "familia substituta", "apadrinhamento", "internacao provisoria"]),
    "direitos_difusos_e_coletivos": (["direitos difusos e coletivos", "tutela coletiva", "difusos e coletivos"], [
        "acao civil publica", "direitos difusos", "direitos coletivos", "direitos individuais homogeneos", "tutela coletiva", "inquerito civil", "termo de ajustamento de conduta",
        "lei 7.347", "legitimidade ativa", "coisa julgada coletiva", "acao popular", "mandado de seguranca coletivo", "liquidacao e execucao coletiva", "fundo de defesa",
        "microssistema", "interesses transindividuais", "interesses difusos", "legitimado coletivo", "representatividade adequada"]),
    "criminologia": (["criminologia"], [
        "criminologia", "escola positiva", "escola classica", "lombroso", "labelling", "etiquetamento", "anomia", "durkheim", "merton", "teoria da subcultura", "escola de chicago",
        "criminologia critica", "vitimologia", "prevencao do delito", "cifra negra", "janelas quebradas", "tolerancia zero", "direito penal do inimigo", "garofalo", "ferri",
        "sutherland", "colarinho branco", "abolicionismo", "minimalismo penal", "selecao criminalizante", "criminalizacao primaria", "criminalizacao secundaria", "realismo"]),
    "direito_tributario": (["tributario", "direito tributario", "direito financeiro e tributario", "direito tributario e financeiro"], [
        "tributo", "imposto", "obrigacao tributaria", "credito tributario", "lancamento tributario", "ctn", "fato gerador", "icms", "iss ", "ipva", "iptu", "itbi", "imposto de renda",
        "cofins", "imunidade tributaria", "isencao", "decadencia tributaria", "execucao fiscal", "certidao de divida ativa", "substituicao tributaria", "sujeito passivo",
        "responsabilidade tributaria", "competencia tributaria", "anterioridade", "legalidade tributaria", "reforma tributaria", "contribuicao de melhoria", "taxa de", "lei de responsabilidade fiscal",
        "orcamento publico", "lei orcamentaria", "receita publica", "despesa publica", "precatorio"]),
    "direito_empresarial": (["empresarial", "direito empresarial", "direito comercial"], [
        "empresario individual", "sociedade limitada", "sociedade anonima", "lei das sociedades", "falencia", "recuperacao judicial", "recuperacao extrajudicial", "titulos de credito",
        "cheque", "duplicata", "nota promissoria", "propriedade industrial", "marca", "patente", "estabelecimento empresarial", "nome empresarial", "junta comercial", "cooperativa",
        "franquia", "lei 11.101", "quotas", "assembleia geral", "administrador da sociedade", "eireli", "sociedade simples", "sociedade em comum", "conta-corrente", "letra de cambio"]),
    "direito_ambiental_urbanistico": (["ambiental", "direito ambiental", "direito urbanistico", "direito ambiental e urbanistico", "urbanistico e fundiario"], [
        "meio ambiente", "licenciamento ambiental", "estudo de impacto", "unidade de conservacao", "codigo florestal", "area de preservacao permanente", "reserva legal", "poluicao",
        "dano ambiental", "sisnama", "conama", "lei 6.938", "crime ambiental", "lei 9.605", "estatuto da cidade", "plano diretor", "parcelamento do solo", "zoneamento",
        "usucapiao urbano", "regularizacao fundiaria", "reurb", "solo urbano", "direito urbanistico", "poluidor-pagador", "principio da precaucao", "ecossistema"]),
    "direito_do_idoso": (["idoso", "direito do idoso", "pessoa idosa", "pessoas idosas"], [
        "estatuto da pessoa idosa", "estatuto do idoso", "pessoa idosa", "lei 10.741", "idoso", "instituicao de longa permanencia", "maior de 60 anos"]),
    "direito_eleitoral": (["eleitoral", "direito eleitoral"], [
        "eleitoral", "eleicao", "candidato", "justica eleitoral", "propaganda eleitoral", "registro de candidatura", "inelegibilidade", "lei das eleicoes", "codigo eleitoral", "captacao ilicita de sufragio",
        "abuso de poder politico", "tse", "tre", "urna eletronica", "sufragio", "coligacao", "fidelidade partidaria", "prestacao de contas de campanha", "ficha limpa", "diplomacao"]),
    "direito_do_trabalho": (["trabalho", "direito do trabalho", "direito processual do trabalho"], [
        "clt", "empregado", "empregador", "contrato de trabalho", "justica do trabalho", "fgts", "horas extras", "ferias", "rescisao do contrato", "estabilidade provisoria", "sindicato",
        "reclamatoria", "verbas rescisorias", "aviso previo", "jornada de trabalho", "trabalhador"]),
    "direito_previdenciario": (["previdenciario", "direito previdenciario", "seguridade social"], [
        "previdencia social", "inss", "beneficio previdenciario", "aposentadoria", "pensao por morte", "auxilio-doenca", "auxilio por incapacidade", "loas", "beneficio de prestacao continuada",
        "rgps", "rpps", "segurado", "carencia", "salario de beneficio", "regime geral de previdencia", "seguridade social"]),
    "filosofia_sociologia_juridica": (["filosofia do direito", "sociologia juridica", "filosofia juridica", "formacao humanistica", "nocoes gerais de direito e formacao humanistica", "teoria geral do direito",
                                       "nocoes gerais de direito"], [
        "filosofia do direito", "kelsen", "hart", "dworkin", "alexy", "jusnaturalismo", "positivismo juridico", "sociologia juridica", "weber", "habermas", "foucault", "bobbio", "hermeneutica juridica",
        "pluralismo juridico", "teoria pura do direito", "pos-positivismo", "formacao humanistica", "racismo estrutural", "relacoes etnico-raciais", "teoria da justica", "rawls", "ponderacao de principios",
        "teoria dos direitos fundamentais", "teoria geral do direito", "norma juridica", "fontes do direito", "hierarquia das normas", "antinomia"]),
}
for _d, (_nomes, _kws) in D.items():
    D[_d] = (_nomes, [_n(k) for k in _kws])

# nomes que, na matéria do caderno, identificam UMA disciplina (comparação exata, sem acento)
NOME_UNICO = {}
for _d, (_nomes, _) in D.items():
    for _x in _nomes:
        NOME_UNICO[_n(_x)] = _d
        NOME_UNICO["direito " + _n(_x)] = _d
        NOME_UNICO["direito da " + _n(_x)] = _d
        NOME_UNICO["direito do " + _n(_x)] = _d
NOME_UNICO.update({"direitos humanos": "direitos_humanos", "criminologia": "criminologia", "execucao penal": "execucao_penal",
                   "direito da execucao penal": "execucao_penal", "legislacao institucional": "direito_institucional_defensoria_publica",
                   "legislacao interna": "direito_institucional_defensoria_publica", "defensoria publica": "direito_institucional_defensoria_publica",
                   "direito da crianca e do adolescente": "direito_da_crianca_e_adolescente", "direito do consumidor": "direito_do_consumidor",
                   "direitos difusos e coletivos": "direitos_difusos_e_coletivos", "direito eleitoral": "direito_eleitoral"})

_PADROES = {d: [re.compile(r"(?<![a-z0-9])" + re.escape(k).replace(r"\ ", " ") + (r"" if k.endswith(" ") else r"(?![a-z0-9])")) for k in kws] for d, (_, kws) in D.items()}


def da_materia(materia):
    """id canônico quando a matéria do caderno nomeia uma disciplina só; senão None."""
    m = _n(materia).strip(" .")
    return NOME_UNICO.get(m)


def pontuar(texto):
    t = _n(texto)
    return {d: sum(1 for p in ps if p.search(t)) for d, ps in _PADROES.items()}


def classificar(q):
    """(id, origem) para uma questão; origem 'm' = matéria do caderno, 'k' = palavras-chave; (None, None) sem confiança."""
    d = da_materia(q.get("materia"))
    if d:
        return d, "m"
    txt = q.get("enunciado", "") + " " + " ".join((q.get("alternativas") or {}).values())
    pts = pontuar(txt)
    ordem = sorted(pts.items(), key=lambda x: -x[1])
    (a, pa), (b, pb) = ordem[0], ordem[1]
    if pa >= 2 and pa - pb >= 1:
        return a, "k"
    return None, None


def anotar(provas):
    """Grava q['d'] em cada questão classificada (tira o que não for mais confiável) e devolve o relatório."""
    rel = {"m": 0, "k": 0, "sem": 0}
    for p in provas:
        for q in p["questoes"]:
            d, o = classificar(q)
            q.pop("d", None)
            if d:
                q["d"] = d
                rel[o] += 1
            else:
                rel["sem"] += 1
    return rel


def acuracia(provas):
    """Mede o item 2 (palavras-chave) contra as questões cuja matéria do caderno já diz a disciplina."""
    ok = tot = 0
    erros = {}
    for p in provas:
        for q in p["questoes"]:
            real = da_materia(q.get("materia"))
            if not real:
                continue
            txt = q.get("enunciado", "") + " " + " ".join((q.get("alternativas") or {}).values())
            pts = sorted(pontuar(txt).items(), key=lambda x: -x[1])
            (a, pa), (b, pb) = pts[0], pts[1]
            if pa >= 2 and pa - pb >= 1:
                tot += 1
                if a == real:
                    ok += 1
                else:
                    erros[(real, a)] = erros.get((real, a), 0) + 1
    total_rotuladas = sum(1 for p in provas for q in p["questoes"] if da_materia(q.get("materia")))
    return ok, tot, total_rotuladas, erros


def _ler(arquivo):
    t = Path(arquivo).read_text(encoding="utf-8")
    m = re.search(r"^const PROVAS_PUBLICO = (\[.*\]);\n", t, re.M)
    return t, m, json.loads(m.group(1))


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    arquivo, gravar = sys.argv[1], "--gravar" in sys.argv
    t, m, provas = _ler(arquivo)
    ok, tot, rot, erros = acuracia(provas)
    print(f"palavras-chave contra {rot} questões de matéria conhecida: decidiu {tot} e acertou {ok} ({100 * ok / max(1, tot):.1f}%); cobertura {100 * tot / max(1, rot):.0f}%")
    for (real, dado), n in sorted(erros.items(), key=lambda x: -x[1])[:8]:
        print(f"  {real} confundida com {dado}: {n}")
    rel = anotar(provas)
    n = sum(rel.values())
    print(f"{n} questões: {rel['m']} pela matéria do caderno, {rel['k']} por palavras-chave, {rel['sem']} sem confiança ({100 * rel['sem'] / n:.0f}%)")
    if gravar:
        bloco = "const PROVAS_PUBLICO = " + json.dumps(provas, ensure_ascii=False).replace("</", "<\\/") + ";\n"
        Path(arquivo).write_text(t[:m.start()] + bloco + t[m.end():], encoding="utf-8")
        print("gravado em", arquivo)


if __name__ == "__main__":
    main()
