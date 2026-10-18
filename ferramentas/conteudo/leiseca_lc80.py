# Insere a LC 80/94 (dados/leiseca/lc80.json) e seus cartões no baralho aberto.
# Uso: python3 leiseca_lc80.py deck.json dados/leiseca/lc80.json
import json, sys
deck_p, src_p = sys.argv[1], sys.argv[2]
d = json.load(open(deck_p)); s = json.load(open(src_p))
assert 'pi' in [x['id'] for x in d['disciplinas']] if isinstance(d['disciplinas'], list) else 'pi' in d['disciplinas']
dip = {k: s[k] for k in ('id', 'nome', 'curto', 'disc', 'fonte')}
dip['grupos'] = [{'nome': 'LC 80/94: artigos essenciais', 'itens': s['itens']}]
d['leiseca'] = [x for x in d['leiseca'] if x['id'] != 'lc80'] + [dip]
F = 'secundária: elaborado a partir do texto legal; confira a redação vigente'
C = [
 ('1', 'Defensoria Pública: conceito', 'LC 80, art. 1º: a Defensoria Pública é instituição ____, essencial à função jurisdicional do Estado, como expressão e instrumento do regime ____.', 'Permanente; democrático (LC 80, art. 1º).', 'Reproduz o art. 134 da CF: orientação jurídica, promoção dos direitos humanos e defesa integral e gratuita dos necessitados.'),
 ('3', 'Princípios e objetivos', 'LC 80, art. 3º: são princípios institucionais da Defensoria Pública a ____, a ____ e a ____.', 'Unidade, indivisibilidade e independência funcional (LC 80, art. 3º).', 'Os mesmos princípios estão no art. 134, § 4º, da CF.'),
 ('3-A', 'Princípios e objetivos', 'LC 80, art. 3º-A: cite os quatro objetivos da Defensoria Pública.', 'Primazia da dignidade humana e redução das desigualdades sociais; afirmação do Estado Democrático de Direito; prevalência e efetividade dos direitos humanos; garantia da ampla defesa e do contraditório (LC 80, art. 3º-A).', 'Incluído pela LC 132/2009; costuma cair em lista para completar.'),
 ('4', 'Funções institucionais', 'LC 80, art. 4º, II: a Defensoria deve promover, ____, a solução ____ dos litígios.', 'Prioritariamente; extrajudicial (LC 80, art. 4º, II).', 'Mediação, conciliação, arbitragem e demais técnicas de composição de conflitos.'),
 ('4', 'Funções institucionais', 'LC 80, art. 4º, VII: a Defensoria pode promover ação civil pública quando o resultado da demanda puder beneficiar ____.', 'Grupo de pessoas hipossuficientes (LC 80, art. 4º, VII).', 'Legitimidade coletiva da Defensoria; veja também a LACP, art. 5º, II.'),
 ('4', 'Funções institucionais', 'LC 80, art. 4º, XVI: compete à Defensoria exercer a ____ nos casos previstos em lei.', 'Curadoria especial (LC 80, art. 4º, XVI).', 'Função atípica, exercida independentemente da condição econômica do curatelado.'),
 ('4-A', 'Direitos dos assistidos', 'LC 80, art. 4º-A, IV: é direito do assistido o patrocínio de seus direitos e interesses pelo ____.', 'Defensor natural (LC 80, art. 4º-A, IV).', 'O art. 4º-A também garante a revisão da pretensão em caso de recusa de atuação (inciso III).'),
 ('97-A', 'Autonomia da DPE', 'LC 80, art. 97-A: à Defensoria Pública do Estado é assegurada autonomia ____, ____ e iniciativa para elaborar sua proposta ____.', 'Funcional; administrativa; orçamentária (LC 80, art. 97-A).', 'Autonomia reforçada pela EC 45/2004 (CF, art. 134, § 2º).'),
 ('106-A', 'Organização da DPE', 'LC 80, art. 106-A: a organização da Defensoria Pública do Estado deve primar pela ____.', 'Descentralização (LC 80, art. 106-A).', 'A atuação inclui atendimento interdisciplinar e tutela individual e coletiva.'),
 ('128', 'Prerrogativas', 'LC 80, art. 128, I: o membro da DPE recebe intimação ____ em qualquer processo e grau de jurisdição, contando-se-lhe em ____ todos os prazos.', 'Pessoal; dobro (LC 80, art. 128, I).', 'Prerrogativa central em prova: intimação pessoal com prazo em dobro.'),
 ('128', 'Prerrogativas', 'LC 80, art. 128, XI: o Defensor representa a parte, em feito administrativo ou judicial, ____ de mandato, salvo quando a lei exigir ____.', 'Independentemente; poderes especiais (LC 80, art. 128, XI).', 'Dispensa de procuração, ressalvados os poderes especiais.'),
 ('128', 'Prerrogativas', 'LC 80, art. 128, II: o membro da DPE não será preso senão por ordem ____, salvo em ____, caso em que a autoridade comunicará imediatamente ao Defensor Público-Geral.', 'Judicial escrita; flagrante (LC 80, art. 128, II).', 'Prerrogativa ligada à independência da função.'),
 ('127', 'Garantias', 'LC 80, art. 127: são garantias dos membros da DPE a independência funcional, a ____, a irredutibilidade de vencimentos e a ____.', 'Inamovibilidade; estabilidade (LC 80, art. 127).', 'Não confunda garantias (art. 127) com prerrogativas (art. 128).'),
 ('130', 'Proibições', 'LC 80, art. 130, I: ao membro da DPE é vedado exercer a advocacia ____.', 'Fora das atribuições institucionais (LC 80, art. 130, I).', 'Vedação também prevista no art. 134, § 1º, da CF.'),
]
ordmax = max(c.get('ord', 0) for c in d['cartoes'])
d['cartoes'] = [c for c in d['cartoes'] if not c['id'].startswith('ls-lc80')]
for i, (a, tema, fr, ve, pq) in enumerate(C, 1):
    d['cartoes'].append({'id': f'ls-lc801-{i:03d}', 'disc': 'pi', 'ord': ordmax + i, 'tema': 'Lei seca LC 80: ' + tema, 'tipo': 'lei_seca',
        'frente': fr, 'verso': ve, 'porque': pq, 'origem': f'LC 80, art. {a}', 'abr': 'nucleo_comum', 'peso': 5, 'inc': 5, 'fonte': F})
json.dump(d, open(deck_p, 'w'), ensure_ascii=False)
print('ok', len(d['leiseca']), len(d['cartoes']))
