'use strict';
/* ═════════ ⚡ 1분 업다운 (홀짝 대신) ═════════
   업비트 실제 시세로, 1분 뒤 가격이 지금보다 오를지 내릴지 맞혀요.
   맞히면 1.9배(연승하면 3번째 판부터 2.0배, 5번째 판부터 2.3배), 틀리면 건 돈을 잃어요. 똑같으면 돌려받아요.
   진행 중인 판은 지갑(ud)에 저장돼서, 앱을 꺼도 1분 뒤 업비트 1분봉 종가로 결과를 정해요. */
const UD = { MS: 60e3, COINS: ['KRW-BTC', 'KRW-ETH', 'KRW-XRP', 'KRW-SOL', 'KRW-DOGE'], pts: [], busy: false, settling: false };
const udMult = s => (s >= 4 ? 2.3 : s >= 2 ? 2.0 : 1.9);   // s = 지금 연승 수 (이번 판이 몇 번째 연승 도전인지)
const udSym = () => (UD.COINS.includes(S.udSym) ? S.udSym : 'KRW-BTC');

function udCardHTML() {
  const me = S.me, r = me.ud, sym = r ? r.sym : udSym(), c = KC[sym], o = KP[sym] || {}, s = me.udStreak || 0, mult = udMult(s), bet = betAmount();
  const hist = (me.udHist || []).slice(-10);
  return `<div class="card game ud" id="udCard">
    <div class="ud-h"><div><h3>⚡ 1분 업다운</h3><p class="desc">진짜 업비트 시세 · 1분 뒤 오를까 내릴까?</p></div>${s ? `<span class="ud-streak">🔥 ${s}연승 · 다음 ${udMult(s)}배</span>` : ''}</div>
    <div class="ud-coins">${UD.COINS.map(k => `<button type="button" data-udsym="${k}" aria-pressed="${k === sym}" ${r ? 'disabled' : ''}>${kBadge(KC[k])}<span>${KC[k].a}</span></button>`).join('')}</div>
    <div class="ud-board${r ? ' live' : ''}">
      <svg class="ud-ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" class="bg"/><circle cx="32" cy="32" r="28" class="fg" id="udRing" pathLength="100" style="stroke-dashoffset:${r ? 100 - 100 * Math.max(0, Math.min(1, (r.end - now()) / UD.MS)) : 0}"/><text x="32" y="38" id="udSec">${r ? Math.max(0, Math.ceil((r.end - now()) / 1000)) : 60}</text></svg>
      <div class="ud-px"><small>${esc(c.n)} 지금</small><b class="num" id="udPrice">${kPx(sym) ? kWon(kPx(sym)) + '원' : '…'}</b>
        ${r ? `<span class="num" id="udDiff"></span>` : `<span class="num ${cls(kChgG(sym))}">어제보다 ${kPx(sym) ? pctTxt(kChgG(sym)) : ''}</span>`}</div>
    </div>
    ${r ? `<div class="ud-live"><div class="ud-pick ${r.d > 0 ? 'up' : 'down'}">${r.d > 0 ? '📈 오른다' : '📉 내린다'} · ${won(r.bet)}<small>진입 ${kWon(r.e)}원</small></div><div class="ud-state" id="udState"></div></div>
      <canvas class="ud-chart" id="udChart" aria-label="이번 판 1분 그래프"></canvas>`
    : `<div class="pick2 ud-go"><button class="cta buy" type="button" data-ud="1" ${bet < MINBET || C.busy ? 'disabled' : ''}>📈 오른다<small>맞히면 +${won(Math.floor(bet * mult) - bet)}</small></button>
      <button class="cta sell" type="button" data-ud="-1" ${bet < MINBET || C.busy ? 'disabled' : ''}>📉 내린다<small>맞히면 +${won(Math.floor(bet * mult) - bet)}</small></button></div>`}
    ${hist.length ? `<div class="ud-hist">${hist.map(x => `<i class="${x}">${x === 'W' ? '✓' : x === 'L' ? '✕' : '–'}</i>`).join('')}</div>` : ''}
  </div>`;
}

async function udStart(d) {
  const me0 = S.me; if (!me0 || me0.ud || S.saving || UD.busy || S.readOnly) return;
  const sym = udSym(), bet = betAmount();
  if (bet < MINBET) { toast('걸 금액을 정해주세요 (최소 10만원)'); return; }
  if (!kFresh(sym)) { toast('시세를 받는 중이에요. 잠시 후 다시 눌러 주세요'); return; }
  UD.busy = true;
  const me = clone(me0); me.cash = Math.round(me.cash - bet); me.ud = { sym, d, bet, e: kPx(sym), at: now(), end: now() + UD.MS, m: udMult(me0.udStreak || 0) };
  UD.pts = [[now(), kPx(sym)]];
  const ok = await kSave(me, me0); UD.busy = false;
  if (ok) { buzz(30); renderCasino(); }
}
// 결과 가격: 지금 막 끝났으면 실시간 시세, 늦게 열었으면 업비트 1분봉(끝난 시각) 종가
async function udEndPrice(r) {
  if (now() - r.end < 5000 && kFresh(r.sym)) return kPx(r.sym);
  try {
    const to = new Date(r.end + 60e3).toISOString().slice(0, 19);
    const a = await (await upFetch(`${UPBIT}/candles/minutes/1?market=${r.sym}&to=${to}&count=2`)).json();
    const c = a.find(x => Date.parse(x.candle_date_time_utc + 'Z') <= r.end) || a[a.length - 1];
    return c ? c.trade_price * gmMult(r.sym, r.end, KP[r.sym] && KP[r.sym].c) : kPx(r.sym);   // 게임 가격으로
  } catch { return kPx(r.sym); }
}
async function udSettle() {
  const me0 = S.me, r = me0 && me0.ud; if (!r || now() < r.end || UD.settling || S.saving) return;
  UD.settling = true;
  const p = await udEndPrice(r), diff = r.d * (p - r.e), win = diff > 0, tie = diff === 0;
  const pay = tie ? r.bet : win ? Math.floor(r.bet * (r.m || 1.9)) : 0, net = pay - r.bet;
  const before = S.me, me = clone(before); delete me.ud;
  me.cash = Math.round(me.cash + pay); me.casino = (me.casino || 0) + net;
  me.udStreak = win ? (me.udStreak || 0) + 1 : tie ? (me.udStreak || 0) : 0;
  me.udHist = [...(me.udHist || []), win ? 'W' : tie ? 'D' : 'L'].slice(-20);
  const ok = await kSave(me, before); UD.settling = false; UD.pts = [];
  if (!ok) return;
  const c = KC[r.sym];
  if (win) { bigWin(net, `⚡ ${c.a} ${r.d > 0 ? '올랐어요' : '내렸어요'}! ${me.udStreak >= 2 ? me.udStreak + '연승 ' : ''}적중`); if (net >= 1e8 || me.udStreak >= 3) addFeed({ kind: 'casino', game: `1분 업다운 ${me.udStreak}연승`, mult: r.m, amt: net }); }
  else if (tie) toast(`➖ ${c.a} 가격이 그대로라 ${won(r.bet)} 돌려받았어요`);
  else { toast(`😭 ${c.a} ${r.d > 0 ? '내렸어요' : '올랐어요'}… -${won(r.bet)}`); document.body.classList.remove('shake'); void document.body.offsetWidth; document.body.classList.add('shake'); buzz(80); if (r.bet >= 1e8) addFeed({ kind: 'casino', game: '1분 업다운', mult: 0, amt: net }); }
  renderAll(); if (S.tab === 'shop' && S.shopView === 'game') renderCasino();
}
// 1초마다: 결과 정하기 + 게임 화면이면 시계·가격·그래프만 고쳐요 (전체 다시 그리기 없이)
function udTick() {
  const r = S.me && S.me.ud; if (!r) return;
  if (now() >= r.end) { udSettle(); return; }
  const p = kPx(r.sym); if (p) { UD.pts.push([now(), p]); if (UD.pts.length > 90) UD.pts.shift(); }
  if (!$('#udCard')) return;
  const left = Math.max(0, r.end - now()), ring = $('#udRing'), sec = $('#udSec');
  if (ring) ring.style.strokeDashoffset = 100 - 100 * left / UD.MS;
  if (sec) sec.textContent = Math.ceil(left / 1000);
  const pe = $('#udPrice'); if (pe && p) flashText(pe, kWon(p) + '원');
  const df = $('#udDiff'), st = $('#udState'), dlt = p ? (p - r.e) / r.e : 0, winning = r.d * (p - r.e);
  if (df) { df.textContent = `진입 대비 ${dlt > 0 ? '+' : ''}${(dlt * 100).toFixed(3)}%`; df.className = 'num ' + cls(dlt); }
  if (st) { st.textContent = winning > 0 ? '🔥 이기는 중' : winning < 0 ? '😰 지는 중' : '➖ 제자리'; st.className = 'ud-state ' + (winning > 0 ? 'win' : winning < 0 ? 'lose' : ''); }
  const card = $('#udCard'); if (card) card.classList.toggle('hurry', left < 10e3);
  udDraw(r);
}
function udDraw(r) {
  const cv = $('#udChart'); if (!cv || UD.pts.length < 2) return;
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
  cv.width = w * dpr; cv.height = h * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const ps = UD.pts.map(x => x[1]), lo = Math.min(...ps, r.e), hi = Math.max(...ps, r.e), sp = (hi - lo) || r.e * 1e-4;
  const X = t => 4 + (w - 8) * Math.min(1, (t - r.at) / UD.MS), Y = v => 6 + (h - 12) * (1 - (v - lo + sp * .1) / (sp * 1.2));
  const cs = getComputedStyle(document.documentElement), last = ps[ps.length - 1], win = r.d * (last - r.e) > 0;
  const col = (win ? cs.getPropertyValue('--up') : cs.getPropertyValue('--down')).trim();
  g.strokeStyle = cs.getPropertyValue('--ink').trim(); g.globalAlpha = .35; g.setLineDash([4, 4]); g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, Y(r.e)); g.lineTo(w, Y(r.e)); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
  g.fillStyle = cs.getPropertyValue('--dim').trim(); g.font = '700 10px ' + cs.getPropertyValue('--f-body'); g.fillText('진입', 4, Y(r.e) - 4);
  g.beginPath(); UD.pts.forEach(([t, v], i) => i ? g.lineTo(X(t), Y(v)) : g.moveTo(X(t), Y(v))); g.strokeStyle = col; g.lineWidth = 2.2; g.lineJoin = 'round'; g.stroke();
  const ex = X(UD.pts[UD.pts.length - 1][0]), ey = Y(last); g.beginPath(); g.arc(ex, ey, 4, 0, 7); g.fillStyle = col; g.fill();
  g.strokeStyle = cs.getPropertyValue('--line').trim(); g.beginPath(); g.moveTo(X(r.end) - .5, 0); g.lineTo(X(r.end) - .5, h); g.stroke();
}
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('button'); if (!t) return;
  if (t.dataset.udsym) { S.udSym = t.dataset.udsym; LS.set('udSym', S.udSym); renderCasino(); }
  if (t.dataset.ud) udStart(+t.dataset.ud);
});
