// Desfazer e refazer: guarda fotografias da cadeia. Modelos têm no máximo 10 estados,
// então copiar tudo é simples e barato.
const LIMIT = 30;
const COALESCE_MS = 800;

export class ChainHistory {
  constructor({ limit = LIMIT, coalesceMs = COALESCE_MS, now = Date.now } = {}) {
    this.limit = limit;
    this.coalesceMs = coalesceMs;
    this.now = now;
    this.past = [];
    this.future = [];
    this.lastKind = null;
    this.lastAt = 0;
  }

  get canUndo() {
    return this.past.length > 0;
  }

  get canRedo() {
    return this.future.length > 0;
  }

  /**
   * Guarda como o modelo estava ANTES de uma mudança.
   * Mudanças seguidas do mesmo tipo (`kind`) contam como uma só: digitar "0,5" ou arrastar
   * um controle é um único passo de desfazer. Sem `kind`, cada mudança é um passo.
   */
  record(snapshot, kind = null) {
    const t = this.now();
    const continuing = kind !== null && kind === this.lastKind && t - this.lastAt < this.coalesceMs;
    this.lastKind = kind;
    this.lastAt = t;
    if (continuing) return;
    this.past.push(snapshot);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }

  undo(current) {
    if (!this.canUndo) return null;
    this.future.push(current);
    this.lastKind = null;
    return this.past.pop();
  }

  redo(current) {
    if (!this.canRedo) return null;
    this.past.push(current);
    this.lastKind = null;
    return this.future.pop();
  }

  /** Recoloca o que foi salvo em outra sessão. Refazer não sobrevive a recarregar a página. */
  restore(past) {
    this.past = past.slice(-this.limit);
    this.future = [];
    this.lastKind = null;
  }
}
