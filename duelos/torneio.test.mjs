import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { CATEGORIAS, chave, escolher, novoTorneio, restaurar, sortear } from './torneio.mjs';

test('os 16 duelos produzem ouro, prata e bronze distintos', () => {
  const t = novoTorneio();
  for (let i = 0; i < 14; i++) {
    const info = chave(t);
    assert.equal(info.etapa, 'principal');
    assert.ok(escolher(t, info.par[0]));
  }
  let info = chave(t);
  assert.equal(info.etapa, 'bronze');
  assert.deepEqual(info.par, [4, 12]);
  assert.ok(escolher(t, 12));
  info = chave(t);
  assert.deepEqual(info.par, [0, 8]);
  assert.ok(escolher(t, 8));
  info = chave(t);
  assert.deepEqual([info.campeao, info.segundo, info.terceiro], [8, 0, 12]);
  assert.deepEqual(info.rodadas.map(r => r.length), [16, 8, 4, 2, 1]);
  assert.equal(escolher(t, 8), false);
});

test('desfazer e mudar uma escolha reconstrói adversários e pódio', () => {
  const t = novoTorneio();
  while (t.escolhas.length < 16) escolher(t, chave(t).par[0]);
  t.escolhas.pop();
  const final = chave(t);
  assert.equal(final.campeao, null);
  escolher(t, final.par[1]);
  assert.equal(chave(t).campeao, final.par[1]);
  while (t.escolhas.length > 13) t.escolhas.pop();
  escolher(t, chave(t).par[1]);
  assert.equal(chave(t).etapa, 'bronze');
  assert.deepEqual(chave(t).par, [4, 8]);
});

test('dados salvos são validados sem aceitar duelos ou ordens inválidos', () => {
  const t = novoTorneio(); escolher(t, 1);
  assert.deepEqual(restaurar(JSON.parse(JSON.stringify(t))), t);
  assert.deepEqual(restaurar({ ordem: Array(16).fill(0), escolhas: [] }), novoTorneio());
  assert.deepEqual(restaurar({ ordem: t.ordem, escolhas: [1, 99, 3] }).escolhas, [1]);
  for (const v of [null, {}, false, 'texto', {ordem: t.ordem, escolhas: Array(17).fill(0)}]) assert.deepEqual(restaurar(v), novoTorneio());
});

test('sorteio preserva 16 participantes únicos e a nova ordem ao restaurar', () => {
  const t = sortear(() => .27);
  assert.equal(new Set(t.ordem).size, 16);
  assert.notDeepEqual(t.ordem, novoTorneio().ordem);
  escolher(t, chave(t).par[1]);
  assert.deepEqual(restaurar(t), t);
});

test('quatro categorias têm 16 nomes únicos e fotos locais existentes', () => {
  assert.equal(CATEGORIAS.length, 4);
  for (const c of CATEGORIAS) {
    assert.equal(c.pessoas.length, 16);
    assert.equal(new Set(c.pessoas.map(p => p.nome)).size, 16);
    for (const p of c.pessoas) {
      assert.ok(p.foto, `Foto ausente: ${p.nome}`);
      assert.ok(existsSync(new URL(p.foto, import.meta.url)), `Arquivo ausente: ${p.nome}`);
    }
  }
});
