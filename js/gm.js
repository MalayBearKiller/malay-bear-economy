'use strict';
/* ═════════ 🎢 게임 가격 엔진 (2026-11-12 리워크) ═════════
   게임 가격 = 진짜 시세 × 배율.  배율 = exp( 현실 증폭 + 빠른 물결 + 10분 물결 + 2시간 물결 + 급등·급락 이벤트 ), 0.6~1.6배로 고정
   · 현실 증폭: 진짜 시세의 하루 등락을 k배로 (코인 3배, 주식 4배). 기준가가 바뀌는 시각(자정 등) 앞뒤 30분은 0으로 서서히 → 가격이 안 튀어요
   · 물결·이벤트: 종목 + 시각(분) + '3분 전 비트코인 1분봉 종가'로 정해지는 난수 → 모든 폰에서 똑같고, 미래는 아무도 몰라요
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
const gmE = m => { const v = GM.E[m - 3]; return v == null ? 'x' : v; };   // 3분 전 비트코인 1분봉 종가
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
  const safe = Math.min(m, GM.lastE + 3) - c.m0;
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
    let e = c.ev[j]; if (e === undefined) { e = gmR(sym, 'v0', j) < P.p ? 1 : 0; if (j <= GM.lastE + 3) c.ev[j] = e; }
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
function gmMult(sym, t, chg) {
  const P = gmCls(sym); if (!P || !GM.ready) return 1;
  const m = Math.floor(t / MIN), f = (t - m * MIN) / MIN;
  const A = Math.max(-.25, Math.min(.25, (P.k - 1) * Math.log(1 + (chg || 0)))) * gmFade(sym, t);
  // 물결·이벤트 부분은 0.2초 단위로 기억해 둬요 (같은 순간에 여러 번 불려도 한 번만 계산)
  const bk = Math.floor(t / 200), mc = GM.mc[sym];
  let L0;
  if (mc && mc.bk === bk && GM.lastE === mc.le) L0 = mc.v;
  else {
    const fast = gmR(sym, 'f', m) * 2 - 1, fast2 = gmR(sym, 'f', m + 1) * 2 - 1, F = fast + (fast2 - fast) * gmSm(f);
    const y0 = gmAR(sym, m), y1 = gmAR(sym, m + 1), Y = [0, 1].map(j => y0[j] + (y1[j] - y0[j]) * f);
    let ev = 0; const tm = m + f; gmEvents(sym, m, P).forEach(j => { ev += gmEvShape(sym, j, tm - j, P); });
    L0 = P.a * (GM_A[0] * F + GM_A[1] * Y[0] + GM_A[2] * Y[1]) + ev;
    if (Math.abs(t - now()) < 2000) GM.mc[sym] = { bk, v: L0, le: GM.lastE };
  }
  const L = A + L0;
  return Math.max(.6, Math.min(1.6, Math.exp(L)));
}
// 지금 치솟는 중/꽂히는 중인 이벤트 (배지): 시작 뒤 상승 구간에서만
function gmBadge(sym, t = now()) {
  const P = gmCls(sym); if (!P || !GM.ready) return '';
  const m = Math.floor(t / MIN), tm = t / MIN;
  for (const j of gmEvents(sym, m, P)) { const r = n => gmR(sym, 'v' + n, j), rise = 2 + 4 * r(3), tau = tm - j;
    if (tau >= 0 && tau < rise) return r(1) < .5 ? 'up' : 'down'; }
  return '';
}
const gmBadgeHTML = sym => { const b = gmBadge(sym); return b === 'up' ? '<span class="gmb up">🔥 폭주</span>' : b === 'down' ? '<span class="gmb down">💧 폭락</span>' : ''; };

/* ───────── 비트코인 1분봉 받기: 처음에 약 35시간치, 그다음엔 20초마다 최근 것만 ───────── */
async function gmFetch(to, count) {
  const r = await fetch(`${UPBIT}/candles/minutes/1?market=KRW-BTC&count=${count}${to ? '&to=' + encodeURIComponent(new Date(to).toISOString().slice(0, 19) + 'Z') : ''}`);
  if (!r.ok) throw new Error('upbit'); const a = await r.json();
  a.forEach(c => { const m = Math.floor(Date.parse(c.candle_date_time_utc + 'Z') / MIN); if (m * MIN + MIN <= Date.now()) { GM.E[m] = c.trade_price; GM.lastE = Math.max(GM.lastE, m); } });   // 끝난 분봉만
  return a;
}
async function gmInit() {
  if (GM.loading) return; GM.loading = true;
  try {
    let to = 0;
    for (let i = 0; i < 11; i++) { const a = await gmFetch(to, 200); if (!a.length) break; to = Date.parse(a[a.length - 1].candle_date_time_utc + 'Z'); await new Promise(r => setTimeout(r, 120)); }
    GM.ready = true; GM.poll = Date.now(); renderAll();
  } catch { GM.loading = false; setTimeout(gmInit, 3000); }
}
function gmTick() { if (GM.ready && Date.now() - GM.poll > 20000) { GM.poll = Date.now(); gmFetch(0, 6).catch(() => {}); } }

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
