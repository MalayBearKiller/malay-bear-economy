'use strict';
function saveMe(me, before) {
  S.me = me; S.players[S.uid] = me;
  const run = async () => {
    if (S.mode === 'demo') { LS.set('demoMe', me); return true; }
    try { await S.db.doc('sb_players/' + S.uid).set(me); return true; }
    catch (e) {
      S.me = before || null; if (before) S.players[S.uid] = before; else delete S.players[S.uid];
      if (e && e.code === 'invalid_argument') { S.readOnly = true; toast(S.fb ? '저장 권한이 없어요. 로그아웃 후 다시 로그인해 보세요.' : '관전 모드예요. 방장에게 편집자 초대를 받아야 거래할 수 있어요.'); }
      else if (e && e.code === 'quota_exceeded') toast('저장 공간이 가득 찼어요. 방장에게 알려주세요.');
      else toast('저장하지 못했어요. 잠시 후 다시 해주세요.');
      renderAll(); return false;
    }
  };
  const p = saveChain.then(run); saveChain = p.catch(() => {}); return p;
}
function addFeed(f) {
  const item = { ...f, uid: S.uid, season: S.season.sid, ts: Date.now() };
  noteAtks([item]);
  if (S.mode === 'demo') { S.feed.unshift(item); LS.set('demoFeedAll', S.feed.filter(x => !x.bot)); return; }
  S.db.collection('sb_feed').add(item).catch(() => {});
}

/* ───────── demo mode ───────── */
function makeBots() {
  const R = rng('bots2:' + S.season.sid); const names = ['존버왕', '단타의신', '물타기장인']; const out = {};
  names.forEach((n, i) => {
    const p = { name: n, bot: true, season: S.season.sid, cash: CASH0, hold: {}, cost: {}, shorts: {}, lev: {} };
    const order = STOCKS.map(s => ({ s, r: R() })).sort((a, b) => a.r - b.r).map(x => x.s).slice(0, 2 + Math.floor(R() * 3));
    order.forEach(s => { const q = Math.floor(CASH0 * (.15 + R() * .2) / s.p0); if (!q) return; p.hold[s.id] = q; p.cost[s.id] = s.p0; p.cash -= q * s.p0; });
    const ls = STOCKS[Math.floor(R() * STOCKS.length)], lx = [25, 50, 25][i] || 25, lm = Math.floor(CASH0 * .2);
    if (!p.hold[ls.id] && p.cash > lm) { const lq = Math.max(1, Math.floor(lm * lx / ls.p0)); p.lev[ls.id] = { q: lq, e: ls.p0, m: lq * ls.p0 / lx, x: lx, d: i === 2 ? -1 : 1 }; p.cash -= Math.round(lq * ls.p0 / lx); }
    if (R() < .6) { const s = STOCKS[Math.floor(R() * STOCKS.length)]; const q = Math.floor(CASH0 * .1 / s.p0); if (!p.hold[s.id] && !p.lev[s.id] && q && p.cash > q * s.p0) { p.shorts[s.id] = { q, e: s.p0 }; p.cash -= q * s.p0; } }
    out['bot' + i] = p;
  });
  kBotSeed(out);
  return out;
}
function loadDemo() {
  S.uid = 'me'; S.players = makeBots();
  const me = LS.get('demoMe', null) || LS.get('demo7:' + S.season.sid, null); if (me && me.name) { S.players.me = me; S.me = me; } else S.me = null;
  const bf = Object.entries(S.players).filter(([id]) => id !== 'me').flatMap(([id, p], i) => [
    { kind: 'join', uid: id, season: S.season.sid, ts: S.season.start + (i + 1) * 7 * 60e3, bot: true },
    ...Object.entries(p.hold).map(([s, q], j) => ({ kind: 'buy', uid: id, sym: s, amt: q * SM[s].p0, season: S.season.sid, ts: S.season.start + (i + 1) * 9 * 60e3 + j * 60e3, bot: true })),
    ...Object.keys(p.shorts).map(s => ({ kind: 'short', uid: id, sym: s, season: S.season.sid, ts: S.season.start + (i + 2) * 11 * 60e3, bot: true })),
  ]);
  S.feed = [...LS.get('demoFeedAll', []), ...bf].sort((a, b) => b.ts - a.ts); noteAtks(S.feed);
  const TR = rng('talk:' + S.season.sid); const LINES = ['이거 오늘 간다', '물렸다… 존버합니다', '찌라시 믿고 들어갔다가 망함ㅋㅋ', '공매도 각 아님?', '외국인 들어온다던데', '여기서 더 사는 건 욕심인가', '오늘 점심장에 손절함', '평단 낮추는 중', '이 가격이면 줍줍', '큰손 이벤트 여기 아니냐'];
  const botTalk = []; let c0 = 0;
  STOCKS.forEach(st => { if (TR() < .45) { const n = 1 + Math.floor(TR() * 3); for (let i = 0; i < n; i++) { const bi = Math.floor(TR() * 3); botTalk.push({ id: 'bt' + (c0++), bot: true, sym: st.id, uid: 'bot' + bi, text: pick(TR, LINES), ts: now() - Math.floor(TR() * 36e5 * 20), season: S.season.sid, likes: TR() < .5 ? { ['bot' + ((bi + 1) % 3)]: true } : {} }); } } });
  Object.values(S.players).forEach(p => { if (!p.bot) return; p.votes = {}; STOCKS.forEach(st => { if (TR() < .5) p.votes[st.id] = { k: S.tick, sid: S.season.sid, d: TR() < .55 ? 'up' : 'down' }; }); });
  S.talk = [...LS.get('demoTalk', []), ...botTalk];
  const ER = rng('est:' + S.season.sid); const bots = ['bot0', 'bot1', 'bot2']; const est = {};
  ESTATES.forEach(b => { if (ER() < .3 && b.v0 <= 1e10) est[b.id] = { season: S.season.sid, owner: bots[Math.floor(ER() * 3)], paid: b.v0, at: S.season.start, destroyed: ER() < .25 ? { value: Math.round(b.v0 * (.9 + ER() * .2) / 10000) * 10000, at: S.season.start, by: 'bot0' } : null, bot: true }; });
  S.estates = {}; // 건물은 없어졌어요 (구채로 바뀜)
}
function startDemo() { S.mode = 'demo'; S.loaded = true; loadDemo(); if (KQ.first) kOnFirstPrices(); renderAll(); if (!maybeReveal()) maybeJoin(); autoCredit(); }

/* ───────── live mode ───────── */
// Firebase: Google login + Firestore, wrapped to the same small API the game already uses
const FB_V = '10.12.2';
async function firebaseBackend(cfg) {
  const base = `https://www.gstatic.com/firebasejs/${FB_V}/`;
  const [appM, fsM, auM] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-firestore.js'), import(base + 'firebase-auth.js')]);
  const app = appM.initializeApp(cfg); const fs = fsM.getFirestore(app); const auth = auM.getAuth(app);
  const wrapQ = q => ({
    orderBy: (f, d) => wrapQ(fsM.query(q, fsM.orderBy(f, d))),
    limit: n => wrapQ(fsM.query(q, fsM.limit(n))),
    onSnapshot: (next, err) => fsM.onSnapshot(q, next, err),
    add: d => fsM.addDoc(q, d),
  });
  const mapErr = e => { if (e && e.code === 'permission-denied') e.code = 'invalid_argument'; throw e; };
  const db = {
    collection: path => wrapQ(fsM.collection(fs, path)),
    doc: path => { const r = fsM.doc(fs, path); return {
      set: d => fsM.setDoc(r, d).catch(mapErr),
      update: d => fsM.setDoc(r, d, { merge: true }).catch(mapErr),
      delete: () => fsM.deleteDoc(r).catch(mapErr),
    }; },
  };
  return {
    db,
    onUser: cb => auM.onAuthStateChanged(auth, cb),
    signIn: async () => { const pr = new auM.GoogleAuthProvider(); try { await auM.signInWithPopup(auth, pr); } catch (e) { if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) await auM.signInWithRedirect(auth, pr); else throw e; } },
    signOut: () => auM.signOut(auth),
  };
}
async function bootFirebase(cfg) {
  const L = $('#login'); L.hidden = false; document.body.classList.add('noscroll');
  let fb;
  try { fb = await firebaseBackend(cfg); } catch (e) { $('#loginMsg').textContent = '서버에 연결하지 못했어요. 연습 모드로 둘러볼 수 있어요.'; return; }
  S.fb = fb; let started = false;
  fb.onUser(u => {
    if (!u) { L.hidden = false; document.body.classList.add('noscroll'); return; }
    L.hidden = true; document.body.classList.remove('noscroll');
    if (!LS.get('nick', '') && u.displayName) LS.set('nick', u.displayName.slice(0, 10));
    if (!started) { started = true; startLive(fb.db, u.uid); }
  });
}
function startLive(db, uid) {
  S.mode = 'live'; S.db = db; S.uid = uid;
  renderAll();
  const timer = setTimeout(() => { if (!S.loaded) toast('시장 서버가 느려요. 조금만 기다려 주세요.'); }, 10000);
  db.collection('sb_players').onSnapshot(snap => {
    const next = {}; snap.docs.forEach(d => next[d.id] = d.data());
    // 표시용 별명: 다른 사람 화면에서만 바꿔 보여줘요. 데이터는 그대로이고, 본인 화면은 원래 이름이에요.
    Object.entries(next).forEach(([id, pl]) => { if (id !== S.uid && pl && NAME_ALIAS[pl.name]) next[id] = { ...pl, name: NAME_ALIAS[pl.name] }; });
    if (S.saving && S.me) next[S.uid] = S.me;
    S.players = next;
    const mine = next[S.uid]; S.me = mine && mine.name ? mine : null;
    if (!snap.metadata.fromCache && !S.loaded) { S.loaded = true; clearTimeout(timer); }
    renderAll(); if (S.sheet && S.sheet.type === 'player') renderSheet();
    if (S.loaded && !maybeReveal()) maybeJoin();
    autoCredit();
  }, () => { clearTimeout(timer); S.loaded = true; toast('순위를 불러오지 못했어요.'); renderAll(); });
  db.collection('sb_talk').orderBy('ts', 'desc').limit(150).onSnapshot(snap => { S.talk = snap.docs.map(d => ({ id: d.id, ...d.data() })); if (S.board === 'talk') renderBoard(); if (S.detail) renderDetail(); if (S.tab === 'home' || S.tab === 'market') renderAll(); }, () => {});
  db.collection('sb_feed').orderBy('ts', 'desc').limit(80).onSnapshot(snap => {
    S.feed = snap.docs.map(d => d.data()); noteAtks(S.feed); LV.step = -1;
    const hit = S.feed.find(f => f && f.kind === 'atk' && f.target === S.uid && now() - f.ts < 8000);
    if (hit && S.lastAtkTs !== hit.ts) {
      S.lastAtkTs = hit.ts; boom();
      const s = SM[hit.sym], who = (S.players[hit.uid] || {}).name || '누군가';
      toast(`🚨 ${who}님이 내 ${s ? s.n : hit.sym} 포지션을 공격했어요! (${hit.dir > 0 ? '강제 +12% 펌핑' : '강제 -12% 덤핑'})`);
      checkLiquidation();
    }
    renderAll(); if (S.sheet && S.sheet.type === 'player') renderSheet();
  }, () => {});
}
