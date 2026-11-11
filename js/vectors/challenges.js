// Desafios do laboratório de vetores: validadores puros sobre o estado.
// check(ctx) → { done, progress ∈ [0,1], live? }   ctx = { s, d }  (d = s.derived)
import { num } from '../util.js';
import { DOCS, cosine } from './engine.js';

export const context = (s) => ({ s, d: s.derived });

const BOLETO = DOCS.find((doc) => doc.id === 'boleto');

export const VEC_CHALLENGES = [
  {
    id: 'mesma-direcao',
    title: 'O tamanho não entra',
    type: 'quiz',
    desc: 'A aponta para (2, 1) e B vale o dobro: (4, 2). Qual é o cosseno entre elas?',
    hints: ['Desenhe as duas setas: elas ficam na mesma reta?', 'O cosseno só enxerga o ângulo entre as setas.'],
    quiz: () => ({
      options: [
        { label: '0,5', why: 'O dobro no tamanho não vira metade no cosseno. O cosseno não mede tamanho, só direção.' },
        { label: '1', correct: true },
        { label: '2', why: 'O cosseno nunca passa de 1. Mesmo com B bem maior que A, ele não cresce.' },
        { label: '0', why: 'Zero seria setas perpendiculares. Estas apontam para o mesmo lado.' },
      ],
    }),
    success: 'Mesma direção dá cosseno 1, não importa o tamanho. É por isso que o cosseno serve para comparar textos de comprimentos diferentes.',
  },
  {
    id: 'perpendiculares',
    title: 'Nada em comum',
    desc: 'No modo “Duas setas”, deixe A e B perpendiculares: cosseno perto de zero, com as duas setas de tamanho pelo menos 1.',
    hints: ['Arraste a ponta de B até formar um L com A.', 'Se A aponta para (3, 1), tente B em (−1, 3): troque as coordenadas e inverta o sinal de uma delas.'],
    check: ({ s, d }) => {
      const ok = s.mode === 'pair' && !d.pair.zero;
      const c = Math.abs(d.pair.cos);
      return {
        done: ok && c < 0.03 && d.pair.na >= 1 && d.pair.nb >= 1,
        progress: ok ? Math.max(0.05, 1 - Math.min(1, c)) : 0,
        live: ok ? `cosseno agora: ${num(d.pair.cos, 2)} · ângulo de ${num(d.pair.angle, 0)}°` : 'volte ao modo “Duas setas” e deixe as duas setas com tamanho',
      };
    },
    success: 'Perpendiculares: produto escalar zero e cosseno zero. Em texto, é o que acontece com assuntos que não têm nada a ver um com o outro.',
  },
  {
    id: 'opostas',
    title: 'Sentidos contrários',
    desc: 'Faça o cosseno ficar abaixo de −0,98: A e B apontando para lados opostos.',
    hints: ['Aponte B para o lado oposto ao de A, passando pela origem.', 'Se A está em (3, 1), B em (−3, −1) serve.'],
    check: ({ s, d }) => {
      const ok = s.mode === 'pair' && !d.pair.zero;
      return {
        done: ok && d.pair.cos <= -0.98,
        progress: ok ? Math.max(0.05, (1 - d.pair.cos) / 2) : 0,
        live: ok ? `cosseno agora: ${num(d.pair.cos, 2)}` : 'volte ao modo “Duas setas” e deixe as duas setas com tamanho',
      };
    },
    success: 'O cosseno vai de −1 (opostos) a 1 (mesma direção). Num modelo de embeddings real, valores negativos fortes são raros: textos de assuntos distantes costumam ficar perto de zero.',
  },
  {
    id: 'tamanho-importa',
    title: 'Mesma direção, produto maior',
    desc: 'Aponte A e B para o mesmo lado (cosseno de 0,99 ou mais) e leve o produto escalar acima de 20.',
    hints: ['Deixe as duas setas bem compridas, apontando para o mesmo lado.', 'Algo como A em (4, 4) e B em (4, 4): o cosseno é 1 e o produto escalar é 32.'],
    check: ({ s, d }) => {
      const ok = s.mode === 'pair' && !d.pair.zero;
      const aligned = ok && d.pair.cos >= 0.99;
      return {
        done: aligned && d.pair.dot > 20,
        progress: ok ? 0.5 * Math.max(0, Math.min(1, d.pair.cos)) + 0.5 * Math.max(0, Math.min(1, d.pair.dot / 20)) : 0,
        live: ok ? `cosseno ${num(d.pair.cos, 2)} · produto escalar ${num(d.pair.dot, 1)}` : 'volte ao modo “Duas setas”',
      };
    },
    success: 'O cosseno não mudou, mas o produto escalar cresceu: ele mistura direção e tamanho. Por isso, ao comparar textos, quase sempre se usa o cosseno, ou normaliza-se os vetores antes.',
  },
  {
    id: 'busca-discorda',
    title: 'Quando os métodos discordam',
    desc: 'No modo “Busca”, ache uma consulta para a qual o cosseno e o produto escalar escolhem documentos diferentes.',
    hints: ['Os documentos 1 e 2 falam do mesmo assunto, mas o 1 é bem mais comprido.', 'Aponte a consulta para o documento 2, de cabeça: o cosseno o escolhe, o produto escalar prefere o 1.'],
    check: ({ s, d }) => ({
      done: s.mode === 'search' && d.disagree && !d.queryZero,
      progress: s.mode === 'search' ? (d.disagree ? 1 : 0.4) : 0.1,
      live: s.mode !== 'search' ? 'passe para o modo “Busca”' : d.disagree ? 'os dois métodos discordam' : 'os dois métodos escolhem o mesmo documento',
    }),
    success: 'O produto escalar premiou o texto mais comprido, não o mais parecido. Numa busca de verdade isso devolveria o documento “grande” no lugar do “certo”: é o erro que a normalização evita.',
  },
  {
    id: 'busca-boleto',
    title: 'Faça a busca achar o boleto',
    desc: 'Pelo cosseno, faça “Boleto vencido há trinta dias” aparecer em primeiro lugar.',
    hints: ['Escolha o cosseno no seletor da busca.', 'O assunto de cobrança fica para cima: aponte a consulta para perto do eixo vertical.'],
    check: ({ s, d }) => ({
      done: s.mode === 'search' && s.metric === 'cosine' && !d.queryZero && d.tops.cosine.id === 'boleto',
      progress: s.mode === 'search' && !d.queryZero ? Math.max(0.05, (cosine(s.q, BOLETO.v) + 1) / 2) : 0.05,
      live: s.mode !== 'search' ? 'passe para o modo “Busca”' : s.metric !== 'cosine' ? 'escolha o cosseno' : `em primeiro: “${d.tops.cosine.text}”`,
    }),
    success: 'Você acabou de fazer uma busca por significado: a pergunta virou um vetor e o sistema devolveu o texto cuja seta aponta para o mesmo lado. É o coração de um RAG.',
  },
  {
    id: 'distancia',
    title: 'Distância em linha reta',
    type: 'quiz',
    desc: 'Dois textos falam do mesmo assunto, mas um é bem mais comprido. Medida em linha reta entre as pontas das setas, a distância entre eles é…',
    hints: ['Veja o documento 1 e o 2 no plano: as pontas estão perto ou longe?', 'A distância em linha reta enxerga o tamanho, e o cosseno não.'],
    quiz: () => ({
      options: [
        { label: 'pequena, porque falam do mesmo assunto', why: 'A distância não sabe de assunto: só mede quão longe estão as pontas. Uma ponta bem lá na frente e outra perto da origem ficam longe.' },
        { label: 'grande, porque o tamanho pesa', correct: true },
        { label: 'zero, porque apontam para o mesmo lado', why: 'Zero só se as pontas coincidirem. Mesma direção com tamanhos diferentes deixa as pontas separadas.' },
      ],
    }),
    success: 'Distância mistura direção e tamanho, como o produto escalar. Para dizer “falam da mesma coisa” sem depender do comprimento, use o cosseno.',
  },
];
