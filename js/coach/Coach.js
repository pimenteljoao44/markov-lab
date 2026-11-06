// Balões de explicação. Nunca bloqueiam a tela: aparecem ao lado do que explicam,
// um de cada vez, e não se repetem depois de vistos. Os botões "?" funcionam sempre.
import { getState, subscribe } from '../store.js';
import { htmlVocab } from '../vocab.js';
import { renderTex } from '../util.js';
import { TIPS, notebookTips } from './tips.js';
import { TOURS, snapshot, checkEvents, dwellTip } from './triggers.js';

const KEY = 'markovlab:coach';
const GAP = 14;
const EDGE = 10;

const titleOf = (tip, v, s, o) => (typeof tip.title === 'function' ? tip.title(v, s, o) : tip.title);

/** Conteúdo pronto de um balão, para reaproveitar no Caderno de teoria. */
export function tipContent(id, opts = {}) {
  const tip = TIPS[id];
  const s = getState();
  const o = { ...tip.demo?.(s), ...opts };
  const v = htmlVocab(s.chain);
  return { title: titleOf(tip, v, s, o), body: tip.body(v, s, o), math: tip.math?.(v, s, o) || '', o };
}

export class Coach {
  constructor({ onSeenChange } = {}) {
    const saved = this.load();
    this.enabled = saved.enabled !== false;
    this.seen = new Set(saved.seen || []);
    this.onSeenChange = onSeenChange;
    this.queue = [];
    this.current = null;
    this.prev = snapshot(getState());
    this.lastPos = '';

    this.el = document.createElement('div');
    this.el.className = 'balloon';
    this.el.hidden = true;
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');
    this.el.innerHTML = `
      <i class="b-tail" aria-hidden="true"></i>
      <header><h3 class="b-title"></h3><button type="button" class="b-x" aria-label="Fechar balão">×</button></header>
      <div class="b-body"></div>
      <details class="b-math"><summary>Ver a matemática</summary><div class="b-math-body"></div></details>
      <footer>
        <button type="button" class="btn btn-sm btn-primary b-ok">Entendi</button>
        <button type="button" class="b-skip">Pular explicações</button>
      </footer>`;
    document.body.appendChild(this.el);
    this.q = (sel) => this.el.querySelector(sel);

    this.q('.b-ok').addEventListener('click', () => this.dismiss());
    this.q('.b-x').addEventListener('click', () => this.dismiss());
    this.q('.b-skip').addEventListener('click', () => {
      this.queue = [];
      this.dismiss();
    });
    this.q('.b-math').addEventListener('toggle', () => this.place(true));

    this.bindHelpDots();
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.current && !document.querySelector('dialog[open]')) this.dismiss();
    });
    // Explicação pedida na hora some ao clicar em outro lugar; as demais esperam o "Entendi".
    document.addEventListener('click', (e) => {
      if (this.current?.source !== 'demand') return;
      if (e.target.closest('.balloon, [data-tip], g.node, .edge .hit')) return;
      this.dismiss();
    });
    window.addEventListener('resize', () => this.place(true));

    subscribe((s, t) => this.onChange(s, t));
  }

  load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch {
      return {};
    }
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ enabled: this.enabled, seen: [...this.seen] }));
    } catch {
      /* armazenamento indisponível */
    }
  }

  // ── API ──────────────────────────────────────────────

  /** A pessoa pediu: mostra agora, mesmo que já tenha visto ou que os balões estejam desligados. */
  show(id, opts = {}) {
    if (!TIPS[id]) return;
    clearTimeout(this.nextTimer);
    this.open(id, { ...opts, source: opts.source || 'demand' });
  }

  /** Algo aconteceu: só aparece se estiver ligado e ainda não tiver sido visto. */
  fire(id, opts = {}) {
    if (!this.enabled || !TIPS[id]) return;
    if (!opts.always && this.seen.has(id)) return;
    if (this.current?.id === id || this.queue.some((q) => q.id === id)) return;
    this.queue.push({ id, opts: { ...opts, source: 'event' } });
    this.pump();
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) {
      this.queue = [];
      if (this.current && this.current.source !== 'demand') this.dismiss();
    }
    this.save();
  }

  /** Faz os balões aparecerem de novo, do começo. */
  reset() {
    this.seen.clear();
    this.save();
    this.onSeenChange?.();
    this.startTour(getState());
  }

  seenCount() {
    const list = notebookTips();
    return { seen: list.filter(([id]) => this.seen.has(id)).length, total: list.length };
  }

  markSeen(id) {
    if (this.seen.has(id)) return;
    this.seen.add(id);
    this.save();
    this.onSeenChange?.();
  }

  // ── Eventos da aplicação ─────────────────────────────

  onChange(s, t) {
    if (t.has('level')) {
      this.clear();
      this.prev = snapshot(s);
      clearTimeout(this.tourTimer);
      this.tourTimer = setTimeout(() => this.startTour(getState()), 900);
      return;
    }
    if (t.has('model')) {
      clearTimeout(this.tourTimer);
      this.clear();
      this.prev = snapshot(s);
      this.fire('model-loaded', { always: true });
      if (s.chain.meta.custom) this.fire('model-ready');
      return;
    }
    if (t.has('hover')) this.onHover(s);
    if (t.has('derived') || t.has('sim')) {
      checkEvents(s, this.prev, (id, opts) => this.fire(id, opts));
      this.prev = snapshot(s);
      if (this.current) this.refreshBody();
    }
  }

  startTour(s) {
    if (!this.enabled) return;
    (TOURS[s.meta.level] || []).forEach((id) => this.fire(id));
  }

  onHover(s) {
    clearTimeout(this.dwellTimer);
    const h = s.ui.hover;
    if (!h || !this.enabled || this.current) return;
    this.dwellTimer = setTimeout(() => {
      const st = getState();
      if (st.ui.hover !== h || this.current) return;
      const pick = dwellTip(h, st.meta.level);
      if (pick) this.fire(pick[0], pick[1]);
    }, 800);
  }

  // ── Fila ─────────────────────────────────────────────

  clear() {
    this.queue = [];
    clearTimeout(this.nextTimer);
    this.close();
  }

  pump() {
    if (this.current) return;
    clearTimeout(this.nextTimer);
    this.nextTimer = setTimeout(() => this.next(), 350);
  }

  next() {
    if (this.current) return;
    while (this.queue.length) {
      const item = this.queue.shift();
      if (item.opts.still && !item.opts.still(getState())) continue;
      this.open(item.id, item.opts);
      return;
    }
  }

  dismiss() {
    this.close();
    if (this.queue.length) this.pump();
  }

  close() {
    this.current = null;
    this.el.hidden = true;
    this.spot(null);
    cancelAnimationFrame(this.raf);
  }

  /** Marca com o marca-texto o elemento da página de que o balão está falando. */
  spot(el) {
    if (this.spotted === el) return;
    this.spotted?.classList.remove('coach-spot');
    this.spotted = el;
    el?.classList.add('coach-spot');
  }

  // ── Balão ────────────────────────────────────────────

  open(id, opts) {
    const tip = TIPS[id];
    const s = getState();
    const content = tipContent(id, opts);
    this.current = { id, tip, opts: content.o, source: opts.source, place: opts.place || tip.place, anchor: opts.anchor, fromDot: opts.fromDot, hover: opts.hover };
    this.q('.b-title').innerHTML = content.title;
    this.q('.b-body').innerHTML = content.body;
    const math = this.q('.b-math');
    math.hidden = !content.math;
    math.open = false;
    this.q('.b-math-body').innerHTML = content.math;
    renderTex(this.el);

    const more = this.queue.length;
    this.q('.b-ok').textContent = more ? `Próximo (${more})` : 'Entendi';
    this.q('.b-skip').hidden = !more;
    this.el.hidden = false;
    this.el.classList.remove('b-pop');
    void this.el.offsetWidth;
    this.el.classList.add('b-pop');

    this.markSeen(id);

    const a = this.resolve(s);
    if (a && a.closest?.('.side') && !opts.fromDot) a.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    this.lastPos = '';
    this.place(true);
    this.follow();
  }

  /** Atualiza valores vivos ("Agora: 43%") sem fechar o balão. */
  refreshBody() {
    const { id, opts } = this.current;
    if (id !== 'jar-info' && id !== 'edge-info') return;
    const n = getState().derived.n;
    if (opts.i >= n || (opts.j ?? 0) >= n) {
      this.close();
      return;
    }
    this.q('.b-body').innerHTML = tipContent(id, opts).body;
  }

  resolve(s) {
    const c = this.current;
    if (!c) return null;
    let spec = c.anchor || c.tip.anchor;
    if (typeof spec === 'function') spec = spec(s, c.opts);
    if (spec instanceof Element) {
      if (spec.isConnected) return spec;
      spec = c.fromDot ? `[data-tip="${c.id}"]` : null;
      if (!spec) return null;
    }
    if (!spec) return null;
    const m = /^(jar|edge|cell|rowsum|rowh|col):(.+)$/.exec(spec);
    if (!m) return document.querySelector(spec);
    const [i, j] = m[2].split('-');
    switch (m[1]) {
      case 'jar':
        return document.querySelector(`g.node[data-i="${i}"] .rim`);
      case 'edge':
        return document.querySelector(`.elabel[data-edge="${i}-${j}"] rect`) || document.querySelector(`g.node[data-i="${i}"] .rim`);
      case 'cell':
        return document.querySelector(`td.cell[data-i="${i}"][data-j="${j}"]`) || document.querySelector('#panel-matrix');
      case 'rowsum':
        return document.querySelector(`tr[data-row="${i}"] .gauge`) || document.querySelector('#panel-matrix');
      case 'rowh':
        return document.querySelector(`[data-rowh="${i}"]`) || document.querySelector('#panel-matrix');
      case 'col':
        return document.querySelector(`[data-col="${i}"]`) || document.querySelector('#panel-matrix');
      default:
        return null;
    }
  }

  /** Acompanha o alvo: potes se movem quando são arrastados. */
  follow() {
    cancelAnimationFrame(this.raf);
    const tick = () => {
      if (!this.current) return;
      this.place();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  place(force = false) {
    if (!this.current) return;
    const el = this.el;
    if (window.matchMedia('(max-width: 720px)').matches) {
      el.style.left = el.style.top = '';
      el.dataset.place = 'sheet';
      return;
    }
    const a = this.resolve(getState());
    this.spot(a && !(a instanceof SVGElement) && !this.current.fromDot ? a : null);
    const r = a?.getBoundingClientRect();
    const key = r ? `${r.left | 0},${r.top | 0},${r.width | 0},${r.height | 0},${el.offsetHeight}` : 'none';
    if (!force && key === this.lastPos) return;
    this.lastPos = key;

    const bw = el.offsetWidth, bh = el.offsetHeight;
    const W = window.innerWidth, H = window.innerHeight;
    const tail = this.q('.b-tail');
    if (!r || (!r.width && !r.height)) {
      el.style.left = `${Math.max(EDGE, (W - bw) / 2)}px`;
      el.style.top = `${Math.max(EDGE, (H - bh) / 2)}px`;
      el.dataset.place = 'none';
      return;
    }

    const room = { right: W - r.right, left: r.left, bottom: H - r.bottom, top: r.top };
    const need = { right: bw + GAP + EDGE, left: bw + GAP + EDGE, bottom: bh + GAP + EDGE, top: bh + GAP + EDGE };
    const order = [this.current.place, 'right', 'left', 'bottom', 'top'].filter(Boolean);
    const side = order.find((p) => room[p] >= need[p]) || Object.keys(room).sort((p, q) => room[q] - room[p])[0];

    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    // Alvos no painel lateral: o balão fica fora do painel, para não cobrir o que se está editando.
    const panel = a.closest?.('.side')?.getBoundingClientRect();
    let x, y;
    if (side === 'right') [x, y] = [r.right + GAP, cy - bh / 2];
    else if (side === 'left') [x, y] = [(panel ? panel.left : r.left) - GAP - bw, cy - bh / 2];
    else if (side === 'bottom') [x, y] = [cx - bw / 2, r.bottom + GAP];
    else [x, y] = [cx - bw / 2, r.top - GAP - bh];
    x = Math.min(Math.max(EDGE, x), W - bw - EDGE);
    y = Math.min(Math.max(EDGE, y), H - bh - EDGE);

    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(y)}px`;
    el.dataset.place = side;
    if (side === 'left' || side === 'right') {
      tail.style.top = `${Math.min(Math.max(16, cy - y), bh - 16)}px`;
      tail.style.left = '';
    } else {
      tail.style.left = `${Math.min(Math.max(16, cx - x), bw - 16)}px`;
      tail.style.top = '';
    }
  }

  // ── Botões "?" ───────────────────────────────────────

  bindHelpDots() {
    let openTimer, closeTimer;
    const openFrom = (dot, hover) => {
      const o = { anchor: dot, fromDot: true, hover };
      if (dot.dataset.i !== undefined) o.i = +dot.dataset.i;
      this.show(dot.dataset.tip, o);
    };
    const closeSoon = () => {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        if (this.current?.hover) this.dismiss();
      }, 320);
    };
    document.addEventListener('click', (e) => {
      const dot = e.target.closest('[data-tip]');
      if (!dot) return;
      e.preventDefault();
      e.stopPropagation();
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
      openFrom(dot, false);
      if (e.detail === 0) this.q('.b-ok').focus(); // aberto pelo teclado
    }, true);
    document.addEventListener('mouseover', (e) => {
      const dot = e.target.closest('[data-tip]');
      if (!dot) return;
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
      if (this.current && !this.current.hover) return; // não atropela o que a pessoa está lendo
      openTimer = setTimeout(() => openFrom(dot, true), 280);
    });
    document.addEventListener('mouseout', (e) => {
      if (!e.target.closest('[data-tip]')) return;
      clearTimeout(openTimer);
      closeSoon();
    });
    this.el.addEventListener('mouseenter', () => clearTimeout(closeTimer));
    this.el.addEventListener('mouseleave', closeSoon);
  }
}
