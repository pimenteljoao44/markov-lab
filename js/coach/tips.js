// Catálogo de teoria: cada balão explica uma coisa, usando os nomes do modelo aberto.
// Sem `topic`, o balão só aparece em contexto; com `topic`, ele também entra no Caderno de teoria.
import { pct, num, fmtP } from '../util.js';
import { isPiHidden } from '../challenges/definitions.js';

const firstEdge = (s) => {
  let best = null;
  for (const e of s.derived.edges) if (e.i !== e.j && (!best || e.p > best.p)) best = e;
  return best || s.derived.edges[0];
};

const tex = (t, display = true) => `<span class="tex" data-tex="${t}"${display ? ' data-display' : ''}></span>`;

export const TOPICS = ['O básico', 'A matriz', 'A simulação', 'O equilíbrio', 'Como a cadeia se comporta', 'Perguntas ao modelo', 'Como modelar bem'];

export const TIPS = {
  // ───────── O básico ─────────
  state: {
    topic: 'O básico',
    title: 'Estado',
    anchor: 'jar:0',
    body: (v) => `<p><mark>Estado</mark> é uma situação em que algo pode estar. ${v.b(0)} é um estado deste modelo, e cada pote do diagrama é um estado.</p>
      <p>A cada momento, cada ${v.unit} está em exatamente um estado.</p>`,
  },
  arrow: {
    topic: 'O básico',
    title: 'Transição',
    demo: (s) => firstEdge(s),
    anchor: (s, o) => `edge:${o.i}-${o.j}`,
    body: (v, s, o) => `<p>Cada seta é uma <mark>transição</mark>: um caminho possível. A seta de ${v.b(o.i)} para ${v.b(o.j)} vale ${pct(s.derived.effective[o.i][o.j], 0)}: a cada ${v.step}, cerca de ${pct(s.derived.effective[o.i][o.j], 0)} de quem está em ${v.b(o.i)} vai para ${v.b(o.j)}.</p>
      <p>Quanto mais grossa a seta, mais provável o caminho.</p>`,
    math: () => `<p>Xₜ é o estado no instante t. Cada seta é uma probabilidade condicional:</p>${tex('P_{ij} = P(X_{t+1}=j \\mid X_t=i)')}`,
  },
  markov: {
    topic: 'O básico',
    title: 'Sem memória',
    anchor: (s) => (s.meta.level === 1 ? '.rule[data-rule="0"]' : '#panel-matrix'),
    body: (v) => `<p>Para sortear o próximo estado, o modelo olha <b>só para o estado atual</b>. O caminho até ali não muda nada.</p>
      <p>Essa é a <mark>propriedade de Markov</mark>, e é ela que torna a conta simples: basta uma regra para cada estado.</p>`,
    math: () => tex('P(X_{t+1}=j \\mid X_t=i,\\, X_{t-1},\\dots,X_0) = P(X_{t+1}=j \\mid X_t=i)'),
  },
  step: {
    topic: 'O básico',
    title: 'Passo',
    anchor: '.sim-tick',
    body: (v) => `<p>O tempo do modelo anda em saltos. Aqui, cada salto é <b>1 ${v.step}</b>.</p>
      <p>A cada ${v.step}, cada ${v.unit} sorteia o próximo estado, todos ao mesmo tempo. Quem define o tamanho do salto é você, ao modelar o problema.</p>`,
  },
  unit: {
    topic: 'O básico',
    title: (v) => v.Units,
    anchor: '[data-ctl="count"]',
    body: (v) => `<p>Cada bolinha é uma <mark>cópia independente</mark> do processo. Neste modelo, cada bolinha representa 1 ${v.unit}.</p>
      <p>Uma sozinha é imprevisível. Muitas juntas revelam a distribuição: é isso que os potes mostram.</p>`,
  },

  // ───────── A matriz ─────────
  matrix: {
    topic: 'A matriz',
    title: 'Matriz de transição',
    anchor: '#panel-matrix .matrix',
    place: 'left',
    body: () => `<p>É a mesma informação das setas, numa tabela só. Cada número é uma seta: mude o número e a seta muda junto.</p>
      <p>Esta tabela <b>é</b> o modelo. Tudo que aparece na tela sai dela.</p>`,
    math: () => tex('P = \\begin{pmatrix} P_{11} & \\cdots & P_{1n} \\\\ \\vdots & & \\vdots \\\\ P_{n1} & \\cdots & P_{nn} \\end{pmatrix}'),
  },
  row: {
    topic: 'A matriz',
    title: 'Linha: de onde se sai',
    demo: () => ({ i: 0 }),
    anchor: (s, o) => `rowh:${o.i}`,
    place: 'left',
    body: (v, s, o) => `<p>A linha de ${v.b(o.i)} lista tudo que pode acontecer com quem está em ${v.b(o.i)} depois de 1 ${v.step}.</p>
      <p>Como algo sempre acontece, a linha soma 1.</p>`,
  },
  column: {
    topic: 'A matriz',
    title: 'Coluna: por onde se chega',
    demo: () => ({ i: 0 }),
    anchor: (s, o) => `col:${o.i}`,
    place: 'left',
    body: (v, s, o) => `<p>A coluna de ${v.b(o.i)} mostra de onde vem quem chega em ${v.b(o.i)}.</p>
      <p>Colunas <b>não</b> precisam somar 1: um estado popular recebe mais do que os outros. É por isso que os potes ficam com níveis diferentes.</p>`,
  },
  cell: {
    topic: 'A matriz',
    title: (v, s, o) => `P(${v.lab(o.i)} → ${v.lab(o.j)})`,
    demo: (s) => firstEdge(s),
    anchor: (s, o) => `cell:${o.i}-${o.j}`,
    place: 'left',
    body: (v, s, o) => {
      const p = s.derived.effective[o.i][o.j];
      return p > 0
        ? `<p>Quem está em ${v.b(o.i)} tem <mark>${pct(p, 0)}</mark> de chance de estar em ${v.b(o.j)} depois de 1 ${v.step}.</p><p>Repare no diagrama: os dois potes e a seta ficaram marcados.</p>`
        : `<p>Com zero aqui, não existe caminho direto de ${v.b(o.i)} para ${v.b(o.j)}. No diagrama, a seta tracejada mostra onde ela ficaria.</p><p>Digite um valor para criar a seta.</p>`;
    },
  },
  diagonal: {
    topic: 'A matriz',
    title: 'Diagonal: ficar onde está',
    demo: () => ({ i: 0 }),
    anchor: (s, o) => `cell:${o.i}-${o.i}`,
    place: 'left',
    body: (v, s, o) => `<p>P(${v.b(o.i)} → ${v.b(o.i)}) é a chance de continuar em ${v.b(o.i)}. No diagrama é a seta que volta para o próprio pote.</p>
      <p>Se for 1, ninguém sai: o estado é <mark>absorvente</mark>.</p>`,
  },
  'row-sum': {
    topic: 'A matriz',
    title: 'Por que cada linha soma 1?',
    demo: () => ({ i: 0 }),
    anchor: (s, o) => `rowsum:${o.i}`,
    place: 'left',
    body: (v, s, o) => {
      const sum = s.derived.rowSums[o.i];
      const off = Math.abs(sum - 1) > 1e-6;
      return `<p>Quem está em ${v.b(o.i)} precisa ir para algum lugar, ou ficar. Juntas, as chances cobrem <b>todos</b> os casos: 100%.</p>
        ${off ? `<p>Esta linha soma <mark>${fmtP(sum)}</mark>. Enquanto você não corrige, a simulação divide cada valor pela soma, e nada trava. O número vermelho mostra o valor usado.</p>` : ''}`;
    },
    math: () => tex('\\sum_{j} P_{ij} = 1 \\quad \\text{para todo estado } i'),
  },
  weights: {
    topic: 'A matriz',
    title: 'Pesos e normalização',
    anchor: '#panel-matrix',
    place: 'left',
    body: () => `<p>Você pode digitar contagens em vez de chances. Se 30 foram para um lado, 10 para outro e 60 ficaram, dividir pela soma dá 0,3 / 0,1 / 0,6.</p>
      <p>É isso que o botão <b>normalizar</b> faz, e é assim que se estima um modelo a partir de dados.</p>`,
  },

  // ───────── A simulação ─────────
  run: {
    topic: 'A simulação',
    title: 'Monte Carlo',
    anchor: '[data-act="play"]',
    place: 'top',
    body: (v) => `<p>Cada ${v.unit} sorteia o próximo estado usando a linha da matriz. Repetir sorteios para descobrir um resultado é o método de <mark>Monte Carlo</mark>.</p>
      <p>Aperte <b>Rodar simulação</b> e acompanhe.</p>`,
    math: () => `<p>Sorteia-se u entre 0 e 1 e escolhe-se o primeiro j em que a soma acumulada da linha passa de u:</p>${tex('X_{t+1} = \\min\\{\\, j : \\textstyle\\sum_{k\\le j} P_{X_t k} \\ge u \\,\\}')}`,
  },
  trail: {
    topic: 'A simulação',
    title: 'O caminho até aqui',
    anchor: '.trail',
    place: 'top',
    body: (v) => `<p>Este é o caminho percorrido. Só o estado <mark>destacado</mark> entra no sorteio do próximo ${v.step}; os anteriores já não importam.</p>
      <p>É a falta de memória vista em ação.</p>`,
  },
  'more-units': {
    title: 'Uma só não diz muito',
    anchor: '[data-ctl="count"]',
    place: 'top',
    body: (v) => `<p>Olhando 1 ${v.unit} só, o caminho não tem padrão. Suba este controle para 100 ou mais e veja o que a multidão faz.</p>`,
  },
  jar: {
    topic: 'A simulação',
    title: 'O nível do pote',
    anchor: 'jar:0',
    body: (v) => `<p>O líquido mostra a fração de ${v.units} em cada estado neste momento. Somando todos os potes dá sempre 100%.</p>
      <p>Esse conjunto de frações é a <mark>distribuição</mark>, chamada de μₜ.</p>`,
    math: () => tex('\\mu_t(i) = P(X_t = i), \\qquad \\sum_i \\mu_t(i) = 1'),
  },
  lln: {
    topic: 'A simulação',
    title: 'Mais bolinhas, menos ruído',
    anchor: '#panel-convergence .chart-wrap',
    place: 'left',
    body: () => `<p>Com poucos sorteios, a curva cheia treme porque o acaso pesa. Com muitos, ela cola na tracejada, que é a conta exata.</p>
      <p>Essa é a <mark>lei dos grandes números</mark>. Para reduzir o ruído pela metade, são precisos 4 vezes mais sorteios.</p>`,
    math: () => tex('\\text{erro} \\approx \\sqrt{\\frac{p(1-p)}{N}}'),
  },
  mu0: {
    topic: 'A simulação',
    title: 'Onde tudo começa: μ₀',
    anchor: '[data-ctl="init"]',
    place: 'top',
    body: (v) => `<p>μ₀ é como ${v.units} se dividem no início. Mude e rode de novo: as curvas partem de outro lugar.</p>
      <p>Em cadeias ergódicas, μ₀ só muda o caminho. O destino é o mesmo.</p>`,
  },
  chart: {
    topic: 'A simulação',
    title: 'Sorteio e conta exata',
    anchor: '#panel-convergence .chart-wrap',
    place: 'left',
    body: () => `<p>Cada cor é um estado. A linha <b>cheia</b> vem dos sorteios. A <b>tracejada</b> não usa sorte nenhuma: é a matriz multiplicada passo a passo.</p>
      <p>Quando as duas concordam, a simulação confirma a matemática.</p>`,
    math: () => tex('\\mu_{t+1} = \\mu_t P \\quad\\Rightarrow\\quad \\mu_t = \\mu_0 P^t'),
  },
  speed: {
    topic: 'A simulação',
    title: 'Velocidade',
    anchor: '[data-ctl="speed"]',
    place: 'top',
    body: () => `<p>Muda só a velocidade da animação. Os sorteios e a matemática continuam iguais.</p>`,
  },

  // ───────── O equilíbrio ─────────
  pi: {
    topic: 'O equilíbrio',
    title: 'Equilíbrio π',
    anchor: 'jar:0',
    body: () => `<p>π é a distribuição que <mark>não muda mais</mark>: aplicando a matriz, ela continua igual. A linha tracejada em cada pote marca esse nível.</p>
      <p>Os sorteios continuam. O que acontece é que, em cada estado, o que entra passa a ser igual ao que sai.</p>`,
    math: () => tex('\\pi P = \\pi, \\qquad \\sum_i \\pi_i = 1'),
  },
  equilibrium: {
    title: 'Os potes pararam',
    anchor: 'jar:0',
    body: () => `<p>Os níveis chegaram perto das linhas tracejadas e agora só oscilam em volta delas: isso é o <mark>equilíbrio</mark>.</p>
      <p>Os sorteios não pararam. Só que, em cada pote, o que entra compensa o que sai.</p>`,
    math: () => `<p>O fluxo que chega em j vem de todos os estados:</p>${tex('\\sum_i \\pi_i P_{ij} = \\pi_j')}`,
  },
  tv: {
    topic: 'O equilíbrio',
    title: 'Longe de π',
    anchor: '[data-stat]',
    place: 'left',
    body: () => `<p>Mede a distância entre a distribuição atual e o equilíbrio. Zero significa igual; 1 significa completamente diferente.</p>
      <p>Por causa do sorteio, ela não chega a zero exato: fica oscilando perto dele. Mais bolinhas, menos oscilação.</p>`,
    math: () => `<p>Chama-se distância de variação total:</p>${tex('d = \\frac{1}{2}\\sum_i |\\mu_t(i) - \\pi_i|')}`,
  },
  'return-time': {
    topic: 'O equilíbrio',
    title: 'Tempo de volta',
    anchor: '#panel-insights',
    place: 'left',
    body: (v) => `<p>Quem sai de um estado leva em média <mark>1/π</mark> ${v.steps} para voltar. Com π = 0,25, a volta leva 4 ${v.steps}.</p>
      <p>Faz sentido: um estado visitado em 25% do tempo aparece, em média, uma vez a cada 4.</p>`,
    math: () => `<p>Resultado conhecido como teorema de Kac:</p>${tex('E[T_{i \\to i}] = \\frac{1}{\\pi_i}')}`,
  },
  doubly: {
    topic: 'O equilíbrio',
    title: 'Colunas que também somam 1',
    anchor: '#panel-matrix .matrix',
    place: 'left',
    body: () => `<p>Nesta matriz, as colunas também somam 1: é uma <mark>matriz duplamente estocástica</mark>. Cada estado recebe exatamente o que doa.</p>
      <p>Por isso o equilíbrio divide tudo por igual, se todos se alcançarem.</p>`,
    math: () => tex('\\sum_i P_{ij} = 1 \\;\\Rightarrow\\; \\pi_i = \\frac{1}{n}'),
  },

  // ───────── Como a cadeia se comporta ─────────
  irreducible: {
    topic: 'Como a cadeia se comporta',
    title: 'Irredutível',
    anchor: '[data-k="irr"]',
    place: 'left',
    body: () => `<p>Uma cadeia é <mark>irredutível</mark> quando todo estado alcança todo estado por algum caminho de setas.</p>
      <p>Assim, ninguém fica preso num grupo: o longo prazo não depende de onde se começa.</p>`,
    math: () => tex('\\forall\\, i,j \\;\\; \\exists\\, t : \\; (P^t)_{ij} > 0'),
  },
  classes: {
    topic: 'Como a cadeia se comporta',
    title: 'Classes comunicantes',
    anchor: '[data-k="irr"]',
    place: 'left',
    body: () => `<p>Estados que se alcançam nos dois sentidos formam uma <mark>classe</mark>.</p>
      <p>Numa classe <b>fechada</b>, ninguém sai. Numa <b>transitória</b>, quem sai não volta mais. Passe o mouse nas classes do Diagnóstico para vê-las no diagrama.</p>`,
  },
  periodic: {
    topic: 'Como a cadeia se comporta',
    title: 'Ritmo fixo',
    anchor: 'jar:0',
    body: (v, s) => {
      const d = s.derived.period;
      return `<p>Uma cadeia <mark>periódica</mark> só volta a um estado em múltiplos de um mesmo número${d > 1 ? `; aqui, a cada ${d} ${v.steps}` : ''}.</p>
      <p>Os potes andam em ondas e nunca assentam. Qualquer chance de ficar parado (diagonal maior que 0) quebra esse ritmo.</p>`;
    },
    math: () => tex('d = \\operatorname{mdc}\\{\\, t \\ge 1 : (P^t)_{ii} > 0 \\,\\}'),
  },
  ergodic: {
    topic: 'Como a cadeia se comporta',
    title: 'Ergódica',
    anchor: '[data-k="ergodic"]',
    place: 'left',
    body: () => `<p>Irredutível e sem ritmo fixo: a cadeia é <mark>ergódica</mark>. Existe um único equilíbrio e todo começo leva até ele.</p>
      <p>É o caso em que o passado distante se apaga por completo.</p>`,
    math: () => tex('\\lim_{t\\to\\infty} \\mu_0 P^t = \\pi \\quad \\text{para qualquer } \\mu_0'),
  },
  absorbing: {
    topic: 'Como a cadeia se comporta',
    title: 'Estado absorvente',
    demo: (s) => ({ i: s.derived.absorbing[0] ?? 0 }),
    anchor: (s, o) => `jar:${o.i}`,
    body: (v, s, o) => `<p>Quem entra em um estado absorvente nunca mais sai: P(i, i) = 1. ${s.derived.absorbing.includes(o.i) ? `${v.b(o.i)} é um deles.` : ''}</p>
      <p>Se todos os estados conseguem chegar até ele, com o tempo tudo termina ali.</p>`,
  },
  absorbed: {
    title: 'Quase todos caíram',
    demo: (s) => ({ i: s.derived.absorbing[0] ?? 0 }),
    anchor: (s, o) => `jar:${o.i}`,
    body: () => `<p>Mais da metade já foi absorvida. Esse é o destino de longo prazo aqui: não há vai e vem, só uma queda lenta.</p>
      <p>Em <b>Para onde vão</b>, no Diagnóstico, está a conta exata: a chance de cada destino e o tempo médio até lá.</p>`,
  },
  transient: {
    topic: 'Como a cadeia se comporta',
    title: 'Estado transitório',
    anchor: '#panel-insights',
    place: 'left',
    body: () => `<p>Um estado é <mark>transitório</mark> quando existe chance de sair e nunca mais voltar. Com o tempo, ele esvazia, mesmo começando cheio.</p>
      <p>Por isso o equilíbrio dele é zero.</p>`,
  },
  islands: {
    title: 'Ilhas',
    anchor: 'jar:0',
    body: (v, s) => `<p>Esta cadeia tem ${s.derived.classes.filter((c) => c.closed).length} grupos fechados: quem entra em um não passa para outro.</p>
      <p>Por isso <mark>não existe um único equilíbrio</mark>. O destino de cada ${v.unit} depende de onde começa.</p>`,
  },

  // ───────── Perguntas ao modelo ─────────
  'ask-pn': {
    topic: 'Perguntas ao modelo',
    title: 'Onde estará depois de n passos',
    anchor: '#panel-ask [data-q="pn"]',
    place: 'left',
    body: (v) => `<p>Depois de 1 ${v.step}, a resposta está na linha da matriz. Depois de n, basta multiplicar a matriz por ela mesma n vezes.</p>
      <p>Não há sorteio nenhum aqui: é a conta exata da chance de cada estado.</p>`,
    math: () => `<p>Para chegar em n+m passos, passa-se por algum estado no meio (equação de Chapman-Kolmogorov):</p>${tex('P^{n+m} = P^n P^m')}`,
  },
  'ask-hit': {
    topic: 'Perguntas ao modelo',
    title: 'Quanto tempo até chegar',
    anchor: '#panel-ask [data-q="hit"]',
    place: 'left',
    body: (v) => `<p>Calcula o número médio de ${v.steps} até a <mark>primeira chegada</mark> ao destino.</p>
      <p>Se existe alguma chance de nunca chegar, a média vira infinita. Nesse caso, a resposta útil é a chance de chegar.</p>`,
    math: () => `<p>Dá 1 passo e, de onde cair, ainda falta o resto:</p>${tex('h_i = 1 + \\sum_{k \\ne j} P_{ik}\\, h_k')}`,
  },
  fundamental: {
    topic: 'Perguntas ao modelo',
    title: 'Para onde vão',
    anchor: '#panel-insights',
    place: 'left',
    body: (v) => `<p>Quando há estados transitórios, duas perguntas importam: em qual destino cada ${v.unit} termina, e em quanto tempo.</p>
      <p>A tabela responde às duas, sem simulação.</p>`,
    math: () => `<p>Q são as transições entre transitórios; R, as que saem deles. N conta as visitas esperadas:</p>${tex('N = (I-Q)^{-1}, \\quad B = NR, \\quad t = N\\mathbf{1}')}`,
  },

  // ───────── Como modelar bem ─────────
  'good-state': {
    topic: 'Como modelar bem',
    title: 'Como escolher os estados',
    anchor: '#btn-wizard',
    place: 'bottom',
    body: (v) => `<p>A regra de ouro: <mark>saber o estado atual precisa bastar</mark> para estimar o próximo ${v.step}.</p>
      <p>Os estados não podem se sobrepor (cada ${v.unit} está em um só), e cobrem todos os casos. Comece com poucos: de 3 a 6 costuma bastar.</p>`,
  },
  'memory-state': {
    topic: 'Como modelar bem',
    title: 'E se o passado importa?',
    anchor: '#btn-wizard',
    place: 'bottom',
    body: () => `<p>Coloque o passado <mark>dentro do estado</mark>. Em vez de “Ativo”, use “Ativo há pouco” e “Ativo há muito”.</p>
      <p>O modelo continua sem memória, mas agora o estado carrega o que importa. O custo é ter mais estados.</p>`,
  },
  'good-step': {
    topic: 'Como modelar bem',
    title: 'Como escolher o passo',
    anchor: '#model-sub',
    place: 'bottom',
    body: () => `<p>Use o intervalo em que você observa mudanças: um dia, um mês, um clique, uma rodada.</p>
      <p>Passo curto demais: quase todo mundo fica parado. Passo longo demais: mudanças no meio do caminho se perdem.</p>`,
  },
  homogeneous: {
    topic: 'Como modelar bem',
    title: 'Chances que não mudam',
    anchor: '#model-title',
    place: 'bottom',
    body: () => `<p>O modelo assume que as chances valem igual em todo momento: isso é uma <mark>cadeia homogênea</mark>.</p>
      <p>Se elas mudam com a estação ou com a idade, separe os períodos em modelos diferentes ou crie estados para cada fase. Todo modelo é uma simplificação: confira se ele acerta o que você já sabe.</p>`,
    math: () => tex('P(X_{t+1}=j \\mid X_t=i) = P_{ij} \\quad \\text{para todo } t'),
  },
  estimate: {
    topic: 'Como modelar bem',
    title: 'Estimar a partir de dados',
    anchor: '#btn-wizard',
    place: 'bottom',
    body: () => `<p>Com um histórico real, as chances saem da contagem: quantas vezes cada transição aconteceu, dividido pelo total que saiu daquele estado.</p>
      <p>Com poucas observações, a estimativa é fraca: uma contagem de 3 em 4 não é o mesmo que 75 em 100.</p>`,
    math: () => `<p>É a estimativa de máxima verossimilhança:</p>${tex('\\hat P_{ij} = \\frac{n_{ij}}{\\sum_k n_{ik}}')}`,
  },

  // ───────── Só em contexto ─────────
  'start-modeling': {
    title: 'Traga o seu problema',
    anchor: '#btn-wizard',
    place: 'bottom',
    body: () => `<p>Este botão cria um modelo do zero, de três jeitos: <b>descrevendo em palavras</b>, <b>colando um histórico de dados</b> ou <b>colando uma tabela</b>.</p>
      <p>Clientes, alunos, peças, pacientes, um jogo: se muda de situação com o tempo, dá para modelar.</p>`,
  },
  'click-anything': {
    title: 'Tudo aqui explica',
    anchor: 'jar:0',
    body: () => `<p>Clique em qualquer <b>pote</b> ou <b>seta</b> para ver o que aquilo significa neste modelo. Os botões <span class="q q-inline">?</span> explicam o resto.</p>
      <p>O <b>Caderno de teoria</b>, lá em cima, guarda tudo que já apareceu.</p>`,
  },
  'state-added': {
    title: 'Estado novo',
    anchor: (s, o) => `rowh:${o.i}`,
    place: 'left',
    body: (v, s, o) => `<p>${v.b(o.i)} nasceu dividindo as chances por igual, e ninguém chega nele ainda: a coluna dele está zerada.</p>
      <p>Dê um nome na primeira coluna da matriz e crie setas: digite chances na linha e na coluna dele. Lembre que cada linha precisa continuar somando 1.</p>`,
  },
  'model-loaded': {
    title: (v) => v.title,
    anchor: '#model-title',
    place: 'bottom',
    body: (v, s) => `${v.about ? `<p>${v.about}</p>` : ''}
      ${v.question ? `<p><b>O que ele responde:</b> ${v.question}</p>` : ''}
      <p>Aqui, 1 bolinha é 1 ${v.unit} e 1 passo é 1 ${v.step}.${s.chain.meta.custom ? '' : ' Os números são ilustrativos: troque pelos seus.'}</p>`,
  },
  'model-ready': {
    title: 'Seu modelo está pronto',
    anchor: '[data-act="play"]',
    place: 'top',
    body: (v) => `<p>Daqui em diante, tudo fala de ${v.units}. Um bom roteiro:</p>
      <ol><li><b>Rode a simulação</b> e veja para onde ${v.units} vão.</li>
      <li>Leia o <b>Diagnóstico</b>: existe equilíbrio? Há estados sem saída?</li>
      <li>Use <b>Perguntar ao modelo</b> para responder à sua dúvida.</li></ol>`,
  },
  'jar-info': {
    title: (v, s, o) => v.lab(o.i),
    demo: () => ({ i: 0 }),
    anchor: (s, o) => `jar:${o.i}`,
    body: (v, s, o) => {
      const d = s.derived;
      const i = o.i;
      const P = d.effective;
      const parts = [];
      if (d.absorbing.includes(i)) {
        parts.push(`<p><mark>Estado absorvente</mark>: quem entra em ${v.b(i)} não sai mais.</p>`);
      } else {
        const rows = P[i]
          .map((p, j) => ({ p, j }))
          .filter((x) => x.p > 1e-9)
          .sort((a, b) => b.p - a.p)
          .map((x) => `<li><span>${x.j === i ? 'continua aqui' : `vai para ${v.lab(x.j)}`}</span><b>${pct(x.p, 0)}</b></li>`)
          .join('');
        parts.push(`<p>Quem está aqui, depois de 1 ${v.step}:</p><ul class="b-list">${rows}</ul>`);
      }
      const from = P.flatMap((r, j) => (j !== i && r[i] > 1e-9 ? [v.lab(j)] : []));
      parts.push(from.length ? `<p>Recebe de: ${from.join(', ')}.</p>` : `<p>Nenhum outro estado leva até aqui.</p>`);
      const occ = s.simulation.occupancy;
      if (s.simulation.status !== 'idle' && occ?.length) {
        const total = occ.reduce((a, b) => a + b, 0) || 1;
        parts.push(`<p>Neste momento, este pote tem <b>${pct((occ[i] || 0) / total, 0)}</b> de ${v.units}.</p>`);
      }
      if (d.stationary && !isPiHidden(s)) {
        const pi = d.stationary[i];
        parts.push(pi > 1e-9
          ? `<p>No longo prazo: <b>${pct(pi, 0)}</b> do tempo${pi < 0.999 ? `; a volta leva, em média, ${num(1 / pi, 1)} ${v.steps}` : ''}.</p>`
          : `<p>No longo prazo fica <b>vazio</b>: é um estado transitório.</p>`);
      }
      return parts.join('');
    },
  },
  'edge-info': {
    title: (v, s, o) => `${v.lab(o.i)} → ${v.lab(o.j)}`,
    demo: (s) => firstEdge(s),
    anchor: (s, o) => `edge:${o.i}-${o.j}`,
    body: (v, s, o) => {
      const p = s.derived.effective[o.i][o.j];
      const occ = s.simulation.occupancy;
      const here = s.simulation.status !== 'idle' ? occ?.[o.i] : null;
      const main = o.i === o.j
        ? `<p>Esta seta volta para o próprio pote: quem está em ${v.b(o.i)} tem <mark>${pct(p, 0)}</mark> de chance de continuar ali por mais 1 ${v.step}.</p>`
        : `<p>Quem está em ${v.b(o.i)} tem <mark>${pct(p, 0)}</mark> de chance de estar em ${v.b(o.j)} depois de 1 ${v.step}.</p>`;
      const count = here ? `<p>Agora há ${here} ${v.units} em ${v.b(o.i)}: cerca de <b>${Math.round(here * p)}</b> devem seguir esta seta no próximo sorteio.</p>` : '';
      const where = s.meta.level === 1 ? 'Para mudar, use as regras ao lado.' : `Para mudar, edite a célula da linha ${v.b(o.i)}, coluna ${v.b(o.j)}.`;
      return `${main}${count}<p>${where}</p>`;
    },
  },
};

export const notebookTips = () => Object.entries(TIPS).filter(([, t]) => t.topic);
