'use strict';
/* ═════════ 공격 (PvP) ═════════
   💰 현물 수익분 약탈: 수익 중인 현물만. 비용 = 그 종목 평가이익의 25%, 성공 25%.
      성공 → 평가이익 전부(그만큼의 수량)를 뺏어 옴 + 비용 환급. 상대 원금은 그대로.
   🎯 선물 마진 사냥(하이리스크 하이리턴): 모든 롱·숏. 비용 = 남은 증거금의 15%, 성공 25% + 배수×0.2 (최대 45%).
      성공 → 남은 증거금 50%를 뺏어 옴 + 비용 환급. 그 바람에 청산가에 닿으면 ☠️ 참수: 나머지 증거금까지 전부.
   실패 → 비용 잃음, 절반은 상대에게 위자료.
   공격자 쿨타임 10분 · 같은 종목 30분에 1번 · 털린 종목은 3시간 보호막 · 공격당하면 10분 동안 그 사람에게 반값 복수.
   결과는 공격할 때 뽑은 무작위 번호(roll)로 정하고 기록에 남겨요. 남의 지갑은 못 고치니까, 당한 사람 앱이 기록을 보고 스스로 반영해요. */
const ATK = { LOOT_COST: .25, LOOT_P: .25, HUNT_COST: .15, HUNT_TAKE: .50, MY_CD: 10 * 60e3, POS_CD: 30 * 60e3, SHIELD: 3 * H, REVENGE: 10 * 60e3, MIN: 100_000 };
const atkEvents = () => [...(S.feed || []), ...(S.atkFeed || [])].filter(f => f && f.kind === 'k_atk');
// 지금 이 사람에게 반값 복수 가능? (그 사람이 10분 안에 나를 공격했으면)
const revengeOn = tid => atkEvents().some(f => f.uid === tid && f.target === S.uid && now() - f.ts < ATK.REVENGE);
const assetOf = sym => KC[sym] || UC[sym];
const pxKrw = sym => (KC[sym] ? kPx(sym) : uWon(sym));
// 상대(p)의 한 종목에 대한 공격 정보: 가능 여부·이유·비용·확률·성공 시 얻는 돈
function atkInfo(p, field, sym) {
  const isFut = field === 'kFut' || field === 'uFut', price = pxKrw(sym), a = assetOf(sym);
  if (!a || !price) return { ok: false, why: '시세 받는 중' };
  const evs = atkEvents().filter(f => f.target === p.id && f.sym === sym && f.f === field);
  const lastHit = evs.filter(f => f.ok).reduce((m, f) => Math.max(m, f.ts), 0), last = evs.reduce((m, f) => Math.max(m, f.ts), 0);
  // 보호막·쿨타임을 먼저 알려줘요 (털린 직후엔 '본전'이라도 보호막이 이유)
  if (lastHit && now() - lastHit < ATK.SHIELD) return { ok: false, why: `🛡️ 보호막 ${hms(ATK.SHIELD - (now() - lastHit)).slice(0, 5)}` };
  if (last && now() - last < ATK.POS_CD) return { ok: false, why: `${Math.ceil((ATK.POS_CD - (now() - last)) / 6e4)}분 뒤 가능` };
  let info;
  if (!isFut) {
    const q = (p[field] || {})[sym] || 0, cost0 = ((field === 'kHold' ? p.kCost : p.uCost) || {})[sym] || price, profit = q * (price - cost0);
    // 주식·달러는 1주(1달러) 단위로만 뺏어요 → 수익으로 살 수 있는 만큼만
    const whole = UC[sym] && UC[sym].m !== 'cm', dq = profit > 0 ? (whole ? Math.floor(profit / price) : profit / price) : 0, loot = dq * price;
    info = { type: 'loot', q, price, profit, prob: ATK.LOOT_P, cost: Math.round(loot * ATK.LOOT_COST), win: Math.round(loot), dq, a };
    if (!(profit > 0)) return { ...info, ok: false, why: '손해 중이라 못 털어요' };
    if (whole && dq < 1) return { ...info, ok: false, why: '수익이 1주 미만' };
    if (profit < ATK.MIN) return { ...info, ok: false, why: '수익이 너무 작아요' };
  } else {
    const o = (p[field] || {})[sym]; if (!o) return { ok: false, why: '포지션 없음' };
    const E = fVal(o, price), take = E * ATK.HUNT_TAKE, m2 = o.m - take, x2 = o.q * o.e / Math.max(1, m2);
    const exec = fDead({ ...o, m: m2, x: x2 }, price) || E - take <= 0;
    info = { type: 'hunt', o, E, price, prob: Math.min(.45, .25 + o.x * .002), cost: Math.round(E * ATK.HUNT_COST), win: Math.round(exec ? E : take), exec, m2, x2, a };
    if (E < ATK.MIN) return { ...info, ok: false, why: '증거금이 너무 작아요' };
  }
  info.rev = revengeOn(p.id); if (info.rev) info.cost = Math.round(info.cost / 2);
  return { ...info, ok: true };
}
const myAtkWait = () => Math.max(0, ((S.me && S.me.atkAt) || 0) + ATK.MY_CD - now());

/* ───────── 공격 실행 (공격자) ───────── */
async function doAttack(tid, field, sym) {
  const p = S.players[tid] ? { id: tid, ...S.players[tid] } : null; if (!p || !S.me || S.saving || S.readOnly) return;
  const I = atkInfo(p, field, sym); if (!I.ok) { toast(I.why); return; }
  if (myAtkWait()) { toast(`⏳ ${Math.ceil(myAtkWait() / 6e4)}분 뒤에 다시 공격할 수 있어요`); return; }
  if (S.me.cash < I.cost) { toast(`현금이 ${krw(I.cost - S.me.cash)} 부족해요`); return; }
  const roll = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296, ok = roll < I.prob;   // 공격할 때 뽑는 무작위 번호
  const before = S.me, me = clone(before); me.atkAt = now(); me.cash -= I.cost;
  const ev = { kind: 'k_atk', target: tid, sym, f: field, type: I.type, cost: I.cost, p: +I.prob.toFixed(4), roll: +roll.toFixed(6), ok, rev: !!I.rev };
  const B = ok ? Math.min(bountyOf(p), Math.max(0, Math.floor(p.cash || 0))) : 0;   // 👑 1등이면 현상금 (상대 현금에서)
  if (B) { me.cash += B; ev.bounty = B; }
  if (ok) {
    me.cash += I.cost;
    if (I.type === 'loot') {   // 뺏은 수량을 내 지갑에 (평단 = 지금 가격)
      const hf = field, cf = field === 'kHold' ? 'kCost' : 'uCost'; me[hf] ||= {}; me[cf] ||= {};
      const h0 = me[hf][sym] || 0; me[cf][sym] = ((me[cf][sym] || 0) * h0 + I.dq * I.price) / (h0 + I.dq); me[hf][sym] = h0 + I.dq;
      Object.assign(ev, { dq: I.dq, px: I.price, gain: I.win });
    } else { me.cash += I.win; Object.assign(ev, { oat: I.o.at, take: Math.round(I.E * ATK.HUNT_TAKE), exec: I.exec, gain: I.win }); }
  }
  me.cash = Math.round(me.cash);
  if (!(await kSave(me, before))) return;
  addFeed(ev); closeSheetRaw();
  if (S.mode === 'demo') atkApplyTo(S.players[tid], [{ ...ev, uid: S.uid, ts: now() }]);   // 연습봇은 바로 반영
  if (ok) bigWin(I.win + B, (B ? `👑 현상금 ${krw(B)} + ` : '') + (I.type === 'loot' ? '💰 약탈 성공!' : I.exec ? '☠️ 참수 성공!' : '🎯 사냥 성공!'));
  else { toast(`🛡️ 막혔어요… ${krw(I.cost)} 잃음 (절반은 ${p.name}님 위자료)`); document.body.classList.remove('shake'); void document.body.offsetWidth; document.body.classList.add('shake'); buzz(120); }
  renderAll();
}

/* ───────── 당한 사람: 기록을 보고 내 지갑에 반영 ───────── */
function atkApplyTo(t, evs) {   // t = 지갑 객체(직접 고침)
  evs.forEach(e => {
    if (!e.ok) { t.cash = Math.round((t.cash || 0) + Math.floor(e.cost / 2)); return; }   // 막아냄 → 위자료
    if (e.bounty) t.cash = Math.round(Math.max(0, (t.cash || 0) - e.bounty));          // 1등 현상금 지급
    if (e.type === 'loot') {
      const hf = e.f, cf = hf === 'kHold' ? 'kCost' : 'uCost', q = (t[hf] || {})[e.sym] || 0; if (!q) return;
      const left = Math.max(0, q - e.dq); t[cf] ||= {};
      // 수익분만 빠지니까 원금(산 돈 합계)은 그대로 → 남은 수량에 원금을 나눠 평단을 다시 잡아요
      const principal = (t[cf][e.sym] || e.px) * q;
      if (left * e.px < 1) { delete t[hf][e.sym]; delete t[cf][e.sym]; } else { t[cf][e.sym] = Math.min(e.px, principal / left); t[hf][e.sym] = left; }
    } else {
      const o = (t[e.f] || {})[e.sym]; if (!o || o.at !== e.oat) return;
      if (e.exec) { delete t[e.f][e.sym]; return; }
      o.m = Math.max(1, o.m - e.take); o.x = +(o.q * o.e / o.m).toFixed(2);
    }
  });
}
let atkBusy = false;
async function atkSync() {
  if (!S.me || S.readOnly || S.saving || atkBusy || S.mode !== 'live') return;
  const seen = S.me.atkSeen ?? (S.me.joined || 0);
  const evs = (S.atkFeed || []).filter(f => f.kind === 'k_atk' && f.target === S.uid && f.ts > seen).sort((a, b) => a.ts - b.ts);
  if (!evs.length) return;
  atkBusy = true;
  const before = S.me, me = clone(before); atkApplyTo(me, evs); me.atkSeen = evs[evs.length - 1].ts;
  const ok = await kSave(me, before); atkBusy = false;
  if (!ok) return;
  evs.forEach(e => { const who = nameOf(e.uid), a = assetOf(e.sym);
    if (!e.ok) toast(`🛡️ ${who}님의 공격을 막았어요! 위자료 +${krw(Math.floor(e.cost / 2))}`);
    else toast((e.bounty ? `👑 현상금 ${krw(e.bounty)}까지 뺏겼어요! ` : '') + (e.type === 'loot' ? `💰 ${who}님이 내 ${a ? a.n : ''} 수익 ${krw(e.gain)}을(를) 약탈했어요! 10분 안에 반값 복수 가능` : e.exec ? `☠️ ${who}님에게 ${a ? a.n : ''} 참수당했어요! 10분 안에 반값 복수 가능` : `🎯 ${who}님이 내 ${a ? a.n : ''} 증거금 ${krw(e.take)}을(를) 사냥했어요!`)); });
  if (evs.some(e => e.ok)) { document.body.classList.remove('shake'); void document.body.offsetWidth; document.body.classList.add('shake'); buzz([100, 60, 100]); }
  renderAll();
}

/* ───────── 공격 창 (가운데 팝업) ───────── */
function renderAtkSheet(b, sh) {
  const p = S.players[sh.tid] ? { id: sh.tid, ...S.players[sh.tid] } : null; if (!p) { b.innerHTML = ''; return; }
  const I = atkInfo(p, sh.f, sh.sym), a = assetOf(sh.sym), isFut = sh.f === 'kFut' || sh.f === 'uFut', wait = myAtkWait();
  const can = I.ok && !wait && S.me && S.me.cash >= I.cost && !S.saving;
  const pct = Math.round((I.prob || 0) * 100);
  b.innerHTML = `<div class="atk-h"><span class="atk-k ${isFut ? 'hunt' : 'loot'}">${isFut ? '🎯 마진 사냥' : '💰 수익 약탈'}</span>${I.rev ? '<span class="atk-rev">🔥 복수 반값</span>' : ''}</div>
    <div class="atk-vs">${ava(p, true)}<div><b>${esc(p.name)}</b><small>${esc(a ? a.n : '')}${isFut && I.o ? ` · ${I.o.x}배 ${fSide(I.o)}` : ''}</small></div></div>
    ${bountyOf(p) ? `<div class="atk-bounty">👑 1등 현상금 · 성공하면 <b class="num">+${krw(Math.min(bountyOf(p), Math.max(0, p.cash || 0)))}</b> 더</div>` : ''}
    <div class="atk-p"><div class="atk-pt"><span>성공 확률</span><b class="num">${pct}%</b></div><div class="atk-bar"><i style="width:${pct}%"></i></div></div>
    <div class="atk-io">
      <div class="win"><small>성공하면</small><b class="num">+${krw(I.win || 0)}</b><span>${isFut ? (I.exec ? '☠️ 참수! 증거금 전부' : '증거금 50% 뺏기 + 비용 환급') : '수익 전부 뺏기 + 비용 환급'}</span></div>
      <div class="lose"><small>실패하면</small><b class="num">-${krw(I.cost || 0)}</b><span>절반은 상대 위자료</span></div>
    </div>
    ${!I.ok ? `<p class="atk-why">${esc(I.why)}</p>` : wait ? `<p class="atk-why">⏳ ${Math.ceil(wait / 6e4)}분 뒤에 다시 공격할 수 있어요</p>` : S.me && S.me.cash < I.cost ? '<p class="atk-why">현금이 부족해요</p>' : ''}
    <details class="atk-help"${sh.help ? ' open' : ''}><summary>❓ ${isFut ? '마진 사냥' : '수익 약탈'}이 뭐예요?</summary>${isFut
      ? `<p>상대가 <b>롱·숏</b>으로 걸어 둔 돈(증거금)을 노려요.</p><ul><li>성공하면 상대 증거금의 <b>절반(50%)</b>을 가져와요. 낸 돈도 돌려받아요.</li><li>그걸로 상대가 청산 직전까지 몰리면 <b>☠️ 참수</b> — 증거금을 <b>전부</b> 가져와요.</li><li>배수가 높은 사람일수록 <b>성공 확률이 조금 높아요</b> (10배 27% · 50배 35% · 최대 45%).</li><li>실패하면 낸 돈(증거금의 15%)을 잃고, 절반은 상대가 가져가요.</li></ul>`
      : `<p>상대가 <b>수익 보고 있는</b> 코인·주식을 노려요. 손해 중인 건 못 털어요.</p><ul><li>성공(25%)하면 그 종목의 <b>번 돈만큼</b>을 내 것으로 가져와요. 낸 돈도 돌려받아요.</li><li>상대가 처음 넣은 원금은 안 건드려요.</li><li>실패하면 낸 돈(수익의 25%)을 잃고, 절반은 상대가 가져가요.</li></ul>`}
      <p class="atk-rule">공격은 10분에 1번 · 털린 종목은 3시간 보호막 · 당하면 10분 동안 반값 복수</p></details>
    <button class="cta atk-go" id="atkGo" type="button" ${can ? '' : 'disabled'}>💥 공격하기 · ${krw(I.cost || 0)}</button>`;
}
KSHEETS.atk = renderAtkSheet;
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('button'); if (!t) return;
  if (t.dataset.atk) { e.stopPropagation(); const [tid, f, sym] = t.dataset.atk.split('|'); if (!S.me) { openSheet('join'); return; } if (S.sheet) closeSheetRaw(); openSheet('atk', { tid, f, sym }); $('#sheetWrap').classList.add('center'); return; }
  if (t.id === 'atkGo' && S.sheet && S.sheet.type === 'atk') doAttack(S.sheet.tid, S.sheet.f, S.sheet.sym);
  if (t.id === 'atkHelp') openSheet('help');
}, true);

/* ───────── 접속 중(LIVE): 2분마다 내 지갑에 '마지막 접속 시각'을 남겨요 (화면 보고 있을 때만) ───────── */
const isOn = p => p && (p.id === S.uid || now() - (p.seen || 0) < 150e3);
function seenAgo(p) { if (isOn(p)) return '접속 중'; if (!p.seen) return ''; const m = Math.floor((now() - p.seen) / 6e4); return m < 60 ? `${m}분 전` : m < 1440 ? `${Math.floor(m / 60)}시간 전` : `${Math.floor(m / 1440)}일 전`; }
async function heartbeat() {
  if (S.mode === 'demo') { ['bot0', 'bot2'].forEach(id => { if (S.players[id]) S.players[id].seen = now(); }); return; }   // 연습봇 둘은 접속 중으로
  if (!S.me || S.readOnly || S.saving || S.mode !== 'live' || document.visibilityState !== 'visible') return;
  if (now() - (S.me.seen || 0) < 120e3) return;
  const before = S.me, me = clone(before); me.seen = now(); await kSave(me, before);
}
const liveCount = () => activePlayers().filter(isOn).length;

document.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('atk-help') && S.sheet && S.sheet.type === 'atk') S.sheet.help = e.target.open; }, true);

/* ═════════ 👑 1등 현상금 ═════════
   1등(2명 이상일 때)에게 현상금이 붙어요: 총자산의 1% + 1등을 지킨 시간 1시간마다 +0.5% (최대 5%).
   1등을 공격해서 성공하면 원래 이득에 현상금까지(1등의 현금에서) 받아요. 1등이 된 시각(top1At)은 1등 본인 앱이 적어요. */
const BOUNTY = { BASE: .01, PER_H: .005, MAX: .05 };
function bountyOf(p) {
  const R = ranking(); if (R.length < 2 || !p || R[0].id !== p.id) return 0;
  const pp = S.players[p.id] || p, hrs = pp.top1At ? Math.max(0, (now() - pp.top1At) / H) : 0;
  return Math.round(R[0].w * Math.min(BOUNTY.MAX, BOUNTY.BASE + BOUNTY.PER_H * Math.floor(hrs)));
}
let TOP1_T = 0;
async function top1Track() {
  if (!S.me || S.readOnly || S.saving || S.mode !== 'live' || Date.now() - TOP1_T < 10e3) return; TOP1_T = Date.now();
  const R = ranking(), am1 = R.length > 1 && R[0].id === S.uid;
  if (am1 === !!S.me.top1At) return;
  const before = S.me, me = clone(before); if (am1) me.top1At = now(); else delete me.top1At; await kSave(me, before);
}

/* ═════════ ⚔️ 1등 결투권 ═════════
   4등 아래는 하루 1번 1~3등에게 결투를 걸 수 있어요. 5분 동안 총자산 수익률 승부 (상대가 꺼져 있어도 시세로 계산돼요).
   이기면 상대 총자산의 3%(상대 현금 한도)를 가져오고, 지면 내 총자산의 3%(내 현금 한도)를 상대에게 줘요. 거절은 없어요.
   결투는 건 사람 지갑(duel)에 적고, 끝나면 건 사람 앱이 결과를 기록(k_duel) → 상대 앱이 보고 스스로 반영해요. */
const DUEL = { MS: 5 * 60e3, STAKE: .03 };
const rankOf = id => ranking().findIndex(x => x.id === id) + 1;
function duelWhy(tid) {
  const me = S.me; if (!me) return '참가하면 할 수 있어요'; const mr = rankOf(S.uid), tr = rankOf(tid);
  if (!(tr >= 1 && tr <= 3)) return ''; if (mr && mr <= 3) return '1~3등끼리는 결투 못 해요';
  if (me.duel && now() < me.duel.end + 60e3) return '이미 결투 중이에요'; if (me.duelDay === kstDay(now())) return '오늘 결투권을 이미 썼어요';
  if (Object.values(S.players).some(p => p && p.duel && p.duel.t === tid && now() < p.duel.end)) return '그 사람은 지금 다른 결투 중이에요';
  return 'ok';
}
async function duelStart(tid) {
  if (duelWhy(tid) !== 'ok' || S.saving || S.readOnly) return; const t = S.players[tid]; if (!t) return;
  if (!S.dArm || S.dArm !== tid || Date.now() - (S.dArmT || 0) > 4000) { S.dArm = tid; S.dArmT = Date.now(); toast('⚔️ 한 번 더 누르면 결투 시작! (5분 수익률 승부, 판돈 총자산 3%)'); return; }
  S.dArm = null;
  const before = S.me, me = clone(before); me.duel = { t: tid, at: now(), end: now() + DUEL.MS, a0: worth(me), b0: worth({ id: tid, ...t }) }; me.duelDay = kstDay(now());
  if (!(await kSave(me, before))) return;
  addFeed({ kind: 'k_duel0', target: tid }); toast(`⚔️ ${t.name}님에게 결투 신청! 5분 동안 수익률로 승부해요`); buzz([50, 30, 50]); renderAll(); if (S.profile) renderFriendProfile();
}
async function duelTick() {
  const d = S.me && S.me.duel; if (!d || now() < d.end || S.saving || S.readOnly) return;
  const t = S.players[d.t]; const before = S.me, me = clone(before); delete me.duel;
  if (!t) { await kSave(me, before); return; }
  const ra = worth(before) / d.a0 - 1, rb = worth({ id: d.t, ...t }) / d.b0 - 1, win = ra > rb;
  const amt = win ? Math.min(Math.round(worth({ id: d.t, ...t }) * DUEL.STAKE), Math.max(0, Math.floor(t.cash || 0))) : Math.min(Math.round(worth(before) * DUEL.STAKE), Math.max(0, Math.floor(me.cash || 0)));
  me.cash = Math.round(me.cash + (win ? amt : -amt));
  if (!(await kSave(me, before))) return;
  const ev = { kind: 'k_duel', target: d.t, win, amt, ra: +ra.toFixed(4), rb: +rb.toFixed(4) }; addFeed(ev);
  if (S.mode === 'demo' && S.players[d.t]) S.players[d.t].cash = Math.round((S.players[d.t].cash || 0) + (win ? -amt : amt));
  if (win) bigWin(amt, `⚔️ 결투 승리! ${pctTxt(ra)} vs ${pctTxt(rb)}`); else cLose(`⚔️ 결투 패배… ${pctTxt(ra)} vs ${pctTxt(rb)} · -${krw(amt)}`);
  renderAll();
}
// 결투를 당한 사람: 결과 기록을 보고 내 지갑에 반영
let duelBusy = false;
async function duelSync() {
  if (!S.me || S.readOnly || S.saving || duelBusy || S.mode !== 'live') return;
  const seen = S.me.duelSeen ?? (S.me.joined || 0);
  const evs = (S.atkFeed || []).filter(f => (f.kind === 'k_duel' || f.kind === 'k_duel0') && f.target === S.uid && f.ts > seen).sort((a, b) => a.ts - b.ts);
  if (!evs.length) return;
  duelBusy = true; const before = S.me, me = clone(before);
  evs.forEach(e => { if (e.kind === 'k_duel') me.cash = Math.round(Math.max(0, (me.cash || 0) + (e.win ? -e.amt : e.amt))); });
  me.duelSeen = evs[evs.length - 1].ts; const ok = await kSave(me, before); duelBusy = false; if (!ok) return;
  evs.forEach(e => { const who = nameOf(e.uid);
    if (e.kind === 'k_duel0') toast(`⚔️ ${who}님이 결투를 걸었어요! 5분 동안 수익률 승부`);
    else if (e.win) cLose(`⚔️ ${who}님과의 결투에서 졌어요… -${krw(e.amt)}`); else bigWin(e.amt, `⚔️ ${who}님 결투 방어 성공!`); });
  renderAll();
}
// 결투 중이면 화면 아래 막대 (건 사람·당한 사람 모두)
function renderDuelBar() {
  let el = $('#duelbar'); if (!el) { el = document.createElement('div'); el.id = 'duelbar'; el.className = 'taxbar duelbar'; document.body.appendChild(el); }
  let d = null, mine = true, other = null;
  if (S.me && S.me.duel && now() < S.me.duel.end) { d = S.me.duel; other = S.players[d.t]; }
  else { const e = Object.entries(S.players).find(([, p]) => p && p.duel && p.duel.t === S.uid && now() < p.duel.end); if (e) { d = e[1].duel; other = { id: e[0], ...e[1] }; mine = false; } }
  const show = !!d && !!other && !S.sheet && !S.profile && !S.board; el.hidden = !show; document.body.classList.toggle('has-taxbar', show); if (!show) return;
  const meW = worth(S.me), oW = worth(mine ? { id: d.t, ...other } : other), rMe = meW / (mine ? d.a0 : d.b0) - 1, rO = oW / (mine ? d.b0 : d.a0) - 1;
  el.innerHTML = `<span class="tb-ic">⚔️</span><span class="tb-t"><b>결투 중 vs ${esc(other.name)} · ${mmss(d.end - now())}</b><small>나 <span class="${cls(rMe)}">${pctTxt(rMe)}</span> · 상대 <span class="${cls(rO)}">${pctTxt(rO)}</span> · ${rMe > rO ? '이기는 중 🔥' : '지는 중 😰'}</small></span>`;
}
document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-duel]'); if (t) duelStart(t.dataset.duel); });

/* ═════════ 🎯 왕좌 저격 (모금형) — 1·2·3등을 여럿이 돈을 모아 쏴요 ═════════
   목표 금액 = 그 사람 총자산의 15%. 나보다 높은 1~3등에게만 낼 수 있어요(1억 단위).
   모금이 목표에 닿는 순간, 마지막으로 낸 사람 앱이 바로 발사해요(뽑은 번호 roll 기록).
     성공 확률: 1등 30% · 2등 35% · 3등 40%.
     성공 → 낸 사람 모두 낸 돈 + 이익(1등 2배 · 2등 1.7배 · 3등 1.5배)을 낸 비율대로. 상대는 그 이익만큼 잃어요(총자산 40% 한도, 현금이 모자라면 빚).
     실패 → 모은 돈은 전부 사라지고, 그 절반은 상대가 '방어 보상'으로 받아요.
   털린 사람은 30분 동안 보호막. 2시간 안에 목표를 못 채우면 각자 낸 돈을 돌려받아요.
   낸 돈은 각자 지갑(sf)에, 발사 기록은 소식(k_sfire)과 쏜 사람 지갑(sfFire)에 남겨요 → 낸 사람·당한 사람 앱이 보고 스스로 반영해요. */
const SNIPE = { GOAL: .15, P: [.30, .35, .40], PROF: [2, 1.7, 1.5], CAP: .40, SHIELD: 30 * 60e3, EXPIRE: 2 * H, UNIT: 1e8 };
function sfFires(tid) {   // 그 사람에 대한 발사 기록들 (소식 + 쏜 사람 지갑)
  const out = (S.feed || []).filter(f => f && f.kind === 'k_sfire' && f.target === tid);
  Object.entries(S.players).forEach(([id, p]) => { const x = p && p.sfFire; if (x && x.t === tid && !out.some(f => Math.abs(f.ts - x.ts) < 2000)) out.push({ ...x, kind: 'k_sfire', uid: id, target: tid }); });
  return out.sort((a, b) => b.ts - a.ts);
}
const sfLast = tid => (sfFires(tid)[0] || {}).ts || 0;
function sfPool(tid) {
  const last = sfLast(tid), list = [];
  Object.entries(S.players).forEach(([id, p]) => { const c = p && p.sf && p.sf[tid]; if (c && c.amt > 0 && c.at > last && now() - c.at < SNIPE.EXPIRE) list.push({ id, amt: c.amt, at: c.at }); });
  return { sum: list.reduce((a, x) => a + x.amt, 0), list: list.sort((a, b) => b.amt - a.amt) };
}
function snipeInfo(tid) {
  const R = ranking(), tr = R.findIndex(x => x.id === tid) + 1, mr = R.findIndex(x => x.id === S.uid) + 1, t = R[tr - 1];
  if (!S.me) return { ok: false, why: '참가하면 할 수 있어요' };
  if (!(tr >= 1 && tr <= 3) || R.length < 2) return { ok: false, why: '1~3등만 노릴 수 있어요' };
  const goal = Math.max(SNIPE.UNIT, Math.round(t.w * SNIPE.GOAL / SNIPE.UNIT) * SNIPE.UNIT), P = sfPool(tid), left = Math.max(0, goal - P.sum);
  const I = { ok: true, tr, t, goal, pool: P.sum, list: P.list, left, prob: SNIPE.P[tr - 1], prof: SNIPE.PROF[tr - 1] };
  const shielded = sfFires(tid).some(f => f.ok && now() - f.ts < SNIPE.SHIELD);
  if (tid === S.uid) return { ...I, ok: false, why: '나예요 · 지금 표적!' };
  if (mr && mr <= tr) return { ...I, ok: false, why: '나보다 높은 순위만 노릴 수 있어요' };
  if (shielded) return { ...I, ok: false, why: '방금 털려서 30분 보호막 중' };
  if (S.me.cash < Math.min(SNIPE.UNIT, left)) return { ...I, ok: false, why: '현금이 부족해요 (최소 1억)' };
  return I;
}
async function sfGive(tid, amt) {
  const I = snipeInfo(tid); if (!I.ok) { toast(I.why); return; } if (S.saving || S.readOnly) return;
  amt = Math.min(Math.floor(amt), I.left, Math.floor(S.me.cash)); if (!(amt > 0)) return;
  const before = S.me, me = clone(before); me.sf ||= {}; const c = me.sf[tid], fresh = c && c.at > sfLast(tid) && now() - c.at < SNIPE.EXPIRE;
  me.sf[tid] = { amt: (fresh ? c.amt : 0) + amt, at: fresh ? c.at : now() }; me.cash = Math.round(me.cash - amt);
  if (fresh === false && c) me.cash = Math.round(me.cash);   // (지난 판 기록은 정산 루프가 처리)
  const full = I.pool + amt >= I.goal;
  let ev = null;
  if (full) {   // 목표 달성 → 내가 바로 발사
    const roll = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296, ok = roll < I.prob, pool = I.pool + amt;
    const X = ok ? Math.min(Math.round(pool * I.prof), Math.round(I.t.w * SNIPE.CAP)) : 0;
    ev = { kind: 'k_sfire', target: tid, rank: I.tr, pool, goal: I.goal, ok, roll: +roll.toFixed(6), p: I.prob, X, n: I.list.filter(x => x.id !== S.uid).length + 1 };
    me.sfFire = { t: tid, ts: now(), ok, X, pool, rank: I.tr, roll: ev.roll, p: I.prob };
  }
  if (!(await kSave(me, before))) return;
  if (ev) { addFeed(ev); if (S.mode === 'demo' && S.players[tid]) { const t = S.players[tid]; t.cash = Math.round((t.cash || 0) + (ev.ok ? -ev.X : Math.floor(ev.pool / 2))); } }
  else { addFeed({ kind: 'k_sfund', target: tid, amt, pool: I.pool + amt, goal: I.goal }); toast(`🎯 ${I.t.name}님 저격 모금에 ${krw(amt)} 보탰어요 · ${Math.round((I.pool + amt) / I.goal * 100)}%`); }
  renderAll(); if (S.sheet && S.sheet.type === 'snipe') renderSheet();
}
// 내 모금 정산 (발사되면 내 몫 받기 · 2시간 지나면 돌려받기) + 당한 사람 반영
let sfBusy = false;
async function snipeSync() {
  if (!S.me || S.readOnly || S.saving || sfBusy) return;
  const me0 = S.me, mine = Object.entries(me0.sf || {}); let changed = false; const me = clone(me0), msgs = [];
  mine.forEach(([tid, c]) => {
    const fire = sfFires(tid).filter(f => f.ts >= c.at).sort((a, b) => a.ts - b.ts)[0];
    if (fire) { if (fire.ok) { const get = c.amt + Math.round(fire.X * c.amt / fire.pool); me.cash = Math.round(me.cash + get); msgs.push(['win', get - c.amt, `🎯 ${nameOf(tid)}님 저격 성공! 내 몫`]); } else msgs.push(['lose', c.amt, `🛡️ ${nameOf(tid)}님 저격 실패… 모은 돈이 날아갔어요 -${krw(c.amt)}`]);
      delete me.sf[tid]; changed = true; }
    else if (now() - c.at > SNIPE.EXPIRE) { me.cash = Math.round(me.cash + c.amt); delete me.sf[tid]; changed = true; msgs.push(['info', c.amt, `⌛ ${nameOf(tid)}님 저격 모금이 2시간 안에 안 차서 ${krw(c.amt)} 돌려받았어요`]); }
  });
  // 당한 사람: 나를 향한 발사 기록 반영
  const seen = me0.sfSeen ?? (me0.joined || 0), hits = sfFires(S.uid).filter(f => f.ts > seen).sort((a, b) => a.ts - b.ts);
  hits.forEach(f => { me.cash = Math.round(me.cash + (f.ok ? -f.X : Math.floor(f.pool / 2))); msgs.push(f.ok ? ['lose', f.X, `🎯 ${f.n || '여러'}명이 모은 저격에 맞았어요! -${krw(f.X)} (30분 보호막)`] : ['win', Math.floor(f.pool / 2), `🛡️ 저격 모금 ${krw(f.pool)}을 막아냈어요! 방어 보상`]); });
  if (hits.length) { me.sfSeen = hits[hits.length - 1].ts; changed = true; }
  if (!changed) return;
  sfBusy = true; const ok = await kSave(me, me0); sfBusy = false; if (!ok) return;
  msgs.forEach(([k, v, t]) => { if (k === 'win') bigWin(v, t); else if (k === 'lose') cLose(t); else toast(t); });
  renderAll();
}
function renderSnipeSheet(b, sh) {
  const I = snipeInfo(sh.tid), t = S.players[sh.tid]; if (!t || !I.tr) { b.innerHTML = '<p class="atk-why">1~3등만 노릴 수 있어요</p>'; return; }
  const pct = Math.round(I.prob * 100), fill = Math.min(100, I.pool / I.goal * 100), myC = ((S.me || {}).sf || {})[sh.tid];
  const steps = [1e8, 5e8, 10e8].filter(v => v < I.left);
  b.innerHTML = `<div class="atk-h"><span class="atk-k snipe">🎯 왕좌 저격 모금 · ${I.tr}등</span></div>
    <div class="atk-vs">${ava({ id: sh.tid, ...t }, true)}<div><b>${esc(t.name)}</b><small>총자산 ${krw(I.t.w)}</small></div></div>
    <div class="sf-goal"><div class="sf-gt"><span>모금 <b class="num">${krw(I.pool)}</b> / ${krw(I.goal)}</span><b class="num">${Math.round(fill)}%</b></div><div class="sf-bar"><i style="width:${fill}%"></i></div>
      <small>${I.list.length ? I.list.slice(0, 6).map(x => `${esc(x.id === S.uid ? '나' : nameOf(x.id))} ${krwUnits(x.amt)}`).join(' · ') : '아직 아무도 안 냈어요. 첫 번째가 되어 보세요'}</small></div>
    <div class="atk-io"><div class="win"><small>성공 ${pct}%</small><b class="num">×${(1 + I.prof).toFixed(1)}</b><span>낸 돈 + ${I.prof}배 이익 (낸 비율대로)</span></div>
      <div class="lose"><small>실패 ${100 - pct}%</small><b class="num">전부 잃음</b><span>절반은 상대 방어 보상</span></div></div>
    ${myC && myC.at > sfLast(sh.tid) ? `<p class="sf-mine">내가 낸 돈 <b class="num">${krw(myC.amt)}</b> · 2시간 안에 안 차면 돌려받아요</p>` : ''}
    ${I.ok ? '' : `<p class="atk-why">${esc(I.why)}</p>`}
    <div class="sf-btns">${steps.map(v => `<button type="button" data-sfgive="${v}" ${I.ok && S.me.cash >= v ? '' : 'disabled'}>+${krwUnits(v)}</button>`).join('')}
      <button type="button" class="sf-fire" data-sfgive="${I.left}" ${I.ok && S.me.cash >= I.left ? '' : 'disabled'}>🎯 남은 ${krwUnits(I.left)} 채우고 발사</button></div>
    <p class="atk-rule">목표 = 상대 총자산 15% · 다 차는 순간 발사 · 털린 사람 30분 보호막 · 2시간 안 차면 환불</p>`;
}
KSHEETS.snipe = renderSnipeSheet;
// 홈: 1·2·3등 저격판 (접었다 펼 수 있어요)
function throneHTML() {
  const R = ranking(); if (R.length < 2 || !S.me) return '';
  const top = R.slice(0, 3), mr = R.findIndex(x => x.id === S.uid) + 1, imTop = mr >= 1 && mr <= 3, open = S.thOpen ?? LS.get('thOpen', true);
  const pools = top.map(p => sfPool(p.id).sum), live = pools.some(v => v > 0);
  return `<div class="card throne${open ? '' : ' closed'}"><button type="button" class="th-h" id="thToggle"><span><b>🎯 왕좌 저격</b><small>${imTop ? `나는 ${mr}등 · 지금 표적이에요!` : live ? '모금 진행 중! 같이 모아서 쏴요' : '여럿이 돈을 모아 1·2·3등을 쏴요'}</small></span><i class="th-arrow">${open ? '▲' : '▼'}</i></button>
    ${open ? top.map((p, i) => { const I = snipeInfo(p.id), B = i === 0 ? bountyOf(p) : 0, dw = duelWhy(p.id), me = p.id === S.uid, fill = I.goal ? Math.min(100, I.pool / I.goal * 100) : 0;
      return `<div class="th-row r${i + 1}${me ? ' me' : ''}"><span class="th-rk">${['🥇', '🥈', '🥉'][i]}</span><button type="button" class="th-who" data-player="${esc(p.id)}">${ava(p)}<span><b>${esc(me ? '나' : p.name)}</b><small class="num">${(p.w / 1e8).toFixed(1)}억${B ? ` · <span class="bounty">💰현상금</span>` : ''}</small><span class="th-pool"><i style="width:${fill}%"></i></span><small class="num th-pt">모금 ${krwUnits(I.pool || 0)} / ${krwUnits(I.goal || 0)}${I.list && I.list.length ? ` · ${I.list.length}명` : ''}</small></span></button>
        ${me ? '<span class="th-me">표적</span>' : `<span class="th-act"><button type="button" class="th-snipe" data-snipe="${esc(p.id)}" ${I.ok ? '' : 'disabled'}>🎯 ${Math.round(SNIPE.P[i] * 100)}%<small>×${(1 + SNIPE.PROF[i]).toFixed(1)}</small></button>${dw === 'ok' ? `<button type="button" class="th-duel" data-duel="${esc(p.id)}">⚔️</button>` : ''}</span>`}</div>`; }).join('')
      + `<p class="th-note">목표는 상대 총자산 15% · 다 차면 발사 · 실패하면 모은 돈 전부 잃어요${!imTop ? (S.me.duelDay === kstDay(now()) ? ' · 오늘 결투권 사용함' : ' · ⚔️ 결투권 1장') : ''}</p>` : ''}</div>`;
}
document.addEventListener('click', e => {
  const tg = e.target.closest && e.target.closest('#thToggle'); if (tg) { S.thOpen = !(S.thOpen ?? LS.get('thOpen', true)); LS.set('thOpen', S.thOpen); renderHome(); return; }
  const t = e.target.closest && e.target.closest('[data-snipe]');
  if (t) { e.stopPropagation(); if (!S.me) { openSheet('join'); return; } if (S.sheet) closeSheetRaw(); openSheet('snipe', { tid: t.dataset.snipe }); $('#sheetWrap').classList.add('center'); return; }
  const g = e.target.closest && e.target.closest('[data-sfgive]'); if (g && S.sheet && S.sheet.type === 'snipe') sfGive(S.sheet.tid, +g.dataset.sfgive);
}, true);
