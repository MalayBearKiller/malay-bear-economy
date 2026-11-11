'use strict';
async function boot() {
  syncTime(); S.lastLive = liveStep(now()); S.betPct = LS.get('betPct', '0.1'); if (S.betPct === 'custom') S.betPct = '0.1'; S.slot = slotOf(now()); S.rival = LS.get('rival', null); S.feedSeen = LS.get('feedSeen', 0); renderAll();
  const cfg = window.FIREBASE_CONFIG;
  if (cfg && cfg.apiKey) { bootFirebase(cfg); return; }
  let db = null, user = null;
  try { if (window.claude && window.claude.use) [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); } catch {}
  const uid = user ? await user.id() : null;
  if (!db || !uid) { startDemo(); return; }
  try { if ((await user.can('data.write')) === false) S.readOnly = true; } catch {}
  startLive(db, uid);
}

/* ───────── events ───────── */
document.addEventListener('click', e => {
  if (e.target.closest('#seoulMap')) return;
  const pin = e.target.closest('[data-estate]'); if (pin) { openSheet('estate', { bid: pin.dataset.estate }); return; }
  const t = e.target.closest('button'); if (!t) return;
  if (kClick(t)) return;
  if (t.dataset.rankcur) { S.rankCur = t.dataset.rankcur; S.rankPage = 0; renderHome(); return; }
  if (t.dataset.tab) { if (t.dataset.tab === 'shop') S.shopView = null; goTab(t.dataset.tab); return; }
  if (t.dataset.tabGo) { if (t.dataset.tabGo === 'assets') S.sub = 'wallet'; goTab(t.dataset.tabGo); return; }
  if (t.dataset.sub) { if (t.dataset.sub === 'estate') { goTab('estate'); return; } S.sub = t.dataset.sub; goTab('assets'); return; }
  if (t.dataset.wsub) { S.wsub = t.dataset.wsub; renderWallet(); return; }
  if (t.dataset.estact) { estAction(t.dataset.estact); return; }
  if (t.dataset.tbag) { teabag(t.dataset.tbag); return; }
  if (t.dataset.estpg) { S.estPage = (S.estPage || 0) + +t.dataset.estpg; renderInvest(); return; }
  if (t.dataset.inv) { S.inv = t.dataset.inv; renderInvest(); window.scrollTo({ top: 0 }); return; }
  if (t.dataset.boardtab) { S.board = t.dataset.boardtab; renderBoard(); return; }
  if (t.dataset.homeview) { S.homeView = t.dataset.homeview; renderHome(); window.scrollTo(0, 0); return; }
  if (t.dataset.eqsec) { S.eqSec = t.dataset.eqsec; renderAll(); return; }
  if (t.dataset.homesec) { S.homeSec = t.dataset.homesec; renderAll(); return; }
  if (t.dataset.rankpg) { S.rankPage = (S.rankPage || 0) + +t.dataset.rankpg; renderHome(); return; }
  if (t.dataset.bet) { S.betPct = t.dataset.bet; LS.set('betPct', S.betPct); renderCasino(); return; }
  if (t.dataset.coin) { playCasino('coin', t.dataset.coin); return; }
  if (t.dataset.filter) { S.filter = t.dataset.filter; renderMarket(); return; }
  if (t.dataset.vote) { castVote(t.dataset.vote); return; }
  if (t.dataset.like) { toggleLike(t.dataset.like); return; }
  if (t.dataset.del) { deleteTalk(t.dataset.del); return; }
  if (t.dataset.quick) {
    if (!S.me) { if (S.readOnly) toast('관전 중이라 거래할 수 없어요'); else openSheet('join'); return; }
    openSheet('quick', { sym: t.dataset.sym, m: t.dataset.quick, q: 0, x: isEq(t.dataset.sym) ? 10 : 25 }); return;
  }
  if (t.dataset.stock) { if (S.sheet) closeSheet(); openDetail(t.dataset.stock); return; }
  if (t.hasAttribute('data-player')) { if (S.sheet) closeSheet(); openProfile(t.dataset.player); return; }
  if (t.dataset.ptab) { S.ptab = t.dataset.ptab; renderProfile(); return; }
  if (t.hasAttribute('data-join')) { openSheet('join'); return; }
  if (t.dataset.atk) { const [uid, kind, sym] = t.dataset.atk.split(':'); attackPosition(uid, kind, sym); return; }
  if (t.dataset.closepos) { const [kind, sym] = t.dataset.closepos.split(':'); closePositions(x => x.kind === kind && x.sym === sym); return; }
  if (t.dataset.levd) { S.sheet.dir = t.dataset.levd; S.sheet.q = 0; renderSheet(); return; }
  if (t.dataset.levx) { S.sheet.x = +t.dataset.levx; S.sheet.q = 0; renderSheet(); return; }
  if (t.dataset.m) { S.sheet.m = t.dataset.m; S.sheet.q = 0; renderSheet(); return; }
  if (t.dataset.step) { const i = $('#qty'), sy = S.sheet.sym, st = isCoin(sy) ? Math.max(1, Math.round(cf(sy))) : 1; i.value = qOut(sy, Math.max(0, qIn(sy, i.value) + st * +t.dataset.step)); updateTradeEst(); return; }
  if (t.dataset.frac) { const mx = maxQty(S.sheet.m, S.sheet.sym); $('#qty').value = qOut(S.sheet.sym, Math.floor(mx * +t.dataset.frac)); updateTradeEst(); return; }
  switch (t.id) {
    case 'helpBtn': openSheet('help'); break;
    case 'boardBtn': openBoard(); break;
    case 'sheetX2': closeSheet(); break;
    case 'posOpen': openSheet('pos'); break;
    case 'lvUp': levelUp(); break;
    case 'lvMax': levelMax(); break;
    case 'shopGame': case 'gameBtn': S.shopView = 'game'; goTab('shop'); break;
    case 'shopBack': S.shopView = null; renderShop(); break;
    case 'boardBack': closeBoard(); break;
    case 'profBack': closeProfile(); break;
    case 'profRival': S.rival = S.rival === S.profile ? null : S.profile; LS.set('rival', S.rival); toast(S.rival ? '⚔️ 라이벌 지정!' : '라이벌을 해제했어요'); renderProfile(); renderAll(); break;
    case 'boardSend': postBoard(); break;
    case 'photoBtn': case 'photoBtn2': pickPhoto('photo'); break;
    case 'bannerBtn': if (!S.me || !(S.me.bannerTk > 0)) { toast('🔒 변경권이 없어요'); break; } pickPhoto('banner'); break;
    case 'bannerBuy': buyBannerTicket(); break;
    case 'bannerDel': clearBanner(); break;
    case 'photoDel': clearPhoto(); break;
    case 'renameOpen': if (S.me) openSheet('rename'); break;
    case 'renameBtn': doRename(); break;
    case 'estAct': break;
    case 'rescueBtn': claimRescue(); break;
    case 'closeAllBtn': if (S.closeAllAt && Date.now() - S.closeAllAt < 4000) closePositions(hudFilter()); else { S.closeAllAt = Date.now(); renderAll(); if (S.sheet && S.sheet.type === 'pos') renderSheet(); } break;
    case 'zoomIn': zoomAt(1.6, S.mapV.x + S.mapV.w / 2, S.mapV.y + S.mapV.h / 2, true); break;
    case 'zoomOut': zoomAt(1 / 1.6, S.mapV.x + S.mapV.w / 2, S.mapV.y + S.mapV.h / 2, true); break;
    case 'zoomReset': { const h = MAP.w0 * mapAR(); S.mapV = { x: MAP.x0, y: MAP.y0 + MAP.h0 / 2 - h / 2, w: MAP.w0, h }; applyMapView(); break; }
    case 'googleBtn': t.disabled = true; S.fb.signIn().catch(() => toast('로그인하지 못했어요. 다시 시도해 주세요.')).finally(() => { t.disabled = false; }); break;
    case 'demoBtn': $('#login').hidden = true; document.body.classList.remove('noscroll'); startDemo(); break;
    case 'logoutBtn': S.fb.signOut().then(() => location.reload()); break;
    case 'detailBack': closeDetail(); break;
    case 'talkSend': postTalk(); break;
    case 'spinBtn': playCasino('wheel'); break;
    case 'sheetX': case 'revealOk': closeSheet(); break;
    case 'doTrade': doTrade(); break;
    case 'joinBtn': doJoin(); break;
    case 'spyBtn': doSpy(S.sheet.id); break;
    case 'rivalBtn': S.rival = S.rival === S.sheet.id ? null : S.sheet.id; LS.set('rival', S.rival); toast(S.rival ? '⚔️ 라이벌 지정! 홈 화면에 줄다리기가 떠요' : '라이벌을 해제했어요'); renderAll(); renderSheet(); break;
  }
});
$('#scrim').addEventListener('click', closeSheet);
['touchstart', 'touchmove', 'wheel'].forEach(ev => document.addEventListener(ev, e => { if (e.target.closest && e.target.closest('.chips')) chipsTouchAt = Date.now(); }, { passive: true }));
document.addEventListener('scroll', e => { if (e.target.classList && e.target.classList.contains('chips')) chipsTouchAt = Date.now(); }, true);
document.addEventListener('change', e => { if (e.target.id === 'photoIn' && e.target.files && e.target.files[0]) savePhoto(e.target.files[0], PICK); });
document.addEventListener('keydown', e => { if (e.target.id === 'boardInput' && e.key === 'Enter' && !e.isComposing) { e.preventDefault(); postBoard(); } });
document.addEventListener('input', e => { if (e.target.id === 'boardInput') S.boardDraft = e.target.value; if (e.target.id === 'betInput') { S.betCustom = Math.max(0, Math.floor(+e.target.value || 0)); LS.set('betCustom', S.betCustom); updateBetLabels(); } if (e.target.id === 'qty') updateTradeEst(); if (e.target.id === 'talkInput' && S.detail) S.drafts[S.detail] = e.target.value; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (S.sheet) closeSheet(); else if (S.detail) closeDetail(); } if (e.key === 'Enter' && e.target.id === 'nick') doJoin(); if (e.key === 'Enter' && e.target.id === 'talkInput' && !e.isComposing) postTalk(); });
window.addEventListener('resize', () => { clearTimeout(window.__rz); window.__rz = setTimeout(() => { if (S.tab === 'home') renderHome(); drawIndexChart(); drawBig(); }, 150); });

setInterval(() => {
  let changed = syncTime();
  feedAlerts(); saveWinBase(); collectComp(); kTick(); kLiveSheet();
  const sl = slotOf(now()); if (sl !== S.slot) { S.slot = sl; changed = true; }
  autoCredit();
  const ls = liveStep(now());
  if (!changed && ls !== S.lastLive) {
    const old = {}; STOCKS.forEach(x => old[x.id] = px(x.id, S.tick));
    S.lastLive = ls; LV.flash = {};
    STOCKS.forEach(x => { const v = px(x.id, S.tick); if (old[x.id] && v !== old[x.id]) LV.flash[x.id] = v > old[x.id] ? 'u' : 'd'; });
    S.liveOnly = true; renderAll(); S.liveOnly = false; LV.flash = null;
    lqScan(); checkLiquidation();
    const lc = $('#levCard'); if (lc && S.sheet && S.sheet.sym && S.me) { const o = (S.me.lev || {})[S.sheet.sym]; if (o) { const r = levROE(o, px(S.sheet.sym, S.tick)); lc.className = 'levcard ' + cls(r); lc.querySelector('b').textContent = pctTxt(r); } }
    const sh = S.sheet;
    if (sh && (sh.type === 'player' || sh.type === 'pos')) renderSheet();
    if (sh && sh.sym && (sh.type === 'stock' || sh.type === 'quick')) {
      const lp = $('#livePrice'), pc = $('#livePct'); const v = px(sh.sym, S.tick), c = nowChg(sh.sym);
      if (lp) lp.textContent = PW(sh.sym, v);
      if (pc) { pc.className = 'num ' + cls(c); pc.textContent = (sh.type === 'stock' ? '2시간 ' : '') + pctTxt(c); }
      if (sh.type === 'stock') drawBig();
    }
    return;
  }
  if (changed) { renderAll(); if (S.sheet && S.sheet.type !== 'reveal') renderSheet(); maybeReveal(); }
  else renderClock();
}, 1000);
window.__gaemi = { S };
// 연습 모드 버튼은 주소 끝에 ?test 를 붙였을 때만 보여요 (테스트용)
if (/[?&]test\b/.test(location.search)) { const db = document.getElementById('demoBtn'); if (db) db.hidden = false; }
boot();
