// Galeria de modelos prontos. Os números são ILUSTRATIVOS: servem para explorar a ideia,
// não para decidir nada sobre o mundo real.
import { makeChain } from './chain.js';

const line = (n) =>
  Array.from({ length: n }, (_, i) => ({ x: 0.06 + (0.88 * i) / (n - 1), y: 0.5 + (i % 2 ? 0.28 : -0.28) }));

/** Absorventes numa coluna à direita: a leitura vira "o fluxo anda para cá". */
const pipeline = (n, ends) => {
  const flow = n - ends;
  return Array.from({ length: n }, (_, i) => {
    if (i < flow) return { x: 0.04 + (0.68 * i) / Math.max(1, flow - 1), y: 0.5 + (i % 2 ? 0.2 : -0.2) };
    const k = i - flow;
    return { x: 0.96, y: ends === 1 ? 0.5 : 0.08 + (0.84 * k) / (ends - 1) };
  });
};

const pageRank = () => {
  const links = [[1, 2], [2], [0], [0, 2]];
  const n = 4, damp = 0.85;
  return links.map((out) =>
    Array.from({ length: n }, (_, j) => (out.includes(j) ? damp / out.length : 0) + (1 - damp) / n).map((v) => Math.round(v * 1e6) / 1e6)
  );
};

export const GROUPS = ['Negócios', 'Pessoas e saúde', 'Máquinas e sistemas', 'Jogos', 'Conceitos puros'];

export const MODELS = [
  // ───────── 2 estados ─────────
  {
    id: 'clima2', group: 'Conceitos puros', levels: [1], name: 'Sol ou chuva',
    blurb: 'O exemplo clássico: o tempo de amanhã depende só do tempo de hoje.',
    question: 'Em que fração dos dias chove, no longo prazo?',
    unit: 'cidade', units: 'cidades', step: 'dia', steps: 'dias',
    labels: ['Sol', 'Chuva'], colors: ['#F29E1F', '#2F6BFF'],
    matrix: [[0.8, 0.2], [0.4, 0.6]],
  },
  {
    id: 'maquina2', group: 'Máquinas e sistemas', levels: [1], name: 'Máquina que quebra',
    blurb: 'Funciona ou está quebrada. Quanto tempo ela fica parada?',
    question: 'Que fração do tempo a máquina fica parada?',
    unit: 'máquina', units: 'máquinas', step: 'dia', steps: 'dias',
    labels: ['Funcionando', 'Quebrada'], colors: ['#13A87B', '#E8467C'],
    matrix: [[0.9, 0.1], [0.6, 0.4]],
  },
  {
    id: 'assinante2', group: 'Negócios', levels: [1], name: 'Assinante que pausa',
    blurb: 'Quem pausa pode voltar. Quantos ficam ativos em média?',
    question: 'Que fração dos assinantes fica ativa?',
    unit: 'assinante', units: 'assinantes', step: 'mês', steps: 'meses',
    labels: ['Ativo', 'Pausado'], colors: ['#2F6BFF', '#7A5AF8'],
    matrix: [[0.85, 0.15], [0.35, 0.65]],
  },
  {
    id: 'transito2', group: 'Máquinas e sistemas', levels: [1], name: 'Rua congestionada',
    blurb: 'A rua está livre ou parada, e isso tende a continuar por um tempo.',
    question: 'Em que fração das horas a rua fica congestionada?',
    unit: 'rua', units: 'ruas', step: 'hora', steps: 'horas',
    labels: ['Livre', 'Congestionada'], colors: ['#00A6C8', '#FF7A00'],
    matrix: [[0.7, 0.3], [0.25, 0.75]],
  },
  {
    id: 'humor2', group: 'Pessoas e saúde', levels: [1], name: 'Humor do dia',
    blurb: 'O humor de hoje influencia o de amanhã, e nada além disso.',
    question: 'Em que fração dos dias a pessoa está bem?',
    unit: 'pessoa', units: 'pessoas', step: 'dia', steps: 'dias',
    labels: ['Bem', 'Mal'], colors: ['#F29E1F', '#3D5A80'],
    matrix: [[0.75, 0.25], [0.5, 0.5]],
  },

  // ───────── 3 estados ─────────
  {
    id: 'marcas', group: 'Negócios', levels: [2, 3], name: 'Fidelidade a marcas',
    blurb: 'A cada compra, o consumidor fica na marca ou troca. Qual marca ganha mercado?',
    question: 'Qual será a participação de mercado de cada marca?',
    unit: 'consumidor', units: 'consumidores', step: 'compra', steps: 'compras',
    labels: ['Marca A', 'Marca B', 'Marca C'], colors: ['#2F6BFF', '#F29E1F', '#13A87B'],
    matrix: [[0.7, 0.2, 0.1], [0.15, 0.7, 0.15], [0.2, 0.2, 0.6]],
  },
  {
    id: 'clima3', group: 'Conceitos puros', levels: [2, 3], name: 'Clima em 3 estados',
    blurb: 'Sol, nuvens e chuva, cada um com tendência a continuar.',
    question: 'Como os dias se dividem entre os três climas?',
    unit: 'cidade', units: 'cidades', step: 'dia', steps: 'dias',
    labels: ['Sol', 'Nublado', 'Chuva'], colors: ['#F29E1F', '#7A5AF8', '#2F6BFF'],
    matrix: [[0.6, 0.3, 0.1], [0.3, 0.4, 0.3], [0.2, 0.4, 0.4]],
  },
  {
    id: 'maquina3', group: 'Máquinas e sistemas', levels: [2, 3], name: 'Manutenção de máquina',
    blurb: 'Funciona, apresenta defeito, vai para a manutenção e volta.',
    question: 'Que fração do tempo a máquina está produzindo?',
    unit: 'máquina', units: 'máquinas', step: 'dia', steps: 'dias',
    labels: ['Funcionando', 'Com defeito', 'Manutenção'], colors: ['#13A87B', '#E8467C', '#7A5AF8'],
    matrix: [[0.85, 0.1, 0.05], [0, 0.5, 0.5], [0.7, 0, 0.3]],
  },
  {
    id: 'transito3', group: 'Máquinas e sistemas', levels: [2, 3], name: 'Trânsito na avenida',
    blurb: 'O trânsito piora aos poucos e melhora aos poucos.',
    question: 'Quanto tempo se passa, em média, entre dois congestionamentos?',
    unit: 'avenida', units: 'avenidas', step: 'hora', steps: 'horas',
    labels: ['Livre', 'Lento', 'Parado'], colors: ['#13A87B', '#F29E1F', '#E8467C'],
    matrix: [[0.7, 0.3, 0], [0.3, 0.45, 0.25], [0.1, 0.4, 0.5]],
  },

  // ───────── N estados ─────────
  {
    id: 'assinatura', group: 'Negócios', levels: [3], name: 'Vida de um assinante',
    blurb: 'Novo, ativo, em risco, cancelou. Quanto tempo dura um assinante?',
    question: 'Quantos meses dura, em média, um assinante novo?',
    unit: 'assinante', units: 'assinantes', step: 'mês', steps: 'meses',
    labels: ['Novo', 'Ativo', 'Em risco', 'Cancelou'], colors: ['#00A6C8', '#2F6BFF', '#F29E1F', '#3D5A80'],
    matrix: [[0, 0.8, 0.1, 0.1], [0, 0.85, 0.1, 0.05], [0, 0.3, 0.4, 0.3], [0, 0, 0, 1]],
    pos: pipeline(4, 1),
  },
  {
    id: 'funil', group: 'Negócios', levels: [3], name: 'Funil de vendas',
    blurb: 'Da primeira visita até comprar ou desistir.',
    question: 'De cada 100 visitantes, quantos compram?',
    unit: 'pessoa', units: 'pessoas', step: 'visita', steps: 'visitas',
    labels: ['Visitante', 'Interessado', 'Carrinho', 'Comprou', 'Desistiu'], colors: ['#00A6C8', '#2F6BFF', '#7A5AF8', '#13A87B', '#3D5A80'],
    matrix: [[0.2, 0.3, 0, 0, 0.5], [0, 0.3, 0.3, 0, 0.4], [0, 0.1, 0.2, 0.5, 0.2], [0, 0, 0, 1, 0], [0, 0, 0, 0, 1]],
    pos: pipeline(5, 2),
  },
  {
    id: 'credito', group: 'Negócios', levels: [3], name: 'Empréstimo em dia ou atrasado',
    blurb: 'Parcelas em dia, atraso, negociação, calote ou quitação.',
    question: 'Qual a chance de um empréstimo em dia virar inadimplência?',
    unit: 'empréstimo', units: 'empréstimos', step: 'mês', steps: 'meses',
    labels: ['Em dia', 'Atrasado', 'Negociando', 'Inadimplente', 'Quitado'], colors: ['#13A87B', '#F29E1F', '#7A5AF8', '#E8467C', '#2F6BFF'],
    matrix: [[0.93, 0.05, 0, 0, 0.02], [0.5, 0.3, 0.15, 0.05, 0], [0.35, 0.1, 0.35, 0.2, 0], [0, 0, 0, 1, 0], [0, 0, 0, 0, 1]],
    pos: pipeline(5, 2),
  },
  {
    id: 'faculdade', group: 'Pessoas e saúde', levels: [3], name: 'Caminho na faculdade',
    blurb: 'Avançar, repetir, formar ou evadir, ano a ano.',
    question: 'Que fração dos alunos se forma, e em quantos anos?',
    unit: 'aluno', units: 'alunos', step: 'ano', steps: 'anos',
    labels: ['1º ano', '2º ano', '3º ano', '4º ano', 'Formado', 'Evadiu'], colors: ['#00A6C8', '#2F6BFF', '#7A5AF8', '#B5179E', '#13A87B', '#3D5A80'],
    matrix: [
      [0.1, 0.75, 0, 0, 0, 0.15],
      [0, 0.1, 0.8, 0, 0, 0.1],
      [0, 0, 0.1, 0.85, 0, 0.05],
      [0, 0, 0, 0.1, 0.85, 0.05],
      [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 1],
    ],
    pos: pipeline(6, 2),
  },
  {
    id: 'epidemia', group: 'Pessoas e saúde', levels: [3], name: 'Epidemia que vai e volta',
    blurb: 'Suscetível, infectado, internado, recuperado, e a imunidade passa com o tempo.',
    question: 'Que fração da população fica doente, em média?',
    unit: 'pessoa', units: 'pessoas', step: 'semana', steps: 'semanas',
    labels: ['Suscetível', 'Infectado', 'Internado', 'Recuperado'], colors: ['#2F6BFF', '#FF7A00', '#E8467C', '#13A87B'],
    matrix: [[0.92, 0.08, 0, 0], [0, 0.55, 0.1, 0.35], [0, 0, 0.6, 0.4], [0.03, 0, 0, 0.97]],
  },
  {
    id: 'humor3', group: 'Pessoas e saúde', levels: [3], name: 'Humor em 3 estados',
    blurb: 'Bem, neutro ou mal: o humor muda aos poucos.',
    question: 'Quanto tempo se passa entre dois dias ruins?',
    unit: 'pessoa', units: 'pessoas', step: 'dia', steps: 'dias',
    labels: ['Bem', 'Neutro', 'Mal'], colors: ['#F29E1F', '#00A6C8', '#3D5A80'],
    matrix: [[0.7, 0.25, 0.05], [0.3, 0.5, 0.2], [0.1, 0.4, 0.5]],
  },
  {
    id: 'pagerank', group: 'Máquinas e sistemas', levels: [3], name: 'Mini-PageRank',
    blurb: 'Um navegante clica ao acaso em links. π mede a importância de cada página.',
    question: 'Qual página é a mais importante?',
    unit: 'navegante', units: 'navegantes', step: 'clique', steps: 'cliques',
    labels: ['Página A', 'Página B', 'Página C', 'Página D'],
    matrix: pageRank(),
  },
  {
    id: 'fila', group: 'Máquinas e sistemas', levels: [3], name: 'Fila de atendimento',
    blurb: 'A cada minuto chega alguém (30%) ou alguém é atendido (40%).',
    question: 'Que fração do tempo a fila fica cheia?',
    unit: 'fila', units: 'filas', step: 'minuto', steps: 'minutos',
    labels: ['0 na fila', '1 na fila', '2 na fila', '3 na fila'],
    matrix: [[0.7, 0.3, 0, 0], [0.4, 0.3, 0.3, 0], [0, 0.4, 0.3, 0.3], [0, 0, 0.4, 0.6]],
    pos: line(4),
  },
  {
    id: 'ruina', group: 'Jogos', levels: [3], name: 'Ruína do jogador',
    blurb: 'Aposta R$1 por rodada até quebrar ou chegar a R$4.',
    question: 'Qual a chance de quebrar começando com R$2?',
    unit: 'jogador', units: 'jogadores', step: 'rodada', steps: 'rodadas',
    labels: ['R$0', 'R$1', 'R$2', 'R$3', 'R$4'], colors: ['#3D5A80', '#E8467C', '#F29E1F', '#00A6C8', '#13A87B'],
    matrix: [[1, 0, 0, 0, 0], [0.5, 0, 0.5, 0, 0], [0, 0.5, 0, 0.5, 0], [0, 0, 0.5, 0, 0.5], [0, 0, 0, 0, 1]],
    pos: line(5),
  },
  {
    id: 'trilha', group: 'Jogos', levels: [3], name: 'Trilha com atalho e armadilha',
    blurb: 'Jogo de tabuleiro: dá para avançar, pegar um atalho ou escorregar.',
    question: 'Quantas jogadas leva, em média, para terminar a trilha?',
    unit: 'peão', units: 'peões', step: 'jogada', steps: 'jogadas',
    labels: ['Casa 1', 'Casa 2', 'Casa 3', 'Casa 4', 'Chegada'],
    matrix: [[0.1, 0.6, 0.3, 0, 0], [0, 0.1, 0.5, 0.4, 0], [0.3, 0, 0.1, 0.4, 0.2], [0, 0.2, 0, 0.1, 0.7], [0, 0, 0, 0, 1]],
    pos: pipeline(5, 1),
  },
  {
    id: 'futebol', group: 'Jogos', levels: [3], name: 'Posse de bola',
    blurb: 'A bola anda entre defesa, meio e ataque até sair um gol.',
    question: 'Quantos lances se passam, em média, entre dois gols?',
    unit: 'bola', units: 'bolas', step: 'lance', steps: 'lances',
    labels: ['Defesa', 'Meio', 'Ataque', 'Gol'], colors: ['#3D5A80', '#00A6C8', '#F29E1F', '#13A87B'],
    matrix: [[0.4, 0.5, 0.1, 0], [0.25, 0.4, 0.35, 0], [0.15, 0.35, 0.35, 0.15], [0, 1, 0, 0]],
  },
  {
    id: 'frases', group: 'Jogos', levels: [3], name: 'Gerador de frases',
    blurb: 'A ideia por trás dos primeiros corretores de texto: a próxima palavra depende da atual.',
    question: 'Quantas palavras tem uma frase, em média?',
    unit: 'frase', units: 'frases', step: 'palavra', steps: 'palavras',
    labels: ['Início', 'Sujeito', 'Verbo', 'Objeto', 'Ponto final'],
    matrix: [[0, 1, 0, 0, 0], [0, 0.05, 0.95, 0, 0], [0, 0, 0.1, 0.7, 0.2], [0, 0.1, 0.1, 0.2, 0.6], [1, 0, 0, 0, 0]],
  },
  {
    id: 'ciclo', group: 'Conceitos puros', levels: [3], name: 'Ciclo sem saída',
    blurb: 'Período 3: as bolinhas andam em ondas e os potes nunca param.',
    question: 'Por que este modelo nunca se acalma?',
    labels: ['Manhã', 'Tarde', 'Noite'], colors: ['#F29E1F', '#E8467C', '#3D5A80'],
    matrix: [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
  },
  {
    id: 'ilhas', group: 'Conceitos puros', levels: [3], name: 'Duas ilhas',
    blurb: 'Dois grupos fechados e um estado de partida que escolhe um deles.',
    question: 'De que depende o destino final?',
    labels: ['Início', 'Ilha A1', 'Ilha A2', 'Ilha B1', 'Ilha B2'], colors: ['#B5179E', '#13A87B', '#5B8C00', '#2F6BFF', '#00A6C8'],
    matrix: [[0.2, 0.5, 0, 0.3, 0], [0, 0.3, 0.7, 0, 0], [0, 0.6, 0.4, 0, 0], [0, 0, 0, 0.5, 0.5], [0, 0, 0, 0.8, 0.2]],
    pos: [{ x: 0.5, y: 0.02 }, { x: 0.1, y: 0.45 }, { x: 0.28, y: 0.98 }, { x: 0.9, y: 0.45 }, { x: 0.72, y: 0.98 }],
  },
];

export const modelById = (id) => MODELS.find((m) => m.id === id);
export const modelsForLevel = (level) => MODELS.filter((m) => m.levels.includes(level));

/** Constrói uma cópia nova do modelo: editar não altera o catálogo. */
export function buildModel(id) {
  const m = modelById(id);
  if (!m) throw new Error(`Modelo desconhecido: ${id}`);
  return makeChain(m.labels, m.matrix, {
    colors: m.colors,
    pos: m.pos,
    meta: { title: m.name, about: m.blurb, question: m.question, unit: m.unit, units: m.units, step: m.step, steps: m.steps },
  });
}
