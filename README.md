# Tier List de Pastores

Tier list de pastores brasileiros, com arrastar e soltar (no celular: toque no nome e depois na fileira), rótulos das fileiras editáveis e botão para baixar a lista como imagem. O que você monta fica salvo no seu navegador.

## Duelo de Pregadores

A seção `duelos/` funciona primeiro no celular, com uma dupla por vez: toque na foto ou no nome para escolher. São quatro categorias de 16 participantes, com oitavas, quartas, semifinais, disputa de terceiro lugar e final. No computador, a área de jogo permanece compacta e centralizada.

Cada categoria salva seu progresso separadamente no navegador. É possível desfazer a última escolha, restaurar os confrontos originais ou sortear uma nova chave. O resultado mostra o pódio com 1º, 2º e 3º lugares e gera uma imagem PNG com o pódio no topo e o chaveamento completo abaixo para baixar ou compartilhar pelo menu nativo nos navegadores compatíveis.

Os nomes, as fotos e a ordem inicial estão em `duelos/torneio.mjs`. As fotos novas estão em `duelos/fotos/`; as fontes e os recortes estão registrados em `duelos/fontes-fotos.json`. As demais fotos são reutilizadas das duas tier lists existentes. O funcionamento não depende de serviços externos nem de ferramentas de build.

O botão Compartilhar envia a imagem e uma mensagem com o link da categoria para os amigos jogarem os próprios duelos. Em navegadores sem envio nativo de arquivos, baixa a imagem e abre o WhatsApp com o link, seguindo o comportamento das outras tier lists.

Para verificar o torneio, os arquivos de fotos e o compartilhamento, execute `node --test duelos/*.test.mjs`.

## Como editar a lista

Os pastores estão no início do `<script>` em `index.html`, na constante `PASTORES`:

```js
{ id: "p01", nome: "Nº 1", foto: "fotos/01.jpg" },
```

- Para dar nome, troque o texto de `nome`.
- Para adicionar alguém, crie uma linha nova com um `id` que ainda não exista e, se tiver foto, coloque a imagem em `fotos/`.
- Sem `foto`, aparecem as iniciais.

## Publicar

Em **Settings → Pages**, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.

## Teólogos da História

A segunda tier list fica em `historia/` (endereço `/historia`), com a mesma estrutura: a lista está em `historia/index.html` e as fotos em `historia/fotos/`. Os retratos vêm da Wikimedia Commons (obras em domínio público).
