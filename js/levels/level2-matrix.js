import { buildModel } from '../models/catalog.js';

export const level2 = {
  id: 2,
  title: 'Matriz',
  sub: '3 estados',
  heading: 'A matriz é o mapa',
  features: { matrix: true, editStates: false, ask: true },
  story: () => `Cada número da tabela é a grossura de uma seta. Mude um número e veja o diagrama responder; passe o mouse numa célula para ver a seta dela.`,
  chain: () => buildModel('marcas'),
  theory() {
    return `
      <p>A distribuição anda multiplicando pela matriz: cada linha espalha o conteúdo de um pote pelos outros.</p>
      <span class="tex" data-display data-tex="\\mu_{t+1} = \\mu_t P \\quad\\Rightarrow\\quad \\mu_t = \\mu_0 P^t"></span>
      <p>Saindo de i, é preciso ir para algum lugar: as chances de todos os destinos fecham 100%.</p>
      <span class="tex" data-display data-tex="\\sum_j P_{ij} = 1 \\quad \\text{para todo } i"></span>
      <p>As colunas não precisam somar 1: elas medem quanto cada pote <b>recebe</b>. Quando também somam 1, o equilíbrio é dividir tudo por igual.</p>`;
  },
};
