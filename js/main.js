// Ponto de entrada: estado inicial, componentes, troca de níveis, persistência e compartilhamento.
import { initStore, getState, update, subscribe, actions, historyState, dumpHistories, restoreHistories } from './store.js';
import { LEVELS } from './levels/index.js';
import { forLevel } from './challenges/definitions.js';
import { deepClone, escapeHtml } from './util.js';
import { vocab } from './vocab.js';
import { sanitizeChain } from './models/chain.js';
import { isShareHash, encodeShare, decodeShare } from './models/share.js';
import { GraphView } from './components/GraphView.js';
import { ParticleEngine } from './components/ParticleEngine.js';
import { ParticleLayer } from './components/ParticleLayer.js';
import { SimControls, defaultSim } from './components/SimControls.js';
import { MatrixEditor } from './components/MatrixEditor.js';
import { InsightPanel } from './components/InsightPanel.js';
import { ConvergenceChart } from './components/ConvergenceChart.js';
import { AskPanel } from './components/AskPanel.js';
import { ChallengeDock } from './components/ChallengeDock.js';
import { StoryNav } from './components/StoryNav.js';
import { ModelStudio } from './components/ModelStudio.js';
import { Notebook } from './components/Notebook.js';
import { CoursePanel } from './components/CoursePanel.js';
import { buildModel } from './models/catalog.js';
import { toast, undoToast, dismissActionToasts } from './components/Toast.js';
import { Coach } from './coach/Coach.js';
import { connectCoach, helpDot } from './coach/api.js';

const STORAGE_KEY = 'markovlab:v3';
const $ = (id) => document.getElementById(id);

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

const saved = loadSaved();
const chains = { 1: null, 2: null, 3: null };
for (const k of [1, 2, 3]) {
  try {
    if (saved.chains?.[k]) chains[k] = sanitizeChain(saved.chains[k]);
  } catch {
    /* salvamento corrompido: usa o modelo padrão do nível */
  }
}

const level = [1, 2, 3].includes(saved.level) ? saved.level : 1;
const chainFor = (n) => deepClone(chains[n] || LEVELS[n].chain());

function firstOpen(lvl, completed) {
  const list = forLevel(lvl);
  return (list.find((c) => !completed.includes(c.id)) || list[0])?.id;
}

const completed = Array.isArray(saved.completed) ? saved.completed.filter((x) => typeof x === 'string') : [];
initStore({
  meta: { version: 3, level, locale: 'pt-BR' },
  chain: chainFor(level),
  ui: { hover: null, matrixMode: saved.matrixMode === 'percent' ? 'percent' : 'decimal' },
  simulation: defaultSim(level),
  challenges: {
    completed,
    active: { 1: firstOpen(1, completed), 2: firstOpen(2, completed), 3: firstOpen(3, completed) },
    hints: {},
    revealed: {},
  },
});

// Desfazer sobrevive a recarregar a página.
const savedUndo = {};
for (const k of [1, 2, 3]) {
  savedUndo[k] = (Array.isArray(saved.undo?.[k]) ? saved.undo[k] : []).flatMap((c) => {
    try {
      return [sanitizeChain(c)];
    } catch {
      return [];
    }
  });
}
restoreHistories(savedUndo);

// ── balões
const coach = new Coach({ onSeenChange: () => updateNotebookCount() });
connectCoach(coach);
const course = new CoursePanel({
  onProgress: updateCourseCount,
  onPractice({ level: target, challenge, model, wizard }) {
    if (getState().meta.level !== target) switchLevel(target);
    if (challenge) update((st) => (st.challenges.active[target] = challenge), 'challenge');
    if (model) {
      actions.loadChain(buildModel(model));
      undoToast('Modelo aberto para praticar', { sub: 'O anterior pode ser recuperado.' });
    }
    if (wizard) studio.openWizard();
  },
});
function updateCourseCount() {
  const { done, total } = course.progress();
  $('course-count').textContent = `${done}/${total}`;
}
updateCourseCount();
$('btn-course').addEventListener('click', () => course.open());
const notebook = new Notebook(coach, { onLesson: (moment) => course.open({ moment }) });

function updateNotebookCount() {
  const { seen, total } = coach.seenCount();
  $('nb-count').textContent = `${seen}/${total}`;
}
updateNotebookCount();
$('btn-notebook').addEventListener('click', () => notebook.open());
$('coach-toggle').checked = coach.enabled;
$('coach-toggle').addEventListener('change', (e) => coach.setEnabled(e.target.checked));

// ── componentes
const wrap = $('graph-wrap');
const graph = new GraphView(wrap, $('graph'));
const engine = new ParticleEngine();
const layer = new ParticleLayer($('particles'), wrap, graph);
const sim = new SimControls($('simbar'), engine, layer);
new MatrixEditor($('panel-matrix'));
new ConvergenceChart($('panel-convergence'));
new AskPanel($('panel-ask'));
new InsightPanel($('panel-insights'));
new ChallengeDock($('challenge-dock'), {
  onComplete() {
    const s = getState();
    const list = forLevel(s.meta.level);
    if (list.every((c) => s.challenges.completed.includes(c.id)) && s.meta.level < 3) {
      setTimeout(() => toast(`Nível ${s.meta.level} completo`, { type: 'ok', sub: `O nível ${s.meta.level + 1} já está liberado nas abas lá em cima.` }), 900);
    }
  },
});
new StoryNav($('story-nav'), $('story-card'), $('xp'), { onSelect: switchLevel, onCourse: (stage) => course.open({ stage }) });

const studio = new ModelStudio({
  onCreate(chain) {
    if (getState().meta.level !== 3) switchLevel(3);
    actions.loadChain(chain);
    undoToast('Modelo criado no Sandbox', { type: 'ok', sub: 'O que estava lá pode ser recuperado.' });
  },
});

function switchLevel(n) {
  const s = getState();
  if (n === s.meta.level) return;
  dismissActionToasts(); // "Desfazer" só faz sentido no nível em que a mudança aconteceu
  chains[s.meta.level] = deepClone(s.chain);
  update((st) => {
    st.meta.level = n;
    st.chain = chainFor(n);
    st.simulation = defaultSim(n);
    st.ui.hover = null;
  }, 'chain', 'structure', 'layout', 'level', 'sim', 'hover', 'challenge');
}

// ── faixa do modelo
function renderModelBar(s) {
  const v = vocab(s.chain);
  $('model-title').textContent = v.title;
  $('model-sub').innerHTML = `1 bolinha = 1 ${escapeHtml(v.unit)} · 1 passo = 1 ${escapeHtml(v.step)} ${helpDot('good-step', 'Explicar como escolher o passo')}
    <button type="button" class="text-btn inline" id="btn-edit">editar nomes</button>`;
}
subscribe((s, t) => {
  if (t.has('structure') || t.has('level')) renderModelBar(s);
});
$('btn-gallery').addEventListener('click', () => studio.openGallery());
$('btn-wizard').addEventListener('click', () => studio.openWizard());
$('model-sub').addEventListener('click', (e) => {
  if (e.target.closest('#btn-edit')) studio.openEditor();
});

// ── desfazer e refazer
$('btn-undo').addEventListener('click', () => actions.undo());
$('btn-redo').addEventListener('click', () => actions.redo());
function renderUndoButtons() {
  const { canUndo, canRedo } = historyState();
  $('btn-undo').disabled = !canUndo;
  $('btn-redo').disabled = !canRedo;
}
subscribe((s, t) => {
  if (t.has('chain') || t.has('layout') || t.has('level')) renderUndoButtons();
});

// primeira renderização
update(null, 'chain', 'structure', 'layout', 'level', 'sim', 'challenge');

// ── persistência
function saveNow() {
  const s = getState();
  chains[s.meta.level] = deepClone(s.chain);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ level: s.meta.level, chains, completed: s.challenges.completed, matrixMode: s.ui.matrixMode, undo: dumpHistories() }));
  } catch {
    /* armazenamento indisponível */
  }
}
let saveTimer = null;
subscribe((s, t) => {
  if (!(t.has('chain') || t.has('layout') || t.has('level') || t.has('challenge') || t.has('ui'))) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveNow();
  }, 300);
});
// Fechar ou recarregar logo depois de editar não pode perder a última mudança.
window.addEventListener('pagehide', () => {
  if (saveTimer === null) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  saveNow();
});

// ── arquivo: exportar, importar, compartilhar
const menu = $('file-menu');
document.addEventListener('click', (e) => {
  if (menu.open && !menu.contains(e.target)) menu.open = false;
});

const exportable = () => {
  const { meta, states, matrix } = getState().chain;
  return {
    meta,
    states: states.map(({ id, label, color, x, y }) => ({ id, label, color, x: +x.toFixed(4), y: +y.toFixed(4) })),
    // 10 algarismos significativos: mantém eventos raros sem alongar o arquivo e o link com ruído de ponto flutuante.
    matrix: matrix.map((row) => row.map((v) => +(+v).toPrecision(10))),
  };
};

const fileName = (title) =>
  `${title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'modelo'}.json`;

$('btn-export').addEventListener('click', () => {
  menu.open = false;
  const data = exportable();
  const name = fileName(data.meta.title);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Modelo exportado', { sub: name });
});

const fileInput = $('file-import');
$('btn-import').addEventListener('click', () => {
  menu.open = false;
  fileInput.click();
});
fileInput.addEventListener('change', async () => {
  const f = fileInput.files[0];
  fileInput.value = '';
  if (!f) return;
  try {
    const chain = sanitizeChain(JSON.parse(await f.text()));
    chain.meta.custom = true;
    if (getState().meta.level !== 3) switchLevel(3);
    actions.loadChain(chain);
    undoToast('Modelo importado', { type: 'ok', sub: `${chain.states.length} estados no Sandbox.` });
  } catch (e) {
    const detail = e instanceof SyntaxError ? 'Este arquivo não é um JSON válido.' : e.message;
    toast('Não foi possível importar', { type: 'warn', sub: detail });
  }
});

$('btn-share').addEventListener('click', async () => {
  menu.open = false;
  const url = location.href.split('#')[0] + encodeShare(exportable());
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copiado', { type: 'ok', sub: 'Quem abrir verá este modelo no Sandbox.' });
  } catch {
    studio.openShareLink(url);
  }
});

// ── link compartilhado: ao abrir a página ou ao colar outro link na mesma aba
function openFromHash() {
  const { hash } = location;
  if (!isShareHash(hash)) return;
  // O link já cumpriu seu papel: se ficasse na URL, recarregar a página descartaria as edições feitas depois.
  history.replaceState(null, '', location.pathname + location.search);
  let chain;
  try {
    chain = decodeShare(hash);
  } catch {
    toast('Não foi possível abrir o link', { type: 'warn', sub: 'Ele pode ter sido cortado ao ser copiado: peça o link de novo. Seu modelo continua aqui.', timeout: 9000 });
    return;
  }
  if (getState().meta.level !== 3) switchLevel(3);
  actions.loadChain(chain);
  saveNow(); // a URL já não tem o link: o modelo aberto precisa estar salvo
  undoToast('Modelo compartilhado aberto', { sub: 'Ele está no Sandbox. Seu modelo anterior não foi perdido.', label: 'Voltar ao meu modelo' });
}
window.addEventListener('hashchange', openFromHash);
openFromHash();

// ── atalhos
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && !e.altKey && (key === 'z' || key === 'y')) {
    // Em campo de texto, Ctrl+Z continua sendo o desfazer do próprio navegador.
    if (document.querySelector('dialog[open]') || e.target.closest('input:not([type="range"]):not([type="checkbox"]), textarea, [contenteditable]')) return;
    e.preventDefault();
    if (key === 'y' || e.shiftKey) actions.redo();
    else actions.undo();
    return;
  }
  if (e.target.closest('input, select, textarea, button, summary, dialog, [role="button"], [contenteditable]')) return;
  if (e.code === 'Space') {
    e.preventDefault();
    sim.toggle();
  } else if (['Digit1', 'Digit2', 'Digit3'].includes(e.code) && !e.ctrlKey && !e.metaKey) {
    switchLevel(+e.code.slice(-1));
  }
});

document.documentElement.dataset.ready = '1';
