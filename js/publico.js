// Comportamento das páginas públicas. Nada de JavaScript dentro do HTML: a CSP só aceita arquivo daqui.
document.addEventListener('click', function (e) {
  var botao = e.target.closest('[data-copiar]');
  if (!botao) return;
  var alvo = document.querySelector(botao.dataset.copiar);
  navigator.clipboard.writeText(alvo.textContent.trim()).then(function () {
    botao.textContent = 'Copiada';
  });
});

// Recibo e declaração para a empresa (E6): o botão abre a janela de imprimir do navegador, onde também se salva em PDF.
document.addEventListener('click', function (e) {
  if (e.target.closest('[data-imprimir]')) window.print();
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

// Vitrine da capa: setas e pontos levam ao slide, o ponto acompanha o dedo, e ela passa sozinha a cada 7 segundos.
// Para quando a pessoa põe o mouse, o dedo ou o foco nela, e não passa sozinha para quem pediu menos movimento.
(function () {
  var vitrine = document.querySelector('[data-vitrine]');
  if (!vitrine) return;
  var trilho = vitrine.querySelector('[data-vitrine-trilho]');
  var slides = vitrine.querySelectorAll('[data-vitrine-slide]');
  var pontos = vitrine.querySelectorAll('[data-vitrine-ponto]');
  if (slides.length < 2) return;
  function atual() { return Math.round(trilho.scrollLeft / trilho.clientWidth); }
  function ir(i) {
    i = (i + slides.length) % slides.length;
    trilho.scrollTo({ left: i * trilho.clientWidth });
    marcar(i);
  }
  function marcar(i) {
    if (typeof i !== 'number') i = atual();
    pontos.forEach(function (p, n) { p.setAttribute('aria-current', n === i ? 'true' : 'false'); });
  }
  var espera;
  trilho.addEventListener('scroll', function () { clearTimeout(espera); espera = setTimeout(marcar, 60); });
  vitrine.addEventListener('click', function (e) {
    if (e.target.closest('[data-vitrine-anterior]')) ir(atual() - 1);
    if (e.target.closest('[data-vitrine-proxima]')) ir(atual() + 1);
    var ponto = e.target.closest('[data-vitrine-ponto]');
    if (ponto) ir(Number(ponto.dataset.vitrinePonto));
  });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var parada = false;
  ['mouseenter', 'focusin', 'touchstart'].forEach(function (ev) { vitrine.addEventListener(ev, function () { parada = true; }, { passive: true }); });
  vitrine.addEventListener('mouseleave', function () { parada = false; });
  vitrine.addEventListener('focusout', function (e) { if (!vitrine.contains(e.relatedTarget)) parada = false; });
  setInterval(function () { if (!parada && !document.hidden) ir(atual() + 1); }, 7000);
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

// O «i» (<x-info>): o navegador abre o balão sozinho, no meio da tela. Aqui ele vai para logo abaixo do «i» e desce
// com a página. O navegador fecha com clique fora ou Esc; aqui fecha também no toque no próprio balão e quando o campo
// que ele explica (aria-describedby) recebe o foco: no celular o balão cobre o campo, e quem vai digitar não precisa
// tocar fora antes.
document.addEventListener('beforetoggle', function (e) {
  var balao = e.target;
  if (e.newState !== 'open' || !balao.classList || !balao.classList.contains('info-texto')) return;
  var botao = document.querySelector('[popovertarget="' + CSS.escape(balao.id) + '"]');
  if (!botao) return;
  var r = botao.getBoundingClientRect();
  var tela = document.documentElement.clientWidth;
  var largura = Math.min(320, tela - 32);
  balao.classList.add('info-texto--ancorado');
  balao.style.left = (window.scrollX + Math.max(16, Math.min(r.left - 8, tela - largura - 16))) + 'px';
  balao.style.top = (window.scrollY + r.bottom + 6) + 'px';
}, true);

document.addEventListener('click', function (e) {
  var balao = e.target.closest && e.target.closest('.info-texto');
  if (balao && balao.matches(':popover-open')) balao.hidePopover();
});
document.addEventListener('focusin', function (e) {
  var ids = (e.target.getAttribute && e.target.getAttribute('aria-describedby')) || '';
  ids.split(/\s+/).forEach(function (id) {
    var balao = id && document.getElementById(id);
    if (balao && balao.classList.contains('info-texto') && balao.matches(':popover-open')) balao.hidePopover();
  });
});
