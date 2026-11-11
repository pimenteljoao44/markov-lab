# Para o assistente de IA que for mexer neste projeto

Este repositório é um caderno de estudo de IA: uma trilha em cinco fases e laboratórios interativos. Antes de escrever código, leia `docs/PADRAO.md`. Ele é a fonte do padrão de código, de design e de texto; este arquivo só resume o que não pode ser esquecido.

## O que nunca fazer

- Adicionar etapa de build, gerenciador de pacotes, framework ou dependência por CDN.
- Fazer a página pedir qualquer coisa a outro site.
- Colocar nome de empresa, pessoa, cliente ou dado interno em código, texto, teste ou exemplo. O site é público.
- Mudar o `id` de um item da trilha, de um desafio ou de um conceito já publicado.
- Mover os arquivos do Laboratório de Markov de lugar sem que isso tenha sido pedido.
- Dizer que algo funciona sem ter rodado `python tests/run.py`.

## O que sempre fazer

- Seguir a forma do módulo: problema de trabalho, mínimo para assistir, laboratório ou prática, explicação por escrito.
- Motor em função pura com teste; interface só depois de o motor estar conferido.
- Comentário em português explicando o porquê.
- Validar o que entra (arquivo, link, colagem, `localStorage`) e escapar o que vai para a tela.
- Reaproveitar `js/platform/` e as classes de `css/components.css` antes de criar algo novo.
- Incluir teste de fluxo para cada comportamento novo.

## Comandos

```bash
python -m http.server 5173     # abrir em http://localhost:5173
python tests/run.py            # roda as quatro páginas de teste num navegador sem janela
```

## Próximos laboratórios

Estão registrados em `js/platform/labs.js` sem `href` e já aparecem na trilha como "em construção": vetores e similaridade, descida de gradiente, recuperação, laço do agente e simulador de permissão. Um por vez, na ordem em que o estudo chegar neles.
