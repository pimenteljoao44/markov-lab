// Ponto de entrada da trilha: a página inicial do caderno.
import { Trail } from './platform/Trail.js';

new Trail(document.getElementById('phases'), document.getElementById('trail-side'), document.getElementById('trail-tools'));

document.documentElement.dataset.ready = '1';
