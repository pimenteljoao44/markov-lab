// Abas de fichário (os três níveis, em ordem) e a faixa com a lição do nível atual.
import { subscribe, getState } from '../store.js';
import { LEVELS } from '../levels/index.js';
import { forLevel } from '../challenges/definitions.js';
import { htmlVocab } from '../vocab.js';
import { keepFocus } from '../util.js';
import { STAGE_FOR_LEVEL } from '../learn/course.js';

export class StoryNav {
  constructor(navEl, lessonEl, xpEl, { onSelect, onCourse }) {
    this.nav = navEl;
    this.lesson = lessonEl;
    this.xp = xpEl;
    this.collapsed = {};
    navEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-level]');
      if (b) onSelect(+b.dataset.level);
    });
    lessonEl.addEventListener('click', (e) => {
      const lesson = e.target.closest('[data-course]');
      if (lesson) onCourse(lesson.dataset.course);
      if (!e.target.closest('.lesson-toggle')) return;
      const { level } = getState().meta;
      this.collapsed[level] = !this.collapsed[level];
      this.renderLesson(getState());
    });
    subscribe((s, t) => {
      if (t.has('level') || t.has('challenge')) this.renderTabs(s);
      if (t.has('level') || t.has('structure')) this.renderLesson(s);
    });
  }

  renderTabs(s) {
    const done = s.challenges.completed;
    const tabs = [1, 2, 3]
      .map((n) => {
        const L = LEVELS[n];
        const list = forLevel(n);
        const got = list.filter((c) => done.includes(c.id)).length;
        const cleared = list.length && got === list.length;
        return `<button class="tab ${s.meta.level === n ? 'active' : ''} ${cleared ? 'cleared' : ''}" data-level="${n}" ${s.meta.level === n ? 'aria-current="page"' : ''}>
          <span class="tab-num">${n}</span>
          <span class="tab-txt"><span class="tab-name">${L.title}</span><span class="tab-sub" title="${got} de ${list.length} desafios concluídos">${L.sub} · ${got}/${list.length}</span></span>
        </button>`;
      })
      .join('');
    keepFocus(this.nav, () => {
      this.nav.innerHTML = tabs;
    });
    const total = [1, 2, 3].reduce((a, n) => a + forLevel(n).length, 0);
    this.xp.innerHTML = `<b>${done.length}</b> de ${total} desafios`;
  }

  renderLesson(s) {
    const L = LEVELS[s.meta.level];
    const col = !!this.collapsed[s.meta.level];
    this.lesson.classList.toggle('collapsed', col);
    keepFocus(this.lesson, () => {
      this.lesson.innerHTML = `
      <h2>${L.heading}</h2>
      ${col ? '' : `<p>${L.story(htmlVocab(s.chain))} <button type="button" class="text-btn inline" data-course="${STAGE_FOR_LEVEL[s.meta.level]}">▶ Ver a aula antes de praticar</button></p>`}
      <button type="button" class="lesson-toggle" aria-expanded="${!col}">${col ? 'mostrar' : 'esconder'}</button>`;
    });
  }
}
