// Página da trilha: as fases, o que fazer em cada módulo e quanto já foi feito.
// A lista é desenhada uma vez; marcar um item atualiza só os números, para não tirar o foco de quem está escrevendo.
import { escapeHtml, keepFocus } from '../util.js';
import { PHASES, KINDS } from './syllabus.js';
import { LABS } from './labs.js';
import {
  loadTrail, saveTrail, itemProgress, labProgress, phaseProgress, overallProgress, nextStep,
  exportAll, importAll, notesMarkdown, MIN_EXPLAIN, TRAIL_UI_KEY,
} from './progress.js';
import { toast } from '../components/Toast.js';

const titleOf = (item) => (item.kind === 'lab' ? LABS[item.lab].title : item.title);
const percent = (fraction) => `${Math.round(fraction * 100)}%`;
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const phaseColors = (phase) => `--c:var(--ph${phase.num});--c-ink:var(--ph${phase.num}-ink)`;

/**
 * Preferências de exibição, guardadas à parte do progresso (e fora da cópia de segurança):
 * quais fases a pessoa abriu ou fechou à mão, e quando ela guardou a última cópia neste computador.
 * Sem escolha, só a fase do próximo passo abre.
 */
function loadUi() {
  try {
    const saved = JSON.parse(localStorage.getItem(TRAIL_UI_KEY)) || {};
    const open = {};
    for (const phase of PHASES) if (typeof saved.open?.[phase.id] === 'boolean') open[phase.id] = saved.open[phase.id];
    return { open, backupAt: Number.isFinite(saved.backupAt) ? saved.backupAt : 0 };
  } catch {
    return { open: {}, backupAt: 0 };
  }
}

function saveUi(ui) {
  try {
    localStorage.setItem(TRAIL_UI_KEY, JSON.stringify(ui));
  } catch {
    /* armazenamento indisponível: a escolha vale até fechar a página */
  }
}

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export class Trail {
  constructor(listEl, sideEl, toolsEl) {
    Object.assign(this, { listEl, sideEl, toolsEl });
    this.trail = loadTrail();
    this.ui = loadUi();
    this.choices = this.ui.open;
    this.saveTimer = null;
    this.render();
    listEl.addEventListener('change', (e) => {
      if (e.target.matches('[data-check]')) this.setCheck(e.target.dataset.check, e.target.checked);
    });
    listEl.addEventListener('input', (e) => {
      if (e.target.matches('[data-note]')) this.setNote(e.target.dataset.note, e.target.value);
    });
    listEl.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-toggle]');
      if (toggle) this.setOpen(toggle.dataset.toggle, !this.open[toggle.dataset.toggle]);
    });
    toolsEl?.addEventListener('click', (e) => {
      if (e.target.closest('[data-all]')) this.setAllOpen(!this.allOpen());
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
    this.ui = loadUi();
    this.choices = this.ui.open;
    this.render();
  }

  // ── desenho
  render() {
    // Quarenta e tantos itens abertos de uma vez escondem o que importa: só a fase em andamento abre sozinha.
    // A conta é feita ao desenhar, não a cada item marcado, para a fase não fechar debaixo de quem a concluiu.
    const current = nextStep(this.trail)?.phase.id;
    this.open = Object.fromEntries(PHASES.map((phase) => [phase.id, this.choices[phase.id] ?? phase.id === current]));
    this.listEl.innerHTML = PHASES.map((phase) => this.phaseHtml(phase)).join('');
    this.syncTools();
    this.refresh();
  }

  phaseHtml(phase) {
    const open = this.open[phase.id];
    return `<li class="phase ${open ? '' : 'closed'}" data-phase="${phase.id}" style="${phaseColors(phase)}">
      <header class="ph-head">
        <span class="ph-num" aria-hidden="true">${phase.num}</span>
        <div class="ph-title">
          <h3><button type="button" class="ph-toggle" data-toggle="${phase.id}" aria-expanded="${open}" aria-controls="body-${phase.id}"><span class="chev" aria-hidden="true"></span><span class="sr">Fase ${phase.num}: </span>${escapeHtml(phase.title)}</button></h3>
          <p>${escapeHtml(phase.goal)}</p>
        </div>
        <div class="ph-prog"><div class="ch-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso da fase ${phase.num}"><div class="ch-fill"></div></div><span data-phase-count></span></div>
      </header>
      <p class="ph-deliver"><b>Ao final:</b> ${escapeHtml(phase.deliverable)}</p>
      <div class="modules" id="body-${phase.id}" ${open ? '' : 'hidden'}>${phase.modules.map((m) => this.moduleHtml(m)).join('')}</div>
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
      const el = this.phaseEl(phase.id);
      const p = phaseProgress(phase, this.trail);
      el.querySelector('.ch-fill').style.width = percent(p.fraction);
      el.querySelector('.ch-progress').setAttribute('aria-valuenow', Math.round(p.fraction * 100));
      el.querySelector('[data-phase-count]').textContent = percent(p.fraction);
      el.classList.toggle('complete', p.total > 0 && p.fraction === 1);
      for (const module of phase.modules) {
        for (const item of module.items) this.refreshItem(item);
      }
    }
    const next = nextStep(this.trail);
    this.markNext(next);
    this.renderSide(next);
  }

  refreshItem(item) {
    const el = this.itemEl(item.id);
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

  /** Marca na lista o item do próximo passo, para ele ser achado sem ler tudo de novo. */
  markNext(next) {
    const old = this.listEl.querySelector('.item.next');
    old?.classList.remove('next');
    old?.removeAttribute('aria-current');
    if (!next) return;
    const el = this.itemEl(next.item.id);
    el.classList.add('next');
    el.setAttribute('aria-current', 'step');
  }

  renderSide(next) {
    const total = overallProgress(this.trail);
    const index = PHASES.map((phase) => {
      const p = phaseProgress(phase, this.trail);
      const done = p.total > 0 && p.fraction === 1;
      return `<li><button type="button" class="idx-row ${done ? 'done' : ''} ${next?.phase.id === phase.id ? 'current' : ''}" data-phase-go="${phase.id}" style="${phaseColors(phase)}">
        <span class="idx-num" aria-hidden="true">${done ? '✓' : phase.num}</span>
        <span class="idx-title"><span class="sr">Fase ${phase.num}: </span>${escapeHtml(phase.title)}</span>
        <span class="idx-pct">${percent(p.fraction)}</span></button></li>`;
    }).join('');
    const html = `
      <section class="card">
        <div class="card-head"><h2>Onde você está</h2><span class="total-pct">${percent(total.fraction)}</span></div>
        <div class="ch-progress wide" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(total.fraction * 100)}" aria-label="Progresso da trilha"><div class="ch-fill" style="width:${percent(total.fraction)}"></div></div>
        ${this.nextHtml(next)}
        <ol class="idx" aria-label="Ir para uma fase">${index}</ol>
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
        ${this.backupHtml()}
        <div class="tool-row">
          <button type="button" class="btn btn-sm" data-export>Guardar cópia</button>
          <label class="btn btn-sm btn-quiet">Abrir cópia<input type="file" accept="application/json,.json" data-import hidden></label>
        </div>
        <p class="card-sub notes-sub">O que você escreveu em cada “Explique” também sai como um documento só, para ler ou imprimir.</p>
        <div class="tool-row"><button type="button" class="btn btn-sm" data-notes>Baixar minhas explicações</button></div>
      </section>`;
    keepFocus(this.sideEl, () => {
      this.sideEl.innerHTML = html;
    });
  }

  nextHtml(next) {
    if (!next) return '<p class="next-title">Trilha concluída.</p><p class="card-sub">Volte aos laboratórios quando um problema novo aparecer no trabalho.</p>';
    const lab = next.item.kind === 'lab' ? LABS[next.item.lab] : null;
    // Quando o próximo passo é um laboratório, o clique mais provável é abri-lo: ele vem primeiro.
    const actions = lab
      ? `<a class="btn btn-primary btn-flat" href="${lab.href}" data-next-open>Abrir o laboratório</a>
         <button type="button" class="btn btn-quiet" data-goto="${next.item.id}">Ver na trilha</button>`
      : `<button type="button" class="btn btn-primary btn-flat" data-goto="${next.item.id}">Ir para lá</button>`;
    return `<p class="next-label">Próximo passo</p>
      <p class="next-title"><span class="kind" data-kind="${next.item.kind}">${KINDS[next.item.kind]}</span> ${escapeHtml(titleOf(next.item))}</p>
      <p class="card-sub">Fase ${next.phase.num} · ${escapeHtml(next.module.title)}</p>
      <div class="tool-row next-actions">${actions}</div>`;
  }

  /** Diz quando foi a última cópia e cutuca, sem exagero, quando já há trabalho a perder. */
  backupHtml() {
    const { backupAt } = this.ui;
    const touched = overallProgress(this.trail).done > 0 || Object.values(this.trail.notes).some((t) => t.trim());
    let text = 'Nada para guardar ainda.';
    let warn = false;
    if (!backupAt && touched) {
      text = 'Você ainda não guardou uma cópia.';
      warn = true;
    } else if (backupAt) {
      const days = Math.max(0, Math.floor((Date.now() - backupAt) / 86400000));
      text = `Última cópia guardada ${days === 0 ? 'hoje' : days === 1 ? 'ontem' : `há ${days} dias`}.`;
      warn = days >= 14 && touched;
    }
    return `<p class="backup-note ${warn ? 'warn' : ''}" role="status">${text}${warn ? ' Vale guardar agora.' : ''}</p>`;
  }

  phaseEl(id) {
    return this.listEl.querySelector(`[data-phase="${id}"]`);
  }

  itemEl(id) {
    return this.listEl.querySelector(`[data-item="${id}"]`);
  }

  // ── abrir e fechar fases
  /** `remember` guarda a escolha para a próxima visita; ir até um item abre a fase só por agora. */
  setOpen(id, on, remember = true) {
    this.open[id] = on;
    const el = this.phaseEl(id);
    el.classList.toggle('closed', !on);
    el.querySelector('.modules').hidden = !on;
    el.querySelector('[data-toggle]').setAttribute('aria-expanded', String(on));
    if (remember) {
      this.choices[id] = on;
      saveUi(this.ui);
    }
    this.syncTools();
  }

  allOpen() {
    return PHASES.every((phase) => this.open[phase.id]);
  }

  setAllOpen(on) {
    for (const phase of PHASES) this.setOpen(phase.id, on);
  }

  syncTools() {
    const button = this.toolsEl?.querySelector('[data-all]');
    if (button) button.textContent = this.allOpen() ? 'Recolher todas as fases' : 'Abrir todas as fases';
  }

  // ── mudanças
  completedPhases() {
    return PHASES.filter((phase) => {
      const p = phaseProgress(phase, this.trail);
      return p.total > 0 && p.fraction === 1;
    }).map((phase) => phase.id);
  }

  /** Fechar uma fase é o marco da trilha: avisa na hora em que acontece. */
  celebrate(before) {
    const phase = PHASES.find((p) => !before.includes(p.id) && this.completedPhases().includes(p.id));
    if (phase) toast(`Fase ${phase.num} concluída`, { type: 'ok', sub: `Você chegou ao combinado: ${phase.deliverable}`, timeout: 7000 });
  }

  setCheck(id, on) {
    const before = this.completedPhases();
    if (on) this.trail.checks.add(id);
    else this.trail.checks.delete(id);
    this.persist();
    this.refresh();
    this.celebrate(before);
  }

  setNote(id, text) {
    const before = this.completedPhases();
    this.trail.notes[id] = text;
    this.refresh();
    this.celebrate(before);
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 400);
  }

  /** Fechar a página logo depois de escrever não pode perder o texto. */
  flush() {
    if (this.saveTimer === null) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.persist();
  }

  /** Quando o navegador não deixa guardar (janela anônima, dados desligados), a pessoa precisa saber antes de perder. */
  persist() {
    if (saveTrail(this.trail) || this.warnedStorage) return;
    this.warnedStorage = true;
    toast('Não consegui guardar o seu progresso', {
      type: 'warn',
      sub: 'O navegador bloqueou o armazenamento (janela anônima ou dados desligados). Guarde uma cópia antes de fechar a página.',
      timeout: 10000,
    });
  }

  // ── navegação
  scrollTo(el) {
    el.scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' });
  }

  goToItem(id) {
    const el = this.itemEl(id);
    this.setOpen(el.closest('[data-phase]').dataset.phase, true, false);
    this.scrollTo(el);
    (el.querySelector('[data-open], textarea, a, input') || el).focus({ preventScroll: true });
    el.classList.add('spot');
    setTimeout(() => el.classList.remove('spot'), 1800);
  }

  goToPhase(id) {
    this.setOpen(id, true, false);
    const el = this.phaseEl(id);
    el.scrollIntoView({ block: 'start', behavior: calm() ? 'auto' : 'smooth' });
    el.querySelector('[data-toggle]').focus({ preventScroll: true });
  }

  onSideClick(e) {
    const go = e.target.closest('[data-goto]');
    if (go) return this.goToItem(go.dataset.goto);
    const phase = e.target.closest('[data-phase-go]');
    if (phase) return this.goToPhase(phase.dataset.phaseGo);
    if (e.target.closest('[data-export]')) return this.exportFile();
    if (e.target.closest('[data-notes]')) return this.exportNotes();
  }

  // ── cópias
  exportFile() {
    this.flush();
    download('caderno-de-ia.json', JSON.stringify(exportAll(), null, 2), 'application/json');
    this.ui.backupAt = Date.now();
    saveUi(this.ui);
    this.refresh();
    toast('Cópia guardada', { type: 'ok', sub: 'caderno-de-ia.json, na pasta de downloads.' });
  }

  exportNotes() {
    const text = notesMarkdown(this.trail);
    if (!text) {
      toast('Ainda não há explicações escritas', { sub: 'Cada módulo termina com um “Explique”. O que você escrever lá aparece aqui.' });
      return;
    }
    download('minhas-explicacoes.md', text, 'text/markdown');
    toast('Explicações baixadas', { type: 'ok', sub: 'minhas-explicacoes.md, na pasta de downloads.' });
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
