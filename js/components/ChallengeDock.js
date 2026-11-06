// Dock de micro-desafios: progresso ao vivo ("quente/frio"), dicas graduais, quiz e celebração.
import { subscribe, update, getState } from '../store.js';
import { escapeHtml, keepFocus } from '../util.js';
import { forLevel, activeChallenge, byId, context, say } from '../challenges/definitions.js';
import { toast, burst } from './Toast.js';

export class ChallengeDock {
  constructor(el, { onComplete } = {}) {
    this.el = el;
    this.onComplete = onComplete;
    this.renderedId = null;
    el.addEventListener('click', (e) => this.onClick(e));
    subscribe((s, t) => {
      // Quiz e textos citam os nomes e os números do modelo: mudou o modelo, reescreve.
      const stale = t.has('structure') || (t.has('derived') && activeChallenge(s)?.type === 'quiz');
      if (t.has('level') || t.has('challenge') || stale) this.render(s);
      if (t.has('derived') || t.has('sim') || t.has('level') || t.has('challenge')) this.evaluate(s);
    });
  }

  render(s) {
    const c = activeChallenge(s);
    const list = forLevel(s.meta.level);
    if (!c) {
      this.el.innerHTML = '';
      return;
    }
    const done = s.challenges.completed.includes(c.id);
    const hintsShown = s.challenges.hints[c.id] || 0;
    const hints = c.hints.slice(0, hintsShown);
    const idx = list.indexOf(c);
    this.renderedId = c.id;
    const ctx = context(s);

    let quiz = '';
    if (c.type === 'quiz' && !done) {
      const q = c.quiz(ctx);
      this.quiz = q;
      quiz = `<div class="quiz-opts">${q.options.map((o, k) => `<button data-quiz="${k}">${escapeHtml(o.label)}</button>`).join('')}</div>`;
    }

    keepFocus(this.el, () => {
      this.el.innerHTML = `
      <div class="dock-inner rise">
        <div class="ch-num ${done ? 'done' : ''}" style="--c:var(--lv${s.meta.level});--c-ink:var(--lv${s.meta.level}-ink)" aria-hidden="true">${done ? '✓' : idx + 1}</div>
        <div class="ch-body">
          <div class="ch-title"><h3>${escapeHtml(c.title)}</h3><span class="ch-tag">desafio ${idx + 1} de ${list.length}${done ? ' · concluído' : ''}</span></div>
          <p class="ch-desc">${escapeHtml(say(done ? c.success : c.desc, ctx))}</p>
          ${quiz}
          <div class="ch-explain" data-explain></div>
          ${
            c.type !== 'quiz' && !done
              ? `<div class="ch-meta"><div class="ch-progress"><div class="ch-fill"></div></div><span class="ch-live" data-live></span></div>`
              : ''
          }
          <div class="ch-hint">${hints.map((h, k) => `<p><b>Dica ${k + 1}:</b> ${escapeHtml(say(h, ctx))}</p>`).join('')}</div>
        </div>
        <div class="ch-actions">
          <div class="ch-dots">${list
            .map((x) => `<button class="ch-dot ${s.challenges.completed.includes(x.id) ? 'done' : ''} ${x === c ? 'active' : ''}" data-go="${x.id}" title="${escapeHtml(x.title)}"></button>`)
            .join('')}</div>
          ${!done && hintsShown < c.hints.length ? `<button class="btn btn-sm btn-quiet" data-hint>Ver dica (${hintsShown + 1} de ${c.hints.length})</button>` : ''}
          <button class="btn btn-sm btn-quiet" data-nav="-1" ${idx <= 0 ? 'disabled' : ''} aria-label="Desafio anterior">‹</button>
          <button class="btn btn-sm ${done ? 'btn-primary' : 'btn-quiet'}" data-nav="1" ${idx >= list.length - 1 ? 'disabled' : ''}>${done ? 'Próximo desafio' : 'Pular'}</button>
        </div>
      </div>`;
    });
    this.evaluate(s);
  }

  evaluate(s) {
    const c = activeChallenge(s);
    if (!c || c.id !== this.renderedId || c.type === 'quiz') return;
    if (s.challenges.completed.includes(c.id)) return;
    const res = c.check(context(s));
    const fill = this.el.querySelector('.ch-fill');
    const live = this.el.querySelector('[data-live]');
    const gated = !s.derived.allRowsOk;
    if (fill) {
      fill.style.width = `${Math.round(Math.min(1, res.progress) * 100)}%`;
      // Desafios de "quente/frio" viram termômetro: azul longe, vermelho perto.
      fill.style.background = res.heat === undefined ? '' : `hsl(${Math.round(222 - 222 * res.heat)} 78% 52%)`;
    }
    if (live) live.textContent = gated ? 'deixe todas as linhas da matriz somando 1 para validar' : res.live || '';
    if (res.done && !gated) this.complete(c);
  }

  complete(c) {
    if (getState().challenges.completed.includes(c.id)) return;
    update((s) => s.challenges.completed.push(c.id), 'challenge');
    const r = this.el.querySelector('.ch-num')?.getBoundingClientRect();
    if (r) burst(r.left + r.width / 2, r.top + r.height / 2);
    toast(`Desafio concluído: ${c.title}`, { type: 'ok', sub: say(c.success, context(getState())), timeout: 6500 });
    this.onComplete?.(c);
  }

  onClick(e) {
    const s = getState();
    const c = activeChallenge(s);
    const list = forLevel(s.meta.level);
    if (e.target.closest('[data-hint]')) {
      update((st) => (st.challenges.hints[c.id] = (st.challenges.hints[c.id] || 0) + 1), 'challenge');
      return;
    }
    const nav = e.target.closest('[data-nav]');
    if (nav) {
      const next = list[list.indexOf(c) + +nav.dataset.nav];
      if (next) update((st) => (st.challenges.active[st.meta.level] = next.id), 'challenge');
      return;
    }
    const go = e.target.closest('[data-go]');
    if (go && byId[go.dataset.go]) {
      update((st) => (st.challenges.active[st.meta.level] = go.dataset.go), 'challenge');
      return;
    }
    const q = e.target.closest('[data-quiz]');
    if (q && this.quiz) {
      const opt = this.quiz.options[+q.dataset.quiz];
      const explain = this.el.querySelector('[data-explain]');
      if (opt.correct) {
        q.classList.add('right');
        this.complete(c);
      } else {
        q.classList.remove('wrong');
        void q.offsetWidth;
        q.classList.add('wrong');
        explain.textContent = opt.why;
      }
    }
  }
}
