// Diagnóstico explicado: cada classificação vem com o "porquê".
import { subscribe, actions, update, getState } from '../store.js';
import { escapeHtml, renderTex, pct, num, keepFocus } from '../util.js';
import { htmlVocab } from '../vocab.js';
import { helpDot } from '../coach/api.js';
import { LEVELS } from '../levels/index.js';
import { isPiHidden, activeChallenge } from '../challenges/definitions.js';

const dot = (st) => `<i class="dot" style="background:${st.color}"></i>`;
const name = (st) => `<b>${escapeHtml(st.label)}</b>`;

/** Sem irredutibilidade, o destino só depende do início quando há mais de uma classe fechada. */
function reducibleWhy(d, S) {
  const closed = d.classes.filter((c) => c.closed);
  if (closed.length === 1) {
    const names = closed[0].members.map((m) => name(S[m])).join(', ');
    return `<p>Falta <b>irredutibilidade</b>: nem todo estado alcança todos os outros. Mas só existe uma classe fechada (${names}): todos terminam nela, de onde quer que comecem.</p>`;
  }
  return `<p>Falta <b>irredutibilidade</b>: há ${closed.length} classes fechadas e ninguém passa de uma para outra, então o destino depende de onde se começa.</p>`;
}

export class InsightPanel {
  constructor(el) {
    this.el = el;
    this.open = new Set(['ergodic']);
    el.addEventListener('toggle', (e) => {
      const k = e.target.dataset?.k;
      if (!k) return;
      e.target.open ? this.open.add(k) : this.open.delete(k);
    }, true);
    el.addEventListener('mouseover', (e) => {
      const chip = e.target.closest('[data-class]');
      if (chip) actions.setHover({ type: 'class', members: chip.dataset.class.split(',').map(Number) });
    });
    el.addEventListener('mouseout', (e) => {
      if (e.target.closest('[data-class]')) actions.setHover(null);
    });
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-reveal]')) {
        const c = activeChallenge(getState());
        update((s) => (s.challenges.revealed[c.id] = true), 'challenge');
      }
    });
    subscribe((s, t) => {
      if (t.has('derived') || t.has('level') || t.has('challenge')) this.render(s);
    });
  }

  render(s) {
    const d = s.derived;
    const S = s.chain.states;
    const lvl = s.meta.level;
    const v = htmlVocab(s.chain);
    const parts = [];

    parts.push(`<header class="card-head"><h2>Diagnóstico</h2></header><p class="card-sub">Abra cada item para ver o porquê.</p>`);
    if (!d.allRowsOk) {
      const bad = d.rowStatus.map((st, i) => (st !== 'ok' ? escapeHtml(S[i].label) : null)).filter(Boolean);
      parts.push(`<div class="note-warn">${bad.join(', ')}: a linha não soma 1. O diagnóstico abaixo usa os valores divididos pela soma da linha.</div>`);
    }

    // Irredutibilidade
    const classesChips = d.classes
      .map(
        (c) => `<span class="chip ${c.closed ? 'closed' : ''}" data-class="${c.members.join(',')}">${c.members.map((m) => dot(S[m])).join('')}
          ${c.members.map((m) => escapeHtml(S[m].label)).join(', ')} <small>${c.closed ? 'fechada' : 'transitória'}</small></span>`
      )
      .join('');
    let reduWhy;
    if (d.isIrreducible) {
      reduWhy = `<p>Todo estado alcança todo estado por algum caminho de setas. Ninguém fica preso num subconjunto.</p>`;
    } else {
      let ex = null;
      for (let i = 0; i < d.n && !ex; i++) for (let j = 0; j < d.n && !ex; j++) if (!d.reach[i][j]) ex = [i, j];
      reduWhy = `<p>Exemplo: de ${name(S[ex[0]])} não existe caminho até ${name(S[ex[1]])}. A cadeia se divide em ${d.classes.length} classes comunicantes (passe o mouse):</p>
        <div class="class-chips">${classesChips}</div>
        <p><b>Fechada</b> = ninguém sai. <b>Transitória</b> = mais cedo ou mais tarde, todos saem para sempre.</p>`;
    }
    parts.push(this.item('irr', d.isIrreducible ? 'ok' : 'warn', 'Irredutível', d.isIrreducible ? 'sim' : `não · ${d.classes.length} classes`, reduWhy, d.isIrreducible ? 'irreducible' : 'classes'));

    // Periodicidade
    let perVerdict, perWhy, perKind;
    if (d.isIrreducible) {
      const p = d.period;
      perKind = p === 1 ? 'ok' : 'warn';
      perVerdict = p === 1 ? 'aperiódica' : `período ${p}`;
      perWhy =
        p === 1
          ? `<p>Os retornos a um estado acontecem em tamanhos de passo sem divisor comum (um único self-loop já garante isso). Sem ritmo fixo, a distribuição “assenta”.</p>`
          : `<p>Os retornos só acontecem em múltiplos de <b>${p}</b> ${v.steps}. Os potes andam em ondas e μ₀Pᵗ fica girando sem convergir, embora π exista como média no tempo.</p>
             <p>Dica: qualquer P(i,i) > 0 quebra o ritmo.</p>`;
    } else {
      const closed = d.classes.filter((c) => c.closed);
      const per = closed.map((c) => c.period);
      perKind = per.every((x) => x === 1) ? 'ok' : 'warn';
      perVerdict = per.every((x) => x === 1) ? 'classes fechadas aperiódicas' : `períodos ${per.join(', ')}`;
      perWhy = `<p>Em cadeias redutíveis, o período é avaliado em cada classe fechada, que é onde tudo termina.</p>`;
    }
    parts.push(this.item('per', perKind, 'Periodicidade', perVerdict, perWhy, 'periodic'));

    // Ergodicidade
    const ergWhy = d.isErgodic
      ? `<p>Irredutível + aperiódica ⇒ existe uma única π e, partindo de <b>qualquer</b> μ₀, a distribuição converge para ela:</p>
         <span class="tex" data-tex="\\lim_{t\\to\\infty} \\mu_0 P^t = \\pi" data-display></span>`
      : !d.isIrreducible
        ? reducibleWhy(d, S)
        : `<p>Falta <b>aperiodicidade</b>: a distribuição gira em ondas em vez de convergir.</p>`;
    parts.push(this.item('ergodic', d.isErgodic ? 'ok' : 'warn', 'Ergódica', d.isErgodic ? 'sim' : 'não', ergWhy, 'ergodic'));

    // Absorventes
    const absNames = d.absorbing.map((i) => escapeHtml(S[i].label));
    const absWhy = d.absorbing.length
      ? `<p>${d.absorbing.map((i) => `${dot(S[i])} ${name(S[i])}`).join(', ')}: P(i,i) = 1. Quem entra nunca mais sai: é um buraco negro probabilístico.</p>
         ${d.deadEnds.length ? `<p>⚠ ${d.deadEnds.map((i) => name(S[i])).join(', ')} tem a linha toda zerada: o motor trata como “sem saída” (fica parado).</p>` : ''}`
      : `<p>Nenhum estado com P(i,i) = 1. Para criar um, zere todas as saídas de um estado, menos para ele mesmo.</p>`;
    parts.push(this.item('abs', d.absorbing.length ? 'mag' : 'info', 'Estados absorventes', absNames.length ? absNames.join(', ') : 'nenhum', absWhy, 'absorbing'));

    // Distribuição estacionária
    const hidden = isPiHidden(s);
    if (d.stationary) {
      const bars = S.map(
        (st, i) => `<div class="pi-row" title="Tempo médio para voltar a ${escapeHtml(st.label)}: ${d.stationary[i] > 1e-9 ? `${num(1 / d.stationary[i], 2)} ${v.steps}` : 'pode nunca voltar'}">
          <span class="lab">${dot(st)}${escapeHtml(st.label)}</span>
          <div class="pi-bar"><div class="pi-fill" style="width:${(d.stationary[i] * 100).toFixed(2)}%;background:${st.color}"></div></div>
          <span class="pi-val">${hidden ? '?' : num(d.stationary[i], 3)}</span></div>`
      ).join('');
      parts.push(`<div class="block-title"><h3>Equilíbrio π ${helpDot('pi', 'Explicar o equilíbrio')}</h3><span class="tex" data-tex="\\pi P = \\pi,\\ \\textstyle\\sum_i \\pi_i = 1"></span></div>
        <div class="pi-bars ${hidden ? 'pi-hidden' : ''}">${bars}${hidden ? `<div class="reveal-wrap"><button class="btn btn-sm" data-reveal>Mostrar π mesmo assim</button></div>` : ''}</div>
        <p class="note">Em π, o que entra em cada estado é igual ao que sai. ${d.isErgodic ? '' : d.isIrreducible ? 'Como a cadeia é periódica, π é a fração média de tempo, não um limite.' : 'Única porque só há uma classe fechada; transitórios recebem 0.'} Passe o mouse numa barra para ver o tempo médio de volta ${helpDot('return-time', 'Explicar o tempo de volta')}.</p>`);
    } else if (d.closedStationary.length > 1) {
      const blocks = d.closedStationary
        .map((cs) => {
          const members = d.classes[cs.classIndex].members;
          return `<div class="pi-bars" style="margin-bottom:8px">${members
            .map(
              (i) => `<div class="pi-row"><span class="lab">${dot(S[i])}${escapeHtml(S[i].label)}</span>
                <div class="pi-bar"><div class="pi-fill" style="width:${(cs.pi[i] * 100).toFixed(2)}%;background:${S[i].color}"></div></div>
                <span class="pi-val">${num(cs.pi[i], 3)}</span></div>`
            )
            .join('')}</div>`;
        })
        .join('');
      parts.push(`<div class="block-title"><h3>Sem π única</h3><span class="note">${d.closedStationary.length} classes fechadas</span></div>
        <p class="note" style="margin-bottom:8px">Cada classe fechada tem a sua própria π (abaixo). Qualquer mistura delas também é estacionária: por isso o destino depende do início.</p>${blocks}`);
    }

    // Absorção
    if (d.absorption) {
      const a = d.absorption;
      const targets = a.targets.map((ci) => d.classes[ci].members.map((m) => escapeHtml(S[m].label)).join('+'));
      const rows = a.transient
        .map(
          (u, r) => `<tr><td>${dot(S[u])} ${escapeHtml(S[u].label)}</td>${a.B[r]
            .map((v) => `<td><span class="cellbar"><i style="width:${(v * 100).toFixed(1)}%"></i></span>${pct(v, 0)}</td>`)
            .join('')}<td>${num(a.expectedSteps[r], 1)}</td></tr>`
        )
        .join('');
      parts.push(`<div class="block-title"><h3>Para onde vão ${helpDot('fundamental', 'Explicar esta tabela')}</h3><span class="tex" data-tex="N=(I-Q)^{-1},\\ B=NR"></span></div>
        <table class="abs-table"><thead><tr><th>saindo de</th>${targets.map((t) => `<th>acaba em ${t}</th>`).join('')}<th>${v.steps} (média)</th></tr></thead><tbody>${rows}</tbody></table>
        <p class="note">B dá a chance de terminar em cada classe fechada. A última coluna é N·1: quantos passos, em média, até sair dos estados transitórios.</p>`);
    }

    // Teoria do nível
    const theory = LEVELS[lvl].theory?.(s);
    if (theory) parts.push(`<details class="theory" ${this.open.has('theory') ? 'open' : ''} data-k="theory"><summary>A matemática por trás</summary><div class="body">${theory}</div></details>`);

    keepFocus(this.el, () => {
      this.el.innerHTML = parts.join('');
    });
    renderTex(this.el);
  }

  item(k, kind, title, verdict, why, tip) {
    const mark = { ok: ['yes', '✓'], warn: ['no', '✗'], info: ['info', '–'], mag: ['abs', '●'] }[kind];
    return `<details class="check" data-k="${k}" ${this.open.has(k) ? 'open' : ''}>
      <summary><span class="mark ${mark[0]}" aria-hidden="true">${mark[1]}</span><span>${title}</span> ${helpDot(tip, `Explicar: ${title}`)}<span class="verdict">${verdict}</span></summary>
      <div class="why">${why}</div></details>`;
  }
}
