// Fichas laterais: as medidas com as contas à mostra, o salto do brinquedo para o embedding real
// e onde isso aparece no trabalho.
import { escapeHtml, num, keepFocus } from '../../util.js';
import { METRICS } from '../engine.js';

const help = (tip, label) => `<button type="button" class="q" data-tip="${tip}" aria-label="${label}">?</button>`;
const vec = (v) => `(${num(v[0], 1)}; ${num(v[1], 1)})`;

/** Uma frase para o cosseno atual, sem depender de a pessoa lembrar o que 0,6 quer dizer. */
export function readCosine(pair) {
  if (pair.zero) return 'Uma das setas está na origem: sem tamanho, ela não aponta para lugar nenhum, e o cosseno não faz sentido (aparece como 0).';
  const c = pair.cos;
  if (c >= 0.95) return 'Apontam quase para o mesmo lado: bem parecidos.';
  if (c >= 0.5) return 'Apontam para lados próximos: parcialmente parecidos.';
  if (c > 0.1) return 'Têm pouco em comum: apontam para lados bem diferentes.';
  if (c >= -0.1) return 'Quase perpendiculares: nada em comum.';
  if (c > -0.95) return 'Apontam para lados opostos em parte: parecem o contrário um do outro.';
  return 'Apontam para lados contrários: o contrário um do outro.';
}

const row = (label, value, tip, tipLabel) => `<div class="vm-row"><dt>${label} ${tip ? help(tip, tipLabel) : ''}</dt><dd>${value}</dd></div>`;

/** Medidas: no modo "Duas setas", as contas entre A e B; no modo "Busca", o que cada medida escolhe. */
export class MeasuresPanel {
  constructor(el, store) {
    this.el = el;
    store.subscribe((s) => this.render(s));
  }

  render(s) {
    const html = s.mode === 'search' ? this.searchHtml(s) : this.pairHtml(s);
    keepFocus(this.el, () => {
      this.el.innerHTML = html;
    });
  }

  pairHtml(s) {
    const { pair } = s.derived;
    const [ax, ay] = s.a;
    const [bx, by] = s.b;
    return `
      <div class="card-head"><h2>Medidas ${help('produto', 'Explicar o produto escalar')}</h2></div>
      <p class="card-sub">A = ${vec(s.a)} · B = ${vec(s.b)}</p>
      <dl class="vm-list">
        ${row('Produto escalar', `${num(ax, 1)} × ${num(bx, 1)} + ${num(ay, 1)} × ${num(by, 1)} = <b>${num(pair.dot, 2)}</b>`, 'produto', 'Explicar o produto escalar')}
        ${row('Tamanho de A', `<b>${num(pair.na, 2)}</b>`, 'norma', 'Explicar o tamanho de um vetor')}
        ${row('Tamanho de B', `<b>${num(pair.nb, 2)}</b>`)}
        ${row('Cosseno', pair.zero ? '<b>0</b> (sem direção)' : `${num(pair.dot, 2)} ÷ (${num(pair.na, 2)} × ${num(pair.nb, 2)}) = <b>${num(pair.cos, 2)}</b>`, 'cosseno', 'Explicar o cosseno')}
        ${row('Ângulo', pair.zero ? '—' : `<b>${num(pair.angle, 0)}°</b>`)}
      </dl>
      <p class="vm-read" aria-live="polite">${readCosine(pair)}</p>`;
  }

  searchHtml(s) {
    const d = s.derived;
    const pick = (metric, tip, tipLabel) => {
      const top = d.tops[metric];
      const value = metric === 'cosine' ? num(top.score, 2) : num(top.score, 1);
      return row(METRICS[metric].label, `${escapeHtml(top.text)} <small>${value}</small>`, tip, tipLabel);
    };
    return `
      <div class="card-head"><h2>O que cada medida escolhe ${help('busca', 'Explicar a busca por significado')}</h2></div>
      <p class="card-sub">Consulta Q = ${vec(s.q)}, de tamanho ${num(Math.hypot(...s.q), 2)}.</p>
      ${d.queryZero ? '<p class="vm-read">A consulta está na origem: nenhuma medida consegue escolher.</p>' : `<dl class="vm-list">
        ${pick('cosine', 'cosseno', 'Explicar o cosseno')}
        ${pick('dot', 'produto', 'Explicar o produto escalar')}
        ${pick('distance', 'distancia', 'Explicar a distância')}
      </dl>
      <p class="vm-read ${d.disagree ? 'differ' : ''}" aria-live="polite">${d.disagree ? 'Cosseno e produto escalar discordam: o produto escalar favorece o texto mais comprido.' : 'Cosseno e produto escalar concordam nesta consulta.'}</p>`}`;
  }
}

/** Do brinquedo ao embedding de verdade: o que muda e o que continua igual. */
export function renderEmbedPanel(el) {
  el.innerHTML = `
    <div class="card-head"><h2>Da seta ao embedding real ${help('embedding', 'Explicar o que é um embedding')}</h2></div>
    <p class="card-sub">Aqui cada texto virou <b>2 números</b>. Um modelo de embeddings de verdade usa de centenas a milhares, e ninguém dá nome às dimensões.</p>
    <p class="card-sub">A conta é a mesma, com mais termos: ${'<span class="tex" data-tex="A \\cdot B = a_1 b_1 + a_2 b_2 + \\dots + a_n b_n"></span>'}</p>
    <p class="card-sub">Quem compara textos faz o que você fez aqui: transforma em vetor e olha para onde aponta.</p>`;
}

/** Onde isso aparece no trabalho, sem prometer o que a conta não entrega. */
export function renderWorkPanel(el) {
  const items = [
    ['Achar chamados parecidos', 'pede cosseno, não palavras iguais. Dois relatos do mesmo erro quase nunca usam as mesmas palavras.'],
    ['Escolher uma busca “inteligente”', 'exige saber qual medida ela usa, se normaliza os vetores e qual o limiar mínimo para devolver um resultado.'],
    ['Medir se a busca funciona', 'pede perguntas com resposta conhecida: o primeiro resultado é o esperado? Parecido não garante correto.'],
  ];
  el.innerHTML = `
    <div class="card-head"><h2>No trabalho</h2></div>
    <dl class="work-list">${items.map(([lead, text]) => `<div><dt>${escapeHtml(lead)}</dt><dd>${escapeHtml(text)}</dd></div>`).join('')}</dl>`;
}
