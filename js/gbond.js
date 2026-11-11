'use strict';
/* ═════════ 🌍 나라별 10년물 국채 (채권 탭) ═════════
   시세: CNBC 10년물 금리(실시간). 국채 '가격'은 금리로 계산해요 — 금리가 오르면 가격이 내려요(듀레이션 8, 브라질 6).
     가격 지수 P = 100 − 듀레이션 × (지금 금리 − 기준 금리). 금리 0.1%p ↑ → 가격 약 0.8% ↓
   이자: 산 금리(연)만큼 시간에 따라 쌓여서 팔 때 같이 받아요. 원화 기준(환헤지)이라 환율은 안 들어가요.
   현물 매수·매도 수수료 0.05%, 롱·숏 2·5·10배(선물 엔진 공용, 칸 gFut). 보유는 지갑의 gHold {나라: {q 수량, a 원금, y 산 금리, at}}.
   ⚠️ 기준 금리(ref)와 듀레이션은 바꾸면 가진 사람 평가액이 바뀌어요. */
const GBX = [
  ['US10Y', '미국', '🇺🇸', 'am', 5.0, 8], ['BR10Y', '브라질', '🇧🇷', 'am', 15.23, 6], ['AU10Y', '호주', '🇦🇺', 'am', 5.045, 8],
  ['KR10Y', '한국', '🇰🇷', 'as', 3.952, 8], ['JP10Y', '일본', '🇯🇵', 'as', 2.795, 8], ['CN10Y', '중국', '🇨🇳', 'as', 1.614, 8], ['IN10Y', '인도', '🇮🇳', 'as', 7.214, 8],
  ['GB10Y', '영국', '🇬🇧', 'eu', 5.2, 8], ['FR10Y', '프랑스', '🇫🇷', 'eu', 4.767, 8], ['DE10Y', '독일', '🇩🇪', 'eu', 3.307, 8], ['IT10Y', '이탈리아', '🇮🇹', 'eu', 4.348, 8],
];
const GC = {}; GBX.forEach(([id, n, f, rg, ref, dur]) => { GC[id] = { id, a: id.slice(0, 2), n: n + ' 국채', cn: n, f, rg, ref, dur }; });
const GREG = { am: '미주·호주', as: '아시아', eu: '유럽' };
const GP = {};   // id → { y 금리(%), base 전날 금리, t }
const G_FEE = 0.0005, G_MIN = 10000;
const gY = id => (GP[id] && GP[id].y) || 0;
const gPx = id => (gY(id) ? 100 - GC[id].dur * (gY(id) - GC[id].ref) : 0);   // 가격 지수
const gYieldAt = (id, p) => GC[id].ref + (100 - p) / GC[id].dur;
const gFresh = id => GP[id] && Date.now() - GP[id].t < 60e3;
const gBp = id => (GP[id] && GP[id].base != null ? (GP[id].y - GP[id].base) * 100 : 0);   // 오늘 금리 변화(bp)
const gChg = id => { const p = gPx(id), b = GP[id] && GP[id].base != null ? 100 - GC[id].dur * (GP[id].base - GC[id].ref) : p; return b ? p / b - 1 : 0; };
async function gFetch() {
  try {
    const list = (((await (await fetch(CNBC + encodeURIComponent(GBX.map(x => x[0]).join('|')))).json()) || {}).FormattedQuoteResult || {}).FormattedQuote || [];
    list.forEach(q => { if (!q || q.code !== 0 || !GC[q.symbol]) return; const y = numOf(q.last); if (!y) return; const ch = numOf(q.change); GP[q.symbol] = { y, base: y - ch, t: Date.now() }; });
    if (S.me && S.me.gFut) Object.keys(S.me.gFut).forEach(fLiveCheck);
  } catch {}
}
let G_POLL = 0;
function gTick() { if (Date.now() - G_POLL > 15000) { G_POLL = Date.now(); gFetch(); } }
// 보유 1건 평가: 수량 × 지금 가격 + 쌓인 이자
const gLotVal = (id, o) => o.q * (gPx(id) || 100) + o.a * (o.y / 100) * Math.max(0, now() - o.at) / YEAR_MS;
const YEAR_MS = 365 * D;
function gHoldWorth(p) { let v = 0; for (const [id, o] of Object.entries((p && p.gHold) || {})) if (GC[id] && o) v += gLotVal(id, o); return v; }
function gPositions(p) {
  const out = [];
  Object.entries((p && p.gHold) || {}).forEach(([id, o]) => { if (!GC[id] || !o) return; const value = gLotVal(id, o) * (1 - G_FEE);
    out.push({ sym: id, kind: 'gb', label: '국채', principal: o.a, value, q: o.q, pnl: value - o.a, pct: o.a ? value / o.a - 1 : 0 }); });
  fPositions(p, 'gFut').forEach(x => { x.pnl = x.value - x.principal; x.pct = x.principal ? x.pnl / x.principal : 0; out.push(x); });
  return out;
}
/* ───────── 주문 (현물) ───────── */
async function gTrade(side) {
  const sh = S.sheet; if (!sh || !S.me || S.saving || S.readOnly) return;
  const id = sh.sym; if (!gFresh(id)) { toast('금리를 받는 중이에요. 잠시 후 다시 눌러 주세요'); return; }
  const amt = Math.floor(+sh.amt || 0), before = S.me, me = clone(before); me.gHold ||= {};
  const o = me.gHold[id], p = gPx(id), y = gY(id);
  if (side === 'buy') {
    if (amt < G_MIN || amt * (1 + G_FEE) > me.cash) return;
    const cur = o ? gLotVal(id, o) : 0, q = (cur + amt) / p;   // 기존 보유분은 지금 가치로 다시 잡고 합쳐요
    me.gHold[id] = { q, a: (o ? o.a : 0) + amt, y, at: now() }; if (o) me.gHold[id].a = o.a + amt;
    me.cash = Math.round(me.cash - amt * (1 + G_FEE));
    if (o) { me.gHold[id].q = (cur + amt) / p; me.gHold[id].y = y; }
  } else {
    if (!o) return; const val = gLotVal(id, o), part = sh.all ? 1 : Math.min(1, amt / val); if (!(part > 0)) return;
    const get = Math.floor(val * part * (1 - G_FEE)), pnl = Math.round(get - o.a * part);
    me.cash = Math.round(me.cash + get);
    if (part >= .9999) delete me.gHold[id]; else { me.gHold[id] = { ...o, q: o.q * (1 - part), a: o.a * (1 - part) }; }
    if (!(await kSave(me, before))) return;
    addFeed({ kind: 'k_gsell', sym: id, amt: get, pnl }); toast(`${GC[id].f} ${GC[id].n} 매도 · ${signKrw(pnl)}`); if (pnl > 0) bigWin(pnl);
    sh.amt = ''; sh.all = false; renderAll(); renderSheet(); return;
  }
  if (!(await kSave(me, before))) return;
  addFeed({ kind: 'k_gbuy', sym: id, amt }); toast(`${GC[id].f} ${GC[id].n} ${krw(amt)} 매수 · 금리 ${y.toFixed(2)}%`); showMine('bond');
}
/* ───────── 화면: 세계 지도(지역 탭) + 목록 ───────── */
// 지역마다 간단한 땅 모양과 나라 위치 (지도 느낌만 내요)
const GMAP = {
  am: { land: ['M40 30 Q70 10 120 22 Q150 30 140 60 Q120 78 95 80 Q70 95 52 78 Q30 60 40 30Z', 'M98 102 Q122 98 128 120 Q130 150 112 182 Q100 188 96 170 Q88 140 92 118Z', 'M262 128 Q300 118 322 134 Q330 156 306 166 Q278 170 262 156 Q252 140 262 128Z'],
        pos: { US10Y: [88, 52], BR10Y: [112, 140], AU10Y: [292, 146] } },
  as: { land: ['M30 40 Q90 20 170 26 Q240 22 300 40 Q320 60 290 78 Q250 92 210 96 Q160 108 128 150 Q110 170 96 150 Q70 120 50 92 Q24 70 30 40Z', 'M276 52 Q290 46 296 62 Q292 84 280 92 Q272 80 276 52Z'],
        pos: { IN10Y: [100, 118], CN10Y: [170, 66], KR10Y: [236, 58], JP10Y: [306, 92] } },
  eu: { land: ['M150 40 Q190 30 240 42 Q270 60 250 90 Q230 110 210 118 Q200 150 186 160 Q180 140 168 126 Q140 120 128 100 Q118 80 130 60 Q140 46 150 40Z', 'M92 42 Q108 34 116 52 Q114 76 100 84 Q86 74 92 42Z'],
        pos: { GB10Y: [104, 60], FR10Y: [146, 96], DE10Y: [196, 70], IT10Y: [192, 128] } },
};
function gMapSVG(rg) {
  const M = GMAP[rg], me = S.me || {};
  const pins = Object.entries(M.pos).map(([id, [x, y]]) => { const c = GC[id], bp = gBp(id), has = (me.gHold || {})[id] || (me.gFut || {})[id];
    return `<g class="gpin${has ? ' mine' : ''}" data-gb="${id}" transform="translate(${x},${y})"><circle r="19" class="gp-c ${bp > 0 ? 'up' : bp < 0 ? 'down' : ''}"/><text y="6" class="gp-f">${c.f}</text>
      <g transform="translate(0,30)"><rect x="-27" y="-10" width="54" height="20" rx="10" class="gp-l"/><text y="4" class="gp-t">${gY(id) ? gY(id).toFixed(2) + '%' : '…'}</text></g></g>`; }).join('');
  return `<svg viewBox="0 0 360 200" class="gmap" role="img" aria-label="${GREG[rg]} 국채 지도">${M.land.map(d => `<path d="${d}" class="gl"/>`).join('')}${pins}</svg>`;
}
function worldHTML() {
  if (!GREG[S.gReg]) S.gReg = 'am';
  const rg = S.gReg, me = S.me || {}, list = Object.values(GC).filter(c => c.rg === rg);
  return `<div class="greg">${Object.entries(GREG).map(([k, l]) => `<button type="button" data-greg="${k}" aria-pressed="${rg === k}">${l}</button>`).join('')}</div>
    <div class="card gmapbox">${gMapSVG(rg)}<small class="gm-note">10년물 국채 금리 · 실시간</small></div>
    ${list.map(c => { const bp = gBp(c.id), o = (me.gHold || {})[c.id], v = o ? gLotVal(c.id, o) : 0;
      return `<div class="srow"><button class="srow-main" type="button" data-gb="${c.id}"><span class="logo-b gflag">${c.f}</span><span class="sname"><b>${esc(c.n)}</b><small>${o ? `<span class="mine">${krw(v)}</span> <b class="rowpnl ${cls(v - o.a)}">${signKrw(v - o.a)}</b>` : `10년물 · 가격 ${gPx(c.id) ? gPx(c.id).toFixed(2) : '…'}`}</small></span>
        <span class="sprice"><div class="p num">${gY(c.id) ? gY(c.id).toFixed(3) + '%' : '…'}</div><div class="c num ${bp > 0 ? 'down' : bp < 0 ? 'up' : 'flat'}">${bp > 0 ? '+' : ''}${bp.toFixed(1)}bp</div></span></button>
        <span class="tbtns"><button class="tb trade${o || (me.gFut || {})[c.id] ? ' lit' : ''}" type="button" data-gb="${c.id}">거래</button></span></div>`; }).join('')}
    <p class="gnote">금리가 오르면(빨간 bp) 국채 가격은 내려요. 산 금리만큼 이자가 시간에 따라 쌓여요.</p>`;
}
/* ───────── 거래창 ───────── */
const GCH = {};
async function gLoadChart(id) {
  const ent = GCH[id]; if (ent && Date.now() - ent.t < 60e3) return; GCH[id] = { t: Date.now(), pts: ent ? ent.pts : null };
  try { const bars = ((((await (await fetch('https://ts-api.cnbc.com/harmony/app/charts/1D.json?symbol=' + id)).json()) || {}).barData || {}).priceBars) || [];
    const tEnd = bars.length ? bars[bars.length - 1].tradeTimeinMills : 0, l = bars.filter(b => b.tradeTimeinMills >= tEnd - D), st = Math.max(1, Math.floor(l.length / 200));
    GCH[id] = { t: Date.now(), pts: l.filter((b, i) => i % st === 0 || i === l.length - 1).map(b => [b.tradeTimeinMills, numOf(b.close)]) }; gDrawChart(); } catch {}
}
function gDrawChart() {
  const cv = $('#gChart'), sh = S.sheet; if (!cv || !sh || sh.type !== 'gb') return; const ent = GCH[sh.sym]; if (!ent || !ent.pts || ent.pts.length < 2) return;
  const pts = ent.pts.slice(); if (gY(sh.sym)) pts.push([now(), gY(sh.sym)]);
  drawTChart(cv, pts, { t0: now() - D, t1: now(), base: GP[sh.sym] && GP[sh.sym].base, fmt: v => v.toFixed(2) + '%', stepH: 6 });
}
function renderGBSheet(b, sh) {
  const c = GC[sh.sym], me = S.me, o = me && (me.gHold || {})[c.id], bp = gBp(c.id);
  if (sh.m !== 'fut') sh.m = 'buy';
  const v = o ? gLotVal(c.id, o) : 0, interest = o ? o.a * (o.y / 100) * Math.max(0, now() - o.at) / YEAR_MS : 0;
  b.innerHTML = `<div class="shead"><span class="logo-b gflag">${c.f}</span><div><h3>${esc(c.n)} 10년물</h3><small>${GREG[c.rg]} · 연 금리만큼 이자 · 원화 기준</small></div></div>
    <div class="bigp"><div class="p num" id="gLiveY">${gY(c.id) ? gY(c.id).toFixed(3) + '%' : '…'}</div><div class="c num"><span class="${bp > 0 ? 'down' : bp < 0 ? 'up' : 'flat'}" id="gLiveBp">오늘 ${bp > 0 ? '+' : ''}${bp.toFixed(1)}bp</span> <span class="dim">· 가격 <b id="gLiveP">${gPx(c.id).toFixed(2)}</b> (${pctTxt(gChg(c.id))})</span></div></div>
    <div class="chartbox"><canvas class="chart" id="gChart" aria-label="하루 금리 그래프"></canvas><i class="cpulse"></i></div>
    ${o ? `<div class="kline"><span>내 국채 <b class="num">${krw(v)}</b> · 산 금리 ${o.y.toFixed(2)}% · 이자 +${krw(interest)}</span><span><b class="num ${cls(v - o.a)}">${signKrw(v - o.a)}</b></span></div>` : ''}
    ${me && !S.readOnly ? `<div class="seg seg2">${[['buy', '현물 매수·매도'], ['fut', '금리 롱·숏']].map(([m, l]) => `<button type="button" data-km="${m}" aria-pressed="${m === 'fut' ? sh.m === 'fut' : sh.m !== 'fut'}">${l}</button>`).join('')}</div>
      ${sh.m === 'fut' ? `<p class="gfut-note">국채 <b>롱</b> = 금리가 <b>내리면</b> 이득 · <b>숏</b> = 금리가 <b>오르면</b> 이득</p>${fFormHTML(sh)}`
      : `<div class="qtyrow kamt"><input id="kAmt" type="number" inputmode="numeric" min="0" step="10000" value="${sh.all ? '' : sh.amt || ''}" placeholder="${sh.all ? '보유 전부' : '금액(원)'}" aria-label="금액"><span class="unit">원</span></div>
        ${spotQuickHTML(sh, o)}<div class="est est2" id="kEst"></div>
        <div class="pick2 bs2"><button class="cta buy" id="gBuyGo" type="button">매수하기</button><button class="cta sell" id="gSellGo" type="button">매도하기</button></div>`}` : ''}`;
  gLoadChart(c.id); requestAnimationFrame(gDrawChart); gUpdateEst();
}
const gBuyMax = () => Math.floor(((S.me || {}).cash || 0) / (1 + G_FEE));
function gUpdateEst() {
  const sh = S.sheet; if (!sh || sh.type !== 'gb') return;
  const i = $('#kAmt'); if (i && !sh.all) sh.amt = i.value;
  if (sh.m === 'fut') { fUpdateEst(sh); return; }
  const est = $('#kEst'), bb = $('#gBuyGo'), sb = $('#gSellGo'); if (!est || !bb) return;
  const amt = Math.floor(+sh.amt || 0), o = ((S.me || {}).gHold || {})[sh.sym], v = o ? gLotVal(sh.sym, o) : 0, y = gY(sh.sym);
  est.innerHTML = `<span>${sh.all ? '' : `살 때 연 <b class="num">${y.toFixed(2)}%</b> · 1년 이자 약 ${krw(amt * y / 100)}`}${o ? `${sh.all ? '' : '<br>'}팔 때 <b class="num">${krw((sh.all ? v : Math.min(v, amt)) * (1 - G_FEE))}</b>` : ''}</span><span class="num">현금 ${krw((S.me || {}).cash || 0)}${o ? `<br>보유 ${krw(v)}` : ''}</span>`;
  spotPctNow(gBuyMax() ? amt / gBuyMax() : 0, sh.all);
  const fresh = gFresh(sh.sym);
  bb.disabled = S.saving || !fresh || sh.all || amt < G_MIN || amt > gBuyMax();
  sb.textContent = sh.all ? '전부 매도하기' : '매도하기'; sb.disabled = S.saving || !fresh || !o || (!sh.all && amt < G_MIN);
}
function gLiveSheet() {
  const sh = S.sheet; if (!sh || sh.type !== 'gb') return; const bp = gBp(sh.sym);
  const a = $('#gLiveY'), b = $('#gLiveBp'), p = $('#gLiveP');
  if (a && gY(sh.sym)) flashText(a, gY(sh.sym).toFixed(3) + '%'); if (b) { b.textContent = `오늘 ${bp > 0 ? '+' : ''}${bp.toFixed(1)}bp`; b.className = bp > 0 ? 'down' : bp < 0 ? 'up' : 'flat'; } if (p) p.textContent = gPx(sh.sym).toFixed(2);
  gLoadChart(sh.sym); gDrawChart(); gUpdateEst();
}
KSHEETS.gb = renderGBSheet;
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('button, [data-gb]'); if (!t) return;
  if (t.dataset.gb) { if (!S.me) { if (!S.readOnly) openSheet('join'); return; } if (S.sheet) closeSheetRaw(); openSheet('gb', { sym: t.dataset.gb, m: 'buy' }); return; }
  if (t.dataset.greg) { S.gReg = t.dataset.greg; renderExchange(); return; }
  if (t.dataset.gbsub) { S.bondSub = t.dataset.gbsub; renderExchange(); return; }
  if (t.id === 'gBuyGo') gTrade('buy');
  if (t.id === 'gSellGo') gTrade('sell');
});
gFetch();
