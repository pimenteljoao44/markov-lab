# Laboratório de Markov

Um caderno interativo para **modelar qualquer problema** com cadeias de Markov: clientes, alunos, máquinas, pacientes, jogos. Balões explicam a teoria enquanto você usa, sempre com os nomes do seu modelo.

![Laboratório de Markov com um funil de vendas: potes enchendo, bolinhas nas setas e um balão explicando o nível do pote](docs/screenshot.jpg)

Funciona direto no navegador. Não tem instalação, conta nem servidor: nada do que você digita ou cola sai do seu computador.

## O que dá para fazer

**Modelar o seu problema**, de três jeitos:

| Caminho | Quando usar | O que acontece |
|---|---|---|
| Descrever em palavras | Você tem uma ideia, mas não tem números | Um assistente pergunta o que muda, quais são as situações possíveis e as chances de cada uma |
| Tenho dados | Você tem um histórico | Cole sequências ou abra um CSV: as chances saem da contagem de transições |
| Colar uma tabela | Você já tem a matriz ou as contagens | Copie da planilha: nomes e normalização são tratados automaticamente |

Ou comece por um dos 23 modelos da galeria: funil de vendas, vida de um assinante, inadimplência, caminho na faculdade, epidemia, PageRank, fila, ruína do jogador e outros. Os números da galeria são ilustrativos.

**Entender enquanto usa.** Os balões aparecem conforme você mexe: ao errar a soma de uma linha, explicam por que ela precisa dar 1; ao criar um estado absorvente, explicam o que ele faz. Clique em qualquer pote ou seta para ver o que ela significa no seu modelo. O **Caderno de teoria** reúne 37 conceitos, e os balões podem ser desligados.

**Ver a matemática acontecer.** Cada estado é um pote cujo nível mostra a fração de bolinhas nele, e uma linha tracejada marca o equilíbrio π. O gráfico compara os sorteios (Monte Carlo) com a conta exata.

**Perguntar ao modelo.** "Onde estará daqui a 6 meses?" e "Quanto tempo até chegar?" têm resposta exata. O diagnóstico mostra se a cadeia é irredutível, periódica ou ergódica, quais estados são absorventes e para onde cada um leva.

**Aprender por etapas.** Três níveis (Intuição, Matriz e Sandbox) e 10 desafios curtos, como criar um buraco negro ou achar o equilíbrio sem olhar.

## Como rodar

O projeto usa módulos JavaScript, que exigem um servidor local (abrir o `index.html` com dois cliques não funciona). Qualquer servidor estático serve; com Python:

```bash
python -m http.server 5173
```

Depois abra http://localhost:5173.

Se o navegador mostrar uma versão antiga depois de você editar um arquivo, force a recarga com `Ctrl+Shift+R`.

## Publicar no GitHub Pages

Não há etapa de build. No repositório, vá em **Settings → Pages**, escolha **Deploy from a branch**, a branch `main` e a pasta `/ (root)`. O site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

## Formato do arquivo de modelo

**Arquivo → Exportar arquivo** gera um JSON que pode ser reaberto em **Importar arquivo** ou versionado. Só `states` e `matrix` são obrigatórios:

```json
{
  "meta": { "title": "Clientes da academia", "unit": "cliente", "step": "mês" },
  "states": [{ "label": "Ativo" }, { "label": "Cancelou" }],
  "matrix": [
    [0.9, 0.1],
    [0, 1]
  ]
}
```

## Limites

- Até 10 estados por modelo. Em dados com mais do que isso, os estados mais raros são reunidos em "Outros".
- O modelo assume que as chances não mudam com o tempo (cadeia homogênea) e que o estado atual basta para prever o próximo. O Caderno de teoria mostra como contornar isso.
- Um modelo é uma simplificação: confira se ele acerta o que você já sabe antes de usá-lo para decidir algo.

## Como o código está organizado

| Pasta | Conteúdo |
|---|---|
| `js/math/` | Motor sem dependências de interface: classificação da cadeia, π, absorção, tempos de chegada e estimativa a partir de dados |
| `js/models/` | Validação de modelos importados e catálogo da galeria |
| `js/coach/` | Balões: catálogo de teoria (`tips.js`), quando cada um aparece (`triggers.js`) e exibição (`Coach.js`) |
| `js/components/` | Diagrama (SVG e D3), bolinhas (Canvas), matriz, assistente, painéis e desafios |
| `js/levels/`, `js/challenges/` | Conteúdo dos três níveis e dos desafios |
| `js/store.js`, `js/vocab.js` | Estado único da aplicação e vocabulário do modelo aberto |

Bibliotecas, carregadas por CDN: [D3](https://d3js.org) para o diagrama e os gráficos e [KaTeX](https://katex.org) para as fórmulas.

## Testes

Com o servidor rodando, abra http://localhost:5173/tests/math.test.html. A página testa o motor matemático, a leitura de dados, a validação de arquivos e todos os modelos da galeria.
