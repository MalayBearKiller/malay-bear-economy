'use strict';
/* ═════════ 시작 · 클릭 연결 · 1초 타이머 ═════════ */
async function boot() {
  syncTime(); gmInit(); S.betPct = LS.get('betPct', '0.1'); if (S.betPct === 'custom') S.betPct = '0.1'; S.feedSeen = LS.get('feedSeen', 0); S.homePin = LS.get('homePin', false); S.udSym = LS.get('udSym', 'KRW-BTC'); S.cg = LS.get('cg', 'ud'); S.homeFlipAt = Date.now(); renderAll();
  const cfg = window.FIREBASE_CONFIG;
  if (cfg && cfg.apiKey) { bootFirebase(cfg); return; }
  startDemo();
}

document.addEventListener('click', e => {
  if (e.target.closest('#brandBtn') && !e.target.closest('button')) { location.reload(); return; }   // 로고 옆 게임 버튼은 제외   // SUNBIT 누르면 새로고침
  const t = e.target.closest('button'); if (!t) return;
  if (kClick(t)) return;
  const d = t.dataset;
  if (d.tab) { if (d.tab === 'shop') S.shopView = null; goTab(d.tab); return; }
  if (d.tabGo) { goTab(d.tabGo); return; }
  if (d.boardtab) { S.board = d.boardtab; renderBoard(); return; }
  if (d.homeview) { S.homeView = d.homeview; S.homeFlipAt = Date.now(); renderHome(); return; }
  if (d.rankpg) { S.rankPage = (S.rankPage || 0) + +d.rankpg; renderHome(); return; }
  if (d.bet) { S.betPct = d.bet; LS.set('betPct', S.betPct); renderCasino(); return; }
  if (d.like) { toggleLike(d.like); return; }
  if (d.del) { deleteTalk(d.del); return; }
  if (t.hasAttribute('data-player')) { if (S.sheet) closeSheet(); openProfile(d.player); return; }
  if (t.hasAttribute('data-join')) { openSheet('join'); return; }
  switch (t.id) {
    case 'homePin': S.homePin = !S.homePin; LS.set('homePin', S.homePin); S.homeFlipAt = Date.now(); renderHome(); break;
    case 'helpBtn': openSheet('help'); break;
    case 'boardBtn': openBoard(); break;
    case 'boardBack': closeBoard(); break;
    case 'boardSend': postBoard(); break;
    case 'profBack': closeProfile(); break;
    case 'lvUp': levelUp(); break;
    case 'lvMax': levelMax(); break;
    case 'shopGame': case 'gameBtn': case 'goGame': case 'promoGo': if (CASINO_OFF) { toast('🔒 도박장은 잠시 문을 닫았어요'); break; } S.shopView = 'game'; goTab('shop'); break;
    case 'shopBack': S.shopView = null; renderShop(); break;
    case 'photoBtn': case 'photoBtn2': pickPhoto('photo'); break;
    case 'photoDel': clearPhoto(); break;
    case 'bannerBtn': if (!S.me || !(S.me.bannerTk > 0)) { toast('🔒 변경권이 없어요'); break; } pickPhoto('banner'); break;
    case 'bannerBuy': case 'bannerPick': if (!S.me) break; if (S.me.cash < BANNER_COST) { toast(`현금이 ${won(BANNER_COST - S.me.cash)} 부족해요`); break; } pickPhoto('banner'); break;
    case 'bannerDel': clearBanner(); break;
    case 'renameOpen': if (S.me) openSheet('rename'); break;
    case 'renameBtn': doRename(); break;
    case 'joinBtn': doJoin(); break;
    case 'sheetX': case 'sheetX2': closeSheet(); break;
    case 'googleBtn': t.disabled = true; S.fb.signIn().catch(() => toast('로그인하지 못했어요. 다시 시도해 주세요.')).finally(() => { t.disabled = false; }); break;
    case 'demoBtn': $('#login').hidden = true; document.body.classList.remove('noscroll'); startDemo(); break;
    case 'logoutBtn': S.fb.signOut().then(() => location.reload()); break;
  }
});
$('#scrim').addEventListener('click', closeSheet);
['touchstart', 'touchmove', 'wheel'].forEach(ev => document.addEventListener(ev, e => { if (e.target.closest && e.target.closest('.chips')) chipsTouchAt = Date.now(); }, { passive: true }));
document.addEventListener('change', e => { if (e.target.id === 'photoIn' && e.target.files && e.target.files[0]) savePhoto(e.target.files[0], PICK); });
document.addEventListener('input', e => {
  if (e.target.id === 'boardInput') S.boardDraft = e.target.value;
  if (e.target.id === 'betInput') { S.betCustom = Math.max(0, Math.floor(+e.target.value || 0)); LS.set('betCustom', S.betCustom); updateBetLabels(); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && S.sheet) closeSheet();
  if (e.key === 'Enter' && e.target.id === 'nick') doJoin();
  if (e.key === 'Enter' && e.target.id === 'boardInput' && !e.isComposing) { e.preventDefault(); postBoard(); }
});

// 1초마다: 시세 확인·이자·청산 확인 → 열린 거래창 갱신 → 지금 탭 다시 그리기
setInterval(() => {
  syncTime(); gmTick(); kTick(); kLiveSheet(); heartbeat(); atkSync(); snipeSync(); loanSync(); rumorTick(); duelTick(); duelSync(); top1Track(); if (typeof bountyTick === 'function') bountyTick(); renderDuelBar(); udTick();
  // 홈: 순위 ↔ 지도 10초마다 번갈아 (고정 안 했을 때, 창이 안 떠 있을 때)
  if (S.tab === 'home' && !S.homePin && !S.sheet && !S.profile && !S.board && Date.now() - (S.homeFlipAt || 0) >= 10000) { S.homeView = S.homeView === 'map' ? 'rank' : 'map'; S.homeFlipAt = Date.now(); renderHome(); }
  S.liveOnly = true; renderAll(); S.liveOnly = false;
}, 1000);
window.__sunbit = { S };
// 🔄 새 버전이 올라오면 자동으로 새로고침해요 (1분마다, 그리고 앱으로 돌아올 때 확인)
const APP_V = ((document.querySelector('script[src*="main.js"]') || {}).src || '').split('v=')[1] || '';
let VCHK = 0;
async function checkVersion() {
  if (!APP_V || Date.now() - VCHK < 30e3) return; VCHK = Date.now();
  try { const html = await (await fetch(location.pathname + '?vc=' + Date.now(), { cache: 'no-store' })).text(); const v = (html.match(/main\.js\?v=([^"']+)/) || [])[1];
    if (v && v !== APP_V) { toast('🔄 새 버전이 나왔어요. 새로고침할게요'); setTimeout(() => location.reload(), 1500); } } catch {}
}
setInterval(checkVersion, 60e3);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkVersion(); });
// 연습 모드 버튼은 주소 끝에 ?test 를 붙였을 때만 보여요 (테스트용)
if (/[?&]test\b/.test(location.search)) { const db = document.getElementById('demoBtn'); if (db) db.hidden = false; }
boot();
