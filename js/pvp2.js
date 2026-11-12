'use strict';
/* ═════════ ⛓️ 사채업자 & 금융 노예 · 📰 익명 찌라시 (2026-11-12) ═════════
   남의 지갑은 못 고치니까 전부 소식(sb2_feed) 기록으로 주고받고, 받는 사람 앱이 스스로 반영해요.

   ⛓️ 사채: 실질 총자산 10억 밑인 사람에게 5·10·20억을 강제로 꽂아줄 수 있어요(거절 불가, 주인 1명만).
      빚 = 빌려준 돈 × 1.3. 받은 사람은 [○○님의 노예 ⛓️] 배지.
      노예가 수익을 실현할 때마다(매도·롱숏 종료·큰 게임 승리) 수익의 20%를 주인에게 자동 상납 → 빚에서 빠져요.
      빚을 다 갚으면 해방. 노예가 주인을 공격(약탈·사냥)하거나 결투로 이기면 즉시 반란 성공, 빚 전액 탕감.
   📰 찌라시: 3억 내고 종목·방향(호재/악재)을 골라 익명 속보를 띄워요. 하루 2번.
      70% 선동 성공 → 20초 만에 그 방향으로 6~12%, 2분 버티고 10분에 걸쳐 원래대로 (gm.js rumorOne)
      30% 들통 → 30초 뒤 뿌린 사람 이름 공개 + 정반대로 15% 급반전 */
const LOAN = { MAX_W: 1e9, AMTS: [5e8, 1e9, 2e9], RATE: 1.3, TRIB: .2 };
const RUMOR = { COST: 3e8, PER_DAY: 2, P: .7 };
const slaveOf = p => (p && p.master && p.master.debt > 0 ? p.master : null);
const slaveTag = p => { const m = slaveOf(p); return m ? `<span class="slave">⛓️ ${esc(nameOf(m.id))}님의 노예</span>` : ''; };
const slavesOf = uid => Object.entries(S.players).filter(([, p]) => { const m = slaveOf(p); return m && m.id === uid; }).map(([id]) => id);

/* ───────── 사채 꽂기 (빌려주는 사람) ───────── */
function loanWhy(tid) {
  const t = S.players[tid]; if (!S.me || !t || tid === S.uid) return '';
  if (slaveOf(t)) return t.master.id === S.uid ? '이미 내 노예예요' : '이미 다른 주인이 있어요';
  if (realWorth({ id: tid, ...t }) >= LOAN.MAX_W) return '';
  if (slaveOf(S.me) && S.me.master.id === tid) return '내 주인한테는 못 빌려줘요';
  return 'ok';
}
async function loanGive(tid, amt) {
  if (loanWhy(tid) !== 'ok' || S.saving || S.readOnly) return; if (S.me.cash < amt) { toast('현금이 부족해요'); return; }
  const k = tid + amt; if (S.lArm !== k || Date.now() - (S.lArmT || 0) > 4000) { S.lArm = k; S.lArmT = Date.now(); toast(`⛓️ 한 번 더 누르면 ${krw(amt)} 사채를 꽂아요 (빚 ${krw(amt * LOAN.RATE)})`); return; }
  S.lArm = null; const before = S.me, me = clone(before); me.cash = Math.round(me.cash - amt);
  if (!(await kSave(me, before))) return;
  addFeed({ kind: 'k_loan', target: tid, amt, debt: Math.round(amt * LOAN.RATE) });
  if (S.mode === 'demo' && S.players[tid]) { const t = S.players[tid]; t.cash += amt; t.master = { id: S.uid, debt: Math.round(amt * LOAN.RATE), amt, at: now() }; }
  toast(`⛓️ ${nameOf(tid)}님에게 사채 ${krw(amt)}을 꽂았어요. 이제 수익의 20%가 상납돼요`); renderAll(); if (S.profile) renderFriendProfile();
}
/* ───────── 노예: 빚 갚기 · 상납 · 반란 ───────── */
async function loanRepay() {
  const m = slaveOf(S.me); if (!m || S.saving || S.readOnly) return; const pay = Math.min(Math.floor(S.me.cash), m.debt); if (!(pay > 0)) { toast('현금이 없어요'); return; }
  const before = S.me, me = clone(before); me.cash = Math.round(me.cash - pay); me.master.debt = Math.round(m.debt - pay); const free = me.master.debt <= 0; if (free) delete me.master;
  if (!(await kSave(me, before))) return;
  addFeed({ kind: 'k_repay', target: m.id, amt: pay, free });
  if (free) { bigWin(pay, '⛓️ 빚 다 갚고 해방!'); confetti(); } else toast(`⛓️ ${krw(pay)} 갚았어요 · 남은 빚 ${krw(me.master.debt)}`); renderAll();
}
// 반란: 주인을 공격·결투로 이기면 빚 탕감 (atk.js에서 불러요). me = 저장 직전 지갑
function loanRebel(me, tid) { const m = slaveOf(me); if (!m || m.id !== tid) return false; const debt = m.debt; delete me.master; me.rebelAt = now(); return debt; }
// 상납: 내 수익 실현 기록(소식)을 보고 20%씩 주인에게 (빚에서 빠져요)
const PROFIT_OF = f => (['k_sell', 'k_usell', 'k_gsell', 'k_fclose'].includes(f.kind) ? f.pnl : f.kind === 'casino' ? f.amt : f.kind === 'k_duel' && f.win ? f.amt : 0) || 0;
let loanBusy = false;
async function loanSync() {
  if (!S.me || S.readOnly || S.saving || loanBusy) return;
  const me0 = S.me, me = clone(me0), msgs = []; let changed = false;
  // ① 나에게 온 사채
  const lseen = me0.loanSeen ?? (me0.joined || 0), loans = (S.feed || []).filter(f => f && f.kind === 'k_loan' && f.target === S.uid && f.ts > lseen).sort((a, b) => a.ts - b.ts);
  loans.forEach(f => { me.loanSeen = f.ts; changed = true;
    if (slaveOf(me) || f.uid === S.uid) { msgs.push(['refund', f]); return; }   // 이미 주인 있으면 돌려보내요
    me.cash = Math.round((me.cash || 0) + f.amt); me.master = { id: f.uid, debt: f.debt, amt: f.amt, at: f.ts }; msgs.push(['loan', f]); });
  // ② 상납 (노예일 때 생긴 내 수익)
  const m = slaveOf(me);
  if (m) { const tseen = Math.max(me0.trbSeen || 0, m.at), wins = (S.feed || []).filter(f => f && f.uid === S.uid && f.ts > tseen && PROFIT_OF(f) > 0).sort((a, b) => a.ts - b.ts);
    if (wins.length) { const T = Math.min(m.debt, Math.round(wins.reduce((a, f) => a + PROFIT_OF(f), 0) * LOAN.TRIB)); me.trbSeen = wins[wins.length - 1].ts; changed = true;
      if (T > 0) { me.cash = Math.round(me.cash - T); me.master.debt = Math.round(m.debt - T); msgs.push(['trib', { amt: T, to: m.id, free: me.master.debt <= 0 }]); if (me.master.debt <= 0) delete me.master; } } }
  // ③ 주인: 노예가 보낸 상납·상환 받기
  const xseen = me0.xferSeen ?? (me0.joined || 0), xs = (S.feed || []).filter(f => f && (f.kind === 'k_tribute' || f.kind === 'k_repay') && f.target === S.uid && f.ts > xseen && !f.refund).sort((a, b) => a.ts - b.ts);
  const refunds = (S.feed || []).filter(f => f && f.kind === 'k_repay' && f.refund && f.target === S.uid && f.ts > xseen);
  [...xs, ...refunds].forEach(f => { me.cash = Math.round((me.cash || 0) + f.amt); me.xferSeen = Math.max(me.xferSeen || 0, f.ts); changed = true; msgs.push(['recv', f]); });
  if (!changed) return;
  loanBusy = true; const ok = await kSave(me, me0); loanBusy = false; if (!ok) return;
  msgs.forEach(([k, f]) => {
    if (k === 'refund') addFeed({ kind: 'k_repay', target: f.uid, amt: f.amt, refund: true });
    if (k === 'loan') { toast(`⛓️ ${nameOf(f.uid)}님이 사채 ${krw(f.amt)}을 꽂았어요! 빚 ${krw(f.debt)} · 수익의 20%가 상납돼요`); buzz([60, 40, 60]); }
    if (k === 'trib') { addFeed({ kind: 'k_tribute', target: f.to, amt: f.amt, free: f.free }); toast(f.free ? `⛓️ 상납으로 빚을 다 갚았어요! 해방!` : `⛓️ 수익의 20% ${krw(f.amt)}이 ${nameOf(f.to)}님에게 상납됐어요`); }
    if (k === 'recv') toast(f.kind === 'k_tribute' ? `👑 노예 ${nameOf(f.uid)}님이 상납금 ${krw(f.amt)}을 바쳤어요` : `💰 ${nameOf(f.uid)}님이 사채 ${krw(f.amt)}을 갚았어요${f.free ? ' (해방)' : ''}`);
  });
  renderAll();
}
function loanPanelHTML(p) {   // 친구 프로필: 사채 꽂기 / 내 프로필: 빚 갚기
  if (p.id === S.uid) { const m = slaveOf(S.me); if (!m) { const sl = slavesOf(S.uid); return sl.length ? `<div class="loanbox own">👑 내 노예 ${sl.length}명 · ${sl.map(id => esc(nameOf(id))).join(', ')} · 수익의 20%가 들어와요</div>` : ''; }
    return `<div class="loanbox slave"><b>⛓️ ${esc(nameOf(m.id))}님의 노예</b><small>남은 빚 ${krw(m.debt)} · 수익 실현할 때마다 20% 상납 · 주인을 공격·결투로 이기면 반란(빚 탕감)</small><button type="button" class="cta" id="loanRepay">빚 갚기 · ${krw(Math.min(m.debt, Math.max(0, S.me.cash)))}</button></div>`; }
  const why = loanWhy(p.id), m = slaveOf(p);
  if (m) return `<div class="loanbox slave"><b>⛓️ ${esc(nameOf(m.id))}님의 노예</b><small>남은 빚 ${krw(m.debt)}${m.id === S.uid ? ' · 수익의 20%가 나에게 상납돼요' : ''}</small></div>`;
  if (why !== 'ok') return '';
  return `<div class="loanbox"><b>⛓️ 사채 꽂기</b><small>파산 직전이에요. 돈을 꽂아주면 빚 1.3배 · 수익의 20%를 상납받아요 (거절 불가)</small><div class="lb-btns">${LOAN.AMTS.map(a => `<button type="button" data-loan="${p.id}|${a}" ${S.me && S.me.cash >= a ? '' : 'disabled'}>${krwUnits(a)}</button>`).join('')}</div></div>`;
}

/* ───────── 📰 찌라시 ───────── */
const rumorLeft = () => { const me = S.me; if (!me) return 0; return me.rmDay === kstDay(now()) ? Math.max(0, RUMOR.PER_DAY - (me.rmN || 0)) : RUMOR.PER_DAY; };
function rumorRowHTML(sym) {
  if (!S.me || S.readOnly || !gmCls(sym)) return ''; const left = rumorLeft(), can = left > 0 && S.me.cash >= RUMOR.COST;
  return `<div class="rumor"><span>📰 찌라시 <small>3억 · 오늘 ${left}번 · 70% 선동 / 30% 들통</small></span><span class="rm-btns"><button type="button" data-rumor="${sym}|1" ${can ? '' : 'disabled'}>🔥 호재</button><button type="button" data-rumor="${sym}|-1" ${can ? '' : 'disabled'}>❄️ 악재</button></span></div>`;
}
const RUMOR_TXT = { 1: ['대규모 호재 터진다는 소문', '큰손 매집설 확산', '깜짝 실적 루머'], '-1': ['대규모 악재 루머 확산', '경영진 리스크 루머', '대형 리콜설 확산'] };
async function rumorGo(sym, d) {
  if (!S.me || S.saving || S.readOnly || rumorLeft() <= 0 || S.me.cash < RUMOR.COST) return;
  const k = sym + d; if (S.rArm !== k || Date.now() - (S.rArmT || 0) > 4000) { S.rArm = k; S.rArmT = Date.now(); toast(`📰 한 번 더 누르면 3억 내고 ${d > 0 ? '호재' : '악재'} 찌라시를 뿌려요`); return; }
  S.rArm = null;
  const r = crypto.getRandomValues(new Uint32Array(2)), ok = r[0] / 4294967296 < RUMOR.P, mag = +(.06 + .06 * (r[1] / 4294967296)).toFixed(3);
  const before = S.me, me = clone(before); me.cash = Math.round(me.cash - RUMOR.COST); if (me.rmDay !== kstDay(now())) { me.rmDay = kstDay(now()); me.rmN = 0; } me.rmN = (me.rmN || 0) + 1;
  if (!(await kSave(me, before))) return;
  const txt = RUMOR_TXT[d][Math.floor((r[1] % 3))];
  addFeed({ kind: 'k_rumor', sym, d, mag, ok, txt });
  toast(ok ? `📰 찌라시 성공! ${(KC[sym] || UC[sym]).n} ${d > 0 ? '+' : '-'}${Math.round(mag * 100)}% 움직여요 (익명 유지)` : `📰 앗… 30초 뒤에 들통나요! 정반대로 15% 반전돼요`); renderAll();
}
// 들통난 찌라시: 30초 뒤 이름 공개 알림 (모든 폰)
const RM_SEEN = {};
function rumorTick() {
  (S.feed || []).forEach(f => { if (!f || f.kind !== 'k_rumor' || f.ok) return; const k = f.uid + f.ts; const age = now() - f.ts;
    if (age >= 30e3 && age < 5 * 60e3 && !RM_SEEN[k]) { RM_SEEN[k] = 1; const a = KC[f.sym] || UC[f.sym];
      if (typeof EVQ !== 'undefined') { EVQ.q.push({ f: { kind: 'k_fliq' }, t: ['liq', '🚨', `방금 ${esc(a ? a.n : '')} 찌라시는 <b>${esc(nameOf(f.uid))}</b>님이 뿌린 가짜 뉴스! 정반대로 급반전`] }); evNext(); } }
    else if (age >= 5 * 60e3) RM_SEEN[k] = 1; });
}
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('button'); if (!t) return;
  if (t.dataset.loan) { const [tid, a] = t.dataset.loan.split('|'); loanGive(tid, +a); }
  if (t.id === 'loanRepay') loanRepay();
  if (t.dataset.rumor) { const [sym, d] = t.dataset.rumor.split('|'); rumorGo(sym, +d); }
});
