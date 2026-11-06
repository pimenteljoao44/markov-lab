// Ponte para os balões: qualquer componente pode pedir uma explicação sem depender do Coach.
let coach = null;

export const connectCoach = (c) => {
  coach = c;
};

/** Abre a explicação agora, a pedido da pessoa (clique ou "?"). */
export const explain = (id, opts) => coach?.show(id, opts);

/** Avisa que algo aconteceu; o balão só aparece se ainda não foi visto. */
export const notify = (id, opts) => coach?.fire(id, opts);

/** Botão "?" que abre o balão de um conceito. */
export const helpDot = (id, label = 'O que é isto?') =>
  `<button type="button" class="q" data-tip="${id}" aria-label="${label}">?</button>`;
