// A ordem define os confrontos das oitavas, como nos modelos de referência.
const pessoa = (nome, foto) => ({ nome, foto: foto || `fotos/${nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.jpg` });
const br = (nome, numero) => pessoa(nome, `../fotos/${numero}.jpg`);
const hist = (nome, numero) => pessoa(nome, `../historia/fotos/${numero}.jpg`);

export const CATEGORIAS = [
  {
    id: 'pregadores', versao: 2, titulo: 'Pregadores brasileiros', curto: 'Pregadores', cor: '#1f4e79',
    pergunta: 'Quem avança para a próxima fase?',
    pessoas: [
      br('Augustus Nicodemus', '01'), br('Hernandes Dias Lopes', '02'),
      br('Franklin Ferreira', 'franklin-ferreira'), br('Luiz Sayão', '04'),
      br('Paulo Junior', '25'), br('Heber Campos Jr.', '26'),
      br('Filipe Fontes', '27'), br('Yago Martins', '05'),
      br('Carlos Vailatti', '29'), br('Elizeu Rodrigues', '39'),
      pessoa('Emílio Garófalo Neto'), br('Victor Fontana', '23'),
      br('Judiclay Santos', 'judiclay-santos'), pessoa('Mauro Meister'),
      br('Jonas Madureira', '03'), br('Marcos Granconato', '34'),
    ],
  },
  {
    id: 'internacionais', titulo: 'Teólogos internacionais', curto: 'Internacionais', cor: '#4aa3c9',
    pergunta: 'Quem avança para a próxima fase?',
    pessoas: [
      pessoa('John Piper'), pessoa('John MacArthur'),
      pessoa('Paul Washer'), pessoa('Tim Keller'),
      pessoa('R. C. Sproul'), pessoa('Tim Chester'),
      pessoa('D. A. Carson'), pessoa('John Stott'),
      pessoa('Wayne Grudem'), pessoa('James K. A. Smith'),
      pessoa('Mark Driscoll'), pessoa('Mark Dever'),
      pessoa('Kevin Vanhoozer'), pessoa('Kevin DeYoung'),
      pessoa('Joel Beeke'), pessoa('N. T. Wright'),
    ],
  },
  {
    id: 'historicos', titulo: 'Teólogos históricos', curto: 'Históricos', cor: '#7cbf5a',
    pergunta: 'Quem avança para a próxima fase?',
    pessoas: [
      hist('João Calvino', '14'), hist('Jacó Armínio', '18'),
      hist('Martinho Lutero', '11'), hist('Martin Bucer', '31'),
      hist('John Owen', '20'), hist('Jonathan Edwards', '23'),
      hist('Agostinho de Hipona', '03'), hist('Tomás de Aquino', '08'),
      hist('John Bunyan', '22'), hist('John Knox', '16'),
      hist('Martyn Lloyd-Jones', '33'), hist('Louis Berkhof', '32'),
      hist('Charles H. Spurgeon', '27'), hist('Herman Bavinck', '29'),
      hist('John Wesley', '24'), hist('George Whitefield', '25'),
    ],
  },
  {
    id: 'hereges', versao: 2, titulo: 'Dos hereges', curto: 'Dos hereges', cor: '#e5484d',
    pergunta: 'Na sua opinião, quem é mais herege?',
    pessoas: [
      br('Edir Macedo', '13'), br('Valdemiro Santiago', '22'),
      pessoa('Agenor Duque'), pessoa('R. R. Soares'),
      pessoa('Apóstola Sol'), pessoa('Ingrid Duque'),
      br('Silas Malafaia', '40'), pessoa('Renê Terra Nova'),
      pessoa('Ricardo Gondim'), pessoa('Henrique Vieira'),
      br('Caio Fábio', '31'), pessoa('Ariovaldo Ramos'),
      pessoa('Tiago Brunet'), br('Deive Leonardo', '11'),
      pessoa('Victor Azevedo'), br('Tupirani da Hora Lores', '48'),
    ],
  },
];

export const FASES = ['Oitavas de final', 'Quartas de final', 'Semifinais', 'Final'];
export const ordemInicial = () => Array.from({ length: 16 }, (_, i) => i);

export function novoTorneio(ordem = ordemInicial()) {
  return { ordem: [...ordem], escolhas: [] };
}

// Reconstrói a chave a partir do histórico. Os adversários das rodadas futuras
// nunca são armazenados separadamente, evitando resultados desatualizados.
export function chave(torneio) {
  const rodadas = [torneio.ordem];
  let offset = 0;
  for (let fase = 0; fase < 3; fase++) {
    const atual = rodadas[fase];
    const vencedores = [];
    for (let jogo = 0; jogo < atual.length / 2; jogo++) {
      const escolhido = torneio.escolhas[offset + jogo];
      if (escolhido !== atual[jogo * 2] && escolhido !== atual[jogo * 2 + 1]) break;
      vencedores.push(escolhido);
    }
    rodadas.push(vencedores);
    if (vencedores.length !== atual.length / 2) {
      return { rodadas, fase, jogo: vencedores.length,
        par: atual.slice(vencedores.length * 2, vencedores.length * 2 + 2), campeao: null, etapa: 'principal' };
    }
    offset += vencedores.length;
  }
  const finalistas = rodadas[3];
  const bronze = rodadas[2].filter(id => !finalistas.includes(id));
  if (torneio.escolhas.length < 15) {
    return { rodadas, fase: 3, jogo: 0, par: bronze, campeao: null, etapa: 'bronze' };
  }
  const terceiro = torneio.escolhas[14];
  if (torneio.escolhas.length < 16) {
    return { rodadas, fase: 3, jogo: 0, par: finalistas, campeao: null, terceiro, etapa: 'principal' };
  }
  const campeao = torneio.escolhas[15];
  rodadas.push([campeao]);
  return { rodadas, fase: 4, jogo: 0, par: [], campeao,
    segundo: finalistas.find(id => id !== campeao), terceiro, etapa: 'concluido' };
}

export function escolher(torneio, participante) {
  if (!chave(torneio).par.includes(participante)) return false;
  torneio.escolhas.push(participante);
  return true;
}

export function restaurar(valor) {
  if (!valor || !Array.isArray(valor.ordem) || valor.ordem.length !== 16 ||
      new Set(valor.ordem).size !== 16 ||
      !valor.ordem.every(n => Number.isInteger(n) && n >= 0 && n < 16) ||
      !Array.isArray(valor.escolhas) || valor.escolhas.length > 16) return novoTorneio();
  const torneio = novoTorneio(valor.ordem);
  for (const id of valor.escolhas) {
    if (!escolher(torneio, id)) break;
  }
  return torneio;
}

export function sortear(aleatorio = Math.random) {
  const ordem = ordemInicial();
  for (let i = ordem.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
  }
  return novoTorneio(ordem);
}

// Evita reaproveitar escolhas por índice quando os participantes mudam.
// Categorias que mantêm o elenco continuam aceitando o progresso anterior.
export function restaurarCategoria(categoria, valor) {
  if ((valor?.versao || 1) !== (categoria.versao || 1)) return novoTorneio();
  return restaurar(valor);
}
