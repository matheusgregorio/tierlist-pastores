// Ranking geral dos pódios, guardado no Supabase.
// Enquanto URL e CHAVE estiverem vazias, o ranking fica desligado e a página funciona como antes.
// A chave é a "publishable" (anon) do projeto: ela é pública por natureza e só permite
// o que as regras do banco liberam (registrar um pódio e ler o ranking somado).
export const SUPABASE = {
  URL: '',   // ex.: 'https://abcdefgh.supabase.co'
  CHAVE: '', // ex.: 'sb_publishable_...' ou a chave anon 'eyJ...'
};

export const ativo = (cfg = SUPABASE) => Boolean(cfg.URL && cfg.CHAVE);

function cabecalhos(cfg) {
  const h = { apikey: cfg.CHAVE, 'Content-Type': 'application/json' };
  if (cfg.CHAVE.startsWith('eyJ')) h.Authorization = `Bearer ${cfg.CHAVE}`;
  return h;
}

// Pódio de um torneio concluído, no formato da tabela "resultados".
export function podioDe(categoria, info) {
  const nome = id => categoria.pessoas[id]?.nome;
  const ouro = nome(info.campeao), prata = nome(info.segundo), bronze = nome(info.terceiro);
  if (!ouro || !prata || !bronze || new Set([ouro, prata, bronze]).size !== 3) return null;
  return { categoria: categoria.id, ouro, prata, bronze };
}

export async function enviarPodio(podio, { cfg = SUPABASE, fetch: f = fetch } = {}) {
  if (!ativo(cfg) || !podio) return false;
  const r = await f(`${cfg.URL}/rest/v1/resultados`, {
    method: 'POST', headers: { ...cabecalhos(cfg), Prefer: 'return=minimal' }, body: JSON.stringify(podio),
  });
  return r.ok;
}

// Quadro de medalhas: mais ouros primeiro, depois pratas, depois bronzes, depois nome.
export function ordenar(linhas) {
  return [...linhas].sort((a, b) => b.ouro - a.ouro || b.prata - a.prata || b.bronze - a.bronze || a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function buscarRanking(categoriaId, { cfg = SUPABASE, fetch: f = fetch } = {}) {
  if (!ativo(cfg)) return null;
  const q = encodeURIComponent(categoriaId);
  const [rr, rt] = await Promise.all([
    f(`${cfg.URL}/rest/v1/ranking?categoria=eq.${q}&select=nome,ouro,prata,bronze`, { headers: cabecalhos(cfg) }),
    f(`${cfg.URL}/rest/v1/totais?categoria=eq.${q}&select=torneios`, { headers: cabecalhos(cfg) }),
  ]);
  if (!rr.ok || !rt.ok) throw new Error('ranking indisponível');
  const linhas = (await rr.json()).map(l => ({ nome: l.nome, ouro: +l.ouro || 0, prata: +l.prata || 0, bronze: +l.bronze || 0 }));
  const torneios = +((await rt.json())[0]?.torneios) || 0;
  return { torneios, linhas: ordenar(linhas) };
}
