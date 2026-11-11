// Progresso da trilha: o que foi marcado à mão fica aqui; o que acontece dentro de um laboratório
// é lido do salvamento do próprio laboratório, para nunca haver dois números para a mesma coisa.
import { PHASES } from './syllabus.js';
import { LABS } from './labs.js';

export const TRAIL_KEY = 'trilha:v1';
/** Quais fases estão abertas na tela. É preferência de exibição, não progresso: fica fora da cópia. */
export const TRAIL_UI_KEY = 'trilha:ui';
/** Uma explicação com menos que isso ainda é um título, não um entendimento. */
export const MIN_EXPLAIN = 80;

function read(storage, key) {
  try {
    return JSON.parse(storage.getItem(key)) || {};
  } catch {
    return {};
  }
}

/** { checks: Set de itens marcados, notes: { item: texto } } */
export function loadTrail(storage = localStorage) {
  const saved = read(storage, TRAIL_KEY);
  const notes = {};
  if (saved.notes && typeof saved.notes === 'object') {
    for (const [id, text] of Object.entries(saved.notes)) if (typeof text === 'string') notes[id] = text.slice(0, 4000);
  }
  return { checks: new Set(Array.isArray(saved.checks) ? saved.checks.filter((x) => typeof x === 'string') : []), notes };
}

export function saveTrail(trail, storage = localStorage) {
  try {
    storage.setItem(TRAIL_KEY, JSON.stringify({ checks: [...trail.checks], notes: trail.notes }));
    return true;
  } catch {
    return false; // armazenamento indisponível: a página continua funcionando até ser fechada
  }
}

/** Quanto de um laboratório já foi feito, lido do que ele mesmo salvou: { done, total }. */
export function labProgress(labId, storage = localStorage) {
  const lab = LABS[labId];
  if (!lab?.progress) return { done: 0, total: 0 };
  let done = 0;
  let total = 0;
  for (const part of lab.progress) {
    const list = read(storage, part.key)[part.field];
    const valid = new Set(part.ids);
    total += part.ids.length;
    // Só conta o que ainda existe: um desafio removido não pode inflar o progresso.
    if (Array.isArray(list)) done += new Set(list.filter((id) => valid.has(id))).size;
  }
  return { done, total };
}

/** Fração concluída de um item, entre 0 e 1. */
export function itemProgress(item, trail, storage = localStorage) {
  if (item.kind === 'lab') {
    const { done, total } = labProgress(item.lab, storage);
    return total ? done / total : 0;
  }
  if (item.kind === 'explica') return (trail.notes[item.id] || '').trim().length >= MIN_EXPLAIN ? 1 : 0;
  return trail.checks.has(item.id) ? 1 : 0;
}

const itemsOf = (phase) => phase.modules.flatMap((m) => m.items);
/** Laboratório ainda não construído não entra na conta: não dá para concluir o que não existe. */
const countable = (item) => !(item.kind === 'lab' && !LABS[item.lab]?.href);

export function phaseProgress(phase, trail, storage = localStorage) {
  const items = itemsOf(phase).filter(countable);
  const done = items.reduce((sum, item) => sum + itemProgress(item, trail, storage), 0);
  return { done, total: items.length, fraction: items.length ? done / items.length : 0 };
}

export function overallProgress(trail, storage = localStorage) {
  const parts = PHASES.map((p) => phaseProgress(p, trail, storage));
  const done = parts.reduce((s, p) => s + p.done, 0);
  const total = parts.reduce((s, p) => s + p.total, 0);
  return { done, total, fraction: total ? done / total : 0 };
}

/** O primeiro item ainda aberto, na ordem da trilha: é a resposta para "o que eu faço agora?". */
export function nextStep(trail, storage = localStorage) {
  for (const phase of PHASES) {
    for (const module of phase.modules) {
      for (const item of module.items) {
        if (countable(item) && itemProgress(item, trail, storage) < 1) return { phase, module, item };
      }
    }
  }
  return null;
}

/** Tudo que a plataforma guarda neste navegador, para levar a outro computador ou guardar cópia. */
export function exportAll(storage = localStorage) {
  const keys = [TRAIL_KEY, ...Object.values(LABS).flatMap((lab) => lab.storage || [])];
  const data = {};
  for (const key of keys) {
    const raw = storage.getItem(key);
    if (raw !== null) data[key] = raw;
  }
  return { format: 'caderno-ia', version: 1, data };
}

/** Recoloca uma cópia. Só aceita as chaves que a própria plataforma usa e só JSON válido. */
export function importAll(file, storage = localStorage) {
  if (file?.format !== 'caderno-ia' || typeof file.data !== 'object' || !file.data) throw new Error('Este arquivo não é uma cópia do caderno.');
  const allowed = new Set([TRAIL_KEY, ...Object.values(LABS).flatMap((lab) => lab.storage || [])]);
  let restored = 0;
  for (const [key, raw] of Object.entries(file.data)) {
    if (!allowed.has(key) || typeof raw !== 'string') continue;
    try {
      JSON.parse(raw);
    } catch {
      continue;
    }
    storage.setItem(key, raw);
    restored++;
  }
  if (!restored) throw new Error('A cópia não tem nada que este caderno reconheça.');
  return restored;
}

/**
 * Tudo que a pessoa escreveu nos itens "Explique", na ordem da trilha, como um documento em Markdown.
 * Devolve texto vazio quando ainda não há nada escrito.
 */
export function notesMarkdown(trail) {
  const phases = [];
  for (const phase of PHASES) {
    const modules = [];
    for (const module of phase.modules) {
      const answers = module.items
        .filter((item) => item.kind === 'explica' && (trail.notes[item.id] || '').trim())
        .map((item) => `**${item.title}**\n\n${trail.notes[item.id].trim()}`);
      if (answers.length) modules.push(`### ${module.title}\n\n${answers.join('\n\n')}`);
    }
    if (modules.length) phases.push(`## Fase ${phase.num}: ${phase.title}\n\n${modules.join('\n\n')}`);
  }
  return phases.length ? `# Caderno de IA aplicada: minhas explicações\n\n${phases.join('\n\n')}\n` : '';
}
