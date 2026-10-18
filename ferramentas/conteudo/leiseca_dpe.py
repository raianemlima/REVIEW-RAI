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
        l = l.replace('\xad', '-').replace(' .', '.').replace('))', ')')
        out.append(l)
    return '\n'.join(out)


def grupo(nome, R, lista):
    itens = []
    for e in lista:
        if isinstance(e, str) and e.startswith('#'): itens.append({'h': e[1:].strip()}); continue
        a, kw = (e, {}) if isinstance(e, str) else e
        if a not in R: raise SystemExit(f'{nome}: art. {a} não encontrado')
        itens.append({'a': a, 'x': limpa(R[a], **kw)})
    return {'nome': nome, 'itens': itens}


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
    }
    for k, d in dips.items():
        p = os.path.join(dst, k + '.json')
        old = json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}
        out = {'id': k, **d, 'cartoes': old.get('cartoes', [])}
        json.dump(out, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(k, [(g['nome'], sum('a' in i for i in g['itens'])) for g in d['grupos']])


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
