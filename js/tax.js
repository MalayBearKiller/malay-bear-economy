'use strict';
/* ═════════ 🤖 현금 자동 투자 + 📜 전체 로그 ═════════
   자동 투자: 총자산 중 현금이 50% 이상이면, 매시 정각에 '50%를 넘는 현금'을 코인·미국 주식 3~5개에 무작위로 나눠 레버리지 롱(코인 2·3·5배, 주식 2·3배)을 잡아요.
     한 접속에서 자동 투자 뒤 아무것도 안 누르면 휴면 → 더 안 사요. 다시 접속하거나 화면을 누르면 다시 켜져요.
     (세금처럼 돈이 사라지지 않고 자산으로 바뀌어요. 현금 100%인 사람이면 남은 현금의 딱 절반)
     예) 총자산 50억에 현금 50억 → 25억어치를 BTC·테슬라·솔라나 … 에 랜덤으로 나눠 매수
     처음엔 지금부터 세요(소급 없음). 새로 참가하면 1~2시간 유예. 40% 이상이면 아래에 경고 막대가 떠요.
   로그: 모두가 같은 기록(sb_feed)을 봐요. 거래·공격(뽑은 번호와 확률까지)·청산·자동 투자·게임이 다 남아요. */
const TAX = { LINE: .5, WARN: .4, LEV: .3 };
/* 🎯 레버리지 의무: 총자산의 30% 이상을 롱·숏(증거금 평가액)으로 들고 있어야 해요.
   모자라면 매시 정각에 모자란 만큼 자동 레버리지 롱이 잡혀요. 연속으로 모자랄수록 배수가 세져요: 1번째 3배 → 2번째 5배 → 3번째부터 10배(주식은 최대 3배).
   30%를 채우면 단계가 처음으로 돌아가요. 안 하는 사람(휴면: 자동 투자 뒤 아무것도 안 누름)은 멈추고 단계도 안 올라가요. 앱을 안 켠 사람은 원래 안 건드려요. */
const levRatio = p => { const w = worth(p); return w > 0 ? futWorth(p) / w : 0; };
const levShort = p => Math.max(0, TAX.LEV * worth(p) - futWorth(p));
const LEV_STEP = [3, 5, 10];
const levX = n => LEV_STEP[Math.min(LEV_STEP.length - 1, Math.max(0, n))];   // n = 지금까지 연속으로 모자랐던 횟수
const cashRatio = p => { const w = worth(p); return w > 0 ? (p.cash || 0) / w : 0; };
const taxExcess = p => Math.max(0, (p.cash || 0) - TAX.LINE * worth(p));
// 살 후보: 업비트 코인 전부 + 미국 주식(장 상태 상관없이 지금 가격). 시세가 살아 있는 것만
const autoPool = () => [...Object.values(KC).filter(c => kFresh(c.id)).map(c => ({ id: c.id, k: 1 })), ...Object.values(UC).filter(c => c.m === 'us' && uFresh(c.id)).map(c => ({ id: c.id, k: 0 }))];
// 휴면: 이번 접속에서 이미 자동 투자가 한 번 됐는데 그 뒤로 아무것도 안 눌렀으면 더는 강제로 사지 않아요.
// 앱을 다시 열거나(새 접속) 화면을 아무거나 누르면 다시 켜져요.
const AUTO = { bootAt: Date.now(), clickAt: 0 };
document.addEventListener('click', () => { AUTO.clickAt = Date.now(); }, true);
const autoDormant = me => !!(me && me.autoAt && me.autoAt >= AUTO.bootAt && AUTO.clickAt < me.autoAt);
const AUTO_LEV = c => (c.k ? [2, 3, 5] : [2, 3]);   // 코인 2·3·5배, 주식 2·3배 (롱만)
async function kCashTax() {   // 이름은 그대로 두고 내용만 자동 투자로 (kTick에서 불러요)
  const m0 = S.me; if (!m0 || S.saving || S.readOnly) return;
  const h = Math.floor(now() / H);
  if (m0.taxH == null) { const me = clone(m0); me.taxH = h; await kSave(me, m0); return; }
  if (h <= m0.taxH) return;
  const r0 = cashRatio(m0), short = levShort(m0), lvN = m0.levN || 0, dorm = autoDormant(m0);
  const ex = Math.min(Math.max(taxExcess(m0), short), (m0.cash || 0) * .97);   // 현금 50% 넘는 만큼과 레버리지 30% 모자란 만큼 중 큰 쪽
  if (ex < 1e6 || dorm) { const me = clone(m0); me.taxH = h; if (!dorm && short < 1e6) me.levN = 0; await kSave(me, m0); return; }   // 다 채웠거나 휴면이면 넘어가요 (휴면이면 단계도 그대로)
  const mand = short >= 1e6, mx = levX(lvN);   // 의무 때문에 사는 거면 정해진 배수로
  const pool = autoPool(); if (pool.length < 5) return;   // 시세가 아직 없으면 다음 초에 다시
  const n = 3 + Math.floor(Math.random() * 3), pick = [];
  while (pick.length < n) { const c = pool[Math.floor(Math.random() * pool.length)]; if (!pick.includes(c)) pick.push(c); }
  const wts = pick.map(() => .5 + Math.random()), tw = wts.reduce((a, x) => a + x, 0);
  const me = clone(m0); me.kFut ||= {}; me.uFut ||= {};
  let spent = 0; const bought = [];
  pick.forEach((c, i) => {   // 나눈 금액을 증거금으로 레버리지 롱
    const f = c.k ? 'kFut' : 'uFut', o = me[f][c.id]; if (o && o.d < 0) return;   // 숏 잡고 있는 종목은 건너뛰어요
    const levs = AUTO_LEV(c), x = mand ? (c.k ? mx : Math.min(3, mx)) : levs[Math.floor(Math.random() * levs.length)], p = fPx(c.id); if (!p) return;
    const m = ex * wts[i] / tw / (1 + x * fFee(c.id)), N = m * x, q = N / p, fee = N * fFee(c.id);
    if (o) { const q2 = o.q + q, e = (o.q * o.e + q * p) / q2, m2 = o.m - fFund(o) + m; me[f][c.id] = { d: 1, q: q2, e, m: m2, x: Math.max(1, Math.round(q2 * e / m2)), at: now() }; }
    else me[f][c.id] = { d: 1, q, e: p, m, x, at: now() };
    spent += m + fee; bought.push([c.id, Math.round(m), x]);
  });
  me.taxH = h; me.autoAt = now(); me.cash = Math.round(me.cash - spent); me.autoTotal = (me.autoTotal || 0) + Math.round(spent); me.levN = mand ? lvN + 1 : 0;
  if (!(await kSave(me, m0)) || !bought.length) return;
  addFeed({ kind: 'k_auto', amt: Math.round(spent), r: +r0.toFixed(3), lev: mand ? +levRatio(m0).toFixed(3) : null, lx: mand ? mx : null, list: bought.map(([id, a, x]) => id + ':' + a + ':' + x).join(',') });
  const names = bought.map(([id, , x]) => `${(KC[id] || UC[id]).n} ${x}배`);
  toast(`${mand ? `🎯 레버리지가 ${Math.round(levRatio(m0) * 100)}%라 ${mx}배로` : `🤖 현금이 ${Math.round(r0 * 100)}%라`} ${krw(spent)}을(를) 레버리지 롱으로 자동 투자: ${names.slice(0, 3).join('·')}${names.length > 3 ? ` 외 ${names.length - 3}개` : ''}`); buzz(60); renderAll();
}
// 아래 경고 막대: 40% 이상이면 계속 떠요. 누르면 거래소로
function renderTaxBar() {
  let el = $('#taxbar'); if (!el) { el = document.createElement('button'); el.type = 'button'; el.id = 'taxbar'; el.className = 'taxbar'; el.addEventListener('click', () => { if (S.sheet) closeSheet(); goTab('coin'); }); document.body.appendChild(el); }
  const me = S.me, r = me ? cashRatio(me) : 0, lr = me ? levRatio(me) : 1, lvLow = !!me && levShort(me) >= 1e6, show = !!me && !S.readOnly && (r >= TAX.WARN || lvLow) && !S.sheet && !S.profile && !S.board;
  el.hidden = !show; document.body.classList.toggle('has-taxbar', show); if (!show) return;
  const next = (Math.floor(now() / H) + 1) * H, ex = Math.min(Math.max(taxExcess(me), levShort(me)), me.cash * .97), hot = r >= TAX.LINE || lvLow;
  el.classList.toggle('hot', hot);
  if (hot && autoDormant(me)) { el.innerHTML = `<span class="tb-ic">😴</span><span class="tb-t"><b>휴면 · 자동 투자 멈춤 (${lvLow ? `레버리지 ${Math.round(lr * 100)}%` : `현금 ${Math.round(r * 100)}%`})</b><small>화면을 누르거나 다시 접속하면 다시 켜져요</small></span>`; el.classList.remove('hot'); return; }
  if (lvLow) { const x = levX(me.levN || 0); el.innerHTML = `<span class="tb-ic">🎯</span><span class="tb-t"><b>레버리지 ${Math.round(lr * 100)}% · ${mmss(next - now())} 뒤 ${krw(ex)} ${x}배 자동 롱</b><small>롱·숏을 총자산의 30% 이상 잡아 두세요 · 미룰수록 3→5→10배</small></span>`; return; }
  el.innerHTML = hot
    ? `<span class="tb-ic">🤖</span><span class="tb-t"><b>현금 ${Math.round(r * 100)}% · ${mmss(next - now())} 뒤 ${krw(ex)} 자동 투자</b><small>코인·주식에 2~5배 롱으로 무작위로 사져요 · 직접 고르려면 눌러서 투자</small></span>`
    : `<span class="tb-ic">⚠️</span><span class="tb-t"><b>현금 ${Math.round(r * 100)}% · 50% 넘으면 자동 투자</b><small>매시 정각, 50% 넘는 현금이 코인·주식에 무작위로 사져요</small></span>`;
}

/* ───────── 📜 전체 로그 ───────── */
function openLog() { S.board = 'log'; S.logF = S.logF || 'all'; $('#board').hidden = false; document.body.classList.add('noscroll'); renderBoard(); guardOn(); }
const LOG_F = { all: ['전체', () => true], trade: ['거래', f => /^k_(buy|sell|ubuy|usell|fopen|fclose|bond|bsell)$/.test(f.kind)], atk: ['공격·청산', f => f.kind === 'k_atk' || f.kind === 'k_fliq'], money: ['자동투자·게임', f => f.kind === 'k_tax' || f.kind === 'k_auto' || f.kind === 'casino' || f.kind === 'k_rescue' || f.kind === 'k_refund'] };
function logDetail(f) {
  if (f.kind === 'k_atk') return `🎲 뽑은 번호 ${(+f.roll).toFixed(3)} ${f.ok ? '<' : '≥'} 성공 확률 ${Math.round(f.p * 100)}% → ${f.ok ? '성공' : '실패'} · 비용 ${krw(f.cost)}${f.rev ? ' · 복수 반값' : ''}`;
  if (f.kind === 'k_tax') return `현금 비율 ${Math.round((f.r || 0) * 100)}%${f.hrs > 1 ? ` · ${f.hrs}시간치` : ''}`;
  if (f.kind === 'k_auto') return (f.lx ? `🎯 레버리지 ${Math.round((f.lev || 0) * 100)}% → ${f.lx}배 의무 · ` : `현금 비율 ${Math.round((f.r || 0) * 100)}% · `) + String(f.list || '').split(',').filter(Boolean).map(x => { const [id, a] = x.split(':'), c = KC[id] || UC[id]; return c ? `${c.n} ${x.split(':')[2] ? x.split(':')[2] + '배 롱 ' : ''}${man(+a)}` : ''; }).join(' · ');
  if (f.kind === 'k_fliq') return `${f.x}배 ${f.d > 0 ? '롱' : '숏'} 증거금 ${krw(f.amt)} 전부 청산`;
  return '';
}
function renderLogHTML() {
  const fk = LOG_F[S.logF] ? S.logF : 'all', list = (S.feed || []).filter(f => f && LOG_F[fk][1](f)).slice(0, 200);
  const d = t => { const x = new Date(t + KST); return `${x.getUTCMonth() + 1}/${x.getUTCDate()} ${String(x.getUTCHours()).padStart(2, '0')}:${String(x.getUTCMinutes()).padStart(2, '0')}:${String(x.getUTCSeconds()).padStart(2, '0')}`; };
  let h = `<div class="chips logf">${Object.entries(LOG_F).map(([k, [l]]) => `<button type="button" data-logf="${k}" aria-pressed="${fk === k}">${l}</button>`).join('')}</div>
    <p class="logintro">모두가 똑같은 기록을 봐요. 지워지거나 고칠 수 없어요. 공격은 뽑은 번호까지, 자동 투자는 산 종목까지 남아요.</p><div class="loglist">`;
  list.forEach(f => { const t = feedText(f); if (!t) return; const [c, ic, tx] = t, dt = logDetail(f);
    h += `<div class="lgi"><span class="ic ${c}">${ic}</span><div class="lg-b"><span>${tx}</span>${dt ? `<small class="lg-d">${dt}</small>` : ''}</div><time class="num">${d(f.ts)}</time></div>`; });
  if (!list.length) h += `<div class="empty">아직 기록이 없어요.</div>`;
  return h + `</div>`;
}
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('button'); if (!t) return;
  if (t.id === 'logBtn') openLog();
  if (t.dataset.logf) { S.logF = t.dataset.logf; renderBoard(); }
});
