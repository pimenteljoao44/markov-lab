// Ponto de entrada da trilha: a página inicial do caderno.
import { Trail } from './platform/Trail.js';
import { initShortcuts } from './platform/Shortcuts.js';

new Trail(document.getElementById('phases'), document.getElementById('trail-side'), document.getElementById('trail-tools'));

initShortcuts(
  [
    {
      title: 'Trilha',
      items: [
        { keys: ['Tab'], what: 'Passa pelas fases, pelos itens e pelos campos de explicação' },
        { keys: ['Enter', 'Espaço'], what: 'Abre ou fecha a fase em foco e marca o item em foco' },
      ],
    },
  ],
  document.getElementById('btn-shortcuts')
);

document.documentElement.dataset.ready = '1';
