// Registro dos laboratórios: o único lugar que sabe onde cada um mora e onde ele guarda o progresso.
// Um laboratório sem `href` está planejado: aparece na trilha, mas não conta no progresso.
import { CHALLENGES } from '../challenges/definitions.js';
import { COURSE } from '../learn/course.js';
import { LLM_CHALLENGES } from '../llm/challenges.js';
import { LLM_KEY } from '../llm/state.js';

export const LABS = {
  markov: {
    title: 'Laboratório de Markov',
    href: 'markov.html',
    blurb: 'Modele um processo como estados e chances, simule e pergunte ao modelo.',
    storage: ['markovlab:v3', 'markovlab:course', 'markovlab:coach'],
    counts: 'desafios e etapas de aula',
    progress: [
      { key: 'markovlab:v3', field: 'completed', ids: CHALLENGES.map((c) => c.id) },
      { key: 'markovlab:course', field: 'done', ids: COURSE.map((s) => s.id) },
    ],
  },
  llm: {
    title: 'Do Markov ao LLM',
    href: 'llm.html',
    blurb: 'Treine um modelo de linguagem contando palavras e veja temperatura, top-k e top-p mudarem o sorteio.',
    storage: [LLM_KEY, 'llmlab:caderno'],
    counts: 'desafios',
    progress: [{ key: LLM_KEY, field: 'completed', ids: LLM_CHALLENGES.map((c) => c.id) }],
  },
  vetores: { title: 'Vetores e similaridade', blurb: 'Produto escalar e cosseno: a geometria por trás de embeddings e da busca semântica.' },
  gradiente: { title: 'Descida de gradiente', blurb: 'O que significa treinar um modelo, sem derivar na mão.' },
  recuperacao: { title: 'Recuperação de brinquedo', blurb: 'Cortar um documento em trechos, buscar os mais parecidos e ver onde o RAG erra.' },
  agente: { title: 'O laço do agente', blurb: 'Pensar, chamar ferramenta, observar: o agente como máquina de estados.' },
  permissao: { title: 'Simulador de permissão', blurb: 'Perfil herdado contra perfil dedicado, e o que acontece quando entrada não confiável encontra poder de ação.' },
};
