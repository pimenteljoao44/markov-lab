// Janela de atalhos de teclado. A tecla "?" abre em qualquer página, e cada página diz os seus.
// Atalho que ninguém descobre não existe: por isso a lista fica à mão, no teclado e no botão do topo.
import { escapeHtml } from '../util.js';

/** "Ctrl+Z" vira duas teclas desenhadas; "Setas" e "Esc" ficam como uma tecla só. */
const keyHtml = (combo) => combo.split('+').map((key) => `<kbd>${escapeHtml(key)}</kbd>`).join('<span class="kbd-plus" aria-hidden="true">+</span>');

/** Cada atalho lista alternativas: ['Ctrl+Y', 'Ctrl+Shift+Z'] aparece como "Ctrl + Y ou Ctrl + Shift + Z". */
const rowHtml = ({ keys, what }) => `<div class="kbd-row"><dt>${keys.map(keyHtml).join('<span class="kbd-or"> ou </span>')}</dt><dd>${escapeHtml(what)}</dd></div>`;

const sectionHtml = ({ title, items }) => `<section class="kbd-section"><h3>${escapeHtml(title)}</h3><dl class="kbd-list">${items.map(rowHtml).join('')}</dl></section>`;

/**
 * sections: [{ title, items: [{ keys: ['Ctrl+Z'], what: 'Desfaz a última mudança' }] }].
 * button: o botão do topo que também abre a janela (opcional).
 */
export function initShortcuts(sections, button) {
  const dlg = document.createElement('dialog');
  dlg.className = 'studio shortcuts';
  dlg.setAttribute('aria-labelledby', 'shortcuts-title');
  document.body.appendChild(dlg);

  const common = {
    title: 'Em qualquer página',
    items: [
      { keys: ['?'], what: 'Abre esta lista' },
      { keys: ['Esc'], what: 'Fecha a janela ou o balão aberto' },
      { keys: ['Tab', 'Shift+Tab'], what: 'Vai para o próximo controle ou volta ao anterior' },
    ],
  };

  function open() {
    if (dlg.open) return;
    dlg.innerHTML = `
      <header class="dlg-head"><h2 id="shortcuts-title">Atalhos de teclado</h2><button type="button" class="dlg-x" data-close aria-label="Fechar atalhos">×</button></header>
      <div class="dlg-body">${[...sections, common].map(sectionHtml).join('')}</div>`;
    dlg.showModal();
  }

  // Só fecha se o clique começou e terminou no fundo: selecionar texto e soltar o mouse fora não conta.
  let pressedOutside = false;
  dlg.addEventListener('mousedown', (e) => {
    pressedOutside = e.target === dlg;
  });
  dlg.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || (e.target === dlg && pressedOutside)) dlg.close();
    pressedOutside = false;
  });

  button?.addEventListener('click', open);
  document.addEventListener('keydown', (e) => {
    if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey) return;
    // Em campo de texto o "?" é só um caractere.
    if (e.target.closest('input:not([type="range"]):not([type="checkbox"]), textarea, select, [contenteditable]')) return;
    if (document.querySelector('dialog[open]')) return;
    e.preventDefault();
    open();
  });
  return { open };
}
