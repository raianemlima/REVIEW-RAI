import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const js = readFileSync(new URL('../arquivos/interface.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../arquivos/interface.css', import.meta.url), 'utf8');

test('navegação real vai diretamente ao body e mede espaço inferior sem recriar tabs', () => {
  assert.match(js, /document\.body\.appendChild\(side\)/);
  assert.match(js, /side\.appendChild\(tabs\)/);
  assert.match(js, /new ResizeObserver\(medirNavegacao\)/);
  assert.match(js, /setProperty\("--rd-nav-space"/);
  const dom = new JSDOM('<!doctype html><body><header class="top"></header><nav id="tabs"><button id="tab-hoje">Hoje</button></nav></body>');
  const { document } = dom.window;
  const tabs = document.querySelector('#tabs');
  let ativacoes = 0;
  tabs.querySelector('button').addEventListener('click', () => ativacoes++);
  const sidebar = document.createElement('aside');
  sidebar.id = 'rdSidebar';
  sidebar.appendChild(tabs);
  document.body.appendChild(sidebar);
  tabs.querySelector('button').click();
  assert.equal(document.querySelectorAll('#tabs').length, 1);
  assert.equal(document.querySelector('#tabs'), tabs);
  assert.equal(tabs.parentElement, sidebar);
  assert.equal(sidebar.parentElement, document.body);
  assert.equal(ativacoes, 1);
  dom.window.close();
});

test('CSS mantém barra fixa compacta e reserva o espaço medido inclusive para rolagem', () => {
  const mobile = css.slice(css.indexOf('@media (max-width: 900px)'), css.indexOf('@media (max-width: 400px)'));
  assert.match(mobile, /#rdSidebar\.rd-sidebar\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(mobile, /#rdSidebar nav\.tabs button\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(mobile, /padding-bottom:\s*var\(--rd-nav-space/);
  assert.match(mobile, /scroll-padding-bottom:\s*var\(--rd-nav-space/);
  assert.match(mobile, /safe-area-inset-bottom/);
});

test('camada real recolhe a barra durante edição móvel e a restaura depois do foco', async () => {
  const dom=new JSDOM('<!doctype html><html><body><header class="top"><div class="brand"><h1>Review DPE</h1></div><button id="goBusca"></button><button id="goTema"></button><nav id="tabs"><button role="tab" id="tab-hoje">Hoje</button></nav></header><main id="main"><textarea id="reflexao"></textarea></main></body></html>',{runScripts:'outside-only',url:'https://fixture.invalid/'});
  try {
    Object.defineProperty(dom.window,'innerWidth',{value:390,writable:true});
    dom.window.requestAnimationFrame=f=>dom.window.setTimeout(f,0);
    dom.window.eval('var S={mode:"local",tab:"ajustes",ajustes:{}};var render=()=>{},renderHoje=()=>{},renderSession=()=>{},temaAplicar=()=>{},temaEscuro=()=>false,go=()=>{},dayToDate=()=>new Date(),streakInfo=()=>({n:0});');
    const tabs=dom.window.document.querySelector('#tabs');let clicks=0;tabs.querySelector('button').addEventListener('click',()=>clicks++);
    dom.window.eval(js);
    assert.equal(tabs.parentElement.parentElement,dom.window.document.body);
    const campo=dom.window.document.querySelector('#reflexao');campo.focus();assert.ok(dom.window.document.documentElement.classList.contains('rd-editando'));
    campo.blur();await new Promise(r=>setTimeout(r,10));assert.equal(dom.window.document.documentElement.classList.contains('rd-editando'),false);
    tabs.querySelector('button').click();assert.equal(clicks,1);assert.equal(dom.window.document.querySelectorAll('#tabs').length,1);
  } finally {dom.window.close();}
});
