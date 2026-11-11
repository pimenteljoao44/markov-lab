// Página da trilha: as fases, o que fazer em cada módulo e quanto já foi feito.
// A lista é desenhada uma vez; marcar um item atualiza só os números, para não tirar o foco de quem está escrevendo.
import { escapeHtml } from '../util.js';
import { PHASES, KINDS } from './syllabus.js';
import { LABS } from './labs.js';
import { loadTrail, saveTrail, itemProgress, labProgress, phaseProgress, overallProgress, nextStep, exportAll, importAll, MIN_EXPLAIN } from './progress.js';
import { toast } from '../components/Toast.js';

const titleOf = (item) => (item.kind === 'lab' ? LABS[item.lab].title : item.title);
const percent = (fraction) => `${Math.round(fraction * 100)}%`;

export class Trail {
  constructor(listEl, sideEl) {
    Object.assign(this, { listEl, sideEl });
    this.trail = loadTrail();
    this.saveTimer = null;
    this.render();
    listEl.addEventListener('change', (e) => {
      if (e.target.matches('[data-check]')) this.setCheck(e.target.dataset.check, e.target.checked);
    });
    listEl.addEventListener('input', (e) => {
      if (e.target.matches('[data-note]')) this.setNote(e.target.dataset.note, e.target.value);
    });
    sideEl.addEventListener('click', (e) => this.onSideClick(e));
    sideEl.addEventListener('change', (e) => {
      if (e.target.matches('[data-import]')) this.importFile(e.target);
    });
    // Voltar de um laboratório ou mexer em outra aba: os números precisam acompanhar.
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) this.reload();
    });
    window.addEventListener('storage', () => this.reload());
    window.addEventListener('pagehide', () => this.flush());
  }

  reload() {
    this.flush();
    this.trail = loadTrail();
    this.render();
  }

  // ── desenho
  render() {
    this.listEl.innerHTML = PHASES.map((phase) => this.phaseHtml(phase)).join('');
    this.refresh();
  }

  phaseHtml(phase) {
    return `<li class="phase" data-phase="${phase.id}" style="--c:var(--ph${phase.num});--c-ink:var(--ph${phase.num}-ink)">
      <header class="ph-head">
        <span class="ph-num" aria-hidden="true">${phase.num}</span>
        <div class="ph-title"><h3><span class="sr">Fase ${phase.num}: </span>${escapeHtml(phase.title)}</h3><p>${escapeHtml(phase.goal)}</p></div>
        <div class="ph-prog"><div class="ch-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso da fase ${phase.num}"><div class="ch-fill"></div></div><span data-phase-count></span></div>
      </header>
      <p class="ph-deliver"><b>Ao final:</b> ${escapeHtml(phase.deliverable)}</p>
      <div class="modules">${phase.modules.map((m) => this.moduleHtml(m)).join('')}</div>
    </li>`;
  }

  moduleHtml(module) {
    return `<article class="module" data-module="${module.id}">
      <h4>${escapeHtml(module.title)}</h4>
      <p class="problem"><b>O problema</b>${escapeHtml(module.problem)}</p>
      <ul class="items">${module.items.map((item) => this.itemHtml(item)).join('')}</ul>
    </article>`;
  }

  itemHtml(item) {
    const kind = `<span class="kind" data-kind="${item.kind}">${KINDS[item.kind]}</span>`;
    const open = `<li class="item" data-item="${item.id}" data-kind="${item.kind}">${kind}<div class="it-body">`;
    if (item.kind === 'lab') {
      const lab = LABS[item.lab];
      const action = lab.href
        ? `<a class="btn btn-sm btn-marker" href="${lab.href}" data-open>Abrir</a>`
        : '<span class="planned">em construção</span>';
      return `${open}<b>${escapeHtml(lab.title)}</b><small>${escapeHtml(lab.blurb)}</small>${lab.href ? '<small class="it-count" data-lab-count></small>' : ''}</div>${action}</li>`;
    }
    if (item.kind === 'explica') {
      const id = `note-${item.id}`;
      return `${open}<label for="${id}"><b>${escapeHtml(item.title)}</b></label>
        <textarea id="${id}" class="field area" rows="3" maxlength="4000" data-note="${item.id}" placeholder="Com as suas palavras, sem consultar.">${escapeHtml(this.trail.notes[item.id] || '')}</textarea>
        <small class="it-count" data-note-count></small></div></li>`;
    }
    const id = `check-${item.id}`;
    const title = item.href
      ? `<a href="${escapeHtml(item.href)}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>`
      : `<b>${escapeHtml(item.title)}</b>`;
    return `${open}${title}${item.note ? `<small>${escapeHtml(item.note)}</small>` : ''}</div>
      <label class="it-check" for="${id}"><input type="checkbox" id="${id}" data-check="${item.id}" ${this.trail.checks.has(item.id) ? 'checked' : ''}><span>${item.kind === 'entrega' || item.kind === 'pratica' ? 'Feito' : 'Visto'}</span></label></li>`;
  }

  /** Atualiza números, barras e a ficha lateral sem redesenhar a lista. */
  refresh() {
    for (const phase of PHASES) {
      const el = this.listEl.querySelector(`[data-phase="${phase.id}"]`);
      const p = phaseProgress(phase, this.trail);
      el.querySelector('.ch-fill').style.width = percent(p.fraction);
      el.querySelector('.ch-progress').setAttribute('aria-valuenow', Math.round(p.fraction * 100));
      el.querySelector('[data-phase-count]').textContent = percent(p.fraction);
      el.classList.toggle('complete', p.total > 0 && p.fraction === 1);
      for (const module of phase.modules) {
        for (const item of module.items) this.refreshItem(item);
      }
    }
    this.renderSide();
  }

  refreshItem(item) {
    const el = this.listEl.querySelector(`[data-item="${item.id}"]`);
    el.classList.toggle('done', itemProgress(item, this.trail) === 1);
    if (item.kind === 'lab' && LABS[item.lab].href) {
      const { done, total } = labProgress(item.lab);
      el.querySelector('[data-lab-count]').textContent = `${done} de ${total} ${LABS[item.lab].counts} concluídos`;
    }
    if (item.kind === 'explica') {
      const length = (this.trail.notes[item.id] || '').trim().length;
      el.querySelector('[data-note-count]').textContent =
        length >= MIN_EXPLAIN ? 'Guardado neste navegador.' : length ? `Mais ${MIN_EXPLAIN - length} caracteres para contar como explicado.` : `Pelo menos ${MIN_EXPLAIN} caracteres. Fica guardado só neste navegador.`;
    }
  }

  renderSide() {
    const total = overallProgress(this.trail);
    const next = nextStep(this.trail);
    const nextHtml = next
      ? `<p class="next-label">Próximo passo</p>
         <p class="next-title"><span class="kind" data-kind="${next.item.kind}">${KINDS[next.item.kind]}</span> ${escapeHtml(titleOf(next.item))}</p>
         <p class="card-sub">Fase ${next.phase.num} · ${escapeHtml(next.module.title)}</p>
         <button type="button" class="btn btn-primary btn-flat" data-goto="${next.item.id}">Ir para lá</button>`
      : '<p class="next-title">Trilha concluída.</p><p class="card-sub">Volte aos laboratórios quando um problema novo aparecer no trabalho.</p>';
    this.sideEl.innerHTML = `
      <section class="card">
        <div class="card-head"><h2>Onde você está</h2><span class="total-pct">${percent(total.fraction)}</span></div>
        <div class="ch-progress wide" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(total.fraction * 100)}" aria-label="Progresso da trilha"><div class="ch-fill" style="width:${percent(total.fraction)}"></div></div>
        ${nextHtml}
      </section>
      <section class="card">
        <div class="card-head"><h2>Como estudar aqui</h2></div>
        <ol class="method">
          <li><b>Comece pelo problema.</b> Cada módulo abre com uma pergunta de trabalho. Tente responder antes de estudar.</li>
          <li><b>Assista e leia o mínimo.</b> O bastante para entrar no laboratório sabendo o nome das coisas.</li>
          <li><b>Mexa até conseguir prever.</b> Antes de cada clique, diga o que vai acontecer. Errou a previsão: achou o que estudar.</li>
          <li><b>Explique por escrito.</b> Sem consultar. Onde a explicação travar, o entendimento também travou.</li>
        </ol>
      </section>
      <section class="card">
        <div class="card-head"><h2>Seu progresso é seu</h2></div>
        <p class="card-sub">Tudo fica guardado só neste navegador. Guarde uma cópia de vez em quando: limpar os dados do navegador apaga o caderno.</p>
        <div class="tool-row">
          <button type="button" class="btn btn-sm" data-export>Guardar cópia</button>
          <label class="btn btn-sm btn-quiet">Abrir cópia<input type="file" accept="application/json,.json" data-import hidden></label>
        </div>
      </section>`;
  }

  // ── mudanças
  setCheck(id, on) {
    if (on) this.trail.checks.add(id);
    else this.trail.checks.delete(id);
    saveTrail(this.trail);
    this.refresh();
  }

  setNote(id, text) {
    this.trail.notes[id] = text;
    this.refresh();
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 400);
  }

  /** Fechar a página logo depois de escrever não pode perder o texto. */
  flush() {
    if (this.saveTimer === null) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    saveTrail(this.trail);
  }

  onSideClick(e) {
    const go = e.target.closest('[data-goto]');
    if (go) {
      const el = this.listEl.querySelector(`[data-item="${go.dataset.goto}"]`);
      el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      (el.querySelector('[data-open], textarea, a, input') || el).focus({ preventScroll: true });
      el.classList.add('spot');
      setTimeout(() => el.classList.remove('spot'), 1800);
      return;
    }
    if (e.target.closest('[data-export]')) this.exportFile();
  }

  exportFile() {
    this.flush();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(exportAll(), null, 2)], { type: 'application/json' }));
    a.download = 'caderno-de-ia.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Cópia guardada', { type: 'ok', sub: 'caderno-de-ia.json, na pasta de downloads.' });
  }

  async importFile(input) {
    const file = input.files[0];
    input.value = '';
    if (!file) return;
    try {
      importAll(JSON.parse(await file.text()));
      this.saveTimer = null; // o que estava por salvar foi substituído pela cópia
      this.trail = loadTrail();
      this.render();
      toast('Cópia aberta', { type: 'ok', sub: 'O progresso deste navegador foi substituído pelo do arquivo.' });
    } catch (e) {
      toast('Não foi possível abrir a cópia', { type: 'warn', sub: e instanceof SyntaxError ? 'Este arquivo não é um JSON válido.' : e.message });
    }
  }
}
