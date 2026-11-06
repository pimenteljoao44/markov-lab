// "Perguntar ao modelo": as respostas que levam alguém a construir um modelo, em linguagem do problema.
import { subscribe, getState } from '../store.js';
import { escapeHtml, num, pct } from '../util.js';
import { vocab } from '../vocab.js';
import { LEVELS } from '../levels/index.js';
import { distributionAfter, hittingStats } from '../math/query.js';
import { helpDot } from '../coach/api.js';

const options = (states, sel) =>
  states.map((st, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${escapeHtml(st.label)}</option>`).join('');

export class AskPanel {
  constructor(el) {
    this.el = el;
    this.key = '';
    this.from = 0;
    this.n = 6;
    this.a = 0;
    this.b = 1;
    el.addEventListener('input', (e) => {
      if (e.target.matches('[data-pn-n]')) {
        this.n = +e.target.value;
        this.refresh(getState());
      }
    });
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-pn-from]')) this.from = +e.target.value;
      if (e.target.matches('[data-hit-a]')) this.a = +e.target.value;
      if (e.target.matches('[data-hit-b]')) this.b = +e.target.value;
      this.refresh(getState());
    });
    subscribe((s, t) => {
      if (t.has('derived') || t.has('level') || t.has('structure')) this.render(s);
    });
  }

  render(s) {
    const show = LEVELS[s.meta.level].features.ask;
    this.el.hidden = !show;
    if (!show) return;
    const n = s.chain.states.length;
    const v = vocab(s.chain);
    const key = [n, v.steps, v.step, ...s.chain.states.map((x) => x.id + x.label)].join('|');
    if (key !== this.key) {
      this.key = key;
      if (this.from >= n) this.from = 0;
      if (this.a >= n) this.a = 0;
      if (this.b >= n) this.b = Math.min(1, n - 1);
      this.build(s, v);
    }
    this.refresh(s);
  }

  build(s, v) {
    const S = s.chain.states;
    this.el.innerHTML = `
      <header class="card-head"><h2>Perguntar ao modelo</h2></header>
      <p class="card-sub" data-question></p>
      <div class="ask" data-q="pn">
        <h3>Onde estará depois de um tempo? ${helpDot('ask-pn', 'Explicar esta conta')}</h3>
        <div class="ask-row">
          <label>Saindo de <select class="field" data-pn-from aria-label="Estado de partida">${options(S, this.from)}</select></label>
          <label class="ask-n">depois de <b data-pn-out></b>
            <input type="range" min="0" max="60" step="1" value="${this.n}" data-pn-n aria-label="Quantidade de ${escapeHtml(v.steps)}">
          </label>
        </div>
        <div class="pi-bars" data-pn-bars></div>
      </div>
      <div class="ask" data-q="hit">
        <h3>Quanto tempo até chegar? ${helpDot('ask-hit', 'Explicar esta conta')}</h3>
        <div class="ask-row">
          <label>De <select class="field" data-hit-a aria-label="Estado de partida">${options(S, this.a)}</select></label>
          <label>até <select class="field" data-hit-b aria-label="Estado de destino">${options(S, this.b)}</select></label>
        </div>
        <p class="ask-answer" data-hit-out aria-live="polite"></p>
      </div>`;
  }

  refresh(s) {
    if (this.el.hidden || !this.el.querySelector('[data-pn-bars]')) return;
    const v = vocab(s.chain);
    const P = s.derived.effective;
    const S = s.chain.states;

    const qEl = this.el.querySelector('[data-question]');
    qEl.textContent = v.question ? `A pergunta deste modelo: ${v.question}` : 'Respostas exatas, sem sorteio, a partir da matriz.';

    this.el.querySelector('[data-pn-out]').textContent = `${this.n} ${this.n === 1 ? v.step : v.steps}`;
    const mu = distributionAfter(P, this.from, this.n);
    this.el.querySelector('[data-pn-bars]').innerHTML = S.map(
      (st, i) => `<div class="pi-row"><span class="lab"><i class="dot" style="background:${st.color}"></i>${escapeHtml(st.label)}</span>
        <div class="pi-bar"><div class="pi-fill" style="width:${(mu[i] * 100).toFixed(1)}%;background:${st.color}"></div></div>
        <span class="pi-val">${pct(mu[i], 0)}</span></div>`
    ).join('');

    const out = this.el.querySelector('[data-hit-out]');
    out.innerHTML = this.hittingText(P, v, S);
  }

  hittingText(P, v, S) {
    const { a, b } = this;
    const h = hittingStats(P, b);
    const steps = escapeHtml(v.steps);
    const dest = `<b>${escapeHtml(S[b].label)}</b>`;
    if (a === b) {
      if (h.returnProb >= 1 - 1e-9) return `Quem sai de ${dest} volta, em média, em <mark>${num(h.returnMean, 1)} ${steps}</mark>.`;
      if (h.returnProb <= 1e-9) return `Quem sai de ${dest} <mark>nunca volta</mark>.`;
      return `Quem sai de ${dest} volta com <mark>${pct(h.returnProb, 0)}</mark> de chance; nos outros casos, nunca mais volta.`;
    }
    const prob = h.prob[a];
    if (prob <= 1e-9) return `De ${escapeHtml(S[a].label)} <mark>não existe caminho</mark> até ${dest}.`;
    if (prob >= 1 - 1e-9) return `Chega sempre, e leva em média <mark>${num(h.mean[a], 1)} ${steps}</mark>.`;
    return `Chega em ${dest} com <mark>${pct(prob, 0)}</mark> de chance. Nos outros ${pct(1 - prob, 0)}, nunca chega: o tempo médio não existe aqui.`;
  }
}
