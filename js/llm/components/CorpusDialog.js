// Janela para trocar o texto de treino: um dos prontos ou um texto colado.
// O texto colado fica só neste navegador; nada é enviado a lugar nenhum.
import { escapeHtml } from '../../util.js';
import { CORPORA, CUSTOM_CORPUS } from '../corpus.js';
import { tokenize, MAX_TEXT } from '../ngram.js';

/** Abaixo disso, quase todo contexto aparece uma vez só e não há o que sortear. */
export const MIN_TOKENS = 30;

export class CorpusDialog {
  constructor(store, { onPick }) {
    this.store = store;
    this.onPick = onPick;
    this.dlg = document.createElement('dialog');
    this.dlg.className = 'studio corpus';
    this.dlg.setAttribute('aria-labelledby', 'corpus-title');
    document.body.appendChild(this.dlg);
    let pressedOutside = false;
    this.dlg.addEventListener('mousedown', (e) => {
      pressedOutside = e.target === this.dlg;
    });
    this.dlg.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]') || (e.target === this.dlg && pressedOutside)) {
        this.dlg.close();
        return;
      }
      const pick = e.target.closest('[data-corpus]');
      if (pick) {
        this.dlg.close();
        this.onPick(pick.dataset.corpus);
        return;
      }
      if (e.target.closest('[data-use]')) this.useCustom();
    });
    this.dlg.addEventListener('input', (e) => {
      if (e.target.matches('#corpus-text')) this.check();
    });
  }

  open() {
    const s = this.store.get();
    this.dlg.innerHTML = `
      <header class="dlg-head"><h2 id="corpus-title">Texto de treino</h2><button type="button" class="dlg-x" data-close aria-label="Fechar">×</button></header>
      <p class="dlg-sub">O modelo só sabe o que está no texto escolhido. Troque o texto e ele passa a falar de outro assunto.</p>
      <div class="dlg-body">
        <ul class="corpus-list">${Object.entries(CORPORA)
          .map(([id, c]) => `<li><button type="button" class="corpus-pick ${s.corpus.id === id ? 'current' : ''}" data-corpus="${id}"><b>${escapeHtml(c.title)}</b><small>${escapeHtml(c.about)}</small></button></li>`)
          .join('')}</ul>
        <label class="corpus-own" for="corpus-text"><b>Ou cole o seu texto</b>
          <small>Uma frase por linha ou separadas por ponto. Não cole dados pessoais nem informação confidencial: o texto fica salvo neste navegador.</small></label>
        <textarea id="corpus-text" class="field area" rows="7" maxlength="${MAX_TEXT}" spellcheck="false">${escapeHtml(s.corpus.custom)}</textarea>
        <p class="wz-tip" data-status aria-live="polite"></p>
      </div>
      <footer class="dlg-foot"><button type="button" class="btn btn-quiet" data-close>Cancelar</button><button type="button" class="btn btn-primary btn-flat" data-use>Usar o meu texto</button></footer>`;
    this.check();
    this.dlg.showModal();
  }

  count() {
    const sequences = tokenize(this.dlg.querySelector('#corpus-text').value, this.store.get().settings.mode);
    return { sentences: sequences.length, tokens: sequences.reduce((n, seq) => n + seq.length, 0) };
  }

  check() {
    const { sentences, tokens } = this.count();
    const ok = tokens >= MIN_TOKENS && sentences >= 2;
    this.dlg.querySelector('[data-use]').disabled = !ok;
    this.dlg.querySelector('[data-status]').textContent = !tokens
      ? `Cole pelo menos ${MIN_TOKENS} tokens em 2 frases ou mais.`
      : ok
        ? `${sentences} frases e ${tokens} tokens: dá para treinar.`
        : `${sentences} ${sentences === 1 ? 'frase' : 'frases'} e ${tokens} tokens: ainda é pouco. O mínimo é ${MIN_TOKENS} tokens em 2 frases.`;
  }

  useCustom() {
    const text = this.dlg.querySelector('#corpus-text').value.slice(0, MAX_TEXT);
    this.dlg.close();
    this.onPick(CUSTOM_CORPUS, text);
  }
}
