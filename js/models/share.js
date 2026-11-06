// Link compartilhável: o modelo viaja inteiro no fragmento da URL (#m=base64), sem passar por servidor.
import { sanitizeChain } from './chain.js';

const PREFIX = '#m=';

export const isShareHash = (hash) => hash.startsWith(PREFIX);

export function encodeShare(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  return `${PREFIX}${btoa(String.fromCharCode(...bytes))}`;
}

/** Lança erro se o link estiver corrompido ou se o modelo for inválido. */
export function decodeShare(hash) {
  const bytes = Uint8Array.from(atob(hash.slice(PREFIX.length)), (c) => c.charCodeAt(0));
  return sanitizeChain(JSON.parse(new TextDecoder().decode(bytes)));
}
