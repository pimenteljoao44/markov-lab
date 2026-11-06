# Bibliotecas incluídas no projeto

Tudo aqui é cópia sem alterações. Assim o app não depende de CDN: funciona sem internet e não faz nenhum pedido a outros sites.

| Pasta | O quê | Versão | Origem | Licença |
|---|---|---|---|---|
| `d3/` | D3, diagrama e gráficos | 7.9.0 | pacote `d3` do npm, `dist/d3.min.js` | ISC |
| `katex/` | KaTeX, fórmulas | 0.16.11 | pacote `katex` do npm, `dist/` (só fontes woff2) | MIT |
| `fonts/` | Alfa Slab One e família Atkinson Hyperlegible | 5.3.0 | pacotes `@fontsource/*` do npm, subconjuntos latin e latin-ext | SIL OFL 1.1 |

`d3/index.js` e `fonts/fonts.css` não vêm dos pacotes: o primeiro expõe o D3 como módulo JavaScript e o segundo reúne as declarações `@font-face`.

Para atualizar, troque os arquivos pelos da versão nova, atualize esta tabela e rode os testes.
