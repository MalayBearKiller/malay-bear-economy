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
function chiefColor(uid) { return uid === S.uid ? '#1f6feb' : avaColor(uid); }
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
  if (sh.qmode) gQtyToAmt(sh);
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
    sh.amt = ''; sh.qty = ''; sh.all = false; renderAll(); renderSheet(); return;
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
const GPOS = { US10Y: [164, 102], KR10Y: [612, 104], JP10Y: [652, 120], CN10Y: [564, 110], IN10Y: [516, 138], AU10Y: [624, 192], GB10Y: [356, 74], FR10Y: [365, 88], DE10Y: [382, 77], IT10Y: [388, 92] };
const GLBL_UP = { AU10Y: 1 };   // 이름표를 핀 위에 (아래가 잘려서)
// 거래소: 지역마다 확대한 지도를 좌우로 넘겨요 (가로:세로 3, 확대 비율은 그대로)
const GRG = ['us', 'eu', 'as'];
const GVB = { w: [0, 2, 720, 327], us: [94, 76, 140, 47], eu: [312, 67, 120, 40], as: [405, 85, 386, 129] };
const GPF = { us: 1.3, eu: 1, as: .85 };   // 핀 크기 배율
const gReg = () => (GREG[S.gZoom] ? S.gZoom : 'us');
function gRegionSVG(rg, top) {
  const vb = GVB[rg], k = vb[2] / 400 * GPF[rg], me = S.me || {};
  const cs = gShown().map(c => { const t = top[c.id], u = t && t.id;
    return `<path d="${WMAP_C[c.id] || ''}" class="wc${(me.gHold || {})[c.id] || (me.gFut || {})[c.id] ? ' mine' : ''}" data-gpin="${c.id}"${u ? ` style="fill:${chiefColor(u)};fill-opacity:${u === S.uid ? .6 : .45}"` : ''}/>`; }).join('');
  const pins = gShown().filter(c => c.rg === rg).map(c => { const [x, y] = GPOS[c.id], t = top[c.id], bp = gBp(c.id), ly = GLBL_UP[c.id] ? -32 : 32;
    return `<g class="gpin" data-gpin="${c.id}" transform="translate(${x},${y}) scale(${k})">${t ? `<g transform="scale(1.3)">${stampInner(t.id, 'gs' + rg + c.id)}</g>` : `<circle r="19" class="gp-c ${bp > 0 ? 'up' : bp < 0 ? 'down' : ''}"/><text y="6" class="gp-f">${c.f}</text>`}
      <g transform="translate(0,${ly})"><rect x="-26" y="-10" width="52" height="20" rx="10" class="gp-l"/><text y="4" class="gp-t">${gY(c.id) ? gY(c.id).toFixed(2) + '%' : '…'}</text></g></g>`; }).join('');
  return `<svg viewBox="${vb.join(' ')}" class="wmap rg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${GREG[rg]} 국채 지도"><path d="${WMAP_LAND}" class="wl"/>${cs}${pins}</svg>`;
}
function gCarHTML() {
  const top = gTop();
  return `<div class="card gmapbox gcarbox"><div class="gcar" id="gCar">${GRG.map(rg => `<div class="gslide">${gRegionSVG(rg, top)}<span class="gs-t">${GREG[rg]}</span></div>`).join('')}</div>
    <div class="gdots">${GRG.map(rg => `<i class="${rg === gReg() ? 'on' : ''}"></i>`).join('')}</div></div>`;
}
// 다시 그려도 보던 지역에 그대로 (그리기 직후, 화면에 보이기 전에 위치를 맞춰요)
function gCarFix() { const el = $('#gCar'); if (el && el.clientWidth) { el.style.scrollBehavior = 'auto'; el.scrollLeft = GRG.indexOf(gReg()) * el.clientWidth; el.style.scrollBehavior = ''; } }
let G_SCR = 0;
document.addEventListener('scroll', e => {
  const el = e.target; if (!el || el.id !== 'gCar') return;
  clearTimeout(G_SCR); G_SCR = setTimeout(() => { const rg = GRG[Math.round(el.scrollLeft / el.clientWidth)]; if (rg && rg !== S.gZoom) { S.gZoom = rg; renderExchange(); } }, 140);
}, true);
// 홈: 깔끔한 세계 지도(1등 있는 나라만 색칠 + 작은 프로필) + 아래에 왕 배너
function gHomeHTML() {
  const top = gTop(), vb = GVB.w, k = vb[2] / 400 * .85;
  const cs = gShown().map(c => { const t = top[c.id]; return t ? `<path d="${WMAP_C[c.id] || ''}" class="wc on" style="fill:${chiefColor(t.id)}"/>` : `<path d="${WMAP_C[c.id] || ''}" class="wl"/>`; }).join('');
  const st = gShown().filter(c => top[c.id]).map(c => { const [x, y] = GPOS[c.id]; return `<g transform="translate(${x},${y}) scale(${k})">${stampInner(top[c.id].id, 'gh' + c.id)}</g>`; }).join('');
  const kings = {}; Object.entries(top).forEach(([id, t]) => { (kings[t.id] ||= { a: 0, c: [] }); kings[t.id].a += t.a; kings[t.id].c.push(GC[id]); });
  const ks = Object.entries(kings).sort((a, b) => b[1].c.length - a[1].c.length || b[1].a - a[1].a);
  return `<div class="card gmapbox homemap" data-gocar="1"><svg viewBox="${vb.join(' ')}" class="wmap" preserveAspectRatio="xMidYMid meet" role="img" aria-label="세계 국채 지도"><path d="${WMAP_LAND}" class="wl"/>${cs}${st}</svg>
    ${ks.length ? `<div class="gkings">${ks.slice(0, 4).map(([uid, o]) => { const p = S.players[uid] || {};
      return `<button type="button" class="gking${uid === S.uid ? ' me' : ''}" data-gpin="${o.c[0].id}" style="--kc:${chiefColor(uid)}"><span class="gk-a">${ava(p)}</span><span class="gk-t"><b>👑 ${esc(uid === S.uid ? '나' : p.name || '?')}</b><small>${o.c.map(c => c.f + ' ' + esc(c.cn)).join(' · ')}</small></span><span class="gk-v num">${krw(o.a)}</span></button>`; }).join('')}</div>`
      : `<p class="gk-none">아직 국채 왕이 없어요. 거래소 › 채권에서 첫 번째 왕이 되어 보세요.</p>`}</div>`;
}
function worldHTML() {
  const z = gReg(), top = gTop(), me = S.me || {}, list = gShown().filter(c => c.rg === z);
  requestAnimationFrame(gCarFix);
  return `<div class="greg">${GRG.map(k => `<button type="button" data-gzoom="${k}" aria-pressed="${z === k}">${GREG[k]}</button>`).join('')}</div>
    ${gCarHTML()}
    ${list.map(c => { const bp = gBp(c.id), o = (me.gHold || {})[c.id], v = o ? gLotVal(c.id, o) : 0, t = top[c.id];
      return `<div class="srow"><button class="srow-main" type="button" data-gb="${c.id}"><span class="logo-b gflag">${c.f}</span><span class="sname"><b>${esc(c.n)}</b><small>${o ? `<span class="mine">${krw(v)}</span> <b class="rowpnl ${cls(v - o.a)}">${signKrw(v - o.a)}</b>` : t ? `👑 ${esc(t.id === S.uid ? '나' : nameOf(t.id))} ${krw(t.a)}` : `10년물 · 가격 ${gPx(c.id) ? gPx(c.id).toFixed(2) : '…'}`}</small></span>
        <span class="sprice"><div class="p num">${gY(c.id) ? gY(c.id).toFixed(3) + '%' : '…'}</div><div class="c num ${bp > 0 ? 'down' : bp < 0 ? 'up' : 'flat'}">${bp > 0 ? '+' : ''}${bp.toFixed(1)}bp</div></span></button>
        <span class="tbtns"><button class="tb trade${o || (me.gFut || {})[c.id] ? ' lit' : ''}" type="button" data-gb="${c.id}">거래</button></span></div>`; }).join('')}
    <p class="gnote">지도를 좌우로 넘기면 다른 지역이에요. 나라마다 국채를 가장 많이 넣은 사람의 프로필이 찍혀요. 금리가 오르면(빨간 bp) 국채 가격은 내려요.</p>`;
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
  bs.forEach(([g, n]) => { seoul += bondRefundOf(g, n); });   // 지금 다 팔면 받는 돈(수수료 없음)
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
      : `${spotQtyHTML(sh, o)}<div class="est est2" id="kEst"></div>
        <div class="pick2 bs2"><button class="cta buy" id="gBuyGo" type="button">매수하기</button><button class="cta sell" id="gSellGo" type="button">매도하기</button></div>`}` : ''}`;
  gLoadChart(c.id); requestAnimationFrame(gDrawChart); gUpdateEst();
}
// 국채 개수(장) → 원화 금액: 1장 = 지금 가격지수 × 1만원
function gQtyToAmt(sh) { const q = spotQtyRead(sh); sh.amt = String(Math.floor(q * gPx(sh.sym) * G_UNIT)); }
const gBuyMax = () => Math.floor(((S.me || {}).cash || 0) / (1 + G_FEE));
function gUpdateEst() {
  const sh = S.sheet; if (!sh || sh.type !== 'gb') return;
  const i = $('#kAmt'); if (i && !sh.all) sh.amt = i.value;
  if (sh.m === 'fut') { fUpdateEst(sh); return; }
  if (sh.qmode) gQtyToAmt(sh);
  const est = $('#kEst'), bb = $('#gBuyGo'), sb = $('#gSellGo'); if (!est || !bb) return;
  const amt = Math.floor(+sh.amt || 0), o = ((S.me || {}).gHold || {})[sh.sym], v = o ? gLotVal(sh.sym, o) : 0, y = gY(sh.sym);
  est.innerHTML = `<span>${sh.all ? '' : `필요 금액 <b class="num">${krw(amt * (1 + G_FEE))}</b><br>연 ${y.toFixed(2)}% · 1년 이자 약 ${krw(amt * y / 100)}`}${o ? `${sh.all ? '' : '<br>'}팔 때 <b class="num">${krw((sh.all ? v : Math.min(v, amt)) * (1 - G_FEE))}</b>` : ''}</span><span class="num">현금 ${krw((S.me || {}).cash || 0)}${o ? `<br>보유 ${(+(v / (gPx(sh.sym) * G_UNIT)).toFixed(2)).toLocaleString('ko-KR')}장` : ''}</span>`;
  { const mq = spotQ(sh).maxQ; spotPctNow(mq ? (+sh.qty || 0) / mq : 0, sh.all); }
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
  const goBond = rg => { S.gZoom = rg; if (S.tab !== 'coin' || S.xMkt !== 'bond') { S.xMkt = 'bond'; goTab('coin'); renderExchange(true); } };
  const z = e.target.closest && e.target.closest('[data-gzoom]');
  if (z) { const el = $('#gCar'), i = GRG.indexOf(z.dataset.gzoom); if (el && i >= 0) { const rg = z.dataset.gzoom; el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }); setTimeout(() => { if (S.gZoom !== rg && gReg() !== rg) { S.gZoom = rg; renderExchange(); } }, 700); } else goBond(z.dataset.gzoom); return; }
  const pn = e.target.closest && e.target.closest('[data-gpin]');
  if (pn) { const c = GC[pn.dataset.gpin]; if (!c) return; if (!pn.closest('#gCar')) { goBond(c.rg); return; }
    if (!S.me) { if (!S.readOnly) openSheet('join'); return; } openSheet('gb', { sym: c.id, m: 'buy' }); return; }
  const hm = e.target.closest && e.target.closest('[data-gocar]'); if (hm) { goBond(gReg()); return; }
  const t = e.target.closest && e.target.closest('button, [data-gb]'); if (!t) return;
  if (t.dataset.gb) { if (!S.me) { if (!S.readOnly) openSheet('join'); return; } if (S.sheet) closeSheetRaw(); openSheet('gb', { sym: t.dataset.gb, m: 'buy' }); return; }
  if (t.id === 'gBuyGo') gTrade('buy');
  if (t.id === 'gSellGo') gTrade('sell');
});
gFetch();
