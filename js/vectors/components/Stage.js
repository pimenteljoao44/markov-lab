// Os dois "papéis" do laboratório: o plano com as setas e, no modo Busca, o ranking dos textos.
import { escapeHtml, num, keepFocus } from '../../util.js';
import { METRICS } from '../engine.js';
import { Plane } from './Plane.js';

const help = (tip, label) => `<button type="button" class="q" data-tip="${tip}" aria-label="${label}">?</button>`;

const MODES = [
  ['pair', 'Duas setas'],
  ['search', 'Busca'],
];

const seg = (name, options, current, label) => `<div class="seg" role="group" aria-label="${label}">${options
  .map(([id, text]) => `<button type="button" data-${name}="${id}" class="${id === current ? 'active' : ''}" aria-pressed="${id === current}">${escapeHtml(text)}</button>`)
  .join('')}</div>`;

/** Barra de 0 a 100: cosseno de −1 a 1; produto escalar em relação ao maior; distância, o inverso do quão longe. */
function barWidth(rank, metric, all) {
  const { score } = rank;
  if (metric === 'cosine') return ((score + 1) / 2) * 100;
  if (metric === 'dot') {
    const max = Math.max(...all.map((x) => x.score), 1e-9);
    return Math.max(0, score / max) * 100;
  }
  const max = Math.max(...all.map((x) => x.score), 1e-9);
  return (1 - score / max) * 100;
}

const scoreText = (metric, score) => (metric === 'cosine' ? num(score, 2) : num(score, 1));

export class Stage {
  /** els: { plane, rank } são as duas folhas; handlers: { onMode, onMetric, onMove }. */
  constructor(els, store, { onMode, onMetric, onMove }) {
    this.els = els;
    this.mode = null;
    this.metric = null;
    els.plane.innerHTML = `
      <div class="vs-head"><h3 data-title></h3>${seg('mode', MODES, 'pair', 'Modo do laboratório')}</div>
      <p class="card-sub" data-hint></p>
      <div class="plane-wrap"><svg class="plane" role="group" aria-label="Plano com as setas"></svg></div>`;
    this.plane = new Plane(els.plane.querySelector('svg'), { onMove });
    this.title = els.plane.querySelector('[data-title]');
    this.hint = els.plane.querySelector('[data-hint]');
    els.plane.addEventListener('click', (e) => {
      const mode = e.target.closest('[data-mode]');
      if (mode) onMode(mode.dataset.mode);
    });
    els.rank.innerHTML = `
      <div class="vs-head"><h3>Busca por significado ${help('busca', 'Explicar a busca por significado')}</h3>
        ${seg('metric', Object.entries(METRICS).map(([id, m]) => [id, m.label]), 'cosine', 'Medida de semelhança')}</div>
      <p class="card-sub" data-verdict></p>
      <ol class="vr-list" data-rows></ol>`;
    els.rank.addEventListener('click', (e) => {
      const metric = e.target.closest('[data-metric]');
      if (metric) onMetric(metric.dataset.metric);
    });
    store.subscribe((s) => this.render(s));
  }

  render(s) {
    const search = s.mode === 'search';
    const { plane, rank } = this.els;
    this.title.textContent = search ? 'Onde a consulta Q aponta' : 'Duas setas no plano';
    this.hint.textContent = search
      ? 'Arraste a ponta de Q. Os números são os textos da lista ao lado, cada um com a seta que o representa.'
      : 'Arraste as pontas de A e B, ou foque uma ponta e use as setas do teclado. Os números ao lado mudam junto.';
    for (const b of plane.querySelectorAll('[data-mode]')) {
      const on = b.dataset.mode === s.mode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    }
    this.plane.update(s);
    rank.hidden = !search;
    if (search) this.renderRank(s);
  }

  renderRank(s) {
    const { rank } = this.els;
    const d = s.derived;
    for (const b of rank.querySelectorAll('[data-metric]')) {
      const on = b.dataset.metric === s.metric;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    }
    const { cosine: c, dot: p, distance: e } = d.tops;
    const verdict = d.queryZero
      ? '<b>A consulta está na origem.</b> Uma seta sem tamanho não aponta para lugar nenhum, então nenhum texto é mais parecido que outro.'
      : d.disagree
        ? `<b>Os métodos discordam.</b> Pelo cosseno vence “${escapeHtml(c.text)}”; pelo produto escalar, “${escapeHtml(p.text)}”: ele premia o vetor mais comprido.`
        : `Cosseno e produto escalar escolhem o mesmo texto: “${escapeHtml(c.text)}”. ${e.id === c.id ? '' : `A distância prefere “${escapeHtml(e.text)}”.`}`;
    rank.querySelector('[data-verdict]').innerHTML = verdict;
    const rows = d.rank
      .map((r) => `<li class="vr-row ${r.rank === 1 && !d.queryZero ? 'top' : ''}">
        <span class="vr-n" aria-label="texto ${r.index + 1}">${r.index + 1}</span>
        <span class="vr-text">${escapeHtml(r.text)}</span>
        <span class="vr-score">${scoreText(s.metric, r.score)}</span>
        <span class="vr-bar" aria-hidden="true"><i style="width:${barWidth(r, s.metric, d.rank).toFixed(1)}%"></i></span></li>`)
      .join('');
    keepFocus(rank.querySelector('[data-rows]'), () => {
      rank.querySelector('[data-rows]').innerHTML = rows;
    });
  }
}
