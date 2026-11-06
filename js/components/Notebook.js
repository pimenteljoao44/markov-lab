// Caderno de teoria: tudo que os balões explicam, reunido e sempre com os nomes do modelo aberto.
import { escapeHtml, renderTex } from '../util.js';
import { TOPICS, TIPS } from '../coach/tips.js';
import { tipContent } from '../coach/Coach.js';

export class Notebook {
  constructor(coach) {
    this.coach = coach;
    this.dlg = document.createElement('dialog');
    this.dlg.className = 'notebook';
    this.dlg.setAttribute('aria-labelledby', 'nb-title');
    document.body.appendChild(this.dlg);
    this.dlg.addEventListener('click', (e) => {
      if (e.target === this.dlg || e.target.closest('[data-close]')) this.dlg.close();
      if (e.target.closest('[data-reset]')) {
        this.dlg.close();
        coach.reset();
      }
    });
    this.dlg.addEventListener('change', (e) => {
      if (e.target.matches('[data-toggle]')) {
        coach.setEnabled(e.target.checked);
        document.getElementById('coach-toggle').checked = e.target.checked;
      }
    });
    this.dlg.addEventListener('input', (e) => {
      if (e.target.matches('[data-filter]')) this.filter(e.target.value);
    });
    this.dlg.addEventListener('toggle', (e) => {
      const d = e.target;
      if (d.tagName !== 'DETAILS' || !d.open || !d.dataset.id) return;
      this.fill(d);
      coach.markSeen(d.dataset.id);
      d.querySelector('summary .nb-check').textContent = '✓';
      this.refreshCount();
    }, true);
  }

  open() {
    const { coach } = this;
    this.dlg.innerHTML = `
      <header class="nb-head">
        <div><h2 id="nb-title">Caderno de teoria</h2><p data-count></p></div>
        <button type="button" class="dlg-x" data-close aria-label="Fechar caderno">×</button>
      </header>
      <div class="nb-tools">
        <input type="search" class="field" data-filter placeholder="Procurar um conceito" aria-label="Procurar um conceito">
        <label class="switch"><input type="checkbox" data-toggle ${coach.enabled ? 'checked' : ''}><span>Mostrar balões enquanto uso</span></label>
        <button type="button" class="text-btn" data-reset>Rever balões do começo</button>
      </div>
      <div class="nb-list">${TOPICS.map((topic) => this.section(topic)).join('')}</div>`;
    this.refreshCount();
    this.dlg.showModal();
    this.dlg.querySelector('[data-close]').focus();
  }

  section(topic) {
    const items = Object.entries(TIPS).filter(([, t]) => t.topic === topic);
    return `<section data-topic><h3>${escapeHtml(topic)}</h3>${items
      .map(([id]) => {
        const { title } = tipContent(id);
        return `<details data-id="${id}" data-text="${escapeHtml(title.toLowerCase())}">
          <summary><span class="nb-check" aria-hidden="true">${this.coach.seen.has(id) ? '✓' : ''}</span>${title}</summary>
          <div class="nb-body"></div></details>`;
      })
      .join('')}</section>`;
  }

  fill(d) {
    const box = d.querySelector('.nb-body');
    if (box.childElementCount) return;
    const { body, math } = tipContent(d.dataset.id);
    box.innerHTML = `${body}${math ? `<div class="nb-math">${math}</div>` : ''}`;
    renderTex(box);
  }

  filter(q) {
    const term = q.trim().toLowerCase();
    this.dlg.querySelectorAll('[data-topic]').forEach((sec) => {
      let any = false;
      sec.querySelectorAll('details').forEach((d) => {
        this.fill(d);
        const hit = !term || d.dataset.text.includes(term) || d.textContent.toLowerCase().includes(term);
        d.hidden = !hit;
        any = any || hit;
      });
      sec.hidden = !any;
    });
  }

  refreshCount() {
    const { seen, total } = this.coach.seenCount();
    const el = this.dlg.querySelector('[data-count]');
    if (el) el.textContent = `Você já viu ${seen} de ${total} conceitos.`;
  }
}
