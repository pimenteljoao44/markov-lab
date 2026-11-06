// Editor da matriz P (níveis 2–3) e regras em linguagem natural (nível 1).
// Hover bidirecional com o grafo e aviso visual não-bloqueante para linhas que não somam 1.
import { subscribe, actions, update, getState } from '../store.js';
import { escapeHtml, fmtP, parseProb, renderTex, clamp, texNum, MAX_STATES } from '../util.js';
import { vocab } from '../vocab.js';
import { LEVELS } from '../levels/index.js';
import { helpDot } from '../coach/api.js';
import { toast } from './Toast.js';

export class MatrixEditor {
  constructor(el) {
    this.el = el;
    this.structKey = '';
    this.prevStatus = [];
    this.bindEvents();
    subscribe((s, t) => {
      if (t.has('derived') || t.has('level') || t.has('ui') || t.has('structure')) this.render(s);
      if (t.has('hover') || t.has('derived') || t.has('level')) this.applyHover(s);
    });
  }

  render(s) {
    const feat = LEVELS[s.meta.level].features;
    const n = s.chain.states.length;
    const v = vocab(s.chain);
    const key = [s.meta.level, n, s.ui.matrixMode, v.unit, v.step, ...s.chain.states.map((x) => x.id + x.label + x.color)].join('|');
    if (key !== this.structKey) {
      this.structKey = key;
      if (feat.matrix) this.build(s, feat);
      else this.buildRules(s);
    }
    if (feat.matrix) this.refresh(s);
    else this.refreshRules(s);
  }

  // ───────────── Nível 1: duas regras em português ─────────────
  buildRules(s) {
    const [a, b] = s.chain.states;
    const step = escapeHtml(vocab(s.chain).step);
    this.el.innerHTML = `
      <header class="card-head"><h2>Regras do modelo ${helpDot('markov', 'Explicar por que as regras olham só para o presente')}</h2></header>
      <p class="card-sub">Cada regra olha <b>só para o estado atual</b>. Nenhuma pergunta sobre o passado.</p>
      <div class="rule" data-rule="0">
        <div class="rule-head"><span>Quem está em <b>${escapeHtml(a.label)}</b> continua lá depois de 1 ${step} com chance de</span><span class="rule-val" data-v="0"></span></div>
        <input type="range" min="0" max="100" step="1" data-r="0" aria-label="Chance de ${escapeHtml(a.label)} continuar">
        <div class="split"><i style="background:${a.color}"></i><i style="background:${b.color}"></i></div>
        <div class="split-lab"><span data-l="00"></span><span data-l="01"></span></div>
      </div>
      <div class="rule" data-rule="1">
        <div class="rule-head"><span>Quem está em <b>${escapeHtml(b.label)}</b> continua lá depois de 1 ${step} com chance de</span><span class="rule-val" data-v="1"></span></div>
        <input type="range" min="0" max="100" step="1" data-r="1" aria-label="Chance de ${escapeHtml(b.label)} continuar">
        <div class="split"><i style="background:${b.color}"></i><i style="background:${a.color}"></i></div>
        <div class="split-lab"><span data-l="11"></span><span data-l="10"></span></div>
      </div>
      <div class="mini-matrix">Escritas como tabela, essas duas regras já são uma <b>matriz de transição</b> ${helpDot('matrix', 'Explicar a matriz de transição')}:
        <div class="tex" data-mini></div>
      </div>`;
    this.el.querySelectorAll('[data-r]').forEach((inp) =>
      inp.addEventListener('input', () => {
        const i = +inp.dataset.r;
        const stay = +inp.value / 100;
        actions.setRow(i, i === 0 ? [stay, 1 - stay] : [1 - stay, stay]);
      })
    );
    this.el.querySelectorAll('.rule').forEach((r) => {
      const i = +r.dataset.rule;
      r.addEventListener('mouseenter', () => actions.setHover({ type: 'row', i }));
      r.addEventListener('mouseleave', () => actions.setHover(null));
    });
  }

  refreshRules(s) {
    const M = s.chain.matrix;
    const [a, b] = s.chain.states;
    const stay = [M[0][0], M[1][1]];
    stay.forEach((v, i) => {
      const inp = this.el.querySelector(`[data-r="${i}"]`);
      if (document.activeElement !== inp) inp.value = Math.round(v * 100);
      this.el.querySelector(`[data-v="${i}"]`).textContent = `${Math.round(v * 100)}%`;
      const split = this.el.querySelectorAll(`[data-rule="${i}"] .split i`);
      split[0].style.width = `${v * 100}%`;
      split[1].style.width = `${(1 - v) * 100}%`;
    });
    this.el.querySelector('[data-l="00"]').textContent = `${a.label} ${Math.round(M[0][0] * 100)}%`;
    this.el.querySelector('[data-l="01"]').textContent = `${b.label} ${Math.round(M[0][1] * 100)}%`;
    this.el.querySelector('[data-l="11"]').textContent = `${b.label} ${Math.round(M[1][1] * 100)}%`;
    this.el.querySelector('[data-l="10"]').textContent = `${a.label} ${Math.round(M[1][0] * 100)}%`;
    const f = (v) => texNum(v);
    const mini = this.el.querySelector('[data-mini]');
    mini.dataset.tex = `P=\\begin{pmatrix} ${f(M[0][0])} & ${f(M[0][1])} \\\\ ${f(M[1][0])} & ${f(M[1][1])} \\end{pmatrix}`;
    renderTex(mini.parentElement);
  }

  // ───────────── Níveis 2–3: matriz editável ─────────────
  build(s, feat) {
    const states = s.chain.states;
    const n = states.length;
    const mode = s.ui.matrixMode;
    const head = (st, i, axis) => {
      const dot = `<i class="dot" style="background:${st.color}"></i>`;
      if (feat.editStates && axis === 'row')
        return `${dot}<input class="head-in" data-rename="${i}" value="${escapeHtml(st.label)}" maxlength="24" aria-label="Nome do estado">`;
      return `${dot}<span title="${escapeHtml(st.label)}">${escapeHtml(st.label)}</span>`;
    };
    const unit = escapeHtml(vocab(s.chain).unit);
    this.el.innerHTML = `
      <header class="card-head">
        <h2>Matriz de transição ${helpDot('matrix', 'Explicar a matriz de transição')}</h2>
        <div class="seg" role="group" aria-label="Formato">
          <button data-mode="decimal" class="${mode === 'decimal' ? 'active' : ''}">0,50</button>
          <button data-mode="percent" class="${mode === 'percent' ? 'active' : ''}">%</button>
        </div>
      </header>
      <p class="card-sub"><b>Linha</b>: onde cada ${unit} está. <b>Coluna</b>: para onde vai. Aceita <code>0,5</code>, <code>50%</code>, <code>1/3</code> ou contagens ${helpDot('weights', 'Explicar pesos e normalização')}; as setas ↑ ↓ ajustam.</p>
      ${
        feat.editStates
          ? `<div class="tool-row">
              <button class="btn btn-sm" data-act="add" ${n >= MAX_STATES ? 'disabled' : ''}>Adicionar estado</button>
              <button class="btn btn-sm btn-quiet" data-act="random">Sortear valores</button>
              <button class="btn btn-sm btn-quiet" data-act="normalize-all">Normalizar tudo</button>
            </div>`
          : ''
      }
      <div class="matrix-scroll"><table class="matrix">
        <thead><tr><th class="corner">de ↓<br>para →</th>
          ${states.map((st, j) => `<th class="colh" data-col="${j}"><span class="hd">${head(st, j, 'col')}</span></th>`).join('')}
          <th class="corner">soma ${helpDot('row-sum', 'Explicar por que cada linha soma 1')}</th></tr></thead>
        <tbody>
          ${states
            .map(
              (st, i) => `<tr data-row="${i}">
              <th class="rowh" data-rowh="${i}"><span class="hd">${head(st, i, 'row')}</span>${
                feat.editStates && n > 2 ? `<button class="del-state" data-del="${i}" title="Remover estado">×</button>` : ''
              }</th>
              ${states
                .map(
                  (_, j) => `<td class="cell ${i === j ? 'diag' : ''}" data-i="${i}" data-j="${j}">
                    <input class="cell-in" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="P(${escapeHtml(st.label)} → ${escapeHtml(states[j].label)})">
                    <span class="eff"></span><span class="bar"><i style="--c:${st.color}"></i></span></td>`
                )
                .join('')}
              <td class="sum"><div class="gauge" aria-hidden="true"><i class="fill"></i><i class="mark"></i></div><span class="sum-txt"></span><button class="fix" data-fix="${i}">normalizar</button></td>
            </tr>`
            )
            .join('')}
        </tbody></table></div>
      <div class="matrix-foot" hidden></div>`;
    renderTex(this.el);
    this.prevStatus = [];
  }

  refresh(s) {
    const d = s.derived;
    const M = s.chain.matrix;
    const mode = s.ui.matrixMode;
    const rows = this.el.querySelectorAll('tbody tr');
    rows.forEach((tr, i) => {
      const status = d.rowStatus[i];
      const warn = status !== 'ok';
      tr.classList.toggle('row-warn', warn);
      if (this.prevStatus[i] && this.prevStatus[i] !== 'ok' && !warn) {
        tr.classList.remove('just-fixed');
        void tr.offsetWidth;
        tr.classList.add('just-fixed');
      }
      tr.querySelectorAll('td.cell').forEach((td, j) => {
        const v = M[i][j];
        const inp = td.querySelector('.cell-in');
        if (document.activeElement !== inp) inp.value = fmtP(v, mode);
        td.classList.toggle('zero', !v);
        const eff = d.effective[i][j];
        td.querySelector('.bar i').style.setProperty('--p', eff);
        const effEl = td.querySelector('.eff');
        effEl.textContent = warn && v ? `≈${fmtP(eff, mode)}` : '';
        effEl.classList.toggle('on', warn && !!v);
      });
      const sum = d.rowSums[i];
      const diff = Math.abs(1 - sum);
      tr.querySelector('.gauge .fill').style.width = `${(Math.min(sum, 1.5) / 1.5) * 100}%`;
      tr.querySelector('.sum-txt').textContent =
        status === 'ok' ? `${mode === 'percent' ? '100%' : '1'} ✓` : status === 'under' ? (sum === 0 ? 'linha vazia' : `falta ${fmtP(diff, mode)}`) : `sobra ${fmtP(diff, mode)}`;
    });
    this.prevStatus = d.rowStatus.slice();
    const bad = d.rowStatus.filter((x) => x !== 'ok').length;
    const foot = this.el.querySelector('.matrix-foot');
    foot.hidden = !bad;
    if (bad)
      foot.textContent = `${bad === 1 ? 'Uma linha não soma' : `${bad} linhas não somam`} 1. Enquanto isso, a simulação divide cada valor pela soma da linha (o número pequeno em vermelho). Os desafios só contam com todas as linhas em 1.`;
  }

  bindEvents() {
    const el = this.el;
    el.addEventListener('input', (e) => {
      const inp = e.target.closest('.cell-in');
      if (!inp) return;
      const td = inp.parentElement;
      const v = parseProb(inp.value);
      if (v === null) {
        td.classList.remove('bad');
        void td.offsetWidth;
        td.classList.add('bad');
        return;
      }
      actions.setCell(+td.dataset.i, +td.dataset.j, v);
    });
    el.addEventListener('keydown', (e) => {
      const inp = e.target.closest('.cell-in');
      if (!inp) return;
      const td = inp.parentElement;
      const i = +td.dataset.i, j = +td.dataset.j;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = (e.shiftKey ? 0.1 : 0.01) * (e.key === 'ArrowUp' ? 1 : -1);
        const v = clamp(Math.round((getState().chain.matrix[i][j] + step) * 1000) / 1000, 0, 10);
        actions.setCell(i, j, v);
        inp.value = fmtP(v, getState().ui.matrixMode);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const below = el.querySelector(`td.cell[data-i="${i + 1}"][data-j="${j}"] .cell-in`);
        (below || inp).blur();
        below?.focus();
        below?.select();
      }
    });
    el.addEventListener('focusin', (e) => e.target.closest('.cell-in')?.select());
    el.addEventListener('focusout', (e) => {
      const inp = e.target.closest('.cell-in');
      if (inp) {
        const td = inp.parentElement;
        inp.value = fmtP(getState().chain.matrix[+td.dataset.i][+td.dataset.j], getState().ui.matrixMode);
      }
      const ren = e.target.closest('[data-rename]');
      if (ren) actions.renameState(+ren.dataset.rename, ren.value.trim());
    });
    el.addEventListener('keydown', (e) => {
      const ren = e.target.closest('[data-rename]');
      if (ren && e.key === 'Enter') ren.blur();
    });
    el.addEventListener('mouseover', (e) => {
      const td = e.target.closest('td.cell');
      if (td) return actions.setHover({ type: 'cell', i: +td.dataset.i, j: +td.dataset.j });
      const rh = e.target.closest('[data-rowh]');
      if (rh) return actions.setHover({ type: 'row', i: +rh.dataset.rowh });
      const ch = e.target.closest('[data-col]');
      if (ch) return actions.setHover({ type: 'col', i: +ch.dataset.col });
    });
    el.addEventListener('mouseleave', () => actions.setHover(null));
    el.addEventListener('click', (e) => {
      const fix = e.target.closest('[data-fix]');
      if (fix) {
        actions.normalizeRow(+fix.dataset.fix);
        return;
      }
      const mode = e.target.closest('[data-mode]');
      if (mode) {
        update((s) => (s.ui.matrixMode = mode.dataset.mode), 'ui');
        return;
      }
      const del = e.target.closest('[data-del]');
      if (del) {
        const i = +del.dataset.del;
        const label = getState().chain.states[i].label;
        if (actions.removeState(i)) toast(`Estado “${label}” removido`, { sub: 'As linhas que apontavam para ele podem não somar 1 agora.' });
        return;
      }
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'add') {
        if (!actions.addState()) toast(`O Sandbox aceita até ${MAX_STATES} estados`, { type: 'warn', sub: 'Junte estados parecidos para abrir espaço.' });
      } else if (act === 'random') {
        const n = getState().chain.states.length;
        const M = Array.from({ length: n }, () => {
          const r = Array.from({ length: n }, () => (Math.random() < 0.35 ? 0 : Math.random()));
          if (r.every((v) => v === 0)) r[Math.floor(Math.random() * n)] = 1;
          const sum = r.reduce((a, b) => a + b, 0);
          return r.map((v) => Math.round((v / sum) * 100) / 100);
        });
        update((s) => (s.chain.matrix = M), 'chain');
        actions.normalizeAll();
      } else if (act === 'normalize-all') {
        actions.normalizeAll();
      }
    });
  }

  applyHover(s) {
    const h = s.ui.hover;
    this.el.querySelectorAll('.hl, .hl-soft').forEach((x) => x.classList.remove('hl', 'hl-soft'));
    if (!h) return;
    const q = (sel) => this.el.querySelectorAll(sel).forEach((x) => x.classList.add('hl'));
    const soft = (sel) => this.el.querySelectorAll(sel).forEach((x) => x.classList.add('hl-soft'));
    if (h.type === 'cell' || h.type === 'edge') {
      q(`td.cell[data-i="${h.i}"][data-j="${h.j}"]`);
      q(`[data-rowh="${h.i}"]`);
      q(`[data-col="${h.j}"]`);
      q(`.rule[data-rule="${h.i}"]`);
    } else if (h.type === 'node') {
      soft(`td.cell[data-i="${h.i}"]`);
      soft(`td.cell[data-j="${h.i}"]`);
      q(`[data-rowh="${h.i}"]`);
      q(`[data-col="${h.i}"]`);
      q(`.rule[data-rule="${h.i}"]`);
    } else if (h.type === 'row') {
      soft(`td.cell[data-i="${h.i}"]`);
      q(`[data-rowh="${h.i}"]`);
      q(`.rule[data-rule="${h.i}"]`);
    } else if (h.type === 'col') {
      soft(`td.cell[data-j="${h.i}"]`);
      q(`[data-col="${h.i}"]`);
    } else if (h.type === 'class') {
      h.members.forEach((m) => q(`[data-rowh="${m}"]`));
    }
  }
}
