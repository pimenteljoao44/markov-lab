// Caderno de teoria de um laboratório: os conceitos reunidos por assunto, sempre com os números do modelo aberto.
// É a versão sem balões do Caderno do Laboratório de Markov: recebe o catálogo e funciona com qualquer laboratório.
import { escapeHtml, renderTex } from '../util.js';

export class LabNotebook {
  /**
   * topics: ordem dos assuntos; tips: { id: { topic, title, body(ctx), math?(ctx) } };
   * context(): o estado atual, entregue a body e math; key: onde guardar o que já foi lido.
   */
  constructor({ topics, tips, context, key, onSeenChange }) {
    Object.assign(this, { topics, tips, context, key, onSeenChange });
    this.seen = this.load();
    this.dlg = document.createElement('dialog');
    this.dlg.className = 'notebook';
    this.dlg.setAttribute('aria-labelledby', 'nb-title');
    document.body.appendChild(this.dlg);
    this.dlg.addEventListener('click', (e) => {
      if (e.target === this.dlg || e.target.closest('[data-close]')) this.dlg.close();
    });
    this.dlg.addEventListener('input', (e) => {
      if (e.target.matches('[data-filter]')) this.filter(e.target.value);
    });
    this.dlg.addEventListener('toggle', (e) => {
      const d = e.target;
      if (d.tagName !== 'DETAILS' || !d.open || !d.dataset.id) return;
      this.fill(d);
      this.markSeen(d.dataset.id);
      d.querySelector('summary .nb-check').textContent = '✓';
      this.refreshCount();
    }, true);
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.key));
      return new Set(Array.isArray(saved?.seen) ? saved.seen.filter((id) => this.tips[id]) : []);
    } catch {
      return new Set();
    }
  }

  markSeen(id) {
    if (this.seen.has(id)) return;
    this.seen.add(id);
    try {
      localStorage.setItem(this.key, JSON.stringify({ seen: [...this.seen] }));
    } catch {
      /* armazenamento indisponível */
    }
    this.onSeenChange?.();
  }

  seenCount() {
    return { seen: this.seen.size, total: Object.keys(this.tips).length };
  }

  /** Abre o caderno; com `id`, já mostra aquele conceito aberto. */
  open(id) {
    this.dlg.innerHTML = `
      <header class="nb-head">
        <div><h2 id="nb-title">Caderno de teoria</h2><p data-count></p></div>
        <button type="button" class="dlg-x" data-close aria-label="Fechar caderno">×</button>
      </header>
      <div class="nb-tools">
        <input type="search" class="field" data-filter placeholder="Procurar um conceito" aria-label="Procurar um conceito">
      </div>
      <div class="nb-list">${this.topics.map((topic) => this.section(topic)).join('')}</div>`;
    this.refreshCount();
    if (!this.dlg.open) this.dlg.showModal();
    const target = id && this.dlg.querySelector(`details[data-id="${id}"]`);
    if (target) {
      target.open = true;
      target.scrollIntoView({ block: 'center' });
      target.querySelector('summary').focus({ preventScroll: true });
    } else {
      this.dlg.querySelector('[data-close]').focus();
    }
  }

  section(topic) {
    const items = Object.entries(this.tips).filter(([, tip]) => tip.topic === topic);
    return `<section><h3>${escapeHtml(topic)}</h3>${items
      .map(([id, tip]) => `<details data-id="${id}"><summary><span class="nb-check">${this.seen.has(id) ? '✓' : ''}</span>${escapeHtml(tip.title)}</summary><div class="nb-body"></div></details>`)
      .join('')}</section>`;
  }

  /** O texto só é montado ao abrir: ele cita números que mudam enquanto a pessoa mexe. */
  fill(details) {
    const tip = this.tips[details.dataset.id];
    const ctx = this.context();
    const body = details.querySelector('.nb-body');
    body.innerHTML = `${tip.body(ctx)}${tip.math ? `<div class="nb-math">${tip.math(ctx)}</div>` : ''}`;
    renderTex(body);
  }

  filter(text) {
    const q = text.trim().toLowerCase();
    for (const d of this.dlg.querySelectorAll('details')) d.hidden = !!q && !d.querySelector('summary').textContent.toLowerCase().includes(q);
    for (const s of this.dlg.querySelectorAll('.nb-list section')) s.hidden = ![...s.querySelectorAll('details')].some((d) => !d.hidden);
  }

  refreshCount() {
    const { seen, total } = this.seenCount();
    const el = this.dlg.querySelector('[data-count]');
    if (el) el.textContent = `${seen} de ${total} conceitos lidos. Os números citados são os do modelo aberto agora.`;
  }
}
