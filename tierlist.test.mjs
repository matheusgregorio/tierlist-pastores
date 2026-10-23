import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

for (const arquivo of ['index.html', 'historia/index.html']) {
  const html = readFileSync(new URL(arquivo, import.meta.url), 'utf8');
  function lista(pos = {}) {
    const contexto = vm.createContext({});
    const codigo = html.slice(html.indexOf('function ativarCartao('), html.indexOf('let antesDeRemover'));
    vm.runInContext(`
      const TIERS = [{id:'S'},{id:'A'}];
      const pessoas = ['a','b','c','d'].map(id => ({id}));
      const pid = p => p.id;
      const todos = () => pessoas;
      let estado = {pos: ${JSON.stringify(pos)}, ordem: {}};
      let selecionado = null, salvo = null;
      const document = {querySelectorAll: () => []};
      function salvar() { salvo = JSON.stringify(estado); }
      function render() { selecionado = null; }
      ${codigo}
      const fileiras = Object.fromEntries(['S','A','pool'].map(dest => [dest, {
        dataset: {dest}, querySelectorAll: () => naFileira(pessoas,dest).map(p => cartoes[p.id])
      }]));
      const cartoes = Object.fromEntries(pessoas.map(p => [p.id, {
        dataset: {id:p.id}, classList: {add(){},remove(){}},
        closest: () => fileiras[estado.pos[p.id] || 'pool']
      }]));
      function clicar(id) { ativarCartao(cartoes[id]); }
      function ordem(dest) { return naFileira(pessoas,dest).map(pid); }
      function recarregar() { estado = JSON.parse(salvo); selecionado = null; }
    `, contexto);
    return {run: code => JSON.parse(JSON.stringify(vm.runInContext(code, contexto) ?? null))};
  }
  for (const [nome, cliques, esperado] of [
    ['vizinho à direita', ['a','b'], ['b','a','c','d']],
    ['vizinho à esquerda', ['b','a'], ['b','a','c','d']],
    ['última posição', ['a','d'], ['b','c','d','a']],
    ['primeira posição', ['d','a'], ['d','a','b','c']],
  ]) {
    test(`${arquivo}: clique para ${nome}, salvo após recarregar`, () => {
      const l = lista({a:'S', b:'S', c:'S', d:'S'});
      for (const id of cliques) l.run(`clicar('${id}')`);
      assert.deepEqual(l.run("ordem('S')"), esperado);
      l.run('recarregar()');
      assert.deepEqual(l.run("ordem('S')"), esperado);
    });
  }
  test(`${arquivo}: reordena o banco e mantém a ordem`, () => {
    const l = lista();
    l.run("clicar('a'); clicar('c'); recarregar()");
    assert.deepEqual(l.run("ordem('pool')"), ['b','c','a','d']);
  });
  test(`${arquivo}: move entre fileiras sem duplicar cartões`, () => {
    const l = lista({a:'S', b:'S', c:'A'});
    l.run("clicar('a'); clicar('c')");
    assert.deepEqual(l.run("ordem('S')"), ['b']);
    assert.deepEqual(l.run("ordem('A')"), ['a','c']);
    l.run("mover('a','pool'); recarregar()");
    assert.deepEqual(l.run("ordem('pool')"), ['d','a']);
    assert.deepEqual(l.run("ordem('A')"), ['c']);
  });
  test(`${arquivo}: clicar novamente cancela seleção`, () => {
    const l = lista();
    l.run("clicar('a'); clicar('a')");
    assert.equal(l.run('selecionado'), null);
    assert.deepEqual(l.run("ordem('pool')"), ['a','b','c','d']);
  });
}

test('novos pastores têm IDs únicos e fotos locais', () => {
  const html = readFileSync(new URL('index.html', import.meta.url), 'utf8');
  const pessoas = vm.runInNewContext(html.match(/const PASTORES = (\[[\s\S]*?\]);/)[1]);
  assert.equal(new Set(pessoas.map(p => p.id)).size, pessoas.length);
  for (const nome of ['Mauro Meister','Pedro Dulci','Judiclay Santos','Valter Reggiani']) {
    const pessoa = pessoas.find(p => p.nome === nome);
    assert.ok(pessoa, nome);
    assert.ok(existsSync(new URL(pessoa.foto, import.meta.url)), pessoa.foto);
  }
});

test('pregadores e históricos estão nas tier lists; categoria dos hereges fica fora', async () => {
  const {CATEGORIAS} = await import('./duelos/torneio.mjs');
  const aliases = {'Hernandes Dias Lopes':'HDL', 'Agostinho de Hipona':'Agostinho', 'Charles H. Spurgeon':'Charles Spurgeon'};
  for (const arquivo of ['index.html', 'historia/index.html']) {
    const html = readFileSync(new URL(arquivo, import.meta.url), 'utf8');
    const pessoas = vm.runInNewContext(html.match(/const PASTORES = (\[[\s\S]*?\]);/)[1]);
    assert.equal(new Set(pessoas.map(p => p.id)).size, pessoas.length);
    assert.equal(new Set(pessoas.map(p => p.nome)).size, pessoas.length);
    for (const p of pessoas) assert.ok(existsSync(new URL(p.foto, new URL(arquivo, import.meta.url))), p.nome);
    if (arquivo === 'index.html') {
      const excluidos = [...CATEGORIAS.find(c => c.id === 'hereges').pessoas.map(p => p.nome), 'Márcio Poncio'];
      for (const nome of excluidos) assert.ok(!pessoas.some(p => p.nome === nome), nome);
    }
    const categorias = arquivo.startsWith('historia') ? ['historicos'] : ['pregadores'];
    for (const c of CATEGORIAS.filter(c => categorias.includes(c.id))) for (const p of c.pessoas) {
      const existe = pessoas.some(item => item.nome === (aliases[p.nome] || p.nome));
      assert.equal(existe, !['Leandro Lima','Sérgio Lima'].includes(p.nome), p.nome);
    }
  }
});
