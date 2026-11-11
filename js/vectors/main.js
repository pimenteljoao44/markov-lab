// Ponto de entrada do laboratório "Vetores e similaridade".
import { createVectorStore, DEFAULTS, MODES } from './state.js';
import { VEC_CHALLENGES, context } from './challenges.js';
import { VEC_TIPS, VEC_TOPICS } from './tips.js';
import { METRICS } from './engine.js';
import { Stage } from './components/Stage.js';
import { MeasuresPanel, renderEmbedPanel, renderWorkPanel } from './components/Panels.js';
import { LabNotebook } from '../platform/LabNotebook.js';
import { LabDock } from '../platform/LabDock.js';
import { SideNav } from '../platform/SideNav.js';
import { initShortcuts } from '../platform/Shortcuts.js';
import { renderTex } from '../util.js';

const $ = (id) => document.getElementById(id);
const store = createVectorStore();
const { update } = store;

// ── caderno de teoria: todo botão "?" da página abre o conceito correspondente
const notebook = new LabNotebook({
  topics: VEC_TOPICS,
  tips: VEC_TIPS,
  context: () => context(store.get()),
  key: 'vectorlab:caderno',
  onSeenChange: updateNotebookCount,
});
function updateNotebookCount() {
  const { seen, total } = notebook.seenCount();
  $('nb-count').textContent = `${seen}/${total}`;
}
updateNotebookCount();
$('btn-notebook').addEventListener('click', () => notebook.open());
document.addEventListener('click', (e) => {
  const tip = e.target.closest('[data-tip]');
  if (tip && VEC_TIPS[tip.dataset.tip]) notebook.open(tip.dataset.tip);
});

// ── componentes
new Stage({ plane: $('vec-plane'), rank: $('vec-rank') }, store, {
  onMode: (mode) => MODES.includes(mode) && update((s) => (s.mode = mode), 'mode'),
  onMetric: (metric) => METRICS[metric] && update((s) => (s.metric = metric), 'metric'),
  onMove: (key, value) => update((s) => (s[key] = value), 'vec'),
});
new MeasuresPanel($('panel-measures'), store);
renderEmbedPanel($('panel-embed'));
renderWorkPanel($('panel-work'));
renderTex($('panel-embed'));
new SideNav(document.querySelector('.side'), [
  { id: 'panel-measures', label: 'Medidas' },
  { id: 'panel-embed', label: 'Embedding real' },
  { id: 'panel-work', label: 'No trabalho' },
]);
new LabDock($('challenge-dock'), { store, challenges: VEC_CHALLENGES, context, color: 'var(--lv1)', colorInk: 'var(--lv1-ink)' });

// ── barra de baixo: voltar ao exemplo
$('simbar').innerHTML = `
  <div class="sim-main"><button type="button" class="btn btn-quiet" data-reset title="Devolve A, B e a consulta às posições do começo">Voltar ao exemplo</button></div>
  <p class="vs-tip">Dica: foque uma ponta com <kbd>Tab</kbd> e mova com as setas do teclado.</p>`;
$('simbar').addEventListener('click', (e) => {
  if (!e.target.closest('[data-reset]')) return;
  update((s) => {
    s.a = DEFAULTS.a.slice();
    s.b = DEFAULTS.b.slice();
    s.q = DEFAULTS.q.slice();
  }, 'vec');
});

initShortcuts(
  [
    {
      title: 'Setas do plano',
      items: [
        { keys: ['Tab'], what: 'Passa de uma ponta para a outra' },
        { keys: ['Setas'], what: 'Move a ponta em foco em 0,1' },
        { keys: ['Shift+Setas'], what: 'Move a ponta em foco em 0,5' },
      ],
    },
  ],
  $('btn-shortcuts')
);

// ── faixa do modelo
$('model-title').textContent = 'Vetores no plano';
$('model-sub').innerHTML = `Setas de 2 números · 10 textos de exemplo
  <button type="button" class="q" data-tip="vetor" aria-label="Explicar o que é um vetor">?</button>`;

// primeira renderização
update(null, 'init', 'challenge');

// ── salvamento
let saveTimer = null;
store.subscribe(() => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    store.save();
  }, 300);
});
// Fechar ou recarregar logo depois de mexer não pode perder a última mudança.
window.addEventListener('pagehide', () => {
  if (saveTimer === null) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  store.save();
});

document.documentElement.dataset.ready = '1';
