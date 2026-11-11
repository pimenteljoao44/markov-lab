// Roda antes dos módulos, como script comum, para funcionar mesmo quando eles falham.
// Encaminha links antigos de modelo e avisa quando a página não consegue iniciar.
(function () {
  var root = document.documentElement;

  // Links de modelo compartilhados antes de a trilha existir apontam para a página inicial:
  // eles seguem para o laboratório indicado em data-model-links, que é quem sabe abri-los.
  var target = root.getAttribute('data-model-links');
  if (target && location.hash.indexOf('#m=') === 0) {
    location.replace(target + location.hash);
    return;
  }

  // Sem isto sobraria só a moldura, com botões que não respondem: melhor dizer o que houve.
  function bootFailed() {
    if (root.dataset.ready || document.getElementById('boot-error')) return;
    var local = location.protocol === 'file:';
    var box = document.createElement('div');
    box.id = 'boot-error';
    box.className = 'boot-error';
    box.setAttribute('role', 'alert');
    var title = document.createElement('b');
    title.textContent = local ? 'Esta página precisa de um servidor local.' : 'Não foi possível carregar esta página.';
    box.appendChild(title);
    box.appendChild(
      document.createTextNode(
        local
          ? 'Abrir o arquivo com dois cliques não funciona. Veja “Como rodar” no README.'
          : 'Recarregue com Ctrl+Shift+R. Se o problema continuar, confira sua conexão.'
      )
    );
    (document.body || root).appendChild(box);
  }

  function ours(url) {
    try {
      return new URL(url).origin === self.origin;
    } catch (_) {
      return false;
    }
  }

  // Só conta o que é da própria página. Um script que outro programa do computador injeta,
  // e que a política de segurança bloqueia, não é falha do caderno.
  window.addEventListener(
    'error',
    function (e) {
      var el = e.target;
      if (el && el !== window) {
        if (el.tagName === 'SCRIPT' && el.type === 'module' && ours(el.src)) bootFailed();
        return;
      }
      if (ours(e.filename)) bootFailed();
    },
    true
  );
})();
