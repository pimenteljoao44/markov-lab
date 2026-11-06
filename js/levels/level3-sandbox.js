import { MAX_STATES } from '../util.js';
import { buildModel } from '../models/catalog.js';

export const level3 = {
  id: 3,
  title: 'Sandbox',
  sub: `até ${MAX_STATES} estados`,
  heading: 'Modele qualquer problema',
  features: { matrix: true, editStates: true, ask: true },
  story: () => `Crie o seu modelo em <b>Modelar meu problema</b> ou edite este. Um duplo clique no papel cria um estado.`,
  chain: () => buildModel('assinatura'),
  theory() {
    return `
      <p><b>Classificação:</b> estados que se alcançam mutuamente formam uma <b>classe comunicante</b>. Uma classe é <b>fechada</b> se nenhuma seta sai dela.</p>
      <p><b>Teorema ergódico:</b> se a cadeia é irredutível e aperiódica, existe π única com</p>
      <span class="tex" data-display data-tex="\\pi P = \\pi, \\qquad \\lim_{t\\to\\infty} P^t_{ij} = \\pi_j"></span>
      <p><b>Absorção:</b> reordenando os estados como (transitórios, fechados), P tem blocos Q e R:</p>
      <span class="tex" data-display data-tex="P=\\begin{pmatrix} Q & R \\\\ 0 & \\ast \\end{pmatrix}, \\quad N=(I-Q)^{-1}=\\sum_{k\\ge0} Q^k"></span>
      <p>N<sub>ij</sub> conta as visitas esperadas a j partindo de i. Daí B = NR (destinos) e t = N·1 (tempo até a absorção).</p>`;
  },
};
