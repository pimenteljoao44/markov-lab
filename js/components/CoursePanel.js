// Janela de aulas: a trilha para assistir antes de praticar, com o progresso de cada etapa.
// Nenhum vídeo é pedido ao YouTube antes de a pessoa clicar em assistir.
import { escapeHtml } from '../util.js';
import { COURSE, VIDEOS, MOMENTS, embedUrl, watchUrl, essentialTime } from '../learn/course.js';

const KEY = 'markovlab:course';

function loadDone() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return new Set(Array.isArray(saved?.done) ? saved.done : []);
  } catch {
    return new Set();
  }
}

export class CoursePanel {
  /** onPractice({ level, challenge, model, wizard }) leva ao lugar certo do app. */
  constructor({ onPractice, onProgress }) {
    this.onPractice = onPractice;
    this.onProgress = onProgress;
    this.done = loadDone();
    this.dlg = document.createElement('dialog');
    this.dlg.className = 'studio course';
    this.dlg.setAttribute('aria-labelledby', 'course-title');
    document.body.appendChild(this.dlg);

    let pressedOutside = false;
    this.dlg.addEventListener('mousedown', (e) => {
      pressedOutside = e.target === this.dlg;
    });
    this.dlg.addEventListener('click', (e) => this.onClick(e, pressedOutside));
    this.dlg.addEventListener('change', (e) => {
      if (e.target.matches('[data-done]')) this.setDone(e.target.dataset.done, e.target.checked);
    });
    // Fechar a janela também para o vídeo: o som não pode continuar sem ninguém ver.
    this.dlg.addEventListener('close', () => this.stop());
  }

  progress() {
    return { done: COURSE.filter((stage) => this.done.has(stage.id)).length, total: COURSE.length };
  }

  setDone(id, on) {
    if (on) this.done.add(id);
    else this.done.delete(id);
    try {
      localStorage.setItem(KEY, JSON.stringify({ done: [...this.done] }));
    } catch {
      /* armazenamento indisponível */
    }
    this.renderCount();
    this.onProgress?.();
  }

  renderCount() {
    const { done, total } = this.progress();
    const el = this.dlg.querySelector('[data-course-count]');
    if (el) el.textContent = `${done} de ${total} etapas concluídas.`;
  }

  /** Abre a trilha; opcionalmente vai direto a uma etapa ou começa a tocar um trecho de aula. */
  open({ stage, moment } = {}) {
    this.dlg.innerHTML = `
      <header class="dlg-head"><h2 id="course-title">Aulas</h2><button type="button" class="dlg-x" data-close aria-label="Fechar aulas">×</button></header>
      <p class="dlg-sub">Assista na ordem e pratique no app ao fim de cada etapa. O essencial soma ${essentialTime()}. <span data-course-count></span></p>
      <div class="dlg-body">
        <div class="cs-player" data-player hidden></div>
        <ol class="cs-stages">${COURSE.map((s, i) => this.stageHtml(s, i)).join('')}</ol>
        <p class="wz-tip">As aulas são gratuitas e ficam no YouTube: a página só fala com o YouTube quando você clica para assistir.</p>
      </div>`;
    this.renderCount();
    if (!this.dlg.open) this.dlg.showModal();
    if (moment && MOMENTS[moment]) this.play(MOMENTS[moment].v, MOMENTS[moment].at);
    else if (stage) this.dlg.querySelector(`[data-stage="${stage}"]`)?.scrollIntoView({ block: 'start' });
  }

  stageHtml(stage, index) {
    const checked = this.done.has(stage.id) ? 'checked' : '';
    return `<li class="cs-stage" data-stage="${stage.id}">
      <h3><span class="cs-num">${index + 1}</span>${escapeHtml(stage.title)}</h3>
      <p class="cs-goal">${escapeHtml(stage.goal)}</p>
      <ul class="cs-videos">${stage.watch.map((v) => this.videoHtml(v, '0:00')).join('')}</ul>
      <details class="cs-more"><summary>Para aprofundar</summary>
        <ul class="cs-videos">${stage.deeper.map((d) => this.videoHtml(d.v, d.at, d.what)).join('')}</ul>
      </details>
      <div class="cs-actions">
        ${stage.practice.map((p, k) => `<button type="button" class="btn btn-sm" data-practice="${stage.id}:${k}">${escapeHtml(p.label)}</button>`).join('')}
        <label class="cs-check"><input type="checkbox" data-done="${stage.id}" ${checked}> Concluí esta etapa</label>
      </div>
    </li>`;
  }

  videoHtml(v, at, what) {
    const video = VIDEOS[v];
    const from = at === '0:00' ? video.length : `a partir de ${at}, aula de ${video.length}`;
    const title = what || video.title;
    return `<li class="cs-video">
      <button type="button" class="cs-play" data-play="${v}" data-at="${at}" aria-label="Assistir: ${escapeHtml(title)}">▶</button>
      <div class="cs-info"><b>${escapeHtml(title)}</b>
        <small>${what ? `${escapeHtml(video.title)} · ` : ''}${escapeHtml(video.author)} · ${from}</small>
        ${video.note ? `<small>${escapeHtml(video.note)}</small>` : ''}
      </div>
      <a class="cs-link" href="${watchUrl(v, at)}" target="_blank" rel="noopener">Abrir no YouTube</a>
    </li>`;
  }

  play(v, at) {
    const box = this.dlg.querySelector('[data-player]');
    box.hidden = false;
    box.innerHTML = `<iframe src="${embedUrl(v, at)}" title="${escapeHtml(VIDEOS[v].title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
      <div class="cs-player-foot"><span>${escapeHtml(VIDEOS[v].title)}</span><button type="button" class="text-btn" data-stop>Fechar vídeo</button></div>`;
    this.dlg.querySelector('.dlg-body').scrollTop = 0;
  }

  stop() {
    const box = this.dlg.querySelector('[data-player]');
    if (!box) return;
    box.hidden = true;
    box.innerHTML = '';
  }

  onClick(e, pressedOutside) {
    if (e.target.closest('[data-close]') || (e.target === this.dlg && pressedOutside)) {
      this.dlg.close();
      return;
    }
    const play = e.target.closest('[data-play]');
    if (play) {
      this.play(play.dataset.play, play.dataset.at);
      return;
    }
    if (e.target.closest('[data-stop]')) {
      this.stop();
      return;
    }
    const practice = e.target.closest('[data-practice]');
    if (practice) {
      const [id, k] = practice.dataset.practice.split(':');
      const target = COURSE.find((s) => s.id === id).practice[+k];
      this.dlg.close();
      this.onPractice?.(target);
    }
  }
}
