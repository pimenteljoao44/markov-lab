// Folha do laboratório: o texto sendo escrito e, logo abaixo, as chances de cada próximo token.
// Clicar numa barra escolhe aquele token à mão: é o jeito de sentir que o sorteio fica fora do modelo.
import { escapeHtml, pct, keepFocus } from '../../util.js';
import { EOS, BOS } from '../ngram.js';

const MAX_BARS = 12;
const show = (token) => escapeHtml(token);

export class TextStage {
  constructor(textEl, nextEl, store, { onPrompt, onChoose }) {
    Object.assign(this, { textEl, nextEl, store });
    textEl.innerHTML = `
      <label class="gen-prompt"><span>Comece com <button type="button" class="q" data-tip="contexto" aria-label="Explicar a janela de contexto">?</button></span>
        <input type="text" class="field" id="prompt" maxlength="200" autocomplete="off" spellcheck="false" placeholder="deixe vazio para o modelo começar a frase"></label>
      <div class="gen-line" id="gen-line" aria-live="polite"></div>
      <p class="gen-legend" id="gen-legend"></p>`;
    this.input = textEl.querySelector('#prompt');
    this.input.value = store.get().prompt;
    this.input.addEventListener('input', () => onPrompt(this.input.value));
    nextEl.addEventListener('click', (e) => {
      const bar = e.target.closest('[data-token]');
      if (bar && !bar.disabled) onChoose(bar.dataset.token);
    });
    store.subscribe((s, t) => {
      if (t.has('prompt') && this.input.value !== s.prompt) this.input.value = s.prompt;
      this.render(s);
    });
  }

  render(s) {
    const d = s.derived;
    const given = d.prompt.map((t) => `<span class="tk-chip given">${show(t)}</span>`).join('');
    const made = s.steps
      .map((x) => {
        if (x.token === EOS) return `<span class="tk-chip end" title="O modelo sorteou o fim da frase">${show(EOS)}</span>`;
        const cls = x.used === 0 ? 'invented' : x.backedOff ? 'short' : '';
        const why = x.used === 0 ? 'Contexto nunca visto: escolhido pela frequência geral' : x.backedOff ? 'Parte do contexto nunca foi vista: o modelo usou um contexto menor' : `Chance no sorteio: ${pct(x.p, 0)}`;
        return `<span class="tk-chip ${cls}${x.manual ? ' manual' : ''}" title="${why}${x.manual ? ' (escolhido por você)' : ''}">${show(x.token)}</span>`;
      })
      .join('');
    this.textEl.querySelector('#gen-line').innerHTML = `${given}${made}${d.finished ? '' : '<span class="caret" aria-hidden="true"></span>'}`;
    const invented = s.steps.some((x) => x.used === 0);
    const short = s.steps.some((x) => x.used > 0 && x.backedOff);
    this.textEl.querySelector('#gen-legend').innerHTML = [
      '<span><i class="lg given"></i>o que você escreveu</span>',
      '<span><i class="lg made"></i>o que o modelo sorteou</span>',
      invented || short ? '<span><i class="lg invented"></i>contexto nunca visto <button type="button" class="q" data-tip="recuo" aria-label="Explicar o contexto nunca visto">?</button></span>' : '',
    ].join('');
    this.renderNext(s);
  }

  renderNext(s) {
    const d = s.derived;
    const context = d.seen.context.filter((t) => t !== BOS);
    const after = d.seen.used === 0 ? 'sem reconhecer o contexto' : context.length ? `depois de ${context.map((t) => `<b class="tk">${show(t)}</b>`).join(' ')}` : 'no começo de uma frase';
    let body;
    if (d.finished) {
      body = s.steps.at(-1)?.token === EOS
        ? '<p class="gen-empty">A frase terminou: o modelo sorteou o token de fim. Troque a semente para outra frase ou use <b>Apagar</b> para recomeçar.</p>'
        : `<p class="gen-empty">O modelo escreveu ${s.steps.length} tokens sem sortear o fim da frase. Com pouca variedade no sorteio ele pode ficar preso num ciclo, repetindo o mesmo trecho. Aumente a temperatura ou use <b>Apagar</b>.</p>`;
    } else if (!d.dist.length) {
      body = '<p class="gen-empty">O texto de treino está vazio. Escolha ou cole um texto em <b>Trocar texto</b>.</p>';
    } else {
      const shown = d.dist.slice(0, MAX_BARS);
      const rest = d.dist.slice(MAX_BARS);
      const widest = Math.max(...shown.map((x) => Math.max(x.p, x.base)));
      const row = (x) => `
        <li><button type="button" class="nt-row ${x.kept ? '' : 'cut'}" data-token="${escapeHtml(x.token)}" ${x.kept ? '' : 'disabled'} title="${x.kept ? 'Escolher este token à mão' : 'Fora do sorteio pelos ajustes atuais'}">
          <span class="nt-token">${show(x.token)}</span>
          <span class="nt-track"><span class="nt-base" style="width:${((x.base / widest) * 100).toFixed(1)}%"></span><span class="nt-fill" style="width:${((x.p / widest) * 100).toFixed(1)}%"></span></span>
          <span class="nt-val">${x.kept ? pct(x.p, 0) : 'fora'}</span>
        </button></li>`;
      body = `<ol class="nt-list">${shown.map(row).join('')}</ol>
        ${rest.length ? `<p class="nt-rest">e mais ${rest.length} ${rest.length === 1 ? 'token' : 'tokens'}, com ${pct(rest.reduce((sum, x) => sum + x.p, 0), 0)} de chance somada</p>` : ''}
        <p class="nt-key"><span><i class="nt-k fill"></i>chance no sorteio</span><span><i class="nt-k base"></i>pela contagem pura</span><span>clique numa barra para escolher você mesmo</span></p>`;
    }
    keepFocus(this.nextEl, () => {
      this.nextEl.innerHTML = `
        <header class="gen-head"><h3>Próximo token <button type="button" class="q" data-tip="distribuicao" aria-label="Explicar a distribuição do próximo token">?</button></h3>
          <p>${after}${d.finished || !d.dist.length ? '' : ` · ${d.kept} de ${d.dist.length} no sorteio`}</p></header>
        ${body}`;
    });
  }
}
