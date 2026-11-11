'use strict';
let saveChain = Promise.resolve();
/* ═════════ 저장 · Firebase · 연습 모드 ═════════ */
function saveMe(me, before) {
  S.me = me; S.players[S.uid] = me;
  const run = async () => {
    if (S.mode === 'demo') { LS.set('demoMe', me); return true; }
    try { await S.db.doc(COL_P + '/' + S.uid).set(me); return true; }
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
  if (S.mode === 'demo') { S.feed.unshift(item); LS.set('demoFeedAll', S.feed.filter(x => !x.bot)); return; }
  S.db.collection(COL_F).add(item).catch(() => {});
}
/* ───────── demo mode ───────── */
function makeBots() {
  const out = {};
  ['존버왕', '단타의신', '물타기장인'].forEach((n, i) => { out['bot' + i] = { name: n, bot: true, season: S.season.sid, cash: CASH0, inflow: CASH0 }; });
  kBotSeed(out);
  return out;
}
function loadDemo() {
  S.uid = 'me'; S.players = makeBots();
  const me = LS.get('demoMe', null); if (me && me.name) { S.players.me = me; S.me = me; } else S.me = null;
  const bf = Object.keys(S.players).filter(id => id !== 'me').map((id, i) => ({ kind: 'join', uid: id, season: S.season.sid, ts: S.season.start + (i + 1) * 7 * 60e3, bot: true }));
  S.feed = [...LS.get('demoFeedAll', []), ...bf].sort((a, b) => b.ts - a.ts);
  S.talk = LS.get('demoTalk', []);
}
function startDemo() { S.mode = 'demo'; S.loaded = true; loadDemo(); if (KQ.first) kOnFirstPrices(); renderAll(); maybeJoin(); }
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
    where: (f, op, v) => wrapQ(fsM.query(q, fsM.where(f, op, v))),
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
    // Google 실명은 닉네임 칸에 자동으로 넣지 않아요 (순위·채팅에 그대로 보이니까)
    if (!started) { started = true; startLive(fb.db, u.uid); }
  });
}
function startLive(db, uid) {
  S.mode = 'live'; S.db = db; S.uid = uid;
  renderAll();
  const timer = setTimeout(() => { if (!S.loaded) toast('시장 서버가 느려요. 조금만 기다려 주세요.'); }, 10000);
  db.collection(COL_P).onSnapshot(snap => {
    const next = {}; snap.docs.forEach(d => next[d.id] = d.data());
    // 표시용 별명: 다른 사람 화면에서만 바꿔 보여줘요. 데이터는 그대로이고, 본인 화면은 원래 이름이에요.
    Object.entries(next).forEach(([id, pl]) => { if (id !== S.uid && pl && NAME_ALIAS[pl.name]) next[id] = { ...pl, name: NAME_ALIAS[pl.name] }; });
    if (S.saving && S.me) next[S.uid] = S.me;
    S.players = next;
    const mine = next[S.uid]; S.me = mine && mine.name ? mine : null;
    if (!snap.metadata.fromCache && !S.loaded) { S.loaded = true; clearTimeout(timer); }
    renderAll();
    if (S.loaded) maybeJoin();
  }, () => { clearTimeout(timer); S.loaded = true; toast('순위를 불러오지 못했어요.'); renderAll(); });
  db.collection('sb_talk').orderBy('ts', 'desc').limit(150).onSnapshot(snap => { S.talk = snap.docs.map(d => ({ id: d.id, ...d.data() })); if (S.board === 'talk') renderBoard(); }, () => {});
  // 나를 노린 공격 기록만 따로 (오래된 것도 빠짐없이) → 내 지갑에 반영
  db.collection(COL_F).where('target', '==', uid).onSnapshot(snap => { S.atkFeed = snap.docs.map(d => d.data()); atkSync(); }, () => {});
  db.collection(COL_F).orderBy('ts', 'desc').limit(200).onSnapshot(snap => {
    S.feed = snap.docs.map(d => d.data()); evFeed(S.feed);
    renderAll();
  }, () => {});
}
