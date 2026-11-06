import { texNum, num } from '../util.js';
import { buildModel } from '../models/catalog.js';

export const level1 = {
  id: 1,
  title: 'Intuição',
  sub: '2 estados',
  heading: 'O futuro só olha para o presente',
  features: { matrix: false, editStates: false, ask: false },
  story: (v) => `A cada ${v.step}, o próximo estado é sorteado olhando <b>só para o estado atual</b>. Troque o modelo quando quiser: a matemática vale para qualquer assunto.`,
  chain: () => buildModel('clima2'),
  theory(s) {
    const M = s.derived.effective;
    const a = M[0][1], b = M[1][0];
    const piA = a + b > 0 ? b / (a + b) : 0.5;
    return `
      <p><b>Propriedade de Markov</b>: o próximo passo depende só do estado atual.</p>
      <span class="tex" data-display data-tex="P(X_{t+1}=j \\mid X_t=i,\\, X_{t-1}, \\dots, X_0) = P(X_{t+1}=j \\mid X_t=i)"></span>
      <p>Com dois estados, o equilíbrio sai de uma conta só: o fluxo do primeiro para o segundo precisa ser igual ao fluxo de volta.</p>
      <span class="tex" data-display data-tex="\\pi_1\\cdot ${texNum(a)} = \\pi_2\\cdot ${texNum(b)} \\;\\Rightarrow\\; \\pi_1 = \\frac{${texNum(b)}}{${texNum(a)}+${texNum(b)}} = ${num(piA, 3).replace(',', '{,}')}"></span>
      <p>O início não aparece na conta: o equilíbrio não depende de como tudo começou.</p>`;
  },
};
