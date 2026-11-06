// Barra de simulação + controlador do loop (rAF) que liga ParticleEngine → store → gráficos.
import { getState, subscribe, update } from '../store.js';
import { evolve } from '../math/linalg.js';
import { randomSeed } from '../math/rng.js';
import { escapeHtml } from '../util.js';
import { vocab } from '../vocab.js';
import { helpDot } from '../coach/api.js';
import { REST } from './ParticleEngine.js';

export const COUNTS = [1, 5, 10, 25, 50, 100, 200, 300, 500, 800, 1200, 2000];
export const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 3, 5];
const HISTORY_MAX = 800;

const idsOf = (s) => s.chain.states.map((st) => st.id).join('|');

export function defaultSim(level) {
  return {
    status: 'idle',
    particleCount: level === 1 ? 1 : 300,
    speed: 1,
    stepMs: 1100,
    tick: 0,
    occupancy: [],
    history: [],
    trail: [],
    initialDistribution: level === 1 ? 'first' : 'uniform',
    customDist: null,
  };
}

export function initialDist(s) {
  const n = s.chain.states.length;
  const sim = s.simulation;
  switch (sim.initialDistribution) {
    case 'first':
      return Array.from({ length: n }, (_, i) => (i === 0 ? 1 : 0));
    case 'last':
      return Array.from({ length: n }, (_, i) => (i === n - 1 ? 1 : 0));
    case 'custom': {
      const c = sim.customDist && sim.customDist.length === n ? sim.customDist : new Array(n).fill(1);
      const sum = c.reduce((a, b) => a + b, 0) || 1;
      return c.map((v) => v / sum);
    }
    default:
      return new Array(n).fill(1 / n);
  }
}

export class SimControls {
  constructor(el, engine, layer) {
    this.el = el;
    this.engine = engine;
    this.layer = layer;
    this.progress = 0;
    this.last = performance.now();
    this.stepTarget = null;
    this.stateIds = idsOf(getState());

    el.innerHTML = `
      <div class="sim-main">
        <button class="btn btn-primary" data-act="play"><span class="ico" aria-hidden="true">▶</span><span class="txt">Rodar simulação</span></button>
        ${helpDot('run', 'Explicar a simulação')}
        <button class="btn btn-quiet" data-act="step" data-out="step-btn" title="Todos dão exatamente um passo"></button>
        <button class="btn btn-quiet" data-act="reset" title="Tira as bolinhas e zera o contador">Esvaziar</button>
      </div>
      <div class="ctl"><label for="sim-count" data-out="count-label"></label> ${helpDot('unit', 'Explicar o que cada bolinha representa')}
        <input id="sim-count" type="range" data-ctl="count" min="0" max="${COUNTS.length - 1}" step="1"><output data-out="count"></output></div>
      <div class="ctl"><label for="sim-speed">Velocidade</label> ${helpDot('speed', 'Explicar a velocidade')}
        <input id="sim-speed" type="range" data-ctl="speed" min="0" max="${SPEEDS.length - 1}" step="1"><output data-out="speed"></output></div>
      <div class="ctl"><label for="sim-init">Começam</label> ${helpDot('mu0', 'Explicar a distribuição inicial')}
        <select id="sim-init" data-ctl="init"></select><button type="button" class="btn btn-sm btn-quiet cd-open" hidden>ajustar</button></div>
      <div class="sim-tick"><span data-out="step-name"></span><b data-out="tick">0</b> ${helpDot('step', 'Explicar o que é um passo')}</div>
      <div class="trail" data-out="trail"></div>
      <div class="custom-dist" hidden></div>`;

    this.q = (sel) => el.querySelector(sel);
    this.q('[data-act="play"]').addEventListener('click', () => this.toggle());
    this.q('[data-act="step"]').addEventListener('click', () => this.stepOnce());
    this.q('[data-act="reset"]').addEventListener('click', () => this.reset());
    this.q('[data-ctl="count"]').addEventListener('input', (e) => {
      const v = COUNTS[+e.target.value];
      update((s) => (s.simulation.particleCount = v), 'ui');
      this.respawnIfActive();
      this.syncControls();
    });
    this.q('[data-ctl="speed"]').addEventListener('input', (e) => {
      update((s) => (s.simulation.speed = SPEEDS[+e.target.value]), 'ui');
      this.syncControls();
    });
    this.q('.cd-open').addEventListener('click', (e) => {
      e.preventDefault();
      this.renderCustom();
    });
    this.q('[data-ctl="init"]').addEventListener('change', (e) => {
      update((s) => {
        s.simulation.initialDistribution = e.target.value;
        if (e.target.value === 'custom' && (!s.simulation.customDist || s.simulation.customDist.length !== s.chain.states.length))
          s.simulation.customDist = new Array(s.chain.states.length).fill(1 / s.chain.states.length);
      }, 'sim');
      this.renderCustom();
      this.respawnIfActive();
    });
    document.addEventListener('click', (e) => {
      const cd = this.q('.custom-dist');
      if (!cd.hidden && !cd.contains(e.target) && !e.target.closest('[data-ctl="init"]') && !e.target.closest('.cd-open')) cd.hidden = true;
    });

    subscribe((s, t) => {
      if (t.has('structure') || t.has('level')) {
        // Outros estados significam outro modelo: as bolinhas de antes não valem mais.
        const ids = idsOf(s);
        if (ids !== this.stateIds || t.has('level') || t.has('model')) {
          this.stateIds = ids;
          this.reset();
        }
        this.syncControls();
      }
    });

    this.syncControls();
    requestAnimationFrame((now) => this.frame(now));
  }

  syncControls() {
    const s = getState();
    const sim = s.simulation;
    const ci = COUNTS.indexOf(sim.particleCount);
    this.q('[data-ctl="count"]').value = ci < 0 ? 7 : ci;
    this.q('[data-out="count"]').textContent = sim.particleCount;
    this.q('[data-ctl="speed"]').value = Math.max(0, SPEEDS.indexOf(sim.speed));
    this.q('[data-out="speed"]').textContent = `${String(sim.speed).replace('.', ',')}×`;
    const v = vocab(s.chain);
    this.q('[data-out="count-label"]').textContent = v.Units;
    this.q('[data-out="step-btn"]').textContent = `+1 ${v.step}`;
    this.q('[data-out="step-name"]').textContent = v.step;
    const first = escapeHtml(s.chain.states[0]?.label ?? '');
    const last = escapeHtml(s.chain.states[s.chain.states.length - 1]?.label ?? '');
    const sel = this.q('[data-ctl="init"]');
    sel.innerHTML = `
      <option value="uniform">em todos os estados, por igual</option>
      <option value="first">só em ${first}</option>
      <option value="last">só em ${last}</option>
      <option value="custom">do meu jeito (μ₀)…</option>`;
    sel.value = sim.initialDistribution;
    this.q('.cd-open').hidden = sim.initialDistribution !== 'custom';
    const btn = this.q('[data-act="play"]');
    const running = sim.status === 'running';
    btn.classList.toggle('running', running);
    btn.querySelector('.ico').textContent = running ? '❚❚' : '▶';
    btn.querySelector('.txt').textContent = running ? 'Pausar' : sim.status === 'paused' ? 'Continuar' : 'Rodar simulação';
    this.q('[data-out="tick"]').textContent = sim.tick;
  }

  renderCustom() {
    const s = getState();
    const box = this.q('.custom-dist');
    if (s.simulation.initialDistribution !== 'custom') {
      box.hidden = true;
      return;
    }
    const dist = initialDist(s);
    box.innerHTML =
      `<h4>Onde tudo começa (μ₀)<small>Os valores são proporções: a soma é ajustada para dar 100%.</small></h4>` +
      s.chain.states
        .map(
          (st, i) => `<div class="cd-row">
            <span class="lab"><i class="dot" style="background:${st.color}"></i>${escapeHtml(st.label)}</span>
            <input type="range" min="0" max="100" step="1" value="${Math.round(dist[i] * 100)}" data-cd="${i}">
            <output>${(dist[i] * 100).toFixed(0)}%</output></div>`
        )
        .join('') +
      `<div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn btn-sm" data-cd-close>Pronto</button></div>`;
    box.hidden = false;
    box.querySelector('[data-cd-close]').addEventListener('click', () => (box.hidden = true));
    box.querySelectorAll('[data-cd]').forEach((inp) =>
      inp.addEventListener('input', () => {
        const vals = [...box.querySelectorAll('[data-cd]')].map((x) => +x.value);
        update((st) => (st.simulation.customDist = vals), 'sim');
        const d = initialDist(getState());
        box.querySelectorAll('.cd-row output').forEach((o, k) => (o.textContent = `${(d[k] * 100).toFixed(0)}%`));
        this.respawnIfActive();
      })
    );
  }

  spawn() {
    const s = getState();
    const dist = initialDist(s);
    this.engine.reset({ count: s.simulation.particleCount, n: s.chain.states.length, dist, seed: randomSeed() });
    this.layer.clear();
    this.progress = 0;
    const occ = this.engine.occupancy();
    const c = this.engine.count;
    update((st) => {
      Object.assign(st.simulation, {
        tick: 0,
        occupancy: occ,
        history: [{ t: 0, emp: occ.map((v) => v / c), th: dist }],
        trail: c <= 3 ? [this.engine.cur[0]] : [],
      });
    }, 'sim');
    this.renderTrail();
  }

  respawnIfActive() {
    const st = getState().simulation.status;
    if (st !== 'idle') this.spawn();
  }

  toggle() {
    const sim = getState().simulation;
    if (sim.status === 'running') this.setStatus('paused');
    else {
      if (sim.status === 'idle') this.spawn();
      this.stepTarget = null;
      this.setStatus('running');
    }
  }

  stepOnce() {
    const sim = getState().simulation;
    if (sim.status === 'idle') this.spawn();
    this.stepTarget = getState().simulation.tick + 1;
    this.setStatus('running');
  }

  reset() {
    this.engine.count = 0;
    this.layer.clear();
    this.progress = 0;
    this.stepTarget = null;
    update((s) => Object.assign(s.simulation, { status: 'idle', tick: 0, occupancy: [], history: [], trail: [] }), 'sim');
    this.syncControls();
    this.renderTrail();
  }

  setStatus(status) {
    update((s) => (s.simulation.status = status), 'sim');
    this.syncControls();
  }

  frame(now) {
    const dt = Math.min(64, now - this.last);
    this.last = now;
    const s = getState();
    const sim = s.simulation;
    if (sim.status === 'running' && this.engine.count) {
      this.progress += (dt * sim.speed) / sim.stepMs;
      if (!this.engine.moving && this.progress >= REST) this.engine.sampleNext(s.derived.effective);
      if (this.progress >= 1) {
        this.engine.commit();
        this.progress = 0;
        this.record();
        if (this.stepTarget !== null && getState().simulation.tick >= this.stepTarget) {
          this.stepTarget = null;
          this.setStatus('paused');
        }
      }
    }
    this.layer.draw(this.engine, this.progress, sim.status !== 'idle');
    requestAnimationFrame((t) => this.frame(t));
  }

  record() {
    const occ = this.engine.occupancy();
    const c = this.engine.count;
    update((st) => {
      const sim = st.simulation;
      const prev = sim.history[sim.history.length - 1];
      sim.tick = this.engine.tick;
      sim.occupancy = occ;
      sim.history.push({ t: sim.tick, emp: occ.map((v) => v / c), th: evolve(prev ? prev.th : occ.map((v) => v / c), st.derived.effective) });
      if (sim.history.length > HISTORY_MAX) sim.history.shift();
      if (c <= 3) {
        sim.trail.push(this.engine.cur[0]);
        if (sim.trail.length > 14) sim.trail.shift();
      }
    }, 'sim');
    this.q('[data-out="tick"]').textContent = getState().simulation.tick;
    this.renderTrail();
  }

  renderTrail() {
    const s = getState();
    const box = this.q('[data-out="trail"]');
    const trail = s.simulation.trail;
    if (!trail.length || s.simulation.particleCount > 3) {
      box.innerHTML = '';
      return;
    }
    const chips = trail
      .map((i, k) => {
        const st = s.chain.states[i];
        if (!st) return '';
        const latest = k === trail.length - 1;
        const op = latest ? 1 : 0.25 + (0.45 * k) / trail.length;
        return `<span class="trail-chip ${latest ? 'latest' : ''}" style="opacity:${op.toFixed(2)}"><i style="background:${st.color}"></i>${escapeHtml(st.label)}</span>`;
      })
      .join('<span class="trail-arrow">→</span>');
    box.innerHTML = `<span class="trail-label">Caminho até agora: só o <b>destacado</b> decide o próximo sorteio.</span>${chips}`;
  }
}
