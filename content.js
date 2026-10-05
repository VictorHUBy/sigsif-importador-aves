// SIGSIF Importador - Aves (extensão). Roda dentro da página do SIGSIF, sem programa externo,
// sem porta de rede e sem permissões especiais. Só aparece na tela "Alterar Mapa de Abate".
(() => {
  'use strict';
  if (window.__sigsifImportadorAves) return;
  window.__sigsifImportadorAves = true;

  // ------------------------------------------------------------------ config
  const DIAGNOSTICOS = [
    'AEROSSACULITE', 'ALTERAÇÕES MUSCULARES', 'ARTRITE/TENOSSINOVITE (1 ARTICULAÇÃO)',
    'ARTRITE/TENOSSINOVITE (2 ARTICULAÇÕES)', 'ASPECTO REPUGNANTE', 'CANIBALISMO', 'CAQUEXIA',
    'CELULITE', 'CONTAMINAÇÃO GASTROINTESTINAL E BILIAR', 'CONTAMINAÇÃO NÃO GASTROINTESTINAL',
    'ESCALDADO VIVO', 'FALHAS TECNOLÓGICAS', 'LESÃO DE PELE', 'LESÃO INFLAMATÓRIA',
    'LESÃO TRAUMÁTICA', 'MAGREZA', 'NEOPLASIA', 'SEPTICEMIA', 'SÍNDROME ASCÍTICA'
  ];
  const SEL = {
    tabela: '[id="formAlterarMapaAbate:dtbDoenca_data"] tr',
    inserirParte: 'button[id*=commandAdd_inserirParteAfetada]',
    diagnostico: 'input[id$=nomeDiagnostico]',
    acometidos: 'input[id$=quantidadeAnimaisAcometidos]',
    parte: 'select[id$=parteAnimalAfetada_input]',
    quantidade: 'input[id$=numeroPartesAfetadas]',
    destino: 'select[id$=cbbDestino_input]',
    confirmarParte: '.commandAddSelector',
    confirmarMapa: '.commandUpdateSelector'
  };
  const PARTES = {
    TOTAL:   { parte: 'Carcaça',                destino: 'CONDENAÇÃO TOTAL (POST MORTEM)' },
    PARCIAL: { parte: 'carcaça parcial (aves)', destino: 'CONDENAÇÃO PARCIAL (POST MORTEM)' }
  };
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/\s+/g, ' ').trim();
  const MAPA = new Map(DIAGNOSTICOS.map(d => [norm(d), d]));

  // ------------------------------------------------------------------ parser (texto colado)
  function num(v) {
    if (v === null || v === undefined || v === '') return 0;
    const s = String(v).trim();
    if (/^\/+$/.test(s) || s === '-') return 0;
    const n = Number(s.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? Math.round(n) : NaN;
  }
  function montarItens(acum) {
    const itens = [];
    for (const it of acum.values()) {
      it.acometidos = it.total + it.parcial; // regra: Acometidos = TOTAL + PARCIAL
      if (it.acometidos === 0) continue;
      itens.push(it);
    }
    return itens;
  }
  function lerTexto(texto) {
    const erros = [], avisos = [], lotes = [];
    let lote = null, acum = null, diag = null;
    const fechar = () => { if (lote) lote.itens = montarItens(acum); };
    const lerNum = (v, ln) => {
      const n = num(v);
      if (Number.isNaN(n) || n < 0) { erros.push(`Linha ${ln}: número inválido "${v}"`); return 0; }
      return n;
    };
    String(texto || '').split(/\r?\n/).forEach((bruta, i) => {
      const ln = i + 1, linha = bruta.trim();
      if (!linha) return;
      const m = linha.match(/^([^:=]+?)\s*[:=]\s*(.*)$/);
      const chave = norm(m ? m[1] : linha), valor = m ? m[2].trim() : '';
      if (chave === 'LOTE' || chave === 'NUCLEO') {
        fechar(); acum = new Map(); diag = null;
        lote = { nome: valor || `Lote ${lotes.length + 1}`, totalAves: '', itens: [] }; lotes.push(lote); return;
      }
      if (!lote) { erros.push(`Linha ${ln}: esperado "Lote: ..." antes dos dados.`); return; }
      if (chave === 'AVES TOTAL' || chave === 'TOTAL DE AVES' || chave === 'AVES ABATIDAS') { lote.totalAves = valor; return; }
      if (chave === 'DIAGNOSTICO' || chave === 'DOENCA') {
        const o = MAPA.get(norm(valor));
        if (!o) { erros.push(`Linha ${ln}: diagnóstico desconhecido "${valor}"`); diag = null; return; }
        diag = o; if (!acum.has(o)) acum.set(o, { doenca: o, total: 0, parcial: 0 }); return;
      }
      if (MAPA.has(chave) && (!m || !valor)) { // linha só com o nome do diagnóstico
        diag = MAPA.get(chave); if (!acum.has(diag)) acum.set(diag, { doenca: diag, total: 0, parcial: 0 }); return;
      }
      if (chave.startsWith('CONDENACAO TOTAL') || chave.startsWith('CONDENACAO PARCIAL')) {
        if (!diag) { erros.push(`Linha ${ln}: "${m[1].trim()}" sem diagnóstico antes.`); return; }
        acum.get(diag)[chave.includes('PARCIAL') ? 'parcial' : 'total'] += lerNum(valor, ln); return;
      }
      erros.push(`Linha ${ln}: não reconheci "${linha}"`);
    });
    fechar();
    if (!lotes.length && !erros.length) erros.push('Nenhum lote encontrado. Comece com "Lote: ...".');
    return { lotes, erros, avisos };
  }

  // ------------------------------------------------------------------ automação da página
  let log = () => {}, progresso = () => {}, abortar = false;
  const esperar = (ms) => new Promise(r => setTimeout(r, ms));
  const visivel = (el) => !!el && el.isConnected && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
    && getComputedStyle(el).visibility !== 'hidden';
  const todos = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));
  const primeiroVisivel = (sel, raiz = document) => todos(sel, raiz).find(visivel) || null;
  const ultimo = (sel) => { const l = todos(sel); return l.length ? l[l.length - 1] : null; };

  async function esperarAte(fn, ms, msg) {
    const t0 = Date.now();
    for (;;) {
      const v = fn(); if (v) return v;
      if (Date.now() - t0 > ms) throw new Error(msg);
      await esperar(100);
    }
  }
  function checar() { if (abortar) throw new Error('Interrompido pelo usuário.'); }

  // Aguarda o fim das requisições AJAX do PrimeFaces
  async function aguardarAjax() {
    const t0 = Date.now();
    while (Date.now() - t0 < 15000) {
      try { if (!window.PrimeFaces || window.PrimeFaces.ajax.Queue.isEmpty()) break; } catch { break; }
      await esperar(100);
    }
    await esperar(250);
  }

  function setValor(el, valor) {
    el.focus();
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(valor));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('keyup', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
  }

  // Seleciona opção de <select> (possivelmente oculto pelo PrimeFaces) pelo texto
  function escolherOpcao(el, texto) {
    if (!el) throw new Error(`Lista "${texto}" não encontrada na tela.`);
    const op = [...el.options].find(o => norm(o.text) === norm(texto)) || [...el.options].find(o => norm(o.text).includes(norm(texto)));
    if (!op) throw new Error(`Opção "${texto}" não encontrada na lista.`);
    el.value = op.value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function linhasTabela() {
    return todos(SEL.tabela).map((tr, idx) => {
      const cells = todos('td', tr).map(td => norm(td.innerText));
      return { idx, tr, cells, texto: cells.join(' | ') };
    });
  }
  function acharLinha(linhas, doenca) {
    const alvo = norm(doenca);
    return linhas.find(l => l.cells.some(c => c === alvo)) || linhas.find(l => l.texto.includes(alvo));
  }
  function exigirTela() {
    if (!todos(SEL.tabela).length) {
      throw new Error('Tela "Alterar Mapa de Abate" não encontrada. Abra o lote e a tela "Alterar Mapa de Abate" e tente de novo.');
    }
  }

  async function lancarParte(item, tipo, qtd) {
    const cfg = PARTES[tipo];
    checar();
    // espera o diálogo abrir: o campo de quantidade é sempre visível (o <select> do PrimeFaces pode ficar oculto)
    const campoQtd = await esperarAte(() => primeiroVisivel(SEL.quantidade), 10000, 'O diálogo da parte afetada não abriu.');

    // Campo Diagnóstico: nunca deixar valor de OUTRO diagnóstico
    const campoDiag = primeiroVisivel(SEL.diagnostico);
    if (campoDiag) {
      const alvo = norm(item.doenca);
      const confere = (v) => { const a = norm(v); return a === alvo || a.includes(alvo) || (a && alvo.includes(a)); };
      if (!confere(campoDiag.value)) {
        setValor(campoDiag, item.doenca);
        if (norm(campoDiag.value) && !confere(campoDiag.value)) {
          throw new Error(`Campo Diagnóstico mostra "${campoDiag.value}" e não "${item.doenca}"; abortado para não lançar na doença errada.`);
        }
      }
    }
    const campoAcom = primeiroVisivel(SEL.acometidos);
    if (campoAcom) setValor(campoAcom, item.acometidos);

    escolherOpcao(ultimo(SEL.parte), cfg.parte);
    await aguardarAjax();
    setValor(primeiroVisivel(SEL.quantidade) || campoQtd, qtd);
    escolherOpcao(ultimo(SEL.destino), cfg.destino);
    await aguardarAjax();
    const ok = await esperarAte(() => primeiroVisivel(SEL.confirmarParte), 5000, 'Botão de confirmar a parte não encontrado.');
    ok.click();
    await aguardarAjax();
    log(`   ✔ ${tipo}: ${qtd} (${cfg.parte} → ${cfg.destino})`);
  }

  async function lancarItem(item, feitosParte) {
    checar();
    const linha = acharLinha(linhasTabela(), item.doenca);
    if (!linha) throw new Error(`"${item.doenca}" não está na tabela de diagnósticos do lote.`);
    const acomRow = todos(SEL.acometidos, linha.tr)[0];
    if (acomRow) setValor(acomRow, item.acometidos);
    for (const tipo of ['TOTAL', 'PARCIAL']) {
      const qtd = tipo === 'TOTAL' ? item.total : item.parcial;
      if (!qtd) continue;
      checar();
      // a linha pode ser redesenhada pelo AJAX: procura de novo a cada parte
      const l2 = acharLinha(linhasTabela(), item.doenca);
      const btn = l2 && todos(SEL.inserirParte, l2.tr)[0];
      if (!btn) throw new Error(`Botão "inserir parte afetada" não encontrado na linha de "${item.doenca}".`);
      btn.click();
      await aguardarAjax();
      await lancarParte(item, tipo, qtd);
      feitosParte.push(tipo);
    }
  }

  async function validarNoSigsif(itens) {
    exigirTela();
    const linhas = linhasTabela();
    log(`Tabela do lote: ${linhas.length} diagnóstico(s).`);
    const faltando = itens.filter(it => !acharLinha(linhas, it.doenca));
    if (faltando.length) {
      faltando.forEach(f => log(`✖ Não consta no lote: ${f.doenca}`));
      throw new Error(`${faltando.length} diagnóstico(s) do texto não constam na tabela do lote.`);
    }
    log('✔ Todos os diagnósticos informados existem na tabela do lote.');
  }

  // Em falha, lança Error com .resumo = { concluidos, falhou, pendentes }
  async function lancarTudo(itens) {
    await validarNoSigsif(itens);
    const concluidos = [];
    for (let i = 0; i < itens.length; i++) {
      const item = itens[i], feitosParte = [];
      log(`▶ ${item.doenca} — acometidos ${item.acometidos} (total ${item.total}, parcial ${item.parcial})`);
      try { await lancarItem(item, feitosParte); }
      catch (e) {
        try { document.activeElement && document.activeElement.blur(); } catch {}
        const err = new Error(`Falha em "${item.doenca}": ${e.message}`);
        err.resumo = { concluidos, falhou: { doenca: item.doenca, partesLancadas: feitosParte }, pendentes: itens.slice(i + 1).map(x => x.doenca) };
        throw err;
      }
      concluidos.push(item.doenca);
      progresso(Math.round(((i + 1) / itens.length) * 100));
    }
    log('Todos os diagnósticos lançados. Confira na tela e confirme o mapa.');
  }

  async function confirmarMapa() {
    exigirTela();
    const b = await esperarAte(() => primeiroVisivel(SEL.confirmarMapa), 5000, 'Botão de confirmar o mapa não encontrado.');
    b.click();
    await aguardarAjax();
    log('✔ Mapa confirmado.');
  }

  function relatarFalha(e) {
    log('✖ ' + e.message);
    const r = e.resumo;
    if (r) {
      log('──── RESUMO DA FALHA ────');
      log('Concluídos: ' + (r.concluidos.length ? r.concluidos.join(', ') : 'nenhum'));
      log('Falhou em: ' + r.falhou.doenca + (r.falhou.partesLancadas.length ? ` (já lançado antes do erro: ${r.falhou.partesLancadas.join(' e ')})` : ' (nada lançado deste diagnóstico)'));
      log('Não iniciados: ' + (r.pendentes.length ? r.pendentes.join(', ') : 'nenhum'));
      log('⚠ Confira no SIGSIF o que já foi lançado ANTES de executar de novo, para não duplicar.');
    }
  }

  // ------------------------------------------------------------------ painel (Shadow DOM)
  const CSS = `
:host{all:initial}
*{box-sizing:border-box;font-family:Segoe UI,Arial,sans-serif}
.wrap{position:fixed;right:16px;bottom:16px;z-index:2147483647;color:#1d2733;font-size:13px}
.tab{background:#1f4e79;color:#fff;border:0;border-radius:20px;padding:10px 16px;font-size:14px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.panel{display:none;width:420px;max-width:calc(100vw - 32px);max-height:90vh;overflow:auto;background:#f3f5f8;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.4)}
.aberto .panel{display:block}.aberto .tab{display:none}
header{background:#1f4e79;color:#fff;padding:10px 14px;font-size:15px;font-weight:600;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0}
header button{background:transparent;border:0;color:#fff;font-size:18px;cursor:pointer}
.body{padding:10px 12px;display:flex;flex-direction:column;gap:10px}
.card{background:#fff;border-radius:8px;padding:10px 12px;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
button.b{border:0;border-radius:6px;padding:8px 12px;font-size:13px;cursor:pointer;background:#1f4e79;color:#fff}
button.b:disabled{opacity:.45;cursor:default}
.sec{background:#5b6b7b!important}.ok{background:#2e7d32!important}.warn{background:#c77700!important}.stop{background:#b3261e!important}
textarea{width:100%;font:12px Consolas,monospace;padding:6px;border:1px solid #c5ced8;border-radius:6px;margin:6px 0}
table{border-collapse:collapse;width:100%;font-size:12px}th,td{border-bottom:1px solid #e3e8ee;padding:4px 6px;text-align:left}
td.n,th.n{text-align:right}th{background:#eef2f6}
.barra{height:12px;background:#dfe6ed;border-radius:6px;overflow:hidden}.prog{height:100%;width:0;background:#2e7d32;transition:width .25s}
.log{background:#14202c;color:#cfe3f5;font:11px Consolas,monospace;padding:8px;border-radius:6px;height:170px;overflow:auto;white-space:pre-wrap}
.erro{color:#b3261e;font-size:12px}.muted{color:#51606f;font-size:12px}
.status{font-weight:600;font-size:13px}.status.f{color:#b3261e}.status.s{color:#2e7d32}
`;

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) { if (c == null || c === false) continue; el.append(c.nodeType ? c : document.createTextNode(String(c))); }
    return el;
  }

  function montarPainel() {
    const R = {};
    let lotes = [], pronto = false, ocupado = false, temErro = false;

    const atualizar = () => {
      const livre = pronto && !ocupado;
      R.btnTest.disabled = R.btnVal.disabled = R.btnRun.disabled = !livre;
      R.btnConf.disabled = ocupado;
      R.btnStop.disabled = !ocupado;
    };
    const status = (t, c) => { R.status.textContent = t || ''; R.status.className = 'status ' + (c || ''); };
    const addLog = (m) => { R.log.textContent += m + '\n'; R.log.scrollTop = R.log.scrollHeight; };
    log = (m) => addLog(`[${new Date().toLocaleTimeString('pt-BR')}] ${m}`);
    progresso = (p) => { R.prog.style.width = p + '%'; };

    const loteAtual = () => lotes[Number(R.selLote.value) || 0];

    function mostrarLote() {
      const l = loteAtual(), itens = l ? l.itens : [];
      pronto = itens.length > 0 && !temErro;
      R.resumo.replaceChildren();
      if (!itens.length) { R.resumo.textContent = 'Nenhum diagnóstico com valores neste lote.'; atualizar(); return; }
      const soma = (k) => itens.reduce((s, i) => s + i[k], 0);
      if (l.totalAves) R.resumo.append(h('div', {}, 'Total de aves abatidas: ', h('b', {}, l.totalAves)));
      R.resumo.append(h('table', {},
        h('tr', {}, h('th', {}, 'Diagnóstico'), h('th', { class: 'n' }, 'Total'), h('th', { class: 'n' }, 'Parcial'), h('th', { class: 'n' }, 'Acomet.')),
        itens.map(i => h('tr', {}, h('td', {}, i.doenca), h('td', { class: 'n' }, i.total), h('td', { class: 'n' }, i.parcial), h('td', { class: 'n' }, i.acometidos))),
        h('tr', {}, h('th', {}, `${itens.length} diagnóstico(s)`), h('th', { class: 'n' }, soma('total')), h('th', { class: 'n' }, soma('parcial')), h('th', { class: 'n' }, soma('acometidos')))));
      atualizar();
    }

    function carregar(r) {
      status('');
      lotes = r.lotes; temErro = r.erros.length > 0;
      R.erros.replaceChildren(...[...r.erros.map(e => '✖ ' + e), ...r.avisos.map(a => '⚠ ' + a)].flatMap(t => [t, h('br')]));
      R.selLote.replaceChildren(...lotes.map((l, i) => h('option', { value: i }, l.nome)));
      R.boxLote.style.display = lotes.length > 1 ? 'flex' : 'none';
      if (!lotes.length) { R.resumo.textContent = 'Nenhum lote válido.'; pronto = false; atualizar(); return; }
      mostrarLote();
    }

    async function comTrava(fn) {
      ocupado = true; abortar = false; atualizar();
      try { return await fn(); }
      catch (e) { relatarFalha(e); return { ok: false, msg: e.message }; }
      finally { ocupado = false; atualizar(); }
    }

    async function rodar(modo) {
      const l = loteAtual(); if (!l) return;
      if (modo === 'RUN' && !confirm('Executar o lançamento completo no SIGSIF?\n\nConfira se o lote aberto na tela é o mesmo do texto.')) return;
      status(''); progresso(0);
      log(`Lote informado: ${l.nome}${l.totalAves ? ' — total de aves: ' + l.totalAves : ''}`);
      log(`Modo ${modo} — ${l.itens.length} diagnóstico(s).`);
      const r = await comTrava(async () => {
        if (modo === 'TEST') {
          l.itens.forEach((it, i) => {
            log(`[simulação] ${it.doenca}: acometidos=${it.acometidos}`);
            if (it.total) log(`   TOTAL ${it.total} → Carcaça → CONDENAÇÃO TOTAL (POST MORTEM)`);
            if (it.parcial) log(`   PARCIAL ${it.parcial} → carcaça parcial (aves) → CONDENAÇÃO PARCIAL (POST MORTEM)`);
            progresso(Math.round(((i + 1) / l.itens.length) * 100));
          });
          log('Teste concluído. Nada foi gravado.');
        } else if (modo === 'VALIDATE') { await validarNoSigsif(l.itens); progresso(100); }
        else { await lancarTudo(l.itens); if (R.chkAuto.checked) await confirmarMapa(); }
        return { ok: true };
      });
      if (r.ok) status(modo === 'RUN' ? '✔ Lançamento concluído.' : modo === 'VALIDATE' ? '✔ Validação concluída.' : '✔ Teste concluído.', 's');
      else status('✖ ' + r.msg + ' — veja o log.', 'f');
    }

    function copiarLog() {
      const t = R.log.textContent;
      const fallback = () => { const a = h('textarea'); a.value = t; R.root.append(a); a.select(); try { document.execCommand('copy'); } catch {} a.remove(); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).catch(fallback); else fallback();
      status('Log copiado.', 's');
    }

    const wrap = h('div', { class: 'wrap' },
      R.tab = h('button', { class: 'tab', onclick: () => wrap.classList.add('aberto') }, 'SIGSIF Importador'),
      h('div', { class: 'panel' },
        h('header', {}, 'SIGSIF Importador — Aves', h('button', { title: 'Minimizar', onclick: () => wrap.classList.remove('aberto') }, '–')),
        h('div', { class: 'body' },
          h('div', { class: 'card' },
            h('b', {}, 'Cole os dados do lote'),
            h('div', { class: 'muted' }, 'Lote / Aves total / DIAGNÓSTICO / Condenação total / Condenação parcial'),
            R.txt = h('textarea', { rows: '8', placeholder: 'Lote: 5045\nAves total: 43535\nAEROSSACULITE\nCondenação total: 353\nCondenação parcial: 3434' }),
            h('div', { class: 'row' }, h('button', { class: 'b', onclick: () => carregar(lerTexto(R.txt.value)) }, 'Ler texto'))),
          h('div', { class: 'card' },
            h('b', {}, 'Resumo'),
            R.boxLote = h('div', { class: 'row', style: 'display:none;margin:4px 0' }, 'Lote: ', R.selLote = h('select', { onchange: mostrarLote })),
            R.resumo = h('div', { class: 'muted' }, 'Cole o texto e clique em "Ler texto".'),
            R.erros = h('div', { class: 'erro' })),
          h('div', { class: 'card' },
            h('div', { class: 'row' },
              R.btnTest = h('button', { class: 'b', disabled: true, onclick: () => rodar('TEST') }, 'Testar'),
              R.btnVal = h('button', { class: 'b warn', disabled: true, onclick: () => rodar('VALIDATE') }, 'Validar'),
              R.btnRun = h('button', { class: 'b ok', disabled: true, onclick: () => rodar('RUN') }, 'Executar'),
              R.btnStop = h('button', { class: 'b stop', disabled: true, onclick: () => { abortar = true; log('Parando após o passo atual...'); } }, 'Parar')),
            h('div', { class: 'row', style: 'margin-top:6px' },
              R.btnConf = h('button', { class: 'b sec', onclick: async () => {
                if (!confirm('Confirmar o mapa agora?')) return;
                const r = await comTrava(async () => { await confirmarMapa(); return { ok: true }; });
                status(r.ok ? '✔ Mapa confirmado.' : '✖ ' + r.msg, r.ok ? 's' : 'f');
              } }, 'Confirmar mapa'),
              h('label', {}, R.chkAuto = h('input', { type: 'checkbox' }), ' confirmar mapa ao final')),
            h('div', { class: 'barra', style: 'margin-top:8px' }, R.prog = h('div', { class: 'prog' })),
            R.status = h('div', { class: 'status' })),
          h('div', { class: 'card' },
            h('div', { class: 'row', style: 'justify-content:space-between' }, h('b', {}, 'Log'), h('button', { class: 'b sec', onclick: copiarLog }, 'Copiar log')),
            R.log = h('div', { class: 'log', style: 'margin-top:6px' })))));
    R.root = wrap;

    const host = h('div', { id: 'sigsif-importador-aves' });
    const sh = host.attachShadow({ mode: 'open' });
    try { const sheet = new CSSStyleSheet(); sheet.replaceSync(CSS); sh.adoptedStyleSheets = [sheet]; }
    catch { sh.append(h('style', {}, CSS)); }
    sh.append(wrap);
    document.body.append(host);
    atualizar();
  }

  // O painel só aparece quando a tela "Alterar Mapa de Abate" está presente.
  let montado = false;
  function verificar() {
    if (montado || !document.body) return;
    if (document.querySelector(SEL.tabela)) { montado = true; montarPainel(); }
  }
  verificar();
  if (!montado) {
    const iv = setInterval(() => { verificar(); if (montado) clearInterval(iv); }, 1000);
  }
})();
