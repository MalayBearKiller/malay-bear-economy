'use strict';
/* ═════════ 공통: 상수 · 상태 · 포맷 · 사진/닉네임 · 순위 ═════════ */
/* ───────── constants ───────── */
const FEE = 0.003, CASH0 = 5_000_000_000 /* 시작 50억원 (2026-11-12부터) */, NT = 21;
const BONUS = 200_000_000, MAXBET = 200_000_000, MINBET = 1_000_000;
// 10x 대박 룰렛: 20칸, 평균 0.975배 (홀짝과 같은 2.5% 하우스 엣지)
const WHEEL = [0, 1.5, 0, 0.5, 2, 0, 1.5, 0, 10, 0, 0, 1, 0, 0, 2, 0, 1, 0, 0, 0];
const WSEG = 360 / WHEEL.length;
const COIN_PAY = 1.95;
const H = 3600e3, D = 86400e3, KST = 9 * H, TICK_H = [12, 18, 22];
const DOW = ['월', '화', '수', '목', '금', '토', '일'];
function vnoise(key, x) { const i = Math.floor(x), f = x - i, a = seedOf(key + i) / 2147483648 - 1, b = seedOf(key + (i + 1)) / 2147483648 - 1, u = f * f * (3 - 2 * f); return a + (b - a) * u; }
const AVA_COLORS = ['#ffd23f', '#9be7c4', '#c7b8ff', '#ffb3c7', '#a8d8ff', '#ffcf9e', '#d9f27c'];

/* ───────── deterministic RNG ───────── */
function seedOf(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^= h >>> 16) >>> 0; }
function rng(str) { let a = seedOf(str); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
/* ───────── time ───────── */
const now = () => Date.now() + (window.__dt || 0);
const isoDay = day => new Date(day * D).toISOString().slice(0, 10);
function seasonAt(t) {
  const day = Math.floor((t + KST) / D);
  const dow = (new Date(day * D).getUTCDay() + 6) % 7;
  const mon = day - dow;
  return { sid: isoDay(mon), start: mon * D - KST, monDate: new Date(mon * D) };
}
/* ───────── state ───────── */
const S = {
  mode: 'loading', db: null, uid: null, readOnly: false, loaded: false,
  players: {}, feed: [], talk: [], estates: {}, sub: 'wallet', alertBase: {}, drafts: {}, me: null, season: null, SE: null, tick: 0,
  tab: 'home', filter: 'all', sheet: null, saving: false, joinShown: false, rival: null, feedSeen: 0,
};
const LS = {
  get(k, d) { try { const v = localStorage.getItem('sunbit:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sunbit:' + k, JSON.stringify(v)); } catch {} },
};
/* ───────── helpers ───────── */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// 조/억/만 단위 (1억 이상), 그 아래는 콤마
// 큰 금액은 가장 큰 두 단위까지만: 1해 5,647경 · 3경 2,000조 · 5조 3,131억 · 84억 5,706만
const KRW_U = [['극', 1e48], ['재', 1e44], ['정', 1e40], ['간', 1e36], ['구', 1e32], ['양', 1e28], ['자', 1e24], ['해', 1e20], ['경', 1e16], ['조', 1e12], ['억', 1e8], ['만', 1e4]];
function krwUnits(n) {
  n = Math.abs(Math.round(n)); if (n < 1e4) return n.toLocaleString('ko-KR');
  if (n >= 1e52) { const e = Math.floor(Math.log10(n)); return (n / 10 ** e).toFixed(2) + '×10^' + e; } // 너무 크면 짧게
  const i = KRW_U.findIndex(([, v]) => n >= v), [u, v] = KRW_U[i], hi = Math.floor(n / v);
  const nx = KRW_U[i + 1], lo = nx ? Math.floor((n - hi * v) / nx[1]) : 0;
  return hi.toLocaleString('ko-KR') + u + (lo ? ' ' + lo.toLocaleString('ko-KR') + nx[0] : '');
}
const won = n => (Math.abs(n) >= 1e8 ? krwUnits(n) : Math.round(Math.abs(n)).toLocaleString('ko-KR')) + '원';
const man = n => krwUnits(n, true);
const signWon = n => (n > 0 ? '+' : n < 0 ? '-' : '') + won(Math.abs(n));
const cls = v => v > 0.00001 ? 'up' : v < -0.00001 ? 'down' : 'flat';
const pctTxt = v => (v > 0 ? '▲' : v < 0 ? '▼' : '') + Math.abs(v * 100).toFixed(1) + '%';
const pct2Txt = v => {
  const a = Math.abs(v * 100);
  const digits = a >= 10 ? 1 : a >= 0.01 ? 2 : a > 0 ? 3 : 2;
  return (v > 0 ? '▲' : v < 0 ? '▼' : '') + a.toFixed(digits) + '%';
};
const avaColor = id => AVA_COLORS[seedOf(String(id)) % AVA_COLORS.length];
const okPhoto = u => typeof u === 'string' && u.length < 40000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(u);
const ava = (p, lg, crown) => { const ph = !p.bot && okPhoto(p.photo);
  return `<span class="ava${lg ? ' lg' : ''}${ph ? ' ph' : ''}" style="${ph ? `background-image:url(${p.photo})` : `background:${p.bot ? '#e4e2ee' : avaColor(p.id)}`}">${crown ? '<span class="crown">👑</span>' : ''}${ph ? '' : esc(p.bot ? '🤖' : (p.name || '?').slice(0, 1))}</span>`; };
// 프로필: 사진은 96px로 줄여서 지갑 문서에 저장, 닉네임 변경은 변경권(100억) 구매
const RENAME_COST = 2_000_000, BANNER_COST = 2_000_000; // 닉네임 변경·순위 배경 변경 각 200만원 (프로필에서, 한 번 바꿀 때마다)
let PICK = 'photo';
function pickPhoto(kind = 'photo') { PICK = kind; const i = $('#photoIn'); if (i) { i.value = ''; i.click(); } }
async function savePhoto(file, kind = 'photo') {
  if (!S.me || S.saving || !file) return;
  try {
    const img = await new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = rej; im.src = u; });
    const W = kind === 'banner' ? 360 : 96, Hh = kind === 'banner' ? 96 : 96, ar = W / Hh;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; const g = cv.getContext('2d');
    let sw = img.width, sh = img.width / ar; if (sh > img.height) { sh = img.height; sw = sh * ar; }
    g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, Hh);
    let q = .8, url = cv.toDataURL('image/jpeg', q); while (url.length > 30000 && q > .3) { q -= .15; url = cv.toDataURL('image/jpeg', q); }
    if (!okPhoto(url)) { toast('사진을 읽지 못했어요'); return; }
    if (kind === 'banner' && S.me.cash < BANNER_COST) { toast(`현금이 ${won(BANNER_COST - S.me.cash)} 부족해요`); return; }
    const before = S.me, me = JSON.parse(JSON.stringify(before)); me[kind] = url; if (kind === 'banner') me.cash = Math.round(me.cash - BANNER_COST);
    S.saving = true; const ok = await saveMe(me, before); S.saving = false;
    if (ok) { toast(kind === 'banner' ? `🖼️ 순위 배경을 바꿨어요 (-${won(BANNER_COST)})` : '📸 프로필 사진을 바꿨어요'); renderAll(); }
  } catch { toast('사진을 읽지 못했어요'); }
}
async function clearBanner() {
  if (!S.me || S.saving || !S.me.banner) return;
  const before = S.me, me = JSON.parse(JSON.stringify(before)); delete me.banner;
  S.saving = true; const ok = await saveMe(me, before); S.saving = false;
  if (ok) { toast('순위 배경을 지웠어요'); renderAll(); }
}
async function clearPhoto() {
  if (!S.me || S.saving || !S.me.photo) return;
  const before = S.me, me = JSON.parse(JSON.stringify(before)); delete me.photo;
  S.saving = true; const ok = await saveMe(me, before); S.saving = false;
  if (ok) { toast('프로필 사진을 지웠어요'); renderAll(); }
}
function renderRenameSheet(b) {
  const can = S.me && S.me.cash >= RENAME_COST;
  b.innerHTML = `<div class="rv-head"><span class="k">닉네임 변경권</span><h3>새 닉네임</h3></div>
    <p class="hint keep" style="text-align:center">변경권 가격은 <b>${won(RENAME_COST)}</b>이에요. 현금에서 빠져요. 지금 현금 ${won(S.me ? S.me.cash : 0)}.</p>
    <div class="field"><label for="newNick" class="dim" style="font-size:13px;font-weight:700">닉네임 (10자까지)</label><input id="newNick" maxlength="10" value="${esc(S.me ? S.me.name : '')}"></div>
    <p class="hint nickwarn">⚠️ 실명은 쓰지 마세요. 닉네임은 순위·채팅에서 모두에게 보여요.</p>
    <button class="cta" type="button" id="renameBtn" ${can && !S.saving ? '' : 'disabled'}>${can ? `${won(RENAME_COST)} 내고 바꾸기` : '현금이 부족해요'}</button>`;
}
async function doRename() {
  const el = $('#newNick'); const nick = ((el && el.value) || '').trim().slice(0, 10);
  if (!S.me || S.saving) return;
  if (!nick) { toast('닉네임을 입력해 주세요'); return; }
  if (nick === S.me.name) { toast('지금 닉네임과 같아요'); return; }
  if (S.me.cash < RENAME_COST) { toast('현금이 부족해요'); return; }
  const before = S.me, me = JSON.parse(JSON.stringify(before)), old = before.name;
  me.name = nick; me.cash = Math.round(me.cash - RENAME_COST); me.renameN = (me.renameN || 0) + 1;
  S.saving = true; const ok = await saveMe(me, before); S.saving = false;
  if (ok) { LS.set('nick', nick); addFeed({ kind: 'rename', old }); closeSheet(); toast(`✏️ 이제 ${nick}님이에요`); renderAll(); }
}
// 데이터는 절대 초기화하지 않아요: 시즌(주) 표시와 상관없이 모든 참가자·지갑을 그대로 이어서 써요
function activePlayers() { return Object.entries(S.players).filter(([, p]) => p && p.name).map(([id, p]) => ({ id, ...p })); }
function ranking() { return activePlayers().map(p => ({ ...p, w: worth(p) })).sort((a, b) => b.w - a.w); }
const NAME_ALIAS = { '무늬수': '새벽코끼리', '박원국': '파란고슴도치' };
const nameOf = id => (S.players[id] && S.players[id].name) || '누군가';
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2600); }
const roiOf = (p, w) => { const b = (p && p.inflow) || CASH0; return (w - b) / b; };
// 총자산 = 현금 + 실제 시세 자산(코인 현물·선물, 미국주식, 구채)
function worth(p) { return p ? Math.round((p.cash || 0) + kAssets(p)) : 0; }
function syncTime() { const se = seasonAt(now()); if (!S.season || S.season.sid !== se.sid) S.season = se; return false; }

/* ───────── header ───────── */
const seasonOver = () => false; // 시장은 멈추지 않아요. 월요일 0시에 새 시즌으로 자연스럽게 넘어가요.
const kstDay = t => isoDay(Math.floor((t + KST) / D));
