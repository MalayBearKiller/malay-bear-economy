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
    h += `<button type="button" class="wal krwwal one" data-tab-go="assets"><span class="wl-h"><span class="wl-ic">₩</span>내 총자산<small>${rk ? rk + '위' : ''}</small></span>
      <b class="num" data-roll="home" data-v="${w}">${won(w)}</b><span class="wl-s num">${pctTxt(r)} · 현금 ${won(me.cash)} · LV.${lvOf(me)}${chief.length ? ` · 👑 ${chief.length > 1 ? chief.length + '곳' : chief[0]}` : ''}</span></button>`;
  }
  if (!S.me && !S.readOnly && S.mode !== 'loading') {
    h += `<div class="card join"><b>썬빗에 참가하세요</b><span class="dim" style="font-size:13px;font-weight:600">10억원으로 시작해요</span><button class="cta" type="button" data-join>참가하기</button></div>`;
  }
  if (S.readOnly) h += `<p class="hint keep" style="margin:-8px 0 0">관전 모드예요. 거래하려면 방장에게 편집자 초대를 받아야 해요.</p>`;

  // 순위 | 지도: 5초마다 번갈아 보여주고, 📌 고정을 누르면 멈춰요. 두 화면 높이를 같게 해서 바뀔 때 화면이 출렁이지 않게
  const RPG = 5, cur = S.mode === 'loading' ? [] : ranking(), rPages = Math.max(1, Math.ceil(cur.length / RPG));
  S.rankPage = Math.max(0, Math.min(S.rankPage || 0, rPages - 1));
  if (S.homeView !== 'map') S.homeView = 'rank';
  const isMap = S.homeView === 'map', pin = !!S.homePin;
  const top = guChief(), myGu = GU_RANK.filter(g => (top[g] || {}).id === S.uid).length, taken = Object.keys(top).length;
  h += `<div class="sec homesw"><div class="sec-h hsw"><span class="hswitch" role="tablist"><button type="button" role="tab" data-homeview="rank" aria-selected="${!isMap}">순위</button><button type="button" role="tab" data-homeview="map" aria-selected="${isMap}">지도</button></span>
    <button type="button" class="pinbtn${pin ? ' on' : ''}" id="homePin" aria-pressed="${pin}" aria-label="자동 전환 멈추기">📌${pin ? ' 고정됨' : ''}</button>
    ${isMap ? `<small class="mapinfo2">구청장 ${taken}/25${myGu ? ` · 내 구 ${myGu}` : ''}</small>` : `<small class="livecnt"><i></i>${liveCount()}명 접속</small>`}</div>
    <div class="flipbar${pin ? ' off' : ''}"><i style="animation-duration:5s;animation-delay:-${Math.min(5000, Date.now() - (S.homeFlipAt || 0))}ms"></i></div><div class="hview">`;
  if (isMap) h += `<div class="card bmapbox homemap">${bondMapSVG()}</div>`;
  else if (S.mode === 'loading') h += `<div class="empty">순위를 불러오는 중…</div>`;
  else if (!cur.length) h += `<div class="empty">아직 아무도 없어요. 첫 번째로 참가해보세요.</div>`;
  else {
    const TOPS = topOwners();
    h += `<div class="card lb lbk">`;
    cur.slice(S.rankPage * RPG, (S.rankPage + 1) * RPG).forEach((p, j) => {
      const i = S.rankPage * RPG + j, lord = lordOf(p.id, TOPS), r = roiOf(p, p.w);
      h += `<button class="lrow${p.id === S.uid ? ' isme' : ''}${okPhoto(p.banner) ? ' bn' : ''}" type="button" data-player="${esc(p.id)}"${okPhoto(p.banner) ? ` style="--bn:url(${p.banner})"` : ''}><span class="rk r${i + 1}">${i + 1}</span><span class="avw${isOn(p) ? ' on' : ''}">${ava(p)}</span>
        <span class="who"><b>${esc(p.name)}</b>${p.bot ? '<span class="tag bot">봇</span>' : ''}<small class="lv">LV.${lvOf(p)}${lord ? ` · <span class="lord">👑 ${lord}</span>` : ''}</small></span>
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
function topOwners() { return Object.fromEntries(Object.entries(guChief()).map(([g, c]) => [g, c.id])); }
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
<div class="sec"><div class="sec-h"><h2>게임</h2></div><button type="button" class="card shopitem" id="shopGame"><span class="si-ic">🎰</span><span class="si-t"><b>홀짝 · 룰렛</b><small>한 판에 크게</small></span><span class="si-go">›</span></button></div>`;
}
// 소식에는 놀릴 거리만 남겨요: 100억 이상 청산, 티배깅, 건물 매입·강제 매입·파괴, 참수 성공한 공격
// 소식 알림 점: 큰 청산·큰 수익·구채·게임 대박만
const brag = f => f && (f.kind === 'k_fliq' || f.kind === 'k_bond' || (f.pnl || 0) >= 1e8 || (f.kind === 'casino' && f.amt >= 1e8));
function renderFeed() {
  const el = $('#tab-feed');
  const items = S.feed.filter(brag).map(f => [f, feedText(f)]).filter(x => x[1]);
  let h = `<div class="sec"><div class="sec-h"><h2>소식</h2><small>큰 수익 · 청산 · 구채</small></div><div class="slist">`;
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
  if (S.board && !S.liveOnly) renderBoard();
  if (S.profile) renderProfile();
  renderMineFab(); rollNums();
}
function goTab(name) {
  S.tab = name; document.querySelectorAll('.nav [data-tab]').forEach(x => x.setAttribute('aria-selected', x.dataset.tab === name));
  ['home', 'coin', 'shop', 'assets'].forEach(n => $('#tab-' + (n === 'assets' ? 'wallet' : n)).hidden = n !== name);
  const bb = $('#boardBtn'); if (bb) bb.hidden = name !== 'home';
  const gb = $('#gameBtn'); if (gb) gb.hidden = name !== 'shop';
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
  b.innerHTML = `<div class="rv-head"><span class="k">SUNBIT</span><h3>10억원으로 시작</h3></div>
    <p class="hint keep" style="text-align:center">진짜 시세 코인(선물 롱·숏)과 미국 주식, 서울 구채를 한 지갑으로 굴려요. 총자산 1등을 노려 보세요.</p>
    <div class="field"><label for="nick" class="dim" style="font-size:13px;font-weight:700">닉네임</label><input id="nick" maxlength="10" placeholder="예: 존버의신" value="${esc(prev)}"></div>
    <p class="hint nickwarn">⚠️ 실명은 쓰지 마세요. 닉네임은 순위·채팅에서 모두에게 보여요.</p>
    <button class="cta" type="button" id="joinBtn">참가하기</button>`;
}
async function doJoin() {
  const inputEl = $('#nick');
  const nick = ((inputEl && inputEl.value) || '').trim().slice(0, 10) || '존버의신';
  LS.set('nick', nick);
  const me = kInit({ name: nick, season: S.season.sid, cash: CASH0, inflow: CASH0, joined: Date.now(), casino: 0, ts: Date.now(), cpH: Math.floor(Date.now() / H) });
  S.saving = true; const ok = await saveMe(me, S.me); S.saving = false;
  if (ok) { addFeed({ kind: 'join' }); closeSheet(); toast('참가 완료!'); renderAll(); }
}
// ? 도움말: 지금 보고 있는 탭에 맞는 설명을 보여줘요
const HELP = {
  home: ['홈', '총자산 순위', [
    '돈은 <b>원화</b> 하나예요. 처음 <b>10억원</b>. 진짜 시세 코인·주식·구채와 게임·상점에 다 같이 써요.',
    '<b>총자산</b> = 현금 + 코인(현물·선물) + 주식 + 구채. 순위는 총자산 순서예요.',
    '<b>파산</b>: 총자산이 100만원 밑으로 떨어지면 거래소 탭에서 <b>1,000만원</b>을 받을 수 있어요.',
    '이름을 누르면 그 사람 지갑이 다 보여요.']],
  coin: ['거래소', '주식 · 코인 · 현물 · 채권', [
    '<b>주식</b>: 미국 24종목, 실시간(프리·애프터 포함). 원화를 실시간 환율로 자동 환전해서 사요. 소수점 거래, 수수료 0.1%. <b>롱·숏 2·3배</b>(해외주식 CFD 방식).',
    '<b>코인</b>: 업비트 실시간. 현물 수수료 0.05%. <b>롱·숏</b> BTC·ETH 100배, 알트 50배, 밈 25배.',
    '<b>현물</b>: 금·은·백금·구리·원유·천연가스. 실시간 달러 가격. <b>롱·숏 2·5·10배</b>.',
    '<b>채권</b>: 서울 25개 구 구채. 가장 많이 가진 사람이 구청장, 매시간 이자.',
    '롱·숏은 약 1÷배수만큼 반대로 가면 <b>청산</b>(증거금 전부 잃음). 펀딩비 8시간마다 0.01%. 앱을 꺼 둬도 분봉 최저·최고가로 확인해요.',
    '오른쪽 아래 <b>💼 내 보유</b>를 누르면 가진 걸 모아 보고 바로 팔기·종료할 수 있어요.']],
  bond: ['구채', '구청장 자리 경쟁 · 원화', [
    '서울 25개 구마다 구채가 <b>100장</b>뿐이에요. 그 구 구채를 <b>가장 많이 가진 사람이 구청장</b>이에요. 같으면 먼저 산 사람.',
    '1장 기본값은 땅값 순서로 <b>강남 1억 ~ 도봉 500만원</b>이에요. 팔린 장수가 늘수록 비싸져서 다 팔리면 2.5배가 되고, 시간에 따라 시세도 출렁여요.',
    '매시간 정각에 <b>이자</b>가 원화로 들어와요. 비싼 구일수록 이자율은 낮아요(강남 0.03% ~ 도봉 0.08%/시간).',
    '팔 때(환매)는 1% 수수료. 남이 사면 내 구채 값도 올라요. 구청장 혜택은 전투 업데이트 때 스탯 보너스로 붙어요.']],
  atk: ['공격', '친구 프로필에서', [
    '<b>💰 수익 약탈</b>: 수익 중인 코인·주식·원자재만 털 수 있어요. 비용 = 그 종목 수익의 25%, 성공 20%. 성공하면 <b>수익 전부</b>를 뺏어 오고 비용도 돌려받아요. 상대 원금은 안 건드려요.',
    '<b>🎯 마진 사냥</b>: 모든 롱·숏. 비용 = 남은 증거금의 10%, 성공 20% + 배수×0.6 (최대 60%). 성공하면 <b>증거금 30%</b>를 뺏고, 그 바람에 청산가에 닿으면 <b>☠️ 참수</b>: 증거금 전부.',
    '실패하면 비용을 잃고 <b>절반은 상대에게 위자료</b>예요.',
    '공격은 10분에 1번, 같은 종목은 30분에 1번. 털린 종목은 <b>3시간 보호막</b>. 공격당하면 10분 동안 그 사람에게 <b>반값 복수</b>.']],
  assets: ['프로필', '나와 내 자산', [
    '맨 위에 총자산·수익률·현금과 자산 구성(현금·코인·선물·주식·구채)이 보여요.',
    '<b>가진 것</b>: 내가 가진 걸 전부 평가금액 순으로 모았어요. 누르면 바로 거래창이 열려요.',
    '사진을 누르면 바꿀 수 있어요. 맨 아래에서 <b>순위 배경</b>(200만원)·<b>닉네임</b>(200만원)을 바로 바꿔요. 친구 프로필도 같은 모양이에요.']],
  shop: ['상점', '현금으로 사는 것들', [
    '<b>⭐ 레벨업</b>: 현금으로 올려요. 올릴 때마다 가격이 1.14배가 돼요.',
    
    '<b>🎰 게임</b>: 홀짝(1.95배)·룰렛(0~10배). 평균 0.975배라 오래 하면 조금씩 잃어요.']],
};
function renderHelp(b) {
  const [t, sub, items] = (S.profile ? HELP.atk : HELP[S.tab]) || HELP.home;
  b.innerHTML = `<div class="shead"><div><h3>${t} 도움말</h3><small>${sub}</small></div></div>
  <ul class="rules">${items.map((x, i) => `<li><span>${i + 1}</span><span>${x}</span></li>`).join('')}</ul>
  <button class="cta soft" type="button" id="sheetX2">닫기</button>`;
}
function maybeJoin() {
  if (S.me || S.readOnly || S.joinShown || S.sheet || S.mode === 'loading') return;
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
