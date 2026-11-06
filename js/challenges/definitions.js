// Micro-desafios: validadores puros sobre o estado derivado + simulação.
// Os textos usam os nomes do modelo aberto: o desafio vale para qualquer assunto.
// check(ctx) → { done, progress ∈ [0,1], live? }   ctx = { s, d, sim, v }
import { pct, num } from '../util.js';
import { vocab } from '../vocab.js';
import { mulberry32 } from '../math/rng.js';

const lab = (s, i) => s.chain.states[i]?.label ?? '?';

export const context = (s) => ({ s, d: s.derived, sim: s.simulation, v: vocab(s.chain) });

const seedOf = (text) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.codePointAt(0)) | 0, 7);

/** Embaralha de forma estável: a mesma pergunta mantém a ordem das opções entre redesenhos. */
function shuffled(list, seed) {
  const rand = mulberry32(seed);
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Duas alternativas erradas, nunca com o mesmo texto da certa nem entre si. */
function distinctDistractors(right, candidates) {
  const used = new Set([pct(right)]);
  return candidates
    .filter(({ value }) => {
      if (used.has(pct(value))) return false;
      used.add(pct(value));
      return true;
    })
    .slice(0, 2);
}

/** Texto de desafio pode ser fixo ou depender do modelo. */
export const say = (x, ctx) => (typeof x === 'function' ? x(ctx) : x);

export const CHALLENGES = [
  // ───────── Nível 1 ─────────
  {
    id: 'memoryless',
    level: 1,
    title: 'O futuro só olha para o presente',
    type: 'quiz',
    desc: ({ v }) => `Antes estava em ${v.lab(0)} e agora está em ${v.lab(1)}. Qual a chance de estar em ${v.lab(0)} 1 ${v.step} depois?`,
    hints: [
      'Releia as regras ao lado: alguma delas pergunta sobre o passado?',
      ({ v }) => `Só a regra de quem está em ${v.lab(1)} importa.`,
    ],
    quiz(ctx) {
      const P = ctx.d.effective;
      const { lab } = ctx.v;
      const right = P[1][0];
      const wrong = distinctDistractors(right, [
        { value: (right + P[0][0]) / 2, why: 'Isso mistura o passado com o presente, como se a cadeia tivesse memória. Ela não tem.' },
        { value: P[0][0], why: `Essa é a regra de quem está em ${lab(0)}. Mas agora está em ${lab(1)}.` },
        { value: P[1][1], why: `Essa é a chance de continuar em ${lab(1)}, não a de ir para ${lab(0)}.` },
        ...[0.5, 0.25, 0.75, 1, 0].map((value) => ({ value, why: `Não é isso que diz a regra de quem está em ${lab(1)}. Confira ao lado.` })),
      ]);
      const numeric = [{ value: right, correct: true }, ...wrong];
      return {
        options: [
          ...shuffled(numeric, seedOf(`${lab(0)}|${lab(1)}|${pct(right)}`)).map(({ value, correct = false, why }) => ({ label: pct(value), correct, why })),
          { label: 'Depende do histórico', correct: false, why: 'Numa cadeia de Markov o histórico não entra na conta: o estado atual basta.' },
        ],
      };
    },
    success: 'Propriedade de Markov: a chance do próximo estado depende só do estado atual. O passado não entra na conta.',
  },
  {
    id: 'run-sim',
    level: 1,
    title: 'De uma para a multidão',
    desc: ({ v }) => `Coloque pelo menos 100 ${v.units} e rode 15 ${v.steps}. Cada um dos sorteios é imprevisível, mas os potes se estabilizam.`,
    hints: [
      ({ v }) => `Use o controle “${v.Units}” na barra embaixo do diagrama.`,
      ({ v }) => `Aperte “Rodar simulação” e espere o contador de ${v.steps} chegar a 15.`,
    ],
    check({ sim, v }) {
      const enough = sim.particleCount >= 100 && sim.status !== 'idle';
      return {
        done: enough && sim.tick >= 15,
        progress: enough ? Math.min(1, sim.tick / 15) : 0.1,
        live: enough ? `${v.step} ${sim.tick} de 15` : `${v.units} agora: ${sim.particleCount} (precisa de 100 ou mais)`,
      };
    },
    success: 'Um sorteio sozinho é imprevisível; a multidão não. O nível de cada pote para na linha tracejada: o equilíbrio π.',
  },
  {
    id: 'three-quarters',
    level: 1,
    title: 'Três quartos do tempo',
    desc: ({ v }) => `Ajuste as duas regras para que, no longo prazo, ${v.lab(1)} ocupe 75% do tempo (com margem de 1,5%).`,
    hints: [
      ({ v }) => `π(${v.lab(1)}) = P(${v.lab(0)}→${v.lab(1)}) ÷ [P(${v.lab(0)}→${v.lab(1)}) + P(${v.lab(1)}→${v.lab(0)})].`,
      ({ v }) => `Quem está em ${v.lab(1)} precisa sair três vezes menos do que quem está em ${v.lab(0)}.`,
      ({ v }) => `Exemplo: continuar em ${v.lab(0)} com 70% e continuar em ${v.lab(1)} com 90%.`,
    ],
    check({ d, v }) {
      if (!d.stationary) return { done: false, progress: 0 };
      const x = d.stationary[1];
      const err = Math.abs(x - 0.75);
      return { done: err <= 0.015, progress: Math.max(0, 1 - err / 0.75), live: `${v.lab(1)} no longo prazo: ${pct(x)} · alvo 75%` };
    },
    success: 'No equilíbrio, o que sai de um estado para o outro é igual ao que volta: π₁·P₁₂ = π₂·P₂₁. Quem sai menos acumula mais.',
  },

  // ───────── Nível 2 ─────────
  {
    id: 'black-hole',
    level: 2,
    title: 'Crie um buraco negro',
    desc: 'Transforme um estado em absorvente (P(i,i) = 1) que possa ser alcançado a partir de todos os outros.',
    hints: [
      'Escolha um estado e zere as saídas dele, menos a que volta para ele mesmo.',
      'Confira se todos os outros têm algum caminho de setas até ele.',
      'Rode a simulação: quem entra nunca mais sai.',
    ],
    check({ d, s }) {
      const n = d.n;
      let best = 0, bestI = -1;
      for (const a of d.absorbing) {
        const c = d.reach.filter((row) => row[a]).length / n;
        if (c > best) [best, bestI] = [c, a];
      }
      if (bestI < 0) {
        const maxSelf = Math.max(...d.effective.map((r, i) => r[i]));
        return { done: false, progress: maxSelf * 0.5, live: `maior chance de ficar parado: ${pct(maxSelf)}` };
      }
      return { done: best === 1, progress: 0.5 + best * 0.5, live: `${lab(s, bestI)} é absorvente · ${Math.round(best * n)} de ${n} estados chegam nele` };
    },
    success: 'Com um absorvente que todos alcançam, tudo termina nele com probabilidade 1. O equilíbrio é esse pote cheio e os outros vazios.',
  },
  {
    id: 'broken-clock',
    level: 2,
    title: 'Relógio quebrado',
    desc: 'Crie uma cadeia irredutível e periódica (período 2 ou mais). Depois rode: os potes andam em ondas e não param.',
    hints: [
      'Qualquer chance de ficar parado (diagonal maior que 0) quebra o ritmo: zere a diagonal.',
      ({ v }) => `Tente um ciclo: ${v.lab(0)} → ${v.lab(1)} → ${v.lab(2)} → ${v.lab(0)}, com 1 em cada seta.`,
    ],
    check({ d }) {
      const per = d.isIrreducible ? d.period : null;
      const diagZero = d.effective.filter((r, i) => r[i] < 1e-9).length / d.n;
      return {
        done: !!per && per >= 2,
        progress: d.isIrreducible ? 0.4 + diagZero * 0.5 : diagZero * 0.4,
        live: d.isIrreducible ? `período agora: ${per}` : 'ainda há estados que não se alcançam',
      };
    },
    success: 'Com período d, só dá para voltar a um estado em múltiplos de d passos. π existe, mas μ₀Pᵗ fica girando em vez de convergir.',
  },
  {
    id: 'democracy',
    level: 2,
    title: 'Equilíbrio democrático',
    desc: 'Faça π = (⅓, ⅓, ⅓) com uma matriz que NÃO seja simétrica e em que todos se alcancem.',
    hints: [
      'Olhe as colunas: o que acontece se elas também somarem 1?',
      'Isso se chama matriz duplamente estocástica: linhas e colunas somam 1.',
      'Exemplo: (0,5 0,5 0), (0 0,5 0,5), (0,5 0 0,5).',
    ],
    check({ d }) {
      if (!d.stationary) return { done: false, progress: 0 };
      const err = Math.max(...d.stationary.map((x) => Math.abs(x - 1 / d.n)));
      return {
        done: err < 0.01 && !d.isSymmetric && d.isIrreducible,
        progress: Math.max(0, 1 - err * 3) * (d.isSymmetric ? 0.8 : 1),
        live: `maior distância de ⅓: ${num(err, 3)}${d.isSymmetric ? ' · simétrica não vale' : ''}`,
      };
    },
    success: 'Se as colunas também somam 1, cada estado recebe exatamente o que doa. Por isso a divisão por igual é estacionária.',
  },

  // ───────── Nível 3 ─────────
  {
    id: 'own-model',
    level: 3,
    title: 'Traga o seu problema',
    desc: 'Crie um modelo seu em “Modelar meu problema”, ou renomeie e adicione estados neste aqui.',
    hints: [
      'Pense em algo que muda de situação com o tempo: clientes, alunos, peças, pacientes, um jogo.',
      'Se você tem um histórico de dados, cole em “Tenho dados”: as chances saem da contagem.',
    ],
    check({ s, d }) {
      const c = s.chain.meta.custom;
      return { done: !!c && d.allRowsOk, progress: c ? 0.9 : 0.1, live: c ? 'modelo seu: falta deixar todas as linhas somando 1' : 'ainda é um modelo pronto da galeria' };
    },
    success: 'Agora é o seu modelo. Use “Perguntar ao modelo” para ver o que ele prevê e o Diagnóstico para entender como ele se comporta.',
  },
  {
    id: 'stationary-hunt',
    level: 3,
    title: 'Ache o equilíbrio sem olhar',
    desc: 'π está escondida. Numa cadeia ergódica, escolha “Começam → do meu jeito” e ajuste μ₀ até os potes não mudarem mais de nível.',
    hidePi: true,
    hints: [
      'Abra um modelo ergódico (Fidelidade a marcas, por exemplo) e escolha “Começam → do meu jeito (μ₀)”.',
      'Se a curva tracejada de um estado sobe, ele começou com pouco; se desce, com muito.',
      'No equilíbrio, cada estado recebe o mesmo que doa: Σᵢ πᵢPᵢⱼ = πⱼ.',
    ],
    check({ d, sim }) {
      if (!d.isErgodic) return { done: false, progress: 0.05, live: 'a cadeia precisa ser ergódica: todos se alcançam, sem ritmo fixo' };
      if (sim.initialDistribution !== 'custom') return { done: false, progress: 0.15, live: 'escolha “Começam → do meu jeito (μ₀)”' };
      const n = d.n;
      const c = sim.customDist && sim.customDist.length === n ? sim.customDist : new Array(n).fill(1);
      const sum = c.reduce((a, b) => a + b, 0) || 1;
      const err = Math.max(...c.map((x, i) => Math.abs(x / sum - d.stationary[i])));
      const temp = err < 0.03 ? 'acertou' : err < 0.06 ? 'muito quente' : err < 0.12 ? 'quente' : err < 0.25 ? 'frio' : 'gelado';
      return { done: err < 0.03, progress: Math.max(0.15, 1 - err * 2.5), live: `${temp} · maior erro ${num(err, 3)}`, heat: 1 - Math.min(1, err * 4) };
    },
    success: 'π é o ponto fixo de P: πP = π. Começando nela, nada muda: os sorteios continuam, mas os fluxos se cancelam.',
  },
  {
    id: 'islands',
    level: 3,
    title: 'Ilhas isoladas',
    desc: 'Monte uma cadeia com pelo menos duas classes fechadas: grupos de estados de onde não se sai.',
    hints: [
      'Divida os estados em dois grupos sem nenhuma seta entre eles.',
      'Ou crie dois estados absorventes: cada um já é uma classe fechada.',
      'Bônus: um estado de partida que pode cair em qualquer uma das ilhas.',
    ],
    check({ d }) {
      const k = d.classes.filter((c) => c.closed).length;
      return { done: k >= 2, progress: Math.min(1, k / 2) * 0.9 + 0.05, live: `classes fechadas agora: ${k}` };
    },
    success: 'Com várias classes fechadas não existe π única. O destino depende do começo: veja a tabela “Para onde vão”.',
  },
  {
    id: 'slow-fall',
    level: 3,
    title: 'Queda em câmera lenta',
    desc: 'Crie estados transitórios que levem, em média, 10 passos ou mais até a absorção (partindo de algum deles).',
    hints: [
      'Você precisa de pelo menos um estado absorvente e de estados que levem até ele.',
      'Chances altas de ficar parado nos transitórios atrasam a queda.',
      'O tempo médio é N·1, com N = (I − Q)⁻¹.',
    ],
    check({ d, s, v }) {
      if (!d.absorption) return { done: false, progress: 0.05, live: 'ainda não há estados transitórios caindo numa classe fechada' };
      const t = d.absorption.expectedSteps;
      const mx = Math.max(...t);
      const who = d.absorption.transient[t.indexOf(mx)];
      return { done: mx >= 10, progress: Math.min(1, mx / 10), live: `maior tempo médio: ${num(mx, 1)} ${v.steps}, saindo de ${lab(s, who)}` };
    },
    success: 'A matriz fundamental N = (I − Q)⁻¹ conta quantas vezes, em média, cada transitório é visitado antes da absorção.',
  },
];

export const byId = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));
export const forLevel = (lvl) => CHALLENGES.filter((c) => c.level === lvl);

export function activeChallenge(s) {
  const id = s.challenges.active[s.meta.level];
  return byId[id] || forLevel(s.meta.level)[0];
}

/** π fica oculta enquanto o desafio de encontrá-la está ativo e não foi revelada. */
export function isPiHidden(s) {
  const c = activeChallenge(s);
  return !!c?.hidePi && !s.challenges.completed.includes(c.id) && !s.challenges.revealed[c.id];
}
