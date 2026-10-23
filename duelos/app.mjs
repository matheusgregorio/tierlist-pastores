import { CATEGORIAS, FASES, novoTorneio, chave, escolher, restaurarCategoria, sortear } from './torneio.mjs';
import { compartilharResultado } from './share.mjs';
import { ativo, podioDe, enviarPodio, buscarRanking } from './ranking.mjs';

const $ = id => document.getElementById(id);
const STORAGE = 'tierlist-duelos-v1';
let salvos = {};
try { salvos = JSON.parse(localStorage.getItem(STORAGE)) || {}; } catch {}
if (typeof salvos !== 'object' || Array.isArray(salvos)) salvos = {};
const torneios = Object.fromEntries(CATEGORIAS.map(c => [c.id, restaurarCategoria(c, salvos[c.id])]));
let categoria = CATEGORIAS[0];
let focoPendente = false;
let fotoURL = null;
let arquivo = null;
let categoriaExportada = null;
let acaoConfirmada = null;
const atual = () => torneios[categoria.id];

function salvar() {
  try { localStorage.setItem(STORAGE, JSON.stringify(Object.fromEntries(CATEGORIAS.map(c => [c.id, { ...torneios[c.id], versao: c.versao || 1 }])))); }
  catch { $('aviso').textContent = 'Não foi possível salvar o progresso. Você pode continuar jogando nesta página.'; }
}
function elemento(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}
function iniciais(nome) { return nome.split(/\s+/).filter(p => !/^(de|da|do|jr\.?|neto)$/i.test(p)).map(p => p[0]).filter(Boolean).filter((_, i, a) => i === 0 || i === a.length - 1).join(''); }
function retrato(p) {
  const el = elemento('span', 'retrato');
  el.setAttribute('aria-hidden', 'true');
  el.textContent = iniciais(p.nome);
  if (p.foto) {
    const img = new Image();
    img.alt = ''; img.src = p.foto; img.decoding = 'async';
    img.addEventListener('error', () => { img.remove(); el.textContent = iniciais(p.nome); });
    el.replaceChildren(img);
  }
  return el;
}
function votar(id) {
  if (!escolher(atual(), id)) return;
  salvar(); focoPendente = true; render();
}
function candidato(id) {
  const p = categoria.pessoas[id];
  const b = elemento('button', 'candidato'); b.type = 'button';
  b.setAttribute('aria-label', `Escolher ${p.nome}`);
  b.append(retrato(p), elemento('span', 'nome', p.nome), elemento('span', 'votar', 'Escolher →'));
  b.addEventListener('click', () => votar(id));
  return b;
}
function podio(info) {
  const box = elemento('div', 'podio');
  [[info.segundo, 'segundo', 2], [info.campeao, 'primeiro', 1], [info.terceiro, 'terceiro', 3]].forEach(([id, classe, lugar]) => {
    const p = categoria.pessoas[id];
    const coluna = elemento('div', `podio-lugar ${classe}`);
    coluna.setAttribute('aria-label', `${lugar}º lugar: ${p.nome}`);
    coluna.append(retrato(p), elemento('span', 'podio-nome', p.nome), elemento('div', 'degrau', `${lugar}º`));
    box.append(coluna);
  });
  return box;
}
function render() {
  const t = atual(), info = chave(t);
  const concluido = info.campeao !== null;
  const tituloFase = concluido ? 'SEU PÓDIO ESTÁ COMPLETO' : info.etapa === 'bronze' ? 'DISPUTA DE 3º LUGAR' : FASES[info.fase].toUpperCase();
  $('fase').textContent = tituloFase;
  $('categoria-titulo').textContent = categoria.titulo;
  $('contagem').textContent = `${t.escolhas.length} de 16 duelos`;
  $('progresso').value = t.escolhas.length;
  $('pergunta').textContent = info.etapa === 'bronze' ? 'Quem fica com o terceiro lugar?' : info.fase === 3 ? 'A grande final. Quem leva o primeiro lugar?' : categoria.pergunta;
  $('voltar').disabled = !t.escolhas.length;
  $('disputa').hidden = concluido;
  $('resultado').hidden = !concluido;
  $('compartilhar').hidden = !concluido;
  $('oponentes').replaceChildren(); $('resultado').replaceChildren();
  if (!concluido) {
    $('oponentes').append(candidato(info.par[0]), elemento('span', 'versus', 'VS'), candidato(info.par[1]));
  } else {
    const titulo = elemento('h3', '', 'Você escolheu o pódio.'); titulo.tabIndex = -1;
    $('resultado').append(elemento('p', 'eyebrow', 'DUELOS CONCLUÍDOS'), titulo, podio(info), elemento('p', 'sub', 'Agora desafie seus amigos a escolher o deles.'));
  }
  document.querySelectorAll('.categoria').forEach(b => b.setAttribute('aria-current', String(b.dataset.id === categoria.id)));
  renderChave(info);
  if (focoPendente) {
    focoPendente = false;
    (concluido ? $('resultado').querySelector('h3') : $('oponentes').querySelector('button')).focus({ preventScroll: true });
  }
  if (concluido) registrarPodio(info);
  // Deixa a foto da próxima dupla pronta antes da próxima escolha.
  const prox = info.rodadas[info.fase]?.slice((info.jogo + 1) * 2, (info.jogo + 2) * 2) || [];
  prox.forEach(id => { const p = categoria.pessoas[id]; if (p?.foto) { const img = new Image(); img.src = p.foto; } });
}
/* ===== Ranking geral =====
   Cada torneio concluído manda seu pódio uma única vez (até recomeçar ou sortear de novo). */
const ENVIADOS = 'tierlist-duelos-enviados';
function lerEnviados() { try { return JSON.parse(localStorage.getItem(ENVIADOS)) || {}; } catch { return {}; } }
function marcarEnviado(id, valor) {
  const e = lerEnviados(); if (valor) e[id] = valor; else delete e[id];
  try { localStorage.setItem(ENVIADOS, JSON.stringify(e)); } catch {}
}
async function registrarPodio(info) {
  if (!ativo()) return;
  const cat = categoria, versao = cat.versao || 1;
  if (lerEnviados()[cat.id] === versao) return;
  marcarEnviado(cat.id, versao);
  try { if (await enviarPodio(podioDe(cat, info))) { if (cat === categoria) atualizarRanking(); } else marcarEnviado(cat.id, null); }
  catch { marcarEnviado(cat.id, null); }
}
let rankingPedido = 0;
async function atualizarRanking() {
  if (!ativo()) return;
  const cat = categoria, pedido = ++rankingPedido;
  $('ranking').hidden = false;
  $('ranking-aviso').textContent = 'Carregando ranking…';
  try {
    const r = await buscarRanking(cat.id);
    if (pedido !== rankingPedido) return;
    $('ranking-sub').textContent = r.torneios
      ? `${r.torneios} ${r.torneios === 1 ? 'pódio registrado' : 'pódios registrados'} em ${cat.titulo.toLowerCase()}, somando todo mundo que terminou os duelos.`
      : '';
    $('ranking-aviso').textContent = r.linhas.length ? '' : 'Ainda não há resultados nesta categoria. Termine os duelos e seja o primeiro.';
    $('ranking-lista').replaceChildren(...r.linhas.slice(0, 10).map((l, i) => {
      const li = elemento('li');
      const p = cat.pessoas.find(x => x.nome === l.nome) || { nome: l.nome };
      const med = elemento('span', 'medalhas');
      [['ouro', l.ouro, '1º lugar'], ['prata', l.prata, '2º lugar'], ['bronze', l.bronze, '3º lugar']].forEach(([k, n, rot]) => {
        const m = elemento('span', `medalha ${k}${n ? '' : ' zero'}`, String(n)); m.title = `${n}× ${rot}`; m.setAttribute('aria-label', `${n} vezes em ${rot}`); med.append(m);
      });
      li.append(elemento('span', 'pos', `${i + 1}º`), retrato(p), elemento('span', 'nome', l.nome), med);
      return li;
    }));
  } catch {
    if (pedido !== rankingPedido) return;
    $('ranking-aviso').textContent = 'Não foi possível carregar o ranking agora. Tente de novo mais tarde.';
  }
}

function renderChave(info) {
  const root = $('chave'); root.replaceChildren();
  for (let fase = 0; fase < 5; fase++) {
    const col = elemento('div', 'coluna');
    col.append(elemento('h3', '', fase === 4 ? '1º lugar' : FASES[fase]));
    const jogos = elemento('div', 'jogos');
    const quantidade = fase === 4 ? 1 : 8 / 2 ** fase;
    const altura = 16 / quantidade;
    for (let j = 0; j < quantidade; j++) {
      const jogo = elemento('div', 'jogo');
      jogo.style.gridRow = `${j * altura + 1} / span ${altura}`;
      if (info.etapa === 'principal' && info.fase === fase && info.jogo === j) jogo.classList.add('ativo');
      const vencedor = info.rodadas[fase + 1]?.[j];
      const tamanho = fase === 4 ? 1 : 2;
      for (let lado = 0; lado < tamanho; lado++) {
        const id = info.rodadas[fase]?.[j * 2 + lado];
        const p = categoria.pessoas[id];
        const entrada = elemento('div', `entrada${!p ? ' pendente' : vencedor === id ? ' ganhador' : vencedor !== undefined ? ' perdedor' : ''}`, p?.nome || (fase === 4 ? 'A definir' : `Vencedor do duelo ${j * 2 + lado + 1}`));
        if (p && vencedor === id) entrada.append(elemento('span', 'check', '✓'));
        jogo.append(entrada);
      }
      jogos.append(jogo);
    }
    col.append(jogos); root.append(col);
  }
  const bronze = elemento('p', 'hint bronze-resumo');
  bronze.textContent = info.terceiro !== undefined ? `3º lugar: ${categoria.pessoas[info.terceiro].nome}` : 'O terceiro lugar é decidido entre os eliminados nas semifinais.';
  root.append(bronze);
}

for (const c of CATEGORIAS) {
  const b = elemento('button', 'categoria', c.curto); b.type = 'button'; b.dataset.id = c.id;
  b.style.setProperty('--category', c.cor);
  b.addEventListener('click', () => { location.hash = c.id; });
  $('categorias').append(b);
}
function selecionarCategoria() {
  categoria = CATEGORIAS.find(c => c.id === location.hash.slice(1)) || CATEGORIAS[0];
  document.documentElement.style.setProperty('--category', categoria.cor);
  $('aviso').textContent = '';
  render();
  atualizarRanking();
}
window.addEventListener('hashchange', selecionarCategoria);
selecionarCategoria();
$('voltar').addEventListener('click', () => { atual().escolhas.pop(); salvar(); focoPendente = true; render(); });
function confirmar(tipo) {
  const executar = () => {
    torneios[categoria.id] = tipo === 'sortear' ? sortear(Math.random, categoria) : novoTorneio();
    marcarEnviado(categoria.id, null);
    salvar(); render();
    $('aviso').textContent = tipo === 'sortear' ? 'Novos confrontos sorteados. Pode começar!' : 'Confrontos originais restaurados.';
  };
  if (!atual().escolhas.length) { executar(); return; }
  acaoConfirmada = executar;
  $('confirmacao-titulo').textContent = tipo === 'sortear' ? 'Sortear novos confrontos?' : 'Recomeçar esta categoria?';
  $('confirmacao-texto').textContent = 'As escolhas desta categoria serão apagadas. As outras categorias continuam salvas.';
  $('confirmacao').returnValue = 'cancelar';
  $('confirmacao').showModal();
}
$('confirmacao').addEventListener('close', () => {
  if ($('confirmacao').returnValue === 'confirmar') acaoConfirmada?.();
  acaoConfirmada = null;
});
$('reiniciar').addEventListener('click', () => confirmar('reiniciar'));
$('sortear').addEventListener('click', () => confirmar('sortear'));

const mediaTema = matchMedia('(prefers-color-scheme: dark)');
function escuro() { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : mediaTema.matches; }
function temaRotulo() { $('tema').setAttribute('aria-label', escuro() ? 'Ativar tema claro' : 'Ativar tema escuro'); }
$('tema').addEventListener('click', () => {
  const t = escuro() ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('tierlist-tema', t); } catch {}
  temaRotulo();
});
mediaTema.addEventListener('change', temaRotulo); temaRotulo();

function carregarImagem(src) {
  return new Promise(resolve => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    const tempo = setTimeout(() => resolve(null), 7000);
    img.onload = () => { clearTimeout(tempo); resolve(img); };
    img.onerror = () => { clearTimeout(tempo); resolve(null); };
    img.src = src;
  });
}
function textoQuebrado(ctx, texto, x, y, largura, linha) {
  const palavras = texto.split(' '); let atual = '';
  for (const p of palavras) {
    if (atual && ctx.measureText(`${atual} ${p}`).width > largura) { ctx.fillText(atual, x, y); y += linha; atual = p; }
    else atual += (atual ? ' ' : '') + p;
  }
  ctx.fillText(atual, x, y);
  return y;
}
function fotoCanvas(ctx, p, img, x, y, raio) {
  ctx.save(); ctx.beginPath(); ctx.roundRect(x - raio, y - raio, raio * 2, raio * 2, 20); ctx.clip();
  ctx.fillStyle = '#ded9cf'; ctx.fillRect(x - raio, y - raio, raio * 2, raio * 2);
  if (img) {
    const menor = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, (img.naturalWidth - menor) / 2, (img.naturalHeight - menor) / 2, menor, menor, x - raio, y - raio, raio * 2, raio * 2);
  } else { ctx.fillStyle = '#27241e'; ctx.font = '800 58px Figtree, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(iniciais(p.nome), x, y + 20); }
  ctx.restore();
}
function caixaCanvas(ctx, x, y, largura, altura, cor, raio = 12) {
  ctx.fillStyle = cor; ctx.beginPath(); ctx.roundRect(x, y, largura, altura, raio); ctx.fill();
}
function nomeCanvas(ctx, nome, x, y, largura, cor, peso = 700) {
  let tamanho = 24;
  ctx.font = `${peso} ${tamanho}px Figtree, sans-serif`;
  while (ctx.measureText(nome).width > largura && tamanho > 15) {
    ctx.font = `${peso} ${--tamanho}px Figtree, sans-serif`;
  }
  ctx.fillStyle = cor; ctx.textAlign = 'left'; ctx.fillText(nome, x, y);
}
function desenharChave(ctx, cat, info) {
  const xs = [54, 304, 554, 804], largura = 222, topo = 900, passo = 100;
  const centro = (fase, jogo) => topo + 42 + ((2 ** fase - 1) / 2 + jogo * 2 ** fase) * passo;
  const titulos = ['OITAVAS', 'QUARTAS', 'SEMIFINAIS', 'FINAL'];
  // Conexões são desenhadas antes dos cartões para ficarem por trás deles.
  ctx.strokeStyle = '#b6afa6'; ctx.lineWidth = 3;
  for (let fase = 0; fase < 3; fase++) {
    for (let jogo = 0; jogo < 8 / 2 ** fase; jogo++) {
      const y = centro(fase, jogo), destino = centro(fase + 1, Math.floor(jogo / 2));
      const inicio = xs[fase] + largura, fim = xs[fase + 1], meio = (inicio + fim) / 2;
      ctx.beginPath(); ctx.moveTo(inicio, y); ctx.lineTo(meio, y); ctx.lineTo(meio, destino); ctx.lineTo(fim, destino); ctx.stroke();
    }
  }
  for (let fase = 0; fase < 4; fase++) {
    ctx.textAlign = 'left'; ctx.fillStyle = '#6b655e'; ctx.font = '800 20px Figtree, sans-serif'; ctx.fillText(titulos[fase], xs[fase], 865);
    for (let jogo = 0; jogo < 8 / 2 ** fase; jogo++) {
      const x = xs[fase], y = centro(fase, jogo) - 42, vencedor = info.rodadas[fase + 1][jogo];
      caixaCanvas(ctx, x, y, largura, 84, '#ffffff');
      ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, largura, 84, 12); ctx.clip();
      for (let lado = 0; lado < 2; lado++) {
        const id = info.rodadas[fase][jogo * 2 + lado], ganhou = id === vencedor;
        if (ganhou) caixaCanvas(ctx, x, y + lado * 42, largura, 42, '#dce8f3', 0);
        if (ganhou) caixaCanvas(ctx, x, y + lado * 42, 5, 42, '#1f4e79', 0);
        nomeCanvas(ctx, cat.pessoas[id].nome, x + 12, y + lado * 42 + 28, largura - 24, ganhou ? '#1f4e79' : '#6b655e', ganhou ? 800 : 600);
      }
      ctx.restore();
      ctx.strokeStyle = '#d4cec6'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y + 42); ctx.lineTo(x + largura, y + 42); ctx.stroke();
    }
  }
  const perdedoresSemi = info.rodadas[2].filter(id => !info.rodadas[3].includes(id));
  const nomes = perdedoresSemi.map(id => cat.pessoas[id].nome).join(' × ');
  ctx.textAlign = 'left'; ctx.fillStyle = '#6b655e'; ctx.font = '700 22px Figtree, sans-serif';
  ctx.fillText('DISPUTA DE 3º LUGAR', 54, 1730);
  nomeCanvas(ctx, nomes, 54, 1770, 780, '#1d1b19');
  ctx.textAlign = 'right'; ctx.fillStyle = '#1f4e79'; ctx.font = '800 23px Figtree, sans-serif'; ctx.fillText(`3º: ${cat.pessoas[info.terceiro].nome}`, 1026, 1812);
}
async function gerarResultado(cat, estado) {
  const info = chave(estado);
  const ids = [info.segundo, info.campeao, info.terceiro];
  const fotos = await Promise.all(ids.map(id => carregarImagem(cat.pessoas[id].foto)));
  await Promise.race([document.fonts?.ready || Promise.resolve(), new Promise(r => setTimeout(r, 2000))]);
  const canvas = document.createElement('canvas'); canvas.width = 2160; canvas.height = 3840;
  const ctx = canvas.getContext('2d'); ctx.scale(2, 2);
  ctx.fillStyle = '#f3f1ee'; ctx.fillRect(0, 0, 1080, 1920);
  ['#e5484d', '#f08c3a', '#e9c43b', '#7cbf5a', '#4aa3c9', '#8b7fd1'].forEach((cor, i) => caixaCanvas(ctx, i * 180, 0, 180, 12, cor, 0));
  ctx.textAlign = 'left'; ctx.fillStyle = '#1f4e79'; ctx.font = '800 24px Figtree, sans-serif'; ctx.fillText('MEU DUELO', 54, 86);
  ctx.fillStyle = '#1d1b19'; ctx.font = '52px "Archivo Black", sans-serif';
  textoQuebrado(ctx, cat.titulo, 54, 160, 972, 60);
  ctx.font = '26px Figtree, sans-serif'; ctx.fillStyle = '#6b655e'; ctx.fillText('Meu pódio e o caminho até a final.', 54, 228);
  const xs = [215, 540, 865], ys = [410, 350, 450], topos = [625, 585, 665];
  const cores = ['#4aa3c9', '#e9c43b', '#f08c3a'], lugares = [2, 1, 3];
  ids.forEach((id, i) => {
    const p = cat.pessoas[id], x = xs[i], y = ys[i];
    fotoCanvas(ctx, p, fotos[i], x, y, i === 1 ? 110 : 90);
    ctx.textAlign = 'center'; ctx.fillStyle = '#1d1b19'; ctx.font = '800 34px Figtree, sans-serif';
    textoQuebrado(ctx, p.nome, x, y + (i === 1 ? 150 : 130), 280, 40);
    caixaCanvas(ctx, x - 145, topos[i], 290, 740 - topos[i], cores[i], [16,16,0,0]);
    ctx.fillStyle = '#1d1b19'; ctx.font = '56px "Archivo Black", sans-serif'; ctx.fillText(`${lugares[i]}º`, x, topos[i] + 56);
  });
  ctx.textAlign = 'left'; ctx.fillStyle = '#1d1b19'; ctx.font = '34px "Archivo Black", sans-serif'; ctx.fillText('Meu chaveamento', 54, 805);
  desenharChave(ctx, cat, info);
  ctx.textAlign = 'center'; ctx.fillStyle = '#1f4e79'; ctx.font = '800 28px Figtree, sans-serif'; ctx.fillText('E o seu pódio, como fica?', 540, 1860);
  ctx.fillStyle = '#6b655e'; ctx.font = '20px Figtree, sans-serif'; ctx.fillText('matheusgregorio.github.io/tierlist-pastores/duelos/', 540, 1903);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Falha ao gerar imagem');
  return blob;
}
$('compartilhar').addEventListener('click', async () => {
  const b = $('compartilhar'), cat = categoria, estado = structuredClone(atual());
  b.disabled = true; b.textContent = 'Preparando resultado…'; $('aviso').textContent = '';
  try {
    const blob = await gerarResultado(cat, estado);
    if (fotoURL) URL.revokeObjectURL(fotoURL);
    fotoURL = URL.createObjectURL(blob);
    arquivo = new File([blob], `duelo-${cat.id}.png`, { type: 'image/png' });
    categoriaExportada = cat;
    $('imagem-chave').src = fotoURL;
    $('exportacao-aviso').textContent = 'Compartilhe a imagem com o link para seus amigos fazerem os duelos deles.';
    $('exportacao').showModal();
  } catch { $('aviso').textContent = 'Não foi possível preparar a imagem. Tente novamente.'; }
  finally { b.disabled = false; b.textContent = 'Compartilhar resultado ↗'; }
});
$('fechar-exportacao').addEventListener('click', () => $('exportacao').close());
function baixarImagem() {
  if (!fotoURL || !arquivo) return;
  const a = elemento('a'); a.href = fotoURL; a.download = arquivo.name;
  document.body.append(a); a.click(); a.remove();
}
$('baixar').addEventListener('click', () => {
  baixarImagem();
  $('exportacao-aviso').textContent = 'Se a imagem abrir em outra tela, toque nela e segure para salvar.';
});
$('enviar').addEventListener('click', async () => {
  if (!arquivo || !categoriaExportada) return;
  const resultado = await compartilharResultado({ arquivo, categoria: categoriaExportada, navegador: navigator,
    baixar: baixarImagem, abrir: url => window.open(url, '_blank', 'noopener') });
  if (resultado === 'whatsapp') $('exportacao-aviso').textContent = 'A imagem foi baixada. Anexe-a à conversa do WhatsApp que abriu com o link.';
});
