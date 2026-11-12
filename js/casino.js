'use strict';
/* ═════════ 🎰 도박장: 게임 5개 (위에서 하나 골라서 해요) ═════════
   ⚡ 1분 업다운(updown.js) · 🚀 로켓 · 💣 보물상자 · 🎰 슬롯 · 🏇 경마
   모두 같은 베팅 금액(betAmount)을 써요. 평균 돌려받는 비율은 94~97%라 오래 하면 조금씩 잃어요.
   로켓·보물상자는 시작할 때 건 돈을 먼저 빼고(저장), 멈추거나 끝날 때 받은 돈을 넣어요. 중간에 앱을 끄면 그 판은 잃어요. */
// 🔒 도박장 잠금 (2026-11-12): true면 들어갈 수 없어요. 다시 열려면 false로
const CASINO_OFF = true;
const CG = [
  ['ud', '⚡', '업다운', '2.3배'], ['rocket', '🚀', '로켓', '100배'], ['mine', '💣', '보물상자', '35배'],
  ['slot', '🎰', '슬롯', '500배'], ['race', '🏇', '경마', '3.8배'],
];
const cgCur = () => (CG.some(([k]) => k === S.cg) ? S.cg : 'ud');
// 판돈이 클수록 최대 배수가 줄어요: 1억 이하 300배 → 10억 20배 (그 사이는 로그로 이어요)
const cgCap = bet => (bet <= 1e8 ? 300 : bet >= 1e9 ? 20 : Math.round(300 * Math.pow(20 / 300, Math.log10(bet / 1e8))));
const fmtX = m => (m >= 10 ? m.toFixed(1) : m.toFixed(2)) + 'x';

// 돈 넣고 빼기: d만큼 현금을 바꾸고 게임 손익(casino)에도 더해요
async function cMoney(d) {
  if (!S.me) return false; const before = S.me, me = clone(before);
  me.cash = Math.round(me.cash + d); me.casino = (me.casino || 0) + Math.round(d);
  return await saveMe(me, before);
}
function cFeed(label, mult, net, bet) { if ((mult >= 3 && net > 0) || net >= 1e8 || (mult === 0 && bet >= 1e8)) addFeed({ kind: 'casino', game: label, mult, amt: Math.round(net) }); }
function cWin(net, label) { if (net > 0) bigWin(net, label); }
function cLose(txt) { toast(txt); document.body.classList.remove('shake'); void document.body.offsetWidth; document.body.classList.add('shake'); buzz(80); }
const cCanBet = () => { const b = betAmount(); if (!S.me || S.saving || C.busy || S.readOnly) return 0; if (b < MINBET) { toast('걸 금액을 정해주세요'); return 0; } return b; };

function casinoPickerHTML() {
  const cur = cgCur();
  return `<div class="cgames">${CG.map(([k, ic, n, mx]) => `<button type="button" data-cg="${k}" aria-pressed="${k === cur}" ${C.busy || C.live ? 'disabled' : ''}><span class="cg-ic">${ic}</span><b>${n}</b><small>최대 ${mx}</small></button>`).join('')}</div>`;
}
function casinoGameHTML() {
  const g = cgCur();
  if (g === 'ud') return udCardHTML();
  if (g === 'rocket') return rocketHTML();
  if (g === 'mine') return mineHTML();
  if (g === 'slot') return slotHTML();
  return raceHTML();
}

/* ───────── 🚀 로켓: 배수가 계속 올라가요. 터지기 전에 STOP ─────────
   터지는 지점: 1/배수 확률로 살아남아요(×0.97). 3%는 1.00x에서 바로 터져요. 최대 100배 */
const RK = { MAX: 100, raf: 0 };
const rkAt = t => Math.min(RK.MAX, Math.exp(t * 0.32));   // t초 → 배수 (2배 약 2.2초, 10배 약 7.2초)
function rocketHTML() {
  const r = C.rk, live = r && r.live, bet = betAmount();
  return `<div class="card game cgame rocket${live ? ' live' : ''}${r && r.boom ? ' boom' : ''}" id="rkCard">
    <div class="cg-h"><div><h3>🚀 로켓</h3><p class="desc">배수가 계속 올라가요. 터지기 전에 STOP!</p></div></div>
    <div class="rk-sky" id="rkSky"><i class="rk-stars"></i><i class="rk-stars s2"></i>
      <span class="rk-ship" id="rkShip">🚀</span><b class="rk-x num" id="rkX">${r ? fmtX(r.m) : '1.00x'}</b>
      <small class="rk-msg" id="rkMsg">${r && !live ? r.msg : '최대 100배'}</small></div>
    ${live ? `<button class="cta buy rk-stop" type="button" id="rkStop">💰 STOP · <span id="rkGet">${won(Math.floor(r.bet * r.m))}</span></button>`
      : `<button class="cta" type="button" id="rkGo" ${bet < MINBET || C.busy ? 'disabled' : ''}>🚀 <span data-betlbl>${won(bet)}</span> 걸고 발사</button>`}
    ${(C.rkHist || []).length ? `<div class="cg-hist">${C.rkHist.slice(-8).map(x => `<i class="${x >= 2 ? 'hi' : x < 1.2 ? 'lo' : ''}">${fmtX(x)}</i>`).join('')}</div>` : ''}
  </div>`;
}
async function rocketGo() {
  const bet = cCanBet(); if (!bet) return;
  const u = Math.random(), crash = Math.min(RK.MAX, Math.max(1, Math.floor(97 / (100 * (1 - u)) * 100) / 100));
  C.busy = true; if (!(await cMoney(-bet))) { C.busy = false; return; }
  C.live = true; C.busy = false; C.rk = { live: true, bet, m: 1, crash, cap: Math.min(RK.MAX, cgCap(bet)), t0: performance.now() };
  renderCasino(); buzz(20);
  const step = t => {
    const r = C.rk; if (!r || !r.live) return;
    r.m = rkAt((t - r.t0) / 1000);
    if (r.m >= r.cap && r.crash >= r.cap) { r.m = r.cap; rocketEnd(true); return; }   // 최대 배수 도달 → 자동으로 받아요
    if (r.m >= r.crash) { r.m = r.crash; rocketEnd(false); return; }
    const x = $('#rkX'), g = $('#rkGet'), sh = $('#rkShip'), sky = $('#rkSky');
    if (x) { x.textContent = fmtX(r.m); x.style.color = r.m >= 10 ? '#ff3bd4' : r.m >= 3 ? '#ffcf4a' : r.m >= 2 ? '#5df2a0' : ''; }
    if (g) g.textContent = won(Math.floor(r.bet * r.m));
    const k = Math.min(1, Math.log(r.m) / Math.log(20));
    if (sh) sh.style.transform = `translate(${-40 + k * 80}px, ${40 - k * 80}px) rotate(${-8 + Math.sin(t / 60) * (2 + k * 6)}deg) scale(${1 + k * .35})`;
    if (sky) sky.style.setProperty('--spd', (1.6 - k * 1.3).toFixed(2) + 's');
    RK.raf = requestAnimationFrame(step);
  };
  RK.raf = requestAnimationFrame(step);
}
async function rocketEnd(cash) {
  const r = C.rk; if (!r || !r.live) return; r.live = false; cancelAnimationFrame(RK.raf);
  C.rkHist = [...(C.rkHist || []), r.crash].slice(-20);
  if (cash) {
    const pay = Math.floor(r.bet * r.m), net = pay - r.bet; r.msg = `💰 ${fmtX(r.m)}에 탈출! <b class="up">+${won(net)}</b> <span class="dim">(터진 곳 ${fmtX(r.crash)})</span>`;
    C.busy = true; await cMoney(pay); C.busy = false; C.live = false; renderCasino(); cWin(net, `🚀 ${fmtX(r.m)} 탈출 성공`); cFeed('로켓 ' + fmtX(r.m), +r.m.toFixed(2), net, r.bet);
  } else {
    r.boom = true; r.msg = `💥 ${fmtX(r.crash)}에서 펑! <b class="down">-${won(r.bet)}</b>`;
    C.live = false; renderCasino(); cLose(`💥 로켓이 ${fmtX(r.crash)}에서 터졌어요… -${won(r.bet)}`); cFeed('로켓', 0, -r.bet, r.bet);
    setTimeout(() => { if (C.rk === r) { r.boom = false; const c = $('#rkCard'); if (c) c.classList.remove('boom'); } }, 900);
  }
  renderAll();
}

/* ───────── 💣 보물상자: 9개 중 폭탄 2개. 열 때마다 배수가 올라가요. 언제든 그만두고 받기 ───────── */
const MN = { N: 9, B: 2 };
const mnMult = k => { let m = .97; for (let i = 0; i < k; i++) m *= (MN.N - i) / (MN.N - MN.B - i); return k ? m : 1; };
function mineHTML() {
  const r = C.mn, live = r && r.live, bet = betAmount(), k = r ? r.open.length : 0;
  const steps = Array.from({ length: MN.N - MN.B }, (_, i) => mnMult(i + 1));
  return `<div class="card game cgame mine${r && r.boom ? ' boom' : ''}" id="mnCard">
    <div class="cg-h"><div><h3>💣 보물상자</h3><p class="desc">상자 9개 중 폭탄 2개. 열수록 배수가 올라가요!</p></div></div>
    <div class="mn-steps">${steps.map((m, i) => `<i class="${i < k ? 'done' : i === k && live ? 'next' : ''}">${fmtX(m)}</i>`).join('')}</div>
    <div class="mn-grid">${Array.from({ length: MN.N }, (_, i) => { const opened = r && r.open.includes(i), bomb = r && !live && r.bombs.includes(i), show = opened || (r && !live);
      return `<button type="button" class="mn-box${opened ? ' gem' : ''}${show && bomb ? ' bomb' : ''}${show && !opened && !bomb ? ' dim' : ''}" data-mn="${i}" ${live && !opened ? '' : 'disabled'}>${show ? (bomb ? '💣' : '💎') : '🎁'}</button>`; }).join('')}</div>
    <p class="res">${r && !live ? r.msg : live ? (k ? `지금 받으면 <b class="up">${won(Math.floor(r.bet * mnMult(k)))}</b> · 다음 ${fmtX(mnMult(k + 1))}` : '아무 상자나 열어 보세요') : ''}</p>
    ${live ? `<button class="cta buy" type="button" id="mnCash" ${k ? '' : 'disabled'}>💰 그만하고 받기 · ${won(Math.floor(r.bet * mnMult(k)))}</button>`
      : `<button class="cta" type="button" id="mnGo" ${bet < MINBET || C.busy ? 'disabled' : ''}>💣 <span data-betlbl>${won(bet)}</span> 걸고 시작</button>`}
  </div>`;
}
async function mineGo() {
  const bet = cCanBet(); if (!bet) return;
  const bombs = []; while (bombs.length < MN.B) { const i = Math.floor(Math.random() * MN.N); if (!bombs.includes(i)) bombs.push(i); }
  C.busy = true; if (!(await cMoney(-bet))) { C.busy = false; return; }
  C.busy = false; C.live = true; C.mn = { live: true, bet, bombs, open: [] }; renderCasino(); buzz(20);
}
async function mineOpen(i) {
  const r = C.mn; if (!r || !r.live || r.open.includes(i)) return;
  if (r.bombs.includes(i)) {
    r.live = false; r.boom = true; r.open.push(i); r.msg = `💥 폭탄! <b class="down">-${won(r.bet)}</b>`; C.live = false;
    renderCasino(); cLose(`💣 폭탄이에요… -${won(r.bet)}`); cFeed('보물상자', 0, -r.bet, r.bet); renderAll(); return;
  }
  r.open.push(i); buzz(25 + r.open.length * 8);
  if (r.open.length >= MN.N - MN.B) { mineCash(); return; }   // 다 열면 자동으로 받아요
  renderCasino(); const b = document.querySelector(`[data-mn="${i}"]`); if (b) b.classList.add('pop');
}
async function mineCash() {
  const r = C.mn; if (!r || !r.live || !r.open.length) return; r.live = false;
  const m = Math.min(mnMult(r.open.length), cgCap(r.bet)), pay = Math.floor(r.bet * m), net = pay - r.bet;
  r.msg = `💎 ${r.open.length}개 성공 · ${fmtX(m)} <b class="up">+${won(net)}</b>`;
  C.busy = true; await cMoney(pay); C.busy = false; C.live = false; renderCasino(); cWin(net, `💎 보물 ${r.open.length}개 · ${fmtX(m)}`); cFeed('보물상자 ' + fmtX(m), +m.toFixed(2), net, r.bet); renderAll();
}

/* ───────── 🎰 슬롯: 3줄이 같으면 대박 (평균 94%) ─────────
   🍒 3개 3배 · 🍋 8배 · 🔔 30배 · 💎 80배 · 7️⃣ 500배 · 🍒 딱 2개면 본전 */
const SL = { sym: ['🍒', '🍋', '🔔', '💎', '7️⃣'], w: [8, 6, 3, 2, 1], pay: { '🍒': 3, '🍋': 8, '🔔': 30, '💎': 80, '7️⃣': 500 } };
const slPick = () => { let x = Math.random() * 20; for (let i = 0; i < SL.w.length; i++) { x -= SL.w[i]; if (x < 0) return SL.sym[i]; } return SL.sym[0]; };
function slMult(a) { if (a[0] === a[1] && a[1] === a[2]) return SL.pay[a[0]]; return a.filter(s => s === '🍒').length === 2 ? 1 : 0; }
function slotHTML() {
  const r = C.sl, bet = betAmount(), cur = (r && r.res) || ['7️⃣', '7️⃣', '7️⃣'];
  return `<div class="card game cgame slot${r && r.big ? ' jack' : ''}" id="slCard">
    <div class="cg-h"><div><h3>🎰 슬롯</h3><p class="desc">세 줄을 맞춰라! 7️⃣7️⃣7️⃣ = 500배</p></div></div>
    <div class="sl-box"><div class="sl-reels">${[0, 1, 2].map(i => `<div class="sl-reel" id="slR${i}"><div class="sl-strip">${cur[i]}</div></div>`).join('')}</div><i class="sl-line"></i></div>
    <div class="sl-pay">${SL.sym.map(s => `<span>${s}${s}${s} <b>${SL.pay[s]}배</b></span>`).join('')}<span>🍒🍒 <b>본전</b></span></div>
    <p class="res" id="slMsg">${r && r.msg ? r.msg : ''}</p>
    <button class="cta" type="button" id="slGo" ${bet < MINBET || C.busy ? 'disabled' : ''}>🎰 <span data-betlbl>${won(bet)}</span> 걸고 당기기</button>
  </div>`;
}
async function slotGo() {
  const bet = cCanBet(); if (!bet) return;
  const res = [slPick(), slPick(), slPick()], mult = Math.min(slMult(res), cgCap(bet));
  C.busy = true; C.sl = { res: null, msg: '' }; renderCasino(); buzz(15);
  // 줄마다 빠르게 돌다가 하나씩 멈춰요. 앞 두 줄이 같으면 마지막 줄을 더 오래 돌려서 쫄깃하게
  const tease = res[0] === res[1];
  const stopAt = [700, 1150, tease ? 2300 : 1600];
  const t0 = performance.now(); const shown = [0, 0, 0];
  await new Promise(done => {
    const tick = t => {
      let all = true;
      for (let i = 0; i < 3; i++) { const el = $('#slR' + i); if (!el) continue; const s = el.firstElementChild;
        if (t - t0 < stopAt[i]) { all = false; if (t - shown[i] > 70) { shown[i] = t; s.textContent = SL.sym[Math.floor(Math.random() * 5)]; el.classList.add('spin'); } }
        else if (el.classList.contains('spin')) { el.classList.remove('spin'); s.textContent = res[i]; el.classList.add('stop'); buzz(15); if (i === 1 && tease) el.parentElement.classList.add('tease'); } }
      if (all) done(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const pay = Math.floor(bet * mult), net = pay - bet;
  await cMoney(net); C.busy = false;
  C.sl = { res, big: mult >= 30, msg: mult > 1 ? `${res.join('')} <b class="up">${mult}배! +${won(net)}</b>` : mult === 1 ? '🍒🍒 본전!' : `꽝 <b class="down">-${won(bet)}</b>` };
  renderCasino();
  if (mult > 1) { cWin(net, mult >= 30 ? `🎰 잭팟 ${mult}배!!` : `🎰 ${mult}배`); if (mult >= 30) confetti(); } else if (!mult) buzz(30);
  cFeed('슬롯 ' + res.join(''), mult, net, bet); renderAll();
}

/* ───────── 🏇 경마: 4마리 중 1등을 맞혀요 (3.8배) ───────── */
const RC = { N: 4, PAY: 3.8, col: ['#f2414f', '#2f78ee', '#16b27e', '#f2b300'], nm: ['번개', '폭주', '질주', '황금'] };
function raceHTML() {
  const r = C.rc, bet = betAmount(), pick = C.rcPick ?? null;
  return `<div class="card game cgame race" id="rcCard">
    <div class="cg-h"><div><h3>🏇 경마</h3><p class="desc">1등할 말을 골라요. 맞히면 3.8배!</p></div></div>
    <div class="rc-track">${Array.from({ length: RC.N }, (_, i) => `<div class="rc-lane${r && r.win === i && !r.run ? ' win' : ''}${pick === i ? ' mine' : ''}" style="--c:${RC.col[i]}"><span class="rc-no">${i + 1}</span><span class="rc-horse" id="rcH${i}" style="left:${r ? r.pos[i] * 82 : 0}%">🏇</span><i class="rc-goal"></i></div>`).join('')}</div>
    <div class="rc-pick">${Array.from({ length: RC.N }, (_, i) => `<button type="button" data-rcp="${i}" aria-pressed="${pick === i}" style="--c:${RC.col[i]}" ${C.busy ? 'disabled' : ''}><b>${i + 1}번</b><small>${RC.nm[i]}</small></button>`).join('')}</div>
    <p class="res" id="rcMsg">${r && r.msg ? r.msg : ''}</p>
    <button class="cta" type="button" id="rcGo" ${bet < MINBET || C.busy || pick == null ? 'disabled' : ''}>${pick == null ? '말을 먼저 골라요' : `🏇 ${pick + 1}번에 <span data-betlbl>${won(bet)}</span> 걸기`}</button>
  </div>`;
}
async function raceGo() {
  const pick = C.rcPick; if (pick == null) return; const bet = cCanBet(); if (!bet) return;
  C.busy = true; const r = C.rc = { run: true, pos: [0, 0, 0, 0], spd: [0, 0, 0, 0], win: -1, msg: '' }; renderCasino();
  await new Promise(done => {
    let last = performance.now();
    const tick = t => {
      const dt = Math.min(50, t - last) / 1000; last = t;
      for (let i = 0; i < RC.N; i++) { if (Math.random() < .08) r.spd[i] = .12 + Math.random() * .16; r.spd[i] ||= .15; r.pos[i] = Math.min(1, r.pos[i] + r.spd[i] * dt); const h = $('#rcH' + i); if (h) h.style.left = r.pos[i] * 82 + '%'; }
      const lead = r.pos.indexOf(Math.max(...r.pos)); document.querySelectorAll('.rc-lane').forEach((l, i) => l.classList.toggle('lead', i === lead));
      const fin = r.pos.findIndex(p => p >= 1); if (fin >= 0) { r.win = fin; done(); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  r.run = false; const ok = r.win === pick, pay = ok ? Math.floor(bet * RC.PAY) : 0, net = pay - bet;
  await cMoney(net); C.busy = false;
  r.msg = ok ? `🏆 ${pick + 1}번 1등! <b class="up">+${won(net)}</b>` : `${r.win + 1}번이 1등… <b class="down">-${won(bet)}</b>`;
  renderCasino(); if (ok) cWin(net, `🏇 ${pick + 1}번 우승!`); else cLose(`🏇 ${r.win + 1}번이 이겼어요… -${won(bet)}`);
  cFeed('경마', ok ? RC.PAY : 0, net, bet); renderAll();
}

document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('button'); if (!t) return;
  if (t.dataset.cg) { if (C.busy || C.live) return; S.cg = t.dataset.cg; LS.set('cg', S.cg); renderCasino(); return; }
  if (t.dataset.mn != null) { mineOpen(+t.dataset.mn); return; }
  if (t.dataset.rcp != null) { if (C.busy) return; C.rcPick = +t.dataset.rcp; renderCasino(); return; }
  switch (t.id) {
    case 'rkGo': rocketGo(); break;
    case 'rkStop': rocketEnd(true); break;
    case 'mnGo': mineGo(); break;
    case 'mnCash': mineCash(); break;
    case 'slGo': slotGo(); break;
    case 'rcGo': raceGo(); break;
  }
});
