'use strict';
/* ═════════ 선물 롱·숏 — 코인 · 주식 · 현물 공용 (증거금은 원화) ═════════
   코인: 해외 선물거래소 방식. BTC·ETH 100배, 알트 50배, 밈 25배. 수수료 0.05%.
   주식: 해외주식 CFD 방식. 2·3배 (국내 CFD 최소 증거금 40% ≈ 2.5배, 미국 신용 2배 언저리). 수수료 0.1%.
   현물(금·원유 등): 원자재 선물 방식. 2·5·10배. 수수료 0.1%.
   공통: 펀딩비(보유 비용) 8시간마다 0.01%, 유지증거금 0.5%.
   청산가: 롱 = 진입가 × (1 − 1/배수 + 0.5%), 숏 = 진입가 × (1 + 1/배수 − 0.5%). 청산되면 증거금 전부 잃어요.
   가격은 모두 원화 기준(주식·현물은 달러 × 실시간 환율)이라 환율도 손익에 들어가요. */
const F_MM = 0.005, F_FUND = 0.0001, F_FUND_MS = 8 * H;
const F_LEVS = [2, 5, 10, 25, 50, 100];
const fIsCoin = sym => !!KC[sym];
// 나라별 국채(GC, gbond.js)도 같은 엔진: 가격 = 금리로 계산한 가격 지수
const fField = sym => (fIsCoin(sym) ? 'kFut' : GC[sym] ? 'gFut' : 'uFut');
const fAsset = sym => KC[sym] || UC[sym] || GC[sym];
const fPx = sym => (fIsCoin(sym) ? kPx(sym) : GC[sym] ? gPx(sym) : uWon(sym));
const fOk = sym => (fIsCoin(sym) ? kFresh(sym) : GC[sym] ? gFresh(sym) : uFresh(sym));
const fFee = sym => (fIsCoin(sym) || GC[sym] ? 0.0005 : U_FEE);
function fLevs(sym) {
  if (GC[sym]) return [2, 5, 10];
  if (!fIsCoin(sym)) return UC[sym].m === 'us' ? [2, 3] : [2, 5, 10];   // 주식 2·3배, 원자재·달러 2·5·10배
  const c = KC[sym], mx = (c.a === 'BTC' || c.a === 'ETH') ? 100 : c.c === 'meme' ? 25 : 50; return F_LEVS.filter(x => x <= mx);
}
const fShowPx = (sym, v) => (fIsCoin(sym) ? kWon(v) + '원' : GC[sym] ? `금리 ${gYieldAt(sym, v).toFixed(2)}%` : UC[sym].m === 'fx' ? v.toFixed(1) + '원' : FX.p ? usd(v / FX.p) : krw(v));
const fLiqP = o => o.e * (1 - o.d * (1 / o.x - F_MM));
const fFund = o => o.q * o.e * F_FUND * Math.max(0, now() - o.at) / F_FUND_MS;
const fDead = (o, p) => (o.d > 0 ? p <= fLiqP(o) : p >= fLiqP(o));
function fVal(o, p) { if (!p) return o.m; if (fDead(o, p)) return 0; return Math.max(0, o.m + o.d * o.q * (p - o.e) - fFund(o)); }
const fSide = o => (o.d > 0 ? '롱' : '숏');
function futWorth(p) { let v = 0; ['kFut', 'uFut', 'gFut'].forEach(f => { for (const [s, o] of Object.entries((p && p[f]) || {})) if (fAsset(s) && o) v += fVal(o, fPx(s) || o.e); }); return v; }
function fPositions(p, field) {
  const out = [];
  Object.entries((p && p[field]) || {}).forEach(([s, o]) => {
    if (!fAsset(s) || !o) return; const pr = fPx(s) || o.e, lp = fLiqP(o);
    out.push({ sym: s, kind: 'fut', label: `${o.x}배 ${fSide(o)}`, d: o.d, principal: o.m, value: Math.max(0, fVal(o, pr) - o.q * pr * fFee(s)), q: o.q, dist: Math.max(0, o.d * (pr - lp) / pr), distMax: 1 / o.x });
  });
  return out;
}

/* ───────── 청산: 실시간 시세 + 앱이 꺼져 있던 동안은 분봉 최저·최고가 ───────── */
const FQ = { busy: false, scanned: {} };
function fLiveCheck(sym) { const o = S.me && (S.me[fField(sym)] || {})[sym]; if (o && !S.readOnly) { const p = fPx(sym); if (p && fDead(o, p)) fLiquidate(sym); } }
async function fLiquidate(sym) {
  const f = fField(sym); if (FQ.busy || S.saving || !S.me || !(S.me[f] || {})[sym]) return;
  FQ.busy = true;
  const before = S.me, me = clone(before), o = me[f][sym]; delete me[f][sym];
  const ok = await kSave(me, before); FQ.busy = false;
  if (ok) { addFeed({ kind: 'k_fliq', sym, amt: Math.round(o.m), x: o.x, d: o.d }); toast(`💀 ${fAsset(sym).n} ${o.x}배 ${fSide(o)} 청산! 증거금 ${krw(o.m)}을(를) 다 잃었어요`); buzz(150); renderAll(); if (S.sheet) renderSheet(); }
}
async function fScan() {
  if (!S.me || S.readOnly) return;
  for (const f of ['kFut', 'uFut']) for (const [sym, o] of Object.entries(S.me[f] || {})) {
    const key = sym + ':' + o.at; if (FQ.scanned[key] && Date.now() - FQ.scanned[key] < 60e3) continue; FQ.scanned[key] = Date.now();
    try {
      const from = Math.floor(o.at / 6e4) * 6e4 + 6e4;   // 들어간 다음 분부터
      let lo = Infinity, hi = 0;
      if (f === 'kFut') {
        let oldest = Infinity;
        (await (await fetch(`${UPBIT}/candles/minutes/1?market=${sym}&count=200`)).json()).forEach(c => {
          const ts = Date.parse(c.candle_date_time_utc + 'Z'); oldest = Math.min(oldest, ts); if (ts >= from) { lo = Math.min(lo, c.low_price); hi = Math.max(hi, c.high_price); } });
        if (from < oldest) (await (await fetch(`${UPBIT}/candles/minutes/60?market=${sym}&count=200`)).json()).forEach(c => {
          const ts = Date.parse(c.candle_date_time_utc + 'Z'); if (ts >= Math.ceil(o.at / H) * H && ts < oldest) { lo = Math.min(lo, c.low_price); hi = Math.max(hi, c.high_price); } });
      } else {
        if (!FX.p) continue;
        const bars = ((((await (await fetch('https://ts-api.cnbc.com/harmony/app/charts/1D.json?symbol=' + encodeURIComponent(UC[sym].s))).json()) || {}).barData || {}).priceBars) || [];
        bars.forEach(b => { if (b.tradeTimeinMills >= from) { lo = Math.min(lo, numOf(b.low) * FX.p); hi = Math.max(hi, numOf(b.high) * FX.p); } });
      }
      const cur = (S.me[f] || {})[sym];
      if (cur && cur.at === o.at && (cur.d > 0 ? lo <= fLiqP(cur) : hi >= fLiqP(cur))) await fLiquidate(sym);
    } catch {}
  }
}

/* ───────── 주문 ───────── */
function fCalc(sh) {
  const p = fPx(sh.sym), amt = Math.max(0, Math.floor(+sh.amt || 0)), x = sh.fx, d = sh.fd, me = S.me || {};
  const N = amt * x, q = p ? N / p : 0, fee = N * fFee(sh.sym), lp = p * (1 - d * (1 / x - F_MM));
  const cur = (me[fField(sh.sym)] || {})[sh.sym], clash = cur && cur.d !== d;
  return { p, amt, N, q, fee, lp, ok: !clash && amt >= K_MIN && amt + fee <= (me.cash || 0) && fLevs(sh.sym).includes(x), clash,
    line: clash ? `반대(${fSide(cur)}) 포지션을 먼저 종료해 주세요` : `포지션 <b class="num">${krw(N)}</b> · 청산가 <b class="num ${d > 0 ? 'down' : 'up'}">${fShowPx(sh.sym, lp)}</b>` };
}
const fMax = sh => Math.floor(((S.me || {}).cash || 0) / (1 + sh.fx * fFee(sh.sym)));
async function fOpen() {
  const sh = S.sheet; if (!sh || !S.me || S.saving || S.readOnly) return;
  if (!fOk(sh.sym)) { toast('시세를 받는 중이에요. 잠시 후 다시 눌러 주세요'); return; }
  const c = fCalc(sh); if (!c.ok) return;
  const f = fField(sh.sym), before = S.me, me = clone(before); me[f] ||= {};
  const o = me[f][sh.sym];
  if (o) { const q = o.q + c.q, e = (o.q * o.e + c.q * c.p) / q, m = o.m - fFund(o) + c.amt; me[f][sh.sym] = { d: o.d, q, e, m, x: Math.max(1, Math.round(q * e / m)), at: now() }; }
  else me[f][sh.sym] = { d: sh.fd, q: c.q, e: c.p, m: c.amt, x: sh.fx, at: now() };
  me.cash = Math.round(me.cash - c.amt - c.fee);
  if (await kSave(me, before)) { addFeed({ kind: 'k_fopen', sym: sh.sym, amt: Math.round(c.N), x: sh.fx, d: sh.fd }); toast(`${sh.fd > 0 ? '🚀' : '📉'} ${fAsset(sh.sym).n} ${sh.fx}배 ${sh.fd > 0 ? '롱' : '숏'} 진입!`); showMine(mktOf(sh.sym)); }
}
async function fClose(sym) {
  sym = sym || (S.sheet && S.sheet.sym); if (!sym || !S.me || S.saving || S.readOnly) return;
  const f = fField(sym), o = (S.me[f] || {})[sym]; if (!o) return;
  if (!fOk(sym)) { toast('시세를 받는 중이에요. 잠시 후 다시 눌러 주세요'); return; }
  const p = fPx(sym); if (fDead(o, p)) { fLiquidate(sym); return; }
  const get = Math.max(0, Math.floor(fVal(o, p) - o.q * p * fFee(sym))), pnl = get - o.m;
  const before = S.me, me = clone(before); delete me[f][sym]; me.cash = Math.round(me.cash + get);
  if (await kSave(me, before)) { addFeed({ kind: 'k_fclose', sym, pnl: Math.round(pnl), amt: o.m ? pnl / o.m : 0, x: o.x, d: o.d }); toast(`${fAsset(sym).n} ${fSide(o)} 종료 · ${signKrw(pnl)} (${pctTxt(pnl / o.m)})`); if (pnl > 0) bigWin(pnl); renderAll(); if (S.sheet) renderSheet(); }
}

/* ───────── 거래창 안 선물 화면 (코인·주식·현물 같은 모양) ───────── */
// 증거금은 자동으로 채워져요: 마지막으로 고른 비율(처음엔 현금의 10%). 직접 입력하면 그 값을 그대로 써요
const F_PCTS = [['.1', '10%'], ['.25', '25%'], ['.5', '50%'], ['1', '최대']];
const fPct = () => { const v = S.futPct ?? LS.get('futPct', .1); return F_PCTS.some(([f]) => +f === +v) ? +v : .1; };
function fAutoAmt(sh) { if (!sh.amtTouched) { const mx = fMax(sh), v = fPct() === 1 ? mx : Math.floor(mx * fPct() / 10000) * 10000; sh.amt = v >= K_MIN ? String(v) : ''; } }
function fFormHTML(sh) {
  sh.fd ||= 1; const levs = fLevs(sh.sym); if (!levs.includes(sh.fx)) sh.fx = levs.includes(10) ? 10 : levs[0];
  fAutoAmt(sh);
  const o = ((S.me || {})[fField(sh.sym)] || {})[sh.sym], p = fPx(sh.sym);
  const pos = o ? (() => { const v = fVal(o, p), pnl = v - o.m;
    return `<div class="fpos ${o.d > 0 ? 'long' : 'short'}"><div><b>${o.x}배 ${fSide(o)}</b><small class="num">진입 ${fShowPx(sh.sym, o.e)} · 청산 ${fShowPx(sh.sym, fLiqP(o))}</small></div>
      <div class="r"><b class="num ${cls(pnl)}" id="fRoe">${pctTxt(pnl / o.m)}</b><small class="num ${cls(pnl)}" id="fPnl">${signKrw(pnl)}</small></div>
      <button type="button" id="fClose" data-sym="${sh.sym}">종료</button></div>`; })() : '';
  return `${pos}<div class="seg fdir"><button type="button" data-fdir="1" aria-pressed="${sh.fd > 0}">롱 (오르면 이득)</button><button type="button" data-fdir="-1" aria-pressed="${sh.fd < 0}">숏 (내리면 이득)</button></div>
    <div class="levrow">${levs.map(x => `<button type="button" data-flev="${x}" aria-pressed="${sh.fx === x}">${x}배</button>`).join('')}</div>
    <div class="qtyrow kamt"><input id="kAmt" type="number" inputmode="numeric" min="0" step="1000" value="${sh.amt || ''}" placeholder="증거금(원) · 직접 입력도 돼요" aria-label="증거금"><span class="unit">원</span></div>
    <div class="quick fpct">${F_PCTS.map(([f, l]) => `<button type="button" data-kfrac="${f}" aria-pressed="${!sh.amtTouched && +f === fPct()}">${l}</button>`).join('')}</div>
    <div class="est" id="kEst"></div>
    <button class="cta" id="kDoTrade" type="button"></button>`;
}
function fUpdateEst(sh) {
  const est = $('#kEst'), btn = $('#kDoTrade'); if (!est || !btn) return;
  const c = fCalc(sh);
  est.innerHTML = `<span>${c.line}</span><span class="num">최대 ${krw(fMax(sh))}</span>`;
  btn.textContent = S.saving ? '처리 중…' : `${sh.fd > 0 ? '🚀' : '📉'} ${sh.fx}배 ${sh.fd > 0 ? '롱' : '숏'} 진입`;
  btn.className = 'cta ' + (sh.fd > 0 ? 'buy' : 'sell'); btn.disabled = S.saving || !c.ok || !fOk(sh.sym);
  const o = ((S.me || {})[fField(sh.sym)] || {})[sh.sym];
  if (o) { const v = fVal(o, fPx(sh.sym)), pnl = v - o.m, r = $('#fRoe'), n = $('#fPnl'); if (r) { r.textContent = pctTxt(pnl / o.m); r.className = 'num ' + cls(pnl); } if (n) { n.textContent = signKrw(pnl); n.className = 'num ' + cls(pnl); } }
}
