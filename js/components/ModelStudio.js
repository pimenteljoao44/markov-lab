// Tudo que cria ou troca o modelo: galeria, edição de nomes e o assistente "Modelar meu problema".
import { getState, actions } from '../store.js';
import { escapeHtml, MAX_STATES, PALETTE, normalizeRow, fmtP } from '../util.js';
import { pluralPt, vocab } from '../vocab.js';
import { makeChain } from '../models/chain.js';
import { GROUPS, modelsForLevel, buildModel } from '../models/catalog.js';
import { parseSequences, estimateChain, parseTable } from '../math/estimate.js';

const IDEAS = [
  { name: 'Clientes de uma loja', unit: 'cliente', step: 'mês', states: ['Novo', 'Frequente', 'Sumido', 'Perdido'] },
  { name: 'Alunos de um curso', unit: 'aluno', step: 'semestre', states: ['Cursando', 'Trancado', 'Formado', 'Desistiu'] },
  { name: 'Pacientes de uma clínica', unit: 'paciente', step: 'semana', states: ['Saudável', 'Doente', 'Internado', 'Recuperado'] },
  { name: 'Peças numa fábrica', unit: 'peça', step: 'etapa', states: ['Produção', 'Inspeção', 'Retrabalho', 'Aprovada', 'Descartada'] },
  { name: 'Usuários de um app', unit: 'usuário', step: 'semana', states: ['Novo', 'Ativo', 'Inativo', 'Desinstalou'] },
  { name: 'Meu time no campeonato', unit: 'time', step: 'rodada', states: ['Ganhou', 'Empatou', 'Perdeu'] },
];

const SAMPLE_SEQ = `Ativo, Ativo, Ativo, Pausado, Ativo, Cancelou
Novo, Ativo, Ativo, Ativo, Ativo, Ativo, Pausado, Pausado, Ativo
Novo, Ativo, Pausado, Cancelou
Novo, Cancelou
Ativo, Ativo, Pausado, Ativo, Ativo, Ativo, Cancelou
Novo, Ativo, Ativo, Ativo, Pausado, Pausado, Pausado, Cancelou`;

const SAMPLE_TABLE = `\tBom\tRegular\tRuim
Bom\t70\t25\t5
Regular\t30\t50\t20
Ruim\t10\t40\t50`;

const dialog = (cls, label) => {
  const d = document.createElement('dialog');
  d.className = `studio ${cls}`;
  d.setAttribute('aria-label', label);
  document.body.appendChild(d);
  d.addEventListener('click', (e) => {
    if (e.target === d || e.target.closest('[data-close]')) d.close();
  });
  return d;
};

const closeBtn = '<button type="button" class="dlg-x" data-close aria-label="Fechar">×</button>';

export class ModelStudio {
  /** onCreate(chain): o modelo novo vai para o Sandbox. */
  constructor({ onCreate }) {
    this.onCreate = onCreate;
    this.gallery = dialog('gallery', 'Trocar modelo');
    this.editor = dialog('editor', 'Editar nomes do modelo');
    this.wizard = dialog('wizard', 'Modelar meu problema');
    this.bindGallery();
    this.bindEditor();
    this.bindWizard();
  }

  // ───────── Galeria ─────────
  openGallery() {
    const s = getState();
    const level = s.meta.level;
    const list = modelsForLevel(level);
    const groups = GROUPS.map((g) => [g, list.filter((m) => m.group === g)]).filter(([, m]) => m.length);
    const note = level < 3
      ? `<p class="dlg-sub">Este nível usa exemplos com ${level === 1 ? '2' : '3'} estados: a lição é a mesma em qualquer assunto. Modelos maiores estão no Sandbox.</p>`
      : `<p class="dlg-sub">Os números são ilustrativos. Abra um, troque os valores e faça dele o seu.</p>`;
    this.gallery.innerHTML = `
      <header class="dlg-head"><h2>Trocar modelo</h2>${closeBtn}</header>
      ${note}
      <div class="dlg-body">
        ${groups
          .map(
            ([g, items]) => `<section class="gal-group"><h3>${escapeHtml(g)}</h3><div class="gal-grid">${items
              .map(
                (m) => `<button type="button" class="gal-card" data-model="${m.id}">
                  <b>${escapeHtml(m.name)}</b>
                  <span>${escapeHtml(m.blurb)}</span>
                  <small>${m.labels.map(escapeHtml).join(' · ')}</small>
                </button>`
              )
              .join('')}</div></section>`
          )
          .join('')}
      </div>`;
    this.gallery.showModal();
  }

  bindGallery() {
    this.gallery.addEventListener('click', (e) => {
      const c = e.target.closest('[data-model]');
      if (!c) return;
      actions.loadChain(buildModel(c.dataset.model));
      this.gallery.close();
    });
  }

  // ───────── Editar nomes ─────────
  openEditor() {
    const { chain } = getState();
    const v = vocab(chain);
    this.editor.innerHTML = `
      <header class="dlg-head"><h2>Editar nomes</h2>${closeBtn}</header>
      <p class="dlg-sub">Dê a este modelo os nomes do seu problema. Os balões, os desafios e a simulação passam a usar essas palavras.</p>
      <form class="dlg-body form" method="dialog">
        <label>Nome do modelo <input class="field" name="title" maxlength="60" value="${escapeHtml(v.title)}" required></label>
        <div class="form-2">
          <label>Cada bolinha é 1… <input class="field" name="unit" maxlength="24" value="${escapeHtml(v.unit)}" required></label>
          <label>Cada passo é 1… <input class="field" name="step" maxlength="24" value="${escapeHtml(v.step)}" required></label>
        </div>
        <fieldset><legend>Estados</legend><div class="form-2">
          ${chain.states.map((st, i) => `<label class="with-dot"><i class="dot" style="background:${st.color}"></i><input class="field" name="s${i}" maxlength="24" value="${escapeHtml(st.label)}" aria-label="Nome do estado ${i + 1}" required></label>`).join('')}
        </div></fieldset>
        <footer class="dlg-foot"><button type="button" class="btn btn-quiet" data-close>Cancelar</button><button type="submit" class="btn btn-primary btn-flat" value="save">Salvar nomes</button></footer>
      </form>`;
    this.editor.showModal();
  }

  bindEditor() {
    this.editor.addEventListener('submit', (e) => {
      const f = new FormData(e.target);
      const unit = f.get('unit').trim();
      const step = f.get('step').trim();
      const labels = getState().chain.states.map((_, i) => f.get(`s${i}`).trim());
      actions.editModel({ title: f.get('title').trim(), unit, units: pluralPt(unit), step, steps: pluralPt(step) }, labels);
    });
  }

  // ───────── Assistente ─────────
  openWizard(way = 'words') {
    this.w = {
      way,
      page: 1,
      title: '',
      unit: '',
      step: '',
      statesText: '',
      labels: [],
      weights: [],
      dataText: '',
      tableText: '',
      error: '',
    };
    this.renderWizard();
    this.wizard.showModal();
  }

  renderWizard() {
    const { way } = this.w;
    const tab = (id, label) => `<button type="button" class="wz-tab ${way === id ? 'active' : ''}" data-way="${id}" role="tab" aria-selected="${way === id}">${label}</button>`;
    const body = way === 'words' ? this.wordsPage() : way === 'data' ? this.dataPage() : this.tablePage();
    this.wizard.innerHTML = `
      <header class="dlg-head"><h2>Modelar meu problema</h2>${closeBtn}</header>
      <div class="wz-tabs" role="tablist" aria-label="Como você quer começar">
        ${tab('words', 'Descrever em palavras')}${tab('data', 'Tenho dados')}${tab('table', 'Colar uma tabela')}
      </div>
      <div class="dlg-body" data-wz-body>${body}</div>
      <footer class="dlg-foot" data-wz-foot>${this.wizardFoot()}</footer>`;
    if (way !== 'words') this.previewPaste();
    if (way === 'words' && this.w.page === 3) this.w.labels.forEach((_, i) => this.refreshStateCard(i));
  }

  vocabFields() {
    const { w } = this;
    return `<div class="form-3">
      <label>Nome do modelo <input class="field" data-f="title" maxlength="60" value="${escapeHtml(w.title)}" placeholder="Ex.: Clientes da academia"></label>
      <label>Quem se move? <input class="field" data-f="unit" maxlength="24" value="${escapeHtml(w.unit)}" placeholder="Ex.: cliente"></label>
      <label>Cada passo é 1… <input class="field" data-f="step" maxlength="24" value="${escapeHtml(w.step)}" placeholder="Ex.: mês"></label>
    </div>`;
  }

  wordsPage() {
    const { w } = this;
    const progress = `<ol class="wz-steps" aria-label="Etapas">
      ${['O problema', 'Os estados', 'As chances'].map((t, k) => `<li class="${w.page === k + 1 ? 'on' : w.page > k + 1 ? 'done' : ''}">${t}</li>`).join('')}
    </ol>`;
    if (w.page === 1) {
      return `${progress}
        <p class="wz-lead">O que muda de situação com o tempo no seu problema?</p>
        ${this.vocabFields()}
        <p class="wz-tip"><b>Como escolher o passo:</b> use o intervalo em que você observa mudanças. Passo curto demais deixa quase todo mundo parado; longo demais perde o que acontece no meio.</p>
        <p class="wz-idea-title">Sem ideia? Comece por um destes:</p>
        <div class="wz-ideas">${IDEAS.map((x, k) => `<button type="button" class="chip-btn" data-idea="${k}">${escapeHtml(x.name)}</button>`).join('')}</div>`;
    }
    const unit = escapeHtml(w.unit.trim() || 'bolinha');
    if (w.page === 2) {
      return `${progress}
        <label class="wz-lead" for="wz-states">Em que situações cada ${unit} pode estar? Escreva uma por linha.</label>
        <textarea id="wz-states" class="field area" data-f="statesText" rows="7" placeholder="Novo\nAtivo\nCancelou">${escapeHtml(w.statesText)}</textarea>
        <p class="wz-count" data-states-count></p>
        <p class="wz-tip"><b>A regra de ouro:</b> saber o estado atual precisa bastar para estimar o próximo passo. Se o passado importa, coloque-o no estado: “Ativo há pouco” e “Ativo há muito” viram dois estados.</p>
        <p class="wz-tip"><b>Sem sobreposição:</b> cada ${unit} está em um estado só, e os estados cobrem todos os casos.</p>`;
    }
    const step = escapeHtml(w.step.trim() || 'passo');
    return `${progress}
      <p class="wz-lead">Para cada estado: depois de 1 ${step}, para onde vai?</p>
      <p class="wz-tip">Não precisa ser exato: uma estimativa já serve para explorar, e você ajusta depois na matriz. O que sobra fica no próprio estado.</p>
      <div class="wz-cards">${w.labels.map((l, i) => this.stateCard(l, i, step)).join('')}</div>`;
  }

  stateCard(label, i, step) {
    const { labels, weights } = this.w;
    const color = PALETTE[i % PALETTE.length];
    const rows = labels
      .map((other, j) =>
        j === i
          ? ''
          : `<label class="wz-row"><span>vai para <b>${escapeHtml(other)}</b></span>
              <input type="range" min="0" max="100" step="1" value="${weights[i][j]}" data-w="${i}-${j}" aria-label="Chance de ${escapeHtml(label)} ir para ${escapeHtml(other)}">
              <output data-wo="${i}-${j}">${weights[i][j]}%</output></label>`
      )
      .join('');
    return `<section class="wz-card" data-card="${i}">
      <h4><i class="dot" style="background:${color}"></i>Quem está em <b>${escapeHtml(label)}</b>, depois de 1 ${step}…</h4>
      ${rows}
      <div class="wz-stack" data-stack="${i}" aria-hidden="true"></div>
      <p class="wz-stay" data-stay="${i}"></p>
      <button type="button" class="text-btn" data-even="${i}">dividir por igual</button>
    </section>`;
  }

  refreshStateCard(i) {
    const { labels, weights } = this.w;
    const stay = 100 - weights[i].reduce((a, b, j) => (j === i ? a : a + b), 0);
    weights[i][i] = stay;
    const stayEl = this.wizard.querySelector(`[data-stay="${i}"]`);
    if (!stayEl) return;
    stayEl.innerHTML = stay === 100
      ? `Fica em <b>${escapeHtml(labels[i])}</b>: 100%. <em>Quem chega aqui não sai: é um estado absorvente.</em>`
      : `Fica em <b>${escapeHtml(labels[i])}</b>: ${stay}%`;
    this.wizard.querySelector(`[data-stack="${i}"]`).innerHTML = weights[i]
      .map((w, j) => (w > 0 ? `<i style="width:${w}%;background:${PALETTE[j % PALETTE.length]}"></i>` : ''))
      .join('');
    labels.forEach((_, j) => {
      if (j === i) return;
      const inp = this.wizard.querySelector(`[data-w="${i}-${j}"]`);
      if (inp) inp.value = weights[i][j];
      const o = this.wizard.querySelector(`[data-wo="${i}-${j}"]`);
      if (o) o.textContent = `${weights[i][j]}%`;
    });
  }

  dataPage() {
    const { w } = this;
    return `<p class="wz-lead">Cole um histórico real: as chances saem da contagem de cada transição.</p>
      ${this.vocabFields()}
      <div class="wz-paste-head"><label for="wz-data">Sequência observada</label>
        <span><button type="button" class="text-btn" data-sample="data">usar exemplo</button>
        <label class="text-btn file-btn">abrir arquivo<input type="file" data-file accept=".csv,.txt,.tsv,text/plain,text/csv" hidden></label></span></div>
      <textarea id="wz-data" class="field area mono" data-f="dataText" rows="7" placeholder="Ativo, Ativo, Pausado, Ativo\nNovo, Ativo, Cancelou">${escapeHtml(w.dataText)}</textarea>
      <p class="wz-tip"><b>Formatos aceitos:</b> uma pessoa ou item por linha, com vírgulas ou setas; uma coluna de planilha, com um estado por linha; ou pares “de, para”. O arquivo é lido só no seu navegador: nada é enviado.</p>
      <div class="wz-preview" data-preview aria-live="polite"></div>`;
  }

  tablePage() {
    const { w } = this;
    return `<p class="wz-lead">Já tem a matriz, ou uma contagem de transições? Copie da planilha e cole aqui.</p>
      ${this.vocabFields()}
      <div class="wz-paste-head"><label for="wz-table">Tabela quadrada</label>
        <button type="button" class="text-btn" data-sample="table">usar exemplo</button></div>
      <textarea id="wz-table" class="field area mono" data-f="tableText" rows="6" placeholder="      Bom  Ruim\nBom   70   30\nRuim  40   60">${escapeHtml(w.tableText)}</textarea>
      <p class="wz-tip">Os nomes na primeira linha e na primeira coluna são opcionais. Contagens são normalizadas: cada linha é dividida pela própria soma.</p>
      <div class="wz-preview" data-preview aria-live="polite"></div>`;
  }

  wizardFoot() {
    const { w } = this;
    if (w.way !== 'words') {
      return `<span class="wz-error" data-error></span><button type="button" class="btn btn-primary btn-flat" data-create disabled>Criar modelo</button>`;
    }
    const back = w.page > 1 ? `<button type="button" class="btn btn-quiet" data-back>Voltar</button>` : '';
    const next = w.page < 3
      ? `<button type="button" class="btn btn-primary btn-flat" data-next>Continuar</button>`
      : `<button type="button" class="btn btn-primary btn-flat" data-create>Criar modelo</button>`;
    return `<span class="wz-error" data-error>${escapeHtml(w.error)}</span>${back}${next}`;
  }

  stateList() {
    const seen = new Set();
    return this.w.statesText
      .split(/\r?\n/)
      .map((l) => l.trim().slice(0, 24))
      .filter((l) => l && !seen.has(l.toLowerCase()) && seen.add(l.toLowerCase()));
  }

  showError(msg) {
    this.w.error = msg;
    const el = this.wizard.querySelector('[data-error]');
    if (el) el.textContent = msg;
  }

  goNext() {
    const { w } = this;
    if (w.page === 2) {
      const labels = this.stateList();
      if (labels.length < 2) return this.showError('Escreva pelo menos 2 estados, um por linha.');
      if (labels.length > MAX_STATES) return this.showError(`O limite é de ${MAX_STATES} estados; há ${labels.length}. Junte os parecidos.`);
      // Mantém o que já foi preenchido para os estados que continuam.
      const prev = new Map(w.labels.map((l, i) => [l, i]));
      const old = w.weights;
      w.weights = labels.map((l) => labels.map((m) => (prev.has(l) && prev.has(m) ? old[prev.get(l)][prev.get(m)] : 0)));
      w.labels = labels;
    }
    w.error = '';
    w.page++;
    this.renderWizard();
    this.wizard.querySelector('[data-wz-body]').scrollTop = 0;
  }

  bindWizard() {
    const d = this.wizard;
    d.addEventListener('click', (e) => {
      const t = e.target;
      const way = t.closest('[data-way]');
      if (way) {
        this.w.way = way.dataset.way;
        this.w.error = '';
        return this.renderWizard();
      }
      const idea = t.closest('[data-idea]');
      if (idea) {
        const x = IDEAS[+idea.dataset.idea];
        Object.assign(this.w, { title: x.name, unit: x.unit, step: x.step, statesText: x.states.join('\n'), page: 2, error: '' });
        return this.renderWizard();
      }
      if (t.closest('[data-next]')) return this.goNext();
      if (t.closest('[data-back]')) {
        this.w.page--;
        this.w.error = '';
        return this.renderWizard();
      }
      const even = t.closest('[data-even]');
      if (even) {
        const i = +even.dataset.even;
        const n = this.w.labels.length;
        const share = Math.floor(100 / n);
        this.w.weights[i] = this.w.labels.map(() => share);
        return this.refreshStateCard(i);
      }
      const sample = t.closest('[data-sample]');
      if (sample) {
        if (sample.dataset.sample === 'data') {
          Object.assign(this.w, { dataText: SAMPLE_SEQ, title: this.w.title || 'Assinantes (exemplo)', unit: this.w.unit || 'assinante', step: this.w.step || 'mês' });
        } else {
          Object.assign(this.w, { tableText: SAMPLE_TABLE, title: this.w.title || 'Avaliação de um serviço', unit: this.w.unit || 'cliente', step: this.w.step || 'mês' });
        }
        return this.renderWizard();
      }
      if (t.closest('[data-create]')) this.create();
    });
    d.addEventListener('input', (e) => {
      const f = e.target.dataset?.f;
      if (f) {
        this.w[f] = e.target.value;
        if (f === 'statesText') this.updateStateCount();
        if (f === 'dataText' || f === 'tableText') this.previewPaste();
        return;
      }
      const w = e.target.dataset?.w;
      if (w) {
        const [i, j] = w.split('-').map(Number);
        const others = this.w.weights[i].reduce((a, b, k) => (k === i || k === j ? a : a + b), 0);
        this.w.weights[i][j] = Math.min(+e.target.value, 100 - others);
        this.refreshStateCard(i);
      }
    });
    d.addEventListener('change', async (e) => {
      if (!e.target.matches('[data-file]')) return;
      const file = e.target.files[0];
      if (!file) return;
      this.w.dataText = await file.text();
      this.w.title = this.w.title || file.name.replace(/\.[^.]+$/, '');
      this.renderWizard();
    });
  }

  updateStateCount() {
    const el = this.wizard.querySelector('[data-states-count]');
    if (!el) return;
    const n = this.stateList().length;
    el.textContent = n ? `${n} ${n === 1 ? 'estado' : 'estados'}${n > MAX_STATES ? `: o limite é ${MAX_STATES}` : ''}` : '';
  }

  /** Lê o que foi colado e mostra o resultado antes de criar o modelo. */
  previewPaste() {
    const { w } = this;
    const box = this.wizard.querySelector('[data-preview]');
    const btn = this.wizard.querySelector('[data-create]');
    const err = this.wizard.querySelector('[data-error]');
    if (!box || !btn) return;
    err.textContent = '';
    this.parsed = null;
    btn.disabled = true;
    const text = w.way === 'data' ? w.dataText : w.tableText;
    if (!text.trim()) {
      box.innerHTML = '';
      return;
    }
    try {
      const notes = [];
      if (w.way === 'data') {
        const est = estimateChain(parseSequences(text));
        if (est.labels.length < 2) throw new Error('Encontrei só 1 estado. Confira os separadores: vírgula, seta ou uma linha por estado.');
        if (!est.transitions) throw new Error('Nenhuma transição encontrada: cada sequência precisa de pelo menos 2 estados.');
        this.parsed = est;
        notes.push(`${est.labels.length} estados e ${est.transitions} transições observadas.`);
        if (est.transitions < 30) notes.push(`Com ${est.transitions} transições a estimativa é fraca: use como ponto de partida.`);
        if (est.noExit.length) notes.push(`${est.noExit.join(', ')}: não vi ninguém sair daqui, então virou um estado absorvente.`);
        if (est.merged.length) notes.push(`Os ${est.merged.length} estados mais raros foram reunidos em “Outros” para respeitar o limite de ${MAX_STATES}.`);
      } else {
        const tab = parseTable(text);
        this.parsed = tab;
        notes.push(`${tab.labels.length} estados.`);
        if (tab.wasNormalized) notes.push('As linhas não somavam 1: dividi cada uma pela própria soma.');
      }
      const { labels, matrix } = this.parsed;
      box.innerHTML = `<div class="wz-notes">${notes.map((n) => `<p>${escapeHtml(n)}</p>`).join('')}</div>
        <div class="wz-table-wrap"><table class="wz-table"><thead><tr><th>de ↓ para →</th>${labels.map((l) => `<th>${escapeHtml(l)}</th>`).join('')}</tr></thead>
        <tbody>${matrix.map((r, i) => `<tr><th>${escapeHtml(labels[i])}</th>${r.map((v) => `<td class="${v ? '' : 'zero'}">${fmtP(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      btn.disabled = false;
    } catch (e) {
      box.innerHTML = '';
      err.textContent = e.message;
    }
  }

  create() {
    const { w } = this;
    let labels, matrix;
    if (w.way === 'words') {
      labels = w.labels;
      matrix = w.weights.map((r, i) => normalizeRow(r.map((x) => x / 100), i));
    } else {
      if (!this.parsed) return;
      ({ labels, matrix } = this.parsed);
    }
    const unit = w.unit.trim() || undefined;
    const step = w.step.trim() || undefined;
    const chain = makeChain(labels, matrix, {
      meta: {
        title: w.title.trim() || 'Meu modelo',
        unit,
        units: unit && pluralPt(unit),
        step,
        steps: step && pluralPt(step),
        custom: true,
        about: w.way === 'data' ? 'Chances estimadas a partir do histórico que você colou.' : '',
      },
    });
    this.wizard.close();
    this.onCreate(chain);
  }
}
