'use strict';
/* ═════════ 실제 시세 자산: 업비트 코인 · 구채 (돈은 원화 하나) ═════════ */
const K_RESCUE = 10_000_000, K_RESCUE_AT = 1_000_000; // 원화 총자산 100만원 밑이면 파산 지원금 1,000만원
const KFEE = 0.0005, K_MIN = 5000;        // 업비트 수수료 0.05%, 최소 주문 5,000원
const KCOINS = [
  ['BTC', '비트코인', 'major'], ['ETH', '이더리움', 'major'], ['XRP', '리플', 'major'], ['SOL', '솔라나', 'major'], ['TRX', '트론', 'major'],
  ['ADA', '에이다', 'major'], ['BCH', '비트코인캐시', 'major'], ['ETC', '이더리움클래식', 'major'], ['LINK', '체인링크', 'major'], ['XLM', '스텔라루멘', 'major'], ['HBAR', '헤데라', 'major'],
  ['AVAX', '아발란체', 'l1'], ['DOT', '폴카닷', 'l1'], ['SUI', '수이', 'l1'], ['APT', '앱토스', 'l1'], ['NEAR', '니어', 'l1'], ['SEI', '세이', 'l1'], ['ICP', '인터넷컴퓨터', 'l1'],
  ['UNI', '유니스왑', 'defi'], ['AAVE', '에이브', 'defi'], ['ARB', '아비트럼', 'defi'], ['OP', '옵티미즘', 'defi'], ['POL', '폴리곤', 'defi'], ['ENA', '에테나', 'defi'], ['ONDO', '온도파이낸스', 'defi'],
  ['DOGE', '도지코인', 'meme'], ['SHIB', '시바이누', 'meme'], ['PEPE', '페페', 'meme'], ['WIF', '도그위프햇', 'meme'], ['TRUMP', '오피셜트럼프', 'meme'], ['PENGU', '펏지펭귄', 'meme'],
];
const KCAT = { major: { n: '메이저', c: '#f08c00' }, l1: { n: '레이어1', c: '#5b4bd6' }, defi: { n: '디파이', c: '#0e9f6e' }, meme: { n: '밈', c: '#e8384f' } };
const KC = {}; KCOINS.forEach(([a, n, c]) => { KC['KRW-' + a] = { id: 'KRW-' + a, a, n, c }; });
const KP = {};                             // 마켓 → { p 현재가, c 전일 대비, v 24시간 거래대금, t 받은 시각 }
const KQ = { ws: null, ok: false, last: 0, retry: 0, poll: 0, shown: {}, flash: {}, chart: {}, first: false };

/* ───────── 시세: 업비트 웹소켓 (안 되면 2~3초마다 REST) ───────── */
const UPBIT = 'https://api.upbit.com/v1';
function kApply(d) {
  const code = d.code || d.market; if (!KC[code] || !(d.trade_price > 0)) return;
  const o = KP[code] || (KP[code] = {});
  o.p = d.trade_price; o.c = d.signed_change_rate || 0; o.v = d.acc_trade_price_24h || o.v || 0; o.t = Date.now();
  KQ.last = Date.now();
  fLiveCheck(code);
}
async function kFetchTickers() {
  KQ.poll = Date.now();
  try {
    const r = await fetch(UPBIT + '/ticker?markets=' + Object.keys(KC).join(','));
    if (!r.ok) return;
    (await r.json()).forEach(kApply);
    if (!KQ.first) { KQ.first = true; kOnFirstPrices(); renderAll(); }
  } catch {}
}
function kConnect() {
  if (typeof WebSocket === 'undefined') return;
  let ws; try { ws = new WebSocket('wss://api.upbit.com/websocket/v1'); } catch { return; }
  ws.binaryType = 'arraybuffer'; KQ.ws = ws;
  ws.onopen = () => { KQ.ok = true; KQ.retry = 0; ws.send(JSON.stringify([{ ticket: 'sunbit-' + Math.random().toString(36).slice(2) }, { type: 'ticker', codes: Object.keys(KC) }])); };
  ws.onmessage = e => { try { kApply(JSON.parse(typeof e.data === 'string' ? e.data : new TextDecoder().decode(e.data))); } catch {} };
  ws.onclose = () => { KQ.ok = false; KQ.ws = null; setTimeout(kConnect, Math.min(30000, 1000 * 2 ** (KQ.retry++))); };
  ws.onerror = () => { try { ws.close(); } catch {} };
}
const kPx = code => (KP[code] && KP[code].p) || 0;
const kFresh = code => KP[code] && Date.now() - KP[code].t < 15000;
const kLive = () => Date.now() - KQ.last < 6000;
// 코인 가격 표시: 업비트처럼 가격대에 맞는 소수점
function kWon(p) {
  if (!p) return '-';
  if (p >= 100) return Math.round(p).toLocaleString('ko-KR');
  if (p >= 1) return p.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  return (+p.toPrecision(4)).toLocaleString('ko-KR', { maximumFractionDigits: 8 });
}
const kQty = q => (q >= 1000 ? Math.round(q).toLocaleString('ko-KR') : (+q.toPrecision(6)).toLocaleString('ko-KR', { maximumFractionDigits: 8 }));
// 원화 금액: 1억 이상이면 억·만 단위
const krw = n => (Math.abs(n) >= 1e8 ? krwUnits(n) : Math.round(Math.abs(n)).toLocaleString('ko-KR')) + '원';
const signKrw = n => (n > 0 ? '+' : n < 0 ? '-' : '') + krw(Math.abs(n));
// 코인 로고: 업비트 공식 로고 이미지(우리 서버 용량 0, 브라우저가 업비트에서 바로 받아요). 못 받으면 글자 배지
const kBadge = c => logoBadge(`https://static.upbit.com/logos/${c.a}.png`, c.a, KCAT[c.c].c);

/* ───────── 내 원화 지갑 ───────── */
function kInit(p) {
  if (!p) return p;
  p.kHold ||= {}; p.kCost ||= {}; p.kFut ||= {}; p.uHold ||= {}; p.uCost ||= {}; p.bonds ||= {}; p.bCost ||= {}; p.bAt ||= {};
  return p;
}
const clone = o => JSON.parse(JSON.stringify(o));
// 원화 하나로 가요: 현금(cash)은 가상주식·게임·상점과 같은 지갑이에요.
// kAssets = 실제 시세 자산(코인 현물·선물, 미국주식, 구채). 총자산(worth)에 더해져요.
function kAssets(p) {
  if (!p) return 0;
  let v = 0;
  for (const [c, q] of Object.entries(p.kHold || {})) if (KC[c]) v += q * (kPx(c) || (p.kCost || {})[c] || 0);
  return Math.round(v + bondWorth(p) + futWorth(p) + usWorth(p));
}
const kWorth = p => worth(p, S.tick);
const kRoi = p => roiOf(p, kWorth(p));
const kRanking = () => ranking(S.tick);
function kPositions(p) {
  p = p || S.me; if (!p) return [];
  const out = [];
  Object.entries(p.kHold || {}).forEach(([c, q]) => { if (!KC[c] || !q) return; const pr = kPx(c) || p.kCost[c], principal = q * (p.kCost[c] || pr), value = q * pr * (1 - KFEE);
    out.push({ sym: c, kind: 'spot', label: '현물', principal, value, q }); });
  out.push(...fPositions(p, 'kFut'));
  out.forEach(x => { x.pnl = x.value - x.principal; x.pct = x.principal ? x.pnl / x.principal : 0; });
  return out.sort((a, b) => b.value - a.value);
}
async function kSave(me, before) { S.saving = true; const ok = await saveMe(me, before); S.saving = false; return ok; }

/* ───────── 구채: 25개 구마다 100장. 많이 팔릴수록 비싸지고, 시간 따라 시세도 출렁여요 ───────── */
// 땅값 순서. 1장 가격은 강남 1억 ~ 도봉 500만원 (시작 자금 10억의 10% ~ 0.5%)
const GU_RANK = ['강남구', '서초구', '송파구', '용산구', '성동구', '마포구', '영등포구', '종로구', '중구', '강동구', '광진구', '양천구', '동작구',
  '강서구', '서대문구', '성북구', '동대문구', '은평구', '관악구', '구로구', '노원구', '금천구', '중랑구', '강북구', '도봉구'];
const BOND_N = 100, BOND_SELL = 0.01, BOND_CURVE = 1.5;   // 다 팔리면 2.5배, 중도환매 수수료 1%
const BOND = {};
GU_RANK.forEach((g, i) => { BOND[g] = { gu: g, i, base: Math.round(1e8 * Math.pow(0.05, i / 24) / 1e5) * 1e5, cp: (3 + 5 * i / 24) / 1e4 }; }); // 시간당 이자 0.03%(강남) ~ 0.08%(도봉)
function bondSold(gu) { let n = 0; for (const p of Object.values(S.players)) if (p && p.name && p.bonds) n += p.bonds[gu] || 0; return n; }
const bondDrift = (gu, t) => { const k = 'bond1:' + gu + ':'; return 0.09 * vnoise(k + 'a', t / (6 * H)) + 0.035 * vnoise(k + 'b', t / 18e5) + 0.012 * vnoise(k + 'c', t / 12e4); };
// i번째 장(0부터)의 가격. 다음에 살 1장 = bondUnit(gu, 팔린 수)
const bondUnit = (gu, i, t = now()) => Math.round(BOND[gu].base * (1 + BOND_CURVE * Math.pow(Math.max(0, i) / BOND_N, 1.3)) * Math.exp(bondDrift(gu, t)) / 1000) * 1000;
function bondBuyCost(gu, n, sold = bondSold(gu)) { let s = 0; for (let j = 0; j < n; j++) s += bondUnit(gu, sold + j); return s; }
function bondSellGet(gu, n, sold = bondSold(gu)) { let s = 0; for (let j = 1; j <= n; j++) s += bondUnit(gu, sold - j); return Math.floor(s * (1 - BOND_SELL)); }
function bondWorth(p) { let v = 0; for (const [g, n] of Object.entries(p.bonds || {})) if (BOND[g] && n > 0) v += bondSellGet(g, n); return v; }
const bondChg = gu => Math.exp(bondDrift(gu, now()) - bondDrift(gu, now() - D)) - 1;  // 24시간 시세 변화(수요 제외)
// 구청장: 그 구 구채를 가장 많이 가진 사람. 같으면 먼저 산 사람
function guChief() {
  const top = {};
  for (const g of GU_RANK) {
    let best = null;
    for (const [id, p] of Object.entries(S.players)) {
      if (!p || !p.name) continue; const n = (p.bonds || {})[g] || 0; if (!n) continue;
      const at = (p.bAt || {})[g] || 0; if (!best || n > best.n || (n === best.n && at < best.at)) best = { id, n, at };
    }
    if (best) top[g] = best;
  }
  return top;
}
function bondHourly(p) { let v = 0; for (const [g, n] of Object.entries((p || {}).bonds || {})) if (BOND[g] && n > 0) v += n * bondUnit(g, bondSold(g) - 1) * BOND[g].cp; return v; }

/* ───────── 정기 처리: 구채 이자 ───────── */
async function kCoupon() {
  const m0 = S.me; if (!m0 || S.saving || S.readOnly) return;
  const h = Math.floor(now() / H);
  if (m0.cpH == null) { const me = clone(m0); me.cpH = h; await kSave(me, m0); return; }
  if (h <= m0.cpH) return;
  const hrs = Math.min(168, h - m0.cpH), amt = Math.round(bondHourly(m0) * hrs);
  const me = clone(m0); me.cpH = h; me.cash += amt; me.cpTotal = (me.cpTotal || 0) + amt;
  if (await kSave(me, m0) && amt > 0) { toast(`🏛️ 구채 이자 ${hrs > 1 ? `${hrs}시간치 ` : ''}+${krw(amt)}`); renderAll(); }
}
function kTick() {
  if (!kLive() && Date.now() - KQ.poll > 3000) kFetchTickers();
  uTick();
  if (S.me && !S.readOnly && S.loaded) { kCoupon(); fScan(); }
}

/* ───────── 거래 ───────── */
function kMax(m, sym) {
  const me = S.me; if (!me) return 0; const p = kPx(sym);
  if (m === 'buy') return Math.floor(me.cash / (1 + KFEE));
  if (m === 'sell') return Math.floor(((me.kHold || {})[sym] || 0) * p);
  return 0;
}
function kTradeCalc(sh) {
  const p = kPx(sh.sym), amt = Math.max(0, Math.floor(+sh.amt || 0)), me = S.me || {};
  if (sh.m === 'buy') { const q = p ? amt / (p * (1 + KFEE)) : 0; return { q, amt, fee: amt - q * p, ok: amt >= K_MIN && amt <= me.cash, line: `받을 수량 <b class="num">${kQty(q)} ${KC[sh.sym].a}</b>` }; }
  if (sh.m === 'sell') { const held = (me.kHold || {})[sh.sym] || 0; const q = sh.all ? held : Math.min(held, p ? amt / p : 0); const get = q * p * (1 - KFEE);
    return { q, amt: q * p, get, ok: q > 0 && q * p >= Math.min(K_MIN, held * p) && q <= held + 1e-12, line: `받을 금액 <b class="num">${krw(get)}</b>` }; }
  return { ok: false, line: '' };
}
async function kDoTrade() {
  const sh = S.sheet; if (!sh || !S.me || S.saving || S.readOnly) return;
  const sym = sh.sym, p = kPx(sym);
  if (!kFresh(sym)) { toast('시세를 받는 중이에요. 잠시 후 다시 눌러 주세요'); return; }
  const c = kTradeCalc(sh); if (!c.ok) return;
  const before = S.me, me = kInit(clone(before));
  if (sh.m === 'buy') { const h0 = me.kHold[sym] || 0; me.kCost[sym] = ((me.kCost[sym] || 0) * h0 + c.q * p) / (h0 + c.q); me.kHold[sym] = h0 + c.q; me.cash -= c.amt; }
  if (sh.m === 'sell') { me.kHold[sym] -= c.q; me.cash += c.get; if (me.kHold[sym] * p < 1) { delete me.kHold[sym]; delete me.kCost[sym]; } }
  me.cash = Math.round(me.cash);
  const ok = await kSave(me, before);
  if (!ok) return;
  const n = KC[sym].n;
  if (sh.m === 'buy') { addFeed({ kind: 'k_buy', sym, amt: c.amt }); toast(`🛒 ${n} ${krw(c.amt)} 매수!`); showMine('coin'); return; }
  if (sh.m === 'sell') { const pnl = Math.round(c.get - c.q * ((before.kCost || {})[sym] || p)); addFeed({ kind: 'k_sell', sym, amt: Math.round(c.get), pnl }); toast(`💸 ${n} 매도 · ${signKrw(pnl)}`); if (pnl > 0) bigWin(pnl); }
  sh.amt = ''; sh.all = false; renderAll(); renderSheet();
}
const canKRescue = () => S.me && !S.readOnly && kWorth(S.me) < K_RESCUE_AT;
async function kRescue() {
  if (!canKRescue() || S.saving) return;
  const before = S.me, me = clone(before); me.cash += K_RESCUE; me.inflow = (me.inflow || CASH0) + K_RESCUE; me.kResN = (me.kResN || 0) + 1;
  if (await kSave(me, before)) { addFeed({ kind: 'k_rescue' }); toast('💸 파산 지원금 1,000만원이 들어왔어요'); renderAll(); }
}
async function bondTrade(gu, side, n) {
  if (!S.me || S.saving || S.readOnly || !BOND[gu] || !(n > 0)) return;
  const sold = bondSold(gu), held = (S.me.bonds || {})[gu] || 0;
  const before = S.me, me = kInit(clone(before));
  if (side === 'buy') {
    if (sold + n > BOND_N) { toast(`남은 구채가 ${BOND_N - sold}장뿐이에요`); return; }
    const cost = bondBuyCost(gu, n, sold); if (cost > me.cash) { toast(`원화가 ${krw(cost - me.cash)} 부족해요`); return; }
    me.bCost[gu] = ((me.bCost[gu] || 0) * held + cost) / (held + n); me.bonds[gu] = held + n; if (!held) me.bAt[gu] = now(); me.cash -= cost;
    if (me.cpH == null) me.cpH = Math.floor(now() / H);
    if (await kSave(me, before)) { addFeed({ kind: 'k_bond', gu, n, amt: cost }); const ch = guChief()[gu]; toast(ch && ch.id === S.uid ? `👑 ${gu}청장이 됐어요!` : `🏛️ ${gu} 구채 ${n}장 매입`); if (ch && ch.id === S.uid) confetti(); showMine('bond'); }
  } else {
    if (n > held) return; const get = bondSellGet(gu, n, sold);
    me.bonds[gu] = held - n; me.cash += get; if (!me.bonds[gu]) { delete me.bonds[gu]; delete me.bCost[gu]; delete me.bAt[gu]; }
    if (await kSave(me, before)) { addFeed({ kind: 'k_bsell', gu, n, amt: get }); toast(`🏛️ ${gu} 구채 ${n}장 환매 · ${krw(get)}`); renderAll(); renderSheet(); }
  }
}

/* ───────── 연습봇: 원화 지갑도 채워요 ───────── */
function kBotSeed(bots) {
  const plan = [{ '강남구': 3, '마포구': 4, '노원구': 6 }, { '서초구': 2, '용산구': 3, '송파구': 2 }, { '강남구': 2, '성동구': 5, '도봉구': 9 }];
  Object.values(bots).forEach((p, i) => {
    p.cash = CASH0; p.inflow = CASH0;
    kInit(p); p.bonds = plan[i] || {}; p.bAt = Object.fromEntries(Object.keys(p.bonds).map((g, j) => [g, S.season.start + i * 1000 + j]));
    let spent = 0; Object.entries(p.bonds).forEach(([g, n]) => { const b = BOND[g]; spent += b.base * n * 1.05; p.bCost[g] = b.base * 1.05; });
    p.cash -= Math.round(spent); p.kWant = [['KRW-BTC', 'KRW-SOL'], ['KRW-ETH', 'KRW-DOGE'], ['KRW-XRP', 'KRW-PEPE']][i];
  });
}
function kOnFirstPrices() {
  Object.values(S.players).forEach(p => {
    if (!p || !p.bot || !p.kWant) return;
    p.kWant.forEach((c, j) => { const pr = kPx(c); if (!pr) return; const amt = [1.2e8, 6e7][j]; p.kHold[c] = amt / pr; p.kCost[c] = pr * (j ? 1.04 : 0.97); p.cash -= amt; });
    delete p.kWant;
  });
}

/* ───────── 화면: 코인(원화) 탭 ─────────
   박스는 줄이고: 요약 한 줄 → [전체 | 보유] 탭 → 분류·정렬 드롭다운 두 개 → 목록.
   드롭다운은 바뀔 때만 다시 그리고, 목록만 1초마다 다시 그려요 (펼친 목록이 안 닫히게) */
const K_SORTS = { v: '거래대금순', pd: '가격 높은순', pa: '가격 낮은순', cd: '많이 오른순', ca: '많이 내린순' };
function kRow(c) {
  const o = KP[c.id] || {}, p = o.p || 0, ch = o.c || 0, me = S.me;
  const prev = KQ.shown[c.id]; const fl = prev && p && p !== prev ? (p > prev ? 'u' : 'd') : ''; KQ.shown[c.id] = p;
  const mp = me ? kPositions(me).filter(y => y.sym === c.id) : [], sp = mp.find(y => y.kind === 'spot'), fu = mp.find(y => y.kind === 'fut');
  const pnl = mp.reduce((a, y) => a + y.pnl, 0), P = mp.reduce((a, y) => a + y.principal, 0);
  const sub = mp.length ? (fu ? `<span class="postag ${fu.d > 0 ? 'long' : 'short'}">${fu.label}</span> ` : '') + (sp ? `<span class="mine">${kQty(sp.q)} ${c.a}</span> ` : '') + `<b class="rowpnl ${cls(pnl)}">${signKrw(pnl)} (${pctTxt(P ? pnl / P : 0)})</b>`
    : `<span class="tk">${c.a}</span>${o.v ? ` · ${krwUnits(o.v)}` : ''}`;
  return `<div class="srow${fl ? ' row f' + fl : ''}"><button class="srow-main" type="button" data-kcoin="${c.id}">${kBadge(c)}<span class="sname"><b>${esc(c.n)}</b><small>${sub}</small></span>
    <span class="sprice"><div class="p num${fl ? ' f' + fl : ''}">${p ? kWon(p) : '…'}</div><div class="c num ${cls(ch)}">${p ? (ch > 0 ? '+' : '') + (ch * 100).toFixed(2) + '%' : ''}</div></span></button>
    <span class="tbtns"><button class="tb trade${mp.length ? ' lit' : ''}" type="button" data-kcoin="${c.id}">거래</button></span></div>`;
}
function renderCoins(ctl) { renderExchange(ctl); }   // 거래소 탭(코인 | 주식 | 내 보유)은 us.js

/* ───────── 화면: 코인 거래 시트 ───────── */
// 코인 차트: 업비트 15분봉 96개 = 최근 24시간
async function kLoadChart(sym) {
  const ent = KQ.chart[sym]; if (ent && Date.now() - ent.t < 60e3) return;
  KQ.chart[sym] = { t: Date.now(), pts: ent ? ent.pts : null };
  try { const a = await (await fetch(`${UPBIT}/candles/minutes/15?market=${sym}&count=96`)).json();
    KQ.chart[sym] = { t: Date.now(), pts: a.reverse().map(c => [Date.parse(c.candle_date_time_utc + 'Z'), c.trade_price]) }; kDrawChart(); } catch {}
}
function kDrawChart() {
  const cv = $('#kChart'), sh = S.sheet; if (!cv || !sh || !sh.sym) return; const ent = KQ.chart[sh.sym]; if (!ent || !ent.pts || !ent.pts.length) return;
  const pts = ent.pts.slice(), p = kPx(sh.sym), o = KP[sh.sym] || {}; if (p) pts.push([now(), p]);
  drawTChart(cv, pts, { t0: now() - D, t1: now(), base: o.p ? o.p / (1 + (o.c || 0)) : undefined, fmt: kWon, stepH: 6 });
}
function renderKCoinSheet(b, sh) {
  const c = KC[sh.sym], o = KP[sh.sym] || {}, me = S.me;
  if (sh.m !== 'sell' && sh.m !== 'fut') sh.m = 'buy'; sh.fd ||= 1; sh.fx ||= 10;
  const held = me && (me.kHold || {})[c.id], avg = held ? me.kCost[c.id] : 0;
  const holders = activePlayers().filter(p => ((p.kHold || {})[c.id] || 0) * (o.p || 0) >= 10000);
  const canTrade = me && !S.readOnly;
  const modes = [['buy', '매수'], ['sell', '매도'], ['fut', '선물 롱·숏']];
  b.innerHTML = `<div class="shead">${kBadge(c)}<div><h3>${esc(c.n)}</h3><small>${c.a} · ${KCAT[c.c].n} · 업비트 원화마켓</small></div></div>
    <div class="bigp"><div class="p num" id="kLivePrice">${o.p ? kWon(o.p) + '원' : '…'}</div><div class="c num"><span class="${cls(o.c || 0)}" id="kLivePct">어제보다 ${o.p ? ((o.c > 0 ? '+' : '') + ((o.c || 0) * 100).toFixed(2) + '%') : ''}</span></div></div>
    <div class="chartbox"><canvas class="chart" id="kChart" aria-label="최근 24시간 차트"></canvas><i class="cpulse"></i></div>
    ${holdersHTML(c.id)}
    <div class="info info3"><div>24시간 거래대금<b class="num">${o.v ? krwUnits(o.v) : '-'}</b></div>
      <div>내 보유<b class="num">${held ? kQty(held) + ' ' + c.a : '-'}</b></div><div>평단<b class="num">${avg ? kWon(avg) + '원' : '-'}</b></div></div>
    ${canTrade ? `<div class="seg seg3">${modes.map(([m, l]) => `<button type="button" data-km="${m}" aria-pressed="${sh.m === m}">${l}</button>`).join('')}</div>
      ${sh.m === 'fut' ? fFormHTML(sh) : `<div class="qtyrow kamt"><input id="kAmt" type="number" inputmode="numeric" min="0" step="1000" value="${sh.amt || ''}" placeholder="${sh.m === 'sell' ? '팔 금액(원)' : '주문 금액(원)'}" aria-label="금액"><span class="unit">원</span></div>
      <div class="quick">${[['.1', '10%'], ['.25', '25%'], ['.5', '50%'], ['1', '최대']].map(([f, l]) => `<button type="button" data-kfrac="${f}">${l}</button>`).join('')}</div>
      <div class="est" id="kEst"></div>
      <button class="cta" id="kDoTrade" type="button">매수하기</button>
      <p class="hint" id="kHint"></p>`}` : `<p class="hint">${S.readOnly ? '관전 중이라 거래할 수 없어요.' : '참가하면 거래할 수 있어요.'}</p>`}`;
  kLoadChart(c.id); requestAnimationFrame(kDrawChart); kUpdateEst();
}
function kUpdateEst() {
  const sh = S.sheet; if (!sh || sh.type !== 'kcoin') return; const est = $('#kEst'), btn = $('#kDoTrade'); if (!est || !btn) return;
  const i = $('#kAmt'); if (i && !sh.all) sh.amt = i.value;
  if (sh.m === 'fut') { fUpdateEst(sh); return; }
  const c = kTradeCalc(sh), mx = kMax(sh.m, sh.sym);
  est.innerHTML = `<span>${c.line || ''}</span><span class="num">최대 ${krw(mx)}</span>`;
  btn.textContent = S.saving ? '처리 중…' : sh.m === 'sell' ? '매도하기' : '매수하기';
  btn.className = 'cta ' + (sh.m === 'sell' ? 'sell' : 'buy');
  btn.disabled = S.saving || !c.ok || !kFresh(sh.sym);
  $('#kHint').textContent = sh.m === 'sell' ? '판 돈은 바로 원화로 들어와요.' : '업비트 현재가로 바로 체결돼요. 최소 5,000원.';
}
function kLiveSheet() {
  uLiveSheet(); if (S.sheet && S.sheet.type === 'mine') renderSheet();
  const sh = S.sheet; if (!sh || sh.type !== 'kcoin') return; const o = KP[sh.sym] || {};
  const lp = $('#kLivePrice'), pc = $('#kLivePct');
  if (lp && o.p) flashText(lp, kWon(o.p) + '원');
  if (pc && o.p) { pc.className = 'num ' + cls(o.c || 0); pc.textContent = '어제보다 ' + ((o.c > 0 ? '+' : '') + ((o.c || 0) * 100).toFixed(2) + '%'); }
  kDrawChart(); kUpdateEst();
}

/* ───────── 화면: 구채 탭 ───────── */
function chiefColor(uid) { return uid === S.uid ? '#1f6feb' : avaColor(uid); }
function bondMapSVG() {
  const top = guChief(), mine = new Set(Object.keys((S.me || {}).bonds || {}));
  const fills = DISTRICTS.map(d => { const ch = top[d.n], u = ch && ch.id;
    return `<path d="${d.d}" data-bgu="${d.n}" class="bgu${mine.has(d.n) ? ' mine' : ''}" fill="${!u ? '#ebeef4' : chiefColor(u)}" fill-opacity="${u ? (u === S.uid ? .55 : .38) : 1}" stroke="#fff" stroke-width="2.5"/>`; }).join('');
  const labels = DISTRICTS.map((d, i) => { const ch = top[d.n];
    return ch ? `<g transform="translate(${d.c[0]},${d.c[1]}) scale(1.6)" pointer-events="none">${stampInner(ch.id, 'bst' + i)}</g>` : `<text x="${d.c[0]}" y="${d.c[1] + 5}" class="bgn" pointer-events="none">${d.n.replace(/구$/, '')}</text>`; }).join('');
  return `<svg viewBox="0 30 866 715" class="bmap" role="img" aria-label="구청장 지도">${fills}${labels}</svg>`;
}
function bondsHTML() {
  const me = S.me, top = guChief();
  const myN = Object.values((me || {}).bonds || {}).reduce((a, n) => a + n, 0), myV = me ? bondWorth(me) : 0;
  const myCost = me ? Object.entries(me.bonds || {}).reduce((a, [g, n]) => a + n * ((me.bCost || {})[g] || 0), 0) : 0;
  const chiefOf = me ? GU_RANK.filter(g => top[g] && top[g].id === S.uid) : [];
  const nextH = (Math.floor(now() / H) + 1) * H;
  let h = `<div class="card bhero"><div class="bh-t"><span class="k">구채 · 원화로 사요</span><h2>구청장 자리를 차지하세요</h2><small>구마다 구채가 100장뿐이에요. 가장 많이 가진 사람이 구청장이 되고, 팔릴수록 값이 올라요.</small></div>
    ${me ? `<div class="bh-row"><div><small>내 구채</small><b class="num">${myN}장</b></div><div><small>평가액</small><b class="num">${krw(myV)}</b>${myCost ? `<span class="num ${cls(myV - myCost)}">${signKrw(myV - myCost)}</span>` : ''}</div><div><small>시간당 이자 <span class="num" id="cpCd">${mmss(nextH - now())}</span></small><b class="num up">+${krw(bondHourly(me))}</b></div></div>
    ${chiefOf.length ? `<div class="bh-chief">👑 ${chiefOf.join(' · ')}청장</div>` : ''}` : ''}</div>
    <div class="card bmapbox">${bondMapSVG()}</div>
    <div class="sec"><div class="sec-h"><h2>25개 구</h2><small>다음 1장 가격</small></div><div class="slist">`;
  GU_RANK.forEach((g, i) => {
    const sold = bondSold(g), p = bondUnit(g, sold), ch = top[g], mineN = ((me || {}).bonds || {})[g] || 0, chg = bondChg(g);
    const need = ch && ch.id !== S.uid ? ch.n - mineN + 1 : 0;
    h += `<button class="srow-main brow" type="button" data-bond="${g}"><span class="logo-b bb" style="background:${ch ? chiefColor(ch.id) : '#c9cfdb'}">${i + 1}</span>
      <span class="sname"><b>${g}${mineN ? ` <span class="mine">${mineN}장</span>` : ''}</b><small>${ch ? `👑 ${esc(ch.id === S.uid ? '나' : nameOf(ch.id))} ${ch.n}장${need > 0 && need <= BOND_N - sold ? ` · ${need}장이면 역전` : ''}` : '구청장 없음 · 1장이면 구청장'}</small>
      <span class="bbar"><i style="width:${sold}%"></i></span></span>
      <span class="sprice"><div class="p num">${krw(p)}</div><div class="c num ${cls(chg)}">${pctTxt(chg)} · ${sold}/${BOND_N}</div></span></button>`;
  });
  h += `</div><p class="hint">1장 값 = 기본값 × 팔린 비율만큼 최대 2.5배 × 시세 출렁임. 매시간 정각에 이자가 원화로 들어와요(강남 0.03% ~ 도봉 0.08%). 팔 때 1% 수수료가 붙어요. 구청장 혜택은 전투 업데이트 때 스탯 보너스로 붙어요.</p></div>`;
  return h;
}
function renderBondSheet(b, sh) {
  const g = sh.gu, bd = BOND[g], sold = bondSold(g), me = S.me, held = ((me || {}).bonds || {})[g] || 0, ch = guChief()[g];
  if (!sh.n) sh.n = 1; sh.side ||= 'buy';
  const maxBuy = BOND_N - sold, n = Math.max(1, Math.min(sh.n, sh.side === 'buy' ? Math.max(1, maxBuy) : Math.max(1, held)));
  sh.n = n;
  const cost = sh.side === 'buy' ? bondBuyCost(g, n, sold) : bondSellGet(g, n, sold);
  const avg = held ? me.bCost[g] : 0, val = held ? bondSellGet(g, held, sold) : 0;
  const holders = activePlayers().filter(p => ((p.bonds || {})[g] || 0) > 0).sort((a, c) => c.bonds[g] - a.bonds[g]);
  const ok = me && !S.readOnly && !S.saving && (sh.side === 'buy' ? n <= maxBuy && cost <= me.cash : n <= held);
  b.innerHTML = `<div class="shead"><span class="logo-b bb" style="background:${ch ? chiefColor(ch.id) : '#c9cfdb'}">${bd.i + 1}</span><div><h3>${g} 구채</h3><small>땅값 ${bd.i + 1}위 · 시간당 이자 ${(bd.cp * 100).toFixed(3)}%</small></div></div>
    <div class="bigp"><div class="p num" id="bLivePrice">${krw(bondUnit(g, sold))}</div><div class="c num"><span class="${cls(bondChg(g))}">24시간 ${pctTxt(bondChg(g))}</span> <span class="dim">· ${sold}/${BOND_N}장 팔림</span></div></div>
    <div class="chartbox"><canvas class="chart" id="bChart" aria-label="24시간 구채 시세"></canvas><i class="cpulse"></i></div>
    <div class="info"><div>👑 구청장<b>${ch ? esc(ch.id === S.uid ? '나' : nameOf(ch.id)) + ` · ${ch.n}장` : '없음'}</b></div><div>내 보유<b class="num">${held ? held + '장' : '-'}</b></div>
      <div>평단<b class="num">${avg ? krw(avg) : '-'}</b></div><div>지금 팔면<b class="num ${held ? cls(val - avg * held) : ''}">${held ? krw(val) : '-'}</b></div></div>
    ${holders.length ? `<div class="bholders">${holders.slice(0, 5).map((p, i) => `<span>${i ? '' : '👑 '}${esc(p.id === S.uid ? '나' : p.name)} <b class="num">${p.bonds[g]}장</b></span>`).join('')}</div>` : ''}
    ${me && !S.readOnly ? `<div class="seg"><button type="button" data-bside="buy" aria-pressed="${sh.side === 'buy'}">매입</button><button type="button" data-bside="sell" aria-pressed="${sh.side === 'sell'}" ${held ? '' : 'disabled'}>환매</button></div>
    <div class="qtyrow"><button type="button" data-bstep="-1" aria-label="줄이기">−</button><input id="bQty" type="number" inputmode="numeric" min="1" value="${n}" aria-label="장 수"><button type="button" data-bstep="1" aria-label="늘리기">+</button></div>
    <div class="quick">${(sh.side === 'buy' ? [1, 5, 10, 'max'] : [1, 5, 10, 'all']).map(v => `<button type="button" data-bset="${v}">${v === 'max' ? '최대' : v === 'all' ? '전부' : v + '장'}</button>`).join('')}</div>
    <div class="est"><span>${sh.side === 'buy' ? '필요 금액' : '받을 금액'} <b class="num">${krw(cost)}</b></span><span class="num">${sh.side === 'buy' ? `내 원화 ${krw(me.cash)}` : `보유 ${held}장`}</span></div>
    <button class="cta ${sh.side === 'buy' ? 'buy' : 'sell'}" id="bDo" type="button" ${ok ? '' : 'disabled'}>${sh.side === 'buy' ? `${n}장 매입하기` : `${n}장 환매하기`}</button>
    <p class="hint">${sh.side === 'buy' ? '한 장 살 때마다 다음 장이 조금씩 비싸져요. 먼저 산 사람이 유리해요.' : '팔면 다음 장 값이 내려가요. 수수료 1%.'}</p>` : ''}`;
  requestAnimationFrame(() => { const cv = $('#bChart'); if (cv) drawTChart(cv, Array.from({ length: 97 }, (_, i) => { const t = now() - (96 - i) * 9e5; return [t, bondUnit(g, sold, t)]; }), { t0: now() - D, t1: now(), fmt: v => krwUnits(v), stepH: 6 }); });
}
function bondMaxBuy(g) { const sold = bondSold(g), me = S.me; let n = 0, s = 0; while (sold + n < BOND_N) { const u = bondUnit(g, sold + n); if (s + u > me.cash) break; s += u; n++; } return n; }

/* ───────── 소식 문구 ───────── */
function kFeedText(f) {
  const nm = esc(nameOf(f.uid)), c = f.sym && KC[f.sym];
  switch (f.kind) {
    case 'k_buy': return c ? ['up', '🛒', `<b>${nm}</b>님이 ${esc(c.n)}을(를) <b>${krw(f.amt)}</b>어치 샀어요`] : null;
    case 'k_sell': return c ? (f.pnl >= 1e8 ? ['up', '💰', `<b>${nm}</b>님이 ${esc(c.n)}로 <b class="up">${signKrw(f.pnl)}</b> 벌었어요`] : ['down', '💸', `<b>${nm}</b>님이 ${esc(c.n)}을(를) <b>${krw(f.amt)}</b>어치 팔았어요`]) : null;
    case 'k_fopen': { const c2 = KC[f.sym] || UC[f.sym]; return c2 ? [f.d > 0 ? 'up' : 'down', f.d > 0 ? '🚀' : '📉', `<b>${nm}</b>님이 ${esc(c2.n)} <b>${f.x}배 ${f.d > 0 ? '롱' : '숏'}</b> 진입 (${krw(f.amt)})`] : null; }
    case 'k_fclose': { const c2 = KC[f.sym] || UC[f.sym]; return c2 ? [f.pnl >= 0 ? 'up' : 'down', f.pnl >= 0 ? '🤑' : '😭', `<b>${nm}</b>님이 ${esc(c2.n)} ${f.x}배 ${f.d > 0 ? '롱' : '숏'} 종료 <b class="${cls(f.pnl)}">${signKrw(f.pnl)}</b>`] : null; }
    case 'k_fliq': { const c2 = KC[f.sym] || UC[f.sym]; return c2 ? ['down', '💀', `<b>${nm}</b>님 ${esc(c2.n)} <b>${f.x}배 ${f.d > 0 ? '롱' : '숏'} 청산</b> <b class="down">-${krw(f.amt)}</b>`] : null; }
    case 'k_ubuy': return UC[f.sym] ? ['up', '🇺🇸', `<b>${nm}</b>님이 ${esc(UC[f.sym].n)}을(를) <b>${krw(f.amt)}</b>어치 샀어요`] : null;
    case 'k_usell': return UC[f.sym] ? [f.pnl >= 0 ? 'up' : 'down', '🇺🇸', `<b>${nm}</b>님이 ${esc(UC[f.sym].n)}을(를) 팔았어요 <b class="${cls(f.pnl)}">${signKrw(f.pnl)}</b>`] : null;
    case 'k_atk': { const a = KC[f.sym] || UC[f.sym], tn = esc(nameOf(f.target)), an = a ? esc(a.n) : '';
      if (!f.ok) return ['gold', '🛡️', `<b>${tn}</b>님이 <b>${nm}</b>님의 ${an} 공격을 막았어요 · 위자료 <b class="up">+${krw(Math.floor(f.cost / 2))}</b>`];
      return f.type === 'loot' ? ['up', '💰', `<b>${nm}</b>님이 <b>${tn}</b>님의 ${an} 수익 <b class="up">${krw(f.gain)}</b> 약탈!`]
        : f.exec ? ['down', '☠️', `<b>${nm}</b>님이 <b>${tn}</b>님 ${an} <b>참수!</b> 현상금 <b class="up">${krw(f.gain)}</b>`]
        : ['up', '🎯', `<b>${nm}</b>님이 <b>${tn}</b>님 ${an} 증거금 <b class="up">${krw(f.gain)}</b> 사냥`]; }
    case 'k_bond': return ['gold', '🏛️', `<b>${nm}</b>님이 ${esc(f.gu)} 구채 <b>${f.n}장</b>을 샀어요`];
    case 'k_bsell': return ['down', '🏛️', `<b>${nm}</b>님이 ${esc(f.gu)} 구채 ${f.n}장을 팔았어요`];
    case 'k_rescue': return ['down', '🆘', `<b>${nm}</b>님이 파산해서 지원금을 받았어요`];
    default: return null;
  }
}

/* ───────── 시트 · 클릭 연결 ───────── */
const KSHEETS = { mine: renderMineSheet, us: renderUSSheet, kcoin: renderKCoinSheet, bond: renderBondSheet };
function kClick(t) {
  const d = t.dataset;
  if (d.kcoin) { if (!S.me && !S.readOnly) { openSheet('join'); return true; } if (S.sheet) closeSheetRaw(); openSheet('kcoin', { sym: d.kcoin, m: 'buy' }); return true; }
  if (false && d.fxinfo) { toast(`💵 지금 1달러 = ${FX.p.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}원. 주식을 살 때 이 환율로 자동 환전돼요`); return true; }
  if (d.us) { if (!S.me && !S.readOnly) { openSheet('join'); return true; } if (S.sheet) closeSheetRaw(); openSheet('us', { sym: d.us, m: 'buy' }); return true; }
  if (d.xmkt) { S.xMkt = d.xmkt; renderExchange(true); return true; }
  if (d.mtab) { S.sheet.tab = d.mtab; S.qsArm = null; renderSheet(); $('#sheetWrap .sheet').scrollTop = 0; return true; }
  if (d.qs) { quickSell(d.qs); return true; }
  if (d.mgo) { closeSheet(); S.xMkt = d.mgo; goTab('coin'); renderExchange(true); return true; }
  if (d.xsell) { const [type, sym] = d.xsell.split(':'); if (S.sheet) closeSheetRaw(); openSheet(type, { sym, m: 'sell', all: true }); const sh = S.sheet; sh.amt = String(type === 'us' ? uCalc(sh).max : kMax('sell', sym)); renderSheet(); return true; }
  if (d.xfut) { const [type, sym] = d.xfut.split(':'); if (S.sheet) closeSheetRaw(); openSheet(type, { sym, m: 'fut' }); return true; }
  if (d.fdir) { S.sheet.fd = +d.fdir; renderSheet(); return true; }
  if (d.flev) { S.sheet.fx = +d.flev; renderSheet(); return true; }
  if (d.kown) { S.kOwn = d.kown; document.querySelectorAll('[data-kown]').forEach(b => b.setAttribute('aria-selected', b.dataset.kown === S.kOwn)); renderCoins(); return true; }
  if (d.km) { S.sheet.m = d.km; S.sheet.amt = ''; S.sheet.all = false; renderSheet(); return true; }
  if (d.kfrac && S.sheet.m === 'fut') { const sh = S.sheet; S.futPct = +d.kfrac; LS.set('futPct', S.futPct); sh.amtTouched = false; renderSheet(); return true; }   // 롱·숏: 비율을 기억해 두고 자동으로 채워요
  if (d.kfrac) { const sh = S.sheet, f = +d.kfrac, mx = sh.type === 'us' ? uCalc(sh).max : sh.m === 'fut' ? fMax(sh) : kMax(sh.m, sh.sym); sh.all = sh.m === 'sell' && f === 1; sh.amt = String(Math.floor(mx * f)); const i = $('#kAmt'); if (i) i.value = sh.amt; kUpdateEst(); uUpdateEst(); return true; }
  if (d.bond) { if (!S.me && !S.readOnly) { openSheet('join'); return true; } openSheet('bond', { gu: d.bond, side: 'buy', n: 1 }); return true; }
  if (d.bside) { S.sheet.side = d.bside; S.sheet.n = 1; renderSheet(); return true; }
  if (d.bstep) { S.sheet.n = Math.max(1, (S.sheet.n || 1) + +d.bstep); renderSheet(); return true; }
  if (d.bset) { const sh = S.sheet, g = sh.gu; sh.n = d.bset === 'max' ? Math.max(1, bondMaxBuy(g)) : d.bset === 'all' ? ((S.me.bonds || {})[g] || 1) : +d.bset; renderSheet(); return true; }
  switch (t.id) {
    case 'kDoTrade': if (S.sheet.m === 'fut') fOpen(); else if (S.sheet.type === 'us') uDoTrade(); else kDoTrade(); return true;
    case 'mineFab': showMine(S.xMkt); return true;
    case 'fClose': fClose(t.dataset.sym); return true;
    case 'bDo': bondTrade(S.sheet.gu, S.sheet.side, S.sheet.n); return true;
    case 'kRescueBtn': kRescue(); return true;
  }
  return false;
}
document.addEventListener('input', e => {
  if (e.target.id === 'kAmt' && S.sheet) { S.sheet.all = false; if (S.sheet.m === 'fut') { S.sheet.amtTouched = true; document.querySelectorAll('.fpct [data-kfrac]').forEach(b => b.setAttribute('aria-pressed', 'false')); } kUpdateEst(); uUpdateEst(); }
  if (e.target.id === 'bQty' && S.sheet) { S.sheet.n = Math.max(1, Math.floor(+e.target.value || 1)); clearTimeout(S.bqT); S.bqT = setTimeout(renderSheet, 500); }
});
document.addEventListener('change', e => { if (e.target.id === 'xCat') { S[{ us: 'uCat', coin: 'kCat', cm: 'cCat' }[S.xMkt]] = e.target.value; renderExchange(); } if (e.target.id === 'xSort') { S[{ us: 'uSortKey', coin: 'kSortKey', cm: 'cSortKey' }[S.xMkt]] = e.target.value; renderExchange(); } });
document.addEventListener('click', e => { const g = e.target.closest && e.target.closest('[data-bgu]'); if (g) { if (!S.me && !S.readOnly) { openSheet('join'); return; } openSheet('bond', { gu: g.dataset.bgu, side: 'buy', n: 1 }); } });
kFetchTickers(); kConnect();
