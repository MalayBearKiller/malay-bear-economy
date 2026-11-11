'use strict';
/* ═════════ 🤖 현금 자동 투자 + 📜 전체 로그 ═════════
   자동 투자: 총자산 중 현금이 50% 이상이면, 매시 정각에 '50%를 넘는 현금'을 코인·미국 주식 3~5개에 무작위로 나눠 현물로 사 줘요.
     (세금처럼 돈이 사라지지 않고 자산으로 바뀌어요. 현금 100%인 사람이면 남은 현금의 딱 절반)
     예) 총자산 50억에 현금 50억 → 25억어치를 BTC·테슬라·솔라나 … 에 랜덤으로 나눠 매수
     처음엔 지금부터 세요(소급 없음). 새로 참가하면 1~2시간 유예. 40% 이상이면 아래에 경고 막대가 떠요.
   로그: 모두가 같은 기록(sb_feed)을 봐요. 거래·공격(뽑은 번호와 확률까지)·청산·자동 투자·게임이 다 남아요. */
const TAX = { LINE: .5, WARN: .4 };
const cashRatio = p => { const w = worth(p); return w > 0 ? (p.cash || 0) / w : 0; };
const taxExcess = p => Math.max(0, (p.cash || 0) - TAX.LINE * worth(p));
// 살 후보: 업비트 코인 전부 + 미국 주식(장 상태 상관없이 지금 가격). 시세가 살아 있는 것만
const autoPool = () => [...Object.values(KC).filter(c => kFresh(c.id)).map(c => ({ id: c.id, k: 1 })), ...Object.values(UC).filter(c => c.m === 'us' && uFresh(c.id)).map(c => ({ id: c.id, k: 0 }))];
async function kCashTax() {   // 이름은 그대로 두고 내용만 자동 투자로 (kTick에서 불러요)
  const m0 = S.me; if (!m0 || S.saving || S.readOnly) return;
  const h = Math.floor(now() / H);
  if (m0.taxH == null) { const me = clone(m0); me.taxH = h; await kSave(me, m0); return; }
  if (h <= m0.taxH) return;
  const ex = taxExcess(m0), r0 = cashRatio(m0);
  if (ex < 1e6) { const me = clone(m0); me.taxH = h; await kSave(me, m0); return; }   // 50% 아래면 그냥 넘어가요
  const pool = autoPool(); if (pool.length < 5) return;   // 시세가 아직 없으면 다음 초에 다시
  // 3~5개를 고르고, 무작위 비율로 나눠요
  const n = 3 + Math.floor(Math.random() * 3), pick = [];
  while (pick.length < n) { const c = pool[Math.floor(Math.random() * pool.length)]; if (!pick.includes(c)) pick.push(c); }
  const wts = pick.map(() => .5 + Math.random()), tw = wts.reduce((a, x) => a + x, 0);
  const me = clone(m0); me.kHold ||= {}; me.kCost ||= {}; me.uHold ||= {}; me.uCost ||= {};
  let spent = 0; const bought = [];
  pick.forEach((c, i) => {
    const amt = ex * wts[i] / tw;
    if (c.k) { const p = kPx(c.id), q = amt / (p * (1 + KFEE)); if (!(q > 0)) return; const h0 = me.kHold[c.id] || 0; me.kCost[c.id] = ((me.kCost[c.id] || 0) * h0 + q * p) / (h0 + q); me.kHold[c.id] = h0 + q; spent += amt; bought.push([c.id, Math.round(amt)]); }
    else { const w = uWon(c.id), q = Math.floor(amt / (w * (1 + U_FEE))); if (q < 1) return; const cost = q * w * (1 + U_FEE), h0 = me.uHold[c.id] || 0; me.uCost[c.id] = ((me.uCost[c.id] || 0) * h0 + q * w) / (h0 + q); me.uHold[c.id] = h0 + q; spent += cost; bought.push([c.id, Math.round(cost)]); }
  });
  me.taxH = h; me.cash = Math.round(me.cash - spent); me.autoTotal = (me.autoTotal || 0) + Math.round(spent);
  if (!(await kSave(me, m0)) || !bought.length) return;
  addFeed({ kind: 'k_auto', amt: Math.round(spent), r: +r0.toFixed(3), list: bought.map(([id, a]) => id + ':' + a).join(',') });
  const names = bought.map(([id]) => (KC[id] || UC[id]).n);
  toast(`🤖 현금이 ${Math.round(r0 * 100)}%라 ${krw(spent)}을(를) 자동 투자했어요: ${names.slice(0, 3).join('·')}${names.length > 3 ? ` 외 ${names.length - 3}개` : ''}`); buzz(60); renderAll();
}
// 아래 경고 막대: 40% 이상이면 계속 떠요. 누르면 거래소로
function renderTaxBar() {
  let el = $('#taxbar'); if (!el) { el = document.createElement('button'); el.type = 'button'; el.id = 'taxbar'; el.className = 'taxbar'; el.addEventListener('click', () => { if (S.sheet) closeSheet(); goTab('coin'); }); document.body.appendChild(el); }
  const me = S.me, r = me ? cashRatio(me) : 0, show = !!me && !S.readOnly && r >= TAX.WARN && !S.sheet && !S.profile && !S.board;
  el.hidden = !show; document.body.classList.toggle('has-taxbar', show); if (!show) return;
  const next = (Math.floor(now() / H) + 1) * H, ex = taxExcess(me), hot = r >= TAX.LINE;
  el.classList.toggle('hot', hot);
  el.innerHTML = hot
    ? `<span class="tb-ic">🤖</span><span class="tb-t"><b>현금 ${Math.round(r * 100)}% · ${mmss(next - now())} 뒤 ${krw(ex)} 자동 투자</b><small>코인·주식에 무작위로 사져요 · 직접 고르려면 눌러서 투자하기</small></span>`
    : `<span class="tb-ic">⚠️</span><span class="tb-t"><b>현금 ${Math.round(r * 100)}% · 50% 넘으면 자동 투자</b><small>매시 정각, 50% 넘는 현금이 코인·주식에 무작위로 사져요</small></span>`;
}

/* ───────── 📜 전체 로그 ───────── */
function openLog() { S.board = 'log'; S.logF = S.logF || 'all'; $('#board').hidden = false; document.body.classList.add('noscroll'); renderBoard(); guardOn(); }
const LOG_F = { all: ['전체', () => true], trade: ['거래', f => /^k_(buy|sell|ubuy|usell|fopen|fclose|bond|bsell)$/.test(f.kind)], atk: ['공격·청산', f => f.kind === 'k_atk' || f.kind === 'k_fliq'], money: ['자동투자·게임', f => f.kind === 'k_tax' || f.kind === 'k_auto' || f.kind === 'casino' || f.kind === 'k_rescue'] };
function logDetail(f) {
  if (f.kind === 'k_atk') return `🎲 뽑은 번호 ${(+f.roll).toFixed(3)} ${f.ok ? '<' : '≥'} 성공 확률 ${Math.round(f.p * 100)}% → ${f.ok ? '성공' : '실패'} · 비용 ${krw(f.cost)}${f.rev ? ' · 복수 반값' : ''}`;
  if (f.kind === 'k_tax') return `현금 비율 ${Math.round((f.r || 0) * 100)}%${f.hrs > 1 ? ` · ${f.hrs}시간치` : ''}`;
  if (f.kind === 'k_auto') return `현금 비율 ${Math.round((f.r || 0) * 100)}% · ` + String(f.list || '').split(',').filter(Boolean).map(x => { const [id, a] = x.split(':'), c = KC[id] || UC[id]; return c ? `${c.n} ${man(+a)}` : ''; }).join(' · ');
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
