// Motor Monte Carlo: cada partícula é uma cadeia independente.
// Passos sincronizados: todas sorteiam o próximo estado pela CDF da linha atual e viajam juntas.
import { mulberry32 } from '../math/rng.js';

export const REST = 0.22; // fração do ciclo em que as partículas "descansam" no nó

export class ParticleEngine {
  constructor() {
    this.count = 0;
    this.n = 0;
    this.tick = 0;
    this.moving = false;
  }

  reset({ count, n, dist, seed }) {
    this.count = count;
    this.n = n;
    this.rng = mulberry32(seed);
    this.cur = new Int16Array(count);
    this.next = new Int16Array(count);
    this.delay = new Float32Array(count);
    this.jit = new Float32Array(count);
    this.ang = new Float32Array(count);
    this.rad = new Float32Array(count);

    // Contagens exatas pela distribuição inicial (método do maior resto).
    const raw = dist.map((p) => p * count);
    const base = raw.map(Math.floor);
    let rem = count - base.reduce((a, b) => a + b, 0);
    raw
      .map((v, i) => [v - Math.floor(v), i])
      .sort((a, b) => b[0] - a[0])
      .forEach(([, i]) => {
        if (rem-- > 0) base[i]++;
      });
    let k = 0;
    base.forEach((c, i) => {
      for (let q = 0; q < c && k < count; q++) this.cur[k++] = i;
    });

    for (let p = 0; p < count; p++) {
      this.delay[p] = this.rng() * 0.35;
      this.jit[p] = this.rng() * 2 - 1;
      this.ang[p] = this.rng() * Math.PI * 2;
      this.rad[p] = Math.sqrt(this.rng());
    }
    this.next.set(this.cur);
    this.tick = 0;
    this.moving = false;
  }

  /** Sorteia o próximo estado de cada partícula: X_{t+1} ~ P[X_t, ·] */
  sampleNext(P) {
    const n = this.n;
    for (let p = 0; p < this.count; p++) {
      const row = P[this.cur[p]];
      const u = this.rng();
      let j = 0, acc = row[0];
      while (u > acc && j < n - 1) acc += row[++j];
      this.next[p] = j;
    }
    this.moving = true;
  }

  commit() {
    this.cur.set(this.next);
    this.tick++;
    this.moving = false;
  }

  occupancy() {
    const o = new Array(this.n).fill(0);
    for (let p = 0; p < this.count; p++) o[this.cur[p]]++;
    return o;
  }
}
