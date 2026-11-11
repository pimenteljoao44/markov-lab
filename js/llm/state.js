// Estado do laboratório "Do Markov ao LLM": o que a pessoa edita, o que é calculado a partir disso e o salvamento.
import { createStore } from '../platform/tinyStore.js';
import { mulberry32, randomSeed } from '../math/rng.js';
import { tokenize, train, nextCounts, copiedFraction, contextsSeen, EOS, MAX_ORDER, MAX_TEXT } from './ngram.js';
import { distribution, entropy, effectiveChoices, MAX_TEMPERATURE } from './sampling.js';
import { CORPORA, DEFAULT_CORPUS, CUSTOM_CORPUS } from './corpus.js';
import { clamp } from '../util.js';

export const LLM_KEY = 'llmlab:v1';
export const MAX_GENERATED = 60;

export const DEFAULT_SETTINGS = { order: 1, mode: 'word', temperature: 1, topK: 0, topP: 1, seed: 7 };

/** Aceita só o que faz sentido: salvamento antigo ou editado à mão não pode quebrar a página. */
export function sanitizeSettings(raw = {}) {
  const num = (v, fallback) => (Number.isFinite(+v) ? +v : fallback);
  return {
    order: clamp(Math.round(num(raw.order, 1)), 1, MAX_ORDER),
    mode: raw.mode === 'char' ? 'char' : 'word',
    temperature: clamp(num(raw.temperature, 1), 0, MAX_TEMPERATURE),
    topK: clamp(Math.round(num(raw.topK, 0)), 0, 10),
    topP: clamp(num(raw.topP, 1), 0.05, 1),
    seed: Math.abs(Math.round(num(raw.seed, 7))) % 100000,
  };
}

function loadSaved(storage) {
  try {
    return JSON.parse(storage.getItem(LLM_KEY)) || {};
  } catch {
    return {};
  }
}

/** Texto de treino em uso: um dos prontos ou o que a pessoa colou. */
export function corpusOf(s) {
  if (s.corpus.id === CUSTOM_CORPUS) return { title: 'Meu texto', about: 'Texto colado por você. Ele fica só neste navegador.', text: s.corpus.custom };
  return CORPORA[s.corpus.id];
}

/** Tokens já escritos: o começo digitado mais o que foi gerado, sem o marcador de fim. */
export const writtenTokens = (s) => [...s.derived.prompt, ...s.steps.filter((x) => x.token !== EOS).map((x) => x.token)];
export const isFinished = (s) => s.steps.at(-1)?.token === EOS || s.steps.length >= MAX_GENERATED;

function derive(s, tags) {
  const retrain = tags.has('init') || tags.has('corpus') || tags.has('model');
  const d = s.derived;
  if (retrain) {
    d.sequences = tokenize(corpusOf(s).text, s.settings.mode);
    d.model = train(d.sequences, s.settings.order);
    d.contexts = contextsSeen(d.model);
  }
  d.prompt = tokenize(s.prompt, s.settings.mode).flat();
  const written = writtenTokens(s);
  d.finished = isFinished(s);
  d.seen = nextCounts(d.model, written);
  d.dist = distribution(d.seen.counts, s.settings);
  d.kept = d.dist.filter((x) => x.kept).length;
  d.entropy = entropy(d.dist);
  d.choices = effectiveChoices(d.dist);
  d.topP = d.dist[0]?.p ?? 0;
  d.copied = written.length > d.prompt.length ? copiedFraction(written, d.sequences, 4, d.prompt.length) : null;
  d.invented = s.steps.filter((x) => x.used === 0).length;
  tags.add('derived');
}

export function createLlmStore(storage = localStorage) {
  const saved = loadSaved(storage);
  const custom = typeof saved.custom === 'string' ? saved.custom.slice(0, MAX_TEXT) : '';
  const id = saved.corpus === CUSTOM_CORPUS && tokenize(custom).length ? CUSTOM_CORPUS : CORPORA[saved.corpus] ? saved.corpus : DEFAULT_CORPUS;
  const initial = {
    corpus: { id, custom },
    settings: sanitizeSettings({ ...DEFAULT_SETTINGS, ...saved.settings }),
    prompt: typeof saved.prompt === 'string' ? saved.prompt.slice(0, 200) : CORPORA[id]?.prompt ?? '',
    steps: [],
    flags: { bridged: saved.bridged === true, coldRuns: 0, hotRuns: 0 },
    challenges: {
      completed: Array.isArray(saved.completed) ? saved.completed.filter((x) => typeof x === 'string') : [],
      active: typeof saved.active === 'string' ? saved.active : null,
      hints: {},
    },
    derived: {},
  };
  const store = createStore(initial, derive);
  let rand = mulberry32(initial.settings.seed);
  store.rand = () => rand();
  /** Volta o sorteio ao começo: mesma semente e mesmos ajustes produzem o mesmo texto. */
  store.rewind = () => (rand = mulberry32(store.get().settings.seed));
  store.save = () => {
    const s = store.get();
    try {
      storage.setItem(LLM_KEY, JSON.stringify({
        corpus: s.corpus.id, custom: s.corpus.custom, settings: s.settings, prompt: s.prompt,
        completed: s.challenges.completed, active: s.challenges.active, bridged: s.flags.bridged,
      }));
    } catch {
      /* armazenamento indisponível */
    }
  };
  return store;
}

export { randomSeed };
