'use strict';
/* ═════════ 🎢 게임 가격 엔진 (2026-11-12 리워크) ═════════
   게임 가격 = 진짜 시세 × 배율.  배율 = exp( 현실 증폭 + 빠른 물결 + 10분 물결 + 2시간 물결 + 급등·급락 이벤트 ), 0.6~1.6배로 고정
   · 현실 증폭: 진짜 시세의 하루 등락을 k배로 (코인 3배, 주식 4배). 기준가가 바뀌는 시각(자정 등) 앞뒤 30분은 0으로 서서히 → 가격이 안 튀어요
   · 물결·이벤트: 종목 + 시각(분) + '5분 전 비트코인 1분봉 종가(CNBC)'로 정해지는 난수 → 모든 폰에서 똑같고, 미래는 아무도 몰라요
   · 이벤트: 종목마다 평균 25분에 한 번. 2~6분 동안 치솟거나 꽂히고, 그 뒤는 ① 원래대로 ② 일부 남음 ③ 한 번 더 폭주 중 하나
   ⚠️ 시드 문자열('gm1')과 계수는 한 번 정하면 바꾸지 마세요. 바꾸면 지난 가격이 전부 다시 계산돼서 평단·포지션이 망가져요.
   적용: 코인·미국 주식·원자재. 원/달러 환율과 국채는 진짜 그대로예요. */
const GM = { E: {}, lastE: 0, ready: false, loading: false, poll: 0, cache: {}, mc: {} };
const MIN = 60e3;
// 문자열 → 0~1 난수 (FNV-1a + 섞기)
function gmHash(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const gmE = m => { const v = GM.E[m - 5]; return v == null ? 'x' : v; };   // 5분 전 비트코인 1분봉 종가 (늦게 받아도 모두 같은 값이 되게 넉넉히)
const gmR = (sym, tag, m) => gmHash(`gm1|${sym}|${tag}|${m}|${gmE(m)}`);
const gmSm = p => p * p * (3 - 2 * p);

// 종목 등급별 세기
const GM_HOT = new Set(['US_TQQQ', 'US_SQQQ', 'US_SOXL', 'US_SOXS', 'US_GME', 'US_MSTR', 'US_RGTI', 'US_QBTS', 'US_QUBT', 'US_LCID']);
function gmCls(sym) {
  if (KC[sym]) { const meme = KC[sym].c === 'meme', maj = KC[sym].c === 'major';
    return { k: 3, a: meme ? 1.25 : maj ? 1 : 1.15, p: meme ? 1 / 22 : 1 / 28, e0: meme ? .05 : .04, e1: meme ? .16 : .12 }; }
  const c = UC[sym]; if (!c) return null;
  if (c.m === 'cm') return { k: 4, a: .7, p: 1 / 40, e0: .03, e1: .09 };
  if (GM_HOT.has(sym)) return { k: 4, a: 1.5, p: 1 / 20, e0: .06, e1: .2 };
  if (c.c === 'etf') return { k: 4, a: .8, p: 1 / 35, e0: .03, e1: .09 };
  return { k: 4, a: 1, p: 1 / 28, e0: .04, e1: .12 };
}
const GM_A = [0.003, 0.014, 0.035];   // 빠른(1분) · 10분 · 2시간 물결 크기(로그)

// 10분·2시간 물결: 분마다 난수를 넣는 AR(1). 분 단위 값을 모아 두고, 그 사이는 직선으로 이어요
const GM_RHO = [Math.exp(-1 / 10), Math.exp(-1 / 120)];
function gmAR(sym, m) {
  let c = GM.cache[sym]; if (!c) c = GM.cache[sym] = { m0: 0, y: [] };
  if (!c.m0 || m < c.m0) { c.m0 = m - 720; c.y = [[0, 0]]; }
  // 비트코인 종가를 아직 못 받은 분은 저장하지 않고 그때그때 계산해요 (나중에 받으면 모두와 같은 값으로 맞춰져요)
  const step = (prev, mm) => GM_RHO.map((r, j) => r * prev[j] + Math.sqrt(1 - r * r) * Math.sqrt(3) * (gmR(sym, j ? 'b' : 'a', mm) * 2 - 1));
  const safe = Math.min(m, GM.lastE + 5) - c.m0;
  for (let i = c.y.length; i <= safe; i++) c.y[i] = step(c.y[i - 1], c.m0 + i);
  let y = c.y[Math.min(m - c.m0, c.y.length - 1)];
  for (let mm = c.m0 + c.y.length; mm <= m; mm++) y = step(y, mm);
  return y;
}
// 이벤트 모양: τ분 지난 시점의 크기(로그). 시작 분 j의 난수로 방향·크기·모양이 정해져요
function gmEvShape(sym, j, tau, P) {
  const r = n => gmR(sym, 'v' + n, j), dir = r(1) < .5 ? 1 : -1, mag = dir * (P.e0 + (P.e1 - P.e0) * r(2));
  const rise = 2 + 4 * r(3), mode = r(4), fall = 8 + 14 * r(5), keep = .3 + .3 * r(6), mult2 = 1.3 + .4 * r(7), slow = 60;
  if (tau < 0) return 0;
  if (tau < rise) return mag * gmSm(tau / rise);
  const u = tau - rise;
  if (mode < .4) return u < fall ? mag * (1 - gmSm(u / fall)) : 0;                                   // ① 원래대로
  if (mode < .6) { const lv = u < fall ? mag * (1 - (1 - keep) * gmSm(u / fall)) : mag * keep * Math.exp(-(u - fall) / slow); return lv; }   // ② 일부 남음
  const dip = 3, up2 = 2 + 2 * r(8);                                                                  // ③ 한 번 더 폭주
  if (u < dip) return mag * (1 - .5 * gmSm(u / dip));
  if (u < dip + up2) return mag * (.5 + (mult2 - .5) * gmSm((u - dip) / up2));
  const v = u - dip - up2; return v < fall ? mag * mult2 * (1 - gmSm(v / fall)) : 0;
}
const GM_EV_BACK = 300;   // 이벤트는 최대 5시간 뒤까지 영향(② 꼬리)
function gmEvents(sym, m, P) {
  const c = GM.cache[sym] || (GM.cache[sym] = { m0: 0, y: [] }); c.ev ||= {};
  const out = [];
  for (let j = m - GM_EV_BACK; j <= m + 1; j++) {
    let e = c.ev[j]; if (e === undefined) { e = gmR(sym, 'v0', j) < P.p ? 1 : 0; if (j <= GM.lastE + 5) c.ev[j] = e; }
    if (e) out.push(j);
  }
  return out;
}
// 현실 증폭이 0이 되는 시각(기준가가 바뀌는 때) 앞뒤 30분은 서서히
function gmFade(sym, t) {
  const near = list => Math.min(...list.map(x => Math.abs(x))), dayMin = (t % D) / MIN;
  if (KC[sym]) return Math.min(1, near([dayMin, dayMin - 1440]) / 30);   // 업비트 기준가: 09:00 KST = 00:00 UTC
  const et = gmEtMin(t), marks = [240, 570, 960, 1080, 1200];             // 미국 동부 04:00 · 09:30 · 16:00 · 18:00 · 20:00
  return Math.min(1, near(marks.flatMap(x => [et - x, et - x - 1440, et - x + 1440])) / 30);
}
const GM_ET = {};
function gmEtMin(t) { const k = Math.floor(t / MIN); if (GM_ET[k] != null) return GM_ET[k] + 0; const d = new Date(k * MIN), p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit' }).formatToParts(d);
  const g = n => +(p.find(x => x.type === n) || {}).value || 0; return (GM_ET[k] = (g('hour') % 24) * 60 + g('minute')); }
// 배율 (t 시각, chg = 그 시각 진짜 하루 등락률)
// 물결 + 이벤트 (로그 배율, 현실 증폭·서킷 제외)
function gmL0(sym, t, P) {
  const m = Math.floor(t / MIN), f = (t - m * MIN) / MIN;
  const fast = gmR(sym, 'f', m) * 2 - 1, fast2 = gmR(sym, 'f', m + 1) * 2 - 1, F = fast + (fast2 - fast) * gmSm(f);
  const y0 = gmAR(sym, m), y1 = gmAR(sym, m + 1), Y = [0, 1].map(j => y0[j] + (y1[j] - y0[j]) * f);
  let ev = 0; const tm = m + f; gmEvents(sym, m, P).forEach(j => { ev += gmEvShape(sym, j, tm - j, P); });
  return P.a * (GM_A[0] * F + GM_A[1] * Y[0] + GM_A[2] * Y[1]) + ev;
}
const gmA = (sym, t, chg, P) => Math.max(-.25, Math.min(.25, (P.k - 1) * Math.log(1 + (chg || 0)))) * gmFade(sym, t);

/* ───────── ⚡ 서킷: 하루 +11% 넘게 오른 종목은 매분 확률로 -15% 급락, -11% 넘게 내린 종목은 +15% 급등 ─────────
   확률: 11%일 때 1% → 30% 이상이면 20% (사이는 직선). 급락·급등은 1분 만에 오고, 5분 버틴 뒤 1시간에 걸쳐 원래대로 풀려요.
   결정은 그 분이 시작할 때의 게임 등락률로 한 번만(종목·분 시드 난수). 거래 정지는 없어요. */
const CB = { HOLD: 5, FADE: 60, DN: Math.log(.85), UP: Math.log(1.15), boot: Date.now() };
const cbProb = g => { const a = Math.abs(g); return a < .11 ? 0 : .01 + .19 * Math.min(1, (a - .11) / .19); };
function cbShape(v, tau) { if (tau < 0) return 0; if (tau < 1) return v * gmSm(tau); if (tau < 1 + CB.HOLD) return v; const u = tau - 1 - CB.HOLD; return u < CB.FADE ? v * (1 - u / CB.FADE) : 0; }
const CB_BACK = 1 + CB.HOLD + CB.FADE;
// 서킷이 터진 분들 (j → +1 급등 / -1 급락)
function cbList(sym, m, chg, P) {
  const c = GM.cache[sym] || (GM.cache[sym] = { m0: 0, y: [] }); c.cb ||= {};
  const out = [];
  for (let j = m - CB_BACK; j <= m; j++) {
    let d = c.cb[j];
    if (d === undefined) {
      let L = gmA(sym, j * MIN, chg, P) + gmL0(sym, j * MIN, P);
      out.forEach(([i, di]) => { L += cbShape(di > 0 ? CB.UP : CB.DN, j - i); });
      const g = (1 + (chg || 0)) * Math.exp(L) - 1, pr = cbProb(g);
      d = pr && gmR(sym, 'cb', j) < pr ? (g > 0 ? -1 : 1) : 0;
      if (j <= GM.lastE + 5) c.cb[j] = d;
      if (d && j * MIN >= CB.boot && Math.abs(j - Math.floor(now() / MIN)) <= 1) cbAlert(sym, d);   // 지금 막 터진 것만 알림
    }
    if (d) out.push([j, d]);
  }
  return out;
}
const CB_SEEN = {};
function cbAlert(sym, d) {
  const k = sym + d + Math.floor(now() / MIN); if (CB_SEEN[k]) return; CB_SEEN[k] = 1;
  const a = KC[sym] || UC[sym]; if (!a || typeof EVQ === 'undefined') return;
  EVQ.q.push({ f: { kind: 'k_cb' }, t: d < 0 ? ['down', '💥', `<b>${esc(a.n)}</b> 과열! 갑자기 <b class="down">-15% 폭락</b>`] : ['up', '🚀', `<b>${esc(a.n)}</b> 바닥 찍고 <b class="up">+15% 폭등</b>`] });
  if (EVQ.q.length > 6) EVQ.q.splice(0, EVQ.q.length - 6); evNext(); buzz(60);
}
/* ───────── 💥 고배율 털기 충격: 고배율 롱·숏이 수익 +2%를 넘으면, 그 사람 앱이 1초마다 확률로 '가격 충격'을 기록(k_shock)해요 ─────────
   기록을 받은 모든 폰에서 그 종목 가격이 그 포지션 반대 방향으로 3초 만에 꽂혀요 → 고배율은 당연히 청산, 같은 방향 들고 있던 사람도 같이 맞아요.
   크기: 50배 이상 25% · 25배 15% · 10배 5%. 2분 버틴 뒤 30분에 걸쳐 원래대로. 같은 종목은 1분에 1번만. */
const SHOCK = { HOLD: 2, FADE: 30, GAP: 60e3, RISE: 3 / 60 };
let SHK_SRC = null, SHK_LEN = -1, SHK = {};
function shockMap() {
  const f = S.feed || []; if (f === SHK_SRC && f.length === SHK_LEN) return SHK; SHK_SRC = f; SHK_LEN = f.length; SHK = {};
  const last = {}; f.filter(e => e && e.kind === 'k_shock' && e.sym && e.mag).sort((a, b) => a.ts - b.ts).forEach(e => { if (last[e.sym] && e.ts - last[e.sym] < SHOCK.GAP) return; last[e.sym] = e.ts; (SHK[e.sym] ||= []).push(e); });
  return SHK;
}
const lastShock = sym => { const L = shockMap()[sym]; return L && L.length ? L[L.length - 1].ts : 0; };
// 꽂힌 뒤 모양(충격마다 난수): 70% 30분에 걸쳐 원래대로 · 20% 그대로 굳어서 4시간에 걸쳐 천천히 · 10% 2차로 한 번 더 꽂힌 뒤 1시간에 걸쳐
function shockOne(e, tau) {
  const lv = Math.log(Math.max(.05, 1 + e.d * e.mag)), r = gmHash('shk|' + e.sym + '|' + e.ts);
  if (tau < 0) return 0; if (tau < SHOCK.RISE) return lv * tau / SHOCK.RISE;
  const u = tau - SHOCK.RISE - SHOCK.HOLD; if (u < 0) return lv;
  if (r < .7) return u < SHOCK.FADE ? lv * (1 - u / SHOCK.FADE) : 0;
  if (r < .9) return u < 240 ? lv * (1 - u / 240) : 0;
  const lv2 = lv * 1.6; if (u < 1) return lv + (lv2 - lv) * u; const v = u - 1; return v < 60 ? lv2 * (1 - v / 60) : 0;
}
// 📰 찌라시: 성공(70%)이면 그 방향으로 20초 만에 6~12%, 2분 버티고 10분에 걸쳐 원래대로.
//          실패(30%)면 30초 뒤 정반대로 15% 급반전, 2분 버티고 20분에 걸쳐 원래대로
function rumorOne(e, tau) {
  if (tau < 0) return 0; const lv = Math.log(1 + e.d * e.mag);
  if (e.ok) { if (tau < 1 / 3) return lv * tau * 3; if (tau < 2 + 1 / 3) return lv; const u = tau - 2 - 1 / 3; return u < 10 ? lv * (1 - u / 10) : 0; }
  if (tau < .5) return lv * Math.min(1, tau * 3);
  const lf = Math.log(1 - e.d * .15), k = tau - .5; if (k < 1 / 6) return lv + (lf - lv) * k * 6; if (k < 2 + 1 / 6) return lf; const u = k - 2 - 1 / 6; return u < 20 ? lf * (1 - u / 20) : 0;
}
function shockL(sym, t) {
  let v = 0; const L = shockMap()[sym]; if (L) L.forEach(e => { v += shockOne(e, (t - e.ts) / MIN); });
  (S.feed || []).forEach(e => { if (e && e.kind === 'k_rumor' && e.sym === sym && t - e.ts < 40 * MIN && t >= e.ts) v += rumorOne(e, (t - e.ts) / MIN); });
  return v;
}
// 배율 (t 시각, chg = 그 시각 진짜 하루 등락률)
function gmMult(sym, t, chg) {
  const P = gmCls(sym); if (!P || !GM.ready) return 1;
  const m = Math.floor(t / MIN), A = gmA(sym, t, chg, P);
  // 물결·이벤트 부분은 0.2초 단위로 기억해 둬요 (같은 순간에 여러 번 불려도 한 번만 계산)
  const bk = Math.floor(t / 200), mc = GM.mc[sym];
  let L0;
  if (mc && mc.bk === bk && GM.lastE === mc.le) L0 = mc.v;
  else { L0 = gmL0(sym, t, P); if (Math.abs(t - now()) < 2000) GM.mc[sym] = { bk, v: L0, le: GM.lastE }; }
  let C = 0; const tm = t / MIN; cbList(sym, m, chg, P).forEach(([j, d]) => { C += cbShape(d > 0 ? CB.UP : CB.DN, tm - j); });
  return Math.max(.6, Math.min(1.6, Math.exp(A + L0 + C))) * Math.exp(shockL(sym, t));   // 털기 충격은 0.6~1.6 고정 밖에서 곱해요
}
// 서킷 배지: 터지고 3분 동안
function cbBadge(sym, t = now()) {
  const P = gmCls(sym), c = GM.cache[sym]; if (!P || !GM.ready || !c || !c.cb) return 0; const m = Math.floor(t / MIN);
  for (let j = m; j >= m - 3; j--) if (c.cb[j]) return c.cb[j]; return 0;
}
// 지금 치솟는 중/꽂히는 중인 이벤트 (배지): 시작 뒤 상승 구간에서만
function gmBadge(sym, t = now()) {
  const P = gmCls(sym); if (!P || !GM.ready) return '';
  const m = Math.floor(t / MIN), tm = t / MIN;
  for (const j of gmEvents(sym, m, P)) { const r = n => gmR(sym, 'v' + n, j), rise = 2 + 4 * r(3), tau = tm - j;
    if (tau >= 0 && tau < rise) return r(1) < .5 ? 'up' : 'down'; }
  return '';
}
const gmBadgeHTML = sym => { const cb = cbBadge(sym); if (cb) return cb < 0 ? '<span class="gmb down">💥 서킷 폭락</span>' : '<span class="gmb up">🚀 서킷 폭등</span>'; const b = gmBadge(sym); return b === 'up' ? '<span class="gmb up">🔥 폭주</span>' : b === 'down' ? '<span class="gmb down">💧 폭락</span>' : ''; };

/* ───────── 비트코인 1분봉 받기: CNBC(BTC.CM=) 1분봉 이틀치를 45초마다 (업비트는 브라우저 요청 제한이 빡빡해서 안 써요) ───────── */
async function gmFetch() {
  const j = await (await fetch('https://ts-api.cnbc.com/harmony/app/charts/1D.json?symbol=BTC.CM%3D')).json();
  const bars = ((((j || {}).barData || {}).priceBars) || []), cut = Date.now() - 30e3;
  bars.forEach(b => { const t = b.tradeTimeinMills; if (!(t > 0) || t + MIN > cut) return; const m = Math.floor(t / MIN), v = numOf(b.close); if (v) { GM.E[m] = v; GM.lastE = Math.max(GM.lastE, m); } });   // 끝난 분봉만
  return bars.length;
}
async function gmInit() {
  if (GM.loading) return; GM.loading = true;
  try { if (!(await gmFetch())) throw new Error('empty'); GM.ready = true; GM.poll = Date.now(); renderAll(); }
  catch { GM.loading = false; setTimeout(gmInit, 5000); }
}
let GM_SWEEP = 0;
function gmTick() {
  if (GM.ready && Date.now() - GM_SWEEP > 5000) { GM_SWEEP = Date.now(); Object.keys(KC).forEach(kPx); Object.values(UC).forEach(c => { if (c.m !== 'fx') uPx(c.id); }); }   // 안 보고 있는 종목도 서킷 확인
 if (GM.ready && Date.now() - GM.poll > 45000 && !document.hidden) { GM.poll = Date.now(); gmFetch().catch(() => {}); } }

// 차트: 진짜 가격 점들을 게임 가격으로 (점 사이를 every분 간격으로 채워서 이벤트가 보이게)
function gmChartPts(sym, pts, base, every) {
  if (!GM.ready || !pts || pts.length < 2 || !gmCls(sym)) return pts;
  const out = [], step = every * MIN;
  for (let i = 0; i < pts.length - 1; i++) { const [t0, p0] = pts[i], [t1, p1] = pts[i + 1];
    for (let t = t0; t < t1; t += step) { const p = p0 + (p1 - p0) * (t - t0) / (t1 - t0); out.push([t, p * gmMult(sym, t, base ? p / base - 1 : 0)]); } }
  const [tl, pl] = pts[pts.length - 1]; out.push([tl, pl * gmMult(sym, tl, base ? pl / base - 1 : 0)]);
  return out;
}
// 청산 확인용: [t, t+span) 동안 진짜 가격 p일 때 게임 가격의 최저·최고 (배율을 여러 번 재요)
function gmRange(sym, t, span, p, chg) {
  if (!gmCls(sym)) return [p, p]; let lo = Infinity, hi = 0; const n = span > 2 * MIN ? Math.ceil(span / (5 * MIN)) : 6;
  const base = KC[sym] ? kBase(sym) : (UP[sym] || {}).base, c = chg != null ? chg : base ? p / base - 1 : 0;
  for (let i = 0; i <= n; i++) { const g = p * gmMult(sym, t + span * i / n, c); lo = Math.min(lo, g); hi = Math.max(hi, g); }
  return [lo, hi];
}
