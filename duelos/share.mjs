const SITE = 'https://matheusgregorio.github.io/tierlist-pastores/duelos/';

export function mensagemCompartilhar(categoria) {
  return `Montei meu mata-mata de ${categoria.titulo}. Faça o seu: ${SITE}#${categoria.id}`;
}

// O clique no botão chama o menu nativo imediatamente, preservando a ativação
// exigida pelo Safari. A imagem já está pronta quando a prévia é aberta.
export async function compartilharResultado({ arquivo, categoria, navegador, baixar, abrir }) {
  const text = mensagemCompartilhar(categoria);
  if (navegador.share && navegador.canShare?.({ files: [arquivo] })) {
    try {
      await navegador.share({ files: [arquivo], text, title: 'Meu pódio e chaveamento do mata-mata' });
      return 'enviado';
    } catch (erro) {
      if (erro.name === 'AbortError') return 'cancelado';
    }
  }
  // Mesmo comportamento das outras tier lists em navegadores sem envio de arquivo.
  baixar();
  abrir(`https://wa.me/?text=${encodeURIComponent(text)}`);
  return 'whatsapp';
}
