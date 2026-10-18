# Gera dados/leiseca/{cf,cadh,cdc,acp,jec}.json a partir do texto oficial (Planalto e CNJ).
# Uso: python3 leiseca_dpe.py <pasta com os .txt oficiais> <pasta de saída>
# Os .txt vêm das páginas oficiais convertidas em texto, sem o texto tachado (revogado).
# Fontes: planalto.gov.br (CF, CDC, Lei 7.347, Lei 9.099, Lei 10.216, Decreto 678/92) e atos.cnj.jus.br (Res. 213).
import json, os, re, sys

HEAD = re.compile(r'^(T[ÍI]TULO|CAP[ÍI]TULO|SEÇÃO|Seção|SUBSEÇÃO|Subseção|LIVRO|ATO DAS DISPOSI|ARTIGO \d)')
LEGAL = re.compile(r'^([IVXLC]+\s*[-–]|§|\d+\.|[a-z]\))')


def arts(path, start=None, end=None):
    L = open(path, encoding='utf-8').read().split('\n')
    if start: L = L[next(i for i, l in enumerate(L) if l.startswith(start)):]
    if end: L = L[:next((i for i, l in enumerate(L) if l.startswith(end)), len(L))]
    R, cur = {}, None
    A = re.compile(r'^Art\.\s*(\d+)\s*[º°o]?\s*(?:-\s*([A-Z]))?[\s.]')
    for l in L:
        m = A.match(l)
        if m:
            num = m.group(1) + ('-' + m.group(2) if m.group(2) else '')
            cur = R.setdefault(num, []) if num not in R else None
            if cur is not None: cur.append(l)
            continue
        if cur is None: continue
        if HEAD.match(l) or (l.upper() == l and len(re.sub(r'[^A-ZÀ-Ý]', '', l)) > 6 and not LEGAL.match(l)): cur = None; continue
        cur.append(l)
    return R


def artigos_cadh(path):
    L = open(path, encoding='utf-8').read().split('\n')
    R, cur = {}, None
    for i, l in enumerate(L):
        m = re.match(r'^ARTIGO (\d+)$', l)
        if m:
            cur = R.setdefault(m.group(1), [f'Artigo {m.group(1)} – {L[i + 1]}']); skip = True; continue
        if cur is None: continue
        if skip: skip = False; continue
        if HEAD.match(l) or l.startswith('PARTE'): cur = None; continue
        cur.append(l)
    return R


def limpa(linhas, ate=None, sem=()):
    out = []
    for l in linhas:
        if re.fullmatch(r'[.\s]*(\((revogad|Revogad)[^)]*\))?', l): continue
        if ate and re.match(ate, l): break
        if any(re.match(s, l) for s in sem): continue
        l = re.sub(r'^([lI]{1,3}) - ', lambda m: m.group(1).replace('l', 'I') + ' - ', l)   # "ll -" do Planalto
        l = re.sub(r'\((reda|inclu)', lambda m: '(' + m.group(1).capitalize(), l)
        l = re.sub(r'^((?:Art\.|§)\s*\d+)o\b', r'\1º', l)
        l = l.replace('arestauratividade', 'a restauratividade').replace('\xad', '-').replace(' .', '.').replace('))', ')')
        # o Planalto às vezes mantém a redação antiga sem tachar: fica a última versão do mesmo dispositivo
        if out and rotulo(l) and rotulo(l) == rotulo(out[-1]): out[-1] = l; continue
        out.append(l)
    return '\n'.join(out)


def rotulo(l):
    m = re.match(r'^([IVXLC]+\s*[-–]|§\s*\d+|[a-z]\)|Pena\b|Parágrafo único)', l)
    return m and re.sub(r'\s|[-–]', '', m.group(1))


def grupo(nome, R, lista):
    itens = []
    for e in lista:
        if isinstance(e, str) and e.startswith('#'): itens.append({'h': e[1:].strip()}); continue
        a, kw = (e, {}) if isinstance(e, str) else e
        if a not in R: raise SystemExit(f'{nome}: art. {a} não encontrado')
        itens.append({'a': a, 'x': limpa(R[a], **kw)})
    return {'nome': nome, 'itens': itens}


def mandela(path):
    """Regras de Mandela: o PDF do CNJ intercala colunas, então os trechos são conferidos e montados um a um."""
    txt = re.sub(r'\s+', ' ', open(path, encoding='utf-8').read().replace('\u2011', '-'))
    txt = re.sub(r'([a-z]),\d+ ', r'\1, ', txt)   # remove chamadas de nota de rodapé
    R = {
        '1': ['1. Todos os presos devem ser tratados com respeito, devido a seu valor e dignidade inerentes ao ser humano. Nenhum preso deverá ser submetido a tortura ou tratamentos ou sanções cruéis, desumanos ou degradantes e deverá ser protegido de tais atos, não sendo estes justificáveis em qualquer circunstância. A segurança dos presos, dos servidores prisionais, dos prestadores de serviço e dos visitantes deve ser sempre assegurada.'],
        '3': ['O encarceramento e outras medidas que excluam uma pessoa do convívio com o mundo externo são aflitivas pelo próprio fato de ser retirado destas pessoas o direito à autodeterminação ao serem privadas de sua liberdade. Portanto, o sistema prisional não deverá agravar o sofrimento inerente a tal situação, exceto em casos incidentais, em que a separação seja justificável, ou nos casos de manutenção da disciplina.'],
        '43': ['1. Em nenhuma hipótese devem as restrições ou sanções disciplinares implicar em tortura ou outra forma de tratamento ou sanções cruéis, desumanos ou degradantes. As seguintes práticas, em particular, devem ser proibidas:',
               '(a) Confinamento solitário indefinido;', '(b) Confinamento solitário prolongado;', '(c) Encarceramento em cela escura ou constantemente iluminada;',
               '(d) Castigos corporais ou redução da dieta ou água potável do preso;', '(e) Castigos coletivos.',
               '2. Instrumentos de imobilização jamais devem ser utilizados como sanção a infrações disciplinares.',
               '3. Sanções disciplinares ou medidas restritivas não devem incluir a proibição de contato com a família. O contato familiar só pode ser restringido por um prazo limitado e quando for estritamente necessário para a manutenção da segurança e da ordem.'],
        '44': ['Para os objetivos destas Regras, o confinamento solitário refere-se ao confinamento do preso por 22 horas ou mais, por dia, sem contato humano significativo. O confinamento solitário prolongado refere-se ao confinamento solitário por mais de 15 dias consecutivos.'],
        '45': ['1. O confinamento solitário será utilizado somente em casos excepcionais como último recurso, pelo menor prazo possível e sujeito a uma revisão independente, e somente de acordo com autorização de autoridade competente. Não deverá ser imposto como consequência da sentença do preso.',
               '2. A determinação de confinamento solitário será proibida no caso de preso portador de deficiência mental ou física quando essas condições possam ser agravadas por tal medida. A proibição do uso do confinamento solitário e de medidas similares em casos envolvendo mulheres e crianças, como referido em outros padrões e normas das Nações Unidas sobre prevenção ao crime e justiça criminal, permanece aplicável.'],
        '61': ['1. Os presos devem ter a oportunidade, tempo e meios adequados para receberem visitas e de se comunicaram com um advogado de sua própria escolha ou com um defensor público, sem demora, interceptação ou censura, em total confidencialidade, sobre qualquer assunto legal, em conformidade com a legislação local. Tais encontros podem estar sob as vistas de agentes prisionais, mas não passíveis de serem ouvidos por estes.',
               '2. Nos casos em que os presos não falam o idioma local, a administração prisional deve facilitar o acesso aos serviços de um intérprete competente e independente.',
               '3. Os presos devem ter acesso a assistência jurídica efetiva.'],
    }
    itens = []
    for n, ls in R.items():
        for l in ls:   # cada frase precisa existir no texto oficial (o PDF quebra linhas e páginas no meio)
            for parte in re.split(r'(?<=[.;:])\s+', re.sub(r'^(\d\.|\([a-e]\))\s*', '', l)):
                if parte and parte.replace('refere-se', 'refere') not in txt.replace('refere-se', 'refere'): raise SystemExit(f'Mandela {n}: não conferiu: {parte[:60]}')
        itens.append({'a': n, 'r': f'Regra {n}', 'x': '\n'.join(ls)})
    return {'nome': 'Regras de Mandela (ONU, 2015)', 'itens': itens}


FONTE = 'Seleção do Review DPE com os dispositivos mais cobrados em provas de Defensoria. Texto conferido em {} em 18/10/2026'


def main(src, dst):
    t = lambda n: os.path.join(src, n + '.txt')
    cf, adct = arts(t('cf'), end='ATO DAS DISPOSI'), arts(t('cf'), start='ATO DAS DISPOSI')
    cdc, lacp, jec = arts(t('cdc')), arts(t('lacp')), arts(t('jec'))
    cadh, r213, l10216 = artigos_cadh(t('cadh')), arts(t('r213')), arts(t('l10216'))
    dips = {
        'cf': dict(nome='Constituição Federal · artigos essenciais', curto='CF', disc='dc', fonte=FONTE.format('planalto.gov.br'), grupos=[
            grupo('Constituição Federal', cf, ['#Princípios fundamentais', '1', '3', '#Direitos e garantias fundamentais', '5', '6',
                                               '#Defensoria Pública', '134', '#Ordem social', '196', '226', '227', '228', '230']),
            grupo('ADCT', adct, ['98'])]),
        'cadh': dict(nome='Direitos humanos · CADH, audiência de custódia e saúde mental', curto='CADH', disc='dh', fonte=FONTE.format('planalto.gov.br (Decreto 678/1992, Lei 10.216/2001) e atos.cnj.jus.br (Res. 213/2015, com a redação da Res. 562/2024)'), grupos=[
            grupo('Convenção Americana (Pacto de San José)', cadh, ['1', '2', '5', '7', '8', '25']),
            grupo('Res. 213/2015 do CNJ · audiência de custódia', r213, [('1', {'ate': r'^§ 3º'}), ('4', {}), ('8', {'ate': r'^§ 3º'})]),
            grupo('Lei 10.216/2001 · saúde mental', l10216, ['2', '4', '6'])]),
        'cdc': dict(nome='CDC · Código de Defesa do Consumidor', curto='CDC', disc='co', fonte=FONTE.format('planalto.gov.br'), grupos=[
            grupo('CDC: direito material', cdc, ['#Conceitos', '2', '3', '#Direitos básicos', '6', '#Responsabilidade e prazos', '14', '17', '26', '27', '28',
                                                 '#Práticas e cláusulas abusivas', '42', '49', '51', '#Superendividamento', '54-A'])]),
        'acp': dict(nome='Processo coletivo · Lei da ACP e CDC', curto='ACP', disc='df', fonte=FONTE.format('planalto.gov.br'), grupos=[
            grupo('Lei 7.347/1985 (ação civil pública)', lacp, ['1', '5', '18', '21']),
            grupo('CDC: defesa coletiva', cdc, ['81', '82', '103', '104'])]),
        'jec': dict(nome='Juizados Especiais · Lei 9.099/1995', curto='Lei 9.099', disc='pp', fonte=FONTE.format('planalto.gov.br'), grupos=[
            grupo('Juizado Especial Criminal', jec, ['60', '61', '62', '69', '72', '74', '75', '76', '88', '89']),
            grupo('Juizado Especial Cível', jec, ['3', '9', '41'])]),
        'idoso': dict(nome='Estatuto da Pessoa Idosa · Lei 10.741/2003', curto='Idoso', disc='dh', fonte=FONTE.format('planalto.gov.br'), grupos=[
            grupo('Estatuto da Pessoa Idosa', arts(t('idoso')), ['#Disposições preliminares', '1', '2', '3', '4', '#Direitos fundamentais', '10', '39',
                                                                 '#Medidas de proteção', '43', '45', '#Acesso à justiça e crimes', '71', '94'])]),
        'epcd': dict(nome='Estatuto da Pessoa com Deficiência · Lei 13.146/2015', curto='PcD', disc='dh', fonte=FONTE.format('planalto.gov.br'), grupos=[
            grupo('Estatuto da Pessoa com Deficiência', arts(t('epcd')), ['2', '4', '6', '#Acesso à justiça', '79', '#Capacidade legal e curatela', '84', '85'])]),
        'lmp': dict(nome='Lei Maria da Penha · Lei 11.340/2006', curto='Maria da Penha', disc='dp', fonte=FONTE.format('planalto.gov.br'), grupos=[
            grupo('Lei Maria da Penha', arts(t('lmp')), ['#Conceitos', '5', '7', '#Medidas protetivas', '12-C', '22', '24-A',
                                                         '#Processo e assistência', '16', '17', '27', '28', '41'])]),
        'mandela': dict(nome='Execução penal · Regras de Mandela e Res. 487 do CNJ', curto='Mandela', disc='ep', fonte=FONTE.format('cnj.jus.br (Regras de Mandela, tradução oficial do CNJ, 2016; Res. 487/2023)'), grupos=[
            mandela(t('mandela')),
            grupo('Res. 487/2023 do CNJ · política antimanicomial', arts(t('r487')), ['1', '3', '11', '12', '13', '16', '18'])]),
    }
    for k, d in dips.items():
        p = os.path.join(dst, k + '.json')
        old = json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}
        out = {'id': k, **d, 'cartoes': old.get('cartoes', [])}
        json.dump(out, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(k, [(g['nome'], sum('a' in i for i in g['itens'])) for g in d['grupos']])


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
