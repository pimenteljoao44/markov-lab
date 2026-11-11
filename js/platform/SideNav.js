// Índice dos painéis laterais de um laboratório. A coluna é mais alta que a tela, e sem ele
// quem chega não descobre o que existe abaixo do primeiro painel.
import { escapeHtml, keepFocus } from '../util.js';

const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export class SideNav {
  /**
   * side: a coluna (`.side`). items: [{ id, label }] na ordem em que os painéis aparecem.
   * `label` pode ser uma função, para o nome que muda com o estado do laboratório.
   */
  constructor(side, items) {
    Object.assign(this, { side, items });
    this.current = null;
    this.frame = 0;
    this.nav = document.createElement('nav');
    this.nav.className = 'side-nav';
    this.nav.setAttribute('aria-label', 'Ir para um painel');
    side.prepend(this.nav);
    this.nav.addEventListener('click', (e) => {
      const button = e.target.closest('[data-panel]');
      if (button) this.go(button.dataset.panel);
    });
    // Em tela larga quem rola é a coluna; em tela estreita, a página inteira.
    const onScroll = () => this.schedule();
    side.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    this.refresh();
  }

  panels() {
    return this.items.map((item) => ({ ...item, el: document.getElementById(item.id) })).filter((item) => item.el && !item.el.hidden);
  }

  /** Redesenha os botões: painéis aparecem, somem e mudam de nome conforme o laboratório. */
  refresh() {
    const html = this.panels()
      .map((item) => `<button type="button" data-panel="${item.id}">${escapeHtml(typeof item.label === 'function' ? item.label() : item.label)}</button>`)
      .join('');
    keepFocus(this.nav, () => {
      this.nav.innerHTML = html;
    });
    this.current = null;
    this.spy();
  }

  go(id) {
    const el = document.getElementById(id);
    el.scrollIntoView({ block: 'start', behavior: calm() ? 'auto' : 'smooth' });
    // O foco vai junto: quem usa teclado continua a partir do painel, não do índice.
    el.tabIndex = -1;
    el.focus({ preventScroll: true });
  }

  schedule() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.spy();
    });
  }

  /** Marca no índice o painel que está no alto da área visível. */
  spy() {
    const panels = this.panels();
    if (!panels.length) return;
    const line = this.nav.getBoundingClientRect().bottom + 24;
    let active = panels[0];
    for (const panel of panels) if (panel.el.getBoundingClientRect().top <= line) active = panel;
    // No fim da rolagem o último painel pode nunca alcançar o alto: mesmo assim é ele que está à vista.
    const { side } = this;
    const scrolls = side.scrollHeight > side.clientHeight + 1;
    if (scrolls && side.scrollTop + side.clientHeight >= side.scrollHeight - 2) active = panels[panels.length - 1];
    if (active.id === this.current) return;
    this.current = active.id;
    for (const button of this.nav.querySelectorAll('[data-panel]')) {
      if (button.dataset.panel === active.id) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
  }
}
