'use strict';
const {KEY, labels, clean, summary} = CheckCore;
const allItems = CHECK_DATA.flatMap(d => d.stages.flatMap(s => s.items));
const MODE_KEY = 'digital-check:mode';
// 안드로이드 앱(Capacitor) 안에서 실행 중인지 확인합니다.
const NATIVE = !!globalThis.Capacitor?.isNativePlatform?.();
const Plugins = NATIVE ? {Share: Capacitor.registerPlugin('Share'), Filesystem: Capacitor.registerPlugin('Filesystem')} : {};
if (NATIVE) document.documentElement.setAttribute('data-native', '');
let state = {}, mode = 'car', installPrompt, firstPending = null, openId = null;

const $ = s => document.querySelector(s);
const setText = (s, t) => { const e = $(s); if (e) e.textContent = t; };
function message(s) { setText('#saved', s); }
function el(tag, text, cls) { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; }
function progressNode(value, label) { const p = el('progress'); p.max = 100; p.value = value; p.setAttribute('aria-label', label); return p; }
function status(id) { return state[id]?.status || 'pending'; }
function fmt(iso) { return new Date(iso).toLocaleString('ko-KR', {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'}); }

try { state = clean(JSON.parse(localStorage.getItem(KEY) || '{}'), allItems.map(i => i[0])); }
catch { message('저장된 기록을 읽지 못했습니다. 이번에는 임시로 사용합니다.'); }
try { const m = localStorage.getItem(MODE_KEY); if (CHECK_DATA.some(d => d.id === m)) mode = m; } catch {}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); message('이 기기에 저장됨 · ' + new Date().toLocaleTimeString('ko-KR')); }
  catch { message('저장하지 못했습니다. 이 화면을 닫기 전에 JSON 파일로 내보내 기록을 보관하세요.'); }
}

// 안내문을 '할 일'과 '주의할 점'으로 나눕니다.
const CAUTION = /않을 수 있|보장하지|가정하지|아닙니다|하지 마세요|별개일 수|영향을 줄 수|중단될 수|포함될 수/;
function guideNode(text) {
  const wrap = el('div', null, 'guide');
  const sentences = text.split(/(?<=[.])\s+/).map(s => s.trim()).filter(Boolean);
  const steps = sentences.filter(s => !CAUTION.test(s)), cautions = sentences.filter(s => CAUTION.test(s));
  const ol = el('ol', null, 'steps'); for (const s of steps) ol.append(el('li', s)); wrap.append(ol);
  if (cautions.length) {
    const box = el('div', null, 'caution'); box.append(el('p', '주의', 'caution-title'));
    const ul = el('ul'); for (const s of cautions) ul.append(el('li', s)); box.append(ul); wrap.append(box);
  }
  return wrap;
}

function renderTabs() {
  for (const d of CHECK_DATA) {
    const s = summary(d.stages.flatMap(x => x.items), state);
    setText('#tab-' + d.id, `${s.done + s.na} / ${s.total} 확인 · ${s.percent}%`);
    const bar = $('#tab-' + d.id + '-bar'); if (bar && bar.style) bar.style.width = s.percent + '%';
  }
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
}

function render() {
  const data = CHECK_DATA.find(d => d.id === mode), items = data.stages.flatMap(s => s.items), stats = summary(items, state);
  renderTabs();
  setText('#mode-title', data.title);
  setText('#counts', `완료 ${stats.done} · 해당 없음 ${stats.na} · 미확인 ${stats.pending} / 전체 ${stats.total}`);
  setText('#percent', stats.percent + '%');
  $('#overall').value = stats.percent;
  const done = $('#done-msg'), next = $('#next');
  if (done) { done.hidden = stats.pending > 0; done.textContent = stats.pending ? '' : '모든 항목을 확인했습니다. 아래에서 점검 기록을 인쇄하거나 내보내 보관하세요.'; }
  if (next) next.hidden = stats.pending === 0;

  const filter = $('#pending').checked, list = $('#checklist');
  list.replaceChildren(); firstPending = null;
  data.stages.forEach((stage, si) => {
    const ss = summary(stage.items, state);
    const section = el('section', null, 'stage' + (ss.pending === 0 ? ' complete' : ''));
    const head = el('div', null, 'stage-head');
    head.append(el('span', String(si + 1), 'stage-num'), el('h3', stage.title.replace(/^\d+\s*·\s*/, '')), el('span', `${ss.done + ss.na} / ${ss.total}`, 'stage-count'));
    section.append(head);
    let visible = 0;
    for (const [id, title, guide] of stage.items) {
      const st = status(id);
      if (st === 'pending' && !firstPending) firstPending = id;
      if (filter && st !== 'pending') continue;
      visible++;
      const card = el('article', null, 'item ' + st); card.id = 'item-' + id;
      const details = el('details'); if (openId === id) details.open = true;
      details.addEventListener('toggle', () => { if (details.open) openId = id; else if (openId === id) openId = null; });
      const sum = el('summary');
      sum.append(el('span', title, 'item-title'), el('span', labels[st], 'pill ' + st));
      if (state[id]?.updatedAt && st !== 'pending') sum.append(el('span', fmt(state[id].updatedAt), 'stamp'));
      details.append(sum, guideNode(guide));
      const field = el('fieldset', null, 'seg');
      const legend = el('legend', title + ' 상태', 'sr'); field.append(legend);
      for (const [value, label] of [['done', labels.done], ['na', labels.na], ['pending', labels.pending]]) {
        const l = el('label', null, 'seg-' + value), input = el('input');
        input.type = 'radio'; input.name = id; input.value = value; input.checked = st === value;
        input.addEventListener('change', () => {
          state[id] = {status: value, updatedAt: new Date().toISOString()};
          persist(); if (NATIVE) setText('#copy', '결과 공유하기');
render();
          const target = document.querySelector(`input[name="${id}"][value="${value}"]`);
          if (target) target.focus(); else $('#checklist').focus();
        });
        l.append(input, el('span', label)); field.append(l);
      }
      card.append(details, field); section.append(card);
    }
    if (!visible) section.append(el('p', '이 단계는 모두 확인했습니다.', 'empty'));
    list.append(section);
  });
}

document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
  mode = b.dataset.mode; openId = null;
  try { localStorage.setItem(MODE_KEY, mode); } catch {}
  if (NATIVE) setText('#copy', '결과 공유하기');
render();
}));
$('#pending').addEventListener('change', render);
$('#next')?.addEventListener('click', () => {
  if (!firstPending) return;
  openId = firstPending; if (NATIVE) setText('#copy', '결과 공유하기');
render();
  const card = document.getElementById?.('item-' + firstPending);
  if (card) { card.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center'}); card.querySelector('summary')?.focus({preventScroll: true}); }
});

function reportData() {
  return {app: '디지털 안심 체크', version: '1.0', exportedAt: new Date().toISOString(),
    notice: '사용자 자가 신고 결과. 삭제 실행·검증 또는 법적 증명이 아님. 해당 없음은 삭제 완료를 뜻하지 않음.',
    categories: CHECK_DATA.map(d => ({title: d.title, summary: summary(d.stages.flatMap(s => s.items), state),
      stages: d.stages.map(s => ({title: s.title, items: s.items.map(([id, title]) => ({id, title, status: status(id), statusLabel: labels[status(id)], updatedAt: state[id]?.updatedAt || null}))}))}))};
}
$('#export').addEventListener('click', async () => {
  const name = 'digital-check-' + new Date().toISOString().slice(0, 10) + '.json', json = JSON.stringify(reportData(), null, 2);
  if (NATIVE && Plugins.Filesystem && Plugins.Share) {
    try {
      const {uri} = await Plugins.Filesystem.writeFile({path: name, data: json, directory: 'CACHE', encoding: 'utf8'});
      await Plugins.Share.share({title: '디지털 안심 체크 기록', files: [uri]});
      message('JSON 파일을 공유했습니다. 저장한 위치의 파일은 직접 관리하세요.');
    } catch { message('공유를 마치지 못했습니다. 다시 시도하거나 결과 공유를 이용하세요.'); }
    return;
  }
  const blob = new Blob([JSON.stringify(reportData(), null, 2)], {type: 'application/json;charset=utf-8'}), url = URL.createObjectURL(blob), a = el('a');
  a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  message('JSON 파일로 내보냈습니다. 내려받은 파일은 직접 관리하세요.');
});

function buildReport() {
  const r = $('#report'), data = reportData();
  r.replaceChildren(el('h1', '디지털 안심 체크 · 자가점검 결과'), el('p', '작성 시각: ' + new Date().toLocaleString('ko-KR')), el('p', data.notice, 'r-note'));
  for (const d of data.categories) {
    r.append(el('h2', d.title), el('p', `완료 ${d.summary.done} · 해당 없음 ${d.summary.na} · 미확인 ${d.summary.pending} · 확인 진행률 ${d.summary.percent}%`));
    for (const s of d.stages) {
      r.append(el('h3', s.title));
      for (const item of s.items) r.append(el('p', `[${item.statusLabel}] ${item.title} — ${item.updatedAt ? new Date(item.updatedAt).toLocaleString('ko-KR') : '기록 없음'}`, 'r-' + item.status));
    }
  }
  r.append(el('p', '진행률 = (완료 + 해당 없음) ÷ 전체. 삭제 성공률이 아닙니다. 제조사·서비스별 공식 절차를 별도로 확인하세요.', 'r-note'));
}
window.addEventListener('beforeprint', buildReport);
$('#print').addEventListener('click', () => { buildReport(); window.print(); });

function textReport() {
  const lines = ['디지털 안심 체크 · 자가점검 결과 (' + new Date().toLocaleString('ko-KR') + ')'];
  for (const d of reportData().categories) {
    lines.push('', `■ ${d.title} — 확인 ${d.summary.done + d.summary.na}/${d.summary.total} (${d.summary.percent}%)`);
    for (const s of d.stages) for (const i of s.items) lines.push(`  [${i.statusLabel}] ${i.title}`);
  }
  lines.push('', '※ 사용자 자가 신고 결과이며 삭제 완료를 증명하지 않습니다.');
  return lines.join('\n');
}
$('#copy')?.addEventListener('click', () => {
  const text = textReport();
  if (NATIVE && Plugins.Share) {
    Plugins.Share.share({title: '디지털 안심 체크 결과', text}).then(() => message('결과를 공유했습니다.')).catch(() => {});
    return;
  }
  Promise.resolve().then(() => navigator.clipboard.writeText(text))
    .then(() => message('결과를 복사했습니다. 메모나 메시지에 붙여 넣을 수 있습니다.'))
    .catch(() => message('복사하지 못했습니다. 인쇄 / PDF로 저장을 이용하세요.'));
});

const eraseBox = $('#erase-confirm');
$('#erase').addEventListener('click', () => { if (eraseBox) { eraseBox.hidden = false; $('#erase-no')?.focus(); } });
$('#erase-no')?.addEventListener('click', () => { eraseBox.hidden = true; $('#erase').focus(); });
$('#erase-yes')?.addEventListener('click', async () => {
  if (eraseBox) eraseBox.hidden = true;
  let failed = false;
  try { localStorage.removeItem(KEY); localStorage.removeItem(MODE_KEY); } catch { failed = true; }
  state = {}; openId = null;
  try {
    if ('caches' in window) { for (const key of await caches.keys()) if (key.startsWith('digital-check-')) await caches.delete(key); }
    if ('serviceWorker' in navigator) { const reg = await navigator.serviceWorker.getRegistration('./'); if (reg && reg.active?.scriptURL === new URL('sw.js', location.href).href) await reg.unregister(); }
  } catch { failed = true; }
  $('#report').replaceChildren(); if (NATIVE) setText('#copy', '결과 공유하기');
render();
  message(failed ? '일부 저장소를 지우지 못했습니다. 브라우저 설정에서 이 사이트의 데이터를 삭제하세요.' : '점검 기록과 오프라인 캐시를 삭제했습니다.');
});

window.addEventListener('storage', e => {
  if (e.key === KEY || e.key === null) {
    try { state = clean(JSON.parse(localStorage.getItem(KEY) || '{}'), allItems.map(i => i[0])); render(); message('다른 창에서 바꾼 기록을 반영했습니다.'); }
    catch { message('다른 창의 기록을 읽지 못했습니다.'); }
  }
});
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; $('#install').hidden = false; });
$('#install').addEventListener('click', async () => { if (installPrompt) { await installPrompt.prompt(); installPrompt = null; $('#install').hidden = true; } });
if (!NATIVE && 'serviceWorker' in navigator && ['http:', 'https:'].includes(location.protocol)) {
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => message('오프라인에서도 사용할 수 있습니다.')).catch(() => {});
}
if (NATIVE) setText('#copy', '결과 공유하기');
render();
