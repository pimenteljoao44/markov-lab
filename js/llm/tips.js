// Caderno de teoria do laboratório: cada conceito explicado com os números do modelo aberto.
// body(ctx) e math(ctx) devolvem HTML; ctx = { s, d } e tudo que vem do usuário passa por escapeHtml.
import { pct, num, escapeHtml } from '../util.js';
import { BOS, EOS } from './ngram.js';
import { corpusOf } from './state.js';

const tex = (t, display = true) => `<span class="tex" data-tex="${t}"${display ? ' data-display' : ''}></span>`;
const tok = (t) => `<b class="tk">${escapeHtml(t)}</b>`;
const windowText = (d) => (d.seen.context.length ? d.seen.context.map(tok).join(' ') : 'nenhum token');
const top = (d) => d.seen.counts[0];
const unit = (s) => (s.settings.mode === 'char' ? 'letra' : 'palavra');

export const LLM_TOPICS = ['Do texto ao modelo', 'O sorteio', 'Onde o modelo falha', 'Do brinquedo ao LLM de verdade', 'No trabalho'];

export const LLM_TIPS = {
  // ───────── Do texto ao modelo ─────────
  token: {
    topic: 'Do texto ao modelo',
    title: 'Token',
    body: ({ s, d }) => `<p><mark>Token</mark> é o pedaço de texto que o modelo trata como uma unidade. Aqui, cada ${unit(s)} é um token; o texto “${escapeHtml(corpusOf(s).title)}” tem ${d.model.tokens} tokens em ${d.model.sentences} frases.</p>
      <p>Um LLM comercial usa pedaços menores que uma palavra, para dar conta de qualquer idioma e de palavras que nunca viu. É em tokens que se mede o tamanho do contexto e o preço de cada chamada.</p>`,
  },
  vocab: {
    topic: 'Do texto ao modelo',
    title: 'Vocabulário',
    body: ({ d }) => `<p>O <mark>vocabulário</mark> é a lista de tokens diferentes que o modelo conhece. Este tem ${d.model.vocab.length}; os mais frequentes são ${d.model.vocab.slice(0, 3).map(tok).join(', ')}.</p>
      <p>O modelo só consegue escrever tokens do vocabulário. O que não está na lista não existe para ele.</p>`,
  },
  contexto: {
    topic: 'Do texto ao modelo',
    title: 'Janela de contexto',
    body: ({ s, d }) => `<p>A <mark>janela de contexto</mark> é o quanto do texto anterior o modelo enxerga ao escolher o próximo token. Aqui ela tem ${s.settings.order} ${s.settings.order === 1 ? 'token' : 'tokens'}: neste momento, ${windowText(d)}.</p>
      <p>Tudo que ficou para trás da janela não influencia a escolha. Num LLM comercial a janela tem centenas de milhares de tokens, mas o princípio é o mesmo: o que não cabe nela, o modelo não vê.</p>`,
  },
  contagem: {
    topic: 'Do texto ao modelo',
    title: 'Treinar é contar',
    body: ({ d }) => {
      const best = top(d);
      return `<p>Treinar este modelo é percorrer o texto uma vez e anotar, para cada contexto, quantas vezes cada token veio depois. O resultado é uma tabela com ${d.contexts} contextos.</p>
      ${best ? `<p>Depois de ${windowText(d)}, o token ${tok(best[0])} apareceu ${best[1]} de ${d.seen.total} vezes: chance de ${pct(best[1] / d.seen.total, 0)}.</p>` : ''}
      <p>Um LLM chega a algo parecido por outro caminho: em vez de contar, ajusta bilhões de números até prever bem o próximo token de textos reais.</p>`;
    },
    math: () => `<p>Chance estimada pela contagem (máxima verossimilhança):</p>${tex('P(w \\mid c) = \\frac{\\text{vezes que } w \\text{ veio depois de } c}{\\text{vezes que } c \\text{ apareceu}}')}`,
  },
  markov: {
    topic: 'Do texto ao modelo',
    title: 'É uma cadeia de Markov',
    body: ({ s }) => `<p>Com janela de 1 token, cada token é um <mark>estado</mark> e a tabela de contagens é a <mark>matriz de transição</mark>: o próximo token depende só do atual. É a propriedade de Markov do outro laboratório.</p>
      <p>${s.settings.order === 1 ? 'É o caso agora: abra o modelo no Laboratório de Markov e veja os potes e as setas.' : `Agora a janela tem ${s.settings.order} tokens. Continua sendo uma cadeia de Markov, mas o estado passou a ser o conjunto dos últimos ${s.settings.order} tokens. É a técnica de “guardar o passado dentro do estado”.`}</p>`,
    math: () => `${tex('P(w_{t+1} \\mid w_1,\\dots,w_t) \\approx P(w_{t+1} \\mid w_{t-n+1},\\dots,w_t)')}<p>À esquerda, o que um modelo ideal usaria; à direita, o que um modelo com janela de n tokens usa.</p>`,
  },
  marcadores: {
    topic: 'Do texto ao modelo',
    title: 'Início e fim de frase',
    body: () => `<p>${tok(BOS)} e ${tok(EOS)} são tokens especiais. O primeiro marca onde a frase começa, para o modelo aprender quais tokens abrem uma frase. O segundo é um token como outro qualquer: quando ele é sorteado, a geração para.</p>
      <p>É assim que um LLM “decide” parar de escrever: sorteando um token de fim.</p>`,
  },

  // ───────── O sorteio ─────────
  distribuicao: {
    topic: 'O sorteio',
    title: 'Distribuição do próximo token',
    body: ({ d }) => `<p>O modelo nunca responde com um token. Ele responde com uma <mark>distribuição</mark>: uma chance para cada token possível. Neste ponto do texto há ${d.dist.length} ${d.dist.length === 1 ? 'opção' : 'opções'}.</p>
      <p>Só depois alguém sorteia um token dessa distribuição. Esse sorteio fica fora do modelo, e é nele que agem a temperatura, o top-k e o top-p.</p>`,
  },
  temperatura: {
    topic: 'O sorteio',
    title: 'Temperatura',
    body: ({ s, d }) => `<p>A <mark>temperatura</mark> mexe na distância entre o provável e o improvável. Abaixo de 1, o provável fica ainda mais provável; acima de 1, as chances se aproximam. Em 1, vale a contagem pura.</p>
      <p>Agora ela está em ${num(s.settings.temperature, 1)} e o token mais provável tem ${pct(d.topP, 0)} de chance${d.dist[0] ? ` (pela contagem pura seriam ${pct(d.dist[0].base, 0)})` : ''}.</p>`,
    math: () => `${tex('p_i = \\frac{b_i^{1/T}}{\\sum_j b_j^{1/T}}')}<p>b é a chance pela contagem e T é a temperatura. É a mesma conta do softmax(logits / T) de um LLM, com logit = ln b.</p>`,
  },
  zero: {
    topic: 'O sorteio',
    title: 'Temperatura zero',
    body: () => `<p>Com temperatura 0 não há sorteio: vence sempre o token mais provável. A mesma entrada produz sempre a mesma saída, e a semente deixa de importar.</p>
      <p>O preço é a repetição: o modelo passa a escrever sempre a frase mais comum, mesmo quando ela não é a melhor.</p>`,
  },
  topk: {
    topic: 'O sorteio',
    title: 'Top-k',
    body: ({ s }) => `<p>O <mark>top-k</mark> mantém no sorteio só os k tokens mais prováveis e descarta o resto. ${s.settings.topK ? `Agora k = ${s.settings.topK}.` : 'Agora ele está desligado.'}</p>
      <p>É um corte de tamanho fixo: sobra o mesmo número de opções quando o modelo está em dúvida e quando ele tem certeza, o que nem sempre faz sentido.</p>`,
  },
  topp: {
    topic: 'O sorteio',
    title: 'Top-p (núcleo)',
    body: ({ s, d }) => `<p>O <mark>top-p</mark> mantém o menor grupo de tokens cuja chance somada chega a p. ${s.settings.topP < 1 ? `Com p = ${num(s.settings.topP, 2)}, ficaram ${d.kept} de ${d.dist.length} tokens.` : 'Em 1, nada é cortado.'}</p>
      <p>O corte se adapta: quando o modelo tem certeza, sobram um ou dois tokens; quando está em dúvida, sobram muitos. Ele tira a cauda de opções improváveis, que é de onde vêm os absurdos.</p>`,
  },
  semente: {
    topic: 'O sorteio',
    title: 'Semente',
    body: ({ s }) => `<p>O sorteio do computador é uma sequência calculada a partir de um número inicial, a <mark>semente</mark>. Com a mesma semente (agora ${s.settings.seed}) e os mesmos ajustes, o texto gerado é idêntico.</p>
      <p>Fixar a semente é o que permite repetir um teste. Sem isso, não dá para saber se o resultado mudou por causa da sua alteração ou do acaso.</p>`,
  },
  entropia: {
    topic: 'O sorteio',
    title: 'Entropia e escolhas efetivas',
    body: ({ d }) => `<p>A <mark>entropia</mark> mede quanta dúvida há na distribuição. Zero quer dizer certeza; quanto maior, mais espalhadas as chances. Aqui ela vale ${num(d.entropy, 2)} bits.</p>
      <p>Uma leitura mais direta: é como se o modelo estivesse escolhendo entre ${num(d.choices, 1)} opções igualmente prováveis. Esse número se chama perplexidade.</p>`,
    math: () => `${tex('H = -\\sum_i p_i \\log_2 p_i \\qquad \\text{escolhas efetivas} = 2^{H}')}`,
  },

  // ───────── Onde o modelo falha ─────────
  recuo: {
    topic: 'Onde o modelo falha',
    title: 'Contexto nunca visto',
    body: ({ d }) => `<p>Quando o contexto inteiro nunca apareceu no texto, este modelo <mark>recua</mark>: tenta com um contexto mais curto, e depois com nenhum. ${d.seen.backedOff ? `É o que acontece agora: ele queria usar ${d.seen.wanted} ${d.seen.wanted === 1 ? 'token' : 'tokens'} e só reconheceu ${d.seen.used}.` : 'Neste ponto do texto ele reconheceu o contexto inteiro.'}</p>
      <p>Repare que ele não avisa. A resposta sai com a mesma aparência de sempre.</p>`,
  },
  alucinacao: {
    topic: 'Onde o modelo falha',
    title: 'Por que o modelo inventa',
    body: () => `<p>O modelo foi feito para continuar o texto com o que é provável, não para dizer a verdade. Quando ele não tem base, o provável continua existindo, e é isso que ele escreve. Isso recebe o nome de <mark>alucinação</mark>.</p>
      <p>Não é defeito de um modelo específico: é consequência do mecanismo. Modelos maiores erram menos, e erram de forma mais convincente.</p>`,
  },
  recitar: {
    topic: 'Onde o modelo falha',
    title: 'Recitar ou generalizar',
    body: ({ s, d }) => `<p>Com janela pequena, o modelo mistura pedaços de frases diferentes: generaliza, e às vezes erra. Com janela grande e pouco texto, só resta um caminho em cada ponto: ele <mark>recita</mark> o que leu.</p>
      <p>${d.copied === null ? 'Gere uma frase para medir.' : `No texto gerado agora, ${pct(d.copied, 0)} das janelas de 4 tokens são cópia do original (contexto de ${s.settings.order}).`}</p>`,
  },
  explosao: {
    topic: 'Onde o modelo falha',
    title: 'Por que não basta aumentar a tabela',
    body: ({ d }) => `<p>Este modelo guarda ${d.contexts} contextos. Cada token a mais na janela multiplica o número de contextos possíveis pelo tamanho do vocabulário (${d.model.vocab.length}), e quase todos nunca aparecem no texto.</p>
      <p>Uma tabela não consegue aproveitar que “nota fiscal” e “NF-e” são parecidas: para ela são linhas diferentes. É esse limite que as redes neurais resolvem.</p>`,
    math: ({ d }) => `${tex(`\\text{contextos possíveis} = V^{n} = ${d.model.vocab.length}^{n}`)}`,
  },
  corte: {
    topic: 'Onde o modelo falha',
    title: 'O modelo só sabe o que leu',
    body: ({ s }) => `<p>Tudo que este modelo sabe veio do texto “${escapeHtml(corpusOf(s).title)}”. O que aconteceu depois de o texto ser escrito, ou o que nunca foi escrito nele, não existe para o modelo.</p>
      <p>Num LLM isso se chama <mark>data de corte</mark>. Preço atual, cadastro de cliente, norma interna: nada disso está no modelo, a não ser que alguém coloque na janela de contexto.</p>`,
  },

  // ───────── Do brinquedo ao LLM de verdade ─────────
  rede: {
    topic: 'Do brinquedo ao LLM de verdade',
    title: 'O que muda num LLM',
    body: () => `<p>A pergunta é a mesma: dado o contexto, qual a chance de cada próximo token? O que muda é como se chega à resposta.</p>
      <ol><li><b>Rede no lugar da tabela.</b> Em vez de procurar o contexto numa lista, o LLM calcula a distribuição com uma função de bilhões de parâmetros, que funciona até para contextos nunca vistos.</li>
      <li><b>Tokens viram vetores.</b> Cada token é representado por uma lista de números, e tokens de sentido parecido ficam próximos.</li>
      <li><b>Janela enorme.</b> A atenção deixa cada token consultar qualquer outro da janela, por mais longe que esteja.</li></ol>
      <p>Temperatura, top-k, top-p, semente e token de fim funcionam do jeito que você viu aqui.</p>`,
  },
  vetores: {
    topic: 'Do brinquedo ao LLM de verdade',
    title: 'Embeddings, em uma frase',
    body: () => `<p>Um <mark>embedding</mark> é o endereço de um token, ou de um texto inteiro, num espaço de muitas dimensões, organizado de modo que sentidos parecidos fiquem perto.</p>
      <p>É o que resolve o limite da tabela, e é a base da busca por significado usada em RAG. O laboratório de vetores e similaridade trata disso.</p>`,
  },

  // ───────── No trabalho ─────────
  'uso-fixo': {
    topic: 'No trabalho',
    title: 'Quando exigir a mesma resposta',
    body: () => `<p>Classificar um documento, extrair um valor, conferir um cadastro: tarefas com uma resposta certa pedem temperatura baixa e formato de saída fixo. Variedade, aqui, é erro.</p>
      <p>Mesmo assim, teste com o mesmo caso várias vezes. Em LLMs comerciais, temperatura 0 reduz a variação, mas nem sempre a elimina.</p>`,
  },
  'uso-contexto': {
    topic: 'No trabalho',
    title: 'O que o modelo não leu, você entrega',
    body: () => `<p>Se a pergunta depende de algo que não estava no treino (um procedimento interno, o saldo de hoje), o modelo vai responder mesmo assim, com o que for provável.</p>
      <p>A saída é colocar a informação certa na janela de contexto, junto com a pergunta, e pedir que ele responda só com base nela. É isso que RAG faz.</p>`,
  },
  'uso-custo': {
    topic: 'No trabalho',
    title: 'Token é custo',
    body: ({ d }) => `<p>Um LLM comercial cobra por token lido e por token escrito. Mandar um manual inteiro em cada pergunta custa dinheiro e tempo em toda chamada.</p>
      <p>O texto deste laboratório tem ${d.model.tokens} tokens. Um contrato de vinte páginas passa de dez mil.</p>`,
  },
  'uso-teste': {
    topic: 'No trabalho',
    title: 'Como testar algo que sorteia',
    body: () => `<p>Uma resposta boa não prova nada: pode ter sido sorte. Para avaliar um uso de LLM, monte um conjunto de casos com resposta conhecida, rode cada um várias vezes e conte os acertos.</p>
      <p>Quando alguém mostrar uma demonstração, pergunte: quantos casos, quantas repetições, e quem conferiu o resultado.</p>`,
  },
};

/** Conceitos de um assunto, na ordem em que aparecem acima. */
export const tipsOf = (topic) => Object.entries(LLM_TIPS).filter(([, tip]) => tip.topic === topic).map(([id, tip]) => ({ id, ...tip }));
