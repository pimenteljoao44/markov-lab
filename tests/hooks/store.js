// Usado só pelos testes: expõe o store da página, que a política de segurança não deixa alcançar com eval.
import * as store from '../../js/store.js';

window.__store = store;
