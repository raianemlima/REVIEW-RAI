# Insere as leis de dados/leiseca/*.json (texto + cartões) no baralho aberto.
# Uso: python3 leiseca_insere.py deck.json dados/leiseca/*.json
import json, sys

F = 'secundária: elaborado a partir do texto legal; confira a redação vigente'
deck_p, fontes = sys.argv[1], sys.argv[2:]
d = json.load(open(deck_p, encoding='utf-8'))
discs = {x['id'] for x in d['disciplinas']}
ordem = ['lc80', 'cf', 'cadh', 'cdc', 'acp', 'jec', 'idoso', 'epcd', 'lmp', 'mandela']
for p in fontes:
    s = json.load(open(p, encoding='utf-8')); k = s['id']
    assert s['disc'] in discs, s['disc']
    d['leiseca'] = [x for x in d['leiseca'] if x['id'] != k] + [{x: s[x] for x in ('id', 'nome', 'curto', 'disc', 'fonte', 'grupos')}]
    d['cartoes'] = [c for c in d['cartoes'] if not c['id'].startswith(f'ls-{k}')]
    base, cont = max(c.get('ord', 0) for c in d['cartoes']), {}
    for i, c in enumerate(s.get('cartoes', []), 1):
        cont[c['g']] = cont.get(c['g'], 0) + 1
        d['cartoes'].append({'id': f"ls-{k}{c['g'] + 1}-{cont[c['g']]:03d}", 'disc': c.get('disc', s['disc']), 'ord': base + i,
                             'tema': f"Lei seca {s['curto']}: {c['tema']}", 'tipo': 'lei_seca', 'frente': c['frente'], 'verso': c['verso'],
                             'porque': c['porque'], 'origem': c['origem'], 'abr': 'nucleo_comum', 'peso': 5, 'inc': 5, 'fonte': F})
    print(k, len(s.get('cartoes', [])), 'cartões')
d['leiseca'].sort(key=lambda x: ordem.index(x['id']) + 100 if x['id'] in ordem else 0)
json.dump(d, open(deck_p, 'w', encoding='utf-8'), ensure_ascii=False)
