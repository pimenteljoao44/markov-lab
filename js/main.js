// Ponto de entrada: estado inicial, componentes, troca de níveis, persistência e compartilhamento.
import { initStore, getState, update, subscribe, actions } from './store.js';
import { LEVELS } from './levels/index.js';
import { forLevel } from './challenges/definitions.js';
import { deepClone, escapeHtml } from './util.js';
import { vocab } from './vocab.js';
import { sanitizeChain } from './models/chain.js';
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
import { toast } from './components/Toast.js';
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

// Link compartilhado (#m=base64) abre direto no Sandbox.
let level = [1, 2, 3].includes(saved.level) ? saved.level : 1;
let sharedLoaded = false;
if (location.hash.startsWith('#m=')) {
  try {
    const bytes = Uint8Array.from(atob(location.hash.slice(3)), (c) => c.charCodeAt(0));
    chains[3] = sanitizeChain(JSON.parse(new TextDecoder().decode(bytes)));
    level = 3;
    sharedLoaded = true;
  } catch {
    /* link inválido: segue com o que estava salvo */
  }
}

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

// ── balões
const coach = new Coach({ onSeenChange: () => updateNotebookCount() });
connectCoach(coach);
const notebook = new Notebook(coach);

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
new StoryNav($('story-nav'), $('story-card'), $('xp'), { onSelect: switchLevel });

const studio = new ModelStudio({
  onCreate(chain) {
    if (getState().meta.level !== 3) switchLevel(3);
    actions.loadChain(chain);
  },
});

function switchLevel(n) {
  const s = getState();
  if (n === s.meta.level) return;
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

// primeira renderização
update(null, 'chain', 'structure', 'layout', 'level', 'sim', 'challenge');
if (sharedLoaded) toast('Modelo compartilhado aberto', { sub: 'Ele está no Sandbox. Suas alterações não mudam o link original.' });

// ── persistência
let saveTimer;
subscribe((s, t) => {
  if (!(t.has('chain') || t.has('layout') || t.has('level') || t.has('challenge') || t.has('ui'))) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    chains[s.meta.level] = deepClone(s.chain);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ level: s.meta.level, chains, completed: s.challenges.completed, matrixMode: s.ui.matrixMode }));
    } catch {
      /* armazenamento indisponível */
    }
  }, 300);
});

// ── arquivo: exportar, importar, compartilhar
const menu = $('file-menu');
document.addEventListener('click', (e) => {
  if (menu.open && !menu.contains(e.target)) menu.open = false;
});

const exportable = () => {
  const { meta, states, matrix } = getState().chain;
  return { meta, states: states.map(({ id, label, color, x, y }) => ({ id, label, color, x: +x.toFixed(4), y: +y.toFixed(4) })), matrix };
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
    toast('Modelo importado', { type: 'ok', sub: `${chain.states.length} estados no Sandbox.` });
  } catch (e) {
    const detail = e instanceof SyntaxError ? 'Este arquivo não é um JSON válido.' : e.message;
    toast('Não foi possível importar', { type: 'warn', sub: detail });
  }
});

$('btn-share').addEventListener('click', async () => {
  menu.open = false;
  const bytes = new TextEncoder().encode(JSON.stringify(exportable()));
  const hash = `#m=${btoa(String.fromCharCode(...bytes))}`;
  const url = location.href.split('#')[0] + hash;
  history.replaceState(null, '', hash);
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copiado', { type: 'ok', sub: 'Quem abrir verá este modelo no Sandbox.' });
  } catch {
    toast('Link pronto na barra de endereço', { sub: 'Copie a URL para compartilhar.' });
  }
});

// ── atalhos
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea, button, summary, dialog, [role="button"], [contenteditable]')) return;
  if (e.code === 'Space') {
    e.preventDefault();
    sim.toggle();
  } else if (['Digit1', 'Digit2', 'Digit3'].includes(e.code) && !e.ctrlKey && !e.metaKey) {
    switchLevel(+e.code.slice(-1));
  }
});
