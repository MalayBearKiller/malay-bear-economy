'use strict';
/* ═════════ 미국주식 + 달러 환율 (원화 트랙) ═════════
   시세: CNBC 공개 시세(키 없음, 브라우저에서 바로 됨). 5초마다 한 번에 전 종목 + 원/달러 환율.
   프리·애프터마켓 가격도 받아서, 장 밖 시간엔 그 가격으로 거래해요. 정규장이 닫혀 있고 시간외도 없으면 마지막 가격이에요.
   살 때 원화를 실시간 환율로 자동 환전해요(토스·키움처럼). 소수점 거래 · 수수료 0.1% · 현물만. */
// 종목 · 이름 · 분류. 이름은 진짜 회사가 아니라 살짝 바꾼 패러디예요(게임 가격이라서). ⚠️ 기호(티커)는 지갑 키(US_티커)라 지우거나 바꾸면 가진 사람 주식이 사라져요. 분류·이름·순서는 바꿔도 돼요
const USX = [
  ['AAPL', '애뿔', 'tech'], ['MSFT', '마이크로쏘프트', 'tech'], ['GOOGL', '알파뱃', 'tech'], ['AMZN', '아마쫀', 'tech'], ['META', '메따', 'tech'], ['NFLX', '넷플릭쓰', 'tech'], ['ORCL', '오라끌', 'tech'],
  ['CRM', '세일즈포쓰', 'tech'], ['ADBE', '어도삐', 'tech'], ['IBM', 'IBN', 'tech'], ['CSCO', '씨스코', 'tech'], ['DELL', '댈', 'tech'], ['ANET', '아리스따', 'tech'],
  ['NVDA', '엔비디야', 'semi'], ['AVGO', '브로드껌', 'semi'], ['TSM', 'TSNC', 'semi'], ['AMD', 'AND', 'semi'], ['MU', '마이크롱', 'semi'], ['INTC', '인뗄', 'semi'], ['ARM', 'ARN', 'semi'],
  ['QCOM', '퀄껌', 'semi'], ['ASML', 'ASNL', 'semi'], ['TXN', '텍사쓰인스트루먼트', 'semi'], ['AMAT', '어플라이드머티리얼쓰', 'semi'], ['LRCX', '램리써치', 'semi'], ['SMCI', '수퍼마이크로', 'semi'], ['MRVL', '마벨르', 'semi'],
  ['PLTR', '빨란티어', 'ai'], ['SNOW', '스노플레이크', 'ai'], ['CRWD', '크라우드스트라익', 'ai'], ['NOW', '써비스나우', 'ai'], ['PANW', '빨로알토', 'ai'], ['SHOP', '쑈피파이', 'ai'], ['UBER', '우뻐', 'ai'],
  ['DDOG', '데이터도그', 'ai'], ['NET', '클라우드플래어', 'ai'], ['APP', '앱러뷰', 'ai'],
  ['TSLA', '테쓸라', 'ev'], ['RIVN', '리비양', 'ev'], ['LCID', '루씨드', 'ev'], ['NIO', '니요', 'ev'], ['RKLB', '로켓랩쓰', 'ev'], ['ASTS', 'AST스페이스모빌', 'ev'], ['JOBY', '조비에어', 'ev'], ['AVAV', '에어로바이런트', 'ev'],
  ['COIN', '코인베이쓰', 'crypto'], ['MSTR', '스트래티쥐', 'crypto'], ['HOOD', '로빈훗', 'crypto'], ['MARA', '마라홀딩쓰', 'crypto'], ['RIOT', '라이엇플랫폼쓰', 'crypto'], ['CLSK', '클린스빠크', 'crypto'], ['CRCL', '써클', 'crypto'], ['SOFI', '쏘파이', 'crypto'], ['PYPL', '페이빨', 'crypto'],
  ['IONQ', '아이언큐', 'qnt'], ['RGTI', '리게띠', 'qnt'], ['QBTS', '디웨이부', 'qnt'], ['QUBT', '콴텀컴퓨팅', 'qnt'], ['OKLO', '오끌로', 'qnt'], ['CEG', '컨스텔레이숀', 'qnt'], ['VST', '비쓰트라', 'qnt'],
  ['JPM', 'JP모군', 'fin'], ['BAC', '뱅크오브어메리카', 'fin'], ['GS', '골드만싹스', 'fin'], ['V', '비짜', 'fin'], ['MA', '마스타카드', 'fin'],
  ['KO', '코까콜라', 'cons'], ['PEP', '펲시코', 'cons'], ['MCD', '맥도널두', 'cons'], ['SBUX', '스타벅쓰', 'cons'], ['NKE', '나이끼', 'cons'], ['COST', '코스뜨코', 'cons'], ['WMT', '월마뜨', 'cons'], ['DIS', '디쥬니', 'cons'], ['GME', '게임스땁', 'cons'],
  ['LLY', '일라이릴리리', 'bio'], ['NVO', '노보노디스끄', 'bio'], ['UNH', '유나이티드헬쓰', 'bio'], ['JNJ', '존슨앤존쓴', 'bio'], ['PFE', '화이짜', 'bio'], ['MRNA', '모더냐', 'bio'], ['HIMS', '힘쓰앤허쓰', 'bio'],
  ['XOM', '엑쓴모빌', 'ind'], ['CVX', '셰브롱', 'ind'], ['BA', '뽀잉', 'ind'], ['CAT', '캐터삘러', 'ind'], ['GE', 'GI에어로', 'ind'], ['LMT', '록히드마띤', 'ind'],
  ['SPY', 'S&B500 ETF', 'etf'], ['QQQ', '나스닭100 ETF', 'etf'], ['TQQQ', '나스닭 3배 ETF', 'etf'], ['SQQQ', '나스닭 -3배 ETF', 'etf'], ['SOXL', '반도체 3배 ETF', 'etf'], ['SOXS', '반도체 -3배 ETF', 'etf'],
  ['DIA', '다우죤스 ETF', 'etf'], ['IWM', '러쎌2000 ETF', 'etf'], ['ARKK', '아끄 이노베이션', 'etf'], ['SCHD', '배당 ETF', 'etf'], ['TLT', '미국 장기채 ETF', 'etf'],
];
// 현물(원자재): CNBC 기호 · 표시 이름 · 분류 · 단위. 금·은·백금은 현물 가격, 나머지는 최근월 선물 가격
const CMX = [['XAU=', 'GOLD', '금', 'metal', '온스'], ['XAG=', 'SILV', '은', 'metal', '온스'], ['XPT=', 'PLAT', '백금', 'metal', '온스'], ['@HG.1', 'COPR', '구리', 'metal', '파운드'],
  ['@CL.1', 'WTI', 'WTI 원유', 'energy', '배럴'], ['@LCO.1', 'BRNT', '브렌트유', 'energy', '배럴'], ['@NG.1', 'GAS', '천연가스', 'energy', 'MMBtu']];
const UCAT = { tech: { n: '빅테크', c: '#2b2745' }, semi: { n: '반도체', c: '#0e7c86' }, ai: { n: 'AI·소프트웨어', c: '#6a4cf5' }, ev: { n: '전기차·우주', c: '#e8384f' },
  crypto: { n: '코인·핀테크', c: '#f08c00' }, qnt: { n: '양자·원전', c: '#0b7a75' }, fin: { n: '금융', c: '#1f4fa8' }, cons: { n: '소비재', c: '#c2185b' },
  bio: { n: '헬스케어', c: '#16a34a' }, ind: { n: '에너지·산업', c: '#57534e' }, etf: { n: 'ETF', c: '#5b4bd6' } };
const CCAT = { metal: { n: '금속', c: '#b8860b' }, energy: { n: '에너지', c: '#3d3d46' } };
const UC = {}, U_BY = {};   // UC: id → 종목 (m: 'us' 주식 / 'cm' 현물), U_BY: CNBC 기호 → id
USX.forEach(([a, n, c]) => { UC['US_' + a] = { id: 'US_' + a, a, n, c, s: a, m: 'us' }; });
CMX.forEach(([s, a, n, c, unit]) => { UC['CM_' + a] = { id: 'CM_' + a, a, n, c, s, m: 'cm', unit }; });
Object.values(UC).forEach(c => { U_BY[c.s] = c.id; });
// 달러: 사고팔 수 있는 자산 (가격 = 실시간 원/달러 환율). 주식 탭 맨 위 '달러 환율' 줄에서 거래해요
UC.FX_USD = { id: 'FX_USD', a: 'USD', n: '달러', c: 'fx', s: 'KRW=', m: 'fx', unit: '달러' };
const catOf = c => UCAT[c.c] || CCAT[c.c] || { n: '환율', c: '#0f9d58' };
const uWhole = id => UC[id] && UC[id].m !== 'cm';   // 주식·달러는 1주·1달러 단위, 원자재만 소수점
const UP = {};                     // id → { p 달러 가격, base 전날 종가, st 장 상태, t 받은 시각 }
const FX = { p: 0, c: 0, t: 0 };   // 원/달러 환율
const UQ = { last: 0, poll: 0, busy: false, shown: {} };
const U_FEE = 0.001;
const CNBC = 'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?requestMethod=itv&noform=0&partnerId=2&fund=1&exthrs=1&output=json&events=0&symbols=';
const numOf = s => parseFloat(String(s || '').replace(/[,%+]/g, '')) || 0;
// 시가총액 "5.065T" → 달러 숫자
const capOf = s => { const m = /^([\d.]+)\s*([TBMK]?)/i.exec(String(s || '')); return m ? +m[1] * ({ T: 1e12, B: 1e9, M: 1e6, K: 1e3 }[m[2].toUpperCase()] || 1) : 0; };
const usdBig = v => (v >= 1e12 ? '$' + (v / 1e12).toFixed(2) + 'T' : v >= 1e9 ? '$' + (v / 1e9).toFixed(1) + 'B' : '$' + Math.round(v / 1e6) + 'M');
// 나스닥 종합지수: 값 · 전날 종가 · 하루 그래프(1분봉, 동부시간 04:00~20:00)
const IXQ = { p: 0, base: 0, st: '', t: 0 }, IXC = { t: 0, pts: null, t0: 0, t1: 0 };
async function uFetch() {
  if (UQ.busy) return; UQ.busy = true; UQ.poll = Date.now();
  try {
    // 종목이 많아서 40개씩 나눠 동시에 받아요 (한 번에 너무 많이 보내면 막힐 수 있어요)
    const syms = [...Object.values(UC).filter(c => c.m !== 'fx').map(c => c.s), 'KRW=', '.IXIC'], parts = [];
    for (let i = 0; i < syms.length; i += 40) parts.push(syms.slice(i, i + 40));
    const res = await Promise.all(parts.map(pt => fetch(CNBC + encodeURIComponent(pt.join('|'))).then(r => r.json()).catch(() => null)));
    const list = res.flatMap(j => ((j || {}).FormattedQuoteResult || {}).FormattedQuote || []);
    list.forEach(q => {
      if (!q || q.code !== 0) return;
      if (q.symbol === 'KRW=') { const p = numOf(q.last); if (p) { FX.p = p; FX.c = numOf(q.change_pct) / 100; FX.t = Date.now(); UP.FX_USD = { p: 1, base: 1, st: 'REG_MKT', t: Date.now() }; } return; }
      if (q.symbol === '.IXIC') { const p = numOf(q.last); if (p) Object.assign(IXQ, { p, base: p - numOf(q.change), st: q.curmktstatus, t: Date.now() }); return; }
      const id = U_BY[q.symbol]; if (!id) return;
      const last = numOf(q.last), base = last - numOf(q.change), ext = q.ExtendedMktQuote;
      const useExt = ext && numOf(ext.last) && q.curmktstatus !== 'REG_MKT';
      UP[id] = { p: useExt ? numOf(ext.last) : last, base: base || last, st: useExt ? ext.type : q.curmktstatus, t: Date.now(), cap: capOf((useExt && ext.mktcapView) || q.mktcapView) };
    });
    UQ.last = Date.now();
    if (S.me && S.me.uFut) Object.keys(S.me.uFut).forEach(fLiveCheck);
  } catch {}
  UQ.busy = false;
}
function uTick() { if (Date.now() - UQ.poll > 5000) uFetch(); }
const uRaw = id => (UP[id] && UP[id].p) || 0;                // 진짜 달러 가격
const uPx = id => { const o = UP[id]; if (!o || !o.p) return 0; return id === 'FX_USD' ? o.p : o.p * gmMult(id, now(), o.base ? o.p / o.base - 1 : 0); };   // 게임 가격(달러)
const uWon = id => uPx(id) * FX.p;                           // 원화로
const uChg = id => { if (id === 'FX_USD') return FX.c; const o = UP[id]; return o && o.base ? uPx(id) / o.base - 1 : 0; };   // 게임 가격 기준
const uFresh = id => UP[id] && FX.p && Date.now() - UP[id].t < 30000 && (id === 'FX_USD' || GM.ready);
const uLive = () => Date.now() - UQ.last < 20000 && FX.p;
const ST_TXT = { REG_MKT: '정규장', PRE_MKT: '프리마켓', POST_MKT: '애프터마켓' };
const uSt = id => (UC[id] && UC[id].m !== 'us' ? '실시간' : ST_TXT[(UP[id] || {}).st] || '장 마감');
const usd = p => '$' + (p >= 1000 ? p.toLocaleString('en-US', { maximumFractionDigits: 2 }) : p.toFixed(2));
// 주식 로고: 공개 로고 이미지(우리 서버 용량 0). 현물은 코드로 그린 아이콘
const uBadge = c => (c.m === 'fx' ? CM_SVG.USD : c.m === 'cm' ? cmIcon(c) : logoBadge(`https://financialmodelingprep.com/image-stock/${encodeURIComponent(c.a)}.png`, c.a, catOf(c).c));
// 가격 표시: 주식·원자재는 달러, 달러 자체는 원화(환율)
const uPrice = (id, p = uPx(id)) => (UC[id] && UC[id].m === 'fx' ? FX.p.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '원' : usd(p));
const uUsdOf = (id, q) => (UC[id] && UC[id].m === 'fx' ? q : q * uPx(id));   // 보유분의 달러 가치
const uQty = (q, id) => (+q.toPrecision(8)).toLocaleString('ko-KR', { maximumFractionDigits: uWhole(id) ? 2 : 6 }) + (id && UC[id] && UC[id].unit ? ' ' + UC[id].unit : '주');

function usWorth(p) { let v = 0; for (const [id, q] of Object.entries((p && p.uHold) || {})) if (UC[id] && q) v += q * (uWon(id) || (p.uCost || {})[id] || 0); return v; }
function uPositions(p) {
  const out = [];
  Object.entries((p && p.uHold) || {}).forEach(([id, q]) => {
    if (!UC[id] || !q) return; const w = uWon(id) || p.uCost[id], principal = q * (p.uCost[id] || w), value = q * w * (1 - U_FEE);
    out.push({ sym: id, kind: 'us', label: { cm: '현물', fx: '외화', us: '주식' }[UC[id].m], principal, value, q, pnl: value - principal, pct: principal ? value / principal - 1 : 0 });
  });
  fPositions(p, 'uFut').forEach(x => { x.pnl = x.value - x.principal; x.pct = x.principal ? x.pnl / x.principal : 0; out.push(x); });
  return out;
}

/* ───────── 주문 ───────── */
function uCalc(sh) {
  const w = uWon(sh.sym), me = S.me || {}, held = (me.uHold || {})[sh.sym] || 0;
  if (uWhole(sh.sym)) {   // 주식·달러: 개수로 사고팔아요
    const q = sh.all && sh.m === 'sell' ? held : Math.max(0, Math.floor(+sh.qty || 0)), unit = UC[sh.sym].m === 'fx' ? '달러' : '주';
    if (sh.m === 'sell') { const get = q * w * (1 - U_FEE);
      return { q, get, ok: q > 0 && q <= held + 1e-9, line: `받을 금액 <b class="num">${krw(get)}</b>`, maxQ: held, maxTxt: uQty(held, sh.sym) }; }
    const amt = Math.ceil(q * w * (1 + U_FEE)), maxQ = w ? Math.floor((me.cash || 0) / (w * (1 + U_FEE))) : 0;
    return { q, amt, ok: q >= 1 && amt <= (me.cash || 0), line: `필요 금액 <b class="num">${krw(amt)}</b>${UC[sh.sym].m === 'fx' ? '' : ` · ${usd(q * uPx(sh.sym))}`}`, maxQ, maxTxt: maxQ.toLocaleString('ko-KR') + unit };
  }
  if (sh.qmode) {   // 원자재 개수 입력: 산 개수 그대로, 수수료는 위에
    const qi = Math.max(0, +sh.qty || 0), unitTxt = uQty;
    if (sh.m === 'sell') { const q = sh.all ? held : Math.min(held, qi), get = q * w * (1 - U_FEE); return { q, get, ok: q > 0 && q <= held + 1e-12, line: `받을 금액 <b class="num">${krw(get)}</b>`, max: Math.floor(held * w) }; }
    const a = Math.ceil(qi * w * (1 + U_FEE)); return { q: qi, amt: a, ok: qi > 0 && a >= K_MIN && a <= (me.cash || 0), line: `필요 금액 <b class="num">${krw(a)}</b> · ${usd(qi * uPx(sh.sym))}`, max: Math.floor((me.cash || 0) / (1 + U_FEE)) };
  }
  const amt = Math.max(0, Math.floor(+sh.amt || 0));
  if (sh.m === 'sell') { const q = sh.all ? held : Math.min(held, w ? amt / w : 0), get = q * w * (1 - U_FEE);
    return { q, get, ok: q > 0 && q <= held + 1e-12, line: `받을 금액 <b class="num">${krw(get)}</b>`, max: Math.floor(held * w) }; }
  const q = w ? amt / (w * (1 + U_FEE)) : 0;
  return { q, amt, ok: amt >= K_MIN && amt <= (me.cash || 0), line: `받을 수량 <b class="num">${uQty(q, sh.sym)}</b> · ${usd(q * uPx(sh.sym))}`, max: Math.floor((me.cash || 0) / (1 + U_FEE)) };
}
async function uDoTrade() {
  const sh = S.sheet; if (!sh || !S.me || S.saving || S.readOnly) return;
  if (!uFresh(sh.sym)) { toast('시세를 받는 중이에요. 잠시 후 다시 눌러 주세요'); return; }
  const c = uCalc(sh); if (!c.ok) return;
  const w = uWon(sh.sym), before = S.me, me = clone(before); me.uHold ||= {}; me.uCost ||= {};
  if (sh.m === 'sell') { me.uHold[sh.sym] -= c.q; me.cash += c.get; if (me.uHold[sh.sym] * w < 1) { delete me.uHold[sh.sym]; delete me.uCost[sh.sym]; } }
  else { const h0 = me.uHold[sh.sym] || 0; me.uCost[sh.sym] = ((me.uCost[sh.sym] || 0) * h0 + c.q * w) / (h0 + c.q); me.uHold[sh.sym] = h0 + c.q; me.cash -= c.amt; }
  me.cash = Math.round(me.cash);
  if (!(await kSave(me, before))) return;
  const n = UC[sh.sym].n;
  if (sh.m === 'sell') { const pnl = Math.round(c.get - c.q * ((before.uCost || {})[sh.sym] || w)); addFeed({ kind: 'k_usell', sym: sh.sym, amt: Math.round(c.get), pnl }); toast(`💸 ${n} 매도 · ${signKrw(pnl)}`); if (pnl > 0) bigWin(pnl); }
  else { addFeed({ kind: 'k_ubuy', sym: sh.sym, amt: c.amt }); toast(`🛒 ${n} ${krw(c.amt)} 매수!`); showMine(UC[sh.sym].m); return; }
  sh.amt = ''; sh.qty = ''; sh.all = false; renderAll(); renderSheet();
}

/* ───────── 차트: CNBC 1분봉, 가장 최근 거래일(프리 04:00 ~ 애프터 20:00, 미국 동부시간) ───────── */
const UCH = {};
async function uLoadChart(id) {
  const ent = UCH[id]; if (ent && Date.now() - ent.t < 60e3) return;
  UCH[id] = { t: Date.now(), pts: ent ? ent.pts : null, t0: ent && ent.t0, t1: ent && ent.t1 };
  try {
    const bars = ((((await (await fetch('https://ts-api.cnbc.com/harmony/app/charts/1D.json?symbol=' + encodeURIComponent(UC[id].s))).json()) || {}).barData || {}).priceBars) || [];
    if (!bars.length) return;
    if (UC[id].m !== 'us') {   // 현물·달러는 거의 24시간 거래 → 최근 24시간
      const tEnd = bars[bars.length - 1].tradeTimeinMills, l2 = bars.filter(b => b.tradeTimeinMills >= tEnd - D), st2 = Math.max(1, Math.floor(l2.length / 240));
      const raw2 = l2.filter((b, i) => i % st2 === 0 || i === l2.length - 1).map(b => [b.tradeTimeinMills, numOf(b.close)]);
      UCH[id] = { t: Date.now(), pts: id === 'FX_USD' ? raw2 : gmChartPts(id, raw2, (UP[id] || {}).base, 1), t0: tEnd - D, t1: tEnd, roll: true }; uDrawChart(); return;
    }
    const day = bars[bars.length - 1].tradeTime.slice(0, 8), list = bars.filter(b => b.tradeTime.slice(0, 8) === day);
    const step = Math.max(1, Math.floor(list.length / 240)), pts = list.filter((b, i) => i % step === 0 || i === list.length - 1).map(b => [b.tradeTimeinMills, numOf(b.close)]);
    // 그날 04:00(동부시간)부터 16시간 = 20:00까지를 가로축으로
    const first = list[0], hh = +first.tradeTime.slice(8, 10), mm = +first.tradeTime.slice(10, 12), t0 = first.tradeTimeinMills - ((hh - 4) * 60 + mm) * 6e4;
    UCH[id] = { t: Date.now(), pts: gmChartPts(id, pts, (UP[id] || {}).base, 1), t0, t1: t0 + 16 * H };
    uDrawChart();
  } catch {}
}
function uDrawChart() {
  const cv = $('#uChart'), sh = S.sheet; if (!cv || !sh || sh.type !== 'us') return; const ent = UCH[sh.sym]; if (!ent || !ent.pts) return;
  const pts = ent.pts.slice(), p = sh.sym === 'FX_USD' ? FX.p : uPx(sh.sym), t = now(), roll = ent.roll; if (p && t > pts[pts.length - 1][0] && (roll || t < ent.t1)) pts.push([t, p]);
  const isFx = sh.sym === 'FX_USD'; if (isFx && FX.p) pts[pts.length - 1] = [t, FX.p];
  drawTChart(cv, pts, { t0: roll ? t - D : ent.t0, t1: roll ? t : ent.t1, base: isFx ? FX.p / (1 + FX.c) : (UP[sh.sym] || {}).base, fmt: v => isFx ? v.toFixed(1) : '$' + v.toFixed(2), stepH: roll ? 6 : 4 });
}

/* ───────── 시트 ───────── */
function renderUSSheet(b, sh) {
  const c = UC[sh.sym], me = S.me, ch = uChg(c.id), whole = uWhole(c.id), isFx = c.m === 'fx';
  if (sh.m !== 'sell' && sh.m !== 'fut') sh.m = 'buy';
  const held = me && (me.uHold || {})[c.id], avg = held ? me.uCost[c.id] : 0, pos = held ? uPositions(me).find(x => x.sym === c.id && x.kind === 'us') : null;
  const unit = isFx ? '달러' : '주';
  // 현물은 매수·매도 한 화면: 한 번 넣은 수량(주식·달러) 또는 금액(원자재)으로 [매수하기] [매도하기]
  const allBtn = held ? `<button type="button" data-kall="1" aria-pressed="${!!sh.all}">보유 전부</button>` : '';
  const qtyForm = `<div class="qtyrow"><button type="button" data-uqs="-1" aria-label="줄이기">−</button><input id="uQtyIn" type="number" inputmode="numeric" min="0" step="1" value="${sh.all ? '' : sh.qty || ''}" placeholder="${sh.all ? '보유 전부' : '몇 ' + unit}" aria-label="수량"><button type="button" data-uqs="1" aria-label="늘리기">+</button></div>
      ${spotQuickHTML(sh, held)}`;
  const amtForm = spotQtyHTML(sh, held);   // 원자재: 온스·배럴 같은 단위로 개수 입력
  b.innerHTML = `<div class="shead">${uBadge(c)}<div><h3>${esc(c.n)}</h3><small>${c.a} · ${catOf(c).n} · <span id="uSt">${uSt(c.id)}</span></small></div></div>
    <div class="bigp"><div class="p num" id="uLivePrice">${uPx(c.id) ? uPrice(c.id) : '…'}</div><div class="c num"><span class="${cls(ch)}" id="uLivePct">${pctTxt(ch)}</span> <span class="dim" id="uLiveWon">${isFx ? '1달러' : '≈ ' + krw(uWon(c.id))}</span></div>${(UP[c.id] || {}).cap ? `<div class="mcap">시가총액 <b class="num">${usdBig(UP[c.id].cap)}</b> · 약 ${krwUnits(UP[c.id].cap * FX.p)}원</div>` : ''}</div>
    <div class="chartbox"><canvas class="chart" id="uChart" aria-label="하루 차트"></canvas><i class="cpulse"></i></div>
    ${held ? `<div class="kline"><span>내 보유 <b class="num">${uQty(held, c.id)}</b>${isFx ? '' : ` · ${usd(uUsdOf(c.id, held))}`} · 평단 ${krw(avg)}</span><span><b class="num ${cls(pos.pnl)}">${signKrw(pos.pnl)}</b></span></div>` : ''}
    ${holdersHTML(c.id)}${c.m !== 'fx' ? rumorRowHTML(c.id) : ''}
    ${me && !S.readOnly ? `<div class="seg seg2">${[['buy', '현물 매수·매도'], ['fut', '롱·숏']].map(([m, l]) => `<button type="button" data-km="${m}" aria-pressed="${m === 'fut' ? sh.m === 'fut' : sh.m !== 'fut'}">${l}</button>`).join('')}</div>
      ${sh.m === 'fut' ? fFormHTML(sh) : `${whole ? qtyForm : amtForm}<div class="est est2" id="kEst"></div><div class="pick2 bs2"><button class="cta buy" id="kBuyGo" type="button">매수하기</button><button class="cta sell" id="kSellGo" type="button">매도하기</button></div>`}` : ''}`;
  uLoadChart(c.id); requestAnimationFrame(uDrawChart); uUpdateEst();
}
function uUpdateEst() {
  const sh = S.sheet; if (!sh || sh.type !== 'us') return;
  const i = $('#kAmt'); if (i && !sh.all) sh.amt = i.value;
  const qi = $('#uQtyIn'); if (qi && !sh.all) sh.qty = qi.value;
  if (sh.m === 'fut') { fUpdateEst(sh); return; }
  if (sh.qmode && !uWhole(sh.sym)) spotQtyRead(sh);
  const est = $('#kEst'), bb = $('#kBuyGo'), sb = $('#kSellGo'); if (!est || !bb) return;
  const cb = uCalc({ ...sh, m: 'buy', all: false }), cs = uCalc({ ...sh, m: 'sell' }), held = ((S.me || {}).uHold || {})[sh.sym] || 0;
  est.innerHTML = `<span>${sh.all ? '' : `살 때 ${cb.line}`}${held ? `${sh.all ? '' : '<br>'}팔 때 ${cs.line}` : ''}</span><span class="num">현금 ${krw((S.me || {}).cash || 0)}${held ? `<br>보유 ${uQty(held, sh.sym)}` : ''}</span>`;
  { const isQ = uWhole(sh.sym), mx = isQ ? cb.maxQ : spotQ(sh).maxQ; spotPctNow(mx ? (+sh.qty || 0) / mx : 0, sh.all); }
  const fresh = uFresh(sh.sym);
  bb.textContent = S.saving ? '처리 중…' : '매수하기'; bb.disabled = S.saving || !fresh || sh.all || !cb.ok;
  sb.textContent = S.saving ? '처리 중…' : sh.all ? '전부 매도하기' : '매도하기'; sb.disabled = S.saving || !fresh || !held || !cs.ok;
}
function uLiveSheet() {
  const sh = S.sheet; if (!sh || sh.type !== 'us') return; const p = uPx(sh.sym), ch = uChg(sh.sym);
  const a = $('#uLivePrice'), b = $('#uLivePct'), w = $('#uLiveWon'), s = $('#uSt');
  if (a && p) flashText(a, uPrice(sh.sym)); if (b) { b.textContent = pctTxt(ch); b.className = cls(ch); } if (w && sh.sym !== 'FX_USD') w.textContent = '≈ ' + krw(uWon(sh.sym)); if (s) s.textContent = uSt(sh.sym);
  uLoadChart(sh.sym); uDrawChart(); uUpdateEst();
}

/* ───────── 거래소 탭 ───────── */
const U_SORTS = { v: '기본순', pd: '가격 높은순', pa: '가격 낮은순', cd: '많이 오른순', ca: '많이 내린순' };
function uRow(c) {
  const p = uPx(c.id), ch = uChg(c.id), me = S.me;
  const prev = UQ.shown[c.id]; const fl = prev && p && p !== prev ? (p > prev ? 'u' : 'd') : ''; UQ.shown[c.id] = p;
  const mp = me ? uPositions(me).filter(y => y.sym === c.id) : [], x = mp.find(y => y.kind === 'us'), fu = mp.find(y => y.kind === 'fut');
  const sub = fu ? `<span class="postag ${fu.d > 0 ? 'long' : 'short'}">${fu.label}</span><b class="rowpnl ${cls(fu.pnl)}">${pctTxt(fu.pct)}</b>` : x ? `<span class="mine">${uQty(x.q, c.id)}</span> <b class="rowpnl ${cls(x.pnl)}">${signKrw(x.pnl)} (${pctTxt(x.pct)})</b>` : `<span class="tk">${c.a}</span>${p ? ` · ${krw(uWon(c.id))}` : ''}`;
  return `<div class="srow${fl ? ' row f' + fl : ''}"><button class="srow-main" type="button" data-us="${c.id}">${uBadge(c)}<span class="sname"><b>${esc(c.n)}${gmBadgeHTML(c.id)}</b><small>${sub}</small></span>
    <span class="sprice"><div class="p num${fl ? ' f' + fl : ''}">${p ? usd(p) : '…'}</div><div class="c num ${cls(ch)}">${p ? (ch > 0 ? '+' : '') + (ch * 100).toFixed(2) + '%' : ''}</div></span></button>
    <span class="tbtns"><button class="tb trade${mp.length ? ' lit' : ''}" type="button" data-us="${c.id}">거래</button></span></div>`;
}
// 환율 한 칸: 목록 맨 위에 다른 종목처럼 보여요 (누르면 아무 일 없음)
function fxRow() {
  const prev = UQ.shown.FX; const fl = prev && FX.p && FX.p !== prev ? (FX.p > prev ? 'u' : 'd') : ''; UQ.shown.FX = FX.p;
  return `<div class="srow fxrow${fl ? ' row f' + fl : ''}"><button type="button" class="srow-main" data-us="FX_USD">${CM_SVG.USD}<span class="sname"><b>달러</b><small>${(S.me && (S.me.uHold || {}).FX_USD) ? `<span class="mine">${uQty(S.me.uHold.FX_USD, 'FX_USD')}</span>` : '<span class="tk">USD/KRW</span> · 실시간 환율'}</small></span>
    <span class="sprice"><div class="p num${fl ? ' f' + fl : ''}">${FX.p ? FX.p.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '…'}</div><div class="c num ${cls(FX.c)}">${FX.p ? (FX.c > 0 ? '+' : '') + (FX.c * 100).toFixed(2) + '%' : ''}</div></span></button></div>`;
}
// 거래소 탭: [주식 | 코인 | 현물 | 채권]. 내 보유는 오른쪽 아래 떠 있는 버튼 → 아래에서 올라오는 창
const X_TABS = [['us', '주식'], ['coin', '코인'], ['cm', '현물'], ['bond', '채권']];
function xCtlHTML() {
  const m = S.xMkt, tab = ([k, l]) => `<button type="button" role="tab" data-xmkt="${k}" aria-selected="${m === k}">${l}</button>`;
  const h = `<div class="xtop"><div class="xtabs" role="tablist">${X_TABS.map(tab).join('')}<small class="livetag" id="kLiveTag"><i></i></small></div></div>`;
  if (m === 'bond') return h;
  const cats = m === 'us' ? UCAT : m === 'cm' ? CCAT : KCAT, sorts = m === 'coin' ? K_SORTS : U_SORTS, ck = { us: 'uCat', coin: 'kCat', cm: 'cCat' }[m], sk = { us: 'uSortKey', coin: 'kSortKey', cm: 'cSortKey' }[m];
  const opt = (v, l, cur) => `<option value="${v}"${cur === v ? ' selected' : ''}>${l}</option>`;
  return h + `<div class="krow2"><label class="ksel"><select id="xCat" aria-label="분류">${opt('all', '전체', S[ck])}${Object.entries(cats).map(([k, v]) => opt(k, v.n, S[ck])).join('')}</select></label>
      <label class="ksel"><select id="xSort" aria-label="정렬">${Object.entries(sorts).map(([k, l]) => opt(k, l, S[sk])).join('')}</select></label></div>`;
}
// ───────── 내 보유 (화면 가득) ─────────
// 탭 4개(주식·코인·현물·채권) · 위에 그 탭의 평가금액·손익·주문 가능 · 줄마다 [전량 매도]/[종료] (한 번 더 누르면 바로 실행)
const mktOf = sym => (KC[sym] ? 'coin' : UC[sym] ? UC[sym].m : GC[sym] || BOND[sym] ? 'bond' : 'us');
function showMine(tab) { if (S.sheet) closeSheetRaw(); openSheet('mine', { tab: X_TABS.some(([k]) => k === tab) ? tab : 'us' }); }
function minePositions(me, tab) {
  if (!me) return [];
  if (tab === 'coin') return kPositions(me);
  if (tab === 'bond') return [...stakePositions(me), ...gPositions(me)];   // 채권 = 서울시 투자지분 + 국제채권
  return uPositions(me).filter(x => UC[x.sym].m === tab || (tab === 'us' && UC[x.sym].m === 'fx'));   // 달러는 주식 탭에
}
const myAll = me => (me ? X_TABS.flatMap(([k]) => minePositions(me, k)).sort((a, b) => b.value - a.value) : []);
function mineRow(x) {
  let badge, name, sub, open;
  if (x.kind === 'stake') { badge = `<span class="logo-b bb" style="background:var(--krw)">${BOND[x.sym].i + 1}</span>`; name = x.sym + ' 지분' + ((guChief()[x.sym] || {}).id === S.uid ? ' 👑' : ''); sub = `${x.q}% · 평단 ${krw((S.me.bCost || {})[x.sym] || 0)}`; open = `data-bond="${x.sym}"`; }
  else if (GC[x.sym]) { const c = GC[x.sym], o = (S.me.gHold || {})[x.sym]; badge = `<span class="logo-b gflag">${c.f}</span>`; name = c.n; open = `data-gb="${x.sym}"`;
    sub = x.kind === 'fut' ? `금리 ${gY(x.sym).toFixed(2)}%${x.dist != null ? ` · 청산까지 ${(x.dist * 100).toFixed(1)}%` : ''}` : `산 금리 ${o ? o.y.toFixed(2) : '-'}% · 지금 ${gY(x.sym).toFixed(2)}%`; }
  else { const isU = !!UC[x.sym], c = isU ? UC[x.sym] : KC[x.sym]; badge = isU ? uBadge(c) : kBadge(c); name = c.n; open = isU ? `data-us="${x.sym}"` : `data-kcoin="${x.sym}"`;
    sub = `${isU ? uQty(x.q, x.sym) + (x.kind !== 'fut' && c.m !== 'fx' ? ` · ${usd(uUsdOf(x.sym, x.q))}` : '') : kQty(x.q) + ' ' + c.a}${x.dist != null ? ` · <span class="${x.dist / x.distMax < .3 ? 'up' : ''}">청산까지 ${(x.dist * 100).toFixed(1)}%</span>` : ''}`; }
  const tag = x.kind === 'fut' ? ` <span class="postag ${x.d > 0 ? 'long' : 'short'}">${x.label}</span>` : '';
  const key = (x.kind === 'fut' ? 'f' : x.kind === 'stake' ? 'b' : x.kind === 'gb' ? 'g' : KC[x.sym] ? 'k' : 'u') + ':' + x.sym;
  const armed = S.qsArm && S.qsArm.key === key && Date.now() - S.qsArm.t < 4000;
  const lbl = x.kind === 'fut' ? (armed ? '종료할까요?' : '종료') : (armed ? '전량 매도?' : '전량 매도');
  return `<div class="mrow"><button type="button" class="srow-main" ${open}>${badge}<span class="sname"><b>${esc(name)}${tag}</b><small class="num">${sub}</small></span>
    <span class="sprice"><div class="p num">${krw(x.value)}</div><div class="c num ${cls(x.pnl)}">${signKrw(x.pnl)} (${pctTxt(x.pct)})</div></span></button>
    <button type="button" class="mact${armed ? ' armed' : ''}" data-qs="${key}" ${S.saving ? 'disabled' : ''}>${lbl}</button></div>`;
}
function renderMineSheet(b, sh) {
  const me = S.me, tab = sh.tab || 'us', pos = minePositions(me, tab).sort((a, c) => c.value - a.value);
  const P = pos.reduce((a, x) => a + x.principal, 0), V = pos.reduce((a, x) => a + x.value, 0);
  const cnt = k => minePositions(me, k).length;
  b.innerHTML = `<div class="mhead"><h3>💼 내 보유</h3></div>
    <div class="xtabs" role="tablist">${X_TABS.map(([k, l]) => `<button type="button" role="tab" data-mtab="${k}" aria-selected="${tab === k}">${l}${cnt(k) ? ` <i class="mcnt">${cnt(k)}</i>` : ''}</button>`).join('')}</div>
    ${me ? `<div class="msum"><div><small>평가금액</small><b class="num" data-roll="mV-${tab}" data-v="${V}">${krw(V)}</b></div><div><small>손익</small><b class="num ${cls(V - P)}"><span data-roll="mP-${tab}" data-v="${V - P}" data-fmt="sign">${signKrw(V - P)}</span>${P ? ` (${pctTxt((V - P) / P)})` : ''}</b></div><div><small>주문 가능</small><b class="num">${krw(me.cash)}</b></div></div>${tab === 'us' || tab === 'cm' ? (() => { const u = pos.filter(x => x.kind === 'us').reduce((a, x) => a + uUsdOf(x.sym, x.q), 0); return u ? `<div class="musd">💵 달러 자산 <b class="num">${usd(u)}</b> · 환율 ${FX.p.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}원</div>` : ''; })() : ''}` : ''}
    <div class="slist">${pos.map(mineRow).join('') || `<div class="empty">이 탭엔 아직 가진 게 없어요.</div>`}</div>
    <button type="button" class="cta soft mgo" data-mgo="${tab}">${X_TABS.find(([k]) => k === tab)[1]} 더 사러 가기</button>`;
}
// 전량 매도 (현물·주식): 거래창 없이 바로
async function kSellAll(sym) {
  const m0 = S.me, q = (m0.kHold || {})[sym]; if (!q) return; if (!kFresh(sym)) { toast('시세를 받는 중이에요. 잠시 후 다시 눌러 주세요'); return; }
  const p = kPx(sym), get = q * p * (1 - KFEE), cost = (m0.kCost || {})[sym] || p, me = clone(m0); delete me.kHold[sym]; delete me.kCost[sym]; me.cash = Math.round(me.cash + get);
  if (await kSave(me, m0)) { const pnl = Math.round(get - q * cost); addFeed({ kind: 'k_sell', sym, amt: Math.round(get), pnl }); toast(`💸 ${KC[sym].n} 전량 매도 · ${signKrw(pnl)}`); if (pnl > 0) bigWin(pnl); renderAll(); if (S.sheet) renderSheet(); }
}
async function uSellAll(sym) {
  const m0 = S.me, q = (m0.uHold || {})[sym]; if (!q) return; if (!uFresh(sym)) { toast('시세를 받는 중이에요. 잠시 후 다시 눌러 주세요'); return; }
  const w = uWon(sym), get = q * w * (1 - U_FEE), cost = (m0.uCost || {})[sym] || w, me = clone(m0); delete me.uHold[sym]; delete me.uCost[sym]; me.cash = Math.round(me.cash + get);
  if (await kSave(me, m0)) { const pnl = Math.round(get - q * cost); addFeed({ kind: 'k_usell', sym, amt: Math.round(get), pnl }); toast(`💸 ${UC[sym].n} 전량 매도 · ${signKrw(pnl)}`); if (pnl > 0) bigWin(pnl); renderAll(); if (S.sheet) renderSheet(); }
}
function quickSell(key) {
  if (!S.me || S.saving || S.readOnly) return;
  if (!S.qsArm || S.qsArm.key !== key || Date.now() - S.qsArm.t > 4000) { S.qsArm = { key, t: Date.now() }; renderSheet(); return; }
  S.qsArm = null; const [k, sym] = [key[0], key.slice(2)];
  if (k === 'g') { const sh0 = S.sheet; S.sheet = { type: 'gb', sym, all: true }; gTrade('sell').finally(() => { if (S.sheet && S.sheet.type === 'gb' && S.sheet.all) S.sheet = sh0; renderSheet(); }); return; }
  if (k === 'k') kSellAll(sym); else if (k === 'u') uSellAll(sym); else if (k === 'f') fClose(sym); else if (k === 'b') bondTrade(sym, 'sell', (S.me.bonds || {})[sym] || 0);
}
// 오른쪽 아래 떠 있는 버튼: 거래소 탭에서만. 개수와 손익을 같이 보여줘요
function renderMineFab() {
  const f = $('#mineFab'); if (!f) return;
  const show = S.tab === 'coin' && !!S.me && !S.sheet && !S.profile && !S.board; f.hidden = !show; if (!show) return;
  const pos = myAll(S.me), P = pos.reduce((a, x) => a + x.principal, 0), V = pos.reduce((a, x) => a + x.value, 0), r = P ? (V - P) / P : 0;
  fabState(f, pos, r);
  f.innerHTML = `<span class="mf-ic">💼</span><span class="mf-t"><b>내 보유 ${pos.length}</b>${P ? `<small class="${cls(r)}">${pctTxt(r)}</small>` : ''}</span>`;
}
// 목록 다시 그리기: 줄 순서가 같으면 바뀐 줄만 갈아끼워요 (로고 이미지는 그대로 둬서 깜빡이지 않아요)
function patchList(el, parts) {
  parts = parts.filter(([, h]) => h); const keys = parts.map(([k]) => k).join('|');
  if (el._keys !== keys || el.children.length !== parts.length) { el.innerHTML = parts.map(([, h]) => h).join(''); el._keys = keys; el._html = parts.map(([, h]) => h); return; }
  parts.forEach(([, h], i) => { if (el._html[i] === h) return; el._html[i] = h;
    const t = document.createElement('template'); t.innerHTML = h.trim(); const nu = t.content.firstElementChild, old = el.children[i]; if (!nu || !old) return;
    const ob = old.querySelector('.logo-b'), nb = nu.querySelector('.logo-b'); if (ob && nb && ob.innerHTML.replace(/\s/g, '') === nb.innerHTML.replace(/\s/g, '')) nb.replaceWith(ob);
    old.replaceWith(nu); });
}
function renderExchange(ctl) {
  const el = $('#tab-coin'); if (!el) return;
  if (!X_TABS.some(([k]) => k === S.xMkt)) S.xMkt = 'us';
  if (!el.querySelector('#kList')) { el.innerHTML = `<div id="kTop"></div><div id="kCtl" class="kctl"></div><div class="slist" id="kList"></div>`; ctl = true; }
  if (ctl) $('#kCtl').innerHTML = xCtlHTML();
  const m = S.xMkt;
  $('#kTop').innerHTML = canKRescue() ? `<div class="card rescue"><span class="t"><b>💸 파산 지원금 20억원</b><small>실질 총자산이 2억원 밑이에요 · 1시간에 1번</small></span><button type="button" id="kRescueBtn" ${S.saving ? 'disabled' : ''}>받기</button></div>` : '';
  const live = m === 'coin' ? kLive() : m === 'bond' ? true : uLive(), lt = $('#kLiveTag'); if (lt) lt.className = 'livetag' + (live ? ' on' : '');
  if (m === 'bond') {   // 채권 탭 안에서 [서울시 투자지분 | 국제채권]
    const sub = S.bondSub === 'world' ? 'world' : 'stake', kl = $('#kList'); kl._keys = null;
    kl.innerHTML = `<div class="seg seg2 gbsub"><button type="button" data-gbsub="stake" aria-pressed="${sub === 'stake'}">🏛️ 서울시 투자지분</button><button type="button" data-gbsub="world" aria-pressed="${sub === 'world'}">🌍 국제채권</button></div>` + (sub === 'world' ? worldHTML() : stakesHTML()); return; }
  if (m === 'coin') {
    if (!KCAT[S.kCat]) S.kCat = 'all'; if (!K_SORTS[S.kSortKey]) S.kSortKey = 'v';
    const sk = S.kSortKey, list = Object.values(KC).filter(c => S.kCat === 'all' || c.c === S.kCat);
    const key = c => { const o = KP[c.id] || {}; return sk[0] === 'p' ? kPx(c.id) : sk[0] === 'c' ? kChgG(c.id) : (o.v || 0); };
    list.sort((a, b) => (sk.endsWith('a') ? 1 : -1) * (key(a) - key(b)));
    patchList($('#kList'), list.map(c => [c.id, kRow(c)])); return;
  }
  const cats = m === 'us' ? UCAT : CCAT, ck = m === 'us' ? 'uCat' : 'cCat', skk = m === 'us' ? 'uSortKey' : 'cSortKey';
  if (!cats[S[ck]]) S[ck] = 'all'; if (!U_SORTS[S[skk]]) S[skk] = 'v';
  const sk = S[skk], list = Object.values(UC).filter(c => c.m === m && (S[ck] === 'all' || c.c === S[ck]));
  if (sk !== 'v') { const key = c => sk[0] === 'p' ? uPx(c.id) : uChg(c.id); list.sort((a, b) => (sk.endsWith('a') ? 1 : -1) * (key(a) - key(b))); }
  // 전체 + 기본순이면 분류마다 제목을 달아서 나눠 보여줘요
  const grouped = S[ck] === 'all' && sk === 'v' && m === 'us';
  const parts = [['ix', ixCard()], ['fx', fxRow()]];
  if (grouped) Object.entries(UCAT).forEach(([k, ct]) => { const l = list.filter(c => c.c === k); if (!l.length) return; parts.push(['h:' + k, `<div class="ucat-h" style="--c:${ct.c}"><b>${ct.n}</b><small>${l.length}</small></div>`]); l.forEach(c => parts.push([c.id, uRow(c)])); });
  else list.forEach(c => parts.push([c.id, uRow(c)]));
  patchList($('#kList'), parts);
  ixLoad(); requestAnimationFrame(ixDraw);
}
uFetch();

// 주식·달러 개수 입력: −/+ 버튼, 1·10·절반·최대(전부)
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('button'); if (!t || !S.sheet || S.sheet.type !== 'us') return;
  const sh = S.sheet;
  if (t.dataset.uqs) { const c = uCalc({ ...sh, m: 'buy', all: false }); sh.all = false; sh.qty = String(Math.max(0, Math.min(c.maxQ ?? 1e12, Math.floor(+sh.qty || 0) + +t.dataset.uqs))); const i = $('#uQtyIn'); if (i) i.value = sh.qty; uUpdateEst(); }
  if (t.dataset.uqset) { const v = t.dataset.uqset; sh.all = false; const mx = Math.floor(uCalc({ ...sh, m: 'buy', all: false }).maxQ || 0);
    sh.qty = v === 'all' ? '' : String(v === 'max' ? mx : v === '.5' ? Math.floor(mx / 2) : Math.min(mx, +v)); const i = $('#uQtyIn'); if (i) i.value = sh.qty; document.querySelectorAll('[data-kall]').forEach(b => b.setAttribute('aria-pressed', 'false')); uUpdateEst(); }
});
document.addEventListener('input', e => { if (e.target.id === 'uQtyIn' && S.sheet) { S.sheet.all = false; uUpdateEst(); } });
// 종목을 가진 친구들 (현물·롱숏 모두): 이름을 누르면 그 사람 프로필
function holdersHTML(sym) {
  const isK = !!KC[sym], hf = isK ? 'kHold' : 'uHold', ff = isK ? 'kFut' : 'uFut', px = isK ? kPx(sym) : uWon(sym);
  const list = activePlayers().map(p => { const q = (p[hf] || {})[sym] || 0, o = (p[ff] || {})[sym], v = q * px + (o ? fVal(o, px || o.e) : 0); return { p, q, o, v }; })
    .filter(x => x.v >= 10000).sort((a, b) => b.v - a.v);
  if (!list.length) return `<div class="holders"><span class="hl-t">보유한 친구</span><span class="dim">아직 없어요</span></div>`;
  return `<div class="holders"><span class="hl-t">보유한 친구 ${list.length}</span><div class="hl-list">${list.slice(0, 8).map(x => `<button type="button" class="hl-c${x.p.id === S.uid ? ' me' : ''}" data-player="${esc(x.p.id)}">${ava(x.p)}<span><b>${esc(x.p.id === S.uid ? '나' : x.p.name)}</b><small class="num">${x.o ? `${x.o.x}배 ${x.o.d > 0 ? '롱' : '숏'}` : !isK ? uQty(x.q, sym) : kQty(x.q) + ' ' + KC[sym].a}${x.o && x.q ? ' +현물' : ''} · ${man(x.v)}원</small></span></button>`).join('')}</div></div>`;
}

/* ───────── 나스닥 카드 (주식 탭 맨 위) ───────── */
function ixCard() {
  if (!IXQ.p) return '';
  const ch = IXQ.base ? IXQ.p / IXQ.base - 1 : 0;
  return `<div class="ixcard ${cls(ch)}"><div class="ix-l"><small>나스닭 종합 <i>${ST_TXT[IXQ.st] || '장 마감'}</i></small><b class="num">${IXQ.p.toLocaleString('en-US', { maximumFractionDigits: 2 })}</b>
    <span class="num ${cls(ch)}">${ch > 0 ? '+' : ''}${(IXQ.p - IXQ.base).toLocaleString('en-US', { maximumFractionDigits: 2 })} (${(ch * 100).toFixed(2)}%)</span></div><canvas id="ixChart" class="ix-c" aria-label="나스닥 하루 그래프"></canvas></div>`;
}
async function ixLoad() {
  if (Date.now() - IXC.t < 60e3) return; IXC.t = Date.now();
  try {
    const bars = ((((await (await fetch('https://ts-api.cnbc.com/harmony/app/charts/1D.json?symbol=.IXIC')).json()) || {}).barData || {}).priceBars) || [];
    if (!bars.length) return;
    const day = bars[bars.length - 1].tradeTime.slice(0, 8), list = bars.filter(b => b.tradeTime.slice(0, 8) === day);
    const step = Math.max(1, Math.floor(list.length / 120));
    IXC.pts = list.filter((b, i) => i % step === 0 || i === list.length - 1).map(b => [b.tradeTimeinMills, numOf(b.close)]);
    const f = list[0], hh = +f.tradeTime.slice(8, 10), mm = +f.tradeTime.slice(10, 12); IXC.t0 = f.tradeTimeinMills - ((hh - 9) * 60 + mm - 30) * 6e4; IXC.t1 = IXC.t0 + 6.5 * H;   // 정규장 09:30~16:00
    ixDraw();
  } catch {}
}
// 작은 그래프: 선 + 옅은 채움 + 전날 종가 점선 (축 글자 없이)
function ixDraw() {
  const cv = $('#ixChart'); if (!cv || !IXC.pts || IXC.pts.length < 2) return;
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
  cv.width = w * dpr; cv.height = h * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const pts = IXC.pts.filter(([t]) => t >= IXC.t0 - 6e4); if (pts.length < 2) return;
  const base = IXQ.base || pts[0][1], ps = pts.map(x => x[1]), lo = Math.min(...ps, base), hi = Math.max(...ps, base), sp = hi - lo || 1;
  const X = t => 2 + (w - 4) * Math.min(1, (t - IXC.t0) / (IXC.t1 - IXC.t0)), Y = v => 3 + (h - 6) * (1 - (v - lo) / sp);
  const cs = getComputedStyle(document.documentElement), col = (ps[ps.length - 1] >= base ? cs.getPropertyValue('--up') : cs.getPropertyValue('--down')).trim();
  g.strokeStyle = cs.getPropertyValue('--faint').trim(); g.setLineDash([2, 3]); g.lineWidth = 1; g.beginPath(); g.moveTo(0, Y(base)); g.lineTo(w, Y(base)); g.stroke(); g.setLineDash([]);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, col + '40'); gr.addColorStop(1, col + '00');
  g.beginPath(); pts.forEach(([t, v], i) => i ? g.lineTo(X(t), Y(v)) : g.moveTo(X(t), Y(v))); g.lineTo(X(pts[pts.length - 1][0]), h); g.lineTo(X(pts[0][0]), h); g.closePath(); g.fillStyle = gr; g.fill();
  g.beginPath(); pts.forEach(([t, v], i) => i ? g.lineTo(X(t), Y(v)) : g.moveTo(X(t), Y(v))); g.strokeStyle = col; g.lineWidth = 1.5; g.lineJoin = 'round'; g.stroke();
}
