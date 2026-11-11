'use strict';
function renderHeader() {
  const fab = $('#fab');
  fab.hidden = true; return; // 하단 총자산 박스는 안 보여요 (홈 맨 위 카드로 옮겼어요)
  const w = worth(S.me, S.tick), w0 = worthPrev(S.me, S.tick), d2 = w - w0, r2 = w0 > 0 ? d2 / w0 : 0;
  const roi = roiOf(S.me, w), rk = ranking(S.tick).findIndex(p => p.id === S.uid) + 1;
  const allCash = isAllCash(S.me);
  const invested = Math.max(0, w - S.me.cash - BONUS * pendingOf(S.me));
  const l2 = `<span class="l2">현금 ${man(S.me.cash)} · 투자중 ${man(invested)}</span>`;
  if (S.sessBase == null) S.sessBase = w;
  const sig = String(rk);
  fab.hidden = false;
  fab.dataset.tabGo = allCash ? 'market' : 'assets';
  fab.innerHTML = allCash
    ? `<span class="rk${rk === 1 ? ' r1' : ''}">${rk}위</span><span class="mid">${l2}<span class="l">내 총자산 · 100% 현금 보유 중</span><span class="v num">${won(w)}</span></span><span class="c buy-prompt">자산을 구매하세요!</span>`
    : `<span class="rk${rk === 1 ? ' r1' : ''}">${rk}위</span><span class="mid">${l2}<span class="l">내 총자산 · 1초 전 <b class="sd ${cls(d2)}">${signWon(d2)}</b> · 누적 <b class="sd ${cls(roi)}">${pctTxt(roi)}</b></span><span class="v num">${won(w)}</span></span><span class="c num ${cls(r2)}">${pct2Txt(r2)}</span>`;
  if (fab.dataset.sig && fab.dataset.sig !== sig) { fab.classList.remove('bump'); void fab.offsetWidth; fab.classList.add('bump'); }
  fab.dataset.sig = sig;
}
function renderClock() {
  const t = now();
  const bc = $('#bonusCd'); if (bc) bc.textContent = hms(nextSlotAt(t) - t);
  const rc = $('#rentCd'); if (rc) rc.textContent = mmss((rentHour(t) + 1) * H - t);
  if (!$('#nextLab')) return;
  if (seasonOver()) { $('#nextLab').textContent = '시즌 끝! 새 시즌까지'; $('#nextName').textContent = '월요일 0시'; $('#countdown').textContent = hms(S.season.start + 7 * D - t); return; }
  $('#nextLab').textContent = '다음 장 마감까지';
  $('#nextName').textContent = tickLabel(S.tick + 1);
  $('#countdown').textContent = hms(tickTime(S.season.start, S.tick + 1) - t);
}
const mmss = ms => { ms = Math.max(0, ms); const s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
function hms(ms) { ms = Math.max(0, ms); const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h > 23 ? Math.floor(h / 24) + '일 ' + String(h % 24).padStart(2, '0') : String(h).padStart(2, '0')) + ':' + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0'); }

/* ───────── home: index + leaderboard ───────── */
function renderHome() {
  const el = $('#tab-home');
  let h = '';
  if (S.me) {
    const me = kInit(S.me), w = worth(me, S.tick), r = roiOf(me, w), rk = ranking(S.tick).findIndex(p => p.id === S.uid) + 1;
    const chief = GU_RANK.filter(g => (guChief()[g] || {}).id === S.uid);
    h += `<button type="button" class="wal krwwal one" data-tab-go="assets"><span class="wl-h"><span class="wl-ic">₩</span>내 총자산<small>${rk ? rk + '위' : ''}</small></span>
      <b class="num">${won(w)}</b><span class="wl-s num">${pctTxt(r)} · 현금 ${won(me.cash)} · LV.${lvOf(me)}</span></button>
    <div class="walbar"><span>${chief.length ? `👑 ${chief.length > 2 ? chief[0] + ' 외 ' + (chief.length - 1) + '곳 구청장' : chief.join('·') + '청장'}` : '🏛️ 구채를 사서 구청장이 되어 보세요'}</span></div>`;
  }
  h += rescueCard();
  if (!S.me && !S.readOnly && S.mode !== 'loading') {
    h += `<div class="card join"><b>썬빗에 참가하세요</b><span class="dim" style="font-size:13px;font-weight:600">10억원으로 시작해요</span><button class="cta" type="button" data-join>참가하기</button></div>`;
  }
  if (S.mode === 'demo') h += `<p class="hint" style="margin-top:-10px">연습 모드예요. 연습봇 셋과 겨뤄요. 코인 시세는 진짜예요.</p>`;
  if (S.readOnly) h += `<p class="hint" style="margin-top:-10px">관전 모드예요. 거래하려면 방장에게 편집자 초대를 받아야 해요.</p>`;

  const RPG = 8, cur = S.mode === 'loading' ? [] : ranking(S.tick), rPages = Math.max(1, Math.ceil(cur.length / RPG));
  S.rankPage = Math.max(0, Math.min(S.rankPage || 0, rPages - 1));
  h += `<div class="sec"><div class="sec-h"><h2>순위</h2><span class="rpager"><button type="button" data-rankpg="-1" aria-label="이전 순위" ${S.rankPage ? '' : 'disabled'}>◀</button><small class="num">${S.rankPage + 1}/${rPages}</small><button type="button" data-rankpg="1" aria-label="다음 순위" ${S.rankPage < rPages - 1 ? '' : 'disabled'}>▶</button></span></div>`;
  if (S.mode === 'loading') h += `<div class="empty">순위를 불러오는 중…</div>`;
  else if (!cur.length) h += `<div class="empty">아직 아무도 없어요. 첫 번째로 참가해보세요.</div>`;
  else {
    const TOPS = topOwners();
    h += `<div class="card lb lbk">`;
    cur.slice(S.rankPage * RPG, (S.rankPage + 1) * RPG).forEach((p, j) => {
      const i = S.rankPage * RPG + j, lord = lordOf(p.id, TOPS), r = roiOf(p, p.w);
      h += `<button class="lrow${p.id === S.uid ? ' isme' : ''}${okPhoto(p.banner) ? ' bn' : ''}" type="button" data-player="${esc(p.id)}"${okPhoto(p.banner) ? ` style="--bn:url(${p.banner})"` : ''}><span class="rk r${i + 1}">${i + 1}</span>${ava(p)}
        <span class="who"><b>${esc(p.name)}</b>${p.bot ? '<span class="tag bot">봇</span>' : ''}<small class="lv">LV.${lvOf(p)}${lord ? ` · <span class="lord">👑 ${lord}</span>` : ''}</small></span>
        <span class="r num"><b>${man(p.w)}원</b><small class="${cls(r)}">${pctTxt(r)}</small></span></button>`;
    });
    h += `</div><p class="hint">총자산 = 현금 + 코인 + 미국주식 + 구채 + 가상주식. %는 받은 돈 대비 누적 수익률이에요. 이름을 누르면 지갑이 다 보여요.</p>`;
  }
  h += `</div>`;
  el.innerHTML = h;
}
// 투자 탭: 주식 · 코인 · 부동산 · 환율
function renderInvest() {
  const el = $('#tab-invest'); const k = S.tick;
  const subs = []; S.inv = 'stock'; // 가짜 달러는 없앴어요 (진짜 환율은 거래소 > 미국주식)
  if (!el.querySelector('#invHud')) el.innerHTML = `<div id="invHud"></div><div class="seg invseg" id="invSeg" role="group" aria-label="투자 메뉴"></div><div id="invBody" class="sec" style="gap:18px"></div>`;
  $('#invHud').innerHTML = ''; const nPos = S.me ? myPositions().filter(hudFilter()).length : 0;
  const posBtn = nPos ? `<button type="button" class="posbtn" id="posOpen">📋 내 포지션 ${nPos}</button>` : '';
  $('#invSeg').innerHTML = subs.map(([v, l]) => `<button type="button" data-inv="${v}" aria-pressed="${S.inv === v}">${l}</button>`).join('');
  const body = $('#invBody');
  if (body.dataset.sub !== S.inv) { body.innerHTML = ''; body.dataset.sub = S.inv; }
  if (S.inv === 'estate') { renderEstList(body); return; }
  if (S.inv === 'fx') {
    const fp = px('USD', k), fc = nowChg('USD'), held = (S.me && (S.me.hold || {}).USD) || 0, avg = held ? ((S.me.cost || {}).USD || fp) : 0;
    const val = held * fp, pnl = held ? (fp - avg) * held : 0, pct = avg ? fp / avg - 1 : 0, pos = Math.max(0, Math.min(100, (fp - 900) / 10));
    body.innerHTML = `<div class="sec"><div class="sec-h"><h2>환율</h2>${posBtn}</div>
      <div class="card fxrate"><div class="fx-l"><small>1달러</small><b class="num">${PW('USD', fp)}</b></div><span class="fx-c num ${cls(fc)}">${pctTxt(fc)}<small>2시간</small></span></div>
      <div class="fxbar"><span>900</span><div class="fxtrack"><i style="left:${pos}%"></i></div><span>1,900</span></div>
      <div class="slist">${stockRow(USD)}</div></div>
      ${held ? `<div class="card fxcard"><div class="fx-l"><small>내 달러</small><b class="num">${QT('USD', held)}</b><span class="num">${won(val)} · 평단 ${PW('USD', avg)}</span></div>
        <span class="ws-pnl"><small class="num amt ${cls(pnl)}">${signWon(pnl)}</small><b class="num pct ${cls(pnl)}">${pctTxt(pct)}</b></span></div>` : ''}
      <p class="hint">환율이 오를 때 달러를 갖고 있으면 원화 가치가 올라요. 1달러 단위로 사고팔고, 수수료는 0.3%예요.</p>`;
    return;
  }
  if (S.inv === 'stock') {
    const heldE = EQ.filter(x => exitMode(x.id));
    if (!SECTORS[S.eqSec]) S.eqSec = Object.keys(SECTORS)[0];
    const secsE = Object.entries(SECTORS).map(([k2, v]) => [k2, v.n]);
    const he = `<div class="sec"><div class="sec-h"><h2>주식</h2>${posBtn || '<small>가격 높은 순</small>'}</div>
      <div class="chips" role="group" aria-label="주식 분류">${secsE.map(([k2, l]) => `<button type="button" data-eqsec="${k2}" aria-pressed="${S.eqSec === k2}">${l}</button>`).join('')}</div>
      <div class="slist">${byPrice(S.eqSec === 'mine' ? heldE : EQ.filter(x => x.s === S.eqSec)).map(stockRow).join('')}</div></div>
      <p class="hint">주식은 코인보다 덜 거칠게 움직여요. 매수·매도·공매도·레버리지 모두 돼요. 거래정지는 없어요.</p>`;
    const oc = body.querySelector('.chips'), ox = oc ? oc.scrollLeft : 0; body.innerHTML = he; const nc = body.querySelector('.chips'); if (nc && ox) nc.scrollLeft = ox;
    return;
  }
  let h = '';
  const held = STOCKS.filter(x => exitMode(x.id));
  if (!COIN_CATS[S.homeSec]) S.homeSec = Object.keys(COIN_CATS)[0];
  const secs = Object.entries(COIN_CATS).map(([k2, v]) => [k2, v.n]);
  h += `<div class="sec"><div class="sec-h"><h2>코인</h2>${posBtn || '<small>가격 높은 순</small>'}</div>
    <div class="chips" role="group" aria-label="종목 분류">${secs.map(([k2, l]) => `<button type="button" data-homesec="${k2}" aria-pressed="${S.homeSec === k2}">${l}</button>`).join('')}</div>
    <div class="slist">${byPrice(S.homeSec === 'mine' ? held : STOCKS.filter(x => x.cc === S.homeSec)).map(stockRow).join('')}</div></div>`;
  const oldChips = body.querySelector('.chips'), sx = oldChips ? oldChips.scrollLeft : 0;
  body.innerHTML = h;
  const newChips = body.querySelector('.chips'); if (newChips && sx) newChips.scrollLeft = sx;
}

// 내 포지션 한 줄씩: 원금(넣은 돈) → 평가(지금 정리하면 받는 돈), 손익, 고점 대비 청산까지 남은 거리
function myPositions(me) {
  me = me || S.me; if (!me) return [];
  const out = [], k = S.tick;
  Object.entries(me.hold || {}).filter(([s]) => SM[s]).forEach(([s, q]) => {
    const p = px(s, k), principal = q * ((me.cost || {})[s] || p), value = q * p - Math.floor(q * p * FEE);
    out.push({ sym: s, kind: 'spot', label: '현물', mode: 'sell', principal, value });
  });
  Object.entries(me.lev || {}).filter(([s]) => SM[s]).forEach(([s, o]) => {
    const p = px(s, k), d = o.d || 1, value = Math.max(0, levVal(o, p, s) - Math.ceil(o.q * p * FEE));
    const liqP = o.e - d * (o.m * .94) / o.q, dist = Math.max(0, d * (p - liqP) / p);
    out.push({ sym: s, kind: 'lev', label: `${d < 0 ? '📉' : '🚀'}${o.x}배 ${levSide(o)}`, mode: 'levclose', principal: o.m, value, dist, distMax: .94 / (o.x || 25) });
  });
  Object.entries(me.shorts || {}).filter(([s]) => SM[s]).forEach(([s, o]) => {
    const p = px(s, k), value = Math.max(0, o.q * (2 * o.e - p) - Math.ceil(o.q * p * FEE)), liqP = o.e * 1.35;
    out.push({ sym: s, kind: 'short', label: '🎯공매도', mode: 'cover', principal: o.q * o.e, value, dist: Math.max(0, (liqP - p) / p), distMax: .35 });
  });
  out.forEach(x => { x.pnl = x.value - x.principal; x.pct = x.principal ? x.pnl / x.principal : 0; });
  return out.sort((a, b) => b.pnl - a.pnl);
}
// 투자 탭에서 지금 보는 시장(코인·주식·달러)의 포지션만 보여요
const hudFilter = () => S.tab !== 'invest' ? () => true : S.inv === 'coin' ? x => !isEq(x.sym) : S.inv === 'stock' ? x => isEq(x.sym) && !SM[x.sym].fx : S.inv === 'fx' ? x => !!SM[x.sym].fx : () => false;
function posHUD() {
  const list = myPositions().filter(hudFilter()).sort((a, b) => (a.kind === 'spot') - (b.kind === 'spot') || b.value - a.value); if (!list.length) return '';
  const P = list.reduce((a, x) => a + x.principal, 0), V = list.reduce((a, x) => a + x.value, 0), pnl = V - P, pct = P ? pnl / P : 0;
  const armed = S.closeAllAt && Date.now() - S.closeAllAt < 4000;
  const off = seasonOver() || S.readOnly || S.saving;
  return `<div class="card hud ${cls(pnl)}"><div class="hud-top"><div><small>🔥 내 실시간 포지션 · ${list.length}개</small>
      <div class="hud-pnl num">${signWon(pnl)} <span>(${pctTxt(pct)})</span></div>
      <small class="num">원금 ${man(P)} → 평가 ${man(V)}</small></div>
      <button type="button" class="hud-all${armed ? ' armed' : ''}" id="closeAllBtn" ${off ? 'disabled' : ''}>${armed ? '한 번 더 누르면<br>전부 정리' : '⚡ 전체<br>정리'}</button></div>
    <div class="hud-list">${list.map(x => { const st = SM[x.sym]; const g = x.dist != null ? Math.min(1, x.dist / x.distMax) : null;
      return `<div class="hud-row"><button type="button" class="hud-main" data-quick="${x.mode}" data-sym="${x.sym}">${badge(st)}<span class="sname"><b>${esc(st.n)} <span class="postag ${x.kind === 'spot' ? 'spot' : x.label.includes('숏') || x.kind === 'short' ? 'short' : 'long'}">${x.label}</span></b>
        <small class="num">${man(x.principal)} → ${man(x.value)} · <b class="${cls(x.pnl)}">${signWon(x.pnl)} (${pctTxt(x.pct)})</b></small>
        ${g != null ? `<span class="gauge${g < .3 ? ' danger' : ''}"><i style="width:${(g * 100).toFixed(0)}%"></i></span><small class="gtxt${g < .3 ? ' up' : ''}">청산까지 ${(x.dist * 100).toFixed(1)}%</small>` : ''}</span></button>
        <button type="button" class="hud-close" data-closepos="${x.kind}:${x.sym}" ${off ? 'disabled' : ''}>즉시<br>정리</button></div>`; }).join('')}</div></div>`;
}
async function closePositions(filter) {
  if (!S.me || S.saving || S.readOnly) return;
  const ready = x => x.kind === 'spot' || lqReady(S.uid, x.kind, x.sym, (x.kind === 'lev' ? S.me.lev : S.me.shorts)[x.sym]);
  const all = myPositions().filter(filter), list = all.filter(x => !atkLive(x.sym, S.uid) && ready(x) && !(haltLeft(x.sym) > 0));
  const halted = all.find(x => haltLeft(x.sym) > 0); if (halted) toast(haltMsg(halted.sym));
  if (all.some(x => !ready(x))) toast('⏳ 앱이 꺼져 있던 동안의 청산 여부를 확인하는 중인 포지션은 잠시 후 정리돼요');
  if (all.length > list.length) toast('💥 내가 공격한 종목은 충격이 끝날 때까지 정리할 수 없어요');
  if (!list.length) return;
  const before = S.me, me = JSON.parse(JSON.stringify(before)); let got = 0, pnl = 0;
  list.forEach(x => {
    if (x.kind === 'spot') { delete me.hold[x.sym]; if (me.cost) delete me.cost[x.sym]; }
    if (x.kind === 'lev') { me.levPnl = (me.levPnl || 0) + x.pnl; delete me.lev[x.sym]; }
    if (x.kind === 'short') delete me.shorts[x.sym];
    got += x.value; pnl += x.pnl;
  });
  me.cash = Math.round(me.cash + got);
  S.saving = true; const ok = await saveMe(me, before); S.saving = false; S.closeAllAt = null;
  if (ok) {
    list.forEach(x => addFeed(x.kind === 'spot' ? { kind: 'sell', sym: x.sym, amt: x.value, pnl: Math.round(x.pnl) } : x.kind === 'lev' ? { kind: 'levclose', sym: x.sym, amt: x.pct, pnl: Math.round(x.pnl) } : { kind: 'cover', sym: x.sym, amt: x.value, pnl: Math.round(x.pnl) }));
    toast(`${list.length > 1 ? `⚡ ${list.length}개 전부 정리` : `${SM[list[0].sym].n} 정리`} · ${signWon(pnl)} → 현금 ${man(got)}원`);
    if (pnl > 0) { confetti(); buzz(60); }
  }
  renderAll(); if (S.sheet && S.sheet.type === 'pos') renderSheet();
}
const byPrice = arr => arr.slice().sort((a, b) => px(b.id, S.tick) * cf(b.id) - px(a.id, S.tick) * cf(a.id));
function exitMode(id) {
  if (!S.me) return null;
  if ((S.me.hold || {})[id]) return 'sell';
  if ((S.me.lev || {})[id]) return 'levclose';
  if ((S.me.shorts || {})[id]) return 'cover';
  return null;
}
function stockRow(s) {
  const p = px(s.id, S.tick), c = nowChg(s.id);
  const q = S.me && S.me.hold && S.me.hold[s.id], sq = S.me && S.me.shorts && S.me.shorts[s.id];
  const tc = S.talk.filter(t => t.sym === s.id).length;
  const lv = S.me && S.me.lev && S.me.lev[s.id];
  const pos = lv ? `<span class="postag ${(lv.d || 1) < 0 ? 'short' : 'long'}">${lv.x}배 ${levSide(lv)}</span>` : sq ? `<span class="postag short">공매도</span>` : '';
  const mp = myPositions().filter(x => x.sym === s.id); const rowPnl = mp.reduce((a, x) => a + x.pnl, 0), rowP = mp.reduce((a, x) => a + x.principal, 0);
  const hl = haltLeft(s.id) > 0;
  const sub = (hl ? '<span class="postag short">⛔ 거래정지</span> ' : '') + pos + (q ? `<span class="mine">${QT(s.id, q)} 보유</span>` : pos ? '' : catName(s)) + (mp.length && !s.fx ? ` <b class="rowpnl ${cls(rowPnl)}">${signWon(rowPnl)} (${pctTxt(rowP ? rowPnl / rowP : 0)})</b>` : '') + (tc ? ` · 💬${tc}` : '');
  const fl = LV.flash && LV.flash[s.id] ? ' f' + LV.flash[s.id] : '';
  const off = seasonOver() || S.readOnly;
  return `<div class="srow${fl ? ' row' + fl.trim() : ''}"><button class="srow-main" type="button" data-stock="${s.id}">${badge(s)}<span class="sname"><b class="${lv ? ((lv.d || 1) < 0 ? 'hot-short' : 'hot-long') : sq ? 'hot-short' : ''}">${esc(s.n)}</b><small>${sub}</small></span>
    <span class="sprice"><div class="p num${fl}">${PW(s.id, p)}</div><div class="c num ${cls(c)}">${pctTxt(c)}</div></span></button>
    <span class="tbtns"><button class="tb trade${exitMode(s.id) ? ' lit' : ''}" type="button" data-quick="buy" data-sym="${s.id}" ${off ? 'disabled' : ''}>거래</button></span></div>`;
}

/* ───────── payout every 12h ───────── */
const slotOf = t => String(Math.floor((t + KST) / PERIOD));
const slotStart = t => Math.floor((t + KST) / PERIOD) * PERIOD - KST;
const nextSlotAt = t => slotStart(t) + PERIOD;
// payouts earned = 12h slots touched since joining (the joining slot counts), capped at season end
function earnedOf(p) {
  const j = p && (p.joined || (p.bot ? S.season.start : 0)); if (!j) return 0;
  const end = now(); if (end < j) return 0;
  return Math.floor((slotStart(end) - slotStart(j)) / PERIOD) + 1;
}
const paidOf = p => p.bonusN != null ? p.bonusN : Math.max(0, Math.round(((p.inflow || CASH0) - CASH0) / BONUS));
const pendingOf = p => 0; // 정기 지원금 없어요
// 파산 구제: 총자산이 500만원 이하로 떨어지면 5억을 다시 받을 수 있어요
const RESCUE_AT = 5_000_000, RESCUE_AMT = 500_000_000;
const canRescue = () => false; // 파산 지원금은 krw.js(1,000만원)
function rescueCard() {
  if (!canRescue()) return '';
  return `<div class="card rescue"><span class="t"><b>💸 파산 구제금 5억</b><small>총자산이 500만원 이하예요. 5억을 받고 다시 시작하세요.</small></span><button type="button" id="rescueBtn" ${S.saving ? 'disabled' : ''}>5억 받기</button></div>`;
}
async function claimRescue() {
  if (!canRescue() || S.saving) return;
  const before = S.me, me = JSON.parse(JSON.stringify(before));
  me.cash = Math.round(me.cash + RESCUE_AMT); me.inflow = (me.inflow || CASH0) + RESCUE_AMT; me.rescueN = (me.rescueN || 0) + 1;
  S.saving = true; const ok = await saveMe(me, before); S.saving = false;
  if (ok) { toast('💸 구제금 5억이 들어왔어요'); renderAll(); }
}
function bonusCard() {
  if (!S.me || S.readOnly) return '';
  const n = earnedOf(S.me);
  return `<div class="card bonus"><span class="t"><b>${seasonOver() ? '이번 시즌 지원금 끝' : '다음 지원금 2억원'}</b><small>${seasonOver() ? `이번 주 ${n}번 받았어요` : `<span class="num" id="bonusCd">${hms(nextSlotAt(now()) - now())}</span> 뒤 자동 지급 · 지금까지 ${n}번`}</small></span><span class="bonus-amt num">${man(BONUS * n)}원</span></div>`;
}
let crediting = false;
async function autoCredit() {
  if (!S.me || S.readOnly || S.saving || crediting || (S.mode === 'live' && !S.loaded)) return;
  const due = pendingOf(S.me), needSeedUp = (S.me.inflow || 0) < CASH0;
  if (!due && !needSeedUp) { return; }
  crediting = true;
  const before = S.me; const me = JSON.parse(JSON.stringify(before));
  const n = earnedOf(before), seedDiff = needSeedUp ? Math.max(0, CASH0 - (before.inflow || 100_000_000)) : 0;
  me.cash += BONUS * due + seedDiff; me.bonusN = n; me.inflow = CASH0 + BONUS * n;
  const ok = await saveMe(me, before); crediting = false;
  if (ok) { toast(seedDiff ? `🔥 시드 상향! +${won(seedDiff)} 지급 완료!` : due > 1 ? `지원금 ${due}번 밀린 거 ${man(BONUS * due)}원이 들어왔어요` : '지원금 2억원이 들어왔어요'); renderAll(); }
}

// 월세 is paid every hour for buildings you own and that aren't destroyed (missed hours are paid when you come back)
async function creditRent() {
  const me0 = S.me; const hNow = rentHour(now()); let paid = me0.rentH ?? hNow; if (paid < 1e5) paid = hNow - 1; // old week-relative counter
  if (hNow <= paid) return;
  const mine = myEstates({ id: S.uid }).filter(b => !estOf(b.id).destroyed);
  const before = me0; const me = JSON.parse(JSON.stringify(before)); me.rentH = hNow;
  const hrs = hNow - paid, hb = estHourly();
  const gross = Math.round(hb.rent * hrs), cost = Math.round((hb.maint + hb.tax) * hrs), amt = gross - cost;
  me.cash += amt; me.rentTotal = (me.rentTotal || 0) + gross; me.taxTotal = (me.taxTotal || 0) + cost;
  crediting = true; const ok = await saveMe(me, before); crediting = false;
  if (ok && gross) { toast(`🏢 ${hrs > 1 ? `밀린 ${hrs}시간치 ` : ''}월세 +${won(gross)} · 유지비·세금 -${won(cost)} → ${signWon(amt)}`); if (amt > 0) { confetti(); buzz(40); } renderAll(); }
}
function estHourly() {
  const vals = myEstates({ id: S.uid }).filter(b => !estOf(b.id).destroyed).map(b => estVal(b.id, S.tick));
  const total = vals.reduce((a, v) => a + v, 0);
  const rent = total * RENT, maint = total * MAINT, ptax = total * PTAX, jtax = Math.max(0, total - JTAX_FROM) * JTAX;
  return { total, rent, maint, tax: ptax + jtax, jtax, net: rent - maint - ptax - jtax };
}
const rentPerHour = () => estHourly().net;

/* ───────── real estate ───────── */
async function saveEstate(bid, doc) {
  if (S.mode === 'demo') { S.estates[bid] = doc; LS.set('demoEstAll', Object.fromEntries(Object.entries(S.estates).filter(([, e]) => !e.bot))); return true; }
  try { await S.db.doc('estates/' + bid).set(doc); S.estates[bid] = doc; return true; } catch { toast('부동산 정보를 저장하지 못했어요.'); return false; }
}
function estState(bid) {
  const e = estOf(bid); if (!e) return 'free';
  if (e.owner === S.uid) return e.destroyed ? 'mineBroken' : 'mine';
  return e.destroyed ? 'otherBroken' : 'other';
}
// 🏚️ 건물 공격: 소형(3% 내고 5% 확률) · 대형(25% 내고 40% 확률) · 강제 매입(200%, 원래 주인에게 100% 보상)
// 파괴된 건물은 가격이 멈추고, 누구나 멈춘 값의 120%로 매입 · 주인은 60%로 복구. 사거나 복구한 뒤 10분은 공격 면역.
const EST_ATK = { small: { cost: .03, p: .05 }, big: { cost: .25, p: .4 } }, EST_SHIELD = 10 * 60e3;
const estShield = bid => { const e = estOf(bid); return e && e.safe ? Math.max(0, e.safe - Date.now()) : 0; };
function estPrice(bid, action) {
  const e = estOf(bid), v = estVal(bid, S.tick);
  const gain = e && e.owner === S.uid ? Math.max(0, v - (e.paid || v)) : 0;
  const fz = e && e.destroyed ? e.destroyed.value : 0;
  return { buy: Math.round(v * (1 + ACQ_TAX)), sell: Math.round(v - gain * CGT), small: Math.round(v * EST_ATK.small.cost), big: Math.round(v * EST_ATK.big.cost), force: Math.round(v * 2), restore: Math.round(fz * .6), buy120: Math.round(fz * 1.2) }[action];
}
const ZOOM_PINS = 2.2;
function ownerColor(uid) { return uid === S.uid ? 'var(--violet)' : avaColor(uid); }
function pinsSVG() {
  const zoom = MAP.w0 / S.mapV.w;
  return shownEst().map(b => {
    const [x, y] = mapXY(b); const e = estOf(b.id); const broken = e && e.destroyed; const owned = !!e;
    const col = broken ? '#ffe1e1' : owned ? ownerColor(e.owner) : '#fff';
    const flag = owned ? `<g class="flag" transform="translate(0,-34)"><rect x="-${(nameOf(e.owner).length * 7 + 30) / 2}" y="-15" width="${nameOf(e.owner).length * 7 + 30}" height="24" rx="12" fill="${broken ? 'var(--up)' : ownerColor(e.owner)}" stroke="var(--ink)" stroke-width="1.5"/><text y="2" class="fn">${e.owner === S.uid ? '👑 ' : ''}${esc(e.owner === S.uid ? '내 건물' : nameOf(e.owner))}</text></g>` : '';
    const tv = e && e.destroyed ? e.destroyed.value : estVal(b.id, S.tick), tier = tv >= 1e12 ? 't1' : tv >= 1e11 ? 't2' : 't3';
    return `<g class="pin ${tier}${owned ? ' owned' : ''}${broken ? ' broken' : ''}" data-estate="${b.id}" data-x="${x}" data-y="${y}" role="button" tabindex="0" aria-label="${esc(b.n)}">
      <circle r="22" class="hit"/><circle r="15" fill="${col}" stroke="${broken ? 'var(--up)' : 'var(--ink)'}" stroke-width="2" ${broken ? 'stroke-dasharray="4 3"' : ''}/>
      <text class="pi" y="6">${broken ? '💥' : ICON[b.t]}</text>${flag}
      <rect class="plbg" x="${-(b.n.replace(/ \(한 채\)$/, '').length * 12.5 + 14) / 2}" y="19" width="${b.n.replace(/ \(한 채\)$/, '').length * 12.5 + 14}" height="31" rx="8"/><text class="pl" y="31">${esc(b.n.replace(/ \(한 채\)$/, ''))}</text><text class="pv" y="45">${man(e && e.destroyed ? e.destroyed.value : estVal(b.id, S.tick))}</text></g>`;
  }).join('');
}
// 구 영주: 그 구에서 건물을 가장 많이 가진 사람
function lordOf(uid, top) { const g = Object.entries(top || topOwners()).filter(([, u]) => u === uid).map(([gu]) => gu); return g.length ? (g.length > 2 ? `${g[0]} 외 ${g.length - 1}곳 구청장` : g.join('·') + '청장') : ''; }
function topOwners() { return Object.fromEntries(Object.entries(guChief()).map(([g, c]) => [g, c.id])); }
function topOwnersOld() {
  const top = {}, agg = {};
  ESTATES.forEach(b => { const e = estOf(b.id); if (!e || e.destroyed) return; const a = (agg[b.gu] ||= {}), o = (a[e.owner] ||= { n: 0, v: 0 }); o.n++; o.v += estVal(b.id, S.tick); });
  Object.entries(agg).forEach(([gu, a]) => { top[gu] = Object.entries(a).sort((x, y) => y[1].n - x[1].n || y[1].v - x[1].v)[0][0]; });
  return top;
}
// 도장: 그 구 1등 땅주인 프로필을 구 한가운데에 찍어요. 건물 점보다 위에 그려서 안 가려져요 (확대하면 사라짐)
function stampInner(uid, cid) {
  const p = S.players[uid] || {}, ph = !p.bot && okPhoto(p.photo), col = ownerColor(uid);
  return `${ph ? `<clipPath id="${cid}"><circle r="11"/></clipPath>` : ''}<circle r="15" fill="${col}"/><circle r="12.5" fill="#fff"/>
    ${ph ? `<image href="${p.photo}" x="-11" y="-11" width="22" height="22" clip-path="url(#${cid})" preserveAspectRatio="xMidYMid slice"/>` : `<circle r="11" fill="${col}" opacity=".35"/><text class="stx" y="4.5" text-anchor="middle" font-size="12" font-weight="900" fill="#17161f">${esc(p.bot ? '🤖' : (p.name || '?').slice(0, 1))}</text>`}
    <circle r="15" fill="none" stroke="#17161f" stroke-width="1.6"/>`;
}
function stampsSVG() {
  const top = topOwners();
  return DISTRICTS.map((d, i) => { const uid = top[d.n]; return uid ? `<g class="stamp" data-x="${d.c[0]}" data-y="${d.c[1]}">${stampInner(uid, 'stc' + i)}</g>` : ''; }).join('');
}
function districtSVG() {
  const mine = new Set(myEstates({ id: S.uid }).map(b => b.gu));
  const counts = {}; shownEst().forEach(b => counts[b.gu] = (counts[b.gu] || 0) + 1);
  // 구마다 건물을 가장 많이 가진 사람(같으면 건물값 합이 큰 사람)의 프로필을 땅 배경으로 옅게 깔아요
  const top = topOwners();
  const land = DISTRICTS.map((d, i) => {
    const uid = top[d.n]; if (!uid) return '';
    const p = S.players[uid] || {}; const ph = !p.bot && okPhoto(p.photo);
    return ph
      ? `<pattern id="land${i}" patternContentUnits="objectBoundingBox" width="1" height="1"><image href="${p.photo}" width="1" height="1" preserveAspectRatio="xMidYMid slice"/></pattern><path class="land" d="${d.d}" fill="url(#land${i})"/>`
      : `<path class="land" d="${d.d}" style="fill:${ownerColor(uid)}" opacity=".16"/>`;
  }).join('');
  return DISTRICTS.map((d, i) => `<path class="gu${mine.has(d.n) ? ' mine' : ''}" data-gu="${d.n}" d="${d.d}" style="fill:${mine.has(d.n) ? '#d9ccff' : ['#efe3c8', '#e6d6b4', '#f2e8d2', '#e9dcbe'][i % 4]}"/>`).join('') + land +
    DISTRICTS.map(d => { const wd = d.n.length * 12 + 10, wc = 54;
      return `<g class="gl${top[d.n] ? ' under' : ''}" data-x="${d.c[0]}" data-y="${d.c[1]}"><g class="gli"><rect class="glbg" x="${-wd / 2}" y="-12" width="${wd}" height="17" rx="8.5"/><text class="gn" y="1">${d.n}</text>${counts[d.n] ? `<rect class="glbg gcb" x="${-wc / 2}" y="7" width="${wc}" height="15" rx="7.5"/><text class="gc" y="18">건물 ${counts[d.n]}</text>` : ''}</g></g>`; }).join('');
}
function applyMapView() {
  const svg = $('#seoulMap'); if (!svg) return; const v = S.mapV;
  svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
  const cw = svg.clientWidth || 343; const u = v.w / cw; const zoom = MAP.w0 / v.w;
  svg.classList.toggle('zoomed', zoom >= ZOOM_PINS); svg.classList.toggle('deep', zoom >= 4); svg.classList.toggle('z2', zoom >= 4); svg.classList.toggle('z3', zoom >= 8);
  svg.querySelectorAll('.pin').forEach(g => g.setAttribute('transform', `translate(${g.dataset.x},${g.dataset.y}) scale(${u})`));
  svg.querySelectorAll('.gl').forEach(g => g.setAttribute('transform', `translate(${g.dataset.x},${g.dataset.y}) scale(${u * (zoom >= ZOOM_PINS ? 1.1 : 1)})`));
  svg.querySelectorAll('.stamp').forEach(g => g.setAttribute('transform', `translate(${g.dataset.x},${g.dataset.y}) scale(${u})`));
  const zi = $('#zoomInfo'); if (zi) zi.textContent = zoom >= ZOOM_PINS ? '건물을 눌러 사고팔아요' : '구를 누르면 확대돼요';
}
const mapAR = () => { const svg = $('#seoulMap'); return svg && svg.clientWidth ? svg.clientHeight / svg.clientWidth : 1.39; };
function clampView(v) {
  const w = Math.max(MAP.w0 / 120, Math.min(MAP.w0, v.w)), h = w * mapAR();
  const ymin = Math.min(MAP.y0 - h * .2, MAP.y0 + MAP.h0 / 2 - h / 2), ymax = Math.max(MAP.y0 + MAP.h0 - h * .8, MAP.y0 + MAP.h0 / 2 - h / 2);
  return { w, h, x: Math.max(MAP.x0 - w * .2, Math.min(MAP.x0 + MAP.w0 - w * .8, v.x)), y: Math.max(ymin, Math.min(ymax, v.y)) };
}
function zoomAt(f, cx, cy, animate) {
  const v = S.mapV; const nw = v.w / f, nh = v.h / f;
  const target = clampView({ x: cx - (cx - v.x) / f, y: cy - (cy - v.y) / f, w: nw, h: nh });
  if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) { S.mapV = target; applyMapView(); return; }
  const from = { ...v }, t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / 320), e = 1 - Math.pow(1 - k, 3);
    S.mapV = { x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, w: from.w + (target.w - from.w) * e, h: from.h + (target.h - from.h) * e }; applyMapView(); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function zoomToGu(name) {
  const path = document.querySelector(`#seoulMap path[data-gu="${name}"]`); if (!path) return;
  const bb = path.getBBox(); let w = Math.max(bb.width * 1.1, bb.height * 1.1 / mapAR()); w = Math.max(w, MAP.w0 / 12);
  const target = clampView({ w, x: bb.x + bb.width / 2 - w / 2, y: bb.y + bb.height / 2 - w * mapAR() / 2 });
  const from = { ...S.mapV }; S.mapV = from; const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / 380), e = 1 - Math.pow(1 - k, 3);
    S.mapV = { x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, w: from.w + (target.w - from.w) * e, h: from.h + (target.h - from.h) * e }; applyMapView(); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function bindMap(svg) {
  const pts = new Map(); let drag = null, moved = 0;
  const toMap = (cx, cy) => { const r = svg.getBoundingClientRect(), v = S.mapV; return [v.x + (cx - r.left) / r.width * v.w, v.y + (cy - r.top) / r.height * v.h]; };
  svg.addEventListener('pointerdown', e => { try { svg.setPointerCapture(e.pointerId); } catch {} pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; drag = { v: { ...S.mapV }, pts: new Map(pts) }; });
  svg.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId) || !drag) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
    const r = svg.getBoundingClientRect();
    if (pts.size === 1) { const [x0, y0] = drag.pts.get(e.pointerId) || [e.clientX, e.clientY]; const dx = e.clientX - x0, dy = e.clientY - y0; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      S.mapV = clampView({ ...drag.v, x: drag.v.x - dx / r.width * drag.v.w, y: drag.v.y - dy / r.height * drag.v.h }); applyMapView(); }
    else if (pts.size === 2) { const [a, b] = [...pts.values()], [a0, b0] = [...drag.pts.values()]; if (!a0 || !b0) return;
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]), d0 = Math.hypot(a0[0] - b0[0], a0[1] - b0[1]); moved = 99;
      const f = d / d0; const cx = (a0[0] + b0[0]) / 2, cy = (a0[1] + b0[1]) / 2; const mx = drag.v.x + (cx - r.left) / r.width * drag.v.w, my = drag.v.y + (cy - r.top) / r.height * drag.v.h;
      S.mapV = clampView({ w: drag.v.w / f, h: drag.v.h / f, x: mx - (mx - drag.v.x) / f, y: my - (my - drag.v.y) / f }); applyMapView(); }
  });
  const up = e => {
    pts.delete(e.pointerId);
    if (pts.size === 0 && drag && moved < 8) {
      const el = document.elementFromPoint(e.clientX, e.clientY); const pin = el && el.closest('.pin'); const gu = el && el.closest('[data-gu]');
      const zoomed = MAP.w0 / S.mapV.w >= ZOOM_PINS;
      if (pin && (zoomed || pin.classList.contains('owned'))) openSheet('estate', { bid: pin.dataset.estate });
      else if (gu) zoomToGu(gu.dataset.gu);
    }
    drag = pts.size ? { v: { ...S.mapV }, pts: new Map(pts) } : null;
  };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  svg.addEventListener('wheel', e => { e.preventDefault(); const [mx, my] = toMap(e.clientX, e.clientY); zoomAt(e.deltaY < 0 ? 1.25 : .8, mx, my); }, { passive: false });
}
function ensureMap(host) {
  if (!MAP.w0) Object.assign(MAP, { x0: MAP.x, y0: MAP.y, w0: MAP.w, h0: MAP.h });
  if (!host.querySelector('#seoulMap')) { host.innerHTML = `<div class="mapbox"><svg id="seoulMap" class="seoul" viewBox="0 30 866 715" role="img" aria-label="서울 부동산 지도"><g id="gDist"></g><g id="gPins"></g><g id="gStamps"></g></svg>
        <div class="mapctl"><button type="button" id="zoomIn" aria-label="확대">+</button><button type="button" id="zoomOut" aria-label="축소">−</button><button type="button" id="zoomReset" aria-label="서울 전체 보기">⤢</button></div>
        <div class="mapinfo" id="zoomInfo">구를 누르면 확대돼요</div></div>`; bindMap($('#seoulMap')); }
  if (!S.mapV) { const h = MAP.w * mapAR(); S.mapV = { x: MAP.x, y: MAP.y + MAP.h / 2 - h / 2, w: MAP.w, h }; }
}
function updateMap() {
  if (!$('#seoulMap')) return;
  if (!S.liveOnly || !$('#gDist').childElementCount) $('#gDist').innerHTML = districtSVG();
  $('#gPins').innerHTML = pinsSVG(); $('#gStamps').innerHTML = stampsSVG();
  applyMapView();
}
// 투자 > 부동산: 내 부동산 요약 + 건물 목록(10개씩)
// 움직이지 않는 작은 지도: 구마다 1등 땅주인 색으로만 칠해요 (내 땅은 보라)
function miniMapSVG(sc = 2.1) {
  const top = topOwners();
  const fills = DISTRICTS.map(d => { const u = top[d.n];
    return `<path d="${d.d}" fill="${!u ? '#eceaf4' : u === S.uid ? '#6a4cf5' : ownerColor(u)}" fill-opacity="${u ? (u === S.uid ? .5 : .35) : 1}" stroke="#fff" stroke-width="2"/>`; }).join('');
  const stamps = DISTRICTS.map((d, i) => { const uid = top[d.n]; return uid ? `<g transform="translate(${d.c[0]},${d.c[1]}) scale(${sc})">${stampInner(uid, 'mst' + i)}</g>` : ''; }).join('');
  return `<svg viewBox="0 30 866 715" role="img" aria-label="구별 땅주인 도장">${fills}${stamps}</svg>`;
}
// 내 부동산 요약 (자산 > 부동산에 보여요)
function estSumHTML() {
  const k = S.tick, mineList = myEstates({ id: S.uid }), hb = estHourly();
  return `<div><span class="dim" style="font-size:13px;font-weight:700">내 부동산 ${mineList.length}곳</span><b class="num">${won(mineList.reduce((a, b) => a + (estOf(b.id).destroyed ? 0 : estVal(b.id, k)), 0))}</b></div>
    <div style="text-align:right"><span class="dim" style="font-size:13px;font-weight:700">시간당 순수익 · <span class="num" id="rentCd">${mmss((rentHour(now()) + 1) * H - now())}</span></span><b class="num ${cls(rentPerHour())}">${signWon(rentPerHour())}</b></div>
    ${mineList.length ? `<div class="costline">월세 <b class="up">+${won(hb.rent)}</b> · 유지비 <b class="down">-${won(hb.maint)}</b> · 재산세${hb.jtax ? '·종부세' : ''} <b class="down">-${won(hb.tax)}</b></div>` : ''}`;
}
function renderEstList(host) {
  const k = S.tick;
  if (!host.querySelector('#estList')) host.innerHTML = `<div id="estMapHost"></div>
      <div class="sec"><div class="sec-h"><h2>건물 <span id="estCount"></span></h2><span class="rpager" id="estPager"></span></div><div class="slist" id="estList"></div></div>
      <p class="hint">건물 값은 주식처럼 움직이지만 정해진 최저가 아래로는 안 내려가요. 내 건물은 1시간마다 가치의 0.1%를 월세로 주고, 유지비 0.02%와 재산세 0.02%가 빠져요. 부동산 합계가 10억을 넘으면 넘는 부분에 종부세 0.03%가 더 붙어요. 살 때 취득세 4%, 팔 때 차익의 22%를 양도세로 내요. 남의 건물은 가치의 50%를 내면 파괴할 수 있고, 파괴된 건물은 멈춘 가치의 2배로 강제 매입할 수 있어요.</p>`;
  const sumEl = $('#estSum'); if (sumEl) sumEl.innerHTML = estSumHTML();
  let h = '';
  const emh = $('#estMapHost'); if (emh) { ensureMap(emh); updateMap(); }
  const EST = shownEst(), EPG = 10, ePages = Math.ceil(EST.length / EPG); $('#estCount').textContent = EST.length; S.estPage = Math.max(0, Math.min(S.estPage || 0, ePages - 1));
  $('#estPager').innerHTML = `<button type="button" data-estpg="-1" aria-label="이전 건물" ${S.estPage ? '' : 'disabled'}>◀</button><small class="num">비싼 순 ${S.estPage * EPG + 1}~${Math.min(EST.length, (S.estPage + 1) * EPG)}</small><button type="button" data-estpg="1" aria-label="다음 건물" ${S.estPage < ePages - 1 ? '' : 'disabled'}>▶</button>`;
  EST.slice().sort((a, b) => estVal(b.id, k) - estVal(a.id, k)).slice(S.estPage * EPG, (S.estPage + 1) * EPG).forEach(b => {
    const st = estState(b.id), e = estOf(b.id), v = e && e.destroyed ? e.destroyed.value : estVal(b.id, k), c = estVal(b.id, k) / estAt(b.id, S.season.start) - 1;
    const who = st === 'free' ? '<span class="dim">매물</span>' : `<b class="owner-tag" style="background:${e.destroyed ? 'var(--up)' : ownerColor(e.owner)}">${e.owner === S.uid ? '👑 내 건물' : esc(nameOf(e.owner))}</b>`;
    h += `<button class="srow-main est-row" type="button" data-estate="${b.id}"><span class="logo-b" style="background:${st.endsWith('Broken') ? 'var(--up)' : st === 'free' ? '#9a98ad' : ownerColor(e.owner)}">${st.endsWith('Broken') ? '💥' : ICON[b.t]}</span>
      <span class="sname"><b>${esc(b.n)}</b><small>${esc(b.gu)} · ${who}${st.endsWith('Broken') ? ' <span class="up">파괴됨</span>' : ''}</small></span>
      <span class="sprice"><div class="p num">${man(v)}원</div><div class="c num ${e && e.destroyed ? 'flat' : cls(c)}">${e && e.destroyed ? '멈춤' : pctTxt(c)}</div></span></button>`;
  });
  $('#estList').innerHTML = h;
}
// 건물 그래프: 최근 24시간(15분 간격) + 지금 값. 시트가 열려 있으면 1초마다 다시 그려요
function drawEstChart() {
  const cv = $('#estChart'), sh = S.sheet; if (!cv || !sh || sh.type !== 'estate') return;
  const e = estOf(sh.bid), t1 = now(), arr = [];
  const t0 = Math.max(S.season.start, t1 - 864e5), stp = Math.max(6e4, (t1 - t0) / 60); // 시즌 시작 전 구간은 평평해서 빼요
  for (let t = t0; t < t1; t += stp) arr.push(estAt(sh.bid, t));
  arr.push(e && e.destroyed ? e.destroyed.value : estVal(sh.bid, S.tick)); drawChart(cv, arr, {});
}
function renderEstateSheet(b, sh) {
  const bd = EM[sh.bid], k = S.tick, st = estState(bd.id), e = estOf(bd.id);
  const v = estVal(bd.id, k), frozen = e && e.destroyed ? e.destroyed.value : null, c = v / estAt(bd.id, S.season.start) - 1;
  const can = S.me && !S.readOnly && !seasonOver();
  const acts = { free: [['buy', '매입 (취득세 4% 포함)', 'buy']], mine: [['sell', '매각 (양도세 반영)', 'sell']], mineBroken: [['restore', '🔧 복구하기 (멈춘 값의 60%)', 'cover']],
    other: [['small', '💣 소형 공격 · 5% 확률로 파괴', 'short'], ['big', '🚀 대형 공격 · 40% 확률로 파괴', 'short'], ['force', '🏴 강제 매입 (200%, 주인에게 100% 보상)', 'buy']], otherBroken: [['buy120', '파괴된 건물 매입 (멈춘 값의 120%)', 'buy']] }[st];
  const shield = estShield(bd.id), atkSt = st === 'other';
  const btns = acts.map(([a, l, c]) => { const pr = estPrice(bd.id, a), off = (S.me && S.me.cash < pr && a !== 'sell') || S.saving || (atkSt && shield);
    return `<button class="cta ${c}" type="button" data-estact="${a}" ${off ? 'disabled' : ''}>${sh.confirm === a ? `한 번 더 누르면 ${won(pr)} 결제` : `${l} · ${won(pr)}`}</button>`; }).join('');
  const ownerCard = e ? `<div class="ownercard" style="--oc:${e.destroyed ? 'var(--up)' : ownerColor(e.owner)}">${ava({ id: e.owner, name: nameOf(e.owner), bot: (S.players[e.owner] || {}).bot }, true)}<div><small>${e.destroyed ? '파괴된 건물의 주인' : '이 건물의 주인'}</small><b>${e.owner === S.uid ? '👑 ' : ''}${esc(nameOf(e.owner))}</b><small>${won(e.paid || 0)}에 매입 · ${timeAgo(e.at || Date.now())}</small></div></div>`
    : `<div class="ownercard free"><div><small>주인 없음</small><b>지금 사면 지도에 내 이름이 걸려요</b></div></div>`;
  b.innerHTML = `<div class="shead"><span class="logo-b" style="background:${st.endsWith('Broken') ? 'var(--up)' : 'var(--violet)'}">${st.endsWith('Broken') ? '💥' : ICON[bd.t]}</span><div><h3>${esc(bd.n)}</h3><small>${esc(bd.gu)} · 최저가 ${man(bd.min)}원</small></div></div>
    ${ownerCard}
    <div class="bigp"><div class="p num" id="estPrice">${won(frozen ?? v)}</div><div class="c num">${frozen ? '<span class="up">파괴되어 가치가 멈췄어요</span>' : `<span class="${cls(c)}">이번 주 ${pctTxt(c)}</span>`}</div></div>
    <canvas class="chart" id="estChart" aria-label="${esc(bd.n)} 가격 차트"></canvas>
    <div class="info"><div>시간당 월세<b class="num up">+${won(v * RENT)}</b></div><div>시간당 유지비·재산세<b class="num down">-${won(v * (MAINT + PTAX))}</b></div><div>${frozen ? '지금 시세' : '강제 매입가'}<b class="num">${won(frozen ? v : v * 2)}</b></div></div>
    ${can ? `${atkSt && shield ? `<p class="hint">🛡️ 산 지 얼마 안 된 건물이에요. ${Math.ceil(shield / 60e3)}분 뒤부터 공격할 수 있어요.</p>` : ''}<div class="estbtns">${btns}</div>` : `<p class="hint">${seasonOver() ? '시즌이 끝나서 거래할 수 없어요.' : '참가하면 거래할 수 있어요.'}</p>`}
    <p class="hint">${{ free: '사면 1시간마다 가치의 0.1%가 월세로 들어오고, 지도와 순위표에 내 이름이 걸려요.', mine: '친구가 공격(소형 3%·5% / 대형 25%·40%)으로 부수거나, 200%를 내고 강제 매입할 수 있어요. 강제 매입당하면 건물값의 100%를 보상받아요.', mineBroken: '파괴되면 가치가 멈추고 월세가 끊겨요. 복구하지 않으면 누구나 120%에 사갈 수 있어요.', other: '파괴되면 가치가 멈추고 주인의 총자산에서 빠져요. 그 뒤 누구나 멈춘 값의 120%로 살 수 있어요. 파괴한 사람은 익명이에요.', otherBroken: '사면 바로 복구되고 내 것이 돼요. 원래 주인은 보상을 못 받아요.' }[st]}</p>`;
  setTimeout(drawEstChart, 0);
}
async function estAction(action) {
  const sh = S.sheet; const bid = sh.bid; const st = estState(bid);
  const allowed = { free: ['buy'], mine: ['sell'], mineBroken: ['restore'], other: ['small', 'big', 'force'], otherBroken: ['buy120'] }[st];
  if (!allowed.includes(action)) return;
  if (['small', 'big', 'force'].includes(action) && estShield(bid)) { toast('🛡️ 산 지 10분이 안 된 건물이라 아직 공격할 수 없어요'); return; }
  if (sh.confirm !== action) { sh.confirm = action; renderSheet(); return; }
  const price = estPrice(bid, action); if (!S.me || S.saving || (S.me.cash < price && action !== 'sell')) return;
  const e = estOf(bid), before = S.me; const me = JSON.parse(JSON.stringify(before)), v = estVal(bid, S.tick), keep = e && e.comp || null;
  const mine = (paid, extra) => ({ season: S.season.sid, owner: S.uid, paid, at: Date.now(), destroyed: null, safe: Date.now() + EST_SHIELD, comp: keep, ...extra });
  let doc = null, hit = false;
  if (action === 'buy') { me.cash -= price; if (me.rentH == null || !myEstates({ id: S.uid }).length) me.rentH = rentHour(now()); doc = mine(price); }
  if (action === 'sell') { me.cash += price; doc = { season: S.season.sid, owner: null, paid: 0, at: Date.now(), destroyed: null, comp: keep }; }
  if (action === 'restore') { me.cash -= price; doc = { ...e, destroyed: null, safe: Date.now() + EST_SHIELD }; }
  if (action === 'buy120') { me.cash -= price; if (me.rentH == null || !myEstates({ id: S.uid }).length) me.rentH = rentHour(now()); doc = mine(price); }
  if (action === 'force') { me.cash -= price; if (me.rentH == null || !myEstates({ id: S.uid }).length) me.rentH = rentHour(now()); doc = mine(price, { comp: { to: e.owner, amt: Math.round(v), ts: Date.now(), from: S.uid } }); }
  if (action === 'small' || action === 'big') { me.cash -= price; hit = Math.random() < EST_ATK[action].p; if (hit) doc = { ...e, destroyed: { value: v, at: Date.now(), by: S.uid } }; }
  me.cash = Math.round(me.cash);
  S.saving = true; const ok = await saveMe(me, before); const ok2 = ok && (!doc || await saveEstate(bid, doc)); S.saving = false;
  if (ok && ok2) {
    const n = EM[bid].n;
    if (action === 'small' || action === 'big') {
      if (hit) { addFeed({ kind: 'est_destroy', est: bid, amt: price }); toast(`💥 ${n} 파괴 성공!`); boom(); }
      else toast(`💨 ${n} 공격 실패… ${won(price)} 날아갔어요`);
    } else {
      if (action === 'buy' || action === 'buy120') addFeed({ kind: 'est_buy', est: bid, amt: price });
      if (action === 'force') addFeed({ kind: 'est_force', est: bid, amt: price, target: e.owner });
      if (action === 'sell') addFeed({ kind: 'est_sell', est: bid, amt: price });
      if (action === 'restore') addFeed({ kind: 'est_restore', est: bid, amt: price });
      toast({ buy: `🏢 ${n} 매입 완료!`, buy120: `🏢 ${n} 매입 완료! (파괴된 건물 120%)`, sell: `${n}을 팔았어요`, restore: `🔧 ${n} 복구 완료`, force: `🏴 ${n} 강제 매입! 주인에게 ${won(v)} 보상` }[action]);
      if (action !== 'sell') confetti();
    }
    buzz();
  }
  sh.confirm = null; renderAll(); renderSheet();
}
// 강제 매입당한 주인은 앱을 켤 때 건물에 남겨진 보상금(comp)을 스스로 받아요
let collecting = false;
async function collectComp() {
  if (!S.me || S.readOnly || S.saving || collecting || (S.mode === 'live' && !S.loaded)) return;
  const got = S.me.compGot || {}, due = Object.entries(S.estates).filter(([bid, e]) => e && e.comp && e.comp.to === S.uid && !got[bid + ':' + e.comp.ts]);
  if (!due.length) return;
  collecting = true; const before = S.me, me = JSON.parse(JSON.stringify(before)); me.compGot = { ...(me.compGot || {}) }; let sum = 0;
  due.forEach(([bid, e]) => { me.compGot[bid + ':' + e.comp.ts] = 1; sum += e.comp.amt || 0; });
  me.cash = Math.round(me.cash + sum);
  const ok = await saveMe(me, before); collecting = false;
  if (ok) { toast(`🏴 건물을 강제 매입당해서 보상금 ${won(sum)}을 받았어요`); renderAll(); }
}

/* ───────── excitement ───────── */
function confetti(colors) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas'); cv.className = 'fx'; document.body.appendChild(cv);
  const dpr = devicePixelRatio || 1, W = innerWidth, H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const cols = colors || ['#6a4cf5', '#f2414f', '#ffd23f', '#16b27e', '#2f78ee'];
  const P = Array.from({ length: 90 }, () => ({ x: W / 2 + (Math.random() - .5) * 80, y: H * .45, vx: (Math.random() - .5) * 12, vy: -Math.random() * 13 - 4, s: 5 + Math.random() * 6, r: Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)] }));
  const t0 = performance.now();
  const step = t => { const dt = t - t0; g.clearRect(0, 0, W, H); P.forEach(p => { p.vy += .45; p.x += p.vx; p.y += p.vy; p.r += .2; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.globalAlpha = Math.max(0, 1 - dt / 1500); g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); }); if (dt < 1500) requestAnimationFrame(step); else cv.remove(); };
  requestAnimationFrame(step);
}
const boom = () => { confetti(['#f2414f', '#ff9f1c', '#ffd23f', '#3a3346']); document.body.classList.remove('shake'); void document.body.offsetWidth; document.body.classList.add('shake'); };
const buzz = (ms = 40) => { try { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.isActive) navigator.vibrate(ms); } catch {} };
let liquidating = false;
async function checkLiquidation() {
  if (!S.me || liquidating || S.saving) return;
  // 공매도 반대매매: 진입가 대비 +35% 이상 숏스퀴즈 급등 시 자동 반대매매
  const burnt = Object.entries(S.me.shorts || {}).filter(([sym, o]) => SM[sym] && (px(sym, S.tick) >= o.e * SHORT_LIQ || lqDead(S.uid, 'short', sym, o)));
  if (burnt.length) {
    liquidating = true; const b0 = S.me; const me2 = JSON.parse(JSON.stringify(b0));
    burnt.forEach(([sym, o]) => { const p = lqDead(S.uid, 'short', sym, o) ? o.e * SHORT_LIQ : px(sym, S.tick); me2.cash += Math.max(0, o.q * (2 * o.e - p) - Math.ceil(o.q * p * FEE)); delete me2.shorts[sym]; });
    me2.cash = Math.round(me2.cash);
    const ok2 = await saveMe(me2, b0); liquidating = false;
    if (ok2) { burnt.forEach(([sym, o]) => addFeed({ kind: 'liq', sym, x: 1, d: -1, amt: Math.round(o.q * o.e * (SHORT_LIQ - 1)) })); toast(`💀 ${burnt.map(([sym]) => SM[sym].n).join(', ')} 숏스퀴즈 공매도 반대매매!`); boom(); renderAll(); }
    return;
  }
  if (!S.me.lev) return;
  const dead = Object.entries(S.me.lev).filter(([sym, o]) => SM[sym] && (levVal(o, px(sym, S.tick), sym) <= o.m * .06 || lqDead(S.uid, 'lev', sym, o)));
  if (!dead.length) return;
  liquidating = true; const before = S.me; const me = JSON.parse(JSON.stringify(before));
  dead.forEach(([sym]) => { me.levPnl = (me.levPnl || 0) - me.lev[sym].m; delete me.lev[sym]; });
  const ok = await saveMe(me, before); liquidating = false;
  if (ok) { dead.forEach(([sym, o]) => addFeed({ kind: 'liq', sym, x: o.x, d: o.d || 1, amt: Math.round(o.m) })); toast(`💀 ${dead.map(([sym, o]) => SM[sym].n + ' ' + o.x + '배').join(', ')} 강제 청산!`); boom(); renderAll(); if (S.sheet && S.sheet.type === 'quick') renderSheet(); }
}
function jumpAlerts() {
  const k = Math.floor((now() - S.season.start) / BANG_MS);
  if (S.lastBang == null) { S.lastBang = k; return; }
  if (k === S.lastBang) return; S.lastBang = k;
  const list = S.SE.bangs[k]; if (!list) return;
  const own = id => S.me && ((S.me.hold || {})[id] || (S.me.lev || {})[id] || (S.me.shorts || {})[id]);
  const mineHit = list.find(x => own(x.id));
  if (mineHit) { const lv = (S.me.lev || {})[mineHit.id], sh = (S.me.shorts || {})[mineHit.id]; const good = (mineHit.d > 0) === !(sh || (lv && (lv.d || 1) < 0)); good ? confetti() : boom(); buzz(60); }
}
function holdingAlerts() {
  if (!S.me) return;
  for (const sym of Object.keys(S.me.hold || {})) {
    if (!SM[sym]) continue; const v = px(sym, S.tick); const b = S.alertBase[sym];
    if (!b) { S.alertBase[sym] = v; continue; }
    const c = v / b - 1;
    if (Math.abs(c) >= .04) { S.alertBase[sym] = v; toast(c > 0 ? `🚀 ${SM[sym].n} ${pctTxt(c)} 급등 중!` : `📉 ${SM[sym].n} ${pctTxt(c)} 급락 중…`); if (c > 0) buzz(30); return; }
  }
}

/* ───────── casino ───────── */
const C = { coinFace: '?', coinMsg: '', wheelRot: 0, wheelMsg: '', busy: false };
function wheelBg() { const cols = ['#6a4cf5', '#f5f5f9']; return 'conic-gradient(' + WHEEL.map((m, i) => `${m === 0 ? '#ececf2' : m >= 2 ? '#ffcf4a' : m >= 1 ? '#c3b7ff' : '#e4deff'} ${i * WSEG}deg ${(i + 1) * WSEG}deg`).join(',') + ')'; }
function renderCasino() {
  const el = $('#tab-casino');
  if (!S.me) { el.innerHTML = `<div class="empty">${S.readOnly ? '관전 중에는 게임을 할 수 없어요.' : '참가하면 게임을 할 수 있어요.'}</div>${S.readOnly ? '' : '<button class="cta" type="button" data-join>참가하기</button>'}`; return; }
  const bet = betAmount();
  const mx = S.me.cash;
  const bets = [['0.1', '10%'], ['0.25', '25%'], ['0.5', '50%'], ['1', '🔥올인']];
  let h = `<div class="card bal"><span class="dim" style="font-weight:700;font-size:13px">현금</span><b class="num">${won(S.me.cash)}</b></div>
    <div class="sec"><div class="sec-h"><h2>베팅 금액</h2><small>내 총자산 기준 · 한 판 최대 10억</small></div>
    <div class="betrow">${bets.map(([v, l]) => `<button type="button" data-bet="${v}" aria-pressed="${String(S.betPct) === v}">${l}</button>`).join('')}</div>
    <p class="betnow">이번 판 <b class="num" id="betNow">${won(bet)}</b>${bet >= BET_CAP ? ' <span class="dim">(한 판 최대)</span>' : bet >= S.me.cash && bet > 0 ? ' <span class="up">(현금 전부 올인!)</span>' : ''}</p></div>
    <div class="card game"><div><h3>홀짝</h3><p class="desc">맞히면 1.95배. 50% 확률.</p></div>
      <div class="coin" id="coin">${C.coinFace}</div>
      <p class="res" id="coinMsg">${C.coinMsg}</p>
      <div class="pick2"><button class="cta" type="button" data-coin="홀" ${C.busy || bet < MINBET ? 'disabled' : ''}>홀</button><button class="cta sell" type="button" data-coin="짝" ${C.busy || bet < MINBET ? 'disabled' : ''}>짝</button></div></div>
    <div class="card game"><div><h3>룰렛</h3><p class="desc">0배부터 대박 10배까지! 한 방에 인생 역전.</p></div>
      <div class="wheel-wrap"><div class="pointer"></div><div class="wheel" id="wheel" style="background:${wheelBg()};transform:rotate(${C.wheelRot}deg)">${WHEEL.map((m, i) => `<span style="transform:rotate(${i * WSEG + WSEG / 2}deg) translateY(-96px)"><i>${m}x</i></span>`).join('')}</div><div class="hub"></div></div>
      <p class="res" id="wheelMsg">${C.wheelMsg}</p>
      <button class="cta" type="button" id="spinBtn" ${C.busy || bet < MINBET ? 'disabled' : ''}>${won(bet)} 걸고 돌리기</button></div>
    <p class="hint">게임 결과도 총자산에 그대로 반영돼요. 올인으로 단숨에 1,000억·1조를 노려보세요!</p>`;
  if (mx < MINBET) h = `<div class="empty">현금이 부족해요. 지원금을 받거나 주식을 팔아보세요.</div>`;
  el.innerHTML = h;
}
// 베팅 금액: 총자산의 1%/10%/20% 또는 직접 입력 (현금을 넘을 수 없음)
function betAmount() {
  if (!S.me) return 0;
  const raw = worth(S.me, S.tick) * (+S.betPct || .1);
  return Math.max(0, Math.min(BET_CAP, Math.floor(S.me.cash / 10000) * 10000, Math.round(raw / 10000) * 10000)); // 한 판 최대 10억
}
function updateBetLabels() {
  const b = betAmount(), ok = b >= MINBET && !C.busy;
  const n = $('#betNow'); if (n) n.textContent = won(b);
  const sp = $('#spinBtn'); if (sp) { sp.textContent = `${won(b)} 걸고 돌리기`; sp.disabled = !ok; }
  document.querySelectorAll('[data-coin]').forEach(x => x.disabled = !ok);
}
const BET_CAP = 1_000_000_000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function playCasino(game, choice) {
  if (!S.me || S.saving || C.busy || seasonOver()) { if (seasonOver()) toast('시즌이 끝나서 게임도 닫혔어요'); return; }
  const bet = betAmount();
  if (bet < MINBET) { toast('걸 금액을 정해주세요 (최소 10만원)'); return; }
  C.busy = true; let mult, label;
  if (game === 'coin') {
    const face = Math.random() < .5 ? '홀' : '짝'; mult = face === choice ? COIN_PAY : 0;
    C.coinMsg = ''; renderCasino(); const coin = $('#coin'); coin.textContent = '?'; coin.classList.add('spin');
    await sleep(950); C.coinFace = face; label = '홀짝';
  } else {
    const i = Math.floor(Math.random() * WHEEL.length); mult = WHEEL[i];
    const target = 360 - (i * WSEG + WSEG / 2) + (Math.random() - .5) * WSEG * .6;
    const cur = C.wheelRot % 360; C.wheelRot += 360 * 5 + ((target - cur) % 360 + 360) % 360;
    C.wheelMsg = ''; renderCasino(); await sleep(30); $('#wheel').style.transform = `rotate(${C.wheelRot}deg)`;
    await sleep(2900); label = '룰렛';
  }
  const payout = Math.floor(bet * mult), net = payout - bet;
  if (mult >= 2) { confetti(); buzz(80); } else if (mult === 0) buzz(20);
  const before = S.me; const me = JSON.parse(JSON.stringify(before));
  me.cash = Math.round(me.cash + net); me.casino = (me.casino || 0) + net;
  const ok = await saveMe(me, before);
  const msg = net > 0 ? `<b class="up">+${won(net)}</b> ${mult}배!` : net < 0 ? `<b class="down">-${won(-net)}</b> ${mult ? mult + '배' : '꽝'}` : '본전';
  if (game === 'coin') C.coinMsg = ok ? `${C.coinFace} · ${msg}` : ''; else C.wheelMsg = ok ? msg : '';
  C.busy = false;
  if (ok && (mult >= 2 || (mult === 0 && bet >= 1e7))) addFeed({ kind: 'casino', game: label, mult, amt: net });
  renderAll();
}

/* ───────── market: news + stocks ───────── */
function newsTitle(n) { return n.sym ? `${SM[n.sym].n} · ${n.text}` : n.text; }
function indexCardHTML() {
  const k = S.tick; const I = S.SE.index;
  const Ik = indexNow(); const ic = Ik / index24() - 1, iw = Ik / 1000 - 1; const [mc, ml] = moodOf(ic);
  return `<div class="card index"><div class="row"><div><div class="lab">곰스피 지수 · ${STOCKS.length}종목</div><div class="v num">${Ik.toFixed(2)}<span class="livedot" title="실시간"></span></div>
      <div class="c num"><span class="${cls(ic)}">2시간 ${pctTxt(ic)}</span> <span class="dim" style="font-size:14px">이번 주 <span class="${cls(iw)}">${pctTxt(iw)}</span></span></div></div>
      <span class="mood ${mc}">${ml}</span></div>
    <canvas class="ichart" id="indexChart" aria-label="곰스피 지수 이번 주 흐름"></canvas>
    <div class="sectors">${Object.entries(SECTORS).slice(0, 4).map(([sec, v]) => { const c = secNow(sec) / sec24(sec) - 1; return `<div>${v.n}<b class="${cls(c)}">${pctTxt(c)}</b></div>`; }).join('')}</div></div>`;
}
function drawIndexChart() { const cv = $('#indexChart'); if (!cv) return; const I = S.SE.index, Ik = indexNow(); drawChart(cv, I.slice(0, S.tick + 1), { padB: 4, base: 1000, live: true ? { x: liveX(), v: Ik } : null }); }
function renderMarket() {
  const el = $('#tab-market'); const k = S.tick; let h = '';
  h += posHUD() + indexCardHTML();
  const mine = S.me ? new Set([...Object.keys(S.me.hold || {}), ...Object.keys(S.me.shorts || {})].filter(s => SM[s])) : new Set();
  const chips = [['all', '전체'], ...(mine.size ? [['mine', '내 종목']] : []), ['up', '급등'], ['down', '급락'], ...Object.entries(SECTORS).map(([k2, v]) => [k2, v.n])];
  if (S.filter === 'mine' && !mine.size) S.filter = 'all';
  let list = STOCKS.slice();
  if (S.filter === 'mine') list = list.filter(s => mine.has(s.id));
  else if (S.filter === 'up' || S.filter === 'down') list = list.map(s => ({ s, c: k ? chg(s.id, k - 1, k) : 0 })).sort((a, b) => S.filter === 'up' ? b.c - a.c : a.c - b.c).slice(0, 10).map(x => x.s);
  else if (S.filter !== 'all') list = list.filter(s => s.s === S.filter);
  h += `<div class="sec"><div class="sec-h"><h2>종목 ${STOCKS.length}</h2><small>2시간 변동률 · 짝수 시 초기화</small></div>
    <div class="chips" role="group" aria-label="종목 분류">${chips.map(([v, l]) => `<button type="button" data-filter="${v}" aria-pressed="${S.filter === v}">${l}</button>`).join('')}</div><div class="slist">`;
  h += (S.filter === 'up' || S.filter === 'down' ? list : byPrice(list)).map(stockRow).join('');
  h += `</div></div><p class="hint">종목 이름은 실제 기업이지만 가격과 뉴스는 게임용 가상 데이터예요.</p>`;
  const oldChips = el.querySelector('.chips'), sx = oldChips ? oldChips.scrollLeft : 0;
  el.innerHTML = h;
  const newChips = el.querySelector('.chips'); if (newChips && sx) newChips.scrollLeft = sx;
  requestAnimationFrame(drawIndexChart);
}

/* ───────── wallet ───────── */
function renderWallet() { renderMe(); } // 새 프로필 화면 (me.js)
function renderWalletOld() {
  const el = $('#tab-wallet');
  if (!S.me) { el.innerHTML = `<div class="empty">${S.readOnly ? '관전 중에는 지갑이 없어요.' : '참가하면 10억원으로 시작해요.'}</div>${S.readOnly ? '' : '<button class="cta" type="button" data-join>참가하기</button>'}`; return; }
  const k = S.tick, m = S.me;
  // 한눈에 보는 내 자산: 총자산, 순위, 자산 구성
  const W = worth(m, k), rk = ranking(k).findIndex(p => p.id === S.uid) + 1;
  let inv = 0, eqV = 0, usdV = 0; Object.entries(m.hold || {}).forEach(([s, q]) => { if (!SM[s]) return; const v = q * px(s, k); if (SM[s].fx) usdV += v; else if (SM[s].eq) eqV += v; else inv += v; });
  let levV = 0; Object.entries(m.lev || {}).forEach(([s, o]) => { if (SM[s] && !lqDead(S.uid, 'lev', s, o)) levV += levVal(o, px(s, k), s); });
  let shV = 0; Object.entries(m.shorts || {}).forEach(([s, o]) => { if (SM[s]) shV += Math.max(0, o.q * (2 * o.e - px(s, k))); });
  const estV = myEstates({ id: S.uid }).reduce((a, b) => a + (estOf(b.id).destroyed ? 0 : estVal(b.id, k)), 0);
  const cashV = m.cash + BONUS * pendingOf(m);
  const kp = kPositions(m), sumK = f => kp.filter(f).reduce((a, x) => a + x.value, 0);
  const parts = [['💵 현금', cashV, '#16b27e'], ['🪙 코인', sumK(x => x.kind === 'spot'), '#f08c00'], ['🚀 코인 선물', sumK(x => x.kind === 'fut'), '#f2414f'], ['🇺🇸 미국주식', usWorth(m), '#2b2745'], ['🏛️ 구채', bondWorth(m), '#1450d2'], ['📈 가상주식', eqV + usdV + levV + shV, '#6a4cf5']];
  const tot = parts.reduce((a, x) => a + Math.max(0, x[1]), 0) || 1;
  if (!['stock', 'profile'].includes(S.wsub)) S.wsub = 'profile';
  const inSub = x => S.wsub === 'coin' ? !isEq(x) : isEq(x);
  // 맨 위 카드: 내 프로필이면 총자산, 주식·코인·부동산이면 그 분야 합계와 산 값 대비 손익
  const sumOf = list => { const v = list.reduce((a, x) => a + x.value, 0), c = list.reduce((a, x) => a + x.principal, 0); return { v, pnl: v - c, pct: c ? (v - c) / c : 0 }; };
  const mp = myPositions(m), pnlTxt = x => `<span class="ws-pnl"><small class="num amt ${cls(x.pnl)}">${signWon(x.pnl)}</small><b class="num pct ${cls(x.pnl)}">${pctTxt(x.pct)}</b></span>`;
  let top;
  if (S.wsub === 'stock') { const a = sumOf(mp.filter(x => isEq(x.sym) && !SM[x.sym].fx)), u = sumOf(mp.filter(x => SM[x.sym].fx));
    top = `<div class="ws-top"><div><small>📈 주식 합계</small><b class="num">${won(a.v)}</b></div>${pnlTxt(a)}</div>${(m.hold || {}).USD ? `<div class="ws-usd">💵 보유 달러 <b class="num">${QT('USD', m.hold.USD)}</b> <span class="krw num">(${won(m.hold.USD * px('USD', k))})</span></div>` : ''}`; }
  else if (S.wsub === 'coin') { const a = sumOf(mp.filter(x => !isEq(x.sym))); top = `<div class="ws-top"><div><small>🪙 코인 합계</small><b class="num">${won(a.v)}</b></div>${pnlTxt(a)}</div>`; }
  else if (S.wsub === 'estate') { const es = myEstates({ id: S.uid }).map(b => { const e = estOf(b.id); return { value: e.destroyed ? 0 : estVal(b.id, k), principal: e.paid || 0 }; }); const a = sumOf(es);
    top = `<div class="ws-top"><div><small>🏢 부동산 합계</small><b class="num">${won(a.v)}</b></div>${pnlTxt(a)}</div>`; }
  else top = `<div class="ws-top"><div><small>총자산</small><b class="num">${won(W)}</b></div>${rk ? `<span class="ws-rk"><small>순위</small><b class="num">${rk}위</b></span>` : ''}</div>`;
  let h = `<div class="card wsum">${top}</div>
    <div class="seg" role="group" aria-label="내 자산 보기">${[['profile', '내 자산'], ['stock', '가상주식']].map(([v, l]) => `<button type="button" data-wsub="${v}" aria-pressed="${S.wsub === v}">${l}</button>`).join('')}</div>`;
  if (S.wsub === 'stock' || S.wsub === 'coin') {
  const hs = Object.entries(m.hold || {}).filter(([s]) => SM[s] && inSub(s));
  h += `<div class="sec"><div class="sec-h"><h2>${S.wsub === 'coin' ? '보유 코인' : '보유 주식·달러'}</h2><small>평균단가 대비</small></div><div class="slist">`;
  if (!hs.length) h += `<div class="empty">아직 산 게 없어요. 투자 탭에서 골라보세요.</div>`;
  hs.forEach(([s, q]) => { const st = SM[s], p = px(s, k), avg = (m.cost || {})[s] || p, pl = (p - avg) * q, r = p / avg - 1;
    h += `<button class="pos" type="button" data-stock="${s}">${badge(st)}<span class="sname"><b>${esc(st.n)}</b><small class="dim num">${QT(s, q)} · 평단 ${PW(s, avg)}</small></span><span class="r num"><b>${won(q * p)}</b><br><small class="${cls(pl)}">${signWon(pl)} (${pctTxt(r)})</small></span></button>`; });
  h += `</div></div>`;
  const ss = Object.entries(m.shorts || {}).filter(([s]) => SM[s] && inSub(s));
  if (ss.length) {
    h += `<div class="sec"><div class="sec-h"><h2>🎯 공매도</h2><small>내리면 이득</small></div><div class="slist">`;
    ss.forEach(([s, o]) => { const st = SM[s], p = px(s, k), v = Math.max(0, o.q * (2 * o.e - p)), pl = v - o.q * o.e;
      h += `<button class="pos" type="button" data-stock="${s}">${badge(st)}<span class="sname"><b>${esc(st.n)}</b><small class="dim num">${QT(s, o.q)} · 진입 ${PW(s, o.e)}</small></span><span class="r num"><b>${won(v)}</b><br><small class="${cls(pl)}">${signWon(pl)}</small></span></button>`; });
    h += `</div></div>`;
  }
  const lv = Object.entries(m.lev || {}).filter(([s]) => SM[s] && inSub(s));
  if (lv.length) { h += `<div class="sec"><div class="sec-h"><h2>🚀 레버리지</h2><small>진입가 대비 약 1/배수 떨어지면 청산 💀</small></div><div class="slist">`;
    lv.forEach(([s, o]) => { const st = SM[s], pr = px(s, k), r = levROE(o, pr, s); h += `<button class="pos" type="button" data-quick="levclose" data-sym="${s}">${badge(st)}<span class="sname"><b>${esc(st.n)} <span class="tag rv">${o.x}배 ${levSide(o)}</span></b><small class="dim num">${QT(s, o.q)} · 진입 ${PW(s, o.e)}</small></span><span class="r num"><b>${won(levVal(o, pr, s))}</b><br><small class="${cls(r)}" style="font-size:15px;font-weight:900">${pctTxt(r)}</small></span></button>`; });
    h += `</div></div>`; }
  }
  const est = myEstates({ id: S.uid });
  if (S.wsub === 'estate') h += `<div class="card estsum">${estSumHTML()}</div>`;
  if (S.wsub === 'estate' && !est.length) h += `<div class="empty">아직 건물이 없어요. 투자 > 부동산에서 사보세요.</div>`;
  if (S.wsub === 'estate' && est.length) { h += `<div class="sec"><div class="sec-h"><h2>🏢 부동산</h2><small>시간당 순수익 ${signWon(rentPerHour())}</small></div><div class="slist">`;
    est.forEach(b => { const e = estOf(b.id), v = estVal(b.id, k); h += `<button class="srow-main est-row" type="button" data-estate="${b.id}"><span class="logo-b" style="background:${e.destroyed ? 'var(--up)' : 'var(--violet)'}">${e.destroyed ? '💥' : ICON[b.t]}</span><span class="sname"><b>${esc(b.n)}</b><small>${e.destroyed ? '<span class="up">파괴됨 · 복구 필요</span>' : '시간당 월세 +' + won(v * RENT)}</small></span><span class="sprice"><div class="p num">${won(e.destroyed ? 0 : v)}</div></span></button>`; });
    h += `</div></div>`; }
  if (S.wsub === 'profile') {
  h += `<div class="card wsum"><div class="sec-h" style="margin-bottom:4px"><h2 style="font-size:16px">내 자산 요약</h2><small>총자산 대비</small></div>
    <div class="ws-bar">${parts.filter(x => x[1] > 0).map(x => `<i style="width:${(x[1] / tot * 100).toFixed(2)}%;background:${x[2]}"></i>`).join('')}</div>
    <div class="ws-rows">${parts.filter((x, i) => i === 0 || x[1] > 0).map(x => `<div><span><i style="background:${x[2]}"></i>${x[0]}</span><b class="num">${won(x[1])}</b><small class="num">${(x[1] / tot * 100).toFixed(1)}%</small></div>`).join('')}</div></div>`;
  h += `<div class="info"><div>받은 돈<b class="num">${won(m.inflow || CASH0)}</b></div><div>누적 수익률<b class="num ${cls(roiOf(m, W))}">${pctTxt(roiOf(m, W))}</b></div></div>`;
  h += `<div class="sec"><div class="sec-h"><h2>프로필</h2></div>
    <div class="card profile">${ava({ ...m, id: S.uid }, true)}<span class="who"><b>${esc(m.name)} <span class="lvtag">LV.${lvOf(m)}</span></b><small>사진은 모두에게 보여요 · 레벨은 상점에서 올려요</small></span></div>
    <div class="profile-btns"><button type="button" id="photoBtn">📸 사진 바꾸기</button><button type="button" id="photoDel" ${m.photo ? '' : 'disabled'}>사진 지우기</button><button type="button" class="wide" id="bannerDel" ${m.banner ? '' : 'disabled'}>순위 배경 지우기 (배경은 상점에서 사요)</button>
</div></div>`;
  h += `<p class="hint">수익률은 처음 받은 10억원과 파산 지원금을 합친 금액 기준이에요.</p>`;
  }
  el.innerHTML = h;
}

/* ───────── feed ───────── */
function feedText(f) {
  if (f && typeof f.kind === 'string' && f.kind.startsWith('k_')) return kFeedText(f);
  const st = f.sym && SM[f.sym]; const nm = esc(nameOf(f.uid)); const size = won(f.amt || 0) + '어치';
  if ((f.kind === 'buy' || f.kind === 'sell' || f.kind === 'short' || f.kind === 'lev' || f.kind === 'liq') && !st) return null;
  if (f.kind === 'casino' && typeof f.amt !== 'number') return null;
  switch (f.kind) {
    case 'join': return ['', '👋', `<b>${nm}</b>님이 참가했어요`];
    case 'buy': return ['up', '🛒', `<b>${nm}</b>님이 ${esc(st.n)}을(를) <b>${size}</b> 샀어요`];
    case 'sell': return (f.pnl || 0) >= BIG_LIQ ? ['up', '💰', `<b>${nm}</b>님이 ${esc(st.n)}을(를) 팔아서 <b class="up">+${man(f.pnl)}원</b> 벌었어요`] : ['down', '💸', `<b>${nm}</b>님이 ${esc(st.n)}을(를) <b>${size}</b> 팔았어요`];
    case 'cover': return st && (f.pnl || 0) >= BIG_LIQ ? ['up', '💰', `<b>${nm}</b>님이 ${esc(st.n)} 공매도로 <b class="up">+${man(f.pnl)}원</b> 벌었어요`] : null;
    case 'short': return ['gold', '🎯', `<b>${nm}</b>님이 ${esc(st.n)}에 <b>${size}</b> 공매도를 걸었어요`];
    case 'casino': return [f.amt > 0 ? 'up' : 'down', f.amt > 0 ? '🎰' : '💥', f.amt > 0 ? `<b>${nm}</b>님이 ${esc(f.game)}에서 ${f.mult}배! <b>+${won(f.amt)}</b>` : `<b>${nm}</b>님이 ${esc(f.game)}에서 <b>${won(-f.amt)}</b> 날렸어요`];
    case 'est_buy': return EM[f.est] ? ['up', '🏢', `<b>${nm}</b>님이 ${esc(EM[f.est].n)}을(를) ${man(f.amt)}원에 샀어요`] : null;
    case 'est_sell': return EM[f.est] ? ['down', '🏢', `<b>${nm}</b>님이 ${esc(EM[f.est].n)}을(를) 팔았어요`] : null;
    case 'est_destroy': return EM[f.est] ? ['up', '💥', `누군가 <b>${esc(EM[f.est].n)}</b>을(를) 파괴했어요!`] : null;
    case 'est_restore': return EM[f.est] ? ['gold', '🔧', `<b>${nm}</b>님이 ${esc(EM[f.est].n)}을(를) 복구했어요`] : null;
    case 'est_force': return EM[f.est] ? ['up', '🏴', `<b>${nm}</b>님이 ${f.target ? `<b>${esc(nameOf(f.target))}</b>님의 ` : ''}${esc(EM[f.est].n)}을(를) 강제 매입했어요!`] : null;
    case 'lev': return st ? [f.d < 0 ? 'down' : 'up', f.d < 0 ? '📉' : '🚀', `<b>${nm}</b>님이 ${esc(st.n)} <b>${f.x}배 ${f.d < 0 ? '숏' : '롱'}</b> 진입!`] : null;
    case 'levclose': return st ? [f.amt >= 0 ? 'up' : 'down', f.amt >= 0 ? '🤑' : '😭', `<b>${nm}</b>님이 ${esc(st.n)} 레버리지 정리 <b class="${f.amt >= 0 ? 'up' : 'down'}">${pctTxt(f.amt)}</b>${(f.pnl || 0) >= BIG_LIQ ? ` · <b class="up">+${man(f.pnl)}원</b> 벌었어요` : ''}`] : null;
    case 'liq': return st ? ['down', '💀', `<b>${nm}</b>님 ${esc(st.n)} <b>${f.x > 1 ? f.x + '배 ' + (f.d < 0 ? '숏' : '롱') + ' 청산' : '공매도 반대매매'}</b>당했어요${f.amt ? ` <b class="down">-${man(f.amt)}원</b>` : ''}`] : null;
    case 'rename': return ['gold', '✏️', `<b>${esc(f.old || '누군가')}</b>님이 닉네임을 <b>${nm}</b>(으)로 바꿨어요`];
    case 'tbag': return ['gold', '🫖', `<b>${nm}</b>님이 청산당한 <b>${esc(nameOf(f.target))}</b>님을 티배깅했어요`];
    case 'atk': return st ? ['up', '💥', `<b>${nm}</b>님이 <b>${esc(nameOf(f.target))}</b>님의 ${esc(st.n)} 포지션을 <b>${f.dir < 0 ? '▼12% 폭락' : '▲12% 폭등'} 공격</b>했어요!${f.bounty ? ` <b class="up">(참수 성공 · 비용 환급)</b>` : ''}`] : null;
    case 'spy': return ['gold', '🕵️', `누군가 <b>${esc(nameOf(f.target))}</b>님의 지갑을 엿봤어요`];
    default: return null;
  }
}
function timeAgo(ts) { const s = Math.floor((now() - ts) / 1000); if (s < 60) return '방금'; if (s < 3600) return Math.floor(s / 60) + '분 전'; if (s < 86400) return Math.floor(s / 3600) + '시간 전'; return Math.floor(s / 86400) + '일 전'; }
// 💬 건의 · 소식: 상단 건의 버튼으로 열어요. 건의는 모두가 쓰는 채팅방이에요.
const BOARD = '__board';
// ⬅️ 앱 안 뒤로가기: 창(거래 창·프로필·종목 상세·건의)이 열려 있으면 방문 기록에 한 칸을 쌓아 두고,
// 휴대폰 뒤로가기를 누르면 앱을 나가는 대신 맨 위 창부터 하나씩 닫아요.
let GUARD = false, SKIP = 0;
const anyOverlay = () => !!(S.sheet || S.detail || S.board || S.profile);
function guardOn() { if (!GUARD) { try { history.pushState({ gom: 1 }, ''); GUARD = true; } catch {} } }
function guardOff() { if (GUARD && !anyOverlay()) { GUARD = false; SKIP++; try { history.back(); } catch { SKIP--; } } }
window.addEventListener('popstate', () => {
  if (SKIP) { SKIP--; return; }
  GUARD = false;
  if (S.sheet) closeSheetRaw(); else if (S.profile) closeProfileRaw(); else if (S.board) closeBoardRaw(); else if (S.detail) closeDetailRaw(); else return;
  if (anyOverlay()) guardOn();
});
function openBoard() { S.board = S.board || 'talk'; if (S.board !== 'talk' && S.board !== 'feed') S.board = 'talk'; $('#board').hidden = false; document.body.classList.add('noscroll'); renderBoard();  guardOn(); }
function closeBoardRaw() { S.board = null; $('#board').hidden = true; document.body.classList.remove('noscroll'); }
function closeBoard() { closeBoardRaw(); guardOff(); }
function renderBoard() {
  const d = $('#board'); if (!S.board || !d) return;
  const ae = document.activeElement, keep = ae && ae.id === 'boardInput' ? { v: ae.value, s: ae.selectionStart } : null;
  let h = `<div class="in"><div class="dtop"><button class="back" type="button" id="boardBack" aria-label="닫기"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><b>건의 · 소식</b></div>
    <div class="seg" style="grid-template-columns:1fr 1fr"><button type="button" data-boardtab="talk" aria-pressed="${S.board === 'talk'}">건의</button><button type="button" data-boardtab="feed" aria-pressed="${S.board === 'feed'}">소식</button></div>`;
  if (S.board === 'feed') { d.innerHTML = h + `<section class="sec" id="tab-feed" style="gap:22px"></section></div>`; renderFeed(); return; }
  const msgs = S.talk.filter(t => t.sym === BOARD).slice(0, 150).reverse(); const canWrite = S.me && !S.readOnly;
  h += `<p class="hint">바라는 점, 버그, 아무 얘기나 자유롭게 남겨요. 모두에게 보여요.</p><div class="chat" id="boardChat">`;
  if (!msgs.length) h += `<div class="chat-empty">아직 조용해요. 첫 건의를 남겨보세요.</div>`;
  let prevTs = 0;
  msgs.forEach(t => { const au = S.players[t.uid] || {}, mine = t.uid === S.uid, nm = au.name || t.name || '누군가';
    if (!prevTs || t.ts - prevTs > 60 * 60e3) h += `<div class="chat-day">${chatTime(t.ts, true)}</div>`;
    h += `<div class="msg${mine ? ' me' : ''}">${mine ? '' : ava({ ...au, id: t.uid, name: nm })}<div class="mb"><div class="mn">${mine ? `나 · ${esc(nm)}` : esc(nm)}</div><div class="mrow"><span class="bubble">${esc(t.text)}</span><time>${chatTime(t.ts)}</time></div></div></div>`;
    prevTs = t.ts; });
  h += `</div>` + (canWrite ? `<div class="composer"><input id="boardInput" maxlength="140" placeholder="건의 남기기" autocomplete="off" enterkeyhint="send" value="${esc(S.boardDraft || '')}"><button type="button" id="boardSend" aria-label="보내기">➤</button></div>` : `<p class="hint">참가하면 건의를 남길 수 있어요.</p>`) + `</div>`;
  d.innerHTML = h;
  const cb = $('#boardChat'); if (cb) cb.scrollTop = cb.scrollHeight;
  if (keep) { const i = $('#boardInput'); if (i) { i.value = keep.v; i.focus(); try { i.setSelectionRange(keep.s, keep.s); } catch {} } }
}
async function postBoard() {
  const i = $('#boardInput'); if (!i || !S.me || S.readOnly) return; const text = i.value.trim().slice(0, 140); if (!text) return;
  const item = { sym: BOARD, uid: S.uid, name: S.me.name, text, ts: Date.now(), season: S.season.sid, likes: {} };
  i.value = ''; S.boardDraft = '';
  if (S.mode === 'demo') { S.talk.unshift({ id: 't' + Date.now(), ...item }); LS.set('demoTalk', S.talk.filter(t => !t.bot)); renderBoard(); return; }
  try { await S.db.collection('sb_talk').add(item); } catch (e) { toast('건의를 보내지 못했어요. 잠시 후 다시 해주세요.'); i.value = text; }
}
// ⭐ 레벨: 상점에서 현금으로 올려요. LV.1에서 시작, 첫 레벨업 100원, 올릴 때마다 1.14배 (LV.200 근처가 상위권)
// (레벨 초기화 2번째: 예전 필드 lv·lvl 대신 lv3을 써요. 데이터는 지우지 않아요)
const lvOf = p => Math.max(1, Math.floor((p && p.lv3) || 1));
const lvCost = lv => Math.max(100, Math.round(100 * Math.pow(1.14, lv - 1)));
async function levelUp() {
  if (!S.me || S.saving || S.readOnly) return;
  const lv = lvOf(S.me), cost = lvCost(lv); if (S.me.cash < cost) { toast(`현금이 ${won(cost - S.me.cash)} 부족해요`); return; }
  const before = S.me, me = JSON.parse(JSON.stringify(before)); me.cash = Math.round(me.cash - cost); me.lv3 = lv + 1;
  S.saving = true; const ok = await saveMe(me, before); S.saving = false;
  if (ok) { toast(`⭐ LV.${lv + 1} 달성!`); confetti(); buzz(60); renderAll(); }
}
// 현금으로 갈 수 있는 데까지 한 번에 올리기 (두 번 눌러야 결제)
function lvMaxPlan(cash, lv) { let n = lv, spent = 0; while (n < 100000) { const c = lvCost(n); if (spent + c > cash) break; spent += c; n++; } return { to: n, spent }; }
async function levelMax() {
  if (!S.me || S.saving || S.readOnly) return;
  const lv = lvOf(S.me), plan = lvMaxPlan(S.me.cash, lv); if (plan.to <= lv) { toast('현금이 부족해요'); return; }
  if (!S.lvArm || Date.now() - S.lvArm > 4000) { S.lvArm = Date.now(); renderShop(); return; }
  S.lvArm = 0;
  const before = S.me, me = JSON.parse(JSON.stringify(before)); me.cash = Math.round(me.cash - plan.spent); me.lv3 = plan.to;
  S.saving = true; const ok = await saveMe(me, before); S.saving = false;
  if (ok) { toast(`⭐ LV.${plan.to} 달성! (${plan.to - lv}레벨 · ${won(plan.spent)})`); confetti(); buzz(80); renderAll(); }
}
// 🖼️ 순위 배경 변경권: 사면 잠금이 풀리고, 배경을 한 번 바꾸면 다시 잠겨요
async function buyBannerTicket() {
  if (!S.me || S.saving || S.readOnly) return;
  if (S.me.bannerTk > 0) { pickPhoto('banner'); return; }
  if (S.me.cash < BANNER_COST) { toast(`현금이 ${won(BANNER_COST - S.me.cash)} 부족해요`); return; }
  if (!S.bnArm || Date.now() - S.bnArm > 4000) { S.bnArm = Date.now(); renderShop(); return; }
  S.bnArm = 0; const before = S.me, me = JSON.parse(JSON.stringify(before)); me.cash = Math.round(me.cash - BANNER_COST); me.bannerTk = 1;
  S.saving = true; const ok = await saveMe(me, before); S.saving = false;
  if (ok) { toast('🔓 변경권 구매 완료! 배경 사진을 골라 주세요'); renderAll(); }
}
// 🛍️ 상점
function renderShop() {
  const el = $('#tab-shop');
  if (S.shopView === 'game') {
    if (!el.querySelector('#tab-casino')) el.innerHTML = `<button type="button" class="back-link" id="shopBack">← 상점으로</button><section class="sec" id="tab-casino" style="gap:18px"></section>`;
    if (!C.busy) renderCasino(); return;
  }
  const lv = S.me ? lvOf(S.me) : 1, lc = lvCost(lv), plan = S.me ? lvMaxPlan(S.me.cash, lv) : { to: lv, spent: 0 }, armed = S.lvArm && Date.now() - S.lvArm < 4000;
  el.innerHTML = `<div class="card shopitem lvitem"><span class="si-ic">⭐</span><span class="si-t"><b>레벨업 · 지금 LV.${lv}</b><small>LV.${lv + 1}로 올려요. 올릴 때마다 1.14배</small></span><button type="button" id="lvUp" ${S.me && !S.readOnly && S.me.cash >= lc && !S.saving ? '' : 'disabled'}>${won(lc)}</button></div>
    ${plan.to > lv + 1 ? `<button type="button" class="cta ${armed ? 'buy' : 'soft'} lvmax" id="lvMax" ${S.saving || S.readOnly ? 'disabled' : ''}>${armed ? `한 번 더 누르면 LV.${plan.to}까지 · ${won(plan.spent)} 결제` : `⏫ 최대한 올리기 · LV.${plan.to}까지 ${won(plan.spent)}`}</button>` : ''}
<div class="sec"><div class="sec-h"><h2>상점</h2><small>현금으로 사요</small></div>
    <div class="card shopitem"><span class="si-ic">🖼️</span><span class="si-t"><b>순위 배경 변경권</b><small>사진을 골라 내 순위 줄·프로필 배경으로 옅게 깔아요</small></span>${S.me && S.me.bannerTk > 0 ? `<button type="button" id="bannerBtn" class="unlocked">🔓 배경 고르기</button>` : `<button type="button" id="bannerBuy" ${S.me && !S.readOnly && S.me.cash >= BANNER_COST && !S.saving ? '' : 'disabled'}>${S.bnArm && Date.now() - S.bnArm < 4000 ? '한 번 더 눌러 구매' : `🔒 ${won(BANNER_COST)}`}</button>`}</div>
    <div class="card shopitem"><span class="si-ic">✏️</span><span class="si-t"><b>닉네임 변경권</b><small>한 번 쓰면 닉네임을 바꿀 수 있어요</small></span><button type="button" id="renameOpen" ${S.me && !S.readOnly ? '' : 'disabled'}>${won(RENAME_COST)}</button></div></div>`;
}
// 소식에는 놀릴 거리만 남겨요: 100억 이상 청산, 티배깅, 건물 매입·강제 매입·파괴, 참수 성공한 공격
const brag = f => f && ((f.kind === 'liq' && (f.amt || 0) >= BIG_LIQ) || ((f.kind === 'sell' || f.kind === 'levclose' || f.kind === 'cover') && (f.pnl || 0) >= BIG_LIQ) || f.kind === 'tbag' || f.kind === 'est_buy' || f.kind === 'est_force' || f.kind === 'est_destroy' || (f.kind === 'atk' && f.bounty));
function renderFeed() {
  const el = $('#tab-feed');
  const items = S.feed.filter(brag).map(f => [f, feedText(f)]).filter(x => x[1]);
  let h = `<div class="sec"><div class="sec-h"><h2>소식</h2><small>100억 청산 · 티배깅 · 건물</small></div><div class="slist">`;
  if (!items.length) h += `<div class="empty">아직 조용해요.</div>`;
  items.slice(0, 40).forEach(([f, [c, ic, tx]]) => { h += `<div class="fitem"><span class="ic ${c}">${ic}</span><span>${tx}</span><time>${timeAgo(f.ts)}</time></div>`; });
  h += `</div></div>`; el.innerHTML = h;
  if (items.length) { S.feedSeen = items[0][0].ts; LS.set('feedSeen', S.feedSeen); }
  $('#feedDot').hidden = true;
}
// 카테고리 버튼 줄을 밀고 있는 동안(그리고 관성 스크롤 동안)은 1초 새로고침을 잠깐 멈춰요
let chipsTouchAt = 0;
function renderAll() {
  renderHeader(); renderClock();
  if (S.tab === 'assets') { if (S.sub === 'casino' && document.activeElement && document.activeElement.id === 'betInput') updateBetLabels(); else if (!(S.sub === 'casino' && C.busy)) renderWallet(); }
  else if (!(S.liveOnly && (S.tab === 'home' || S.tab === 'market' || S.tab === 'invest' || S.tab === 'coin') && Date.now() - chipsTouchAt < 1500)) ({ home: renderHome, market: renderMarket, invest: renderInvest, shop: renderShop, coin: renderCoins, bond: renderBonds })[S.tab]();
  if (S.sheet && S.sheet.type === 'estate' && S.liveOnly) { const ep = $('#estPrice'), e = estOf(S.sheet.bid); if (ep && !(e && e.destroyed)) ep.textContent = won(estVal(S.sheet.bid, S.tick)); drawEstChart(); }
  const latest = S.feed.find(f => f.uid !== S.uid && brag(f));
  $('#feedDot').hidden = S.board === 'feed' || !latest || latest.ts <= S.feedSeen;
  if (S.board && !S.liveOnly) renderBoard();
  if (S.profile) renderProfile();
  if (S.sheet && (S.sheet.type === 'stock' || S.sheet.type === 'quick')) updateTradeEst();
  if (S.detail) { if (S.liveOnly) updateDetailLive(); else renderDetail(); }
}
function goTab(name) {
  S.tab = name; document.querySelectorAll('.nav [data-tab]').forEach(x => x.setAttribute('aria-selected', x.dataset.tab === name));
  S.sub = 'wallet';
  ['home', 'market', 'invest', 'shop', 'coin', 'bond'].forEach(n => $('#tab-' + n).hidden = n !== name);
  const bb = $('#boardBtn'); if (bb) bb.hidden = name !== 'invest' && name !== 'home';
  const gb = $('#gameBtn'); if (gb) gb.hidden = name !== 'shop';
  $('#assetSeg').hidden = true; $('#tab-wallet').hidden = name !== 'assets';
  document.querySelectorAll('#assetSeg [data-sub]').forEach(x => x.setAttribute('aria-pressed', x.dataset.sub === S.sub));
  renderAll(); window.scrollTo({ top: 0 });
}

/* ───────── chart ───────── */
function drawChart(cv, arr, o = {}) {
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
  cv.width = w * dpr; cv.height = h * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const cs = getComputedStyle(document.documentElement); const tok = n => cs.getPropertyValue(n).trim();
  const L0 = o.live, padT = 8, padB = o.padB ?? (L0 ? 22 : 8), padX = 6; // 주간 차트(live)만 요일 표시, 나머지는 과거→현재 흐름만
  const base = o.base ?? arr[0];
  const L = o.live; const all = L ? [...arr, L.v] : arr;
  const lo = Math.min(...all, base), hi = Math.max(...all, base), span = hi - lo || 1;
  const n = L0 ? NT : Math.max(1, arr.length - 1), X = i => padX + (w - padX * 2) * i / n, Y = v => padT + (h - padT - padB) * (1 - (v - lo) / span);
  const col = all[all.length - 1] >= base ? tok('--up') : tok('--down');
  g.strokeStyle = tok('--faint'); g.lineWidth = 1.5; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(padX, Y(base)); g.lineTo(w - padX, Y(base)); g.stroke(); g.setLineDash([]);
  g.beginPath(); arr.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); if (L) g.lineTo(X(L.x), Y(L.v));
  g.strokeStyle = col; g.lineWidth = 2.4; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke();
  const li = arr.length - 1; const ex = L ? X(L.x) : X(li), ey = L ? Y(L.v) : Y(arr[li]); g.beginPath(); g.arc(ex, ey, 5, 0, 7); g.fillStyle = col; g.fill(); g.lineWidth = 2.5; g.strokeStyle = tok('--bg'); g.stroke();
  if (padB > 10) { g.fillStyle = tok('--faint'); g.font = '12px ' + tok('--f-game'); g.textAlign = 'center'; DOW.forEach((d, i) => g.fillText(d, X(i * 3 + 1.5), h - 5)); }
}

/* ───────── sheets ───────── */
function openSheet(type, data = {}) { S.sheet = { type, ...data }; const w = $('#sheetWrap'); w.classList.toggle('center', type === 'quick'); w.hidden = false; renderSheet(); setTimeout(() => { const n = $('#nick'); if (type === 'join' && n) { n.focus(); n.select(); } }, 60);  guardOn(); }
function closeSheetRaw() { const t = S.sheet && S.sheet.type; S.sheet = null; $('#sheetWrap').hidden = true; if (t === 'reveal') maybeJoin(); }
function closeSheet() { closeSheetRaw(); guardOff(); }
function renderSheet() {
  const b = $('#sheetBody'); const sh = S.sheet; if (!sh) return;
  (KSHEETS[sh.type] || ({ estate: renderEstateSheet, stock: renderStockSheet, quick: renderQuickSheet, player: renderPlayerSheet, join: renderJoinSheet, rename: renderRenameSheet, pos: b => { b.innerHTML = posHUD() || '<div class="empty">이 시장에는 포지션이 없어요.</div>'; }, help: renderHelp, reveal: renderReveal })[sh.type])(b, sh);
}
function openDetail(sym) { S.chatJump = true; S.detail = sym; const d = $('#detail'); d.hidden = false; document.body.classList.add('noscroll'); renderDetail(); d.scrollTop = 0;  guardOn(); }
function closeDetailRaw() { S.detail = null; $('#detail').hidden = true; document.body.classList.remove('noscroll'); }
function closeDetail() { closeDetailRaw(); guardOff(); }
const VOL_TXT = v => v < .027 ? '낮음' : v < .045 ? '보통' : '높음';
function detailPos(sym, p) {
  const q = (S.me && S.me.hold && S.me.hold[sym]) || 0, avg = S.me && S.me.cost && S.me.cost[sym];
  const sh = S.me && S.me.shorts && S.me.shorts[sym]; let h = '';
  if (q) { const pl = (p - avg) * q; h += `<div class="r"><span>보유 ${QT(sym, q)} · 평단 ${PW(sym, avg)}</span><b class="num ${cls(pl)}">${signWon(pl)} (${pctTxt(p / avg - 1)})</b></div>`; }
  if (sh) { const v = Math.max(0, sh.q * (2 * sh.e - p)), pl = v - sh.q * sh.e; h += `<div class="r"><span>공매도 ${QT(sym, sh.q)} · 진입 ${PW(sym, sh.e)}</span><b class="num ${cls(pl)}">${signWon(pl)}</b></div>`; }
  return h ? `<div class="card mypos">${h}</div>` : '';
}
function detailStats(sym, p) {
  const hist = isEq(sym) ? Array.from({ length: 25 }, (_, i) => eqAt(sym, now() - i * 36e5)) : [...S.SE.prices[sym].slice(0, S.tick + 1), p]; const hi = Math.max(...hist), lo = Math.min(...hist);
  const holders = activePlayers().filter(x => (x.hold || {})[sym] > 0);
  return `<div>${isEq(sym) ? '24시간' : '이번 주'} 최고<b class="num up">${PW(sym, hi)}</b></div><div>${isEq(sym) ? '24시간' : '이번 주'} 최저<b class="num down">${PW(sym, lo)}</b></div><div>${isEq(sym) ? '기준가' : '월요일 시가'}<b class="num">${PW(sym, SM[sym].p0)}</b></div><div>보유한 친구<b>${holders.length}명</b></div>`;
}
/* ── per-stock community ── */
const talkFor = sym => S.talk.filter(t => t.sym === sym).sort((a, b) => b.ts - a.ts);
function voteTally(sym) {
  let up = 0, dn = 0, mine = null;
  activePlayers().forEach(p => { const v = p.votes && p.votes[sym]; if (!v || v.k !== S.tick || v.sid !== S.season.sid) return; if (v.d === 'up') up++; else dn++; if (p.id === S.uid) mine = v.d; });
  return { up, dn, mine };
}
function talkHTML(sym) {
  const s = SM[sym]; const vt = voteTally(sym); const tot = vt.up + vt.dn; const upPct = tot ? Math.round(vt.up / tot * 100) : 50;
  const canWrite = S.me && !S.readOnly;
  let h = `<div class="card vote"><div class="vq"><b>${esc(s.n)}, 오를까 내릴까?</b><small>${tot ? `${tot}명 참여` : '첫 투표를 해보세요'}</small></div>
    <div class="vbar"><i style="width:${upPct}%"></i></div>
    <div class="vbtns"><button type="button" class="vb up${vt.mine === 'up' ? ' on' : ''}" data-vote="up" ${canWrite && !seasonOver() ? '' : 'disabled'}>오른다 ${tot ? upPct + '%' : ''}</button><button type="button" class="vb down${vt.mine === 'down' ? ' on' : ''}" data-vote="down" ${canWrite && !seasonOver() ? '' : 'disabled'}>내린다 ${tot ? (100 - upPct) + '%' : ''}</button></div></div>`;
  const msgs = talkFor(sym).slice(0, 150).reverse();
  h += `<div class="chat" id="chatBox">`;
  if (!msgs.length) h += `<div class="chat-empty">아직 조용해요. 첫 마디를 던져보세요.</div>`;
  let prevUid = null, prevTs = 0;
  msgs.forEach(t => {
    const au = S.players[t.uid] || {}; const mine = t.uid === S.uid;
    const holder = (au.hold || {})[sym] > 0;
    const cont = false; const nm = au.name || t.name || '누군가';
    if (!prevTs || t.ts - prevTs > 60 * 60e3) h += `<div class="chat-day">${chatTime(t.ts, true)}</div>`;
    h += `<div class="msg${mine ? ' me' : ''}">${mine ? '' : ava({ id: t.uid, name: nm, bot: au.bot })}
      <div class="mb"><div class="mn">${mine ? `나 · ${esc(nm)}` : esc(nm)}${holder ? '<span class="tag hold">주주</span>' : ''}</div>
      <div class="mrow"><span class="bubble">${esc(t.text)}</span><time>${chatTime(t.ts)}</time></div></div></div>`;
    prevUid = t.uid; prevTs = t.ts;
  });
  h += `</div>`;
  h += canWrite ? `<div class="composer"><input id="talkInput" maxlength="140" placeholder="메시지 보내기" autocomplete="off" enterkeyhint="send" value="${esc((S.drafts || {})[sym] || '')}"><button type="button" id="talkSend" aria-label="보내기"><svg viewBox="0 0 24 24"><path d="M4 12l16-8-6 16-2.5-6.5z"/></svg></button></div>`
    : `<p class="hint">${S.readOnly ? '관전 중에는 채팅할 수 없어요.' : '참가하면 채팅할 수 있어요.'}</p>`;
  return h;
}
function chatTime(ts, long) {
  const d = new Date(ts + KST); const hh = d.getUTCHours(), mm = String(d.getUTCMinutes()).padStart(2, '0');
  const t = `${hh < 12 ? '오전' : '오후'} ${hh % 12 || 12}:${mm}`;
  if (!long) return t;
  const today = kstDay(now()) === kstDay(ts); return today ? `오늘 ${t}` : `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${DOW[(d.getUTCDay() + 6) % 7]}요일 ${t}`;
}
function renderDetail() {
  const sym = S.detail; if (!sym) return; const s = SM[sym]; const d = $('#detail'); const k = S.tick;
  const p = px(sym, k), c = nowChg(sym), cw = p / s.p0 - 1;
  const q = (S.me && S.me.hold && S.me.hold[sym]) || 0, sh = S.me && S.me.shorts && S.me.shorts[sym];
  const off = !S.me || S.readOnly || seasonOver();
  const ae = document.activeElement, keep = ae && ae.id === 'talkInput' ? { v: ae.value, s: ae.selectionStart } : null;
  const st = d.scrollTop; const cb0 = $('#chatBox'); const atBottom = !cb0 || cb0.scrollHeight - cb0.scrollTop - cb0.clientHeight < 40; const cst = cb0 ? cb0.scrollTop : 0;
  d.innerHTML = `<div class="in">
    <div class="dtop"><button class="back" type="button" id="detailBack" aria-label="뒤로"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><b>${esc(s.n)}</b></div>
    <div class="dhead">${badge(s)}<div><h1>${esc(s.n)}</h1><small>${catName(s)} · 변동성 ${VOL_TXT(s.vol)}</small></div></div>
    <div class="dprice"><div class="p num"><span id="dPrice">${PW(sym, p)}</span><span class="livedot" title="실시간"></span></div><div class="c num" id="dChg"><span class="${cls(c)}">2시간 ${pctTxt(c)}</span> <span class="dim">·</span> <span class="${cls(cw)}">이번 주 ${pctTxt(cw)}</span></div></div>
    <div><canvas class="dchart" id="detailChart" aria-label="${esc(s.n)} 이번 주 가격 차트"></canvas></div>
    <div id="dPos">${detailPos(sym, p)}</div>
    <div class="sec"><div class="sec-h"><h2>누가 들고 있나</h2><small>모든 포지션 공개</small></div><div id="dHold">${holdersHTML(sym)}</div></div>
    <div class="stats" id="dStats">${detailStats(sym, p)}</div>
    <p class="hint">가격은 게임용 가상 데이터예요. 1초마다 바뀌어요.</p>
  </div>
  <div class="dbar"><div class="in" style="grid-template-columns:1fr">
    <button class="cta violet" type="button" data-quick="buy" data-sym="${sym}" ${off ? 'disabled' : ''}>거래</button>
  </div></div>`;
  d.scrollTop = st;
  const cb = $('#chatBox'); if (cb) cb.scrollTop = atBottom || S.chatJump ? cb.scrollHeight : cst; S.chatJump = false;
  if (keep) { const i = $('#talkInput'); if (i) { i.value = keep.v; i.focus(); try { i.setSelectionRange(keep.s, keep.s); } catch {} } }
  requestAnimationFrame(drawDetailChart);
}
// 최근 15분 실시간 가격(10초 간격)으로 그려서 1초마다 움직여요
function drawDetailChart() {
  const cv = $('#detailChart'); const sym = S.detail; if (!cv || !sym) return;
  const t1 = liveStep(now()) * LIVE_MS, arr = [];
  for (let t = t1 - 15 * 60e3; t < t1; t += 10e3) arr.push(Math.max(1, tickRound(priceAt(sym, t))));
  arr.push(px(sym, S.tick)); drawChart(cv, arr.map(v => v * cf(sym)), {});
}
// 이 종목을 가진 사람들과 공격 버튼 (지갑 화면의 공격 버튼과 같아요)
function holdersHTML(sym) {
  const canAtk0 = S.me && !S.readOnly && !seasonOver(); let rows = '';
  activePlayers().forEach(p => {
    myPositions(p).filter(x => x.sym === sym).forEach(x => {
      const isMe = p.id === S.uid, canAtk = canAtk0 && !isMe && !isEq(sym), dir = (x.kind === 'spot' || (x.kind === 'lev' && !x.label.includes('숏'))) ? -1 : 1, cost = atkCostOf(x.principal);
      const q = x.kind === 'spot' ? (p.hold || {})[sym] : x.kind === 'lev' ? ((p.lev || {})[sym] || {}).q : ((p.shorts || {})[sym] || {}).q;
      const btn = canAtk ? `<button type="button" class="atk-btn" data-atk="${esc(p.id)}:${x.kind}:${x.sym}" ${S.saving || S.me.cash < cost ? 'disabled' : ''}>💥 공격 ${dir < 0 ? '▼12%' : '▲12%'}<small>${man(cost)}원</small></button>` : '';
      rows += `<div class="pos${canAtk ? ' has-atk' : ''}">${ava(p)}<span class="sname"><b>${esc(p.name)}${isMe ? ' <span class="tag you">나</span>' : ''} <span class="postag ${x.kind === 'spot' ? 'spot' : dir > 0 ? 'short' : 'long'}">${x.label}</span></b>
        <small class="dim num">${QT(sym, q || 0)} · 원금 ${man(x.principal)}${x.dist != null ? ` · 청산 ${(x.dist * 100).toFixed(1)}%` : ''}</small></span>
        <span class="r num"><b>${won(x.value)}</b><br><small class="${cls(x.pnl)}">${signWon(x.pnl)} (${pctTxt(x.pct)})</small></span>${btn}</div>`;
    });
  });
  return `<div class="slist">${rows || '<div class="empty">아직 아무도 안 들고 있어요.</div>'}</div>`;
}
// live tick: touch only price parts so typing in the 토론방 is never interrupted
function updateDetailLive() {
  const sym = S.detail; if (!sym) return; const s = SM[sym]; const p = px(sym, S.tick), c = nowChg(sym), cw = p / s.p0 - 1;
  const el = $('#dPrice'); if (el) el.textContent = PW(sym, p);
  const ch = $('#dChg'); if (ch) ch.innerHTML = `<span class="${cls(c)}">2시간 ${pctTxt(c)}</span> <span class="dim">·</span> <span class="${cls(cw)}">이번 주 ${pctTxt(cw)}</span>`;
  const ps = $('#dPos'); if (ps) ps.innerHTML = detailPos(sym, p);
  const dh = $('#dHold'); if (dh) dh.innerHTML = holdersHTML(sym);
  const stt = $('#dStats'); if (stt) stt.innerHTML = detailStats(sym, p);
  drawDetailChart();
}
async function castVote(d) {
  if (!S.me || S.readOnly || S.saving || seasonOver()) return; const sym = S.detail;
  const before = S.me; const me = JSON.parse(JSON.stringify(before)); me.votes = me.votes || {};
  const cur = me.votes[sym]; if (cur && cur.k === S.tick && cur.sid === S.season.sid && cur.d === d) return;
  me.votes[sym] = { k: S.tick, sid: S.season.sid, d };
  S.saving = true; const ok = await saveMe(me, before); S.saving = false;
  if (ok) { toast(d === 'up' ? '오른다에 투표했어요' : '내린다에 투표했어요'); renderAll(); }
}
async function postTalk() {
  const i = $('#talkInput'); if (!i || !S.me || S.readOnly) return; const text = i.value.trim().slice(0, 140); if (!text) return;
  const sym = S.detail; const item = { sym, uid: S.uid, name: S.me.name, text, ts: Date.now(), season: S.season.sid, likes: {} };
  i.value = ''; if (S.drafts) delete S.drafts[sym]; S.chatJump = true;
  if (S.mode === 'demo') { S.talk.unshift({ id: 't' + Date.now(), ...item }); LS.set('demoTalk', S.talk.filter(t => !t.bot)); renderAll(); return; }
  try { await S.db.collection('sb_talk').add(item); } catch (e) { toast('메시지를 보내지 못했어요. 잠시 후 다시 해주세요.'); i.value = text; }
}
async function toggleLike(id) {
  const t = S.talk.find(x => x.id === id); if (!t || !S.me || S.readOnly) return; const on = !(t.likes || {})[S.uid];
  if (S.mode === 'demo') { t.likes = { ...(t.likes || {}), [S.uid]: on }; LS.set('demoTalk', S.talk.filter(x => !x.bot)); renderAll(); return; }
  try { await S.db.doc('sb_talk/' + id).update({ likes: { [S.uid]: on } }); } catch { toast('좋아요를 누르지 못했어요.'); }
}
async function deleteTalk(id) {
  const t = S.talk.find(x => x.id === id); if (!t || t.uid !== S.uid) return;
  if (S.mode === 'demo') { S.talk = S.talk.filter(x => x.id !== id); LS.set('demoTalk', S.talk.filter(x => !x.bot)); renderAll(); return; }
  try { await S.db.doc('sb_talk/' + id).delete(); } catch { toast('삭제하지 못했어요.'); }
}
function renderQuickSheet(b, sh) {
  const s = SM[sh.sym], p = px(s.id, S.tick), c = nowChg(s.id);
  const my = (S.me && S.me.hold && S.me.hold[s.id]) || 0;
  b.innerHTML = `<div class="shead">${badge(s)}<div><h3>${esc(s.n)}</h3><small>현재가 <b class="num" id="livePrice">${PW(s.id, p)}</b> <span class="num ${cls(c)}" id="livePct">${pctTxt(c)}</span> · 보유 ${QT(s.id, my)}</small></div></div>
    <div class="sheetcash"><span>💵 내 현금</span><b class="num">${won(S.me ? S.me.cash : 0)}</b></div>
    <div class="seg"${s.fx ? ' style="grid-template-columns:1fr 1fr"' : ''}>${(s.fx ? [['buy', '매수'], ['sell', '매도']] : [['buy', '매수'], ['sell', '매도'], ['short', '공매도'], ['lev', '🚀 레버']]).map(([m, l]) => `<button type="button" data-m="${m}" aria-pressed="${sh.m === m || (m === 'lev' && sh.m === 'levclose')}">${l}</button>`).join('')}</div>
    ${(() => { const o = S.me && (S.me.lev || {})[s.id]; if (!o) return ''; const r = levROE(o, p); return `<div class="levcard ${cls(r)}" id="levCard"><span>${o.x}배 ${levSide(o)} · ${QT(s.id, o.q)} · 진입 ${PW(s.id, o.e)}</span><b class="num">${pctTxt(r)}</b><button type="button" data-m="levclose">청산</button></div>`; })()}
    <div class="levdir" id="levdir" ${sh.m === 'lev' ? '' : 'hidden'}><button type="button" data-levd="long" aria-pressed="${sh.dir !== 'short'}">📈 롱 (오르면 이득)</button><button type="button" data-levd="short" aria-pressed="${sh.dir === 'short'}">📉 숏 (내리면 이득)</button></div>
    <div class="levx" id="levx" ${sh.m === 'lev' ? '' : 'hidden'}>${levsFor(s.id).map(x => `<button type="button" data-levx="${x}" aria-pressed="${(sh.x || 25) === x}">${x}배</button>`).join('')}</div>
    <div class="qtyrow"><button type="button" data-step="-1" aria-label="수량 줄이기">−</button><input id="qty" type="number" inputmode="decimal" step="any" min="0" value="${sh.q ? qOut(s.id, sh.q) : ''}" placeholder="${isCoin(s.id) ? '몇 개?' : s.fx ? '몇 달러?' : '몇 주?'}" aria-label="수량"><button type="button" data-step="1" aria-label="수량 늘리기">+</button></div>
    <div class="quick">${[['.1', '10%'], ['.25', '25%'], ['.5', '50%'], ['1', '최대']].map(([f, l]) => `<button type="button" data-frac="${f}">${l}</button>`).join('')}</div>
    <div class="est" id="est"></div>
    <button class="cta" id="doTrade" type="button">매수하기</button>
    <p class="hint" id="tradeHint"></p>`;
  updateTradeEst();
}
function renderStockSheet(b, sh) {
  const s = SM[sh.sym], k = S.tick, p = px(s.id, k), c = nowChg(s.id), cw = p / s.p0 - 1;
  const holders = activePlayers().filter(x => (x.hold || {})[s.id] > 0);
  let top = null, tv = 0; holders.forEach(x => { if (x.hold[s.id] > tv) { tv = x.hold[s.id]; top = x; } });
  const my = (S.me && S.me.hold && S.me.hold[s.id]) || 0, myS = S.me && S.me.shorts && S.me.shorts[s.id];
  const canTrade = S.me && !S.readOnly && !seasonOver();
  b.innerHTML = `<div class="shead">${badge(s)}<div><h3>${esc(s.n)}</h3><small>${catName(s)}</small></div></div>
    <div class="bigp"><div class="p num" id="livePrice">${PW(s.id, p)}</div><div class="c num"><span class="${cls(c)}" id="livePct">2시간 ${pctTxt(c)}</span> <span class="dim">·</span> <span class="${cls(cw)}">이번 주 ${pctTxt(cw)}</span></div></div>
    <canvas class="chart" id="bigChart" aria-label="이번 주 가격 차트"></canvas>
    <div class="info"><div>친구 주주<b>${holders.length}명</b></div><div>👑 최대 주주<b>${top ? esc(top.name) : '없음'}</b></div>
      <div>내 보유<b class="num">${my ? QT(s.id, my) : '-'}</b></div><div>내 공매도<b class="num">${myS ? QT(s.id, myS.q) : '-'}</b></div></div>
    ${canTrade ? `
    <div class="seg">${[['buy', '매수'], ['sell', '매도'], ['short', '공매도'], ['cover', '상환']].map(([m, l]) => `<button type="button" data-m="${m}" aria-pressed="${sh.m === m}">${l}</button>`).join('')}</div>
    <div class="qtyrow"><button type="button" data-step="-1" aria-label="수량 줄이기">−</button><input id="qty" type="number" inputmode="decimal" step="any" min="0" value="${sh.q ? qOut(s.id, sh.q) : ''}" placeholder="수량" aria-label="수량"><button type="button" data-step="1" aria-label="수량 늘리기">+</button></div>
    <div class="quick">${[['.1', '10%'], ['.25', '25%'], ['.5', '50%'], ['1', '풀매수']].map(([f, l]) => `<button type="button" data-frac="${f}">${l}</button>`).join('')}</div>
    <div class="est" id="est"></div>
    <button class="cta" id="doTrade" type="button">매수하기</button>
    <p class="hint" id="tradeHint"></p>` : `<p class="hint">${seasonOver() ? '이번 시즌 거래가 끝났어요. 월요일 0시에 새 시즌이 열려요.' : S.readOnly ? '관전 중이라 거래할 수 없어요.' : '참가하면 거래할 수 있어요.'}</p>`}`;
  requestAnimationFrame(drawBig);
  updateTradeEst();
}
function drawBig() { const cv = $('#bigChart'); const sh = S.sheet; if (!cv || !sh || !sh.sym) return; if (isEq(sh.sym)) { drawChart(cv, Array.from({ length: 49 }, (_, i) => eqAt(sh.sym, now() - (48 - i) * 18e5)), {}); return; } drawChart(cv, S.SE.prices[sh.sym].slice(0, S.tick + 1).map(v => v * cf(sh.sym)), { live: { x: liveX(), v: px(sh.sym, S.tick) * cf(sh.sym) } }); }
function maxQty(m, sym) {
  const p = px(sym, S.tick), me = S.me; if (!me) return 0;
  if (m === 'buy' || m === 'short') return Math.max(0, Math.floor(me.cash / (p * (1 + FEE))));
  if (m === 'sell') return (me.hold || {})[sym] || 0;
  if (m === 'lev') { const x = (S.sheet && S.sheet.x) || 25; return Math.max(0, Math.floor(me.cash / (p / x + p * FEE))); }
  if (m === 'levclose') return ((me.lev || {})[sym] || {}).q || 0;
  return ((me.shorts || {})[sym] || {}).q || 0;
}
function updateTradeEst() {
  const sh = S.sheet; const est = $('#est'); if (!sh || (sh.type !== 'stock' && sh.type !== 'quick') || !est) return;
  const q = qIn(sh.sym, $('#qty').value); sh.q = q; const p = px(sh.sym, S.tick), mx = maxQty(sh.m, sh.sym);
  const amt = q * p, fee = Math.ceil(amt * FEE);
  let line = '';
  if (sh.m === 'buy') line = `<span>필요 금액 <b class="num">${won(amt + fee)}</b></span>`;
  if (sh.m === 'sell') line = `<span>받을 금액 <b class="num">${won(Math.max(0, amt - fee))}</b></span>`;
  if (sh.m === 'short') line = `<span>증거금 <b class="num">${won(amt + fee)}</b></span>`;
  if (sh.m === 'lev') { const x = sh.x || 25; line = `<span>증거금 <b class="num">${won(amt / x + fee)}</b> · ${x}배</span>`; }
  if (sh.m === 'levclose') { const o = (S.me.lev || {})[sh.sym]; line = o ? `<span>돌려받을 금액 <b class="num">${won(Math.max(0, levVal(o, p) - Math.ceil(o.q * p * FEE)))}</b></span>` : ''; }
  if (sh.m === 'cover') { const o = (S.me.shorts || {})[sh.sym]; const v = o ? Math.max(0, q * (2 * o.e - p)) : 0; line = `<span>돌려받을 금액 <b class="num">${won(Math.max(0, v - fee))}</b></span>`; }
  est.innerHTML = line + `<span class="num">최대 ${QT(sh.sym, mx)}</span>`;
  const btn = $('#doTrade');
  btn.textContent = S.saving ? '처리 중…' : { buy: '매수하기', sell: '매도하기', short: '🎯 공매도 걸기', cover: '공매도 상환하기', lev: sh.dir === 'short' ? `📉 ${sh.x || 25}배 숏 진입` : `🚀 ${sh.x || 25}배 롱 진입`, levclose: '레버리지 청산하기' }[sh.m];
  btn.className = 'cta ' + (sh.m === 'lev' ? (sh.dir === 'short' ? 'sell' : 'buy') : sh.m === 'levclose' ? 'sell' : sh.m);
  if (sh.m === 'levclose') { const i = $('#qty'); const all = maxQty('levclose', sh.sym); if (i && qIn(sh.sym, i.value) !== all) { i.value = qOut(sh.sym, all); sh.q = all; } }
  btn.disabled = S.saving || !(sh.m === 'levclose' ? maxQty('levclose', sh.sym) : q) || q > mx;
  const lx = $('#levx'); if (lx) lx.hidden = sh.m !== 'lev'; const ld = $('#levdir'); if (ld) ld.hidden = sh.m !== 'lev';
  const lxVal = sh.x || 25, liqPct = +(94 / lxVal).toFixed(1);
  $('#tradeHint').textContent = { lev: sh.dir === 'short' ? `가격이 1% 내리면 수익은 ${lxVal}%! 대신 약 ${liqPct}% 오르면 증거금을 다 잃고 청산돼요 💀` : `가격이 1% 오르면 수익은 ${lxVal}%! 대신 약 ${liqPct}% 떨어지면 증거금을 다 잃고 청산돼요 💀`, levclose: '레버리지 포지션을 전부 정리하고 남은 돈을 받아요.', buy: '지금 보이는 가격으로 바로 체결돼요. 24시간 쉬지 않고 1초마다 바뀌어요.', sell: '판 돈은 바로 현금으로 들어와요.', short: '내리면 이득, 오르면 손해예요. 만기는 없고 상환할 때까지 유지돼요. 가격이 진입가보다 35% 오르면 자동 반대매매되고, 남은 돈은 돌려받아요. ', cover: '공매도를 정리하고 손익을 확정해요.' }[sh.m];
}
async function doTrade() {
  const sh = S.sheet; const q = sh.q, sym = sh.sym, m = sh.m, p = px(sym, S.tick);
  if (!q || q > maxQty(m, sym) || S.saving || seasonOver()) return;
  if (haltLeft(sym) > 0) { toast(haltMsg(sym)); return; }
  if ((m === 'buy' || m === 'short' || m === 'lev') && atkLive(sym)) { toast('💥 공격 충격 중인 종목이에요. 45초 뒤에 진입할 수 있어요'); return; }
  { const o = m === 'levclose' ? (S.me.lev || {})[sym] : m === 'cover' ? (S.me.shorts || {})[sym] : null;
    if (o && !lqReady(S.uid, m === 'cover' ? 'short' : 'lev', sym, o)) { toast('⏳ 앱이 꺼져 있던 동안의 청산 여부를 확인하는 중이에요. 잠시 후 다시 눌러 주세요'); return; } }
  if ((m === 'sell' || m === 'cover' || m === 'levclose') && atkLive(sym, S.uid)) { toast('💥 내가 공격한 종목이라 충격이 끝날 때까지 정리할 수 없어요'); return; }
  const before = S.me; const me = JSON.parse(JSON.stringify(before)); me.hold ||= {}; me.cost ||= {}; me.shorts ||= {};
  const amt = q * p, fee = Math.ceil(amt * FEE);
  if (m === 'buy') { const h0 = me.hold[sym] || 0; me.cost[sym] = ((me.cost[sym] || 0) * h0 + amt) / (h0 + q); me.hold[sym] = h0 + q; me.cash -= amt + fee; }
  if (m === 'sell') { me.hold[sym] -= q; me.cash += amt - fee; if (!me.hold[sym]) { delete me.hold[sym]; delete me.cost[sym]; } }
  if (m === 'short') { const o = me.shorts[sym] || { q: 0, e: 0 }; me.shorts[sym] = { q: o.q + q, e: (o.q * o.e + q * p) / (o.q + q), at: now() }; me.cash -= amt + fee; }
  if (m === 'cover') { const o = me.shorts[sym]; me.cash += Math.max(0, q * (2 * o.e - p) - fee); o.q -= q; if (!o.q) delete me.shorts[sym]; }
  me.lev ||= {};
  if (m === 'lev' && !levsFor(sym).includes(sh.x)) { toast('그 배수는 쓸 수 없어요'); return; }
  if (m === 'lev') { const x = sh.x || 25, d = sh.dir === 'short' ? -1 : 1, o = me.lev[sym]; const mg = amt / x;
    if (o && (o.d || 1) !== d) { toast(`반대쪽(${levSide(o)}) 포지션을 먼저 청산해 주세요`); return; }
    if (o) { const val = levVal(o, p); me.lev[sym] = { q: o.q + q, e: (o.q * o.e + q * p) / (o.q + q), m: val + mg, x: Math.round((o.q + q) * p / (val + mg)), d, at: now() }; }
    else me.lev[sym] = { q, e: p, m: mg, x, d, at: now() }; me.cash -= mg + fee; }
  if (m === 'levclose') { const o = me.lev[sym]; me.cash += Math.max(0, levVal(o, p) - Math.ceil(o.q * p * FEE)); me.levPnl = (me.levPnl || 0) + levVal(o, p) - o.m; delete me.lev[sym]; }
  me.cash = Math.round(me.cash);
  S.saving = true; updateTradeEst();
  const ok = await saveMe(me, before);
  S.saving = false;
  if (ok) {
    if (m === 'lev') addFeed({ kind: 'lev', sym, amt, x: sh.x || 25, d: sh.dir === 'short' ? -1 : 1 });
    else if (m === 'levclose') { const o = before.lev[sym], r = levROE(o, p); addFeed({ kind: 'levclose', sym, amt: r, pnl: Math.round(me.cash - before.cash - o.m) }); if (r > .5) { confetti(); buzz(80); } }
    else if (m === 'sell') addFeed({ kind: m, sym, amt, pnl: Math.round(amt - fee - q * ((before.cost || {})[sym] || p)) });
    else if (m === 'cover') { const o = before.shorts[sym]; addFeed({ kind: 'cover', sym, amt, pnl: Math.round(q * (o.e - p) - fee) }); }
    else addFeed({ kind: m, sym, amt });
    if (m === 'sell' && before.cost && before.cost[sym] && p / before.cost[sym] - 1 >= .1) { confetti(); buzz(60); }
    toast({ buy: `🛒 ${SM[sym].n} ${QT(sym, q)} 매수!`, sell: `💸 ${SM[sym].n} ${QT(sym, q)} 매도!`, short: `🎯 ${SM[sym].n} 공매도 진입`, cover: '공매도 상환 완료', lev: `${sh.dir === 'short' ? '📉' : '🚀'} ${SM[sym].n} ${sh.x || 25}배 ${sh.dir === 'short' ? '숏' : '롱'}!`, levclose: `${SM[sym].n} 레버리지 청산 ${m === 'levclose' ? pctTxt(levROE(before.lev[sym], p)) : ''}` }[m]);
    sh.q = 0; if (sh.type === 'quick') closeSheet(); renderAll(); if (S.sheet) renderSheet();
  } else updateTradeEst();
}
const atkCostOf = principal => Math.max(50_000_000, Math.round(principal * .15 / 10000) * 10000);
// 👤 프로필 화면: 순위에서 사람을 누르면 열려요. 이름·레벨·사진 + 주식/코인/부동산/정보 탭으로 염탐
function openProfile(id) { if (!S.players[id]) return; S.profile = id; S.ptab = 'info'; $('#profile').hidden = false; document.body.classList.add('noscroll'); renderProfile(); $('#profile').scrollTop = 0;  guardOn(); }
function closeProfileRaw() { S.profile = null; $('#profile').hidden = true; document.body.classList.remove('noscroll'); }
function closeProfile() { closeProfileRaw(); guardOff(); }
function renderProfile() { renderFriendProfile(); } // 새 프로필 화면 (me.js)
function renderProfileOld() {
  const d = $('#profile'); const id = S.profile; if (!id || !d) return;
  const p0 = S.players[id]; if (!p0) { closeProfile(); return; }
  const p = { id, ...p0 }, k = S.tick, w = worth(p, k), rk = ranking(k).findIndex(x => x.id === id) + 1, roi = roiOf(p, w);
  const isMe = id === S.uid, canAtk = !isMe && S.me && !S.readOnly && !seasonOver();
  if (!['info', 'stock', 'coin', 'estate'].includes(S.ptab)) S.ptab = 'info';
  const canAtk2 = false;
  const bn = okPhoto(p.banner) ? ` style="--bn:url(${p.banner})"` : '';
  const pos = myPositions(p).filter(x => S.ptab === 'coin' ? !isEq(x.sym) : isEq(x.sym)).sort((a, b) => (a.kind === 'spot') - (b.kind === 'spot') || b.value - a.value);
  let body = '';
  if (S.ptab === 'coin') {
    body = wonPosHTML(p); if (false) body = kPositions(p).map(x => { const c = KC[x.sym]; return `<div class="pos">${kBadge(c)}<span class="sname"><b>${esc(c.n)} <span class="postag ${x.kind === 'spot' ? 'spot' : 'long'}">${x.label}</span></b><small class="dim num">${kQty(x.q)} ${c.a} · 원금 ${krw(x.principal)}${x.dist != null ? ` · 반대매매 ${(x.dist * 100).toFixed(1)}%` : ''}</small></span>
      <span class="r num"><b>${krw(x.value)}</b><br><small class="${cls(x.pnl)}">${signKrw(x.pnl)} (${pctTxt(x.pct)})</small></span></div>`; }).join('') || '<div class="empty">코인이 없어요.</div>';
  } else if (S.ptab === 'stock') {
    body = pos.map(x => { const st = SM[x.sym], dir = (x.kind === 'spot' || (x.kind === 'lev' && !x.label.includes('숏'))) ? -1 : 1, cost = atkCostOf(x.principal);
      const q = x.kind === 'spot' ? (p.hold || {})[x.sym] : x.kind === 'lev' ? ((p.lev || {})[x.sym] || {}).q : ((p.shorts || {})[x.sym] || {}).q;
      const btn = canAtk && !isEq(x.sym) ? `<button type="button" class="atk-btn" data-atk="${esc(id)}:${x.kind}:${x.sym}" ${S.saving || S.me.cash < cost ? 'disabled' : ''}>💥 공격 ${dir < 0 ? '▼12%' : '▲12%'}<small>${man(cost)}원</small></button>` : '';
      return `<div class="pos${btn ? ' has-atk' : ''}">${badge(st)}<span class="sname"><b>${esc(st.n)} <span class="postag ${x.kind === 'spot' ? 'spot' : dir > 0 ? 'short' : 'long'}">${x.label}</span></b>
        <small class="dim num">${QT(x.sym, q || 0)} · 원금 ${man(x.principal)}${x.dist != null ? ` · 청산 ${(x.dist * 100).toFixed(1)}%` : ''}</small></span>
        <span class="r num"><b>${won(x.value)}</b><br><small class="${cls(x.pnl)}">${signWon(x.pnl)} (${pctTxt(x.pct)})</small></span>${btn}</div>`; }).join('') || `<div class="empty">${S.ptab === 'coin' ? '코인' : '주식·달러'} 포지션이 없어요.</div>`;
    if (canAtk && S.ptab === 'coin' && pos.length) body = `<p class="hint" style="margin:0 0 8px">💥 코인 포지션 공격: 상대 원금의 15%로 45초 동안 가격을 12% 반대로 밀어요. 레버리지를 청산시키면 비용을 돌려받아요.</p>` + body;
  } else if (S.ptab === 'estate') {
    const top = guChief();
    body = Object.entries(p.bonds || {}).filter(([g, n]) => BOND[g] && n > 0).sort((a, b) => b[1] - a[1]).map(([g, n]) => `<button class="srow-main brow" type="button" data-bond="${g}"><span class="logo-b bb" style="background:${chiefColor(id)}">${BOND[g].i + 1}</span><span class="sname"><b>${g} ${top[g] && top[g].id === id ? '👑' : ''}</b><small>${n}장 · 평단 ${krw((p.bCost || {})[g] || 0)}</small></span><span class="sprice"><div class="p num">${krw(bondSellGet(g, n))}</div></span></button>`).join('') || '<div class="empty">구채가 없어요.</div>';
  } else if (false) {
    const est = myEstates(p);
    body = est.map(b => { const e = estOf(b.id), v = e.destroyed ? e.destroyed.value : estVal(b.id, k);
      return `<button class="srow-main est-row" type="button" data-estate="${b.id}"><span class="logo-b" style="background:${e.destroyed ? 'var(--up)' : ownerColor(id)}">${e.destroyed ? '💥' : ICON[b.t]}</span><span class="sname"><b>${esc(b.n)}</b><small>${esc(b.gu)}${e.destroyed ? ' · <span class="up">파괴됨</span>' : ''}</small></span><span class="sprice"><div class="p num">${man(v)}원</div></span></button>`; }).join('') || '<div class="empty">건물이 없어요.</div>';
    if (est.length && canAtk) body = `<p class="hint" style="margin:0 0 8px">건물을 누르면 💣 소형·🚀 대형 공격이나 🏴 강제 매입을 할 수 있어요.</p>` + body;
  } else {
    body = `<div class="info"><div>현금<b class="num">${won(p.cash || 0)}</b></div><div>누적 수익률<b class="num ${cls(roi)}">${pctTxt(roi)}</b></div><div>코인·미국주식<b class="num">${won(kAssets(p) - bondWorth(p))}</b></div><div>구채<b class="num">${won(bondWorth(p))}</b></div></div>`;
  }
  const st0 = d.scrollTop;
  d.innerHTML = `<div class="in"><div class="dtop"><button class="back" type="button" id="profBack" aria-label="뒤로"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><b>프로필</b></div>
    <div class="profhero${bn ? ' bn' : ''}"${bn}>${ava(p, true, rk === 1)}<div><h2>${esc(p.name)} <span class="lvtag">LV.${lvOf(p)}</span></h2><small>${rk}위 · 총자산 <b class="num">${won(w)}</b></small>${lordOf(id) ? `<div class="lord">👑 ${lordOf(id)}</div>` : ''}</div></div>
    <div class="seg">${[['info', '정보'], ['coin', '코인·주식'], ['estate', '구채'], ['stock', '가상주식']].map(([v, l]) => `<button type="button" data-ptab="${v}" aria-pressed="${S.ptab === v}">${l}</button>`).join('')}</div>
    <div class="slist">${body}</div>
  </div>`;
  d.classList.toggle('bnpage', !!bn); if (bn) d.style.setProperty('--bn', `url(${p.banner})`); else d.style.removeProperty('--bn');
  d.scrollTop = st0;
}
function renderPlayerSheet(b, sh) {
  const p0 = S.players[sh.id]; if (!p0) { closeSheet(); return; }
  const p = { id: sh.id, ...p0 };
  const k = S.tick, w = worth(p, k), rk = ranking(k).findIndex(x => x.id === sh.id) + 1, roi = roiOf(p, w);
  const isMe = sh.id === S.uid, canAtk = !isMe && S.me && !S.readOnly && !seasonOver();
  const list = myPositions(p);
  const rows = list.map(x => {
    const st = SM[x.sym], dir = (x.kind === 'spot' || (x.kind === 'lev' && !x.label.includes('숏'))) ? -1 : 1, cost = atkCostOf(x.principal);
    const btn = canAtk && !isEq(x.sym) ? `<button type="button" class="atk-btn" data-atk="${esc(sh.id)}:${x.kind}:${x.sym}" ${S.saving || S.me.cash < cost ? 'disabled' : ''}>💥 공격 ${dir < 0 ? '▼12%' : '▲12%'}<small>${man(cost)}원</small></button>` : '';
    return `<div class="pos${canAtk ? ' has-atk' : ''}">${badge(st)}<span class="sname"><b>${esc(st.n)} <span class="postag ${x.kind === 'spot' ? 'spot' : dir > 0 ? 'short' : 'long'}">${x.label}</span></b>
      <small class="dim num">원금 ${man(x.principal)} → ${man(x.value)}${x.dist != null ? ` · 청산 ${(x.dist * 100).toFixed(1)}%` : ''}</small></span>
      <span class="r num"><b>${won(x.value)}</b><br><small class="${cls(x.pnl)}">${signWon(x.pnl)} (${pctTxt(x.pct)})</small></span>${btn}</div>`;
  }).join('');
  const hold = `<div class="slist">${rows || '<div class="empty">보유 중인 포지션이 없어요 (100% 현금)</div>'}
    <div class="pos"><span class="logo-b" style="background:var(--mint)">₩</span><span class="sname"><b>현금</b></span><span class="r num"><b>${won(p.cash)}</b></span></div></div>`;
  b.innerHTML = `<div class="shead">${ava(p, true, rk === 1)}<div><h3>${esc(p.name)} <span class="lvtag">LV.${lvOf(p)}</span></h3><small>${rk}위 · ${won(w)} · <span class="${cls(roi)}">${pctTxt(roi)}</span></small></div></div>
    ${canAtk && list.length ? `<p class="hint" style="margin:-4px 0">💥 <b>포지션 공격</b>: 상대 원금의 15%를 써서 주가를 45초 동안 반대 방향으로 12% 폭격해요! 상대 레버리지를 청산시키면 <b>공격 비용을 돌려받아요</b>. 충격 중인 종목은 아무도 새로 진입할 수 없고, 공격한 사람은 그 종목 포지션을 정리할 수 없어요.</p>` : ''}
    ${hold}
`;
}
async function attackPosition(targetUid, kind, sym) {
  if (!S.me || S.saving || S.readOnly || targetUid === S.uid) return;
  const p = S.players[targetUid]; if (!p) return;
  if (haltLeft(sym) > 0) { toast(haltMsg(sym)); return; }
  const x = myPositions(p).find(it => it.kind === kind && it.sym === sym);
  if (!x) { toast('이미 정리된 포지션이에요'); renderSheet(); return; }
  const cost = atkCostOf(x.principal);
  if (S.me.cash < cost) { toast(`공격 자금이 부족해요 (${won(cost)} 필요)`); return; }
  const dir = (x.kind === 'spot' || (x.kind === 'lev' && !x.label.includes('숏'))) ? -1 : 1;
  // 예상 타격 후 청산 여부 계산
  const pAfter = px(sym, S.tick) * (dir < 0 ? 1 / (1 + ATK_MAG) : (1 + ATK_MAG));
  const killed = (kind === 'lev' && p.lev && p.lev[sym] && levVal(p.lev[sym], pAfter) <= p.lev[sym].m * .03)
    || (kind === 'short' && p.shorts && p.shorts[sym] && p.shorts[sym].q * (2 * p.shorts[sym].e - pAfter) <= p.shorts[sym].q * p.shorts[sym].e * .03);
  const bounty = killed ? cost : 0; // 청산시키면 공격 비용만 돌려받아요 (돈이 새로 생기지 않게)
  const before = S.me, me = JSON.parse(JSON.stringify(before));
  me.cash = Math.round(me.cash - cost + bounty);
  S.saving = true; const ok = await saveMe(me, before); S.saving = false;
  if (!ok) return;
  if (killed && p.bot) {
    if (kind === 'lev' && p.lev) delete p.lev[sym];
    if (kind === 'short' && p.shorts) delete p.shorts[sym];
  }
  addFeed({ kind: 'atk', sym, dir, target: targetUid, amt: cost, bounty });
  LV.step = -1;
  boom(); if (killed) confetti(); buzz(70);
  toast(killed
    ? `💀 참수 성공! ${p.name}님의 ${SM[sym].n} 포지션 폭파! 공격 비용 ${won(bounty)} 환급!`
    : `💥 ${p.name}님의 ${SM[sym].n} 포지션 공격! (${dir < 0 ? '▼12% 폭락' : '▲12% 폭등'} 충격파)`);
  renderAll(); if (S.sheet) renderSheet();
}
async function doSpy(id) {
  if (!S.me || S.saving) return; const before = S.me; const me = JSON.parse(JSON.stringify(before)); me.spy = { day: kstDay(now()), target: id };
  S.saving = true; const ok = await saveMe(me, before); S.saving = false;
  if (ok) { addFeed({ kind: 'spy', target: id }); toast('🕵️ 지갑을 열어봤어요'); renderAll(); renderSheet(); }
}
function renderJoinSheet(b) {
  const prev = (S.players[S.uid] && S.players[S.uid].name) || LS.get('nick', '') || '존버의신';
  b.innerHTML = `<div class="rv-head"><span class="k">SUNBIT</span><h3>10억원으로 시작</h3></div>
    <p class="hint" style="text-align:center">진짜 업비트 시세 코인(선물 롱·숏)과 미국주식, 서울 구채, 가상주식까지 한 지갑으로 굴려요. 총자산 1등을 노려 보세요.</p>
    <div class="field"><label for="nick" class="dim" style="font-size:13px;font-weight:700">닉네임</label><input id="nick" maxlength="10" placeholder="예: 존버의신" value="${esc(prev)}"></div>
    <p class="hint nickwarn">⚠️ 실명은 쓰지 마세요. 닉네임은 순위·채팅에서 모두에게 보여요.</p>
    <button class="cta" type="button" id="joinBtn">참가하기</button>`;
}
async function doJoin() {
  const inputEl = $('#nick');
  const nick = ((inputEl && inputEl.value) || '').trim().slice(0, 10) || '존버의신';
  LS.set('nick', nick);
  const me = kInit({ name: nick, season: S.season.sid, cash: CASH0, inflow: CASH0, bonusN: 0, joined: Date.now(), hold: {}, cost: {}, shorts: {}, spy: null, casino: 0, ts: Date.now(), cpH: Math.floor(Date.now() / H) });
  S.saving = true; const ok = await saveMe(me, S.me); S.saving = false;
  if (ok) { LS.set('seen:' + S.season.sid, S.tick); addFeed({ kind: 'join' }); closeSheet(); toast('참가 완료!'); renderAll(); autoCredit(); }
}
// ? 도움말: 지금 보고 있는 탭에 맞는 설명을 보여줘요
const HELP = {
  home: ['홈', '총자산 순위', [
    '돈은 <b>원화</b> 하나예요. 처음 <b>10억원</b>. 진짜 시세 코인·미국주식·구채와 가상주식·게임·상점에 다 같이 써요.',
    '<b>총자산</b> = 현금 + 코인(현물·선물) + 미국주식 + 구채 + 가상주식 평가금. 순위는 총자산 순서예요.',
    '<b>파산</b>: 총자산이 100만원 밑으로 떨어지면 거래소 탭에서 <b>1,000만원</b>을 받을 수 있어요.',
    '이름을 누르면 그 사람 지갑이 다 보여요.']],
  coin: ['거래소', '코인 · 미국주식 · 원화', [
    '업비트 원화마켓 30여 종목의 <b>실시간 시세</b> 그대로예요. 수수료 0.05%, 최소 주문 5,000원.',
    '<b>🚀 선물 롱·숏</b>: 해외 선물거래소처럼 배수를 골라요. BTC·ETH 최대 100배, 알트 50배, 밈 25배. 수수료 0.05%, 펀딩비 8시간마다 0.01%.',
    '약 1÷배수만큼 반대로 가면 <b>청산</b>돼서 증거금을 다 잃어요. 앱을 꺼 둬도 업비트 분봉 최저·최고가로 확인해요.',
    '<b>🇺🇸 미국주식</b> 24종목: 실시간(프리·애프터마켓 포함) 달러 가격이에요. 원화를 실시간 환율로 자동 환전해서 사요. 소수점 거래, 수수료 0.1%.',
    '위쪽에서 <b>코인 | 미국주식</b>을 바꾸고, 분류(보유만 포함)와 정렬은 드롭다운에서 골라요.']],
  bond: ['구채', '구청장 자리 경쟁 · 원화', [
    '서울 25개 구마다 구채가 <b>100장</b>뿐이에요. 그 구 구채를 <b>가장 많이 가진 사람이 구청장</b>이에요. 같으면 먼저 산 사람.',
    '1장 기본값은 땅값 순서로 <b>강남 1억 ~ 도봉 500만원</b>이에요. 팔린 장수가 늘수록 비싸져서 다 팔리면 2.5배가 되고, 시간에 따라 시세도 출렁여요.',
    '매시간 정각에 <b>이자</b>가 원화로 들어와요. 비싼 구일수록 이자율은 낮아요(강남 0.03% ~ 도봉 0.08%/시간).',
    '팔 때(환매)는 1% 수수료. 남이 사면 내 구채 값도 올라요. 구청장 혜택은 전투 업데이트 때 스탯 보너스로 붙어요.']],
  invest: ['가상주식', '게임용 가격 · 최대 50배', [
    '<b>📈 가상주식</b> 70종목: 24시간 쉬지 않고 움직이는 게임용 가격이에요. 가끔 ±8~30% 급등락이 와요.',
    '<b>🚀 레버리지</b> 2·5·10·25·50배와 공매도가 돼요. 진입가 대비 약 0.94÷배수만큼 반대로 가면 청산돼요. 수수료 0.3%.']],
  assets: ['프로필', '나와 내 자산', [
    '맨 위에 총자산·수익률·현금과 자산 구성(현금·코인·선물·미국주식·구채·가상주식)이 보여요.',
    '<b>가진 것</b>: 내가 가진 걸 전부 평가금액 순으로 모았어요. 누르면 바로 거래창이 열려요.',
    '사진을 누르면 바꿀 수 있어요. 닉네임·배경·로그아웃은 맨 아래에 있어요. 친구 프로필도 같은 모양이에요.']],
  shop: ['상점', '현금으로 사는 것들', [
    '<b>⭐ 레벨업</b>: 현금으로 올려요. 올릴 때마다 가격이 1.14배가 돼요.',
    '<b>🖼️ 순위 배경 변경권</b> · <b>✏️ 닉네임 변경권</b>도 팔아요.',
    '<b>🎰 게임</b>: 홀짝(1.95배)·룰렛(0~10배). 평균 0.975배라 오래 하면 조금씩 잃어요.']],
};
function renderHelp(b) {
  const [t, sub, items] = HELP[S.tab] || HELP.home;
  b.innerHTML = `<div class="shead"><div><h3>${t} 도움말</h3><small>${sub}</small></div></div>
  <ul class="rules">${items.map((x, i) => `<li><span>${i + 1}</span><span>${x}</span></li>`).join('')}</ul>
  <button class="cta soft" type="button" id="sheetX2">닫기</button>`;
}
function renderReveal(b, sh) {
  const { from, to } = sh; const n = to - from; const I = S.SE.index; const ic = I[to] / I[from] - 1;
  let h = `<div class="rv-head"><span class="k">${n > 1 ? `라운드 ${n}개 지나감` : `ROUND ${to} 종료`}</span><h3>${tickLabel(to)} 결과</h3></div>`;
  h += `<div class="info"><div>곰스피 지수<b class="num ${cls(ic)}">${I[to].toFixed(1)} ${pctTxt(ic)}</b></div><div>분위기<b>${moodOf(ic)[1]}</b></div></div>`;
  if (S.me) {
    const w0 = worth(S.me, from), w1 = worth(S.me, to), d = w1 - w0;
    const r0 = ranking(from), r1 = ranking(to); const i0 = r0.findIndex(p => p.id === S.uid), i1 = r1.findIndex(p => p.id === S.uid);
    h += `<div class="card rv-me"><div class="dim" style="font-size:13px;font-weight:700">내 자산 변화</div><div class="v num ${cls(d)}" id="rvCount">${signWon(0)}</div><div class="rv-rank">${i0 + 1}위 → ${i1 + 1}위 ${i1 < i0 ? `<span class="up">▲${i0 - i1}</span>` : i1 > i0 ? `<span class="down">▼${i1 - i0}</span>` : '<span class="dim">유지</span>'}</div></div>`;
    r1.slice(0, i1).filter(p => r0.findIndex(x => x.id === p.id) > i0).forEach(p => h += `<div class="overtake bad">😤 ${esc(p.name)}님이 나를 추월했어요</div>`);
    r1.slice(i1 + 1).filter(p => r0.findIndex(x => x.id === p.id) < i0).forEach(p => h += `<div class="overtake good">😎 ${esc(p.name)}님을 제쳤어요</div>`);
    sh.countTo = d;
  }
  const mine = S.me ? new Set([...Object.keys(S.me.hold || {}), ...Object.keys(S.me.shorts || {})]) : new Set();
  const moves = STOCKS.map(s => ({ s, c: chg(s.id, from, to) })).sort((a, b) => b.c - a.c);
  const pickList = [...moves.filter(x => mine.has(x.s.id)), ...moves.slice(0, 3), ...moves.slice(-3)].filter((x, i, a) => a.findIndex(y => y.s.id === x.s.id) === i);
  h += `<div class="sec"><div class="sec-h"><h2>${mine.size ? '내 종목 · 급등락' : '급등 · 급락'}</h2></div><div class="slist">`;
  pickList.forEach(({ s, c }, i) => {
    h += `<div class="rv-row" style="animation-delay:${.1 + i * .06}s">${badge(s)}<span class="sname"><b>${esc(s.n)}${mine.has(s.id) ? ' <small class="mine" style="display:inline">· 보유</small>' : ''}</b><small class="dim num">${px(s.id, from).toLocaleString()} → ${px(s.id, to).toLocaleString()}</small></span><span class="chg num ${cls(c)}">${pctTxt(c)}</span></div>`;
  });
  h += `</div></div><button class="cta" type="button" id="revealOk">확인</button>`;
  b.innerHTML = h;
  const el = $('#rvCount'); if (el && sh.countTo != null) { const target = sh.countTo, t0 = performance.now();
    const step = t => { const f = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - f, 3); el.textContent = signWon(target * e); if (f < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step); }
}
function maybeReveal() {
  return false; // 24시간 시장: 장 마감 결과 팝업 없음
  if (S.sheet || !S.me) return false;
  const key = 'seen:' + S.season.sid; const seen = LS.get(key, null);
  if (seen == null) { LS.set(key, S.tick); return false; }
  if (S.tick > seen) { LS.set(key, S.tick); openSheet('reveal', { from: seen, to: S.tick }); return true; }
  return false;
}
function maybeJoin() {
  if (S.me || S.readOnly || S.joinShown || S.sheet || S.mode === 'loading') return;
  if (S.mode === 'live' && !S.loaded) return;
  if (seasonOver()) return;
  S.joinShown = true; openSheet('join');
}

/* ───────── persistence ───────── */
let saveChain = Promise.resolve();
