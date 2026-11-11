// Fichas laterais: o que o modelo usou para decidir, as medidas do sorteio, a ponte para o
// Laboratório de Markov e onde tudo isso aparece no trabalho.
import { escapeHtml, pct, num, keepFocus } from '../../util.js';
import { BOS } from '../ngram.js';
import { corpusOf } from '../state.js';
import { bridgeUrl, BRIDGE_STATES } from '../bridge.js';

const help = (tip, label) => `<button type="button" class="q" data-tip="${tip}" aria-label="${label}">?</button>`;
const tok = (t) => `<b class="tk">${escapeHtml(t)}</b>`;
const tokens = (n) => `${n} ${n === 1 ? 'token' : 'tokens'}`;

/** O que o modelo viu: quanto do contexto ele reconheceu e, se não reconheceu, o que fez. */
export class ContextPanel {
  constructor(el, store) {
    this.el = el;
    store.subscribe((s) => this.render(s));
  }

  render(s) {
    const { seen, finished } = s.derived;
    const context = seen.context.filter((t) => t !== BOS);
    let verdict;
    if (finished) {
      verdict = '<p class="card-sub">A frase terminou. Não há próximo token para escolher.</p>';
    } else if (!seen.backedOff) {
      verdict = `<p class="ctx-ok">Contexto reconhecido: ${context.length ? context.map(tok).join(' ') : 'começo de frase'}. Ele apareceu <b>${seen.total}</b> ${seen.total === 1 ? 'vez' : 'vezes'} no texto.</p>`;
    } else if (seen.used > 0) {
      verdict = `<p class="ctx-warn"><b>Só parte do contexto foi reconhecida.</b> O modelo queria usar ${tokens(seen.wanted)} e recuou para ${seen.used}: ${context.map(tok).join(' ')}.</p>`;
    } else {
      verdict = `<p class="ctx-warn"><b>O modelo nunca viu este contexto.</b> Ele não avisa: responde pela frequência geral dos tokens, com a mesma aparência de sempre. É assim que nasce uma resposta inventada.</p>`;
    }
    keepFocus(this.el, () => {
      this.el.innerHTML = `
        <div class="card-head"><h2>O que o modelo viu ${help('recuo', 'Explicar o contexto nunca visto')}</h2></div>
        <p class="card-sub">Janela de <b>${tokens(s.settings.order)}</b>. Tudo que ficou antes dela não entra na conta.</p>
        ${verdict}`;
    });
  }
}

/** Medidas do sorteio atual e do texto gerado. */
export class MeasuresPanel {
  constructor(el, store) {
    this.el = el;
    store.subscribe((s) => this.render(s));
  }

  render(s) {
    const d = s.derived;
    const row = (label, value, tip, tipLabel, note = '') => `<div class="ms-row"><dt>${label} ${tip ? help(tip, tipLabel) : ''}</dt><dd>${value}${note ? `<small>${note}</small>` : ''}</dd></div>`;
    const blank = d.finished || !d.dist.length;
    keepFocus(this.el, () => {
      this.el.innerHTML = `
        <div class="card-head"><h2>Medidas</h2></div>
        <dl class="ms">
          ${row('Mais provável', blank ? '—' : pct(d.topP, 0), 'temperatura', 'Explicar a temperatura', blank ? '' : `${escapeHtml(d.dist[0].token)}`)}
          ${row('Escolhas efetivas', blank ? '—' : num(d.choices, 1), 'entropia', 'Explicar a entropia', blank ? '' : `${num(d.entropy, 2)} bits`)}
          ${row('No sorteio', blank ? '—' : `${d.kept} de ${d.dist.length}`, 'topp', 'Explicar o top-p')}
          ${row('Cópia do texto', d.copied === null ? '—' : pct(d.copied, 0), 'recitar', 'Explicar recitar e generalizar', d.copied === null ? 'ainda sem texto para medir' : 'das janelas de 4 tokens')}
          ${row('Sem base', String(d.invented), 'alucinacao', 'Explicar por que o modelo inventa', d.invented === 1 ? 'token escolhido sem contexto' : 'tokens escolhidos sem contexto')}
        </dl>`;
    });
  }
}

/** A mesma coisa, como cadeia de Markov. */
export class BridgePanel {
  constructor(el, store, { onBridge }) {
    this.el = el;
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-bridge]')) onBridge();
    });
    store.subscribe((s, t) => {
      if (t.has('init') || t.has('corpus') || t.has('model') || !this.el.firstChild) this.render(s);
    });
  }

  render(s) {
    const d = s.derived;
    const one = s.settings.order === 1;
    const can = one && d.model.vocab.length >= 2;
    this.el.innerHTML = `
      <div class="card-head"><h2>A mesma coisa, como cadeia de Markov ${help('markov', 'Explicar a relação com cadeias de Markov')}</h2></div>
      <p class="card-sub">${
        one
          ? `Com contexto de 1 token, cada token é um <b>estado</b> e as contagens são a <b>matriz de transição</b>. Este modelo tem ${d.model.vocab.length} tokens; o diagrama mostra os ${BRIDGE_STATES - 1} mais frequentes e junta os demais.`
          : `Com contexto de ${s.settings.order}, o estado deixa de ser um token e passa a ser o conjunto dos últimos ${s.settings.order}. Este modelo guardou <b>${d.contexts}</b> desses estados. Volte para contexto de 1 para ver o diagrama.`
      }</p>
      ${can ? `<a class="btn btn-sm btn-marker" data-bridge href="${escapeHtml(bridgeUrl(d.sequences, corpusOf(s).title))}">Abrir no Laboratório de Markov</a>` : ''}`;
  }
}

/** Onde isso aparece no trabalho: três situações, cada uma apontando para o conceito que a explica. */
export function renderWorkPanel(el) {
  const item = (tip, title, text) => `<li><button type="button" class="work-link" data-tip="${tip}">${title}</button><span>${text}</span></li>`;
  el.innerHTML = `
    <div class="card-head"><h2>No trabalho</h2></div>
    <ul class="work">
      ${item('uso-fixo', 'Classificar ou extrair', 'pede temperatura baixa e saída em formato fixo.')}
      ${item('uso-contexto', 'Perguntar sobre algo interno', 'exige entregar o documento junto com a pergunta.')}
      ${item('uso-teste', 'Avaliar uma demonstração', 'exige vários casos e várias repetições, não um exemplo bonito.')}
    </ul>`;
}
