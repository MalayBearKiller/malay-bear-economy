'use strict';
/* 🎡 룰렛·홀짝 — 2026-11-13에 도박장을 게임 5개(js/casino.js)로 바꾸면서 뺐어요. 원래 js/ui.js에 있었어요.
   WHEEL·WSEG·COIN_PAY 상수는 js/core.js에 그대로 있어요. */
function wheelBg() { const cols = ['#6a4cf5', '#f5f5f9']; return 'conic-gradient(' + WHEEL.map((m, i) => `${m === 0 ? '#ececf2' : m >= 2 ? '#ffcf4a' : m >= 1 ? '#c3b7ff' : '#e4deff'} ${i * WSEG}deg ${(i + 1) * WSEG}deg`).join(',') + ')'; }
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
