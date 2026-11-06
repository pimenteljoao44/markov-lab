// O D3 é distribuído como UMD: ao ser importado, ele define globalThis.d3.
// Este arquivo devolve o D3 como módulo, para o resto do código continuar com import.
import './d3.min.js';

export default globalThis.d3;
