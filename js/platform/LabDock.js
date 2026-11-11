// Dock de desafios de um laboratório: progresso ao vivo, dicas graduais, quiz e celebração.
// Mesmo desenho do dock do Laboratório de Markov, sem depender do estado de lá: funciona com
// qualquer store criado por tinyStore.js que guarde { challenges: { completed, active, hints } }.
import { escapeHtml, keepFocus } from '../util.js';
import { toast, burst } from '../components/Toast.js';

const say = (x, ctx) => (typeof x === 'function' ? x(ctx) : x);

export class LabDock {
  /** challenges: lista com { id, title, desc, hints, success, type?, quiz?, check? }; context(s) → ctx dos validadores. */
  constructor(el, { store, challenges, context, color = 'var(--lv2)', colorInk = 'var(--lv2-ink)', onComplete }) {
    Object.assign(this, { el, store, challenges, context, color, colorInk, onComplete });
    this.renderedId = null;
    el.addEventListener('click', (e) => this.onClick(e));
    store.subscribe((s, t) => {
      if (t.has('challenge') || this.renderedId === null) this.render(s);
      else this.evaluate(s);
    });
  }

  active(s) {
    const { completed, active } = s.challenges;
    return this.challenges.find((c) => c.id === active) || this.challenges.find((c) => !completed.includes(c.id)) || this.challenges[0];
  }

  render(s) {
    const c = this.active(s);
    const list = this.challenges;
    const done = s.challenges.completed.includes(c.id);
    const hintsShown = s.challenges.hints[c.id] || 0;
    const idx = list.indexOf(c);
    const ctx = this.context(s);
    this.renderedId = c.id;

    let quiz = '';
    if (c.type === 'quiz' && !done) {
      this.quiz = c.quiz(ctx);
      quiz = `<div class="quiz-opts">${this.quiz.options.map((o, k) => `<button type="button" data-quiz="${k}">${escapeHtml(o.label)}</button>`).join('')}</div>`;
    }

    keepFocus(this.el, () => {
      this.el.innerHTML = `
      <div class="dock-inner rise">
        <div class="ch-num ${done ? 'done' : ''}" style="--c:${this.color};--c-ink:${this.colorInk}" aria-hidden="true">${done ? '✓' : idx + 1}</div>
        <div class="ch-body">
          <div class="ch-title"><h3>${escapeHtml(c.title)}</h3><span class="ch-tag">desafio ${idx + 1} de ${list.length}${done ? ' · concluído' : ''}</span></div>
          <p class="ch-desc">${escapeHtml(say(done ? c.success : c.desc, ctx))}</p>
          ${quiz}
          <div class="ch-explain" data-explain></div>
          ${c.type !== 'quiz' && !done ? `<div class="ch-meta"><div class="ch-progress"><div class="ch-fill"></div></div><span class="ch-live" data-live></span></div>` : ''}
          <div class="ch-hint">${c.hints.slice(0, hintsShown).map((h, k) => `<p><b>Dica ${k + 1}:</b> ${escapeHtml(say(h, ctx))}</p>`).join('')}</div>
        </div>
        <div class="ch-actions">
          <div class="ch-dots">${list
            .map((x) => `<button type="button" class="ch-dot ${s.challenges.completed.includes(x.id) ? 'done' : ''} ${x === c ? 'active' : ''}" data-go="${x.id}" title="${escapeHtml(x.title)}" aria-label="Ir para o desafio: ${escapeHtml(x.title)}"></button>`)
            .join('')}</div>
          ${!done && hintsShown < c.hints.length ? `<button type="button" class="btn btn-sm btn-quiet" data-hint>Ver dica (${hintsShown + 1} de ${c.hints.length})</button>` : ''}
          <button type="button" class="btn btn-sm btn-quiet" data-nav="-1" ${idx <= 0 ? 'disabled' : ''} aria-label="Desafio anterior">‹</button>
          <button type="button" class="btn btn-sm ${done ? 'btn-primary' : 'btn-quiet'}" data-nav="1" ${idx >= list.length - 1 ? 'disabled' : ''}>${done ? 'Próximo desafio' : 'Pular'}</button>
        </div>
      </div>`;
    });
    this.evaluate(s);
  }

  evaluate(s) {
    const c = this.active(s);
    if (c.id !== this.renderedId || c.type === 'quiz' || s.challenges.completed.includes(c.id)) return;
    const res = c.check(this.context(s));
    const fill = this.el.querySelector('.ch-fill');
    const live = this.el.querySelector('[data-live]');
    if (fill) {
      fill.style.width = `${Math.round(Math.min(1, res.progress) * 100)}%`;
      // Desafios de "quente/frio" viram termômetro: azul longe, vermelho perto.
      fill.style.background = res.heat === undefined ? '' : `hsl(${Math.round(222 - 222 * res.heat)} 78% 52%)`;
    }
    if (live) live.textContent = res.live || '';
    if (res.done) this.complete(c);
  }

  complete(c) {
    if (this.store.get().challenges.completed.includes(c.id)) return;
    const r = this.el.querySelector('.ch-num')?.getBoundingClientRect();
    // Fica no desafio concluído até a pessoa pedir o próximo: é onde aparece a explicação do que ela acabou de ver.
    this.store.update((s) => {
      s.challenges.completed.push(c.id);
      s.challenges.active = c.id;
    }, 'challenge');
    if (r) burst(r.left + r.width / 2, r.top + r.height / 2);
    toast(`Desafio concluído: ${c.title}`, { type: 'ok', sub: say(c.success, this.context(this.store.get())), timeout: 8000 });
    this.onComplete?.(c);
  }

  go(id) {
    this.store.update((s) => (s.challenges.active = id), 'challenge');
  }

  onClick(e) {
    const s = this.store.get();
    const c = this.active(s);
    if (e.target.closest('[data-hint]')) {
      this.store.update((st) => (st.challenges.hints[c.id] = (st.challenges.hints[c.id] || 0) + 1), 'challenge');
      return;
    }
    const nav = e.target.closest('[data-nav]');
    if (nav) {
      const next = this.challenges[this.challenges.indexOf(c) + +nav.dataset.nav];
      if (next) this.go(next.id);
      return;
    }
    const dot = e.target.closest('[data-go]');
    if (dot) {
      this.go(dot.dataset.go);
      return;
    }
    const q = e.target.closest('[data-quiz]');
    if (q && this.quiz) {
      const opt = this.quiz.options[+q.dataset.quiz];
      if (opt.correct) {
        q.classList.add('right');
        this.complete(c);
      } else {
        q.classList.remove('wrong');
        void q.offsetWidth; // reinicia a animação de "errado" a cada clique
        q.classList.add('wrong');
        this.el.querySelector('[data-explain]').textContent = opt.why;
      }
    }
  }
}
