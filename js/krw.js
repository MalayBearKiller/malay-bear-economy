'use strict';
/* ═════════ 업비트 코인 (게임 가격은 gm.js) · 돈은 원화 하나 ═════════ */
const K_RESCUE = 1_000_000_000, K_RESCUE_AT = 100_000_001; // 총자산 1억원 이하면 파산 지원금 10억원
const KFEE = 0.0005, K_MIN = 5000;        // 업비트 수수료 0.05%, 최소 주문 5,000원
const KCOINS = [
  ['BTC', '비트꼬인', 'major'], ['ETH', '이더리음', 'major'], ['XRP', '리뿔', 'major'], ['SOL', '쏠라나', 'major'], ['TRX', '트롱', 'major'],
  ['ADA', '에이따', 'major'], ['BCH', '비트꼬인캐쉬', 'major'], ['ETC', '이더리음클래식', 'major'], ['LINK', '체인링꾸', 'major'], ['XLM', '스텔라루맨', 'major'], ['HBAR', '헤대라', 'major'],
  ['AVAX', '아발랑쉬', 'l1'], ['DOT', '폴카땃', 'l1'], ['SUI', '쑤이', 'l1'], ['APT', '앱토쓰', 'l1'], ['NEAR', '니어리', 'l1'], ['SEI', '쎄이', 'l1'], ['ICP', '인터넷컴퓨타', 'l1'],
  ['UNI', '유니스웝', 'defi'], ['AAVE', '에이부', 'defi'], ['ARB', '아비트롬', 'defi'], ['OP', '옵티미증', 'defi'], ['POL', '폴리공', 'defi'], ['ENA', '에테냐', 'defi'], ['ONDO', '온도파이낸쓰', 'defi'],
  ['DOGE', '도지꼬인', 'meme'], ['SHIB', '시바견', 'meme'], ['PEPE', '뻬뻬', 'meme'], ['WIF', '도그위드햇', 'meme'], ['TRUMP', '오피셜트럼뿌', 'meme'], ['PENGU', '뚱지펭귄', 'meme'],
];
const KCAT = { major: { n: '메이저', c: '#f08c00' }, l1: { n: '레이어1', c: '#5b4bd6' }, defi: { n: '디파이', c: '#0e9f6e' }, meme: { n: '밈', c: '#e8384f' } };
const KC = {}; KCOINS.forEach(([a, n, c]) => { KC['KRW-' + a] = { id: 'KRW-' + a, a, n, c }; });
const KP = {};                             // 마켓 → { p 현재가, c 전일 대비, v 24시간 거래대금, t 받은 시각 }
const KQ = { ws: null, ok: false, last: 0, retry: 0, poll: 0, shown: {}, flash: {}, chart: {}, first: false };

/* ───────── 시세: 업비트 웹소켓 (안 되면 2~3초마다 REST) ───────── */
const UPBIT = 'https://api.upbit.com/v1';
// 업비트 REST는 브라우저(Origin) 요청 제한이 빡빡해서, 한 번에 하나씩 1.5초 간격으로 보내요 (넘치면 한동안 다 막혀요)
const UQUEUE = { last: 0, chain: Promise.resolve() };
function upFetch(url) { const p = UQUEUE.chain.then(async () => { const wait = UQUEUE.last + 1500 - Date.now(); if (wait > 0) await new Promise(r => setTimeout(r, wait)); UQUEUE.last = Date.now(); return fetch(url); }); UQUEUE.chain = p.catch(() => {}); return p; }
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
    const r = await upFetch(UPBIT + '/ticker?markets=' + Object.keys(KC).join(','));
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
const kRaw = code => (KP[code] && KP[code].p) || 0;                                        // 진짜 업비트 가격
const kPx = code => { const o = KP[code]; return o && o.p ? o.p * gmMult(code, now(), o.c) : 0; };   // 게임 가격 (gm.js)
const kBase = code => { const o = KP[code]; return o && o.p ? o.p / (1 + (o.c || 0)) : 0; };      // 어제 종가(진짜)
const kChgG = code => { const b = kBase(code); return b ? kPx(code) / b - 1 : 0; };               // 게임 가격 기준 등락률
const kFresh = code => GM.ready && KP[code] && Date.now() - KP[code].t < 15000;
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
  return Math.round(v + bondWorth(p) + futWorth(p) + usWorth(p) + gHoldWorth(p));
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

// 💵 지원금: 2시간마다(한국 시간 짝수 시 정각) 420만원 = 하루 약 5,000만원. 앱을 꺼 둬도 쌓여요(최대 7일치).
// 처음 받는 사람은 지금부터 세요(지난 시간은 소급 안 해요). 받은 돈은 수익률 기준(inflow)에도 더해요.
const STIP = 4_200_000, STIP_MS = 2 * H, STIP_MAX = 84;
const stipSlot = (t = now()) => Math.floor((t + KST) / STIP_MS);
const stipNext = () => (stipSlot() + 1) * STIP_MS - KST;
// 🎁 시작 자금 10억 → 50억 상향(2026-11-12): 그 전에 참가한 사람은 각자 앱을 열 때 한 번만 +40억 (g40 표시로 두 번 안 받아요)
// 남의 지갑은 못 고치니까 본인 앱이 스스로 넣어요. 받은 돈은 수익률 기준(inflow)에도 더해요.
const G40 = 4_000_000_000;
async function kGrant40() {
  const m0 = S.me; if (!m0 || m0.g40 || S.saving || S.readOnly) return;
  const me = clone(m0); me.g40 = 1; me.cash = Math.round((me.cash || 0) + G40); me.inflow = (me.inflow || 1_000_000_000) + G40;
  if (await kSave(me, m0)) { bigWin(G40, '🎁 시작 자금 상향! 40억 지급'); renderAll(); }
}
// 🎁 리셋 뒤 시작 자금 20억 → 50억(2026-11-12): 그 전에 참가한 사람은 앱을 열 때 한 번만 +30억 (g30 표시로 두 번 안 받아요). 수익률 기준(inflow)에도 더해요
const G30 = 3_000_000_000;
async function kGrant30() {
  const m0 = S.me; if (!m0 || m0.g30 || S.saving || S.readOnly) return;
  const me = clone(m0); me.g30 = 1; me.cash = Math.round((me.cash || 0) + G30); me.inflow = (me.inflow || 2_000_000_000) + G30;
  if (await kSave(me, m0)) { bigWin(G30, '🎁 시작 자금 50억으로! 30억 지급'); renderAll(); }
}
async function kStipend() {
  const m0 = S.me; if (!m0 || S.saving || S.readOnly) return;
  const s = stipSlot();
  if (m0.stipS == null) { const me = clone(m0); me.stipS = s; await kSave(me, m0); return; }
  if (s <= m0.stipS) return;
  const n = Math.min(STIP_MAX, s - m0.stipS), amt = STIP * n;
  const me = clone(m0); me.stipS = s; me.cash = Math.round(me.cash + amt); me.inflow = (me.inflow || CASH0) + amt; me.stipTotal = (me.stipTotal || 0) + amt;
  if (await kSave(me, m0)) { toast(`💵 지원금 ${n > 1 ? `${n}번치 ` : ''}+${krw(amt)}`); buzz(40); renderAll(); }
}
function kTick() {
  if (!kLive() && Date.now() - KQ.poll > 3000) kFetchTickers();
  uTick(); gTick();
  if (S.me && !S.readOnly && S.loaded) { kGrant40(); kGrant30(); kStipend(); kCoupon(); fScan(); }   // 현금 자동 투자(kCashTax)는 없앴어요(2026-11-12)
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
  if (sh.qmode) {   // 개수로 넣었을 때: 산 개수 그대로 받고, 수수료는 위에 얹어요
    const held = (me.kHold || {})[sh.sym] || 0, qi = Math.max(0, +sh.qty || 0);
    if (sh.m === 'buy') { const q = qi, a = Math.ceil(q * p * (1 + KFEE)); return { q, amt: a, fee: a - q * p, ok: q > 0 && a >= K_MIN && a <= me.cash, line: `필요 금액 <b class="num">${krw(a)}</b>` }; }
    const q = sh.all ? held : Math.min(held, qi), get = q * p * (1 - KFEE);
    return { q, amt: q * p, get, ok: q > 0 && q <= held + 1e-12, line: `받을 금액 <b class="num">${krw(get)}</b>` };
  }
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
  sh.amt = ''; sh.qty = ''; sh.all = false; renderAll(); renderSheet();
}
const canKRescue = () => S.me && !S.readOnly && kWorth(S.me) < K_RESCUE_AT;
async function kRescue() {
  if (!canKRescue() || S.saving) return;
  const before = S.me, me = clone(before); me.cash += K_RESCUE; me.inflow = (me.inflow || CASH0) + K_RESCUE; me.kResN = (me.kResN || 0) + 1;
  if (await kSave(me, before)) { addFeed({ kind: 'k_rescue' }); toast('💸 파산 지원금 10억원이 들어왔어요'); renderAll(); }
}

/* ───────── 연습봇: 원화 지갑도 채워요 ───────── */
function kBotSeed(bots) {
  Object.values(bots).forEach((p, i) => {
    p.g40 = 1; p.g30 = 1;
    p.cash = CASH0; p.inflow = CASH0;
    kInit(p); p.kWant = [['KRW-BTC', 'KRW-SOL'], ['KRW-ETH', 'KRW-DOGE'], ['KRW-XRP', 'KRW-PEPE']][i];
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
  const o = KP[c.id] || {}, p = kPx(c.id), ch = kChgG(c.id), me = S.me;
  const prev = KQ.shown[c.id]; const fl = prev && p && p !== prev ? (p > prev ? 'u' : 'd') : ''; KQ.shown[c.id] = p;
  const mp = me ? kPositions(me).filter(y => y.sym === c.id) : [], sp = mp.find(y => y.kind === 'spot'), fu = mp.find(y => y.kind === 'fut');
  const pnl = mp.reduce((a, y) => a + y.pnl, 0), P = mp.reduce((a, y) => a + y.principal, 0);
  const sub = mp.length ? (fu ? `<span class="postag ${fu.d > 0 ? 'long' : 'short'}">${fu.label}</span> ` : '') + (sp ? `<span class="mine">${kQty(sp.q)} ${c.a}</span> ` : '') + `<b class="rowpnl ${cls(pnl)}">${signKrw(pnl)} (${pctTxt(P ? pnl / P : 0)})</b>`
    : `<span class="tk">${c.a}</span>${o.v ? ` · ${krwUnits(o.v)}` : ''}`;
  return `<div class="srow${fl ? ' row f' + fl : ''}"><button class="srow-main" type="button" data-kcoin="${c.id}">${kBadge(c)}<span class="sname"><b>${esc(c.n)}${gmBadgeHTML(c.id)}</b><small>${sub}</small></span>
    <span class="sprice"><div class="p num${fl ? ' f' + fl : ''}">${p ? kWon(p) : '…'}</div><div class="c num ${cls(ch)}">${p ? (ch > 0 ? '+' : '') + (ch * 100).toFixed(2) + '%' : ''}</div></span></button>
    <span class="tbtns"><button class="tb trade${mp.length ? ' lit' : ''}" type="button" data-kcoin="${c.id}">거래</button></span></div>`;
}
function renderCoins(ctl) { renderExchange(ctl); }   // 거래소 탭(코인 | 주식 | 내 보유)은 us.js

/* ───────── 화면: 코인 거래 시트 ───────── */
// 코인 차트: 업비트 15분봉 96개 = 최근 24시간
async function kLoadChart(sym) {
  const ent = KQ.chart[sym]; if (ent && Date.now() - ent.t < 60e3) return;
  KQ.chart[sym] = { t: Date.now(), pts: ent ? ent.pts : null };
  try { const a = await (await upFetch(`${UPBIT}/candles/minutes/15?market=${sym}&count=96`)).json();
    KQ.chart[sym] = { t: Date.now(), pts: gmChartPts(sym, a.reverse().map(c => [Date.parse(c.candle_date_time_utc + 'Z'), c.trade_price]), kBase(sym), 3) }; kDrawChart(); } catch {}
}
function kDrawChart() {
  const cv = $('#kChart'), sh = S.sheet; if (!cv || !sh || !sh.sym) return; const ent = KQ.chart[sh.sym]; if (!ent || !ent.pts || !ent.pts.length) return;
  const pts = ent.pts.slice(), p = kPx(sh.sym), o = KP[sh.sym] || {}; if (p) pts.push([now(), p]);
  drawTChart(cv, pts, { t0: now() - D, t1: now(), base: kBase(sh.sym) || undefined, fmt: kWon, stepH: 6 });
}
function renderKCoinSheet(b, sh) {
  const c = KC[sh.sym], o = KP[sh.sym] || {}, me = S.me;
  if (sh.m !== 'sell' && sh.m !== 'fut') sh.m = 'buy'; sh.fd ||= 1; sh.fx ||= 10;
  const held = me && (me.kHold || {})[c.id], avg = held ? me.kCost[c.id] : 0;
  const holders = activePlayers().filter(p => ((p.kHold || {})[c.id] || 0) * kPx(c.id) >= 10000);
  const canTrade = me && !S.readOnly;
  const modes = [['buy', '매수'], ['sell', '매도'], ['fut', '선물 롱·숏']];
  b.innerHTML = `<div class="shead">${kBadge(c)}<div><h3>${esc(c.n)}</h3><small>${c.a} · ${KCAT[c.c].n} · 업비트 원화마켓</small></div></div>
    <div class="bigp"><div class="p num" id="kLivePrice">${kPx(c.id) ? kWon(kPx(c.id)) + '원' : '…'}</div><div class="c num"><span class="${cls(kChgG(c.id))}" id="kLivePct">어제보다 ${kPx(c.id) ? pctTxt(kChgG(c.id)) : ''}</span> <span id="kBadge">${gmBadgeHTML(c.id)}</span></div><div class="realpx">진짜 시세 <b class="num">${o.p ? kWon(o.p) + '원' : '…'}</b></div></div>
    <div class="chartbox"><canvas class="chart" id="kChart" aria-label="최근 24시간 차트"></canvas><i class="cpulse"></i></div>
    ${holdersHTML(c.id)}
    <div class="info info3"><div>24시간 거래대금<b class="num">${o.v ? krwUnits(o.v) : '-'}</b></div>
      <div>내 보유<b class="num">${held ? kQty(held) + ' ' + c.a : '-'}</b></div><div>평단<b class="num">${avg ? kWon(avg) + '원' : '-'}</b></div></div>
    ${canTrade ? `<div class="seg seg2">${[['buy', '현물 매수·매도'], ['fut', '선물 롱·숏']].map(([m, l]) => `<button type="button" data-km="${m}" aria-pressed="${m === 'fut' ? sh.m === 'fut' : sh.m !== 'fut'}">${l}</button>`).join('')}</div>
      ${sh.m === 'fut' ? fFormHTML(sh) : `${spotQtyHTML(sh, held)}
      <div class="est est2" id="kEst"></div>
      <div class="pick2 bs2"><button class="cta buy" id="kBuyGo" type="button">매수하기</button><button class="cta sell" id="kSellGo" type="button">매도하기</button></div>`}` : `<p class="hint">${S.readOnly ? '관전 중이라 거래할 수 없어요.' : '참가하면 거래할 수 있어요.'}</p>`}`;
  kLoadChart(c.id); requestAnimationFrame(kDrawChart); kUpdateEst();
}
function kUpdateEst() {
  const sh = S.sheet; if (!sh || sh.type !== 'kcoin') return;
  const i = $('#kAmt'); if (i && !sh.all) sh.amt = i.value;
  if (sh.m === 'fut') { fUpdateEst(sh); return; }
  if (sh.qmode) spotQtyRead(sh);
  const est = $('#kEst'), bb = $('#kBuyGo'), sb = $('#kSellGo'); if (!est || !bb) return;
  const cb = kTradeCalc({ ...sh, m: 'buy', all: false }), cs = kTradeCalc({ ...sh, m: 'sell' }), held = ((S.me || {}).kHold || {})[sh.sym] || 0;
  // 한 번 넣은 금액으로: 사면 얼마나 받는지 / 팔면 얼마 받는지 둘 다 보여줘요
  est.innerHTML = `<span>${sh.all ? '' : `살 때 ${cb.line.replace('받을 수량 ', '')}`}${held ? `${sh.all ? '' : '<br>'}팔 때 ${cs.line.replace('받을 금액 ', '')}` : ''}</span><span class="num">현금 ${krw((S.me || {}).cash || 0)}${held ? `<br>보유 ${krw(held * kPx(sh.sym))}` : ''}</span>`;
  { const mq = spotQ(sh).maxQ; spotPctNow(mq ? (+sh.qty || 0) / mq : 0, sh.all); }
  const fresh = kFresh(sh.sym);
  bb.textContent = S.saving ? '처리 중…' : '매수하기'; bb.disabled = S.saving || !fresh || sh.all || !cb.ok;
  sb.textContent = S.saving ? '처리 중…' : sh.all ? '전부 매도하기' : '매도하기'; sb.disabled = S.saving || !fresh || !held || !cs.ok;
}
function kLiveSheet() {
  uLiveSheet(); gLiveSheet(); if (S.sheet && S.sheet.type === 'mine') renderSheet();
  const sh = S.sheet; if (!sh || sh.type !== 'kcoin') return; const o = KP[sh.sym] || {};
  const lp = $('#kLivePrice'), pc = $('#kLivePct');
  const gp = kPx(sh.sym), gc = kChgG(sh.sym);
  if (lp && gp) flashText(lp, kWon(gp) + '원');
  if (pc && gp) { pc.className = 'num ' + cls(gc); pc.textContent = '어제보다 ' + pctTxt(gc); }
  const bd = $('#kBadge'); if (bd) bd.innerHTML = gmBadgeHTML(sh.sym); const rp = document.querySelector('.realpx b'); if (rp && o.p) rp.textContent = kWon(o.p) + '원';
  kDrawChart(); kUpdateEst();
}


/* ───────── 소식 문구 ───────── */
function kFeedText(f) {
  const nm = esc(nameOf(f.uid)), c = f.sym && KC[f.sym];
  switch (f.kind) {
    case 'k_buy': return c ? ['up', '🛒', `<b>${nm}</b>님이 ${esc(c.n)}을(를) <b>${krw(f.amt)}</b>어치 샀어요`] : null;
    case 'k_sell': return c ? (f.pnl >= 1e8 ? ['up', '💰', `<b>${nm}</b>님이 ${esc(c.n)}로 <b class="up">${signKrw(f.pnl)}</b> 벌었어요`] : ['down', '💸', `<b>${nm}</b>님이 ${esc(c.n)}을(를) <b>${krw(f.amt)}</b>어치 팔았어요`]) : null;
    case 'k_fopen': { const c2 = KC[f.sym] || UC[f.sym] || GC[f.sym]; return c2 ? [f.d > 0 ? 'up' : 'down', f.d > 0 ? '🚀' : '📉', `<b>${nm}</b>님이 ${esc(c2.n)} <b>${f.x}배 ${f.d > 0 ? '롱' : '숏'}</b> 진입 (${krw(f.amt)})`] : null; }
    case 'k_fclose': { const c2 = KC[f.sym] || UC[f.sym] || GC[f.sym]; return c2 ? [f.pnl >= 0 ? 'up' : 'down', f.pnl >= 0 ? '🤑' : '😭', `<b>${nm}</b>님이 ${esc(c2.n)} ${f.x}배 ${f.d > 0 ? '롱' : '숏'} 종료 <b class="${cls(f.pnl)}">${signKrw(f.pnl)}</b>`] : null; }
    case 'k_fliq': { const c2 = KC[f.sym] || UC[f.sym] || GC[f.sym]; return c2 ? ['down', '💀', `<b>${nm}</b>님 ${esc(c2.n)} <b>${f.x}배 ${f.d > 0 ? '롱' : '숏'} 청산</b> <b class="down">-${krw(f.amt)}</b>`] : null; }
    case 'k_ubuy': return UC[f.sym] ? ['up', '🇺🇸', `<b>${nm}</b>님이 ${esc(UC[f.sym].n)}을(를) <b>${krw(f.amt)}</b>어치 샀어요`] : null;
    case 'k_usell': return UC[f.sym] ? [f.pnl >= 0 ? 'up' : 'down', '🇺🇸', `<b>${nm}</b>님이 ${esc(UC[f.sym].n)}을(를) 팔았어요 <b class="${cls(f.pnl)}">${signKrw(f.pnl)}</b>`] : null;
    case 'k_atk': { const a = KC[f.sym] || UC[f.sym], tn = esc(nameOf(f.target)), an = a ? esc(a.n) : '';
      if (!f.ok) return ['gold', '🛡️', `<b>${tn}</b>님이 <b>${nm}</b>님의 ${an} 공격을 막았어요 · 위자료 <b class="up">+${krw(Math.floor(f.cost / 2))}</b>`];
      return f.type === 'loot' ? ['up', '💰', `<b>${nm}</b>님이 <b>${tn}</b>님의 ${an} 수익 <b class="up">${krw(f.gain)}</b> 약탈!`]
        : f.exec ? ['down', '☠️', `<b>${nm}</b>님이 <b>${tn}</b>님 ${an} <b>참수!</b> 현상금 <b class="up">${krw(f.gain)}</b>`]
        : ['up', '🎯', `<b>${nm}</b>님이 <b>${tn}</b>님 ${an} 증거금 <b class="up">${krw(f.gain)}</b> 사냥`]; }
    case 'k_auto': return ['gold', f.lx ? '🎯' : '🤖', f.lx ? `<b>${nm}</b>님 레버리지 부족 → <b>${krw(f.amt)}</b> ${f.lx}배 강제 롱` : `<b>${nm}</b>님 현금 <b>${krw(f.amt)}</b> 자동 투자`];
    case 'k_refund': return ['gold', '🏛️', `<b>${nm}</b>님이 ${f.n ? `서울 구채 ${f.n}장` : ''}${f.n && f.br ? '·' : ''}${f.br ? '브라질 국채' : ''}를 지금 값 <b>${krw(f.amt)}</b>으로 환불받았어요`];
    case 'k_gbuy': return GC[f.sym] ? ['up', GC[f.sym].f, `<b>${nm}</b>님이 ${esc(GC[f.sym].n)}을(를) <b>${krw(f.amt)}</b>어치 샀어요`] : null;
    case 'k_gsell': return GC[f.sym] ? [f.pnl >= 0 ? 'up' : 'down', GC[f.sym].f, `<b>${nm}</b>님이 ${esc(GC[f.sym].n)}을(를) 팔았어요 <b class="${cls(f.pnl)}">${signKrw(f.pnl)}</b>`] : null;
    case 'k_tax': return ['down', '💸', `<b>${nm}</b>님 현금세 <b class="down">-${krw(f.amt)}</b>`];
    case 'k_bond': return ['gold', '🏛️', `<b>${nm}</b>님이 ${esc(f.gu)} 지분 <b>${f.n}%</b>를 샀어요`];
    case 'k_bsell': return ['down', '🏛️', `<b>${nm}</b>님이 ${esc(f.gu)} 지분 ${f.n}%를 팔았어요`];
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
  // 현물 빠른 버튼: 누를 때마다 '살 수 있는 최대'의 1·10·25·50%씩 더해요 (최대 100%)
  if ((d.kadd || d.kclr) && S.sheet.qmode && !(S.sheet.type === 'us' && uWhole(S.sheet.sym))) { const sh = S.sheet, s = spotQ(sh); sh.all = false;
    const r = d.kclr ? 0 : Math.min(1, (s.maxQ ? (+sh.qty || 0) / s.maxQ : 0) + +d.kadd); sh.qty = r ? String(qRound(s.maxQ * r, s.dec)) : ''; const i = $('#qIn'); if (i) i.value = sh.qty;
    document.querySelectorAll('[data-kall]').forEach(b => b.setAttribute('aria-pressed', 'false')); kUpdateEst(); uUpdateEst(); gUpdateEst(); return true; }
  if (d.kadd || d.kclr) { const sh = S.sheet, isQ = sh.type === 'us' && uWhole(sh.sym); sh.all = false;
    const max = sh.type === 'gb' ? gBuyMax() : isQ ? uCalc({ ...sh, m: 'buy', all: false }).maxQ || 0 : sh.type === 'us' ? uCalc({ ...sh, m: 'buy', all: false }).max : kMax('buy', sh.sym);
    const cur = isQ ? +sh.qty || 0 : +sh.amt || 0, r = d.kclr ? 0 : Math.min(1, (max ? cur / max : 0) + +d.kadd);
    if (isQ) { sh.qty = r ? String(Math.floor(max * r + 1e-9)) : ''; const i = $('#uQtyIn'); if (i) i.value = sh.qty; } else { sh.amt = r ? String(Math.floor(max * r / 1000) * 1000) : ''; const i = $('#kAmt'); if (i) i.value = sh.amt; }
    document.querySelectorAll('[data-kall]').forEach(b => b.setAttribute('aria-pressed', 'false')); kUpdateEst(); uUpdateEst(); gUpdateEst(); return true; }
  if (d.kall) { const sh = S.sheet; sh.all = !sh.all; sh.amt = ''; sh.qty = ''; renderSheet(); return true; }
  if (d.kfrac) { const sh = S.sheet, f = +d.kfrac, mx = sh.type === 'us' ? uCalc({ ...sh, m: 'buy' }).max : sh.m === 'fut' ? fMax(sh) : kMax('buy', sh.sym); sh.all = false; sh.amt = String(Math.floor(mx * f)); const i = $('#kAmt'); if (i) i.value = sh.amt; kUpdateEst(); uUpdateEst(); return true; }
  switch (t.id) {
    case 'kDoTrade': if (S.sheet.m === 'fut') fOpen(); else if (S.sheet.type === 'us') uDoTrade(); else kDoTrade(); return true;
    case 'kBuyGo': case 'kSellGo': S.sheet.m = t.id === 'kBuyGo' ? 'buy' : 'sell'; if (S.sheet.type === 'us') uDoTrade(); else kDoTrade(); return true;
    case 'mineFab': showMine(S.xMkt); return true;
    case 'fClose': fClose(t.dataset.sym); return true;
    case 'kRescueBtn': kRescue(); return true;
  }
  return false;
}
document.addEventListener('input', e => {
  if (e.target.id === 'kAmt' && S.sheet) { S.sheet.all = false; gUpdateEst(); if (S.sheet.m === 'fut') { S.sheet.amtTouched = true; document.querySelectorAll('.fpct [data-kfrac]').forEach(b => b.setAttribute('aria-pressed', 'false')); } kUpdateEst(); uUpdateEst(); }
});
document.addEventListener('change', e => { if (e.target.id === 'xCat') { S[{ us: 'uCat', coin: 'kCat', cm: 'cCat' }[S.xMkt]] = e.target.value; renderExchange(); } if (e.target.id === 'xSort') { S[{ us: 'uSortKey', coin: 'kSortKey', cm: 'cSortKey' }[S.xMkt]] = e.target.value; renderExchange(); } });
kFetchTickers(); kConnect();
