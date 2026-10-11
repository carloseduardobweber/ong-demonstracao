/* Datapop: o calendário do Zelo Tarefas para escolher uma data, no lugar do campo do navegador (dd/mm/aaaa).
   Copiado do Tarefas (public/assets/js/datapop.js) em 11/10/2026, sem mudança. Na tela: <x-campo-data>. O desenho
   mora em frontend/components.css («Calendário»). */
/*
 * Datapop: o calendário das tarefas (o mesmo balão do Calpop, com as mesmas cores) para escolher
 * UMA data ou UM mês, num botão da altura dos outros controles. Nasceu nas comissões, em
 * 01/10/2026: o campo de data do navegador (dd/mm/aaaa) destoava do resto da tela.
 *
 * Na view:
 *   <button type="button" class="btn btn-outline" data-datapop="dia" data-alvo="idDoCampo"
 *           data-vazio="Em aberto" data-max="2026-10-01">
 *       (ícone) <span data-datapop-rotulo>01/09/2026</span>
 *   </button>
 *   <input type="hidden" id="idDoCampo" name="desde" value="2026-09-01">
 *
 *   data-datapop="mes" escolhe AAAA-MM. data-ir="/comissoes?mes=" leva a página ao mês escolhido.
 *   data-vazio liga «Em aberto» (valor vazio); sem ele, o campo exige uma data.
 *   data-min e data-max limitam a escolha (AAAA-MM-DD no dia, AAAA-MM no mês); o que está salvo antes
 *   do limite abre no mês do limite.
 *   data-sugere="Início do cliente" põe no rodapé um atalho que escolhe o limite de baixo.
 *   data-min-por="idDoSelect": a opção escolhida ali pode subir o limite (data-min dela) e trocar o
 *   nome do atalho (data-min-rotulo). Em «Quem cuida», a pessoa que entrou na equipe depois do
 *   começo do cliente (Carlos, 01/10/2026).
 *
 * E o botão que mostra um bloco escondido, sem a setinha do <details>:
 *   <button type="button" data-abre="idDoBloco">Corrigir</button>  <form id="idDoBloco" hidden>
 *   <button type="button" data-fecha="idDoBloco">Cancelar</button>
 */
(function () {
    'use strict';
    if (window.Datapop) { return; }

    var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    var CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function hojeDia() { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
    function rotuloDia(v) { var p = String(v).split('-'); return p.length < 3 ? v : p[2] + '/' + p[1] + '/' + p[0]; }
    function rotuloMes(v) { var p = String(v).split('-'); return p.length < 2 ? v : MESES[+p[1] - 1] + ' de ' + p[0]; }

    var pop = null;     // o balão (um só, reaproveitado)
    var aberto = null;  // { gatilho, campo, modo, min, max, vazio, ir, sugere, vista: { y, m } }

    function montar() {
        if (pop) { return; }
        pop = document.createElement('div');
        pop.className = 'calpop';
        pop.hidden = true;
        pop.setAttribute('role', 'dialog');
        pop.innerHTML = '<div class="calpop__head">'
            + '<button class="calpop__nav" type="button" data-nav="-1" aria-label="Anterior">‹</button>'
            + '<span class="calpop__title"></span>'
            + '<button class="calpop__nav" type="button" data-nav="1" aria-label="Próximo">›</button></div>'
            + '<div class="calpop__grid"></div><div class="calpop__foot"></div>';
        document.body.appendChild(pop);
        pop.addEventListener('click', clique);
    }

    function fora(v) {
        return (aberto.min && v < aberto.min) || (aberto.max && v > aberto.max);
    }

    function botao(valor, texto, extra) {
        var cls = 'calpop__day' + (extra || '');
        if (valor === aberto.campo.value) { cls += ' is-start is-end'; }
        var desliga = fora(valor) ? ' disabled' : '';
        if (desliga) { cls += ' is-out'; }
        return '<button type="button" class="' + cls + '" data-v="' + valor + '"' + desliga + '>' + texto + '</button>';
    }

    function desenhar() {
        var a = aberto, h = '', i;
        var grade = pop.querySelector('.calpop__grid');
        var titulo = pop.querySelector('.calpop__title');
        if (a.modo === 'mes') {
            titulo.textContent = String(a.vista.y);
            grade.className = 'calpop__grid grid-cols-3 gap-1';
            var esteMes = hojeDia().slice(0, 7);
            for (i = 0; i < 12; i++) {
                var vm = a.vista.y + '-' + pad2(i + 1);
                h += botao(vm, CURTOS[i], ' h-9' + (vm === esteMes ? ' is-today' : ''));
            }
        } else {
            titulo.textContent = MESES[a.vista.m] + ' de ' + a.vista.y;
            grade.className = 'calpop__grid';
            h = '<div class="calpop__wd">S</div><div class="calpop__wd">T</div><div class="calpop__wd">Q</div><div class="calpop__wd">Q</div>'
                + '<div class="calpop__wd">S</div><div class="calpop__wd">S</div><div class="calpop__wd">D</div>';
            var inicio = (new Date(a.vista.y, a.vista.m, 1).getDay() + 6) % 7;
            var hoje = hojeDia();
            for (i = 0; i < 42; i++) {
                var d = new Date(a.vista.y, a.vista.m, i - inicio + 1);
                var vd = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
                var extra = (d.getMonth() !== a.vista.m ? ' is-out' : '') + (vd === hoje ? ' is-today' : '');
                h += botao(vd, String(d.getDate()), extra);
            }
        }
        grade.innerHTML = h;
        var agora = a.modo === 'mes' ? hojeDia().slice(0, 7) : hojeDia();
        var pe = '';
        if (a.sugere && a.min && !fora(a.min)) {
            pe += '<button class="calpop__act" type="button" data-v="' + esc(a.min) + '" title="' + esc(a.modo === 'mes' ? rotuloMes(a.min) : rotuloDia(a.min)) + '">' + esc(a.sugere) + '</button>';
        }
        pe += fora(agora) ? '<span></span>' : '<button class="calpop__act" type="button" data-v="' + agora + '">' + (a.modo === 'mes' ? 'Este mês' : 'Hoje') + '</button>';
        if (a.vazio) { pe += '<button class="calpop__act" type="button" data-v="">' + a.vazio + '</button>'; }
        pop.querySelector('.calpop__foot').innerHTML = pe;
    }

    function posicionar() {
        var r = aberto.gatilho.getBoundingClientRect();
        var vw = window.innerWidth || 1024, vh = window.innerHeight || 768;
        var w = pop.offsetWidth || 250, hh = pop.offsetHeight || 300;
        pop.style.left = Math.max(8, Math.min(r.left, vw - w - 8)) + 'px';
        pop.style.top = (r.bottom + hh + 8 < vh ? r.bottom + 6 : Math.max(8, r.top - hh - 6)) + 'px';
    }

    function abrir(gatilho) {
        var campo = document.getElementById(gatilho.getAttribute('data-alvo') || '');
        if (!campo) { return; }
        montar();
        var modo = gatilho.getAttribute('data-datapop') === 'mes' ? 'mes' : 'dia';
        var min = gatilho.getAttribute('data-min') || '';
        var sugere = gatilho.getAttribute('data-sugere') || '';
        var sel = document.getElementById(gatilho.getAttribute('data-min-por') || '');
        var opcao = sel && sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex] : null;
        var minOpcao = opcao ? (opcao.getAttribute('data-min') || '') : '';
        if (minOpcao && minOpcao > min) {
            min = minOpcao;
            if (sugere) { sugere = opcao.getAttribute('data-min-rotulo') || sugere; }
        }
        var base = campo.value || (modo === 'mes' ? hojeDia().slice(0, 7) : hojeDia());
        if (min && base < min) { base = min; }
        var p = base.split('-');
        aberto = {
            gatilho: gatilho, campo: campo, modo: modo,
            min: min, max: gatilho.getAttribute('data-max') || '', sugere: sugere,
            vazio: gatilho.getAttribute('data-vazio') || '', ir: gatilho.getAttribute('data-ir'),
            vista: { y: +p[0], m: (+p[1] || 1) - 1 }
        };
        desenhar();
        pop.hidden = false;
        posicionar();
        gatilho.setAttribute('aria-expanded', 'true');
        var foco = pop.querySelector('.is-start') || pop.querySelector('.calpop__day:not([disabled])');
        if (foco) { foco.focus(); }
    }

    function fechar(devolverFoco) {
        if (!pop || pop.hidden) { return; }
        pop.hidden = true;
        if (aberto) {
            aberto.gatilho.setAttribute('aria-expanded', 'false');
            if (devolverFoco) { aberto.gatilho.focus(); }
        }
        aberto = null;
    }

    function escolher(v) {
        var a = aberto;
        a.campo.value = v;
        var rotulo = a.gatilho.querySelector('[data-datapop-rotulo]');
        if (rotulo) { rotulo.textContent = v === '' ? a.vazio : (a.modo === 'mes' ? rotuloMes(v) : rotuloDia(v)); }
        a.campo.dispatchEvent(new Event('change', { bubbles: true }));
        fechar(true);
        if (a.ir && v !== '') { window.location.href = a.ir + encodeURIComponent(v); }
    }

    function clique(e) {
        e.stopPropagation();
        var nav = e.target.closest('[data-nav]');
        if (nav) {
            var passo = +nav.getAttribute('data-nav');
            if (aberto.modo === 'mes') {
                aberto.vista.y += passo;
            } else {
                aberto.vista.m += passo;
                if (aberto.vista.m < 0) { aberto.vista.m = 11; aberto.vista.y--; }
                if (aberto.vista.m > 11) { aberto.vista.m = 0; aberto.vista.y++; }
            }
            desenhar();
            return;
        }
        var b = e.target.closest('[data-v]');
        if (b && !b.disabled) { escolher(b.getAttribute('data-v')); }
    }

    document.addEventListener('click', function (e) {
        var g = e.target.closest('[data-datapop]');
        if (g) {
            e.preventDefault();
            if (aberto && aberto.gatilho === g) { fechar(false); } else { fechar(false); abrir(g); }
            return;
        }
        var abre = e.target.closest('[data-abre]');
        if (abre) {
            var bloco = document.getElementById(abre.getAttribute('data-abre'));
            if (bloco) {
                bloco.hidden = !bloco.hidden;
                abre.setAttribute('aria-expanded', String(!bloco.hidden));
                var primeiro = bloco.hidden ? null : bloco.querySelector('select, input:not([type=hidden]), [data-datapop]');
                if (primeiro) { primeiro.focus(); }
            }
            return;
        }
        var fecha = e.target.closest('[data-fecha]');
        if (fecha) {
            var alvoFecha = document.getElementById(fecha.getAttribute('data-fecha'));
            if (alvoFecha) { alvoFecha.hidden = true; }
            var quemAbriu = document.querySelector('[data-abre="' + fecha.getAttribute('data-fecha') + '"]');
            if (quemAbriu) { quemAbriu.setAttribute('aria-expanded', 'false'); quemAbriu.focus(); }
            return;
        }
        if (pop && !pop.hidden && !e.target.closest('.calpop')) { fechar(false); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { fechar(true); } });
    window.addEventListener('scroll', function (e) {
        if (pop && !pop.hidden && !(e.target && e.target.closest && e.target.closest('.calpop'))) { fechar(false); }
    }, true);
    window.addEventListener('resize', function () { fechar(false); });

    window.Datapop = { fechar: fechar, rotuloDia: rotuloDia, rotuloMes: rotuloMes };
})();
