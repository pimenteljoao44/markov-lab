# Padrão do caderno

Como este projeto é construído, para que cada laboratório novo pareça ter sido feito no mesmo dia que os outros. Vale para quem escreve código à mão e para quem pede ajuda a um assistente de IA.

## O que é o caderno

Uma trilha de estudo de IA em cinco fases (`js/platform/syllabus.js`) com laboratórios interativos. Cada módulo da trilha tem a mesma forma:

1. **Um problema de trabalho**, escrito como pergunta.
2. **O mínimo para assistir ou ler**, com link para a fonte.
3. **Um laboratório** (quando mexer ensina mais que ler) ou **uma prática** fora do caderno.
4. **Uma explicação por escrito**, feita pela pessoa, sem consultar.

Se um conteúdo novo não cabe nessa forma, ele ainda não está pronto para entrar.

## Regras que não se negociam

| Regra | Por quê |
|---|---|
| Sem etapa de build, sem dependência instalada. Módulos ES servidos por qualquer servidor estático. | O projeto tem que abrir daqui a cinco anos, e no GitHub Pages, sem manutenção. |
| A página não fala com outro site. Bibliotecas e fontes ficam em `vendor/`. A única exceção é o vídeo do YouTube, pedido só depois do clique. | Nada do que a pessoa digita ou cola pode sair do computador dela. Os testes de fluxo conferem isso. |
| Cada página traz uma política de segurança de conteúdo (`Content-Security-Policy`) que só deixa carregar o que é dela. Por isso não há script embutido no HTML nem atributo `on...=`: script vai em arquivo, evento vai em `addEventListener`. | A regra de cima deixa de depender só dos testes: é o navegador que barra o que vier de fora, inclusive se um texto colado escapar da validação. |
| Tudo que vem de fora (arquivo, link, texto colado, `localStorage`) é validado ao entrar e escapado ao ir para a tela (`escapeHtml`). | Salvamento corrompido ou texto com marcação não pode quebrar nem injetar nada na página. |
| Nenhum dado de empresa, pessoa ou cliente no repositório. Exemplos falam de "uma indústria com ERP". | O site é público. Há um teste que falha se um nome de empresa entrar no conteúdo. |
| O motor de cada laboratório é função pura, sem tocar na tela, e tem teste. | É o que permite confiar no número que aparece para quem está aprendendo. |
| Todo fluxo novo ganha um teste de fluxo. `python tests/run.py` precisa passar antes de qualquer commit. | A suíte é a única garantia de que um laboratório novo não quebrou um antigo. |

## Como o código é organizado

```
index.html          a trilha (página inicial)
markov.html         Laboratório de Markov
llm.html            Do Markov ao LLM
vectors.html        Vetores e similaridade
js/platform/        o que é comum: trilha, progresso, registro de laboratórios, store, caderno e dock
js/llm/, js/vectors/ um laboratório cada: motor, estado, desafios, caderno, componentes
js/math, js/models, js/coach, js/components, js/levels, js/challenges, js/learn
                    o Laboratório de Markov (anterior à plataforma; mantém a estrutura original)
css/tokens.css      cores, fontes e raios; nenhum outro arquivo define cor solta sem motivo
css/<pagina>.css    só o que é próprio daquela página
tests/              uma página de teste por assunto, todas rodadas por tests/run.py
```

### Estilo de código

- JavaScript moderno, sem transpilar: módulos ES, `const`, funções pequenas, sem classe onde uma função basta.
- **Comentário explica o porquê**, em português, em frase completa. O que o código faz, o próprio código diz.
- Cada arquivo abre com um comentário de uma ou duas linhas dizendo para que ele existe.
- Nomes de código em inglês (`nextCounts`, `phaseProgress`); texto de interface e comentários em português.
- Um estado único por página, mudado só por `update(mutador, ...tags)`. Componente escuta as tags que o afetam e nunca guarda cópia do estado.
- HTML montado com template string; toda variável que não é número passa por `escapeHtml`.
- Redesenhar um trecho usa `keepFocus`, para o teclado não voltar ao topo da página.
- Controle que a pessoa arrasta ou digita é desenhado uma vez e só tem o valor atualizado.
- Número na tela usa vírgula decimal (`num`, `pct` em `js/util.js`).

### Estilo visual

A metáfora é um **caderno de laboratório**: mesa azulada, folha quadriculada, tinta azul-marinho, marca-texto amarelo para o que importa e caneta vermelha para o que está errado.

- Cores, fontes e raios vêm de `css/tokens.css`. Vermelho (`--pen`) é reservado para erro e para o que o modelo fez sem base.
- Títulos em Alfa Slab One; texto em Atkinson Hyperlegible; número e token em Atkinson Hyperlegible Mono.
- Fichas (`.card`), botões (`.btn`, `.text-btn`), ajuda (`.q`), janelas (`dialog.studio`, `dialog.notebook`) e dock de desafios já existem: laboratório novo reaproveita.
- Texto com contraste de pelo menos 4,5:1. Cor nunca é o único sinal: vem com texto, ícone ou traço.
- Alvo de toque de pelo menos 24 px. A página cabe em 360 px de largura sem rolagem lateral.
- Tudo funciona pelo teclado, com foco visível, e todo controle tem nome para leitor de tela.
- Animação respeita `prefers-reduced-motion`.

### Estilo de texto

- Fala direto com a pessoa, em frases curtas, sem jargão antes de explicá-lo.
- Todo conceito aparece **com os números do modelo que está aberto**, não com um exemplo genérico.
- Todo conceito termina em consequência prática: o que isso muda numa decisão de trabalho.
- Erro explica o que houve e o que fazer. Nunca culpa a pessoa.

## Contrato de um laboratório

Um laboratório é uma página com cinco peças. O laboratório de LLM (`js/llm/`) é o modelo a copiar.

| Peça | Arquivo de referência | O que precisa ter |
|---|---|---|
| Motor | `js/llm/ngram.js`, `sampling.js` | Funções puras. Sem DOM, sem `localStorage`, sem `Math.random` solto: o sorteio usa `mulberry32` com semente. |
| Estado | `js/llm/state.js` | `createStore` de `js/platform/tinyStore.js`, um `derive` que recalcula tudo, `sanitize` para o que vem do salvamento e uma chave própria de `localStorage`. |
| Desafios | `js/llm/challenges.js` | Lista com `id`, `title`, `desc`, `hints`, `success` e `check(ctx) → { done, progress, live }` puro, ou `quiz`. Desenhados por `js/platform/LabDock.js`. |
| Caderno de teoria | `js/llm/tips.js` | Conceitos por assunto, cada um com `body(ctx)` usando números do estado e, se couber, `math(ctx)` em KaTeX. Desenhado por `js/platform/LabNotebook.js`. Todo botão `?` aponta para um conceito. |
| Problema real | textos e exemplos do laboratório | Pelo menos um cenário de trabalho, genérico, que a pessoa reconheça. E uma ficha "No trabalho" ligando o conceito a uma decisão. |

O `success` de cada desafio é onde a lição fica escrita: diz o que a pessoa acabou de ver e por que importa.

### Para criar um laboratório

1. Escreva o motor e os testes dele em `tests/platform.test.html`. Só siga quando os números baterem com a conta feita à mão.
2. Crie `js/<nome>/state.js`, os desafios e o caderno.
3. Crie `<nome>.html` copiando a moldura de `llm.html` (política de segurança, `js/boot.js`, cabeçalho, folha, fichas, dock) e ligue o índice dos painéis laterais com `js/platform/SideNav.js` e `css/<nome>.css` só com o que for próprio.
4. Registre em `js/platform/labs.js`: `href`, as chaves de `localStorage` e de onde vem o progresso. O item correspondente já existe em `syllabus.js` como planejado.
5. Escreva os testes de fluxo em `tests/pages.test.html`: abre, não fala com outro site, sobrevive a recarregar, sobrevive a salvamento corrompido, cabe no celular, todo controle tem nome.
6. Rode `python tests/run.py`.

### Quando não criar um laboratório

Quando o assunto é um documento (política, plano, lista de verificação) ou código que só faz sentido no ambiente de verdade (Python, banco, servidor). Nesses casos o item entra na trilha como `entrega` ou `pratica`, com uma descrição do que precisa ficar pronto. Simular no navegador o que só existe de verdade fora dele ensina a coisa errada.

## Mexendo na trilha

- `id` de item nunca muda depois de publicado: é a chave do progresso de quem já está estudando.
- Todo módulo termina com um item `explica`. Há teste para isso.
- Link novo é conferido antes de entrar, e a data no topo de `syllabus.js` é atualizada.
