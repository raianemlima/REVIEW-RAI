import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const raiz = new URL('../', import.meta.url);
const py = process.platform === 'win32' ? 'python' : 'python3';
const roda = codigo => {
  const r = spawnSync(py, ['-I', '-c', `import sys, json; sys.path.insert(0, 'ferramentas/conteudo/varredura'); import varredura as v\n${codigo}`], { cwd: raiz.pathname.replace(/^\/([A-Za-z]:)/, '$1'), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

const PAGINA = (titulo, ementa) => `<html><body><p>${titulo}</p><p>${ementa}</p><p>O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:</p><p>Art. 1º Texto.</p></body></html>`;

test('a página do Planalto vira norma, data e ementa; o tachado (revogado) fica de fora', () => {
  const r = roda(`
html = '<html><body><p>LEI Nº 15.600, DE 3 DE NOVEMBRO DE 2026</p><p><a>Mensagem de veto</a> Altera o <strike>velho</strike> Código Penal para tratar de furto.</p><p>O PRESIDENTE DA REPÚBLICA Faço saber</p></body></html>'.encode()
print(json.dumps(v.extrair(html)))`);
  assert.deepEqual(r.slice(0, 4), ['lei', 15600, 2026, '2026-11-03']);
  assert.match(r[4], /^Altera o\s+Código Penal para tratar de furto\.$/);
  assert.equal(roda(`print(json.dumps(v.extrair(b'<html><body>Pagina qualquer</body></html>')))`), null);
});

test('prioridade: emenda e lei complementar sempre altas; homenagem baixa; Código Penal alta', () => {
  const r = roda(`print(json.dumps([v.relevancia('emc', 'Altera o art. 7'), v.relevancia('lcp', 'x'), v.relevancia('lei', 'Denomina Rodovia Fulano de Tal o trecho da BR-101'), v.relevancia('lei', 'Altera o Código Penal para tratar de furto.'), v.relevancia('lei', 'Dispõe sobre a poda de árvores.'), v.relevancia('lei', 'Institui o Dia Nacional do Frevo.')]))`);
  assert.deepEqual(r, ['alta', 'alta', 'baixa', 'alta', 'media', 'baixa']);
});

test('o que já está em Novidades não volta; o número sobe até faltarem 6 seguidos; pendentes entram', () => {
  const r = roda(`
pag = lambda n: ('LEI Nº %d, DE 10 DE OUTUBRO DE 2026' % n, 'Altera o Código Penal %d.' % n)
vistos = []
def baixar(url):
    vistos.append(url)
    m = __import__('re').search(r'l(\\d+)\\.htm', url)
    n = int(m.group(1)) if m else 0
    if n in (15527, 15528, 15529, 15300, 15471):
        return 200, ('<p>%s</p><p>%s</p><p>O PRESIDENTE DA REPÚBLICA Faço saber</p>' % pag(n)).encode()
    return 404, b''
from datetime import date
estado = {'lei': {'desde': 15527, 'ano': 2026, 'pendentes': [15300]}}
cob = {('lei', 15528, 2026)}
achadas, avisos = v.varrer_normas(estado, cob, date(2026, 11, 2), baixar=baixar)
print(json.dumps({'nums': sorted(a['num'] for a in achadas), 'avisos': avisos, 'tentativas': len(vistos)}))`);
  assert.deepEqual(r.nums, [15300, 15527, 15529]);
  assert.deepEqual(r.avisos, []);
  assert.ok(r.tentativas < 60, 'para depois de 6 números inexistentes por tipo');
});

test('sem conexão, a varredura avisa em vez de dizer que não há novidade', () => {
  const r = roda(`
from datetime import date
achadas, avisos = v.varrer_normas({'lei': {'desde': 15527, 'ano': 2026}}, set(), date(2026, 11, 2), baixar=lambda u: (None, b'sem rede'))
infos, av2 = v.varrer_informativos([{'tribunal': 'STF', 'ate': 1234}], baixar=lambda u: (None, b'sem rede'))
rel = v.relatorio(date(2026, 11, 2), achadas, infos, avisos + av2, {})
print(json.dumps({'achadas': len(achadas), 'avisos': len(avisos), 'rel': rel}))`);
  assert.equal(r.achadas, 0); assert.ok(r.avisos >= 1);
  assert.match(r.rel, /Atenção:.*O Planalto não devolveu uma norma conhecida.*sem conexão/);
  assert.doesNotMatch(r.rel, /Nenhuma norma nova/);
});

test('resposta 403 ou 429 do site conta como falta de acesso, não como "nenhuma norma nova"', () => {
  const r = roda(`
from datetime import date
a, av = v.varrer_normas({'lei': {'desde': 15527, 'ano': 2026, 'pendentes': [15352]}, 'lcp': {'desde': 239}, 'emc': {'desde': 142}}, set(), date(2026, 11, 2), baixar=lambda u: (403, b'Forbidden'))
i, av2 = v.varrer_informativos([{'tribunal': 'STJ', 'ate': 908}], baixar=lambda u: (429, b''))
print(json.dumps({'a': len(a), 'av': av, 'av2': av2}))`);
  assert.equal(r.a, 0);
  assert.ok(r.av.some(m => /O Planalto não devolveu.*resposta 403/.test(m)), JSON.stringify(r.av));
  assert.ok(r.av2.some(m => /Sem acesso ao STJ.*429/.test(m)), JSON.stringify(r.av2));
});

test('pendente que o Planalto não devolve vira aviso', () => {
  const r = roda(`
from datetime import date
a, av = v.varrer_normas({'lei': {'desde': 15527, 'ano': 2026, 'pendentes': [15352]}, 'lcp': {'desde': 239}, 'emc': {'desde': 142}}, set(), date(2026, 11, 2), baixar=lambda u: (200, b'<p>LEI N. 15.471, DE 20 DE JULHO DE 2026</p><p>Institui a estrategia.</p><p>O PRESIDENTE</p>') if '15471' in u else (404, b''))
print(json.dumps(av))`);
  assert.ok(r.some(m => /Lei 15\.352\/2026 está nas pendentes/.test(m)), JSON.stringify(r));
});

test('o Planalto responde com uma página de bloqueio: um único aviso claro, sem varrer à toa', () => {
  const r = roda(`
from datetime import date
vistos = []
def baixar(u):
    vistos.append(u); return 200, b'<html>Just a moment... cloudflare</html>'
a, av = v.varrer_normas({'lei': {'desde': 15527, 'ano': 2026, 'pendentes': [15352]}}, set(), date(2026, 11, 2), baixar=baixar)
print(json.dumps({'a': len(a), 'av': av, 'n': len(vistos)}))`);
  assert.equal(r.n, 1); assert.equal(r.a, 0); assert.equal(r.av.length, 1);
  assert.match(r.av[0], /Provável bloqueio de acesso vindo de servidores/);
});

test('informativo novo: STF pela existência da página, STJ pelo número da edição na página', () => {
  const r = roda(`
def baixar(url):
    if 'stf.jus.br' in url and url.endswith('informativo1235.htm'): return 200, b'x' * 6000
    if 'stj.jus.br' in url and 'livre=0909' in url: return 200, 'Informativo n\\u00ba 909 conteudo'.encode('latin-1', 'replace')
    return 404, b''
novas, av = v.varrer_informativos([{'tribunal': 'STF', 'ate': 1234}, {'tribunal': 'STJ', 'ate': 908}], baixar=baixar)
print(json.dumps([(n['tribunal'], n['numero']) for n in novas]))`);
  assert.deepEqual(r, [['STF', 1235], ['STJ', 909]]);
});

test('o estado da varredura cobre as normas pendentes e o workflow mensal existe', () => {
  const e = JSON.parse(readFileSync(new URL('ferramentas/conteudo/dados/varredura-estado.json', raiz), 'utf8'));
  assert.deepEqual(e.lei.pendentes, [15352, 15409, 15413, 15426, 15450, 15472]);
  assert.deepEqual(e.lcp.pendentes, [227, 238]);
  assert.ok(e.lei.desde > 15526 && e.lcp.desde > 238 && e.emc.desde > 141);
  const wf = readFileSync(new URL('.github/workflows/varredura-mensal.yml', raiz), 'utf8');
  assert.match(wf, /cron: "0 11 1 \* \*"/);
  assert.match(wf, /issues: write/);
  assert.doesNotMatch(wf, /contents: write/, 'a varredura não escreve no repositório');
});
