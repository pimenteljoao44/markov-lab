// Ponto de entrada do laboratório "Do Markov ao LLM": estado, componentes, ações e salvamento.
import { createLlmStore, corpusOf, writtenTokens, sanitizeSettings, randomSeed, MAX_GENERATED } from './state.js';
import { step, generate, distribution } from './sampling.js';
import { nextCounts } from './ngram.js';
import { CORPORA, CUSTOM_CORPUS } from './corpus.js';
import { LLM_CHALLENGES, context } from './challenges.js';
import { LLM_TIPS, LLM_TOPICS } from './tips.js';
import { TextStage } from './components/TextStage.js';
import { SamplerBar } from './components/SamplerBar.js';
import { ContextPanel, MeasuresPanel, BridgePanel, renderWorkPanel } from './components/Panels.js';
import { CorpusDialog } from './components/CorpusDialog.js';
import { LabNotebook } from '../platform/LabNotebook.js';
import { LabDock } from '../platform/LabDock.js';
import { toast } from '../components/Toast.js';
import { escapeHtml } from '../util.js';

const $ = (id) => document.getElementById(id);
const store = createLlmStore();
const { update } = store;

// ── caderno de teoria: todo botão "?" da página abre o conceito correspondente
const notebook = new LabNotebook({
  topics: LLM_TOPICS,
  tips: LLM_TIPS,
  context: () => context(store.get()),
  key: 'llmlab:caderno',
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
  if (tip && LLM_TIPS[tip.dataset.tip]) notebook.open(tip.dataset.tip);
});

// ── ações
/** Apaga o que foi gerado e volta o sorteio ao começo da semente. */
function clearText(st) {
  st.steps = [];
  store.rewind();
}

function sortNext() {
  const s = store.get();
  if (s.derived.finished) return;
  const next = step(s.derived.model, writtenTokens(s), s.settings, store.rand);
  if (next) update((st) => st.steps.push(next), 'text');
}

/** Sempre a partir do começo da semente: mesma semente e mesmos ajustes dão a mesma frase. */
function runSentence() {
  const s = store.get();
  store.rewind();
  const steps = generate(s.derived.model, s.derived.prompt, s.settings, store.rand, MAX_GENERATED);
  update((st) => {
    st.steps = steps;
    if (st.settings.temperature === 0) st.flags.coldRuns++;
    if (st.settings.temperature >= 1.5) st.flags.hotRuns++;
  }, 'text');
}

/** A pessoa faz o papel do sorteio: escolhe um token entre os que estão valendo. */
function choose(token) {
  const s = store.get();
  if (s.derived.finished) return;
  const seen = nextCounts(s.derived.model, writtenTokens(s));
  const pick = distribution(seen.counts, s.settings).find((x) => x.token === token && x.kept);
  if (!pick) return;
  update((st) => st.steps.push({ token, p: pick.p, base: pick.base, used: seen.used, backedOff: seen.backedOff, manual: true }), 'text');
}

function setSetting(key, value) {
  const s = store.get();
  const next = sanitizeSettings({ ...s.settings, [key]: value });
  if (next[key] === s.settings[key]) return;
  // Trocar a janela ou o tipo de token muda o modelo: o que foi gerado com o antigo deixa de fazer sentido.
  const structural = key === 'order' || key === 'mode';
  update((st) => {
    st.settings = next;
    if (structural) clearText(st);
  }, 'settings', ...(structural ? ['model', 'text'] : []));
}

function newSeed() {
  const had = store.get().steps.length > 0;
  update((st) => {
    st.settings.seed = randomSeed() % 100000;
    clearText(st);
  }, 'settings', 'text');
  if (had) runSentence();
}

function pickCorpus(id, text) {
  update((st) => {
    st.corpus.id = id;
    if (id === CUSTOM_CORPUS) st.corpus.custom = text;
    st.prompt = CORPORA[id]?.prompt ?? '';
    clearText(st);
  }, 'corpus', 'prompt', 'text');
  toast('Modelo treinado de novo', { type: 'ok', sub: `${store.get().derived.model.tokens} tokens lidos de “${corpusOf(store.get()).title}”.` });
}

// ── componentes
new TextStage($('gen-text'), $('gen-next'), store, {
  onPrompt: (text) => update((st) => {
    st.prompt = text.slice(0, 200);
    clearText(st);
  }, 'text'),
  onChoose: choose,
});
new SamplerBar($('simbar'), store, { onStep: sortNext, onRun: runSentence, onClear: () => update(clearText, 'text'), onSetting: setSetting, onSeed: newSeed });
new ContextPanel($('panel-context'), store);
new MeasuresPanel($('panel-measures'), store);
new BridgePanel($('panel-bridge'), store, {
  // O link segue normalmente; antes de sair, fica registrado que a ponte foi atravessada.
  onBridge() {
    update((st) => (st.flags.bridged = true), 'flags');
    store.save();
  },
});
renderWorkPanel($('panel-work'));
new LabDock($('challenge-dock'), { store, challenges: LLM_CHALLENGES, context });

const corpusDialog = new CorpusDialog(store, { onPick: pickCorpus });
$('btn-corpus').addEventListener('click', () => corpusDialog.open());

// ── faixa do modelo
function renderModelBar(s) {
  const d = s.derived;
  const corpus = corpusOf(s);
  $('model-title').textContent = corpus.title;
  $('model-sub').innerHTML = `${d.model.sentences} frases · ${d.model.tokens} tokens · vocabulário de ${d.model.vocab.length}
    <button type="button" class="q" data-tip="contagem" aria-label="Explicar como o modelo é treinado">?</button>
    <span class="mb-about">${escapeHtml(corpus.about)}</span>`;
}
store.subscribe((s, t) => {
  if (t.has('init') || t.has('corpus') || t.has('model')) renderModelBar(s);
});

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

// ── atalhos
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea, button, summary, dialog, a, [contenteditable]')) return;
  if (e.code === 'Space') {
    e.preventDefault();
    sortNext();
  } else if (e.code === 'Enter') {
    runSentence();
  }
});

document.documentElement.dataset.ready = '1';
