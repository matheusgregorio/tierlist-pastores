import test from 'node:test';
import assert from 'node:assert/strict';
import { ativo, podioDe, enviarPodio, buscarRanking, ordenar } from './ranking.mjs';
import { CATEGORIAS, chave, escolher, novoTorneio } from './torneio.mjs';

const cfg = { URL: 'https://teste.supabase.co', CHAVE: 'sb_publishable_teste' };

test('sem URL e chave o ranking fica desligado e não faz requisições', async () => {
  assert.equal(ativo({ URL: '', CHAVE: '' }), false);
  let chamadas = 0;
  const f = async () => { chamadas++; return { ok: true }; };
  assert.equal(await enviarPodio({ categoria: 'x', ouro: 'a', prata: 'b', bronze: 'c' }, { cfg: { URL: '', CHAVE: '' }, fetch: f }), false);
  assert.equal(await buscarRanking('x', { cfg: { URL: '', CHAVE: '' }, fetch: f }), null);
  assert.equal(chamadas, 0);
});

test('o pódio de um torneio concluído vira ouro, prata e bronze com os nomes', () => {
  const cat = CATEGORIAS[0], t = novoTorneio();
  while (chave(t).campeao === null) escolher(t, chave(t).par[0]);
  const info = chave(t), p = podioDe(cat, info);
  assert.deepEqual(p, { categoria: cat.id, ouro: cat.pessoas[info.campeao].nome, prata: cat.pessoas[info.segundo].nome, bronze: cat.pessoas[info.terceiro].nome });
});

test('envio usa a tabela resultados com a chave pública', async () => {
  let pedido;
  const f = async (url, op) => { pedido = { url, op }; return { ok: true }; };
  assert.equal(await enviarPodio({ categoria: 'pregadores', ouro: 'A', prata: 'B', bronze: 'C' }, { cfg, fetch: f }), true);
  assert.equal(pedido.url, 'https://teste.supabase.co/rest/v1/resultados');
  assert.equal(pedido.op.method, 'POST');
  assert.equal(pedido.op.headers.apikey, cfg.CHAVE);
  assert.deepEqual(JSON.parse(pedido.op.body), { categoria: 'pregadores', ouro: 'A', prata: 'B', bronze: 'C' });
});

test('quadro de medalhas ordena por ouro, depois prata, depois bronze', () => {
  const r = ordenar([
    { nome: 'C', ouro: 1, prata: 5, bronze: 0 },
    { nome: 'A', ouro: 2, prata: 0, bronze: 0 },
    { nome: 'B', ouro: 1, prata: 5, bronze: 2 },
    { nome: 'D', ouro: 0, prata: 9, bronze: 9 },
  ]);
  assert.deepEqual(r.map(x => x.nome), ['A', 'B', 'C', 'D']);
});

test('busca do ranking junta linhas e total de pódios', async () => {
  const f = async url => ({ ok: true, json: async () => url.includes('/totais')
    ? [{ torneios: 3 }]
    : [{ nome: 'X', ouro: '1', prata: '0', bronze: '2' }, { nome: 'Y', ouro: '2', prata: '1', bronze: '0' }] });
  const r = await buscarRanking('pregadores', { cfg, fetch: f });
  assert.equal(r.torneios, 3);
  assert.deepEqual(r.linhas.map(l => l.nome), ['Y', 'X']);
});
