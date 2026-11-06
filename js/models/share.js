// Link compartilhável: o modelo viaja inteiro no fragmento da URL (#m=base64), sem passar por servidor.
import { sanitizeChain } from './chain.js';

const PREFIX = '#m=';

export const isShareHash = (hash) => hash.startsWith(PREFIX);

/** Base64 próprio para URL: aplicativos de mensagem costumam alterar +, / e = em links. */
export function encodeShare(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const text = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${PREFIX}${text}`;
}

/**
 * Lança erro se o link estiver corrompido ou se o modelo for inválido.
 * Aceita também links antigos, em base64 comum, e os que algum aplicativo codificou (%3D).
 */
export function decodeShare(hash) {
  const text = decodeURIComponent(hash.slice(PREFIX.length)).replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
  return sanitizeChain(JSON.parse(new TextDecoder().decode(bytes)));
}
