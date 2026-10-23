import test from 'node:test';
import assert from 'node:assert/strict';
import { compartilharResultado } from './share.mjs';

const categoria = { id: 'historicos', titulo: 'Teólogos históricos' };
const arquivo = new Blob(['imagem'], { type: 'image/png' });

test('compartilha o arquivo e o link da categoria juntos', async () => {
  let enviado;
  const resultado = await compartilharResultado({
    arquivo, categoria,
    navegador: { canShare: () => true, share: async dados => { enviado = dados; } },
    baixar: () => assert.fail('não deve baixar quando o envio nativo funciona'),
    abrir: () => assert.fail('não deve abrir WhatsApp quando o envio nativo funciona'),
  });
  assert.equal(resultado, 'enviado');
  assert.equal(enviado.files[0], arquivo);
  assert.ok(enviado.text.includes('https://matheusgregorio.github.io/tierlist-pastores/duelos/#historicos'));
  assert.ok(enviado.text.includes('Faça o seu'));
});

test('cancelar o menu nativo não baixa nem abre outra janela', async () => {
  const resultado = await compartilharResultado({
    arquivo, categoria,
    navegador: { canShare: () => true, share: async () => { throw new DOMException('Cancelado', 'AbortError'); } },
    baixar: () => assert.fail('cancelamento deve encerrar a ação'),
    abrir: () => assert.fail('cancelamento deve encerrar a ação'),
  });
  assert.equal(resultado, 'cancelado');
});

for (const [nome, navegador] of [
  ['sem compartilhamento nativo', {}],
  ['sem suporte ao arquivo', { share: async () => assert.fail(), canShare: () => false }],
  ['quando o envio falha', { canShare: () => true, share: async () => { throw new Error('Falha'); } }],
]) {
  test(`baixa a imagem e prepara o link no WhatsApp ${nome}`, async () => {
    let baixado = false, url;
    const resultado = await compartilharResultado({ arquivo, categoria, navegador,
      baixar: () => { baixado = true; }, abrir: destino => { url = destino; } });
    assert.equal(resultado, 'whatsapp'); assert.ok(baixado);
    assert.ok(new URL(url).searchParams.get('text').includes('/duelos/#historicos'));
  });
}
