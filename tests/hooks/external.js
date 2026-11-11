// Usado só pelos testes: lista os pedidos que uma página fez a outros sites.
// Alguns programas do computador, como antivírus, enfiam um script próprio em toda página a caminho do
// navegador. Isso não é a página falando com outro site. Esses endereços são reconhecidos comparando o
// HTML que chegou com o arquivo do repositório, que tests/run.py entrega intacto em /__raw/.
const cache = new Map();

/** Os scripts do HTML como ele chegou. A moldura não deixa nada rodar: só o que veio escrito é lido. */
async function deliveredScripts(url) {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.hidden = true;
  frame.src = url;
  const loaded = new Promise((resolve) => frame.addEventListener('load', resolve, { once: true }));
  document.body.appendChild(frame);
  await loaded;
  const sources = [...frame.contentDocument.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
  frame.remove();
  return sources;
}

async function findInjectedHosts(base, page) {
  try {
    const raw = await fetch(`${base}__raw/${page}`);
    // Sem o servidor de testes não há arquivo intacto para comparar: nada é descontado.
    if (!raw.ok || !(raw.headers.get('content-type') || '').startsWith('text/plain')) return new Set();
    const written = new DOMParser().parseFromString(await raw.text(), 'text/html');
    const known = new Set([...written.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')));
    const added = (await deliveredScripts(`${base}${page}`)).filter((src) => !known.has(src));
    return new Set(added.map((src) => new URL(src, base).host));
  } catch {
    return new Set();
  }
}

function injectedHosts(base, page) {
  if (!cache.has(page)) cache.set(page, findInjectedHosts(base, page));
  return cache.get(page);
}

/** Endereços de outros sites que a página pediu, sem contar o que foi injetado no caminho. */
export async function externalRequests(win, base, page) {
  const injected = await injectedHosts(base, page);
  return win.performance
    .getEntriesByType('resource')
    .map((entry) => new URL(entry.name))
    .filter((url) => url.origin !== win.location.origin && !injected.has(url.host))
    .map((url) => url.href);
}
