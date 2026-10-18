# Prepara os materiais da área "Aprofundamento" (Markdown) para a Biblioteca do app.
# Uso:
#   python3 ebooks.py preparar arquivo.md id disc "Título" "Subtítulo"   -> dados/ebooks/<id>.json (fora do git: o repositório é público)
#   python3 ebooks.py inserir deck.json dados/ebooks/*.json              -> DECK.ebooks (vai cifrado com o baralho)
# Cada parte de nível 1 (# ...) vira um capítulo. Notas editoriais internas (natureza do arquivo, fonte de cada
# parte, sumário com âncoras e o apêndice de mapa de integridade) ficam de fora: são da produção, não do aluno.
import json, os, re, sys
from datetime import date

AQUI = os.path.dirname(os.path.abspath(__file__))


def preparar(md, eid, disc, titulo, subtitulo):
    L = open(md, encoding='utf-8-sig').read().replace('\r\n', '\n').split('\n')
    caps, cur, nota = [], None, False
    for n, l in enumerate(L):
        if re.match(r'^# (?!#)', l):
            t = l[2:].strip()
            if n == 0: continue   # título geral do arquivo
            if re.match(r'(AP[ÊE]NDICE|Mapa de integridade|Plano de execu)', t, re.I): cur = None; continue   # notas de produção
            cur = {'t': titulo_bonito(t), 'linhas': []}; caps.append(cur); continue
        if cur is None: continue
        if re.match(r'^<a id="[^"]*"></a>$', l.strip()): continue
        if re.match(r'^\*Fonte: .*\*$', l.strip()): continue
        # blocos de citação de produção: "Natureza deste arquivo" e "Legenda dos blocos" (com as linhas seguintes do bloco)
        if re.match(r'^> \*\*(Natureza deste arquivo|Legenda dos blocos)', l): nota = True; continue
        if nota and l.startswith('>'): continue
        nota = False
        if l.strip() == '📘': continue
        cur['linhas'].append(re.sub(r'^📘 ', '', l))
    out = []
    for i, c in enumerate(caps, 1):
        txt = '\n'.join(c['linhas'])
        # cabeçalhos de produção do Caderno 1 (título repetido do livro e "Caderno 1 — ... mapa de integridade")
        txt = re.sub(r'^## Direito da Criança e do Adolescente\n### E-book de revisão estratégica[^\n]*\n#### Caderno 1[^\n]*\n', '', txt, flags=re.M)
        for a, b in TROCAS: txt = txt.replace(a, b)
        txt = re.sub(r'(\n---\s*)+\Z', '', re.sub(r'\n{3,}', '\n\n', txt)).strip()
        for x in re.findall(r'[^\n]*(?:material-base|CP Iuris|mapa de integridade)[^\n]*', txt): print('  ATENÇÃO, nota de produção:', x[:140])
        out.append({'id': f'c{i}', 't': c['t'], 'md': txt})
    d = {'id': eid, 'titulo': titulo, 'subtitulo': subtitulo, 'disc': disc, 'atualizado': date.today().isoformat(), 'caps': out}
    os.makedirs(os.path.join(AQUI, 'dados', 'ebooks'), exist_ok=True)
    p = os.path.join(AQUI, 'dados', 'ebooks', eid + '.json')
    json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(p, [(c['t'], len(c['md'])) for c in out])


# referências à produção ("o material-base ...") viram redação neutra para o aluno
TROCAS = [
    ('➕ **Complementação editorial (conferir antes de publicar):**', '➕ **Atualização:**'),
    (' O material-base não trata disso nesse trecho; confira a redação vigente da Lei 8.072/1990 e a jurisprudência atualizada.', ' Confira sempre a redação vigente da Lei 8.072/1990.'),
    ('**Roteiro do material-base em cinco momentos** (que este e-book seguirá, caderno a caderno):', '**Roteiro da Criminologia em cinco momentos** (que este material segue, parte a parte):'),
    ('Este Caderno 1 cobre o **1º momento** e a apresentação da disciplina.', 'Esta primeira parte cobre o **1º momento** e a apresentação da disciplina.'),
    (', segundo o material-base:', ':'),
    ('O material registra que negros', 'Registra-se que negros'),
    ('(dado atribuído a notícia da Câmara dos Deputados, Comissão de Direitos Humanos; veja o mapa de integridade quanto à conferência)', '(dado divulgado pela Comissão de Direitos Humanos da Câmara dos Deputados)'),
    ('O material parte de uma observação:', 'Parte-se de uma observação:'),
    (', reproduzida no material:', ':'),
    ('Para muitos autores, segundo o material, a', 'Para muitos autores, a'),
    ('O material usa a história da Lei 8.072/1990 para mostrar', 'A história da Lei 8.072/1990 mostra'),
    ('Antes de entrar nos detalhes, o material oferece o "filme" da disciplina:', 'Antes de entrar nos detalhes, veja o "filme" da disciplina:'),
    ('Outras formulações do material:', 'Outras formulações:'),
    (' (com certo exagero, avisa o material)', ' (com certo exagero)'),
    ('### Questões do material-base (preservadas)', '### Questões de concurso'),
    ('**Gabarito (conforme o material-base):**', '**Gabarito:**'),
    ('O próprio material-base registra que há divergências', 'Há divergências'),
    ('O material-base associa a essa etapa', 'A doutrina associa a essa etapa'),
    ('O material-base destaca o art.', 'Destaca-se o art.'),
    ('O material-base também relaciona', 'A doutrina também relaciona'),
    ('O material-base reproduz ainda previsão', 'Há ainda previsão'),
    ('O material-base também destaca', 'Destaca-se também'),
    ('O material-base destaca, ainda,', 'Destaca-se, ainda,'),
    ('O material-base explica', 'A doutrina explica'),
    ('O material-base menciona, entre os exemplos,', 'Entre os exemplos, estão'),
]


def titulo_bonito(t):
    m = re.match(r'^PARTE ([IVX]+) — (.+)$', t)
    if not m: return t
    resto = m.group(2).lower()
    for sig in ('eca', 'sinase', 'cf/88'): resto = re.sub(rf'\b{re.escape(sig)}\b', sig.upper(), resto)
    return f'Parte {m.group(1)} · {resto[0].upper()}{resto[1:]}'


def inserir(deck_p, fontes):
    d = json.load(open(deck_p, encoding='utf-8'))
    discs = {x['id'] for x in d['disciplinas']}
    eb = {e['id']: e for e in d.get('ebooks') or []}
    for p in fontes:
        e = json.load(open(p, encoding='utf-8')); assert e['disc'] in discs, e['disc']
        eb[e['id']] = e; print(e['id'], len(e['caps']), 'capítulos')
    d['ebooks'] = list(eb.values())
    json.dump(d, open(deck_p, 'w', encoding='utf-8'), ensure_ascii=False)


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == 'preparar' and len(a) == 6: preparar(*a[1:])
    elif a and a[0] == 'inserir' and len(a) >= 3: inserir(a[1], a[2:])
    else: sys.exit(__doc__ or 'uso: veja o cabeçalho do arquivo')
