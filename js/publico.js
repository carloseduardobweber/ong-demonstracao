// Comportamento das páginas públicas. Nada de JavaScript dentro do HTML: a CSP só aceita arquivo daqui.
document.addEventListener('click', function (e) {
  var botao = e.target.closest('[data-copiar]');
  if (!botao) return;
  var alvo = document.querySelector(botao.dataset.copiar);
  navigator.clipboard.writeText(alvo.textContent.trim()).then(function () {
    botao.textContent = 'Copiada';
  });
});

// Sua cidade: quem escolhe a cidade deixa de ver as campanhas das outras. A escolha fica só neste aparelho; o site
// não descobre sozinho onde a pessoa está.
(function () {
  var escolha = document.querySelector('[data-escolha-cidade]');
  if (!escolha) return;
  function lembrada() { try { return localStorage.getItem('ong-cidade') || ''; } catch (e) { return ''; } }
  function aplicar(cidade) {
    if (cidade && !escolha.querySelector('[data-cidade-botao="' + CSS.escape(cidade) + '"]')) cidade = '';
    escolha.querySelectorAll('[data-cidade-botao]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.cidadeBotao === cidade ? 'true' : 'false');
    });
    document.querySelectorAll('[data-cidade]').forEach(function (el) {
      el.hidden = cidade !== '' && el.dataset.cidade !== cidade;
    });
    document.querySelectorAll('[data-cidade-grupo]').forEach(function (grupo) {
      var vazio = grupo.querySelector('[data-cidade-vazio]');
      var itens = grupo.querySelectorAll('[data-cidade]');
      if (!vazio) return;
      vazio.hidden = itens.length === 0 || Array.prototype.some.call(itens, function (el) { return !el.hidden; });
    });
  }
  escolha.addEventListener('click', function (e) {
    var botao = e.target.closest('[data-cidade-botao]');
    if (!botao) return;
    try { localStorage.setItem('ong-cidade', botao.dataset.cidadeBotao); } catch (err) { /* aba anônima: vale só nesta página */ }
    aplicar(botao.dataset.cidadeBotao);
  });
  aplicar(lembrada());
})();

// Demonstração (GitHub Pages): não há app por trás, então o formulário avisa em vez de enviar.
if (document.documentElement.hasAttribute('data-demonstracao')) {
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target;
    if (form.querySelector('[data-aviso-demo]')) return;
    var aviso = document.createElement('p');
    aviso.className = 'text-sm text-muted-foreground';
    aviso.setAttribute('data-aviso-demo', '');
    aviso.textContent = 'Na demonstração, nada é enviado.';
    form.appendChild(aviso);
  });
}
