// Barra de sorteio: gerar, apagar e os ajustes que todo LLM comercial também expõe.
// Os controles são desenhados uma vez só: redesenhar um controle deslizante enquanto ele é arrastado solta o dedo da pessoa.
import { num } from '../../util.js';

const help = (tip, label) => `<button type="button" class="q" data-tip="${tip}" aria-label="${label}">?</button>`;

// O "?" fica fora do rótulo: dentro dele, o rótulo passaria a nomear o botão de ajuda em vez do controle.
const range = (key, label, tip, min, max, stepSize) => `
      <div class="ctl"><label for="set-${key}">${label}</label> ${help(tip, `Explicar: ${label}`)}
        <input type="range" id="set-${key}" data-set="${key}" min="${min}" max="${max}" step="${stepSize}"><output data-out="${key}" for="set-${key}"></output></div>`;

export class SamplerBar {
  constructor(el, store, { onStep, onRun, onClear, onSetting, onSeed }) {
    this.el = el;
    el.innerHTML = `
      <div class="sim-main">
        <button type="button" class="btn btn-primary" data-step><span class="ico" aria-hidden="true">▶</span>Sortear próximo</button>
        <button type="button" class="btn" data-run>Gerar frase</button>
        <button type="button" class="btn btn-quiet" data-clear>Apagar</button>
      </div>
      ${range('temperature', 'Temperatura', 'temperatura', 0, 2, 0.1)}
      ${range('topK', 'Top-k', 'topk', 0, 10, 1)}
      ${range('topP', 'Top-p', 'topp', 0.05, 1, 0.05)}
      <div class="ctl">Contexto ${help('contexto', 'Explicar a janela de contexto')}
        <div class="seg" role="group" aria-label="Tamanho do contexto, em tokens">${[1, 2, 3].map((n) => `<button type="button" data-order="${n}">${n}</button>`).join('')}</div></div>
      <div class="ctl">Token ${help('token', 'Explicar o que é um token')}
        <div class="seg" role="group" aria-label="O que conta como token"><button type="button" data-mode="word">palavra</button><button type="button" data-mode="char">letra</button></div></div>
      <div class="ctl sim-tick">semente <b data-out="seed"></b> ${help('semente', 'Explicar a semente')}
        <button type="button" class="text-btn" data-seed>Nova semente</button></div>`;

    el.addEventListener('input', (e) => {
      const key = e.target.dataset.set;
      if (key) onSetting(key, +e.target.value);
    });
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-step]')) onStep();
      else if (e.target.closest('[data-run]')) onRun();
      else if (e.target.closest('[data-clear]')) onClear();
      else if (e.target.closest('[data-seed]')) onSeed();
      else if (e.target.dataset.order) onSetting('order', +e.target.dataset.order);
      else if (e.target.dataset.mode) onSetting('mode', e.target.dataset.mode);
    });
    store.subscribe((s) => this.sync(s));
  }

  sync(s) {
    const { settings } = s;
    const out = (key, text) => (this.el.querySelector(`[data-out="${key}"]`).textContent = text);
    for (const input of this.el.querySelectorAll('[data-set]')) {
      // Quem está arrastando manda: escrever no controle em uso brigaria com o dedo.
      if (document.activeElement !== input || +input.value !== settings[input.dataset.set]) input.value = settings[input.dataset.set];
    }
    out('temperature', num(settings.temperature, 1));
    out('topK', settings.topK ? String(settings.topK) : 'todos');
    out('topP', settings.topP >= 1 ? 'tudo' : num(settings.topP, 2));
    out('seed', String(settings.seed));
    for (const b of this.el.querySelectorAll('[data-order]')) {
      const on = +b.dataset.order === settings.order;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on);
    }
    for (const b of this.el.querySelectorAll('[data-mode]')) {
      const on = b.dataset.mode === settings.mode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on);
    }
    this.el.querySelector('[data-step]').disabled = s.derived.finished || !s.derived.dist.length;
    this.el.querySelector('[data-run]').disabled = !s.derived.model.tokens;
    this.el.querySelector('[data-clear]').disabled = !s.steps.length;
  }
}
