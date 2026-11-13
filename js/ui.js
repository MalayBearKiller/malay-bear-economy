'use strict';
/* ═════════ 화면: 홈 · 상점(레벨업·게임) · 건의/소식 · 시트 · 탭 · 참가 · 도움말 ═════════ */
const mmss = ms => { ms = Math.max(0, ms); const s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
function hms(ms) { ms = Math.max(0, ms); const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h > 23 ? Math.floor(h / 24) + '일 ' + String(h % 24).padStart(2, '0') : String(h).padStart(2, '0')) + ':' + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0'); }
/* ───────── home: index + leaderboard ───────── */
function renderHome() {
  const el = $('#tab-home');
  let h = '';
  if (S.me) {
    const me = kInit(S.me), w = worth(me), r = roiOf(me, w), rk = ranking().findIndex(p => p.id === S.uid) + 1;
    const chief = GU_RANK.filter(g => (guChief()[g] || {}).id === S.uid);
    const bnr = okPhoto(me.banner);
    h += `<button type="button" class="wal krwwal one${bnr ? ' bn' : ''}" data-tab-go="assets"${bnr ? ` style="--bn:url(${me.banner})"` : ''}><span class="wl-h"><span class="wl-ic">₩</span>내 총자산<small>${rk ? rk + '위' : ''}</small></span>
      <b class="num" data-roll="home" data-v="${w}">${won(w)}</b><span class="wl-s num">${pctTxt(r)} · 현금 ${won(me.cash)} · ⚔️LV.${lvOf(me)}${chief.length ? ` · 👑 ${chief.length > 1 ? chief.length + '곳' : chief[0]}` : ''}</span></button>
    <div class="stipbar">💵 다음 지원금 <b class="num">${krwUnits(STIP)}원</b> · <span class="num">${hms(stipNext() - now())}</span> 뒤</div>` + throneHTML() + (typeof bountyBoardHTML === 'function' ? bountyBoardHTML() : '');
  }
  if (!S.me && !S.readOnly && S.mode !== 'loading') {
    if (S.mode === 'live' && !S.loaded) {
      h += `<div class="card join"><b>지갑을 불러오는 중…</b><span class="dim" style="font-size:13px;font-weight:600">${S.userEmail ? esc(S.userEmail) + ' 계정 확인 중' : '잠시만 기다려 주세요'}</span></div>`;
    } else if (S.loadErr) {
      h += `<div class="card join"><b>서버에서 지갑을 불러오지 못했어요</b><span class="dim" style="font-size:13px;font-weight:600">기존 데이터 보호를 위해 새로고침하거나 계정을 다시 확인해 주세요${S.userEmail ? ` (${esc(S.userEmail)})` : ''}</span><button class="cta soft" type="button" id="switchAcctBtn">🔄 다른 Google 계정으로 로그인</button></div>`;
    } else {
      h += `<div class="card join"><b>썬빗에 참가하세요</b><span class="dim" style="font-size:13px;font-weight:600">${S.userEmail ? `현재 <b>${esc(S.userEmail)}</b> 계정에는 참가 기록이 없어요.<br>원래 하던 캐릭터가 있다면 아래에서 Google 계정을 바꿔 주세요!` : '50억원으로 시작해요'}</span><button class="cta" type="button" data-join>이 계정으로 새로 참가하기</button>${S.fb && S.mode === 'live' ? `<button class="cta soft" type="button" id="switchAcctBtn" style="margin-top:6px">🔄 다른 Google 계정으로 로그인</button>` : ''}</div>`;
    }
  }
  if (S.readOnly) h += `<p class="hint keep" style="margin:-8px 0 0">관전 모드예요. 거래하려면 방장에게 편집자 초대를 받아야 해요.</p>`;

  // 순위 | 지도: 10초마다 번갈아 보여주고, '고정하기'를 체크하면 멈춰요. 두 화면 높이를 같게 해서 바뀔 때 화면이 출렁이지 않게
  const RPG = 5, cur = S.mode === 'loading' ? [] : ranking(), rPages = Math.max(1, Math.ceil(cur.length / RPG));
  S.rankPage = Math.max(0, Math.min(S.rankPage || 0, rPages - 1));
  if (S.homeView !== 'map') S.homeView = 'rank';
  const isMap = S.homeView === 'map', pin = !!S.homePin;
  const top = guChief(), myGu = GU_RANK.filter(g => (top[g] || {}).id === S.uid).length, taken = Object.keys(top).length;
  h += `<div class="sec homesw"><div class="sec-h hsw"><span class="hswitch" role="tablist"><button type="button" role="tab" data-homeview="rank" aria-selected="${!isMap}">순위</button><button type="button" role="tab" data-homeview="map" aria-selected="${isMap}">지도</button></span>
    <button type="button" class="fixchk${pin ? ' on' : ''}" id="homePin" role="checkbox" aria-checked="${pin}"><i></i>고정하기</button>
    ${isMap ? `<small class="mapinfo2">구청장 ${taken}/25${myGu ? ` · 내 구 ${myGu}` : ''}</small>` : `<small class="livecnt"><i></i>${liveCount()}명 접속</small>`}</div>
    <div class="flipbar${pin ? ' off' : ''}"><i style="animation-duration:10s;animation-delay:-${Math.min(10000, Date.now() - (S.homeFlipAt || 0))}ms"></i></div><div class="hview">`;
  if (isMap) h += `<div class="card bmapbox homemap seoulmap">${bondMapSVG()}</div>`;   // 서울시 투자지분 땅따먹기 지도
  else if (S.mode === 'loading') h += `<div class="empty">순위를 불러오는 중…</div>`;
  else if (!cur.length) h += `<div class="empty">아직 아무도 없어요. 첫 번째로 참가해보세요.</div>`;
  else {
    const TOPS = topOwners();
    h += `<div class="card lb lbk">`;
    cur.slice(S.rankPage * RPG, (S.rankPage + 1) * RPG).forEach((p, j) => {
      const i = S.rankPage * RPG + j, lord = lordOf(p.id, TOPS), r = roiOf(p, p.w);
      const ob = typeof openBountyOf === 'function' ? openBountyOf(p.id) : null;
      const shOn = typeof focusShieldEnd === 'function' && focusShieldEnd(p.id) > 0;
      h += `<button class="lrow${p.id === S.uid ? ' isme' : ''}${okPhoto(p.banner) ? ' bn' : ''}" type="button" data-player="${esc(p.id)}"${okPhoto(p.banner) ? ` style="--bn:url(${p.banner})"` : ''}><span class="rk r${i + 1}">${i + 1}</span><span class="avw${isOn(p) ? ' on' : ''}">${ava(p)}</span>
        <span class="who"><b>${esc(p.name)}</b>${slaveTag(p)}${p.bot ? '<span class="tag bot">봇</span>' : ''}<small class="lv">⚔️LV.${lvOf(p)}${shOn ? ' · 🛡️' : ''}${lord ? ` · <span class="lord">👑 ${lord}</span>` : ''}${i === 0 && bountyOf(p) ? ` · <span class="bounty">💰 현상금 ${krwUnits(bountyOf(p))}</span>` : ''}${ob ? ` · <span class="bounty">📜 수배 ${krwUnits(ob.total)}</span>` : ''}</small></span>
        <span class="r num"><b>${man(p.w)}원</b><small class="${cls(r)}">${pctTxt(r)}</small></span></button>`;
    });
    h += `</div>`;
    if (rPages > 1) h += `<div class="rpagerow"><span class="rpager"><button type="button" data-rankpg="-1" aria-label="이전 순위" ${S.rankPage ? '' : 'disabled'}>◀</button><small class="num">${S.rankPage + 1}/${rPages}</small><button type="button" data-rankpg="1" aria-label="다음 순위" ${S.rankPage < rPages - 1 ? '' : 'disabled'}>▶</button></span></div>`;
  }
  h += `</div></div>`;
  el.innerHTML = h;
}
function ownerColor(uid) { return uid === S.uid ? 'var(--violet)' : avaColor(uid); }
// 구 영주: 그 구에서 건물을 가장 많이 가진 사람
function lordOf(uid, top) { const g = Object.entries(top || topOwners()).filter(([, u]) => u === uid).map(([gu]) => gu); return g.length ? (g.length > 2 ? `${g[0]} 외 ${g.length - 1}곳 구청장` : g.join('·') + '청장') : ''; }
function topOwners() { return Object.fromEntries(Object.entries(guChief()).map(([g, c]) => [g, c.id])); }   // 구청장 (서울시 투자지분 1등)
// 도장: 그 구 1등 땅주인 프로필을 구 한가운데에 찍어요. 건물 점보다 위에 그려서 안 가려져요 (확대하면 사라짐)
function stampInner(uid, cid) {
  const p = S.players[uid] || {}, ph = !p.bot && okPhoto(p.photo), col = ownerColor(uid);
  return `${ph ? `<clipPath id="${cid}"><circle r="11"/></clipPath>` : ''}<circle r="15" fill="${col}"/><circle r="12.5" fill="#fff"/>
    ${ph ? `<image href="${p.photo}" x="-11" y="-11" width="22" height="22" clip-path="url(#${cid})" preserveAspectRatio="xMidYMid slice"/>` : `<circle r="11" fill="${col}" opacity=".35"/><text class="stx" y="4.5" text-anchor="middle" font-size="12" font-weight="900" fill="#17161f">${esc(p.bot ? '🤖' : (p.name || '?').slice(0, 1))}</text>`}
    <circle r="15" fill="none" stroke="#17161f" stroke-width="1.6"/>`;
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
/* ───────── casino ───────── */
const C = { coinFace: '?', coinMsg: '', wheelRot: 0, wheelMsg: '', busy: false };
function renderCasino() {
  const el = $('#tab-casino');
  if (!S.me) { el.innerHTML = `<div class="empty">${S.readOnly ? '관전 중에는 게임을 할 수 없어요.' : '참가하면 게임을 할 수 있어요.'}</div>${S.readOnly ? '' : '<button class="cta" type="button" data-join>참가하기</button>'}`; return; }
  const bet = betAmount();
  const mx = S.me.cash;
  const bets = [['0.1', '10%'], ['0.25', '25%'], ['0.5', '50%'], ['1', '🔥올인']];
  let h = `<div class="card bal"><span class="dim" style="font-weight:700;font-size:13px">현금</span><b class="num">${won(S.me.cash)}</b></div>
    <div class="sec"><div class="sec-h"><h2>베팅 금액</h2><small>내 총자산 기준 · 한 판 최대 10억</small></div>
    <div class="betrow">${bets.map(([v, l]) => `<button type="button" data-bet="${v}" aria-pressed="${String(S.betPct) === v}" ${C.busy || C.live ? 'disabled' : ''}>${l}</button>`).join('')}</div>
    <p class="betnow">이번 판 <b class="num" id="betNow">${won(bet)}</b> · 최대 <b class="num" id="betCap">${cgCap(bet)}배</b>${bet >= BET_CAP ? ' <span class="dim">(한 판 최대)</span>' : bet >= S.me.cash && bet > 0 ? ' <span class="up">(현금 전부 올인!)</span>' : ''}</p></div>
    ${casinoPickerHTML()}
    ${casinoGameHTML()}
    <p class="hint">게임 결과도 총자산에 그대로 반영돼요. 로켓·보물상자는 도중에 앱을 끄면 그 판은 잃어요.</p>`;
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
  const n = $('#betNow'); if (n) n.textContent = won(b); const cp = $('#betCap'); if (cp) cp.textContent = cgCap(b) + '배';
  document.querySelectorAll('[data-betlbl]').forEach(x => { x.textContent = won(b); });
  document.querySelectorAll('[data-ud]').forEach(x => x.disabled = !ok);
}
const BET_CAP = 1_000_000_000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* ───────── feed ───────── */
function feedText(f) {
  if (!f || typeof f.kind !== 'string') return null;
  if (f.kind.startsWith('k_')) return kFeedText(f);
  const nm = esc(nameOf(f.uid));
  switch (f.kind) {
    case 'join': return ['', '👋', `<b>${nm}</b>님이 참가했어요`];
    case 'casino': return typeof f.amt !== 'number' ? null : [f.amt > 0 ? 'up' : 'down', f.amt > 0 ? '🎰' : '💥', f.amt > 0 ? `<b>${nm}</b>님이 ${esc(f.game)}에서 ${f.mult}배! <b>+${won(f.amt)}</b>` : `<b>${nm}</b>님이 ${esc(f.game)}에서 <b>${won(-f.amt)}</b> 날렸어요`];
    case 'rename': return ['gold', '✏️', `<b>${esc(f.old || '누군가')}</b>님이 닉네임을 <b>${nm}</b>(으)로 바꿨어요`];
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
// 창을 닫을 때: 지금 기록이 우리가 쌓아 둔 칸일 때만 뒤로 가요 (빨리 열고 닫아도 앱 밖으로 안 튕기게)
function guardOff() { if (GUARD && !anyOverlay()) { GUARD = false; if (!(history.state && history.state.gom)) return; SKIP++; try { history.back(); } catch { SKIP--; } } }
function openBoard() { S.board = S.board && S.board !== 'log' ? S.board : 'talk'; if (S.board !== 'talk' && S.board !== 'feed') S.board = 'talk'; $('#board').hidden = false; document.body.classList.add('noscroll'); renderBoard();  guardOn(); }
function closeBoardRaw() { S.board = null; $('#board').hidden = true; document.body.classList.remove('noscroll'); }
function closeBoard() { closeBoardRaw(); guardOff(); }
function renderBoard() {
  const d = $('#board'); if (!S.board || !d) return;
  const ae = document.activeElement, keep = ae && ae.id === 'boardInput' ? { v: ae.value, s: ae.selectionStart } : null;
  if (S.board === 'log') { d.innerHTML = `<div class="in"><div class="dtop"><button class="back" type="button" id="boardBack" aria-label="닫기"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><b>📜 전체 로그</b></div>${renderLogHTML()}</div>`; return; }
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
// ⚔️ 전투력(LV): 상점에서 현금으로 올려요. LV.1에서 시작, 첫 레벨업 100원, 올릴 때마다 1.14배 (LV.200 근처가 상위권)
// 파산 지원금 무한 루프 방지를 위해 실질 총자산 5억원(LV_KEEP) 밑으로는 레벨업에 현금을 쓸 수 없고, 최근 24시간 레벨업 지출(lvLog)을 기록해요.
const LV_KEEP = 500_000_000;
const lvOf = p => Math.max(1, Math.floor((p && p.lv3) || 1));
const lvCost = lv => Math.max(100, Math.round(100 * Math.pow(1.14, lv - 1)));
const lvSpendable = me => me ? Math.max(0, Math.min(Math.floor(me.cash || 0), Math.floor(realWorth(me) - LV_KEEP))) : 0;
function pushLvSpend(me, amt) {
  const t = now(), cut = t - D;
  const arr = (me.lvLog || []).filter(x => Array.isArray(x) && x[0] > cut);
  if (arr.length && t - arr[arr.length - 1][0] < 300e3) arr[arr.length - 1][1] = Math.round(arr[arr.length - 1][1] + amt);
  else arr.push([t, Math.round(amt)]);
  me.lvLog = arr.slice(-48);
}
async function levelUp() {
  if (!S.me || S.saving || S.readOnly) return;
  const lv = lvOf(S.me), cost = lvCost(lv);
  if (S.me.cash < cost) { toast(`현금이 ${won(cost - S.me.cash)} 부족해요`); return; }
  if (lvSpendable(S.me) < cost) { toast('실질 총자산 최소 5억원은 남겨야 레벨업할 수 있어요'); return; }
  const before = S.me, me = JSON.parse(JSON.stringify(before)); me.cash = Math.round(me.cash - cost); me.lv3 = lv + 1; pushLvSpend(me, cost);
  S.saving = true; const ok = await saveMe(me, before); S.saving = false;
  if (ok) { toast(`⚔️ 전투력 LV.${lv + 1} 달성!`); confetti(); buzz(60); renderAll(); }
}
// 쓸 수 있는 현금(실질자산 5억원 초과분)으로 갈 수 있는 데까지 한 번에 올리기 (두 번 눌러야 결제)
function lvMaxPlan(cash, lv) { let n = lv, spent = 0; while (n < 100000) { const c = lvCost(n); if (spent + c > cash) break; spent += c; n++; } return { to: n, spent }; }
async function levelMax() {
  if (!S.me || S.saving || S.readOnly) return;
  const lv = lvOf(S.me), plan = lvMaxPlan(lvSpendable(S.me), lv);
  if (plan.to <= lv) { toast(S.me.cash >= lvCost(lv) ? '실질 총자산 최소 5억원은 남겨야 해요' : '현금이 부족해요'); return; }
  if (!S.lvArm || Date.now() - S.lvArm > 4000) { S.lvArm = Date.now(); renderShop(); return; }
  S.lvArm = 0;
  const before = S.me, me = JSON.parse(JSON.stringify(before)); me.cash = Math.round(me.cash - plan.spent); me.lv3 = plan.to; pushLvSpend(me, plan.spent);
  S.saving = true; const ok = await saveMe(me, before); S.saving = false;
  if (ok) { toast(`⚔️ 전투력 LV.${plan.to} 달성! (+${plan.to - lv}레벨 · ${won(plan.spent)})`); confetti(); buzz(80); renderAll(); }
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
  if (S.shopView === 'game' && CASINO_OFF) S.shopView = '';
  if (S.shopView === 'game') {
    if (!el.querySelector('#tab-casino')) el.innerHTML = `<button type="button" class="back-link" id="shopBack">← 상점으로</button><section class="sec" id="tab-casino" style="gap:18px"></section>`;
    if (!C.busy && !C.live) renderCasino(); return;
  }
  const lv = S.me ? lvOf(S.me) : 1, lc = lvCost(lv), spend = S.me ? lvSpendable(S.me) : 0;
  const plan = S.me ? lvMaxPlan(spend, lv) : { to: lv, spent: 0 }, armed = S.lvArm && Date.now() - S.lvArm < 4000;
  const resPct = Math.round(60 * Math.tanh((lv - 1) / 60));
  const holdWarn = S.me && S.me.cash >= lc && spend < lc;
  el.innerHTML = `<div class="card shopitem lvitem"><span class="si-ic">⚔️</span><span class="si-t"><b>전투력 레벨업 · LV.${lv}</b><small>약탈·사냥 공방 확률 최대 ±18%p · 파산 지원금 보너스 +${resPct}%</small>${holdWarn ? `<small class="down">비상금 5억원(실질자산 기준)은 남겨야 레벨업 가능해요</small>` : ''}</span><button type="button" id="lvUp" ${S.me && !S.readOnly && spend >= lc && !S.saving ? '' : 'disabled'}>${won(lc)}</button></div>
    ${plan.to > lv + 1 ? `<button type="button" class="cta ${armed ? 'buy' : 'soft'} lvmax" id="lvMax" ${S.saving || S.readOnly ? 'disabled' : ''}>${armed ? `한 번 더 누르면 LV.${plan.to}까지 · ${won(plan.spent)} 결제` : `⏫ 최대한 올리기 · LV.${plan.to}까지 ${won(plan.spent)}`}</button>` : ''}
    <div class="card lv-desc"><div><b>⚔️ 전투력 효과</b><small>상대보다 레벨이 높으면 내 공격 성공률이 오르고, 상대가 나를 털 확률은 내려가요 (LV.1 vs LV.${lv} 기준 <b class="num">${lv > 1 ? '+' : ''}${(18 * Math.tanh((lv - 1) / 45)).toFixed(1)}%p</b>). 부자가 레벨을 안 올리면 동네북이 돼요!</small></div></div>
<div class="sec"><div class="sec-h"><h2>게임</h2></div><button type="button" class="card shopitem${CASINO_OFF ? ' off' : ''}" id="shopGame"><span class="si-ic">${CASINO_OFF ? '🔒' : '🎰'}</span><span class="si-t"><b>도박장 · 게임 5개${CASINO_OFF ? ' (잠시 닫힘)' : ''}</b><small>${CASINO_OFF ? '지금은 들어갈 수 없어요' : '⚡업다운 🚀로켓 💣보물상자 🎰슬롯 🏇경마'}</small></span><span class="si-go">›</span></button></div>`;
}
// 소식에는 놀릴 거리만 남겨요: 큰 청산·큰 수익·지분·현상수배·하극상/참수
const brag = f => f && (f.kind === 'k_fliq' || f.kind === 'k_bond' || f.kind === 'k_bty_add' || f.kind === 'k_bty_claim' || f.kind === 'k_bty_def' || (f.kind === 'k_atk' && (f.exec || f.udog)) || (f.pnl || 0) >= 1e8 || (f.kind === 'casino' && f.amt >= 1e8));
function renderFeed() {
  const el = $('#tab-feed');
  const items = S.feed.filter(brag).map(f => [f, feedText(f)]).filter(x => x[1]);
  let h = `<div class="sec"><div class="sec-h"><h2>소식</h2><small>큰 수익 · 청산 · 지분</small></div><div class="slist">`;
  if (!items.length) h += `<div class="empty">아직 조용해요.</div>`;
  items.slice(0, 40).forEach(([f, [c, ic, tx]]) => { h += `<div class="fitem"><span class="ic ${c}">${ic}</span><span>${tx}</span><time>${timeAgo(f.ts)}</time></div>`; });
  h += `</div></div>`; el.innerHTML = h;
  if (items.length) { S.feedSeen = items[0][0].ts; LS.set('feedSeen', S.feedSeen); }
  $('#feedDot').hidden = true;
}
// 카테고리 버튼 줄을 밀고 있는 동안(그리고 관성 스크롤 동안)은 1초 새로고침을 잠깐 멈춰요
let chipsTouchAt = 0;
function renderAll() {
  // 1초마다 새로 그릴 땐 상점(입력칸 있음)은 건너뛰어요
  const R = { home: renderHome, coin: renderCoins, assets: renderMe, shop: renderShop }[S.tab];
  if (R && !(S.liveOnly && (S.tab === 'shop' || Date.now() - chipsTouchAt < 1500))) R();
  const latest = S.feed.find(f => f.uid !== S.uid && brag(f));
  $('#feedDot').hidden = S.board === 'feed' || !latest || latest.ts <= S.feedSeen;
  if (S.board && S.board !== 'log' && !S.liveOnly) renderBoard();
  if (S.profile) renderProfile();
  renderMineFab(); rollNums();
  if (S.board === 'log' && !S.liveOnly) renderBoard();
}
function goTab(name) {
  S.tab = name; document.querySelectorAll('.nav [data-tab]').forEach(x => x.setAttribute('aria-selected', x.dataset.tab === name));
  ['home', 'coin', 'shop', 'assets'].forEach(n => $('#tab-' + (n === 'assets' ? 'wallet' : n)).hidden = n !== name);
  const bb = $('#boardBtn'); if (bb) bb.hidden = name !== 'home';
  const lb = $('#logBtn'); if (lb) lb.hidden = name !== 'home';
  const gb = $('#promoGo'); if (gb) gb.hidden = CASINO_OFF || name !== 'coin';
  bnBody();   // 게임 배너(헤더, 썬빗과 ? 사이)는 거래소에서만
  renderAll(); window.scrollTo({ top: 0 });
}
/* ───────── chart ───────── */
// 시간축 차트: pts = [[시각(ms), 가격], ...], 가로축은 t0~t1(하루) 고정 → 아직 안 온 시간은 비어 있어요.
// 아래쪽 시간 눈금(한국 시간), 오른쪽 가격 눈금 3개, 기준선(전일 종가 등) 점선, 선 아래 옅은 그라데이션.
function drawTChart(cv, pts, o = {}) {
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (!w || !h || !pts || pts.length < 2) return;
  cv.width = w * dpr; cv.height = h * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const cs = getComputedStyle(document.documentElement), tok = n => cs.getPropertyValue(n).trim();
  const fmt = o.fmt || (v => Math.round(v).toLocaleString('ko-KR'));
  const t0 = o.t0 ?? pts[0][0], t1 = o.t1 ?? pts[pts.length - 1][0];
  const ps = pts.map(x => x[1]), base = o.base;
  let lo = Math.min(...ps, base ?? Infinity), hi = Math.max(...ps, base ?? -Infinity); const pad = (hi - lo) * .08 || hi * .01 || 1; lo -= pad; hi += pad;
  const ticksY = [hi - pad, (hi + lo) / 2, lo + pad];
  g.font = '600 10px ' + tok('--f-body');
  const padR = Math.ceil(Math.max(...ticksY.map(v => g.measureText(fmt(v)).width))) + 8, padT = 6, padB = 18, padL = 2;
  const X = t => padL + (w - padL - padR) * (t - t0) / ((t1 - t0) || 1), Y = v => padT + (h - padT - padB) * (1 - (v - lo) / (hi - lo));
  // 가로 눈금선 + 가격
  g.strokeStyle = tok('--line'); g.lineWidth = 1; g.fillStyle = tok('--faint'); g.textAlign = 'left'; g.textBaseline = 'middle';
  ticksY.forEach(v => { const y = Math.round(Y(v)) + .5; g.beginPath(); g.moveTo(padL, y); g.lineTo(w - padR, y); g.stroke(); g.fillText(fmt(v), w - padR + 6, y); });
  // 시간 눈금 (한국 시간, step시간마다)
  const step = (o.stepH || 6) * H, KSTo = 9 * H; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  for (let t = Math.ceil((t0 + KSTo) / step) * step - KSTo; t <= t1; t += step) {
    const x = X(t); if (x < 14 || x > w - padR - 10) continue;
    g.strokeStyle = tok('--line'); g.beginPath(); g.moveTo(Math.round(x) + .5, padT); g.lineTo(Math.round(x) + .5, h - padB); g.stroke();
    g.fillText(String(new Date(t + KSTo).getUTCHours()).padStart(2, '0') + ':00', x, h - 4);
  }
  // 기준선
  if (base != null) { g.strokeStyle = tok('--faint'); g.setLineDash([3, 4]); g.beginPath(); g.moveTo(padL, Y(base)); g.lineTo(w - padR, Y(base)); g.stroke(); g.setLineDash([]); }
  const last = ps[ps.length - 1], col = last >= (base ?? ps[0]) ? tok('--up') : tok('--down');
  // 선 아래 옅은 채움
  const grad = g.createLinearGradient(0, padT, 0, h - padB); grad.addColorStop(0, col + '33'); grad.addColorStop(1, col + '00');
  g.beginPath(); pts.forEach(([t, v], i) => i ? g.lineTo(X(t), Y(v)) : g.moveTo(X(t), Y(v)));
  g.lineTo(X(pts[pts.length - 1][0]), h - padB); g.lineTo(X(pts[0][0]), h - padB); g.closePath(); g.fillStyle = grad; g.fill();
  g.beginPath(); pts.forEach(([t, v], i) => i ? g.lineTo(X(t), Y(v)) : g.moveTo(X(t), Y(v)));
  g.strokeStyle = col; g.lineWidth = 1.6; g.lineJoin = 'round'; g.stroke();
  const ex = X(pts[pts.length - 1][0]), ey = Y(last); g.beginPath(); g.arc(ex, ey, 3.5, 0, 7); g.fillStyle = col; g.fill();
  const pu = cv.parentElement && cv.parentElement.querySelector('.cpulse'); if (pu) { pu.style.left = ex + 'px'; pu.style.top = ey + 'px'; pu.style.color = col; pu.hidden = false; }   // 끝점이 숨 쉬어요
}
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
function openSheet(type, data = {}) { setTimeout(renderMineFab); S.sheet = { type, ...data }; const w = $('#sheetWrap'); w.classList.toggle('center', type === 'quick'); w.classList.toggle('full', type === 'mine'); w.hidden = false; renderSheet(); setTimeout(() => { const n = $('#nick'); if (type === 'join' && n) { n.focus(); n.select(); } }, 60);  guardOn(); }
function closeSheetRaw() { setTimeout(renderMineFab); const t = S.sheet && S.sheet.type; S.sheet = null; $('#sheetWrap').hidden = true; if (t === 'reveal') maybeJoin(); }
function closeSheet() { closeSheetRaw(); guardOff(); }
function renderSheet() {
  const b = $('#sheetBody'); const sh = S.sheet; if (!sh) return;
  (KSHEETS[sh.type] || { join: renderJoinSheet, rename: renderRenameSheet, help: renderHelp }[sh.type])(b, sh);
  rollNums(b);
}
function chatTime(ts, long) {
  const d = new Date(ts + KST); const hh = d.getUTCHours(), mm = String(d.getUTCMinutes()).padStart(2, '0');
  const t = `${hh < 12 ? '오전' : '오후'} ${hh % 12 || 12}:${mm}`;
  if (!long) return t;
  const today = kstDay(now()) === kstDay(ts); return today ? `오늘 ${t}` : `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${DOW[(d.getUTCDay() + 6) % 7]}요일 ${t}`;
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
// 👤 프로필 화면: 순위에서 사람을 누르면 열려요. 이름·레벨·사진 + 주식/코인/부동산/정보 탭으로 염탐
function openProfile(id) { if (!S.players[id]) return; S.profile = id; S.ptab = 'info'; $('#profile').hidden = false; document.body.classList.add('noscroll'); renderProfile(); $('#profile').scrollTop = 0;  guardOn(); }
function closeProfileRaw() { S.profile = null; $('#profile').hidden = true; document.body.classList.remove('noscroll'); }
function closeProfile() { closeProfileRaw(); guardOff(); }
function renderProfile() { renderFriendProfile(); } // 새 프로필 화면 (me.js)
function renderJoinSheet(b) {
  const prev = (S.players[S.uid] && S.players[S.uid].name) || LS.get('nick', '') || '존버의신';
  b.innerHTML = `<div class="rv-head"><span class="k">SUNBIT</span><h3>50억원으로 시작</h3></div>
    ${S.userEmail ? `<div class="atk-shwarn" style="margin-bottom:8px">현재 로그인된 Google 계정: <b>${esc(S.userEmail)}</b><br><small>기존에 하던 캐릭터가 안 보이면 <b>다른 Google 계정</b>으로 자동 로그인된 상태예요!</small></div>` : ''}
    ${S.fb && S.mode === 'live' ? `<button class="cta soft" type="button" id="switchAcctBtn" style="margin-bottom:10px">🔄 원래 하던 다른 Google 계정으로 로그인</button>` : ''}
    <p class="hint keep" style="text-align:center">처음 오셨다면 아래에 닉네임을 적고 새 지갑(50억원)을 만드세요.</p>
    <div class="field"><label for="nick" class="dim" style="font-size:13px;font-weight:700">닉네임</label><input id="nick" maxlength="10" placeholder="예: 존버의신" value="${esc(prev)}"></div>
    <p class="hint nickwarn">⚠️ 실명은 쓰지 마세요. 닉네임은 순위·채팅에서 모두에게 보여요.</p>
    <button class="cta" type="button" id="joinBtn">새로 참가하기</button>`;
}
async function doJoin() {
  if (S.mode === 'live' && (!S.loaded || S.loadErr)) { toast('아직 기존 지갑 확인 중이에요. 잠시 후 다시 시도해 주세요.'); return; }
  if (S.players[S.uid] && S.players[S.uid].name) { S.me = S.players[S.uid]; closeSheet(); renderAll(); return; }
  const inputEl = $('#nick');
  const nick = ((inputEl && inputEl.value) || '').trim().slice(0, 10) || '존버의신';
  LS.set('nick', nick);
  const me = kInit({ name: nick, season: S.season.sid, cash: CASH0, inflow: CASH0, joined: Date.now(), casino: 0, ts: Date.now(), cpH: Math.floor(Date.now() / H), stipS: stipSlot(), g40: 1, g30: 1, taxH: Math.floor(Date.now() / H) + 1 });
  S.saving = true; const ok = await saveMe(me, S.me); S.saving = false;
  if (ok) { addFeed({ kind: 'join' }); closeSheet(); toast('참가 완료!'); renderAll(); }
}
// ? 도움말: 지금 보고 있는 탭에 맞는 설명을 보여줘요
const HELP = {
  home: ['홈', '총자산 순위', [
    '돈은 <b>원화</b> 하나예요. 처음 <b>50억원</b>. 코인·주식·현물·국채·지분과 게임·상점에 다 같이 써요.',
    '<b>총자산</b> = 현금 + 코인(현물·선물) + 주식 + 국채. 순위는 총자산 순서예요.',
    '<b>💵 지원금</b>: <b>2시간마다 420만원</b>(하루 약 5,000만원)이 자동으로 들어와요. 짝수 시 정각마다, 앱을 꺼 둬도 쌓여요(최대 7일치).',
    '<b>📜 현상수배 게시판</b>: 누구에게나(본인 제외) 한 줄 사유와 함께 현상금을 걸거나 돈을 더 얹을 수 있어요. 돈을 안 얹은 제3자 사냥꾼이 공격·결투로 잡으면 수령하고, 표적이 3번 막아내면 현상금 절반을 역수령해요.',
    '<b>📜 로그</b>: 홈 위쪽 로그 버튼. 모든 거래·공격(뽑은 번호까지)·청산·현상수배가 다 같이 보는 기록으로 남아요.',
    '<b>파산</b>: 실질 총자산(저격 모금·현상수배 예치금·도박장 베팅 포함)이 2억원 밑이면 거래소 탭에서 기본 <b>20억원</b> + 전투력 보너스(최대 +60%, 24시간 1회·최근 레벨업 지출 차감)를 받아요.',
    '이름을 누르면 그 사람 지갑이 다 보여요.']],
  coin: ['거래소', '주식 · 코인 · 현물 · 채권', [
    '<b>주식</b>: 미국 99종목(빅테크·반도체·AI·전기차·코인주·양자·금융·소비재·헬스케어·산업·ETF), 실시간(프리·애프터 포함). 원화를 실시간 환율로 자동 환전해서 사요. 1주 단위 거래, 수수료 0.1%. <b>롱·숏 1·5·10·25·50배</b>.',
    '<b>코인</b>: 업비트 실시간. 현물 수수료 0.05%. <b>롱·숏</b> BTC·ETH 100배, 알트 50배, 밈 25배.',
    '<b>현물</b>: 금·은·백금·구리·원유·천연가스. 실시간 달러 가격. <b>롱·숏 2·5·10배</b>.',
    '<b>채권</b>: 안에 두 가지. 🏛️ <b>서울시 투자지분</b>(구마다 100%, 가장 많이 가진 사람이 구청장, 매시간 배당)과 🌍 <b>국제채권</b>(미국·유럽·동아시아 10년물 국채).',
    '<b>⛓️ 사채·노예</b>: 실질 총자산 10억 밑인 친구 프로필에서 5·10·20억 사채를 꽂을 수 있어요(거절 불가). 빚은 1.3배, 그 친구는 [노예 ⛓️] 배지가 붙고 수익을 실현할 때마다 20%가 주인에게 상납돼요(빚에서 빠짐). 빚을 다 갚거나, 주인을 공격·결투로 이기면(반란) 해방.',
    '<b>📰 찌라시</b>: 코인·주식 거래창에서 3억 내고 호재/악재 익명 속보를 뿌려요(하루 2번). 70%는 그 방향으로 6~12% 움직이고, 30%는 30초 뒤 이름이 공개되며 정반대로 15% 급반전.',
    '<b>🎯 왕좌 저격</b>(홈 맨 위): 여럿이 돈을 모아 1·2·3등을 쏴요. 목표는 상대 총자산의 15%, 다 차는 순간 발사! 성공 확률 1등 30% · 2등 35% · 3등 40%, 성공하면 낸 돈 + 이익(2배 · 1.7배 · 1.5배)을 낸 비율대로 나눠요. 실패하면 모은 돈 전부 잃고 절반은 상대 방어 보상. 2시간 안에 안 차면 환불, 털린 사람은 30분 보호막.',
    '<b>👑 1등 현상금</b>: 1등에게 총자산의 1% + 1시간 버틸 때마다 +0.5%(최대 5%) 현상금이 붙어요. 1등을 공격해서 성공하면 현상금까지 받아요.',
    '<b>⚔️ 결투권</b>: 4등 아래는 하루 1번, 1~3등 프로필에서 결투를 걸 수 있어요. 상대가 접속 중일 때만. 5분 동안 총자산 수익률이 높은 쪽이 이기고, 판돈은 둘 중 작은 총자산의 5%(같은 금액이 오가요).',
    '<b>💥 고배율 털기</b>: 10배 이상 롱·숏 수익이 <b>+25%</b>를 넘으면 1초마다 확률로 <b>그 종목 가격이 반대로 꽂혀요</b>(모두에게). 50배 이상 25% · 25배 15% · 10배 5%. 100배는 평균 5초, 50배 7초, 25배 15초, 10배 40초 버텨요. 고배율은 그대로 청산, 같은 쪽 들고 있던 사람도 같이 맞아요. 수익률 <b>+25%</b>부터, 증거금이 총자산 15% 이상이거나 5억 이상인 포지션만 걸려요. 꽂힌 뒤 70%는 30분에 걸쳐 돌아오지만, 20%는 그대로 굳고 10%는 한 번 더 꽂혀요. 총자산 1,000억 전까지는 확률이 훨씬 낮아요.',
    '롱·숏은 약 1÷배수만큼 반대로 가면 <b>청산</b>(증거금의 30~50%는 돌려받아요). 펀딩비 8시간마다 0.01%. 앱을 꺼 둬도 분봉 최저·최고가로 확인해요.',
    '오른쪽 아래 <b>💼 내 보유</b>를 누르면 가진 걸 모아 보고 바로 팔기·종료할 수 있어요.']],
  bond: ['국채', '미국·유럽·동아시아 10년물', [
    '나라별 <b>10년물 국채</b>를 실시간 금리로 사고팔아요. 금리가 오르면 가격이 내리고, 산 금리만큼 이자가 시간에 따라 쌓여요.',
    '세계 지도에서 <b>지역을 누르면 확대</b>돼요. 나라마다 국채를 <b>가장 많이 넣은 사람</b>(현물 원금 + 롱·숏 증거금)의 프로필이 지도에 찍혀요.',
    '현물 수수료 0.05%, 롱·숏 2·5·10배. 국채 롱은 금리가 내리면, 숏은 오르면 이득이에요.',
    '<b>🏛️ 서울시 투자지분</b>(거래소 › 채권): 구마다 지분 100%. 가장 많이 가진 사람이 <b>구청장</b>. 팔릴수록 1% 값이 비싸지고(최대 2.5배), 매시간 <b>배당</b>(강남 0.03% ~ 도봉 0.08%)이 들어와요. 팔 때 수수료 1%.']],
  atk: ['공격 · 전투력 · 현상수배', '친구 프로필의 💰·🎯·📜 버튼', [
    '<b>⚔️ 전투력(LV) 보정</b>: 공격·방어 모두 레벨 차이로 성공 확률이 최대 <b>±18%p</b> 보정돼요(최종 8%~65%). 부자가 레벨을 안 올리면 동네북이 돼요!',
    '<b>💰 수익 약탈</b>: 친구가 <b>수익 보고 있는</b> 코인·주식을 털어요. 기본 성공 25%, 번 돈만큼 가져오고 원금은 안 건드려요.',
    '<b>🎯 마진 사냥</b>: 친구의 <b>롱·숏</b>을 노려요. 성공하면 증거금 <b>50%</b>를 가져오고, 청산 직전이면 <b>☠️ 참수</b>로 전부 가져와요.',
    '<b>⚖️ 양학 페널티 & 🔥 하극상</b>: 레벨과 실질자산이 둘 다 크게 앞서는 강자가 약자를 치면 약탈금·현상금이 <b>20~60% 감액</b>돼요(스머프 부자는 보호 0%). 반대로 약자가 강자를 잡으면 <b>+25% 하극상 보너스</b>(1회 5억·하루 15억 한도)를 받아요.',
    '<b>🛡️ 보호막 & 선공 규칙</b>: 같은 상대는 24시간 내 2번까지만 털 수 있고, 24시간 내 3번 털리면 <b>6시간 집중보호막</b>이 켜져요. 단, 내 보호막이 켜진 채 남을 먼저 공격·결투하면 확인창을 거쳐 <b>내 보호막이 즉시 사라져요</b>.',
    '<b>📜 현상수배</b>: 제3자 사냥꾼이 약탈·사냥·결투로 잡으면 수령하고, 수배자가 제3자의 공격(비용 5,000만원+)을 3번 막아내면 50%를 역수령해요.']],
  assets: ['내 자산', '나와 내 자산 · 분석', [
    '맨 위에 총자산·수익률·현금과 자산 구성(현금·코인·선물·주식·채권·지분)이 보여요.',
    '<b>가진 것</b>: 내가 가진 걸 전부 평가금액 순으로 모았어요. 누르면 바로 거래창이 열려요.',
    '사진을 누르면 바꿀 수 있어요. 맨 아래에서 <b>순위 배경</b>(200만원)·<b>닉네임</b>(200만원)을 바로 바꿔요. 친구 프로필도 같은 모양이에요.']],
  shop: ['상점', '전투력 레벨업 · 도박장', [
    '<b>⚔️ 전투력 레벨업</b>: 현금으로 올려요(1.14배씩 상승, 실질자산 최소 5억원은 비상금으로 남겨야 해요). 레벨이 높을수록 PvP 공격·방어 확률이 유리해지고, 파산 시 지원금 보너스(최대 +60%, 24시간 1회)도 올라가요.',
    
    '<b>⚡ 1분 업다운</b>: 진짜 업비트 시세로 1분 뒤 오를지 내릴지 맞혀요. 맞히면 1.9배, 3연승째부터 2.0배, 5연승째부터 2.3배. 가격이 똑같으면 돌려받아요. 앱을 꺼도 1분 뒤 시세로 결과가 정해져요.',
    '<b>🚀 로켓</b>: 배수가 1.00x부터 계속 올라가요. 터지기 전에 <b>STOP</b>을 누르면 그 배수만큼 받아요. 최대 50배. 3%는 출발하자마자 터져요.',
    '<b>💣 보물상자</b>: 상자 9개 중 폭탄 2개. 💎를 열 때마다 1.25배 → 1.66배 → … 최대 35배까지 올라가요. 언제든 그만두고 받을 수 있고, 폭탄이면 다 잃어요.',
    '<b>🎰 슬롯</b>: 세 줄이 같으면 🍒3배 · 🍋8배 · 🔔35배 · 💎80배 · 7️⃣200배. 🍒가 딱 2개면 본전.',
    '<b>🏇 경마</b>: 4마리 중 1등할 말을 고르면 3.8배.',
    '모든 게임은 평균 94~97%를 돌려줘요. 오래 하면 조금씩 잃어요.']],
};
function renderHelp(b) {
  const [t, sub, items] = (S.profile ? HELP.atk : HELP[S.tab]) || HELP.home;
  b.innerHTML = `<div class="shead"><div><h3>${t} 도움말</h3><small>${sub}</small></div></div>
  <ul class="rules">${items.map((x, i) => `<li><span>${i + 1}</span><span>${x}</span></li>`).join('')}</ul>
  <button class="cta soft" type="button" id="sheetX2">닫기</button>`;
}
function maybeJoin() {
  if (S.me || S.readOnly || S.joinShown || S.sheet || S.mode === 'loading' || S.loadErr) return;
  if (S.mode === 'live' && !S.loaded) return;
  if (seasonOver()) return;
  S.joinShown = true; openSheet('join');
}
window.addEventListener('popstate', () => {
  if (SKIP) { SKIP--; return; }
  GUARD = false;
  if (S.sheet) closeSheetRaw(); else if (S.profile) closeProfileRaw(); else if (S.board) closeBoardRaw(); else return;
  if (anyOverlay()) guardOn();
});
