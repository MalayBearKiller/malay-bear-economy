'use strict';
/* ═════════ 💸 현금세 + 📜 전체 로그 ═════════
   현금세: 총자산 중 현금 비율이 50% 이상이면, 매시 정각에 '50%를 넘는 현금'의 5%를 세금으로 걷어요(사라져요).
     예) 총자산 50억에 현금 40억(80%) → 넘는 현금 15억 × 5% = 7,500만원/시간
     앱을 꺼 둬도 다음에 열 때 밀린 시간만큼 계산해요(최대 48시간). 처음엔 지금부터 세요(소급 없음).
     새로 참가하면 1~2시간 유예. 40% 이상이면 아래에 경고 막대가 계속 떠요.
   로그: 모두가 같은 기록(sb_feed)을 봐요. 거래·공격(뽑은 번호와 확률까지)·청산·세금·게임이 다 남아요. */
const TAX = { RATE: .05, LINE: .5, WARN: .4, MAX_H: 48 };
const cashRatio = p => { const w = worth(p); return w > 0 ? (p.cash || 0) / w : 0; };
const taxExcess = p => Math.max(0, (p.cash || 0) - TAX.LINE * worth(p));
async function kCashTax() {
  const m0 = S.me; if (!m0 || S.saving || S.readOnly) return;
  const h = Math.floor(now() / H);
  if (m0.taxH == null) { const me = clone(m0); me.taxH = h; await kSave(me, m0); return; }
  if (h <= m0.taxH) return;
  const hrs = Math.min(TAX.MAX_H, h - m0.taxH), r0 = cashRatio(m0);
  let cash = m0.cash || 0, paid = 0; const other = worth(m0) - cash;
  for (let k = 0; k < hrs; k++) { const ex = cash - TAX.LINE * (cash + other); if (ex <= 0) break; const t = ex * TAX.RATE; cash -= t; paid += t; }
  const me = clone(m0); me.taxH = h; me.cash = Math.round(cash); me.taxTotal = (me.taxTotal || 0) + Math.round(paid);
  if (!(await kSave(me, m0)) || paid < 1) return;
  addFeed({ kind: 'k_tax', amt: Math.round(paid), r: +r0.toFixed(3), hrs });
  toast(`💸 현금세 ${hrs > 1 ? hrs + '시간치 ' : ''}-${krw(paid)} (현금 ${Math.round(r0 * 100)}%)`); buzz(60); renderAll();
}
// 아래 경고 막대: 40% 이상이면 계속 떠요. 누르면 거래소로
function renderTaxBar() {
  let el = $('#taxbar'); if (!el) { el = document.createElement('button'); el.type = 'button'; el.id = 'taxbar'; el.className = 'taxbar'; el.addEventListener('click', () => { if (S.sheet) closeSheet(); goTab('coin'); }); document.body.appendChild(el); }
  const me = S.me, r = me ? cashRatio(me) : 0, show = !!me && !S.readOnly && r >= TAX.WARN && !S.sheet && !S.profile && !S.board;
  el.hidden = !show; document.body.classList.toggle('has-taxbar', show); if (!show) return;
  const next = (Math.floor(now() / H) + 1) * H, ex = taxExcess(me), hot = r >= TAX.LINE;
  el.classList.toggle('hot', hot);
  el.innerHTML = hot
    ? `<span class="tb-ic">💸</span><span class="tb-t"><b>현금 ${Math.round(r * 100)}% · ${mmss(next - now())} 뒤 세금 -${krw(ex * TAX.RATE)}</b><small>현금을 50% 아래로 낮추면 0원 · 눌러서 투자하기</small></span>`
    : `<span class="tb-ic">⚠️</span><span class="tb-t"><b>현금 ${Math.round(r * 100)}% · 50% 넘으면 세금</b><small>매시 정각, 50% 넘는 현금의 5%가 빠져요</small></span>`;
}

/* ───────── 📜 전체 로그 ───────── */
function openLog() { S.board = 'log'; S.logF = S.logF || 'all'; $('#board').hidden = false; document.body.classList.add('noscroll'); renderBoard(); guardOn(); }
const LOG_F = { all: ['전체', () => true], trade: ['거래', f => /^k_(buy|sell|ubuy|usell|fopen|fclose|bond|bsell)$/.test(f.kind)], atk: ['공격·청산', f => f.kind === 'k_atk' || f.kind === 'k_fliq'], money: ['세금·게임', f => f.kind === 'k_tax' || f.kind === 'casino' || f.kind === 'k_rescue'] };
function logDetail(f) {
  if (f.kind === 'k_atk') return `🎲 뽑은 번호 ${(+f.roll).toFixed(3)} ${f.ok ? '<' : '≥'} 성공 확률 ${Math.round(f.p * 100)}% → ${f.ok ? '성공' : '실패'} · 비용 ${krw(f.cost)}${f.rev ? ' · 복수 반값' : ''}`;
  if (f.kind === 'k_tax') return `현금 비율 ${Math.round((f.r || 0) * 100)}%${f.hrs > 1 ? ` · ${f.hrs}시간치` : ''}`;
  if (f.kind === 'k_fliq') return `${f.x}배 ${f.d > 0 ? '롱' : '숏'} 증거금 ${krw(f.amt)} 전부 청산`;
  return '';
}
function renderLogHTML() {
  const fk = LOG_F[S.logF] ? S.logF : 'all', list = (S.feed || []).filter(f => f && LOG_F[fk][1](f)).slice(0, 200);
  const d = t => { const x = new Date(t + KST); return `${x.getUTCMonth() + 1}/${x.getUTCDate()} ${String(x.getUTCHours()).padStart(2, '0')}:${String(x.getUTCMinutes()).padStart(2, '0')}:${String(x.getUTCSeconds()).padStart(2, '0')}`; };
  let h = `<div class="chips logf">${Object.entries(LOG_F).map(([k, [l]]) => `<button type="button" data-logf="${k}" aria-pressed="${fk === k}">${l}</button>`).join('')}</div>
    <p class="logintro">모두가 똑같은 기록을 봐요. 지워지거나 고칠 수 없어요. 공격은 뽑은 번호까지 남아요.</p><div class="loglist">`;
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
