'use strict';
/* ═════════ 손맛: 숫자 굴러가기 · 큰 수익 연출 · 💼 버튼 경고 · 친구 거래 상단 알림 ═════════ */

/* ───────── 숫자 굴러가기: data-roll="키" data-v="값" data-fmt="won|sign" 붙은 숫자는 이전 값에서 새 값으로 굴러가요 ───────── */
const ROLL = {};
function rollNums(root = document) {
  root.querySelectorAll('[data-roll]').forEach(el => {
    const key = el.dataset.roll, to = +el.dataset.v, fmt = el.dataset.fmt === 'sign' ? signKrw : won;
    const r = ROLL[key] || (ROLL[key] = { shown: to }); if (r.el === el) return;
    r.el = el; const from = r.shown; if (from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 700;
    const step = t => { if (r.el !== el) return; const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); r.shown = from + (to - from) * e; el.textContent = fmt(r.shown); if (k < 1) requestAnimationFrame(step); else r.shown = to; };
    requestAnimationFrame(step);
    el.classList.remove('rup', 'rdn'); void el.offsetWidth; el.classList.add(to > from ? 'rup' : 'rdn');
  });
}

/* ───────── 가격 깜빡임 (거래창 큰 가격) ───────── */
function flashText(el, txt) {
  if (!el || el.textContent === txt) return;
  const old = parseFloat(el.textContent.replace(/[^0-9.]/g, '')), nw = parseFloat(String(txt).replace(/[^0-9.]/g, ''));
  el.textContent = txt; el.classList.remove('fu', 'fd'); void el.offsetWidth; if (old && nw && old !== nw) el.classList.add(nw > old ? 'fu' : 'fd');
}

/* ───────── 큰 수익 연출: 화면 가운데 금액이 터지고 진동 ───────── */
function bigWin(pnl, label) {
  if (!(pnl > 0)) return;
  let el = $('#bigwin'); if (!el) { el = document.createElement('div'); el.id = 'bigwin'; el.className = 'bigwin'; document.body.appendChild(el); }
  const huge = pnl >= 1e8;
  el.innerHTML = `<small>${esc(label || '수익 실현')}</small><b class="num">+${krw(pnl)}</b>`;
  el.className = 'bigwin' + (huge ? ' huge' : ''); void el.offsetWidth; el.classList.add('go');
  confetti(); buzz(huge ? [60, 40, 120] : 70);
  clearTimeout(bigWin._t); bigWin._t = setTimeout(() => el.classList.remove('go'), 1700);
}

/* ───────── 💼 버튼 상태: 손익 ±5% 넘으면 흔들, 청산 가까우면 빨갛게 깜빡 ───────── */
function fabState(f, pos, r) {
  const danger = pos.some(x => x.kind === 'fut' && x.dist / x.distMax < .25);   // 증거금의 75% 넘게 잃은 선물이 있으면
  f.classList.toggle('danger', danger);
  f.classList.toggle('hot', !danger && Math.abs(r) >= .05);
  f.classList.toggle('hotup', r > 0);
}

/* ───────── 친구 거래 상단 알림: 누가 사고팔거나 청산되면 위에 띠가 내려와요 ───────── */
const EVQ = { seen: null, q: [], busy: false };
function evFeed(list) {
  const mx = list.reduce((a, f) => Math.max(a, f.ts || 0), 0);
  if (EVQ.seen == null) { EVQ.seen = mx; return; }   // 처음 불러온 옛 소식은 안 띄워요
  const fresh = list.filter(f => f && f.ts > EVQ.seen && f.uid !== S.uid && !f.bot).sort((a, b) => a.ts - b.ts);
  EVQ.seen = Math.max(EVQ.seen, mx);
  fresh.forEach(f => { const t = feedText(f); if (t) EVQ.q.push({ f, t }); });
  if (EVQ.q.length > 6) EVQ.q.splice(0, EVQ.q.length - 6);
  evNext();
}
function evNext() {
  if (EVQ.busy || !EVQ.q.length) return;
  const { f, t } = EVQ.q.shift(), [c, ic, tx] = t; EVQ.busy = true;
  const big = f.kind === 'k_fliq' || f.kind === 'k_atk' || Math.abs(f.pnl || 0) >= 1e8 || (f.amt || 0) >= 5e8;
  let el = $('#evbar'); if (!el) { el = document.createElement('div'); el.id = 'evbar'; document.body.appendChild(el); }
  el.className = 'evbar ' + (f.kind === 'k_fliq' || (f.kind === 'k_atk' && f.target === S.uid && f.ok) ? 'liq' : big ? 'big' : c);
  el.innerHTML = `<span class="ic">${ic}</span><span class="tx">${tx}</span>`;
  void el.offsetWidth; el.classList.add('show'); if (big) buzz(f.kind === 'k_fliq' ? [80, 50, 80] : 50);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => { EVQ.busy = false; evNext(); }, 300); }, big ? 4200 : 3000);
}

/* ───────── 아이콘: 로고 이미지(밖에서 바로 불러옴) + 실패하면 글자 배지 · 원자재는 코드로 그린 SVG ───────── */
// 이미지는 위에 겹쳐 두고, 못 불러오면 지워서 아래 글자 배지가 보이게 해요
const logoBadge = (src, label, color) => `<span class="logo-b kb has-img" style="--bc:${color}"><span class="lb-t">${esc(label.length > 4 ? label.slice(0, 4) : label)}</span><img src="${src}" alt="" loading="lazy" decoding="async" onerror="this.remove()"></span>`;
const svgIcon = (bg, inner) => `<span class="logo-b svgic" style="background:${bg}"><svg viewBox="0 0 40 40" aria-hidden="true">${inner}</svg></span>`;
// 금속 막대(금괴 모양): 윗면·옆면 두 톤
const barSVG = (top, side, mark) => `<path d="M9 25 L13 15 H27 L31 25 Z" fill="${top}"/><path d="M9 25 H31 V29 H9 Z" fill="${side}"/><text x="20" y="23" text-anchor="middle" font-size="6.5" font-weight="900" fill="${side}">${mark}</text>`;
const CM_SVG = {
  GOLD: svgIcon('linear-gradient(145deg,#fff3c4,#f2c94c)', barSVG('#f7d36b', '#b8860b', 'Au')),
  SILV: svgIcon('linear-gradient(145deg,#f4f6fa,#c9ced8)', barSVG('#e3e7ee', '#8a919e', 'Ag')),
  PLAT: svgIcon('linear-gradient(145deg,#eef3f7,#b9c6d3)', barSVG('#d9e2ea', '#6b7c8d', 'Pt')),
  COPR: svgIcon('linear-gradient(145deg,#ffe2cf,#e08a4f)', barSVG('#f0a26b', '#9a4a1c', 'Cu')),
  WTI: svgIcon('linear-gradient(145deg,#3a3a44,#17161f)', '<path d="M20 8 C20 8 11 19 11 24.5 A9 9 0 0 0 29 24.5 C29 19 20 8 20 8 Z" fill="#2b2b33" stroke="#f2b300" stroke-width="1.6"/><path d="M15.5 25 a4.5 4.5 0 0 0 4.5 4.5" stroke="#f2b300" stroke-width="1.6" fill="none" stroke-linecap="round"/><text x="20" y="38" text-anchor="middle" font-size="5" font-weight="900" fill="#f2b300">WTI</text>'),
  BRNT: svgIcon('linear-gradient(145deg,#2c3e50,#101820)', '<path d="M20 8 C20 8 11 19 11 24.5 A9 9 0 0 0 29 24.5 C29 19 20 8 20 8 Z" fill="#1d2833" stroke="#5dade2" stroke-width="1.6"/><path d="M15.5 25 a4.5 4.5 0 0 0 4.5 4.5" stroke="#5dade2" stroke-width="1.6" fill="none" stroke-linecap="round"/><text x="20" y="38" text-anchor="middle" font-size="5" font-weight="900" fill="#5dade2">BRENT</text>'),
  GAS: svgIcon('linear-gradient(145deg,#e8f1ff,#9cc2ff)', '<path d="M20 7 C23 13 28 15 28 23 A8 8 0 0 1 12 23 C12 18 15 16 16 12 C17 16 19 17 20 18 C21 14 20 10 20 7 Z" fill="#2f78ee"/><path d="M20 21 C22 24 24 25 24 27.5 A4 4 0 0 1 16 27.5 C16 25.5 18 24 20 21 Z" fill="#9cc2ff"/>'),
  USD: svgIcon('linear-gradient(145deg,#2fbf71,#0f8a4f)', '<circle cx="20" cy="20" r="11" fill="none" stroke="#fff" stroke-width="2" opacity=".55"/><text x="20" y="26.5" text-anchor="middle" font-size="17" font-weight="900" fill="#fff">$</text>'),
};
const cmIcon = c => CM_SVG[c.a] || logoBadge('', c.a, CCAT[c.c].c);

/* ───────── 현물 빠른 버튼 + 지금 몇 % 골랐는지 ───────── */
function spotQuickHTML(sh, held) {
  return `<div class="quick qadd${held ? ' q5' : ''}">${['.01', '.1', '.25', '.5'].map(f => `<button type="button" data-kadd="${f}">+${Math.round(f * 100)}%</button>`).join('')}${held ? `<button type="button" data-kall="1" aria-pressed="${!!sh.all}">보유 전부</button>` : ''}</div>
    <div class="pctnow" id="pctNow"></div>`;
}
function spotPctNow(ratio, all) {
  const el = $('#pctNow'); if (!el) return;
  el.innerHTML = all ? '<b>보유 전부</b> 매도' : ratio > 0 ? `살 수 있는 돈의 <b class="num">${ratio >= .9995 ? '100' : (ratio * 100).toFixed(ratio < .1 ? 1 : 0)}%</b> <button type="button" data-kclr="1">지우기</button>` : '';
}

/* ───────── 🎰 헤더 게임 배너: 3초마다 문구가 바뀌어요 (진짜 대박 소식·연승 중인 친구 섞어서) ───────── */
const PROMO = { i: 0, t: 0 };
function promoMsgs() {
  const k = n => n >= 1e8 ? +(n / 1e8).toFixed(1) + '억' : Math.round(n / 1e4) + '만';
  const out = ['60초에 <em>2배</em>', '룰렛 <em>10배</em>', '5연승 <em>2.3배</em>'];
  (S.feed || []).filter(f => f && f.kind === 'casino' && f.amt > 0 && Date.now() - f.ts < 864e5).slice(0, 4)
    .forEach(f => out.push(`${esc(nameOf(f.uid).slice(0, 3))} <em>+${k(f.amt)}</em>`));
  activePlayers().filter(p => (p.udStreak || 0) >= 2).slice(0, 2).forEach(p => out.push(`${esc(p.name.slice(0, 3))} <em>${p.udStreak}연승</em>`));
  return out;
}
function promoTick() {
  const el = $('#prMsg'), b = $('#promoGo'); if (!el || !b || b.hidden || Date.now() - PROMO.t < 3000) return;
  PROMO.t = Date.now(); const ms = promoMsgs(); PROMO.i = (PROMO.i + 1) % ms.length;
  el.classList.remove('in'); void el.offsetWidth; el.innerHTML = ms[PROMO.i]; el.classList.toggle('sm', el.scrollWidth > el.clientWidth); el.classList.add('in');
  const go = b.querySelector('.pr-go'); if (go) go.textContent = PROMO.i % 2 ? 'GO' : '×2';
}
setInterval(promoTick, 500);
