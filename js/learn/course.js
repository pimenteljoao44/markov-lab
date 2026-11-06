// Trilha de aulas: assistir primeiro, depois ver o assunto acontecer no app.
// Títulos, durações e horários conferidos no YouTube em nov/2026. Os horários do André Timpanaro
// vêm dos capítulos que ele mesmo publicou; os demais apontam para o começo da aula.

const FRANCISCO = 'Prof. Francisco Rodrigues (USP)';
const TIMPANARO = 'André Timpanaro (UFABC)';
const NERD = 'Normalized Nerd';
const UFRJ = 'Avaliação de Desempenho (UFRJ)';
const DUBBED = 'Original em inglês. Para ouvir em português: engrenagem do vídeo → Faixa de áudio → Português (BR).';

export const VIDEOS = {
  i3AkTO9HLXo: { title: 'Cadeias de Markov explicadas claramente', author: NERD, length: '9:24', note: DUBBED },
  VNHeFp6zXKU: { title: 'Recorrência, irredutibilidade e classes', author: NERD, length: '6:29', note: DUBBED },
  Zo3ieESzr4E: { title: 'Matriz de transição de n passos', author: NERD, length: '8:34', note: DUBBED },
  k6FAZJGTZJo: { title: 'Cadeia de Markov: conceitos fundamentais', author: FRANCISCO, length: '47:23' },
  '0ymZ2Iv_9q8': { title: 'Absorção: para onde vai e quanto tempo leva', author: FRANCISCO, length: '55:04' },
  cwhQYqR_Iag: { title: 'Caminhadas aleatórias: teoria e simulação', author: FRANCISCO, length: '25:45' },
  _N9bZNTaMz8: { title: 'Distribuição estacionária e cadeias ergódicas', author: FRANCISCO, length: '45:10' },
  iwraRlbubeQ: { title: 'O algoritmo PageRank', author: FRANCISCO, length: '19:44' },
  qfxTVf1myCg: { title: 'Classificação de estados', author: UFRJ, length: '14:29' },
  'Hj-zeG20b64': { title: 'A noção de processo estocástico', author: TIMPANARO, length: '13:30' },
  '38rMKBgi2tY': { title: 'Os estados de um processo estocástico', author: TIMPANARO, length: '15:43' },
  SiRKoGDDtQU: { title: 'Revisão: marginalização e condicionamento', author: TIMPANARO, length: '38:27' },
  w3eQB_IgsNA: { title: 'A memória de um processo estocástico', author: TIMPANARO, length: '13:11' },
  wTXwmOBq3WI: { title: 'Cadeias de Markov e a propriedade de Markov', author: TIMPANARO, length: '8:34' },
  SNrfBQEOkGQ: { title: 'A evolução temporal de uma cadeia de Markov', author: TIMPANARO, length: '21:23' },
  dgxvy8V3JCA: { title: 'Distribuições estacionárias', author: TIMPANARO, length: '25:12' },
  'U3p4-cWHowg': { title: 'Estados transientes e recorrentes', author: TIMPANARO, length: '22:14' },
  A_X8kDwFdpc: { title: 'Comunicabilidade e classes de estados', author: TIMPANARO, length: '24:06' },
  cPBpQvxURCE: { title: 'Identificação das classes e de seus tipos', author: TIMPANARO, length: '20:12' },
  YpJqxSUeER8: { title: 'O problema da primeira passagem', author: TIMPANARO, length: '27:59' },
  l7HIr6NmItI: { title: 'O modelo da ruína', author: TIMPANARO, length: '32:30' },
  CUXWa2sXohQ: { title: 'Tempos de retorno e o teorema ergódico', author: TIMPANARO, length: '33:06' },
  '4O2gSPD48EM': { title: 'Métodos de Monte Carlo', author: TIMPANARO, length: '25:01' },
};

const more = (v, at, what) => ({ v, at, what });

export const COURSE = [
  {
    id: 'basico',
    title: 'O que é uma cadeia de Markov',
    goal: 'Estados, transições e a ideia central: o próximo passo depende só de onde se está agora.',
    watch: ['i3AkTO9HLXo', 'k6FAZJGTZJo'],
    deeper: [
      more('SiRKoGDDtQU', '0:00', 'Se faltar base de probabilidade condicional'),
      more('w3eQB_IgsNA', '0:05', 'O que significa um processo não ter memória'),
      more('wTXwmOBq3WI', '4:09', 'A propriedade de Markov, de forma rigorosa'),
    ],
    practice: [{ label: 'Responder ao primeiro desafio', level: 1, challenge: 'memoryless' }],
  },
  {
    id: 'matriz',
    title: 'A matriz e a previsão em n passos',
    goal: 'Como escrever as regras numa tabela e usá-la para prever o futuro. A segunda aula usa o mesmo exemplo de sol e chuva que abre o app.',
    watch: ['Zo3ieESzr4E', 'SNrfBQEOkGQ'],
    deeper: [
      more('SNrfBQEOkGQ', '13:28', 'Exemplo de evolução no tempo: sol e chuva'),
      more('SNrfBQEOkGQ', '19:44', 'O grafo de transições'),
      more('k6FAZJGTZJo', '24:44', 'Probabilidades em vários passos'),
    ],
    practice: [{ label: 'Editar a matriz no nível 2', level: 2 }],
  },
  {
    id: 'simulacao',
    title: 'Sorteio e conta exata',
    goal: 'Por que cada sorteio é imprevisível, mas a multidão não, e como simular uma cadeia.',
    watch: ['cwhQYqR_Iag'],
    deeper: [
      more('U3p4-cWHowg', '1:54', 'Simulação da distribuição ao longo do tempo'),
      more('4O2gSPD48EM', '0:05', 'Monte Carlo, do começo'),
      more('4O2gSPD48EM', '3:46', 'Qual é a precisão dos sorteios'),
    ],
    practice: [{ label: 'Rodar a simulação com 100 ou mais', level: 1, challenge: 'run-sim' }],
  },
  {
    id: 'classes',
    title: 'Como a cadeia se comporta',
    goal: 'Classes, estados transitórios e recorrentes, irredutibilidade e periodicidade.',
    watch: ['VNHeFp6zXKU', 'qfxTVf1myCg'],
    deeper: [
      more('U3p4-cWHowg', '9:00', 'Definição de transiente e recorrente'),
      more('A_X8kDwFdpc', '7:27', 'Comunicabilidade entre estados'),
      more('A_X8kDwFdpc', '12:29', 'Classes de estados'),
      more('cPBpQvxURCE', '0:05', 'Como achar as classes olhando o grafo'),
    ],
    practice: [
      { label: 'Criar uma cadeia periódica', level: 2, challenge: 'broken-clock' },
      { label: 'Criar classes fechadas', level: 3, challenge: 'islands' },
    ],
  },
  {
    id: 'equilibrio',
    title: 'Equilíbrio e cadeias ergódicas',
    goal: 'O que é a distribuição π, como calculá-la e quando tudo converge para ela.',
    watch: ['_N9bZNTaMz8'],
    deeper: [
      more('dgxvy8V3JCA', '5:17', 'O que é uma distribuição estacionária'),
      more('dgxvy8V3JCA', '7:26', 'Exemplo: sol e chuva'),
      more('CUXWa2sXohQ', '4:44', 'O tempo de retorno'),
      more('CUXWa2sXohQ', '26:14', 'O teorema ergódico'),
    ],
    practice: [
      { label: 'Ajustar o longo prazo', level: 1, challenge: 'three-quarters' },
      { label: 'Achar o equilíbrio sem olhar', level: 3, challenge: 'stationary-hunt' },
    ],
  },
  {
    id: 'absorcao',
    title: 'Absorção e tempo até chegar',
    goal: 'Quando há estados sem saída: em qual deles cada um termina e quanto tempo leva.',
    watch: ['0ymZ2Iv_9q8'],
    deeper: [
      more('YpJqxSUeER8', '3:20', 'A noção de estado absorvente'),
      more('YpJqxSUeER8', '4:02', 'O tempo de primeira passagem'),
      more('l7HIr6NmItI', '5:19', 'A chance de atingir cada estado absorvente'),
      more('l7HIr6NmItI', '21:44', 'O tempo médio até a absorção'),
    ],
    practice: [
      { label: 'Criar um buraco negro', level: 2, challenge: 'black-hole' },
      { label: 'Abrir a ruína do jogador', level: 3, model: 'ruina' },
    ],
  },
  {
    id: 'modelar',
    title: 'Modelar um problema de verdade',
    goal: 'Como escolher os estados quando o passado importa e como uma aplicação real usa tudo isso.',
    watch: ['w3eQB_IgsNA', 'iwraRlbubeQ'],
    deeper: [
      more('Hj-zeG20b64', '3:41', 'O que entendemos por modelagem'),
      more('w3eQB_IgsNA', '9:12', 'Estados que tornam o processo Markoviano'),
    ],
    practice: [
      { label: 'Abrir o mini-PageRank', level: 3, model: 'pagerank' },
      { label: 'Modelar o meu problema', level: 3, wizard: true },
    ],
  },
];

/** Etapa recomendada antes de praticar em cada nível. */
export const STAGE_FOR_LEVEL = { 1: 'basico', 2: 'matriz', 3: 'modelar' };

/** Conceito do Caderno de teoria → trecho de aula que o explica. */
export const MOMENTS = {
  state: { v: '38rMKBgi2tY', at: '0:00' },
  step: { v: 'Hj-zeG20b64', at: '11:28' },
  arrow: { v: 'SNrfBQEOkGQ', at: '19:44' },
  markov: { v: 'wTXwmOBq3WI', at: '4:09' },
  matrix: { v: 'SNrfBQEOkGQ', at: '3:00' },
  row: { v: 'SNrfBQEOkGQ', at: '3:00' },
  column: { v: 'SNrfBQEOkGQ', at: '3:00' },
  cell: { v: 'SNrfBQEOkGQ', at: '3:00' },
  diagonal: { v: 'SNrfBQEOkGQ', at: '3:00' },
  'row-sum': { v: 'SNrfBQEOkGQ', at: '3:00' },
  mu0: { v: 'SNrfBQEOkGQ', at: '0:05' },
  run: { v: '4O2gSPD48EM', at: '0:05' },
  lln: { v: '4O2gSPD48EM', at: '3:46' },
  chart: { v: 'U3p4-cWHowg', at: '1:54' },
  pi: { v: 'dgxvy8V3JCA', at: '5:17' },
  equilibrium: { v: 'dgxvy8V3JCA', at: '15:20' },
  'return-time': { v: 'CUXWa2sXohQ', at: '4:44' },
  irreducible: { v: 'A_X8kDwFdpc', at: '7:27' },
  classes: { v: 'A_X8kDwFdpc', at: '12:29' },
  periodic: { v: 'qfxTVf1myCg', at: '0:00' },
  ergodic: { v: 'CUXWa2sXohQ', at: '26:14' },
  absorbing: { v: 'YpJqxSUeER8', at: '3:20' },
  absorbed: { v: 'l7HIr6NmItI', at: '5:19' },
  transient: { v: 'U3p4-cWHowg', at: '9:00' },
  islands: { v: 'cPBpQvxURCE', at: '6:50' },
  'ask-pn': { v: 'SNrfBQEOkGQ', at: '5:45' },
  'ask-hit': { v: 'YpJqxSUeER8', at: '4:02' },
  fundamental: { v: '0ymZ2Iv_9q8', at: '0:00' },
  'good-state': { v: 'w3eQB_IgsNA', at: '9:12' },
  'memory-state': { v: 'w3eQB_IgsNA', at: '8:05' },
  'start-modeling': { v: 'Hj-zeG20b64', at: '3:41' },
};

export const toSeconds = (text) => text.split(':').reduce((total, part) => total * 60 + Number(part), 0);

/** O domínio sem cookies do YouTube: o vídeo só é pedido quando a pessoa clica em assistir. */
export const embedUrl = (v, at = '0:00') => `https://www.youtube-nocookie.com/embed/${v}?start=${toSeconds(at)}&rel=0&autoplay=1`;
export const watchUrl = (v, at = '0:00') => `https://www.youtube.com/watch?v=${v}&t=${toSeconds(at)}s`;

/** Soma das aulas principais, como "4h27". */
export function essentialTime() {
  const seconds = COURSE.flatMap((stage) => stage.watch).reduce((sum, v) => sum + toSeconds(VIDEOS[v].length), 0);
  const minutes = Math.round(seconds / 60);
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
}
