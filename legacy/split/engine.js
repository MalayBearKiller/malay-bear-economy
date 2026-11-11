'use strict';
function seedOf(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^= h >>> 16) >>> 0; }
function rng(str) { let a = seedOf(str); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
function gauss(R) { const u = Math.max(1e-9, R()), v = R(); return Math.max(-3, Math.min(3, Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v))); }
const tickRound = p => p >= 500000 ? Math.round(p / 1000) * 1000 : p >= 100000 ? Math.round(p / 500) * 500 : p >= 50000 ? Math.round(p / 100) * 100 : p >= 10000 ? Math.round(p / 50) * 50 : p >= 1000 ? Math.round(p / 5) * 5 : Math.max(1, Math.round(p));
function pickSrc(R) { let x = R(); for (const c of SRC) { if (x < c.w) return c; x -= c.w; } return SRC[2]; }

function buildSeason(sid, start0) {
  const R = rng('gaemi-v3:' + sid);
  const trend = {}; STOCKS.forEach(s => trend[s.id] = (R() - .5) * .03);
  // live random walk (log price) sampled every minute for the whole week, with GARCH-like volatility clustering & fat-tail jumps
  const MIN = 7 * 24 * 60, walk = {};
  STOCKS.forEach(s => {
    const W = rng('walk5:' + sid + ':' + s.id); const L = new Float64Array(MIN + 1); const sd0 = s.vol * .14;
    let sig = sd0 * .35;
    for (let m = 1; m <= MIN; m++) {
      // GARCH-lite: calm squeeze most of the time, sudden volatility cluster when a shock hits
      const shock = W() < .06 ? (1.8 + W() * 2.5) * s.sens : .28;
      sig = Math.max(sd0 * .22, Math.min(sd0 * 3.2, .82 * sig + .18 * sd0 * shock));
      let z = gauss(W) * sig;
      if (W() < .04) z += (W() < .5 ? 1 : -1) * (.04 + W() * .12) * s.sens;
      z -= L[m - 1] * .0045; // mean reversion over the week
      L[m] = L[m - 1] + z;
    }
    walk[s.id] = L;
  });
  const secKeys = Object.keys(SECTORS);
  const news = [[]];
  for (let k = 1; k <= NT; k++) {
    const items = [];
    if (R() < .35) {
      const sec = pick(R, secKeys), dir = R() < .5 ? 1 : -1, src = pickSrc(R), truth = R() < src.rel, mag = .05 + R() * .08;
      items.push({ sec, dir, src: src.k, truth, mag, text: `${SECTORS[sec].n} ${dir > 0 ? SECTOR_NEWS.u : SECTOR_NEWS.d}` });
    }
    const used = new Set();
    while (items.length < 3) {
      const s = STOCKS[Math.floor(R() * STOCKS.length)]; if (used.has(s.id)) continue; used.add(s.id);
      const dir = R() < .5 ? 1 : -1, src = pickSrc(R), truth = R() < src.rel, mag = (.08 + R() * .17) * s.sens;
      items.push({ sym: s.id, dir, src: src.k, truth, mag, text: pick(R, dir > 0 ? NEWS[s.s].u : NEWS[s.s].d) });
    }
    news[k] = items;
  }
  const shocks = {};
  const k1 = 3 + Math.floor(R() * 5), k2 = 9 + Math.floor(R() * 5), k3 = 15 + Math.floor(R() * 6);
  [k1, k2, k3].forEach(k => { shocks[k] = { sym: STOCKS[Math.floor(R() * STOCKS.length)].id, mag: (.3 + R() * .25) * (R() < .5 ? 1 : -1) }; });
  // 코인식 도파민 급변 + 고점 설거지 폭포수: 15초마다 12종목이 10초에 걸쳐 급등락 (🪤개미지옥 유인 후 수직폭락, 💀고점 설거지 대폭락, 🌪️휩소 개미털기)
  const BANG = 15e3, NB = Math.floor(7 * D / BANG);
  const JR = rng('bang2:' + sid); const jumps = {}, jcum = {}, jmin = {}, bangs = new Array(NB);
  const acc = {}; STOCKS.forEach(s => { jumps[s.id] = []; acc[s.id] = 0; });
  for (let k = 1; k < NB; k++) {
    const t = k * BANG, mm = Math.min(MIN, Math.floor(t / 60e3)); const picked = [];
    while (picked.length < 12) { const i = Math.floor(JR() * STOCKS.length); if (!picked.includes(i)) picked.push(i); }
    bangs[k] = picked.map(i => {
      const s = STOCKS[i], dev = walk[s.id][mm] + acc[s.id];
      // 올라있을수록 고점 설거지(하락 폭포수)가 터질 확률이 급격히 높아짐
      const upProb = dev > .02 ? 1 / (1 + Math.exp(7.5 * dev + .45)) : 1 / (1 + Math.exp(4.2 * dev));
      const dir = JR() < upProb ? 1 : -1;
      const roll = JR();
      const rug = dir < 0 && dev > .02 && roll < .52;
      const trap = !rug && roll < .38;
      const mega = !rug && !trap && roll < .58;
      const whip = !rug && !trap && !mega && roll < .78;
      const size = rug
        ? Math.min(.58, Math.max(.22, dev * 1.35 + .14 + JR() * .22))
        : mega ? (.38 + JR() * .45)
        : trap ? (.22 + JR() * .32)
        : whip ? (.25 + JR() * .30)
        : (.14 + JR() * .24);
      const j = dir * Math.log(1 + size), d = Math.exp(j) - 1;
      jumps[s.id].push({ t, j, d, mega: mega || rug, whip, trap, rug }); acc[s.id] += j;
      return { id: s.id, d, mega: mega || rug, whip: whip || trap, rug, trap };
    });
  }
  // 펌프 후 덤프: 2~5분 동안 8~20% 올려서 롱을 끌어들인 뒤 한 틱에 25~45% 폭락 (반대로 숏 스퀴즈도 절반).
  // RUG_FROM 이후에만 생겨서, 배포 전 가격은 하나도 안 바뀌어요.
  const rugs = {}; STOCKS.forEach(x => rugs[x.id] = []);
  { const RR = rng('rug1:' + sid), seasonStartAbs = Date.parse(sid + 'T00:00:00+09:00');
    for (let mm = 0; mm < MIN - 6; mm++) {
      const r = RR(), i = Math.floor(RR() * STOCKS.length), r3 = RR(), r4 = RR(), r5 = RR(), r6 = RR();
      if (r >= .33 || seasonStartAbs + mm * 60e3 < RUG_FROM) continue;
      const list = rugs[STOCKS[i].id], last = list[list.length - 1];
      if (last && last.end > mm * 60e3) continue;                              // one at a time per stock
      const dur = (2 + Math.floor(r3 * 4)) * 60e3, A = .08 + r4 * .12, Cc = .25 + r5 * .2, dir = r6 < .5 ? 1 : -1;
      list.push({ start: mm * 60e3, end: mm * 60e3 + dur, ramp: dir * Math.log(1 + A), fin: dir * (Math.log(1 + A) + Math.log(1 - Cc)) });
    }
    STOCKS.forEach(x => { let c = 0; rugs[x.id].forEach(e => { e.before = c; c += e.fin; }); });
  }
  STOCKS.forEach(s => {
    const ev = jumps[s.id], C = new Float64Array(ev.length); let a = 0; ev.forEach((e, i) => { a += e.j; C[i] = a; }); jcum[s.id] = C;
    const JM = new Float64Array(MIN + 1); let i = 0, c = 0; for (let mm = 0; mm <= MIN; mm++) { while (i < ev.length && ev[i].t <= mm * 60e3) c += ev[i++].j; JM[mm] = c + rugEval(rugs[s.id], mm * 60e3); } jmin[s.id] = JM;
  });
  const prices = {}; STOCKS.forEach(s => prices[s.id] = [start0 ? start0.p[s.id] : s.p0]);
  const e0 = {}; ESTATES.forEach(b => e0[b.id] = start0 ? start0.e[b.id] : b.v0);
  for (let k = 1; k <= NT; k++) {
    STOCKS.forEach(s => {
      const prev = prices[s.id][k - 1];
      let r = gauss(R) * s.vol * 1.8 + trend[s.id] - .12 * Math.log(prev / s.p0);
      news[k].forEach(n => {
        const hit = n.sym ? n.sym === s.id : n.sec === s.s; if (!hit) return;
        const m = n.sym ? n.mag : n.mag * s.sens;
        r += n.truth ? n.dir * m : -n.dir * m * .35;
      });
      if (shocks[k] && shocks[k].sym === s.id) r += shocks[k].mag;
      r = Math.max(-.6, Math.min(1.2, r));
      // where the live walk drifted during the last round carries over, then the round result lands on top
      const m0 = Math.round((tickTimeRel(k - 1)) / 60e3), m1 = Math.round(tickTimeRel(k) / 60e3);
      const drift = Math.exp(walk[s.id][m1] - walk[s.id][m0] + jmin[s.id][m1] - jmin[s.id][m0]);
      prices[s.id].push(Math.max(1, tickRound(prev * drift * (1 + r))));
    });
  }
  // 곰스피 지수: equal-weight average of price relatives, Monday open = 1,000
  const index = []; for (let k = 0; k <= NT; k++) index.push(1000 * STOCKS.reduce((a, s) => a + prices[s.id][k] / s.p0, 0) / STOCKS.length);
  const secIndex = {}; Object.keys(SECTORS).forEach(sec => { const list = STOCKS.filter(s => s.s === sec); secIndex[sec] = []; for (let k = 0; k <= NT; k++) secIndex[sec].push(list.reduce((a, s) => a + prices[s.id][k] / s.p0, 0) / list.length); });
  const ewalk = {};
  ESTATES.forEach(e => {
    const W = rng('estate2:' + sid + ':' + e.id); const L = new Float64Array(MIN + 1); const sd = e.vol * .06;
    for (let m = 1; m <= MIN; m++) {
      let z = gauss(W) * sd;
      if (W() < .004) z += (W() < .5 ? 1 : -1) * (.03 + W() * .08) * (e.vol / .03);
      L[m] = L[m - 1] * .9995 + z;
    }
    ewalk[e.id] = L;
  });
  return { sid, e0, news, shocks, prices, index, secIndex, walk, ewalk, jumps, jcum, bangs, rugs };
}

/* ───────── time ───────── */
const now = () => Date.now() + (window.__dt || 0);
const isoDay = day => new Date(day * D).toISOString().slice(0, 10);
function seasonAt(t) {
  const day = Math.floor((t + KST) / D);
  const dow = (new Date(day * D).getUTCDay() + 6) % 7;
  const mon = day - dow;
  return { sid: isoDay(mon), start: mon * D - KST, monDate: new Date(mon * D) };
}
function tickTimeRel(k) { if (k === 0) return 0; const d = Math.floor((k - 1) / 3), j = (k - 1) % 3; return d * D + TICK_H[j] * H; }
function tickTime(start, k) { if (k === 0) return start; const d = Math.floor((k - 1) / 3), j = (k - 1) % 3; return start + d * D + TICK_H[j] * H; }
function curTick(t, start) { let k = 0; for (let i = 1; i <= NT; i++) if (tickTime(start, i) <= t) k = i; return k; }
function tickLabel(k) { if (k === 0) return '월요일 0시'; const d = Math.floor((k - 1) / 3), h = TICK_H[(k - 1) % 3]; return `${DOW[d]} ${h}시`; }
const kstDay = t => isoDay(Math.floor((t + KST) / D));

/* ───────── state ───────── */
const S = {
  mode: 'loading', db: null, uid: null, readOnly: false, loaded: false,
  players: {}, feed: [], talk: [], estates: {}, sub: 'wallet', alertBase: {}, drafts: {}, me: null, season: null, SE: null, tick: 0,
  tab: 'home', filter: 'all', sheet: null, saving: false, joinShown: false, rival: null, feedSeen: 0,
};
const LS = {
  get(k, d) { try { const v = localStorage.getItem('sunbit:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sunbit:' + k, JSON.stringify(v)); } catch {} },
};

/* ───────── helpers ───────── */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// 조/억/만 단위 (1억 이상), 그 아래는 콤마
// 큰 금액은 가장 큰 두 단위까지만: 1해 5,647경 · 3경 2,000조 · 5조 3,131억 · 84억 5,706만
const KRW_U = [['극', 1e48], ['재', 1e44], ['정', 1e40], ['간', 1e36], ['구', 1e32], ['양', 1e28], ['자', 1e24], ['해', 1e20], ['경', 1e16], ['조', 1e12], ['억', 1e8], ['만', 1e4]];
function krwUnits(n) {
  n = Math.abs(Math.round(n)); if (n < 1e4) return n.toLocaleString('ko-KR');
  if (n >= 1e52) { const e = Math.floor(Math.log10(n)); return (n / 10 ** e).toFixed(2) + '×10^' + e; } // 너무 크면 짧게
  const i = KRW_U.findIndex(([, v]) => n >= v), [u, v] = KRW_U[i], hi = Math.floor(n / v);
  const nx = KRW_U[i + 1], lo = nx ? Math.floor((n - hi * v) / nx[1]) : 0;
  return hi.toLocaleString('ko-KR') + u + (lo ? ' ' + lo.toLocaleString('ko-KR') + nx[0] : '');
}
const won = n => (Math.abs(n) >= 1e8 ? krwUnits(n) : Math.round(Math.abs(n)).toLocaleString('ko-KR')) + '원';
const man = n => krwUnits(n, true);
const signWon = n => (n > 0 ? '+' : n < 0 ? '-' : '') + won(Math.abs(n));
const cls = v => v > 0.00001 ? 'up' : v < -0.00001 ? 'down' : 'flat';
const pctTxt = v => (v > 0 ? '▲' : v < 0 ? '▼' : '') + Math.abs(v * 100).toFixed(1) + '%';
const pct2Txt = v => {
  const a = Math.abs(v * 100);
  const digits = a >= 10 ? 1 : a >= 0.01 ? 2 : a > 0 ? 3 : 2;
  return (v > 0 ? '▲' : v < 0 ? '▼' : '') + a.toFixed(digits) + '%';
};
const LIVE_MS = 1000;
const liveStep = t => Math.floor(t / LIVE_MS);
const LV = { step: -1, map: {}, prev: {} };
// 코인식 비대칭 설거지 펌핑/덤핑: 72% 시간 동안 계단식으로 유인 상승하다가 나머지 28% 시간에 수직 절벽 폭락 (지하실 -25% 오버슈팅)
function pumpAt(sym, rel) {
  const WIN = 20 * 60e3, w = Math.floor(rel / WIN); let v = 0;
  for (const ww of [w - 1, w]) {
    if (ww < 0) continue; const h = seedOf(S.season.sid + ':pump:' + sym + ':' + ww);
    if (h % 100 >= 38) continue;
    const amp = ((h >>> 8) % 1000 / 1000 * .45 + .18) * (((h >>> 18) % 10 < 7) ? 1 : -1) * SM[sym].sens;
    const start = ww * WIN + ((h >>> 20) % 600) * 1000, dur = (2 + (h >>> 24) % 5) * 60e3;
    const x = (rel - start) / dur;
    if (x > 0 && x < 1) {
      const shape = x < .72 ? Math.pow(x / .72, .85) : (() => { const u = (x - .72) / .28; return u < .6 ? 1 - 1.28 * (u / .6) : -.28 * (1 - (u - .6) / .4); })();
      v += Math.log(Math.max(.05, 1 + amp)) * shape;
    }
  }
  return v;
}
// 36초 주기 톱니바퀴 설거지 파동: 약 26초 동안 스멀스멀 오르는 척 유인하다가 5~6초 만에 수직 폭포수로 꼬라박음
function sawAt(sym, rel) {
  const W = 36e3, w = Math.floor(rel / W), h = seedOf(S.season.sid + ':saw:' + sym + ':' + w);
  if (h % 100 >= 78) return 0;
  const u = (rel - w * W) / W, p = .68 + ((h >>> 8) % 14) / 100;
  const amp = (.045 + ((h >>> 16) % 100) / 1000 * 1.15) * SM[sym].sens * (((h >>> 24) % 10 < 7) ? 1 : -1);
  if (u < p) return amp * Math.pow(u / p, .85);
  const k = (u - p) / (1 - p);
  return amp * (k < .6 ? 1 - 1.48 * (k / .6) : -.48 * (1 - (k - .6) / .4));
}
const BANG_MS = 15e3, SURGE_MS = 10e3;
const RUG_FROM = 1794150631000; // 이 시각 이후부터 펌프·덤프 시작
function rugEval(list, rel) {
  let lo = 0, hi = list.length - 1, idx = -1; while (lo <= hi) { const md = (lo + hi) >> 1; if (list[md].start <= rel) { idx = md; lo = md + 1; } else hi = md - 1; }
  if (idx < 0) return 0; const e = list[idx];
  return e.before + (rel >= e.end ? e.fin : e.ramp * (rel - e.start) / (e.end - e.start));
}
const rugAt = (sym, rel) => rugEval(S.SE.rugs[sym], rel);
function jumpAt(sym, rel) {
  const ev = S.SE.jumps[sym]; let lo = 0, hi = ev.length - 1, idx = -1;
  while (lo <= hi) { const md = (lo + hi) >> 1; if (ev[md].t <= rel) { idx = md; lo = md + 1; } else hi = md - 1; }
  if (idx < 0) return 0;
  const base = idx > 0 ? S.SE.jcum[sym][idx - 1] : 0, e = ev[idx], u = (rel - e.t) / SURGE_MS;
  if (u >= 1) return S.SE.jcum[sym][idx];
  // 🪤 개미지옥 불트랩(trap): 전반부 52% 동안 반대로 달콤하게 올려서 수익 주는 척 유인 후 후반부 48%에 수직 폭포수 내리꽂기
  if (e.trap) {
    if (u < .52) return base - .58 * e.j * Math.sin(.5 * Math.PI * (u / .52));
    const s = (u - .52) / .48;
    return base + e.j * (-.58 + 1.58 * (3 * s * s - 2 * s * s * s));
  }
  // 🌪️ 휩소(개미털기): 초반 30% 구간 동안 반대로 50% 피뢰침 후 본 방향으로 급가속 발사
  if (e.whip) {
    if (u < .30) return base - .50 * e.j * Math.sin(Math.PI * (u / .30));
    const s = (u - .30) / .70;
    return base + e.j * ((3 * s * s - 2 * s * s * s) + .24 * Math.sin(Math.PI * s) * (1 - s));
  }
  // S-커브 급가속 + 고점 오버슈팅 파형
  const wave = (3 * u * u - 2 * u * u * u) + .26 * Math.sin(Math.PI * u) ** 2 * (1 - u);
  return base + e.j * wave;
}
const ATK_DUR = 45e3, ATK_HOLD = 20e3, ATK_MAG = .12;
// 공격 기록은 피드에서 밀려나도 충격이 끝날 때까지 기억해요
const ATKS = new Map();
function noteAtks(list) {
  const t = now();
  for (const f of list || []) if (f && f.kind === 'atk' && f.sym) ATKS.set(f.ts + ':' + f.uid + ':' + f.sym, f);
  for (const [k, f] of ATKS) if (t - (f.ts || 0) > ATK_DUR + 60e3) ATKS.delete(k);
}
const atkLive = (sym, uid) => [...ATKS.values()].some(f => f.sym === sym && (!uid || f.uid === uid) && now() - (f.ts || 0) < ATK_DUR);
function atkAt(sym, t) {
  if (HALT_EVAL || !ATKS.size || !S.season) return 0;
  let v = 0;
  for (const f of ATKS.values()) {
    if (f.sym !== sym) continue;
    const dt = t - (f.ts || 0);
    if (dt < 0 || dt >= ATK_DUR) continue;
    const w = dt <= ATK_HOLD ? 1 : 1 - (dt - ATK_HOLD) / (ATK_DUR - ATK_HOLD);
    v += (f.dir || -1) * Math.log(1 + ATK_MAG) * w;
  }
  return v;
}
function walkAt(sym, t) {
  const L = S.SE.walk[sym]; const rel = Math.max(0, t - S.season.start); const MIN = L.length - 1;
  const m = Math.min(MIN - 1, Math.floor(rel / 60e3)); const f = Math.min(1, (rel - m * 60e3) / 60e3);
  const j = Math.floor(f * 60); let c = 0, cj = 0;
  // 변동성 군집: 잔잔한 응축 구간(52%) 후 과열 폭주 구간(48%, 2.1x)
  const reg = (seedOf(S.season.sid + ':reg:' + sym + ':' + m) % 100) < 52 ? .55 : 2.1;
  const sd = SM[sym].vol * .65 * reg / Math.sqrt(60);
  for (let i = 0; i < 60; i++) { const e = (seedOf(S.season.sid + sym + m + ':' + i) / 4294967296 - .5) * 3.46 * sd; c += e; if (i < j) cj = c; }
  return L[m] + f * (L[m + 1] - L[m]) + (cj - (j / 60) * c) + sawAt(sym, rel) + pumpAt(sym, rel) + jumpAt(sym, rel) + rugAt(sym, rel) + atkAt(sym, t);
}
function prevPx(sym) {
  const st = liveStep(now());
  if (isEq(sym)) return eqAt(sym, (st - 1) * LIVE_MS);
  if (LV.prev && LV.prev[sym] != null) return LV.prev[sym];
  const t0 = tickTime(S.season.start, S.tick), t = (st - 1) * LIVE_MS, h = haltAt(sym, t);
  const p = Math.max(1, tickRound(S.SE.prices[sym][S.tick] * Math.exp(walkAt(sym, h.from || t) - walkAt(sym, t0) + h.c)));
  return LV.prev ? (LV.prev[sym] = p) : p;
}
function livePx(sym) {
  const st = liveStep(now());
  if (isEq(sym)) return eqAt(sym, st * LIVE_MS);
  if (LV.step !== st) { LV.prev = LV.step === st - 1 ? LV.map : {}; LV.step = st; LV.map = {}; }
  if (LV.map[sym] == null) {
    const t0 = tickTime(S.season.start, S.tick), t = st * LIVE_MS, h = haltAt(sym, t);
    let p = Math.max(1, tickRound(S.SE.prices[sym][S.tick] * Math.exp(walkAt(sym, h.from || t) - walkAt(sym, t0) + h.c)));
    const pv = prevPx(sym);
    if (p === pv && !h.from) {
      const u = p >= 500000 ? 1000 : p >= 100000 ? 500 : p >= 50000 ? 100 : p >= 10000 ? 50 : p >= 1000 ? 5 : 1;
      p = Math.max(1, p + ((seedOf(S.season.sid + ':nd:' + sym + ':' + st) & 1) ? u : -u));
    }
    LV.map[sym] = p;
  }
  return LV.map[sym];
}
const isLive = k => k === S.tick;
const px = (sym, k) => !SM[sym] ? 0 : isLive(k) ? livePx(sym) : isEq(sym) ? eqAt(sym, tickTime(S.season.start, Math.max(0, Math.min(k, NT)))) : S.SE.prices[sym][Math.max(0, Math.min(k, NT))];
function liveX() { const a = tickTime(S.season.start, S.tick), b = S.tick >= NT ? S.season.start + 7 * D : tickTime(S.season.start, S.tick + 1); return S.tick + Math.min(1, (now() - a) / (b - a)); }
const indexNow = () => 1000 * STOCKS.reduce((a, s) => a + px(s.id, S.tick) / s.p0, 0) / STOCKS.length;
const secNow = sec => { const l = STOCKS.filter(s => s.s === sec); return l.reduce((a, s) => a + px(s.id, S.tick) / s.p0, 0) / l.length; };
// price at any moment (round price × live walk since that round), for 24시간 변동률
function priceAt(sym, t) {
  if (isEq(sym)) return eqAt(sym, t);
  if (t <= S.season.start) return S.SE.prices[sym][0];
  const h = haltAt(sym, t); if (h.from) t = h.from;
  const k = curTick(t, S.season.start), t0 = tickTime(S.season.start, k);
  return S.SE.prices[sym][k] * Math.exp(walkAt(sym, t) - walkAt(sym, t0) + h.c);
}
// ⛔ 과열·과매도 서킷브레이커: 2시간 변동률이 +40% 이상이면 -70% 폭락, -40% 이하면 +70% 폭등할 확률이 생기고
// 멀어질수록 확률이 커져요. 터지면 3분간 거래정지. (v1: 1분마다 40%: 0.1% → 50%: 1% → 60%+: 10%, 2시간에 한 번)
// (v2: 2분마다 40%: 15% → 50%: 45% → 60%+: 90%, 재개 후 2분 쉬기 → 평균 7종목쯤 늘 거래정지)
// 기존 가격 흐름 위에 덧씌우는 방식이라 HALT_FROM 전 가격은 하나도 안 바뀌고, 폭락·폭등분은 다음 주로 이어져요.
const HALT_FROM = 1794154800000, HALT_MS = 3 * 60e3, HALT_STEP = 60e3, HALT_UP = Math.log(1.7), HALT_DN = Math.log(.3), HALT_PMAX = .1;
const haltProb = a => a < .4 ? 0 : Math.min(HALT_PMAX, .001 * Math.pow(10, (a - .4) / .1));
// v2(HALT_V2부터): 더 자주 터지게. 카테고리마다 한 종목쯤은 늘 거래정지가 떠 있을 정도.
// 2시간 1회 제한 대신, 거래 재개 후 HC2.cd 동안만 쉬어요. 그 전 구간은 예전 규칙 그대로라 지난 가격은 안 바뀌어요.
const HALT_V2 = 1794157020000, HC2 = { p40: .15, step: 3, pmax: .9, cd: 2 * 60e3 }; // 숫자를 바꾸면 아래 'halt3:' 저장 키도 바꿔요
const haltProb2 = a => a < .4 ? 0 : Math.min(HC2.pmax, HC2.p40 * Math.pow(HC2.step, (a - .4) / .1));
const HALTS = {}; let HALT_EVAL = 0;
// 계산 결과는 기기에 저장해 두고 이어서 계산해요 (같은 시드라 결과가 늘 같아요)
function haltState(sym) {
  const key = S.season.sid + ':' + sym; if (HALTS[key]) return HALTS[key];
  const t0 = Math.ceil(Math.max(HALT_FROM, S.season.start) / HALT_STEP) * HALT_STEP;
  const H = { ev: [], base: {}, t: t0, busy: false, key, saved: t0 };
  try { const c = JSON.parse(localStorage.getItem('halt3:' + key) || 'null');
    if (c && c.t > t0 && Array.isArray(c.e)) { let cum = 0; H.ev = c.e.map(x => { const j = x > 0 ? HALT_UP : HALT_DN; cum += j; return { t: Math.abs(x) * 60e3, j, cum }; }); H.t = H.saved = c.t; } } catch {}
  return HALTS[key] = H;
}
function haltSave(H) {
  if (H.t - H.saved < 30 * 60e3) return; H.saved = H.t;
  try { localStorage.setItem('halt3:' + H.key, JSON.stringify({ t: H.t, e: H.ev.map(e => (e.j > 0 ? 1 : -1) * Math.round(e.t / 60e3)) })); } catch {}
}
function haltAdvance(sym, H, upto) {
  H.busy = true; HALT_EVAL++;
  try {
    while (H.t <= upto) {
      const tc = H.t; H.t += HALT_STEP;
      const ds = dayStart(tc), last = H.ev[H.ev.length - 1], v2 = tc >= HALT_V2;
      if (tc === ds) continue; // 구간 시작 시각엔 안 터져요
      if (v2 && (tc / 60e3) % 2) continue; // v2는 2분마다 굴려요
      if (v2 ? (last && tc < last.t + HALT_MS + HC2.cd) : (last && last.t >= ds)) continue; // v1: 2시간에 한 번 · v2: 재개 후 잠깐 쉬기
      const u = seedOf('halt2:' + S.season.sid + ':' + sym + ':' + tc) / 4294967296; if (u >= (v2 ? HC2.pmax : HALT_PMAX)) continue;
      if (H.base[ds] == null) H.base[ds] = priceAt(sym, ds);
      const chg = priceAt(sym, tc - 1000) / H.base[ds] - 1;
      if (u < (v2 ? haltProb2 : haltProb)(Math.abs(chg))) { const j = chg > 0 ? HALT_DN : HALT_UP; H.ev.push({ t: tc, j, cum: (last ? last.cum : 0) + j }); }
    }
  } finally { H.busy = false; HALT_EVAL--; }
  haltSave(H);
}
function haltAt(sym, t) {
  if (t < HALT_FROM || !S.season || isEq(sym)) return { c: 0, from: 0, j: 0 };
  const H = haltState(sym); if (!H.busy && H.t <= t) haltAdvance(sym, H, t);
  const ev = H.ev; let lo = 0, hi = ev.length - 1, i = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (ev[m].t <= t) { i = m; lo = m + 1; } else hi = m - 1; }
  if (i < 0) return { c: 0, from: 0, j: 0 };
  const e = ev[i], on = t < e.t + HALT_MS;
  return { c: e.cum, from: on ? e.t : 0, j: on ? e.j : 0 };
}
const haltLeft = sym => { const h = haltAt(sym, now()); return h.from ? h.from + HALT_MS - now() : 0; };
const haltMsg = sym => `⛔ ${SM[sym].n} 거래정지 중이에요 · ${hms(haltLeft(sym)).replace(/^0?0:/, '')} 뒤 재개`;
// 변동률은 매일 0시(한국 시간)에 초기화
const PERIOD = 2 * H; // 변동률 초기화·지원금 주기
const dayStart = t => Math.max(S.season.start, Math.floor((t + KST) / PERIOD) * PERIOD - KST);
const P24 = { key: -1, map: {} };
function ago24(sym) { const ds = dayStart(now()); if (P24.key !== ds) { P24.key = ds; P24.map = {}; } return P24.map[sym] ?? (P24.map[sym] = priceAt(sym, ds)); }
const nowChg = sym => px(sym, S.tick) / ago24(sym) - 1;
const index24 = () => 1000 * STOCKS.reduce((a, s) => a + ago24(s.id) / s.p0, 0) / STOCKS.length;
const sec24 = sec => { const l = STOCKS.filter(s => s.s === sec); return l.reduce((a, s) => a + ago24(s.id) / s.p0, 0) / l.length; };
const badge = s => `<span class="logo-b" style="background:${SECTORS[s.s].c}">${esc(s.a)}</span>`;
const avaColor = id => AVA_COLORS[seedOf(String(id)) % AVA_COLORS.length];
const okPhoto = u => typeof u === 'string' && u.length < 40000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(u);
const ava = (p, lg, crown) => { const ph = !p.bot && okPhoto(p.photo);
  return `<span class="ava${lg ? ' lg' : ''}${ph ? ' ph' : ''}" style="${ph ? `background-image:url(${p.photo})` : `background:${p.bot ? '#e4e2ee' : avaColor(p.id)}`}">${crown ? '<span class="crown">👑</span>' : ''}${ph ? '' : esc(p.bot ? '🤖' : (p.name || '?').slice(0, 1))}</span>`; };
// 프로필: 사진은 96px로 줄여서 지갑 문서에 저장, 닉네임 변경은 변경권(100억) 구매
const RENAME_COST = 10_000_000_000, BANNER_COST = 100_000_000_000_000; // 순위 배경 변경권 100조
let PICK = 'photo';
function pickPhoto(kind = 'photo') { PICK = kind; const i = $('#photoIn'); if (i) { i.value = ''; i.click(); } }
async function savePhoto(file, kind = 'photo') {
  if (!S.me || S.saving || !file) return;
  try {
    const img = await new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = rej; im.src = u; });
    const W = kind === 'banner' ? 360 : 96, Hh = kind === 'banner' ? 96 : 96, ar = W / Hh;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; const g = cv.getContext('2d');
    let sw = img.width, sh = img.width / ar; if (sh > img.height) { sh = img.height; sw = sh * ar; }
    g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, Hh);
    let q = .8, url = cv.toDataURL('image/jpeg', q); while (url.length > 30000 && q > .3) { q -= .15; url = cv.toDataURL('image/jpeg', q); }
    if (!okPhoto(url)) { toast('사진을 읽지 못했어요'); return; }
    if (kind === 'banner' && !(S.me.bannerTk > 0)) { toast('🔒 상점에서 순위 배경 변경권을 먼저 사 주세요'); return; }
    const before = S.me, me = JSON.parse(JSON.stringify(before)); me[kind] = url; if (kind === 'banner') me.bannerTk = (me.bannerTk || 0) - 1;
    S.saving = true; const ok = await saveMe(me, before); S.saving = false;
    if (ok) { toast(kind === 'banner' ? '🖼️ 순위 배경을 바꿨어요 (변경권 사용)' : '📸 프로필 사진을 바꿨어요'); renderAll(); }
  } catch { toast('사진을 읽지 못했어요'); }
}
async function clearBanner() {
  if (!S.me || S.saving || !S.me.banner) return;
  const before = S.me, me = JSON.parse(JSON.stringify(before)); delete me.banner;
  S.saving = true; const ok = await saveMe(me, before); S.saving = false;
  if (ok) { toast('순위 배경을 지웠어요'); renderAll(); }
}
async function clearPhoto() {
  if (!S.me || S.saving || !S.me.photo) return;
  const before = S.me, me = JSON.parse(JSON.stringify(before)); delete me.photo;
  S.saving = true; const ok = await saveMe(me, before); S.saving = false;
  if (ok) { toast('프로필 사진을 지웠어요'); renderAll(); }
}
function renderRenameSheet(b) {
  const can = S.me && S.me.cash >= RENAME_COST;
  b.innerHTML = `<div class="rv-head"><span class="k">닉네임 변경권</span><h3>새 닉네임</h3></div>
    <p class="hint" style="text-align:center">변경권 가격은 <b>${won(RENAME_COST)}</b>이에요. 현금에서 빠져요. 지금 현금 ${won(S.me ? S.me.cash : 0)}.</p>
    <div class="field"><label for="newNick" class="dim" style="font-size:13px;font-weight:700">닉네임 (10자까지)</label><input id="newNick" maxlength="10" value="${esc(S.me ? S.me.name : '')}"></div>
    <p class="hint nickwarn">⚠️ 실명은 쓰지 마세요. 닉네임은 순위·채팅에서 모두에게 보여요.</p>
    <button class="cta" type="button" id="renameBtn" ${can && !S.saving ? '' : 'disabled'}>${can ? `${won(RENAME_COST)} 내고 바꾸기` : '현금이 부족해요'}</button>`;
}
async function doRename() {
  const el = $('#newNick'); const nick = ((el && el.value) || '').trim().slice(0, 10);
  if (!S.me || S.saving) return;
  if (!nick) { toast('닉네임을 입력해 주세요'); return; }
  if (nick === S.me.name) { toast('지금 닉네임과 같아요'); return; }
  if (S.me.cash < RENAME_COST) { toast('현금이 부족해요'); return; }
  const before = S.me, me = JSON.parse(JSON.stringify(before)), old = before.name;
  me.name = nick; me.cash = Math.round(me.cash - RENAME_COST); me.renameN = (me.renameN || 0) + 1;
  S.saving = true; const ok = await saveMe(me, before); S.saving = false;
  if (ok) { LS.set('nick', nick); addFeed({ kind: 'rename', old }); closeSheet(); toast(`✏️ 이제 ${nick}님이에요`); renderAll(); }
}
const tOf = k => isLive(k) ? now() : tickTime(S.season.start, Math.max(0, Math.min(k, NT)));
const EV = { step: -1, map: {} };
function estAt(bid, t) {
  const L = S.SE.ewalk[bid]; const rel = Math.max(0, t - S.season.start); const MIN = L.length - 1;
  const m = Math.min(MIN - 1, Math.floor(rel / 60e3)); const f = Math.min(1, (rel - m * 60e3) / 60e3);
  const b = EM[bid], raw = (S.SE.e0 ? S.SE.e0[bid] : b.v0) * Math.exp(L[m] + f * (L[m + 1] - L[m]));
  const v = Math.max(b.min, raw), step = v >= 1e9 ? 1e7 : v >= 1e8 ? 1e6 : 1e5;
  return Math.round(v / step) * step;
}
function estVal(bid, k) {
  if (!isLive(k)) return estAt(bid, tOf(k));
  const st = liveStep(now()); if (EV.step !== st) { EV.step = st; EV.map = {}; }
  return EV.map[bid] ?? (EV.map[bid] = estAt(bid, now()));
}
const estOf = bid => { const e = S.estates[bid]; return e && e.owner ? e : null; };
const myEstates = p => ESTATES.filter(b => { const e = estOf(b.id); return e && e.owner === p.id; });
const LEVS = [5, 10, 25, 50, 100], EQ_LEVS = [2, 5, 10, 25, 50]; // 가상주식 최대 50배
const levsFor = sym => isEq(sym) ? EQ_LEVS : LEVS;
// 레버리지 평가액: 진입가 기준. 진입가보다 유리하면 수익, 불리하면 손실(증거금 6% 남으면 청산)
const levVal = (o, price) => Math.max(0, o.m + (o.d || 1) * o.q * (price - o.e));
const levSide = o => (o.d || 1) < 0 ? '숏' : '롱';
const levROE = (o, price, sym) => levVal(o, price, sym) / o.m - 1;
// 앱이 꺼져 있던 동안에도 청산선을 건드렸는지 지난 가격으로 확인해요 (끄고 버티기 방지)
const LQ = {}, LQ_STEP = 3000;
const levLiqP = o => o.e - (o.d || 1) * (o.m * .94) / o.q;
const SHORT_LIQ = 1.35;
function lqState(uid, kind, sym, o) {
  const k = uid + ':' + kind + ':' + sym + ':' + o.e + ':' + o.q;
  return LQ[k] || (LQ[k] = { t: Math.max(o.at || now(), S.season.start), dead: false });
}
const lqDead = (uid, kind, sym, o) => !!(uid && SM[sym] && lqState(uid, kind, sym, o).dead);
const lqReady = (uid, kind, sym, o) => { const st = lqState(uid, kind, sym, o); return st.dead || now() - st.t < LQ_STEP * 2; };
function lqScan(budget = 800) {
  if (!S.season) return; const tEnd = now() - LQ_STEP;
  for (const [uid, p] of Object.entries(S.players)) {
    if (!p || !p.name) continue;
    for (const kind of ['lev', 'short']) for (const [sym, o] of Object.entries((kind === 'lev' ? p.lev : p.shorts) || {})) {
      if (!SM[sym] || !o || !o.q) continue;
      const st = lqState(uid, kind, sym, o); if (st.dead) continue;
      const lim = kind === 'lev' ? levLiqP(o) : o.e * SHORT_LIQ, up = kind === 'short' || (o.d || 1) < 0;
      while (st.t < tEnd && budget > 0) {
        st.t = Math.min(tEnd, st.t + LQ_STEP); budget--;
        const pr = tickRound(priceAt(sym, st.t));
        if (up ? pr >= lim : pr <= lim) { st.dead = true; break; }
      }
      if (budget <= 0) return;
    }
  }
}
function worth(p, k) {
  if (!p) return 0; let v = (p.cash || 0) + BONUS * pendingOf(p);
  for (const [s, q] of Object.entries(p.hold || {})) v += q * px(s, k);
  const pid = p.id || (p === S.me || p === S.players[S.uid] ? S.uid : null);
  for (const [s, o] of Object.entries(p.shorts || {})) if (SM[s]) v += lqDead(pid, 'short', s, o) ? o.q * o.e * (2 - SHORT_LIQ) : Math.max(0, o.q * (2 * o.e - px(s, k)));
  for (const [s, o] of Object.entries(p.lev || {})) if (SM[s] && !lqDead(pid, 'lev', s, o)) v += levVal(o, px(s, k), s);
  return Math.round(v + kAssets(p));
}
function worthPrev(p, k) {
  if (!p) return 0; let v = (p.cash || 0) + BONUS * pendingOf(p);
  for (const [s, q] of Object.entries(p.hold || {})) if (SM[s]) v += q * prevPx(s);
  const pid = p.id || (p === S.me || p === S.players[S.uid] ? S.uid : null);
  for (const [s, o] of Object.entries(p.shorts || {})) if (SM[s]) v += lqDead(pid, 'short', s, o) ? o.q * o.e * (2 - SHORT_LIQ) : Math.max(0, o.q * (2 * o.e - prevPx(s)));
  for (const [s, o] of Object.entries(p.lev || {})) if (SM[s] && !lqDead(pid, 'lev', s, o)) v += levVal(o, prevPx(s), s);
  const tPrev = (liveStep(now()) - 1) * LIVE_MS;
  return Math.round(v + kAssets(p));
}
function isAllCash(p) {
  if (!p) return true;
  const hasHold = Object.entries(p.hold || {}).some(([s, q]) => SM[s] && q > 0);
  const hasLev = Object.entries(p.lev || {}).some(([s, o]) => SM[s] && o && o.q > 0);
  const hasShort = Object.entries(p.shorts || {}).some(([s, o]) => SM[s] && o && o.q > 0);
  const pid = p.id || (p === S.me || p === S.players[S.uid] ? S.uid : null);
  const hasEst = pid ? ESTATES.some(b => { const e = estOf(b.id); return e && e.owner === pid && !e.destroyed; }) : false;
  return !(hasHold || hasLev || hasShort || hasEst);
}
// 데이터는 절대 초기화하지 않아요: 시즌(주) 표시와 상관없이 모든 참가자·지갑을 그대로 이어서 써요
function activePlayers() { return Object.entries(S.players).filter(([, p]) => p && p.name).map(([id, p]) => ({ id, ...p })); }
function ranking(k) { return activePlayers().map(p => ({ ...p, w: worth(p, k) })).sort((a, b) => b.w - a.w); }
const NAME_ALIAS = { '무늬수': '새벽코끼리', '박원국': '파란고슴도치' };
const nameOf = id => (S.players[id] && S.players[id].name) || '누군가';
// 100억 이상 청산되면 상단에 작게 알려주고 티배깅할 수 있어요
const BIG_LIQ = 10_000_000_000, LB_SEEN = new Set(), TBAGGED = new Set(); let lbTimer = 0;
function showLiqBar(html, btn) {
  const b = $('#liqBar'); if (!b) return;
  b.innerHTML = `<span>${html}</span>${btn || ''}`; b.classList.toggle('solo', !btn); b.hidden = false;
  clearTimeout(lbTimer); lbTimer = setTimeout(() => { b.hidden = true; }, 8000);
}
function feedAlerts() {
  if (!S.season) return; const t = now();
  if (!S.feed) return;
  for (const f of S.feed.slice(0, 30)) {
    if (!f || t - (f.ts || 0) > 20e3) continue;
    const key = f.kind + ':' + f.ts + ':' + f.uid; if (LB_SEEN.has(key)) continue;
    if (f.kind === 'liq' && f.uid !== S.uid && (f.amt || 0) >= BIG_LIQ && SM[f.sym]) {
      LB_SEEN.add(key);
      const what = f.x > 1 ? `${f.x}배 ${f.d < 0 ? '숏' : '롱'}` : '공매도';
      showLiqBar(`💀 ${esc(nameOf(f.uid))}님 ${esc(SM[f.sym].n)} ${what} 청산! -${man(f.amt)}원`,
        S.me && !S.readOnly ? `<button type="button" data-tbag="${esc(f.uid)}:${esc(f.sym)}:${f.ts}">🫖 티배깅</button>` : '');
      return;
    }
    if ((f.kind === 'sell' || f.kind === 'levclose' || f.kind === 'cover') && f.uid !== S.uid && (f.pnl || 0) >= BIG_LIQ && SM[f.sym]) {
      LB_SEEN.add(key); showLiqBar(`💰 ${esc(nameOf(f.uid))}님 ${esc(SM[f.sym].n)}에서 +${man(f.pnl)}원 벌었어요!`); return;
    }
    if (f.kind === 'tbag' && f.target === S.uid && f.uid !== S.uid) {
      LB_SEEN.add(key); showLiqBar(`🫖 ${esc(nameOf(f.uid))}님이 청산당한 나를 티배깅했어요`); return;
    }
  }
}
function teabag(arg) {
  const [target, sym, ts] = arg.split(':'); const b = $('#liqBar');
  if (!S.me || S.readOnly || TBAGGED.has(arg)) { if (b) b.hidden = true; return; }
  TBAGGED.add(arg); addFeed({ kind: 'tbag', target, sym, liqTs: +ts });
  if (b) b.hidden = true; toast(`🫖 ${nameOf(target)}님을 티배깅했어요`); buzz(40);
}
function topHolding(p, k) { let best = null, bv = 0; for (const [s, q] of Object.entries(p.hold || {})) { if (!SM[s]) continue; const v = q * px(s, k); if (v > bv) { bv = v; best = s; } } return best; }
function posSummary(p) {
  const parts = [];
  Object.entries(p.hold || {}).filter(([s]) => SM[s]).forEach(([s, q]) => parts.push(`${SM[s].n} ${QT(s, q)}`));
  Object.entries(p.lev || {}).filter(([s]) => SM[s]).forEach(([s, o]) => parts.push(`${SM[s].n} ${o.x}배 ${levSide(o)}`));
  Object.entries(p.shorts || {}).filter(([s]) => SM[s]).forEach(([s, o]) => parts.push(`${SM[s].n} 공매도 ${QT(s, o.q)}`));
  const pid = p.id || (p === S.me || p === S.players[S.uid] ? S.uid : null);
  return parts.length ? parts.join(' · ') : (pid === S.uid ? '자산을 구매하세요!' : '현금만');
}
function lockedCount(p) { const top = topHolding(p, S.tick); return Object.keys(p.hold || {}).filter(s => SM[s] && s !== top).length + Object.keys(p.shorts || {}).filter(s => SM[s]).length; }
const spiedOn = id => S.me && S.me.spy && S.me.spy.day === kstDay(now()) && S.me.spy.target === id;
const seasonOver = () => false; // 시장은 멈추지 않아요. 월요일 0시에 새 시즌으로 자연스럽게 넘어가요.
// 순위의 자산 변동률: 20분마다 0으로 초기화. 구간 시작 때 각자 앱이 자기 기준값(wb)을 저장하고,
// 그 기준값이 없으면(앱을 안 켠 사람) 지금 가진 것들을 구간 시작 가격으로 계산해요.
const WB_MS = 20 * 60e3, wbStart = t => Math.floor(t / WB_MS) * WB_MS, WB_CACHE = {};
function worthAtTime(p, t) {
  let v = (p.cash || 0) + BONUS * pendingOf(p);
  for (const [s, q] of Object.entries(p.hold || {})) if (SM[s]) v += q * priceAt(s, t);
  for (const [s, o] of Object.entries(p.shorts || {})) if (SM[s]) v += Math.max(0, o.q * (2 * o.e - priceAt(s, t)));
  for (const [s, o] of Object.entries(p.lev || {})) if (SM[s]) v += levVal(o, priceAt(s, t));
  for (const b of ESTATES) { const e = estOf(b.id); if (e && e.owner === p.id && !e.destroyed) v += estAt(b.id, t); }
  return v;
}
function winBase(p) {
  const ws = wbStart(now());
  if (p.wb && p.wb.t === ws && p.wb.w > 0) return p.wb.w;
  const key = p.id + ':' + ws + ':' + p.cash; return WB_CACHE[key] ?? (WB_CACHE[key] = worthAtTime(p, ws));
}
const winChg = (p, w) => { const b = winBase(p); return b > 0 ? (w - b) / b : 0; };
let wbSaving = false;
async function saveWinBase() {
  if (!S.me || S.readOnly || S.saving || wbSaving || (S.mode === 'live' && !S.loaded)) return;
  const ws = wbStart(now()); if (S.me.wb && S.me.wb.t === ws) return;
  wbSaving = true; const before = S.me, me = JSON.parse(JSON.stringify(before));
  me.wb = { t: ws, w: Math.round(worthAtTime({ ...before, id: S.uid }, ws)) };
  await saveMe(me, before); wbSaving = false;
}
const roiOf = (p, w) => { const b = (p && p.inflow) || CASH0; return (w - b) / b; };
const chg = (sym, from, to) => px(sym, to) / px(sym, from) - 1;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2600); }
function moodOf(c) { return c > .02 ? ['up', '불장'] : c > .004 ? ['up', '훈훈'] : c < -.02 ? ['down', '공포'] : c < -.004 ? ['down', '쌀쌀'] : ['flat', '눈치보기']; }

/* ───────── season sync ───────── */
const EPOCH_SID = '2026-11-02'; // 첫 주. 이후 주는 직전 주 종가에서 이어서 시작
const SEASON_CACHE = {};
function weekEnd(se, SE) {
  const keep = [S.season, S.SE, S.tick]; S.season = se; S.SE = SE; S.tick = NT;
  const t = se.start + 7 * D, p = {}, e = {};
  STOCKS.forEach(x => p[x.id] = Math.max(1, tickRound(priceAt(x.id, t))));
  ESTATES.forEach(b => e[b.id] = estAt(b.id, t));
  [S.season, S.SE, S.tick] = keep; return { p, e };
}
function seasonData(se) {
  if (SEASON_CACHE[se.sid]) return SEASON_CACHE[se.sid];
  let start0 = null;
  if (se.sid > EPOCH_SID) { const prev = seasonAt(se.start - 1); start0 = weekEnd(prev, seasonData(prev)); }
  return SEASON_CACHE[se.sid] = buildSeason(se.sid, start0);
}
function syncTime() {
  const t = now(); const se = seasonAt(t);
  if (!S.season || S.season.sid !== se.sid) { S.season = se; S.SE = seasonData(se); S.joinShown = false; LV.step = -1; EV.step = -1; P24.key = -1; if (S.mode === 'demo') loadDemo(); }
  const k = curTick(t, S.season.start);
  const changed = k !== S.tick; S.tick = k; return changed;
}

/* ───────── header ───────── */
