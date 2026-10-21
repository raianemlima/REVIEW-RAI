import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {validarCatalogoConteudo,validarFontesCatalogo} from '../ferramentas/ci/validar_conteudo.mjs';
import {validarSite} from '../ferramentas/ci/validar_site.mjs';

const ler = nome => readFileSync(new URL(`../arquivos/${nome}`, import.meta.url), 'utf8');
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('catálogos reais cumprem o contrato e mantêm rubricas/tópicos ligados à fonte', () => {
  const resultado = validarFontesCatalogo({
    fonteTaxonomia: ler('cronograma-taxonomia.js'),
    fonteProgramas: ler('cronograma-conteudo.js'),
    fontePesos: ler('cronograma-pesos.js'),
  });
  assert.deepEqual(resultado, {editais:18,disciplinas:253,topicos:5364,canonicas:33,usadas:32});
});

test('site real carrega e inclui a taxonomia no CORE offline', () => {
  const resultado = validarSite(raiz);
  assert.ok(resultado.core.includes('arquivos/cronograma-taxonomia.js'));
});

test('peso não pode usar canônico que só existe em outro edital', () => {
  const topico = () => ({id:'t1',titulo:'Tópico',texto:'Texto da fonte',pagina:1,leis:[],juris:[]});
  const taxonomia = [
    {id:'civil',nome:'Direito Civil',cobertura:'teste',aliases:['civil'],nucleoComum:true},
    {id:'penal',nome:'Direito Penal',cobertura:'teste',aliases:['penal'],nucleoComum:false},
  ];
  const programas = {
    demo:{id:'demo',fonte:'demo.md',disciplinas:[{id:'civil',nome:'Direito Civil',canonicais:['civil'],topicos:[topico()]}]},
    outro:{id:'outro',fonte:'outro.md',disciplinas:[{id:'penal',nome:'Direito Penal',canonicais:['penal'],topicos:[topico()]}]},
  };
  const pesos = {demo:{grupos:[{label:'Penal',subjects:['penal']} ]}};
  assert.throws(() => validarCatalogoConteudo({taxonomia,programas,pesos}),/não está ligado a rubrica de programas\.demo/);
});
