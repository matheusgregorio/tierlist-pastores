# Tier List de Pastores

Tier list de pastores brasileiros, com arrastar e soltar (no celular: toque no nome e depois na fileira), rótulos das fileiras editáveis e botão para baixar a lista como imagem. O que você monta fica salvo no seu navegador.

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
