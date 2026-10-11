/* A lista aberta: o painel da casa no lugar do menu do sistema em todo <select>.
   Copiado do Zelo Tarefas (public/assets/js/zelo-ds.js) em 11/10/2026, sem mudança. O desenho mora em
   frontend/components.css («Lista aberta»). */

/* ============================ A LISTA ABERTA (set/2026) ============================
   O menu que DESCE de toda lista suspensa (<select>) dos quatro sistemas.

   🔑 O DEFEITO
   Em 11/09/2026 o Carlos mostrou o filtro de categoria dos Insumos do Custeio aberto: o menu
   era o do macOS — cinza, com o ✓ do sistema, letra do sistema — ao lado do painel da casa
   que o combo do Tarefas abre («Digite para filtrar…», item teal-leve no mouse, o escolhido
   em negrito com ✓). A seta da lista FECHADA já era da casa desde a manhã do mesmo dia; o
   menu ABERTO nunca foi: o navegador desenha esse menu por fora da página, e nenhuma folha
   de estilo alcança ele. Não há CSS que conserte isto. Por isso esta peça é JavaScript.

   🔑 COMO FUNCIONA — o <select> continua sendo o controle
   Não se troca a lista por outra coisa (como o combo faz com o botão): a lista FECHADA fica
   exatamente como está, com a altura, a classe, a seta e o valor que cada tela já deu a ela.
   O que muda é só o que acontece quando ela ABRE:
     - o clique (mousedown) e as teclas que abririam o menu nativo são impedidos
       (preventDefault) e, no lugar, sobe o painel da casa, logo embaixo da lista;
     - o FOCO NÃO SAI DO <select> enquanto o painel está aberto — é assim no menu nativo, e é o
       que protege toda tela que faz alguma coisa quando a lista perde o foco (salvar ao sair,
       fechar o editor da linha). As teclas vão para o painel por um ouvinte no documento;
     - escolher grava na lista (selectedIndex) e dispara 'input' e 'change', como o nativo.
       Toda tela que ouve a lista continua ouvindo do mesmo jeito.
   Como o ouvinte mora no DOCUMENTO, vale para toda lista: a que já está na tela, a que o
   JavaScript cria depois, a que chega pelo painel lateral. Nenhuma tela precisa ser marcada.

   🔑 O QUE FICA NATIVO, DE PROPÓSITO
     - NO TOQUE (celular, tablet sem mouse): a roda do próprio aparelho, feita para o dedo. O
       defeito era o menu do Mac; no celular o sistema abre uma folha grande que é o certo lá.
     - navegador sem a API de popover (Safari antes do 17, Firefox antes do 125): ver abaixo.
     - lista de várias linhas (multiple, size>1): é caixa aberta, não menu que desce.
     - lista desabilitada: não abre, igual ao nativo.
     - o combo do Tarefas (<select data-combo>): ele já é o painel da casa.
     - `data-nativo` na lista (ou num contêiner acima dela): a porta de saída, para a tela que
       um dia precisar do menu do sistema. Hoje nenhuma usa.

   🔑 A BUSCA APARECE QUANDO A LISTA NÃO CABE
   Com 8 opções ou mais o painel mostra o campo «Digite para filtrar…» em cima, como o combo.
   Com menos, a lista inteira cabe à vista e um campo de busca sobre três opções só atrapalha.
   O número mora em BUSCA_A_PARTIR_DE, aqui embaixo. Sem o campo, digitar ainda pula para a
   opção que começa com a letra, como no nativo.

   🔑 ONDE O PAINEL MORA
   No fim do <body> (ou dentro do <dialog> aberto que contém a lista), no «top layer» do
   navegador (atributo popover) — acima de tudo, e fora de qualquer caixa com overflow:hidden
   que cortaria um painel pendurado dentro dela. Fica fora da tela de cada um de propósito:
   pendurado ao lado da lista, herdaria as regras de descendente das telas (`td div`,
   `.card > div`…). Os cliques dentro dele não sobem para o documento, para o «clique fora»
   dos balões das telas não fechar o balão que contém a lista.

   🔑 O PAINEL ROLA POR DENTRO. A lista dele tem barra própria (e ela rola sozinha ao abrir, para
   mostrar a opção escolhida). Esse 'scroll' NASCE no painel e sobe na fase de captura: todo
   ouvinte de `scroll` em captura da página recebe um evento que a página não rolou. Balão que
   fecha na rolagem precisa deixar este de fora — o gesto é sempre o mesmo:
       if (e.target && e.target.closest && e.target.closest('.lista-pop')) return;
   (feito no calpop.js do Tarefas; os outros ouvintes de captura da casa não fecham nada que
   possa estar aberto junto com o painel).

   O CSS da peça mora em components.css («A LISTA ABERTA»). Este arquivo é gerado junto no
   dist/zelo-ds.js pelo bin/build.sh e copiado para /assets/js/zelo-ds.js pelo bin/sync.sh.
   Não edite a cópia dentro de um app: o próximo sync apaga, e os outros três ficam para trás.
   ================================================================================== */
(function () {
    'use strict';
    if (window.ZeloLista) return; // carregado duas vezes na mesma página: um basta
    // Sem a API de popover (Safari antes do 17, Firefox antes do 125) a peça não faz NADA e
    // fica o menu do sistema. Um painel «fixed» comum ficaria embaixo das camadas que tomam a
    // tela (o tour e as Novidades do Portal, --ds-z-tela) e seria cortado pela caixa com
    // transform que o contém (a barra de lote do Custeio). Menu nativo é melhor que menu torto.
    if (typeof HTMLElement === 'undefined' || typeof HTMLElement.prototype.showPopover !== 'function') {
        // A tela que chamar ZeloLista.fechar() (a API publicada no fim do arquivo) quebraria com
        // TypeError aqui, e levaria junto o resto do ouvinte dela. Casca oca é mais honesta.
        window.ZeloLista = { abrir: function () {}, fechar: function () {}, aberta: function () { return null; } };
        return;
    }

    var BUSCA_A_PARTIR_DE = 8;
    var DICA_BUSCA = 'Digite para filtrar…';

    var ehMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

    var pop = null;      // o painel (um só, reaproveitado)
    var caixaBusca = null;
    var listaEl = null;
    var avisoEl = null;  // recado invisível para o leitor de tela (o <select> não conta o painel)
    var sel = null;      // a lista que o painel está servindo agora
    var itens = [];      // opções visíveis: { i: índice no select, el, texto, desligada }
    var ativo = -1;      // posição em `itens` da opção destacada
    var termo = '';
    var comBusca = false;
    var digitado = '', digitadoAte = 0; // pular pela letra, quando não há busca
    var ponteiro = 'mouse';
    var arrastando = false;   // apertou na lista e ainda não soltou: soltar em cima da opção escolhe
    var andouDentro = false;  // …e o ponteiro andou DENTRO do painel (o arrastar do menu do Mac)
    var mx = -1, my = -1;     // último lugar do ponteiro, para separar movimento de refresco
    var apertouDentro = false; // o gesto começou DENTRO do painel (mesmo que solte fora)
    var letraAte = 0;         // busca por letra na lista FECHADA: o Espaço faz parte da palavra
    var vigia = null;    // MutationObserver da lista enquanto aberta
    var vigiaDoc = null; // e o do documento, que avisa quando a lista sai da árvore
    var quadro = 0;      // requestAnimationFrame do reposicionamento
    var seq = 0;

    function norm(s) {
        s = String(s || '').toLowerCase();
        try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
        // Acento SOLTO: no teclado brasileiro o ´ do «Açúcar» chega como caractere próprio em alguns
        // navegadores, e ele não é acento combinante — sem tirar daqui, digitar «a´cucar» não acha nada.
        s = s.replace(/[\u00b4`^~\u00a8]/g, '');
        return s.replace(/\s+/g, ' ').trim();
    }

    function serve(el) {
        if (!el || el.tagName !== 'SELECT') return false;
        if (el.multiple || el.size > 1) return false;
        if (el.disabled) return false;
        try { if (el.matches(':disabled')) return false; } catch (e) {}
        if (el.classList.contains('combo__select')) return false;
        if (el.closest('[data-nativo]')) return false;
        // Lista SEM opção nenhuma (o «tipo de envio» do Portal quando o cliente não tem nenhum
        // liberado): fica com o nativo. Interceptar aqui seria pior que o menu do sistema — o
        // clique não faria NADA, porque não há painel a abrir.
        if (!el.options.length) return false;
        return true;
    }

    function aberto() { return !!sel; }

    // SEM O DESENHO, A PEÇA NÃO FAZ NADA — a mesma doutrina do popover, lá em cima: menu nativo é
    // melhor que menu torto. O zelo-ds.js é arquivo à parte do zelo-ds.css e pode chegar sozinho:
    // na primeira publicação (o .js sobe nomeado, o .css esquecido), numa tela que carrega só o JS,
    // ou num desenho de painel sem a injeção do estilo. Sem as regras .lista-pop o navegador
    // desenha o popover dele: caixa centralizada na tela, fio preto, letra do sistema. A prova é a
    // marca --lista-pop-viva, que só o bloco «A LISTA ABERTA» escreve e que nenhuma tela tem motivo
    // para mexer (medir a sombra diria «não chegou» no dia em que um app escolhesse outra sombra).
    function temDesenho() {
        montarPainel();
        if (!pop.isConnected) document.body.appendChild(pop);
        var viva = '';
        try { viva = window.getComputedStyle(pop).getPropertyValue('--lista-pop-viva') || ''; } catch (e) { return false; }
        return viva.trim() === '1';
    }

    function montarPainel() {
        if (pop) return;
        pop = document.createElement('div');
        pop.className = 'lista-pop lista-pop--flutua';
        pop.setAttribute('popover', 'manual');
        // O campo de busca é um <input> de verdade, para vestir o MESMO campo do combo (o grupo
        // de campos de base.css). Mas só de leitura e fora do Tab: o foco fica na lista, e as
        // letras chegam aqui pelo ouvinte de teclas.
        pop.innerHTML =
            '<input type="text" class="lista-pop__busca is-ligada" readonly tabindex="-1" aria-hidden="true" autocomplete="off">' +
            '<div class="lista-pop__lista" role="listbox" aria-label="Opções da lista"></div>' +
            '<div class="lista-pop__aviso" role="status" aria-live="polite"></div>';
        caixaBusca = pop.querySelector('.lista-pop__busca');
        caixaBusca.placeholder = DICA_BUSCA;
        listaEl = pop.querySelector('.lista-pop__lista');
        listaEl.id = 'zelo-lista-' + (++seq);
        avisoEl = pop.querySelector('.lista-pop__aviso');

        // O foco fica na lista: apertar dentro do painel não pode tirá-lo de lá.
        pop.addEventListener('mousedown', function (e) { e.preventDefault(); });
        // O ponteiro ANDOU dentro do painel — em qualquer parte dele, não só nas opções: é isso
        // que separa o arrastar do menu do Mac (apertar na lista, arrastar até a opção e soltar)
        // do clique parado, que só abre.
        pop.addEventListener('mousemove', function () { if (arrastando) andouDentro = true; });
        // Cliques no painel não sobem para o documento (ver «ONDE O PAINEL MORA»).
        ['mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup', 'touchstart', 'touchend']
            .forEach(function (tipo) {
                pop.addEventListener(tipo, function (e) { e.stopPropagation(); });
            });
        listaEl.addEventListener('click', function (e) {
            e.preventDefault();
            var el = e.target.closest ? e.target.closest('.lista-pop__opt') : null;
            if (!el || el.getAttribute('aria-disabled') === 'true') return;
            escolher(parseInt(el.getAttribute('data-i'), 10));
        });
        // APERTAR, ARRASTAR E SOLTAR em cima da opção — o gesto do menu do macOS. Nesse caminho não
        // nasce 'click' útil (o mousedown foi na lista, o mouseup na opção: o clique iria ao ancestral
        // comum, que é o <body>), então quem escolhe é o soltar.
        listaEl.addEventListener('mouseup', function (e) {
            if (!arrastando) return;
            arrastando = false;
            // Apertar e SOLTAR PARADO só abre — é o clique de sempre. Escolher aqui sem o ponteiro
            // ter andado dentro do painel gravaria sozinho a opção que nasceu debaixo do cursor
            // (acontece na janela baixa, em que o painel é empurrado para cima da própria lista).
            if (!andouDentro) return;
            var el = e.target.closest ? e.target.closest('.lista-pop__opt') : null;
            if (!el || el.getAttribute('aria-disabled') === 'true') return;
            escolher(parseInt(el.getAttribute('data-i'), 10));
        });
        listaEl.addEventListener('mousemove', function (e) {
            // O navegador manda um 'mousemove' NO MESMO PONTO quando a lista rola embaixo do
            // ponteiro parado (é o refresco do :hover, não gesto de ninguém). Sem esta conferência,
            // andar de seta com o mouse largado em cima do painel jogava o destaque de volta para a
            // opção sob o cursor e tirava o risco teal do modo teclado.
            if (e.clientX === mx && e.clientY === my) return;
            mx = e.clientX; my = e.clientY;
            pop.classList.remove('lista-pop--teclado');
            var el = e.target.closest ? e.target.closest('.lista-pop__opt') : null;
            if (!el) return;
            var k = parseInt(el.getAttribute('data-k'), 10);
            if (k !== ativo && !itens[k].desligada) destacar(k, false);
        });
    }

    function textoDa(o) { return (o.label || o.text || '').replace(/\s+/g, ' ').trim(); }

    // Monta as opções que passam no filtro. <optgroup> vira título, e só aparece quando
    // sobra alguma opção dele (grupo vazio não deixa cabeçalho órfão — regra do combo).
    function render() {
        var f = norm(termo);
        listaEl.innerHTML = '';
        itens = [];
        var grupoAtual = null;
        var escolhida = sel.selectedIndex;
        Array.prototype.forEach.call(sel.options, function (o, i) {
            var pai = o.parentNode;
            var grupo = (pai && pai.tagName === 'OPTGROUP') ? pai : null;
            if (o.hidden || (grupo && grupo.hidden) || o.style.display === 'none') return;
            var texto = textoDa(o);
            if (f && norm(texto).indexOf(f) === -1) return;
            if (grupo !== grupoAtual) {
                grupoAtual = grupo;
                if (grupo) {
                    var tit = document.createElement('div');
                    tit.className = 'lista-pop__grupo';
                    tit.setAttribute('role', 'presentation');
                    tit.textContent = grupo.label;
                    listaEl.appendChild(tit);
                }
            }
            var desligada = o.disabled || !!(grupo && grupo.disabled);
            var el = document.createElement('div');
            el.className = 'lista-pop__opt' + (i === escolhida ? ' is-sel' : '') +
                (desligada ? ' is-desligada' : '');
            el.id = listaEl.id + '-' + i;
            el.setAttribute('role', 'option');
            el.setAttribute('aria-selected', i === escolhida ? 'true' : 'false');
            if (desligada) el.setAttribute('aria-disabled', 'true');
            el.setAttribute('data-i', String(i));
            el.setAttribute('data-k', String(itens.length));
            el.textContent = texto || '\u00a0'; // opção vazia ainda ocupa a linha dela
            // Opção pintada à mão (o Status do Tarefas escreve style="color:…" em cada uma): a cor
            // é dado da tela, não decisão da peça — vai junto, para o painel dizer o mesmo que a
            // lista fechada diz. Só a cor; o resto do estilo da opção é da casa.
            if (o.style && o.style.color) el.style.color = o.style.color;
            listaEl.appendChild(el);
            itens.push({ i: i, el: el, texto: norm(texto), desligada: desligada });
        });
        if (!itens.length) {
            var v = document.createElement('div');
            v.className = 'lista-pop__vazio';
            v.textContent = 'Nada encontrado.';
            listaEl.appendChild(v);
        }
    }

    function pintarBusca() {
        caixaBusca.hidden = !comBusca;
        caixaBusca.value = termo;
    }

    function primeiraLigada(de, passo) {
        for (var k = de; k >= 0 && k < itens.length; k += passo) {
            if (!itens[k].desligada) return k;
        }
        return -1;
    }

    function destacar(k, revelar) {
        if (ativo >= 0 && itens[ativo]) itens[ativo].el.classList.remove('is-ativo');
        ativo = k;
        if (k < 0 || !itens[k]) { sel.removeAttribute('aria-activedescendant'); return; }
        itens[k].el.classList.add('is-ativo');
        sel.setAttribute('aria-activedescendant', itens[k].el.id);
        // O <select> nativo não conta ao leitor de tela o que se passa dentro deste painel (o estado
        // «aberto» dele vem do menu do sistema, não do aria-expanded que escrevemos). Então quem fala
        // é um recado invisível: o texto da opção em destaque, e quantas sobraram no filtro.
        // Só o TECLADO fala (é o que `revelar` já distingue): no mouse a pessoa está vendo onde
        // está, e anunciar cada opção atravessada vira enxurrada. E o total é o que se VÊ — o
        // options.length contaria as escondidas das listas dependentes.
        if (avisoEl && revelar) avisoEl.textContent = itens[k].el.textContent +
            (comBusca ? ', ' + itens.length + ' de ' + contarVisiveis(sel) : '');
        if (revelar) mostrarNaLista(itens[k].el);
    }

    // Rolar SÓ a lista do painel. scrollIntoView rolaria a página junto.
    function mostrarNaLista(el) {
        var topo = el.offsetTop, base = topo + el.offsetHeight;
        if (topo < listaEl.scrollTop) listaEl.scrollTop = topo;
        else if (base > listaEl.scrollTop + listaEl.clientHeight) listaEl.scrollTop = base - listaEl.clientHeight;
    }

    function destaqueInicial() {
        var k = -1;
        if (!termo) {
            for (var j = 0; j < itens.length; j++) {
                if (itens[j].i === sel.selectedIndex && !itens[j].desligada) { k = j; break; }
            }
        }
        if (k < 0) k = primeiraLigada(0, 1);
        destacar(k, true);
    }

    // A tela mexeu nas opções com o painel aberto. O destaque do teclado é REENCONTRADO pelo índice
    // da opção no <select> — quem estava na trigésima não volta para o começo a cada mexida.
    function refazer() {
        if (!sel) return;
        if (!serve(sel)) { fechar(); return; } // desabilitada (ou esvaziada) com o painel aberto
        // A tela pode ter trocado UMA opção («Carregando…») por sessenta com o painel aberto: quem
        // decide o campo de busca é a contagem de AGORA. Só enquanto não há termo digitado — sumir
        // com o campo no meio da digitação deixaria o filtro valendo sem nada que o explique.
        if (!termo) comBusca = contarVisiveis(sel) >= BUSCA_A_PARTIR_DE;
        // O destaque é reencontrado pelo NÓ da opção, não pelo índice: a tela que INSERE uma opção
        // acima dele mudaria o índice, e o destaque escorregaria para a vizinha sem barulho.
        var antesEl = (ativo >= 0 && itens[ativo]) ? sel.options[itens[ativo].i] : null;
        var rolagem = listaEl.scrollTop;
        render();
        pintarBusca();
        var k = -1;
        for (var j = 0; antesEl && j < itens.length; j++) {
            if (sel.options[itens[j].i] === antesEl && !itens[j].desligada) { k = j; break; }
        }
        if (k >= 0) { destacar(k, false); listaEl.scrollTop = rolagem; }
        else destaqueInicial();
        posicionar();
    }

    // O RETÂNGULO EM QUE A LISTA APARECE DE VERDADE: a caixa dela cortada por toda caixa que rola
    // (a tabela larga dos Insumos, o montador do DFC). Sem isto, rolar a tabela de lado levava o
    // painel junto com uma lista que já estava escondida atrás da borda — painel no ar apontando
    // para o vazio.
    function vistaDa(el) {
        var r = el.getBoundingClientRect();
        var t = r.top, b = r.bottom, l = r.left, d = r.right;
        var pe = '';
        try { pe = window.getComputedStyle(el).position; } catch (x) {}
        // Lista FIXA não é cortada por caixa que rola (ela sai do fluxo e se prende à tela), e a
        // ABSOLUTA só é cortada por quem for o bloco-contêiner dela — o ancestral posicionado, ou
        // com transform/filter/perspective. Sem isto, a lista da barra fixa do Tarefas seria dada
        // como escondida assim que a página rolasse.
        if (pe === 'fixed') return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, escondida: false };
        var p = el.parentElement;
        while (p && p !== document.body && p !== document.documentElement) {
            var e;
            try { e = window.getComputedStyle(p); } catch (x) { break; }
            if (pe === 'absolute' && e.position === 'static' && e.transform === 'none' &&
                e.filter === 'none' && e.perspective === 'none') { p = p.parentElement; continue; }
            if (e.overflow !== 'visible' || e.overflowX !== 'visible' || e.overflowY !== 'visible') {
                var c = p.getBoundingClientRect();
                if (c.top > t) t = c.top;
                if (c.bottom < b) b = c.bottom;
                if (c.left > l) l = c.left;
                if (c.right < d) d = c.right;
            }
            p = p.parentElement;
        }
        return { top: t, bottom: b, left: l, right: d, escondida: (b - t) < 4 || (d - l) < 4 };
    }

    function posicionar() {
        quadro = 0;
        if (!sel) return;
        if (!sel.isConnected) { fechar(); return; }
        var r = sel.getBoundingClientRect();
        var vw = document.documentElement.clientWidth || window.innerWidth;
        var vh = window.innerHeight;
        if (r.width === 0 && r.height === 0) { fechar(); return; } // a lista sumiu da tela
        if (r.bottom < 0 || r.top > vh) { fechar(); return; }       // rolou para fora da vista
        if (vistaDa(sel).escondida) { fechar(); return; }           // a caixa que rola escondeu a lista
        var margem = 8;
        var larguraMin = Math.min(Math.max(r.width, 200), vw - 2 * margem);
        pop.style.minWidth = larguraMin + 'px';
        pop.style.maxWidth = Math.min(Math.max(larguraMin, 360), vw - 2 * margem) + 'px';
        listaEl.style.maxHeight = '';
        var alto = pop.offsetHeight;
        var largo = pop.offsetWidth;
        var embaixo = vh - r.bottom - 4 - margem;
        var emcima = r.top - 4 - margem;
        var top;
        if (alto <= embaixo || embaixo >= emcima) {
            if (alto > embaixo) encolher(alto, embaixo);
            top = r.bottom + 4;
        } else {
            if (alto > emcima) encolher(alto, emcima);
            top = r.top - 4 - pop.offsetHeight;
        }
        var left = r.left;
        if (left + largo > vw - margem) left = vw - margem - largo;
        if (left < margem) left = margem;
        // Janela baixa (ou zoom grande): mesmo encolhido, o painel pode não caber. Ele fica DENTRO
        // da vista — melhor a última opção cortada embaixo do que a busca cortada em cima.
        var alturaFinal = pop.offsetHeight;
        if (top < margem) top = margem;
        if (top + alturaFinal > vh - margem) top = Math.max(margem, vh - margem - alturaFinal);
        pop.style.left = Math.round(left) + 'px';
        pop.style.top = Math.round(top) + 'px';
    }

    function encolher(alto, espaco) {
        var cabe = listaEl.offsetHeight - (alto - espaco);
        listaEl.style.maxHeight = Math.max(cabe, 96) + 'px';
    }

    function agendarPosicao(e) {
        if (!sel || quadro) return;
        if (e && e.target === listaEl) return; // rolar a própria lista não move o painel
        quadro = window.requestAnimationFrame(posicionar);
    }

    function abrir(s) {
        if (sel) fechar();
        montarPainel();
        sel = s;
        termo = '';
        digitado = '';
        pop.classList.remove('lista-pop--teclado');
        comBusca = contarVisiveis(s) >= BUSCA_A_PARTIR_DE;
        var casa = s.closest('dialog[open]') || document.body;
        if (pop.parentNode !== casa) casa.appendChild(pop);
        render();
        pintarBusca();
        try { pop.showPopover(); } catch (x) {
            // Painel que não subiu com a lista já apontada é o pior dos mundos: o menu do sistema
            // foi impedido e o ouvinte de teclas passaria a engolir tudo numa lista sem painel na
            // tela. Aqui ainda não há nada pendurado nela — o próximo clique tenta de novo.
            sel = null;
            return;
        }
        posicionar();
        destaqueInicial();
        s.setAttribute('aria-expanded', 'true');
        s.setAttribute('aria-controls', listaEl.id);
        // A tela pode refazer as opções com o painel aberto: ele acompanha.
        if (window.MutationObserver) {
            // Só o que muda as opções. Os aria-* que este arquivo escreve na lista ficam de fora:
            // observá-los faria cada destaque refazer o painel, que destacaria de novo, sem fim.
            vigia = new MutationObserver(function () { if (sel) refazer(); });
            vigia.observe(s, { childList: true, subtree: true, characterData: true,
                attributes: true, attributeFilter: ['disabled', 'hidden', 'label', 'style'] });
            // E um segundo, no documento inteiro, só para saber se a LISTA saiu da árvore: quem
            // arranca a lista (o formulário refeito por innerHTML) não mexe dentro dela, então o
            // vigia de cima não vê nada e o painel ficaria na tela por cima de uma lista morta.
            // A conta é barata: o que ele faz por mudança é um `isConnected`.
            vigiaDoc = new MutationObserver(function () { if (sel && !sel.isConnected) fechar(); });
            vigiaDoc.observe(document.documentElement, { childList: true, subtree: true });
        }
        if (avisoEl) avisoEl.textContent = '';
        s.addEventListener('blur', aoPerderFoco);
    }

    function contarVisiveis(s) {
        var n = 0;
        Array.prototype.forEach.call(s.options, function (o) {
            var pai = o.parentNode;
            if (o.hidden || o.style.display === 'none') return;
            if (pai && pai.tagName === 'OPTGROUP' && pai.hidden) return;
            n++;
        });
        return n;
    }

    function fechar() {
        if (!sel) return;
        var s = sel;
        sel = null;
        if (vigia) { vigia.disconnect(); vigia = null; }
        if (vigiaDoc) { vigiaDoc.disconnect(); vigiaDoc = null; }
        if (quadro) { window.cancelAnimationFrame(quadro); quadro = 0; }
        s.removeEventListener('blur', aoPerderFoco);
        s.removeAttribute('aria-expanded');       // lista fechada é do navegador de novo
        s.removeAttribute('aria-activedescendant');
        s.removeAttribute('aria-controls');       // o painel é UM só: apontar para ele depois de
                                                  // fechado é promessa que não se cumpre
        listaEl.innerHTML = '';                   // e a lista de 800 categorias não fica guardada
        try { pop.hidePopover(); } catch (e) {}
        itens = [];
        ativo = -1;
        arrastando = false;
        andouDentro = false;
        apertouDentro = false;
        mx = -1; my = -1;
        if (avisoEl) avisoEl.textContent = '';
    }

    function aoPerderFoco() { fechar(); }

    // Escolher: fecha ANTES de avisar a tela (a lista que envia o formulário no 'change' leva a
    // página embora, e ela não pode ser guardada com o painel aberto), e só avisa se MUDOU —
    // como o nativo; a lista que grava na hora faria um envio à toa. Os dois eventos saem
    // marcados com `zeloLista: true`: é ESCOLHA FEITA no painel, não passeio de seta pela
    // lista fechada. A tela que espera o Enter antes de aplicar o que a seta trocou (o filtro
    // do Custeio que aplica ao escolher) usa a marca para aplicar esta na hora.
    function avisar(s, tipo) {
        var ev = new Event(tipo, { bubbles: true });
        ev.zeloLista = true;
        s.dispatchEvent(ev);
    }
    function escolher(i) {
        var s = sel;
        if (!s) return;
        fechar();
        // A tela pode ter trocado a lista embaixo do painel (formulário refeito, linha redesenhada):
        // gravar num nó fora da página não avisa ninguém — o evento não sobe — e ainda mexeria numa
        // lista que não existe mais.
        if (!s.isConnected || !serve(s)) return;
        // Índice de um desenho que já não vale (a tela encolheu as opções entre o render e o
        // clique): gravar fora da faixa zera a lista (-1) e ainda avisaria a tela, que salvaria o
        // vazio achando que alguém escolheu.
        if (i < 0 || i >= s.options.length) return;
        // O foco volta ANTES de avisar, e depois disso a peça não toca mais nele: a tela que manda o
        // cursor para outro campo no 'change' (o «Tipo» do aviso do Tarefas manda para o Título, o
        // produto «Outro» do CRM manda para a caixa de escrever) tem a última palavra. Quase sempre
        // não há o que devolver — o foco nunca saiu da lista.
        var agora = document.activeElement;
        if (agora === null || agora === document.body || agora === document.documentElement) {
            try { s.focus({ preventScroll: true }); } catch (e) { s.focus(); }
        }
        if (s.selectedIndex !== i) {
            s.selectedIndex = i;
            avisar(s, 'input');
            avisar(s, 'change');
        }
    }

    function mover(passo) {
        pop.classList.add('lista-pop--teclado');
        if (!itens.length) return;
        var k;
        if (ativo < 0) k = primeiraLigada(passo > 0 ? 0 : itens.length - 1, passo > 0 ? 1 : -1);
        else {
            k = primeiraLigada(ativo + passo, passo > 0 ? 1 : -1);
            if (k < 0) k = ativo; // na ponta, fica (como o nativo)
        }
        if (k >= 0) destacar(k, true);
    }

    function saltar(passo) { // PageUp / PageDown: uma vista inteira
        pop.classList.add('lista-pop--teclado');
        if (!itens.length) return;
        var alvo = Math.max(0, Math.min(itens.length - 1, (ativo < 0 ? 0 : ativo) + passo));
        var k = primeiraLigada(alvo, passo > 0 ? 1 : -1);
        if (k < 0) k = primeiraLigada(alvo, passo > 0 ? -1 : 1);
        if (k >= 0) destacar(k, true);
    }

    function porLetra(ch) { // sem campo de busca: pula para a opção que começa com o digitado
        var agora = Date.now();
        digitado = (agora < digitadoAte ? digitado : '') + norm(ch);
        digitadoAte = agora + 800;
        var repetida = /^(.)\1*$/.test(digitado);
        var prefixo = repetida ? digitado.charAt(0) : digitado;
        var de = repetida && ativo >= 0 ? ativo + 1 : Math.max(ativo, 0);
        for (var n = 0; n < itens.length; n++) {
            var k = (de + n) % itens.length;
            if (!itens[k].desligada && itens[k].texto.indexOf(prefixo) === 0) { destacar(k, true); return; }
        }
    }

    // ---------------------------------------------------------------- os ouvintes

    // Quem apertou: mouse ou dedo. O pointerdown vem antes do mousedown de compatibilidade.
    window.addEventListener('pointerdown', function (e) { ponteiro = e.pointerType || 'mouse'; }, true);

    // O CLIQUE, em duas fases — cada uma com um trabalho.
    // (a) Na DESCIDA (captura, antes de qualquer tela): fechar o painel quando o clique cai fora
    //     dele. Tem de ser aqui, e não na subida: a tela que engole o clique (stopPropagation)
    //     deixaria o painel aberto para sempre. Clicar na PRÓPRIA lista aberta só fecha (como o
    //     nativo) — e o preventDefault impede a subida, abaixo, de reabrir.
    window.addEventListener('mousedown', function (e) {
        // Botão direito e do meio não geram 'click': marcar por eles deixaria um clique sintético
        // (o Enter num botão, o el.click() que a tela dispara) engolido lá embaixo, sem dono.
        apertouDentro = e.button === 0 && !!(pop && aberto() && pop.contains(e.target));
        if (!aberto() || apertouDentro) return; // o painel cuida de si
        var s = e.target && e.target.closest ? e.target.closest('select') : null;
        var mesma = s === sel;
        fechar();
        if (mesma) e.preventDefault();
    }, true);
    // O gesto que COMEÇOU no painel é do painel até o fim, mesmo que o dedo escorregue e solte
    // dois pixels fora dele: sem isto, o «clique fora» das telas (o balão de período da assessoria,
    // o do Custeio) fecharia o balão que contém a lista, e a pessoa perderia o que estava montando.
    window.addEventListener('click', function (e) {
        if (!apertouDentro) return;
        apertouDentro = false;
        if (!e.detail) return;                     // clique de TECLADO (Enter num botão): não é gesto
        if (pop && pop.contains(e.target)) return; // o painel já tratou
        e.stopPropagation();
        e.preventDefault();
    }, true);
    window.addEventListener('mouseup', function (e) {
        // O gesto que TERMINA no painel também é do painel. Apertar na lista, arrastar e soltar em
        // cima da opção NASCE fora dele: o mousedown foi no <select>, o mouseup na opção, e o
        // navegador manda o 'click' para o ancestral comum — o <body>. Sem marcar aqui, esse clique
        // chegaria ao «clique fora» das telas com alvo <body> e fecharia o balão que contém a lista:
        // a pessoa escolhe e perde o que estava montando.
        if (pop && pop.contains(e.target)) { apertouDentro = true; return; }
        if (!arrastando) return;
        arrastando = false;
    }, true);
    // (b) Na SUBIDA (depois de toda tela): abrir. Por último de propósito — se alguma tela já
    //     chamou preventDefault no clique da lista (a lista «só de leitura» que se faz assim), o
    //     menu nativo também não abriria, e o nosso respeita. A tela que ouve o mousedown da lista
    //     (o filtro do Custeio que aplica ao escolher) continua ouvindo: aqui nada é engolido.
    window.addEventListener('mousedown', function (e) {
        if (!e.isTrusted || e.defaultPrevented || e.button !== 0) return; // clique inventado por script não abre o nativo; o nosso também não
        var s = e.target && e.target.closest ? e.target.closest('select') : null;
        if (!serve(s)) return;
        if (ponteiro === 'touch' || ponteiro === 'pen') return; // no toque, a roda do aparelho
        if (!temDesenho()) return;                              // sem o CSS da casa, fica o nativo
        e.preventDefault();
        if (document.activeElement !== s) {
            try { s.focus({ preventScroll: true }); } catch (x) { s.focus(); }
        }
        // A tela pode ter levado o foco embora (ou desligado a lista) dentro do próprio 'focus':
        // abrir aí deixaria o painel sem dono, esperando um 'blur' que nunca vem.
        if (document.activeElement !== s || !serve(s)) return;
        arrastando = true;   // apertou e ainda não soltou: soltar em cima da opção escolhe
        abrir(s);
    });

    // Teclas com o painel ABERTO: todas passam por aqui antes da tela (fase de captura),
    // porque o foco está na lista e o Enter, a seta e o Esc agora são do painel.
    window.addEventListener('keydown', function (e) {
        if (!aberto() || e.isComposing) return;
        if (e.target !== sel) { fechar(); return; }
        var k = e.key;
        var usar = true;
        if (k === 'Escape') fechar();
        // O Tab: no Windows e no Firefox o menu do sistema CONFIRMA o destaque e segue; no Mac ele
        // nem responde ao Tab, e sair sem gravar é o certo. Nos dois casos o Tab segue o caminho dele.
        else if (k === 'Tab') { if (!ehMac && ativo >= 0) escolher(itens[ativo].i); else fechar(); usar = false; }
        else if (k === 'ArrowDown') { if (e.altKey) fechar(); else mover(1); }
        else if (k === 'ArrowUp') { if (e.altKey) fechar(); else mover(-1); }
        else if (k === 'PageDown') saltar(8);
        else if (k === 'PageUp') saltar(-8);
        else if (k === 'Home') { pop.classList.add('lista-pop--teclado'); destacar(primeiraLigada(0, 1), true); }
        else if (k === 'End') { pop.classList.add('lista-pop--teclado'); destacar(primeiraLigada(itens.length - 1, -1), true); }
        else if (k === 'Enter') { if (ativo >= 0) escolher(itens[ativo].i); }
        else if (k === ' ' && !(comBusca && termo)) { if (ativo >= 0) escolher(itens[ativo].i); }
        else if (k === 'F4') fechar();   // fora do Mac, é a tecla que fecha o menu do sistema
        else if (k === 'Backspace' && comBusca) { termo = termo.slice(0, -1); refazer(); }
        else if (k.length === 1 && !e.ctrlKey && !e.metaKey) {
            pop.classList.add('lista-pop--teclado');
            if (comBusca) { termo += k; refazer(); }
            else porLetra(k);
        }
        // Atalho com Cmd/Ctrl (recarregar, copiar), tecla de função (F5 recarrega, F11 tela cheia) e
        // modificador solto passam direto: engolir tecla que a peça não usa é surpresa, não proteção.
        else usar = !(e.metaKey || e.ctrlKey || /^F\d+$/.test(k) ||
            k === 'Shift' || k === 'Control' || k === 'Alt' || k === 'Meta');
        if (usar) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    // Teclas que ABRIRIAM o menu nativo, com a lista FECHADA. Aqui é na SUBIDA, e no window —
    // o último da fila, depois de todo ouvinte das telas, qualquer que seja a ordem em que os
    // scripts carregaram: tela que já tratou a tecla (o filtro do Custeio que aplica com Enter, a
    // grade que anda com a seta) continua mandando nela — se ela chamou preventDefault, ou se já
    // levou o foco para outro campo, a lista não abre. As teclas são as que o Chrome usa para
    // abrir o menu: no Mac, Espaço e as setas; nos outros, Espaço, Alt+seta e F4 (lá a seta
    // sozinha troca a opção sem abrir nada, e continua trocando). O Enter entra também: numa
    // lista ele não envia formulário nenhum, e abrir é o que se espera dele.
    window.addEventListener('keydown', function (e) {
        if (aberto() || e.defaultPrevented || !e.isTrusted || e.isComposing || e.repeat) return;
        var s = e.target;
        if (!serve(s) || document.activeElement !== s) return;
        if (ponteiro === 'touch' || ponteiro === 'pen') return;
        var k = e.key;
        // BUSCA POR LETRA na lista fechada: o navegador pula para a opção que começa com o que se
        // digita, e o ESPAÇO faz parte da palavra («conta azul», «loucos por carne»). O Chrome não
        // abre o menu enquanto essa busca está viva; a peça também não, pela mesma janela de ~1s.
        if (k.length === 1 && k !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) { letraAte = Date.now() + 1000; return; }
        // Cmd/Ctrl passam direto (recarregar, copiar) — MENOS a seta, que no Mac abre o menu do
        // sistema com modificador e sem ele. O Shift também não protege nada: o Chrome ignora.
        if ((e.ctrlKey || e.metaKey) && k !== 'ArrowDown' && k !== 'ArrowUp') return;
        var abre = (k === ' ' && !e.altKey && Date.now() > letraAte) ||
            (k === 'Enter' && !e.altKey) ||
            ((k === 'ArrowDown' || k === 'ArrowUp') && (ehMac || e.altKey)) ||
            (k === 'F4' && !ehMac && !e.altKey);
        if (!abre) return;
        if (!temDesenho()) return;   // sem o CSS da casa, fica o nativo
        e.preventDefault();
        abrir(s);
        if (k !== 'Enter' && k !== ' ') pop.classList.add('lista-pop--teclado');
    });

    // Rolar a página leva o painel junto; a janela mudar de tamanho também.
    document.addEventListener('scroll', agendarPosicao, true);
    window.addEventListener('resize', agendarPosicao);
    // Trocar de aplicativo fecha, como o menu do sistema; imprimir também (o painel não vai
    // para o papel).
    window.addEventListener('blur', function () { fechar(); });
    window.addEventListener('beforeprint', function () { fechar(); });
    // A página que sai com o painel aberto (o 'change' que envia, um link, o voltar) seria
    // guardada assim pelo navegador e voltaria com ele aberto por cima de uma lista morta.
    window.addEventListener('pagehide', function () { fechar(); });

    // Para o teste e para a tela que precisar mandar: ZeloLista.abrir(select) / .fechar().
    window.ZeloLista = {
        abrir: function (s) { if (serve(s)) { if (document.activeElement !== s) s.focus(); abrir(s); } },
        fechar: fechar,
        aberta: function () { return sel; }
    };
})();
