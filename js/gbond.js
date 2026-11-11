'use strict';
/* ═════════ 🌍 나라별 10년물 국채 (채권 탭) ═════════
   시세: CNBC 10년물 금리(실시간). 국채 '가격'은 금리로 계산해요 — 금리가 오르면 가격이 내려요(듀레이션 8, 브라질 6).
     가격 지수 P = 100 − 듀레이션 × (지금 금리 − 기준 금리). 금리 0.1%p ↑ → 가격 약 0.8% ↓
   이자: 산 금리(연)만큼 시간에 따라 쌓여서 팔 때 같이 받아요. 원화 기준(환헤지)이라 환율은 안 들어가요.
   현물 매수·매도 수수료 0.05%, 롱·숏 2·5·10배(선물 엔진 공용, 칸 gFut). 보유는 지갑의 gHold {나라: {q 수량, a 원금, y 산 금리, at}}.
   ⚠️ 기준 금리(ref)와 듀레이션은 바꾸면 가진 사람 평가액이 바뀌어요. */
// 지역: us 미국 · eu 유럽 · as 동아시아(인도·호주 포함). 브라질(x)은 뺐어요 — 가진 사람은 지금 값으로 자동 환불, 시세 계산용으로만 남겨요
const GBX = [
  ['US10Y', '미국', '🇺🇸', 'us', 5.0, 8], ['BR10Y', '브라질', '🇧🇷', 'x', 15.23, 6], ['AU10Y', '호주', '🇦🇺', 'as', 5.045, 8],
  ['KR10Y', '한국', '🇰🇷', 'as', 3.952, 8], ['JP10Y', '일본', '🇯🇵', 'as', 2.795, 8], ['CN10Y', '중국', '🇨🇳', 'as', 1.614, 8], ['IN10Y', '인도', '🇮🇳', 'as', 7.214, 8],
  ['GB10Y', '영국', '🇬🇧', 'eu', 5.2, 8], ['FR10Y', '프랑스', '🇫🇷', 'eu', 4.767, 8], ['DE10Y', '독일', '🇩🇪', 'eu', 3.307, 8], ['IT10Y', '이탈리아', '🇮🇹', 'eu', 4.348, 8],
];
const GC = {}; GBX.forEach(([id, n, f, rg, ref, dur]) => { GC[id] = { id, a: id.slice(0, 2), n: n + ' 국채', cn: n, f, rg, ref, dur }; });
const GREG = { us: '🇺🇸 미국', eu: '🇪🇺 유럽', as: '🌏 동아시아' };
const gShown = () => Object.values(GC).filter(c => GREG[c.rg]);
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
function gTick() { if (Date.now() - G_POLL > 15000) { G_POLL = Date.now(); gFetch(); } gRefund(); }
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
/* ───────── 화면: 세계 지도 (지역 누르면 확대) + 목록 ───────── */
// 나라 1등: 그 나라 국채(현물 원금 + 롱·숏 증거금)를 가장 많이 넣은 사람. 같으면 먼저 산 사람. 서울 구청장처럼 지도에 프로필이 찍혀요
function gTop() {
  const top = {};
  for (const c of gShown()) { let best = null;
    for (const [uid, p] of Object.entries(S.players)) { if (!p || !p.name) continue;
      const h = (p.gHold || {})[c.id], f = (p.gFut || {})[c.id], a = (h ? h.a : 0) + (f ? f.m : 0); if (!(a > 0)) continue;
      const at = Math.min(h ? h.at : Infinity, f ? f.at : Infinity);
      if (!best || a > best.a || (a === best.a && at < best.at)) best = { id: uid, a, at }; }
    if (best) top[c.id] = best; }
  return top;
}
// 지도 좌표: 경도·위도를 1도=2칸으로 (x=(경도+180)×2, y=(90−위도)×2)
const GPOS = { US10Y: [164, 102], KR10Y: [612, 104], JP10Y: [652, 120], CN10Y: [564, 110], IN10Y: [516, 138], AU10Y: [628, 232], GB10Y: [356, 74], FR10Y: [365, 88], DE10Y: [382, 77], IT10Y: [388, 92] };
const GVB = { w: [0, 2, 720, 327], us: [94, 66, 140, 64], eu: [312, 52, 120, 55], as: [405, 74, 386, 175] };   // 가로:세로 2.2
const GPF = { w: .55, us: 1.3, eu: 1, as: .85 };   // 핀 크기 배율
const GCHIP = { us: [160, 76], eu: [372, 50], as: [604, 86] };   // 전체 지도에서 지역 이름표 자리
const GZ = { vb: GVB.w.slice(), f: GPF.w, raf: 0 };
const gZoomKey = () => (GREG[S.gZoom] ? S.gZoom : 'w');
function gPinK() { return GZ.vb[2] / 400 * GZ.f; }
function gWorldSVG(home) {
  const top = gTop(), z = home ? 'w' : gZoomKey(), vb = home ? GVB.w : GZ.vb, k = home ? GVB.w[2] / 400 * GPF.w : gPinK(), me = S.me || {};
  const cs = gShown().map(c => { const t = top[c.id], u = t && t.id;
    return `<path d="${WMAP_C[c.id] || ''}" class="wc${(me.gHold || {})[c.id] || (me.gFut || {})[c.id] ? ' mine' : ''}" data-gpin="${c.id}"${u ? ` style="fill:${chiefColor(u)};fill-opacity:${u === S.uid ? .6 : .45}"` : ''}/>`; }).join('');
  const pins = home || z === 'w' ? '' : gShown().filter(c => c.rg === z).map(c => { const [x, y] = GPOS[c.id], t = top[c.id], bp = gBp(c.id);
    return `<g class="gpin" data-gpin="${c.id}" data-x="${x}" data-y="${y}" transform="translate(${x},${y}) scale(${k})">${t ? `<g transform="scale(1.3)">${stampInner(t.id, 'gst' + c.id)}</g>` : `<circle r="19" class="gp-c ${bp > 0 ? 'up' : bp < 0 ? 'down' : ''}"/><text y="6" class="gp-f">${c.f}</text>`}
      <g transform="translate(0,32)"><rect x="-26" y="-10" width="52" height="20" rx="10" class="gp-l"/><text y="4" class="gp-t">${gY(c.id) ? gY(c.id).toFixed(2) + '%' : '…'}</text></g></g>`; }).join('');
  const chips = z === 'w' ? Object.entries(GREG).map(([rg, l]) => { const [x, y] = GCHIP[rg], n = gShown().filter(c => c.rg === rg && top[c.id]).length;
    return `<g class="gchip" data-gzoom="${rg}" transform="translate(${x},${y}) scale(${GVB.w[2] / 400})"><rect x="-44" y="-13" width="88" height="26" rx="13"/><text y="5">${l} ›</text>${n ? `<circle cx="42" cy="-11" r="8" class="gc-n"/><text x="42" y="-7.5" class="gc-nt">${n}</text>` : ''}</g>`; }).join('') : '';
  return `<svg viewBox="${vb.join(' ')}" class="wmap${z === 'w' ? '' : ' zoomed'}" id="${home ? 'gmapH' : 'gmapW'}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="세계 국채 지도"><path d="${WMAP_LAND}" class="wl"/>${cs}${pins}${chips}</svg>`;
}
// 홈 지도 아래: 나라별 1등 목록 (누르면 그 지역으로 확대)
function gTopsHTML(top) {
  return `<div class="gtops">${gShown().map(c => { const t = top[c.id];
    return `<button type="button" data-gpin="${c.id}"><span>${c.f}</span><b>${esc(c.cn)}</b><small>${t ? `👑 ${esc(t.id === S.uid ? '나' : nameOf(t.id))}` : '비어 있음'}</small></button>`; }).join('')}</div>`;
}
// 확대·축소: viewBox를 0.55초 동안 부드럽게 옮겨요 (그사이 화면이 다시 그려져도 이어서 움직여요)
function gZoomTo(rg) {
  S.gZoom = GREG[rg] ? rg : null; const to = GVB[gZoomKey()], tf = GPF[gZoomKey()], from = GZ.vb.slice(), f0 = GZ.f, t0 = performance.now();
  cancelAnimationFrame(GZ.raf); renderExchange();
  const step = t => { const u = Math.min(1, (t - t0) / 550), e = 1 - Math.pow(1 - u, 3);
    GZ.vb = from.map((v, i) => v + (to[i] - v) * e); GZ.f = f0 + (tf - f0) * e;
    const sv = $('#gmapW'); if (sv) { sv.setAttribute('viewBox', GZ.vb.join(' ')); const k = gPinK(); sv.querySelectorAll('.gpin').forEach(p => p.setAttribute('transform', `translate(${p.dataset.x},${p.dataset.y}) scale(${k})`)); }
    if (u < 1) GZ.raf = requestAnimationFrame(step); };
  GZ.raf = requestAnimationFrame(step);
}
function worldHTML() {
  const z = gZoomKey(), top = gTop(), me = S.me || {}, list = gShown().filter(c => z === 'w' || c.rg === z);
  const mineTop = Object.entries(top).filter(([, t]) => t.id === S.uid).map(([id]) => GC[id].f);
  return `<div class="greg"><button type="button" data-gzoom="w" aria-pressed="${z === 'w'}">🌍 전체</button>${Object.entries(GREG).map(([k, l]) => `<button type="button" data-gzoom="${k}" aria-pressed="${z === k}">${l}</button>`).join('')}</div>
    <div class="card gmapbox">${gWorldSVG()}${z !== 'w' ? `<button type="button" class="gm-back" data-gzoom="w">‹ 전체</button>` : `<small class="gm-note">지역을 누르면 확대돼요${mineTop.length ? ` · 👑 ${mineTop.join('')}` : ''}</small>`}</div>
    ${list.map(c => { const bp = gBp(c.id), o = (me.gHold || {})[c.id], v = o ? gLotVal(c.id, o) : 0, t = top[c.id];
      return `<div class="srow"><button class="srow-main" type="button" data-gb="${c.id}"><span class="logo-b gflag">${c.f}</span><span class="sname"><b>${esc(c.n)}</b><small>${o ? `<span class="mine">${krw(v)}</span> <b class="rowpnl ${cls(v - o.a)}">${signKrw(v - o.a)}</b>` : t ? `👑 ${esc(t.id === S.uid ? '나' : nameOf(t.id))} ${krw(t.a)}` : `10년물 · 가격 ${gPx(c.id) ? gPx(c.id).toFixed(2) : '…'}`}</small></span>
        <span class="sprice"><div class="p num">${gY(c.id) ? gY(c.id).toFixed(3) + '%' : '…'}</div><div class="c num ${bp > 0 ? 'down' : bp < 0 ? 'up' : 'flat'}">${bp > 0 ? '+' : ''}${bp.toFixed(1)}bp</div></span></button>
        <span class="tbtns"><button class="tb trade${o || (me.gFut || {})[c.id] ? ' lit' : ''}" type="button" data-gb="${c.id}">거래</button></span></div>`; }).join('')}
    <p class="gnote">나라마다 국채를 가장 많이 넣은 사람의 프로필이 지도에 찍혀요. 금리가 오르면(빨간 bp) 국채 가격은 내려요. 산 금리만큼 이자가 쌓여요.</p>`;
}
/* ───────── 서울 구채·브라질 국채 정리: 지금 값으로 한 번 환불 ─────────
   구채는 장당 지금 시세(다음 1장 가격, 수수료 없음), 브라질은 지금 평가액(이자 포함, 롱·숏은 지금 남은 증거금)으로 원화를 돌려줘요.
   환불한 구채 장수는 bondsRef에 남겨서, 나중에 환불받는 사람도 같은 시세(팔린 장수)로 계산돼요. */
async function gRefund() {
  const m0 = S.me; if (!m0 || !S.loaded || S.saving || S.readOnly || m0.refundAt) return;
  const bs = Object.entries(m0.bonds || {}).filter(([g, n]) => BOND[g] && n > 0), br = (m0.gHold || {}).BR10Y, bf = (m0.gFut || {}).BR10Y;
  const me = clone(m0); me.refundAt = now();
  if (!bs.length && !br && !bf) { await kSave(me, m0); return; }
  if ((br || bf) && !gFresh('BR10Y')) return;   // 브라질 시세 받을 때까지 기다려요
  let seoul = 0, brz = 0;
  bs.forEach(([g, n]) => { seoul += n * bondUnit(g, bondSold(g)); });
  if (br) brz += gLotVal('BR10Y', br);
  if (bf) brz += fVal(bf, fPx('BR10Y') || bf.e);
  me.bondsRef = { ...(m0.bonds || {}) }; me.bonds = {}; me.bCost = {}; me.bAt = {};
  if (me.gHold) delete me.gHold.BR10Y; if (me.gFut) delete me.gFut.BR10Y;
  const amt = Math.round(seoul + brz); me.cash = Math.round(me.cash + amt);
  if (!(await kSave(me, m0))) return;
  addFeed({ kind: 'k_refund', amt, n: bs.reduce((a, [, n]) => a + n, 0), br: brz ? 1 : 0 });
  toast(`🏛️ ${seoul ? `서울 구채 ${bs.reduce((a, [, n]) => a + n, 0)}장` : ''}${seoul && brz ? ' · ' : ''}${brz ? '브라질 국채' : ''}를 없애면서 지금 값 ${krw(amt)}을(를) 원화로 돌려드렸어요`); buzz(40); renderAll();
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
  const z = e.target.closest && e.target.closest('[data-gzoom]');
  if (z) { if (S.tab !== 'coin' || S.xMkt !== 'bond') { S.xMkt = 'bond'; goTab('coin'); renderExchange(true); } gZoomTo(z.dataset.gzoom); return; }
  const pn = e.target.closest && e.target.closest('[data-gpin]');
  if (pn) { const c = GC[pn.dataset.gpin]; if (!c) return; if ($('#gmapH') && pn.closest('#gmapH') || gZoomKey() !== c.rg) { if (S.tab !== 'coin' || S.xMkt !== 'bond') { S.xMkt = 'bond'; goTab('coin'); renderExchange(true); } gZoomTo(c.rg); return; }
    if (!S.me) { if (!S.readOnly) openSheet('join'); return; } openSheet('gb', { sym: c.id, m: 'buy' }); return; }
  const t = e.target.closest && e.target.closest('button, [data-gb]'); if (!t) return;
  if (t.dataset.gb) { if (!S.me) { if (!S.readOnly) openSheet('join'); return; } if (S.sheet) closeSheetRaw(); openSheet('gb', { sym: t.dataset.gb, m: 'buy' }); return; }
  if (t.id === 'gBuyGo') gTrade('buy');
  if (t.id === 'gSellGo') gTrade('sell');
});
gFetch();
