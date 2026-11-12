'use strict';
/* ═════════ 프로필: 내 프로필 탭(하단 맨 오른쪽)과 친구 프로필이 같은 모양 ═════════
   위: 사진·이름·레벨·순위·구청장 + 총자산 · 수익률 · 현금 + 자산 구성 막대
   아래: 가진 것 전부 한 목록 (코인·선물·주식·국채·지분). 내 프로필이면 맨 아래 설정 한 줄. */
// 내 자산 탭: 내 배경 사진을 화면 배경에 옅게 깔아요
function bnBody() { const me = S.me, on = S.tab === 'assets' && me && okPhoto(me.banner); document.body.classList.toggle('bnbody', !!on); if (on) document.body.style.setProperty('--bnb', `url(${me.banner})`); }
function allHoldings(p) {
  const out = [];
  kPositions(p).forEach(x => { const c = KC[x.sym]; out.push({ ...x, badge: kBadge(c), name: c.n, tag: x.kind === 'fut' ? x.label : '코인', tagc: x.kind === 'fut' ? (x.d > 0 ? 'long' : 'short') : 'spot', sub: `${kQty(x.q)} ${c.a}`, open: `data-kcoin="${x.sym}"` }); });
  uPositions(p).forEach(x => { const c = UC[x.sym], fut = x.kind === 'fut'; out.push({ ...x, badge: uBadge(c), name: c.n, tag: fut ? x.label : { us: '주식', cm: '현물', fx: '외화' }[c.m], tagc: fut ? (x.d > 0 ? 'long' : 'short') : 'spot', sub: fut ? `증거금 ${krw(x.principal)}` : uQty(x.q, x.sym) + (c.m !== 'fx' ? ` · ${usd(uUsdOf(x.sym, x.q))}` : ''), open: `data-us="${x.sym}"` }); });
  gPositions(p).forEach(x => { const c = GC[x.sym], fut = x.kind === 'fut', o = (p.gHold || {})[x.sym]; out.push({ ...x, badge: `<span class="logo-b gflag">${c.f}</span>`, name: c.n, tag: fut ? x.label : '국채', tagc: fut ? (x.d > 0 ? 'long' : 'short') : 'spot', sub: fut ? `증거금 ${krw(x.principal)}` : `산 금리 ${o ? o.y.toFixed(2) : '-'}%`, open: `data-gb="${x.sym}"` }); });
  const top = guChief();
  stakePositions(p).forEach(x => out.push({ ...x, badge: `<span class="logo-b bb" style="background:${chiefColor(p.id)}">${BOND[x.sym].i + 1}</span>`, name: x.sym + (top[x.sym] && top[x.sym].id === p.id ? ' 👑' : ''), tag: '지분', tagc: 'spot', sub: `${x.q}%`, open: `data-bond="${x.sym}"` }));
  return out.sort((a, b) => b.value - a.value);
}
function profileBody(p, isMe) {
  const w = worth(p, S.tick), roi = roiOf(p, w), rk = ranking(S.tick).findIndex(x => x.id === p.id) + 1, lord = lordOf(p.id);
  const H0 = allHoldings(p);
  const sum = f => H0.filter(f).reduce((a, x) => a + x.value, 0);
  const parts = [['현금', p.cash || 0, '#16b27e'], ['코인', sum(x => x.kind === 'spot' && KC[x.sym]), '#f08c00'], ['선물', sum(x => x.kind === 'fut'), '#f2414f'],
    ['주식', sum(x => x.kind === 'us'), '#2b2745'], ['채권', sum(x => x.kind === 'gb' || (x.kind === 'fut' && GC[x.sym])), '#1450d2'], ['지분', sum(x => x.kind === 'stake'), '#7c3aed']].filter(x => x[1] > 0);
  const tot = parts.reduce((a, x) => a + x[1], 0) || 1;
  const bn = okPhoto(p.banner) ? ` style="--bn:url(${p.banner})"` : '';
  let h = `<div class="phero${bn ? ' bn' : ''}"${bn}>
      <div class="ph-id">${isMe ? `<button type="button" class="ph-ava" id="photoBtn" aria-label="사진 바꾸기">${ava(p, true)}<i>📷</i></button>` : ava(p, true)}
        <div class="ph-nm"><b>${esc(p.name)} <span class="lvtag">LV.${lvOf(p)}</span></b><small>${rk ? rk + '위' : ''}${lord ? ` · 👑 ${lord}` : ''}</small></div></div>
      ${(() => { const u = uPositions(p).filter(x => x.kind === 'us').reduce((a, x) => a + uUsdOf(x.sym, x.q), 0); return u ? `<div class="ph-usd">💵 달러 자산 <b class="num">${usd(u)}</b> <small>(${krw(u * FX.p)})</small></div>` : ''; })()}<div class="ph-w"><small>총자산</small><b class="num" data-roll="ph-${p.id}" data-v="${w}">${won(w)}</b><span class="num"><b class="${cls(roi)}">${pctTxt(roi)}</b> · 현금 ${won(p.cash || 0)}</span></div>
      <div class="ws-bar">${parts.map(x => `<i style="width:${(x[1] / tot * 100).toFixed(2)}%;background:${x[2]}"></i>`).join('')}</div>
      <div class="ph-leg">${parts.map(x => `<span><i style="background:${x[2]}"></i>${x[0]} <b class="num">${(x[1] / tot * 100).toFixed(0)}%</b></span>`).join('')}</div>
    </div>
    ${pTabsHTML(H0)}<div class="slist">`;
  const HT = H0.filter(x => pTabOf(x) === pTab() || pTab() === 'all');
  h += HT.map(x => `<button type="button" class="pos" ${x.open}>${x.badge}<span class="sname"><b>${esc(x.name)} <span class="postag ${x.tagc}">${esc(x.tag)}</span></b><small class="dim num">${x.sub}${x.dist != null ? ` · 청산까지 ${(x.dist * 100).toFixed(1)}%` : ''}</small></span>
      <span class="r num"><b>${won(x.value)}</b><br><small class="${cls(x.pnl)}">${signWon(x.pnl)} (${pctTxt(x.pct)})</small></span></button>`).join('') || `<div class="empty">${pTab() !== 'all' ? '이 탭에는 가진 게 없어요.' : isMe ? '아직 아무것도 없어요. 거래소에서 시작해 보세요.' : '가진 게 없어요.'}</div>`;
  h += `</div></div>` + pAnalysisHTML(p, w, roi, rk, H0);
  if (isMe) h += `<div class="ph-set">${[['photoBtn2', '📸 사진 바꾸기', 1], ['photoDel', '사진 지우기', !!p.photo], ['bannerDel', '배경 지우기', !!p.banner], ['bannerPick', `🖼️ 배경 바꾸기 · ${won(BANNER_COST)}`, 1], ['renameOpen', `✏️ 닉네임 · ${won(RENAME_COST)}`, 1], ['logoutBtn', '로그아웃', !!S.fb && S.mode === 'live']]
      .filter(x => x[2]).map(([id, l]) => `<button type="button" id="${id}">${l}</button>`).join('')}</div>`;
  return h;
}
/* ───────── 가진 것: 거래소처럼 주식 · 코인 · 현물 · 채권 탭 ───────── */
const P_TABS = [['all', '전체'], ['us', '주식'], ['coin', '코인'], ['cm', '현물'], ['bond', '채권']];
const pTab = () => (P_TABS.some(([k]) => k === S.pTab) ? S.pTab : 'all');
const pTabOf = x => (KC[x.sym] ? 'coin' : UC[x.sym] ? (UC[x.sym].m === 'cm' ? 'cm' : 'us') : 'bond');   // 달러는 주식 탭(거래소와 같아요)
function pTabsHTML(H0) {
  const cur = pTab(), list = cur === 'all' ? H0 : H0.filter(x => pTabOf(x) === cur);
  const V = list.reduce((a, x) => a + x.value, 0), P0 = list.reduce((a, x) => a + x.principal, 0), pnl = V - P0;
  return `<div class="sec ptabs-sec"><div class="xtabs ptabs" role="tablist">${P_TABS.map(([k, l]) => { const n = k === 'all' ? H0.length : H0.filter(x => pTabOf(x) === k).length;
      return `<button type="button" role="tab" data-ptab="${k}" aria-selected="${k === cur}">${l}${n ? `<small>${n}</small>` : ''}</button>`; }).join('')}</div>
    <div class="ptab-sum"><span>평가 <b class="num">${won(V)}</b></span><span class="num ${cls(pnl)}">${signWon(pnl)} (${pctTxt(P0 ? pnl / P0 : 0)})</span></div></div>`;
}
document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-ptab]'); if (!t) return; S.pTab = t.dataset.ptab; if (S.profile) renderFriendProfile(); else renderMe(); });

/* ───────── 📊 투자 분석 ───────── */
function pAnalysisHTML(p, w, roi, rk, H0) {
  const base = p.inflow || CASH0, gain = w - base, R = ranking(S.tick), above = rk > 1 ? R[rk - 2] : null, top = R[0];
  const futs = H0.filter(x => x.kind === 'fut'), fm = futs.reduce((a, x) => a + x.value, 0), lev = w ? fm / w : 0;
  const avgX = fm ? futs.reduce((a, x) => a + x.value * (parseFloat(x.label) || 1), 0) / fm : 0;
  const risky = futs.filter(x => x.distMax && x.dist / x.distMax < .25), near = futs.length ? Math.min(...futs.map(x => x.dist)) : null;
  const big = H0[0], conc = big && w ? big.value / w : 0, cashR = w ? (p.cash || 0) / w : 0;
  const win = H0.filter(x => x.pnl > 0).sort((a, b) => b.pnl - a.pnl)[0], lose = H0.filter(x => x.pnl < 0).sort((a, b) => a.pnl - b.pnl)[0];
  const evs = atkEvents(), atkW = evs.filter(f => f.uid === p.id && f.ok).length, atkL = evs.filter(f => f.uid === p.id && !f.ok).length;
  const style = lev >= .6 ? ['🔥', '불나방', '자산 대부분이 레버리지예요. 한 번에 크게 벌거나 크게 잃어요.'] : lev >= .3 ? ['⚔️', '공격형', '레버리지를 적극적으로 써요.']
    : cashR >= .5 ? ['🐢', '현금 부자', '현금이 절반 넘게 놀고 있어요. 기회를 기다리는 중이에요.'] : conc >= .5 ? ['🎯', '몰빵형', `${big.name}에 자산 ${Math.round(conc * 100)}%가 몰려 있어요.`] : ['⚖️', '균형형', '여러 곳에 고르게 나눠 담았어요.'];
  const tile = (k, v, s, c = '') => `<div class="pa-t"><small>${k}</small><b class="num ${c}">${v}</b>${s ? `<span>${s}</span>` : ''}</div>`;
  const tips = [];
  if (risky.length) tips.push(`☠️ 청산 직전 포지션이 ${risky.length}개 있어요. 가장 가까운 건 ${(near * 100).toFixed(1)}%만 움직이면 청산이에요.`);
  if (above) tips.push(`🏃 ${rk - 1}위 ${esc(above.name)}님까지 <b>${won(Math.max(0, above.w - w))}</b> 남았어요.`);
  else if (R.length > 1) tips.push(`👑 1위예요! 2위 ${esc(R[1].name)}님과 <b>${won(w - R[1].w)}</b> 차이.`);
  return `<div class="sec"><div class="sec-h"><h2>📊 투자 분석</h2></div>
    <div class="card pana"><div class="pa-style"><span class="pa-ic">${style[0]}</span><div><b>${style[1]}</b><small>${style[2]}</small></div></div>
      <div class="pa-grid">
        ${tile('총 손익', signWon(gain), `시작 ${krwUnits(base)}원 대비 ${pctTxt(roi)}`, cls(gain))}
        ${tile('순위', rk ? `${rk}위 / ${R.length}명` : '-', top && rk > 1 ? `1위와 ${krwUnits(Math.max(0, top.w - w))}원 차이` : rk === 1 ? '지금 1등!' : '')}
        ${tile('레버리지 비중', Math.round(lev * 100) + '%', futs.length ? `${futs.length}개 · 평균 ${avgX.toFixed(1)}배` : '롱·숏 없음', '')}
        ${tile('현금 비중', Math.round(cashR * 100) + '%', `현금 ${krwUnits(p.cash || 0)}원`)}
        ${tile('제일 많이 번 것', win ? esc(win.name) : '-', win ? `<i class="up">${signWon(win.pnl)}</i>` : '수익 난 게 없어요')}
        ${tile('제일 많이 잃은 것', lose ? esc(lose.name) : '-', lose ? `<i class="down">${signWon(lose.pnl)}</i>` : '손해 본 게 없어요')}
        ${tile('게임 손익', signWon(p.casino || 0), '도박장 누적', cls(p.casino || 0))}
        ${tile('공격 전적', `${atkW}승 ${atkL}패`, '')}
      </div>
      ${tips.length ? `<div class="pa-tips">${tips.map(t => `<p>${t}</p>`).join('')}</div>` : ''}</div></div>`;
}
function renderMe() {
  const el = $('#tab-wallet'); if (!el) return;
  bnBody();
  if (!S.me) { el.innerHTML = `<div class="empty">${S.readOnly ? '관전 중에는 프로필이 없어요.' : '참가하면 50억원으로 시작해요.'}</div>${S.readOnly ? '' : '<button class="cta" type="button" data-join>참가하기</button>'}`; return; }
  el.innerHTML = profileBody({ id: S.uid, ...S.me }, true);
}
function renderFriendProfile() {
  const d = $('#profile'); const id = S.profile; if (!id || !d) return;
  const p0 = S.players[id]; if (!p0) { closeProfile(); return; }
  const st0 = d.scrollTop;
  d.innerHTML = `<div class="in"><div class="dtop"><button class="back" type="button" id="profBack" aria-label="뒤로"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><b>프로필</b></div>${id === S.uid ? profileBody({ id, ...p0 }, true) : rivalHTML({ id, ...p0 })}</div>`;
  const bn = okPhoto(p0.banner); d.classList.toggle('bnpage', bn); if (bn) d.style.setProperty('--bn', `url(${p0.banner})`); else d.style.removeProperty('--bn'); d.scrollTop = st0;
}

/* ═════════ 친구 프로필: 화려하지만 깔끔하게 · 가진 것마다 공격 버튼 ═════════ */
function rivalHTML(p) {
  const w = worth(p), roi = roiOf(p, w), rk = ranking().findIndex(x => x.id === p.id) + 1, lord = lordOf(p.id), on = isOn(p);
  const evs = atkEvents(), won_ = evs.filter(f => f.uid === p.id && f.ok).length, lost_ = evs.filter(f => f.uid === p.id && !f.ok).length;
  const bn = okPhoto(p.banner) ? ` style="--bn:url(${p.banner})"` : '', col = avaColor(p.id);
  const rows = [];
  // 털 수 있는 것: 현물(코인·주식·원자재)과 선물
  const add = (field, sym, x) => {
    const a = assetOf(sym); if (!a) return; const I = atkInfo(p, field, sym), isFut = field === 'kFut' || field === 'uFut';
    const badge = KC[sym] ? kBadge(a) : uBadge(a);
    const tag = isFut ? `<span class="postag ${x.d > 0 ? 'long' : 'short'}">${x.label}</span>` : '';
    const usdTxt = UC[sym] && !isFut && UC[sym].m !== 'fx' ? ` · ${usd(uUsdOf(sym, x.q))}` : '';
    const sub = isFut ? `증거금 ${krw(I.E || x.value)}${x.dist != null ? ` · 청산까지 ${(x.dist * 100).toFixed(1)}%` : ''}` : (I.profit > 0 ? `<span class="up">수익 +${krw(I.profit)}</span>` : I.profit < 0 ? `<span class="down">손해 중</span>` : '본전') + usdTxt;
    const btn = I.ok ? `<button type="button" class="atkb ${isFut ? 'hunt' : 'loot'}" data-atk="${p.id}|${field}|${sym}"><b>${isFut ? '🎯' : '💰'} ${Math.round(I.prob * 100)}%</b><small>${isFut ? '사냥' : '약탈'}</small></button>`
      : `<span class="atkb off"><small>${esc(I.why || '')}</small></span>`;
    rows.push({ v: x.value, html: `<div class="rvrow">${badge}<span class="sname"><b>${esc(a.n)} ${tag}</b><small class="num">${sub}</small></span><span class="sprice"><div class="p num">${krw(x.value)}</div></span>${btn}</div>` });
  };
  kPositions(p).forEach(x => add(x.kind === 'fut' ? 'kFut' : 'kHold', x.sym, x));
  uPositions(p).forEach(x => add(x.kind === 'fut' ? 'uFut' : 'uHold', x.sym, x));
  rows.sort((a, b) => b.v - a.v);
  const stk = stakePositions(p), stop = guChief();
  return `<div class="rv-hero${bn ? ' bn' : ''}"${bn} style="--c:${col}${bn ? `;--bn:url(${p.banner})` : ''}">
      <div class="rv-ava${on ? ' on' : ''}">${ava(p, true)}</div>
      <h2>${esc(p.name)} <span class="lvtag">LV.${lvOf(p)}</span></h2>
      <div class="rv-badges">${rk ? `<span class="rk${rk <= 3 ? ' t' + rk : ''}">🏆 ${rk}위</span>` : ''}${lord ? `<span>👑 ${esc(lord)}</span>` : ''}<span class="${on ? 'live' : ''}">${on ? '● 접속 중' : seenAgo(p) || '오프라인'}</span></div>
    </div>
    <div class="rv-stats"><div><small>총자산</small><b class="num">${won(w)}</b></div><div><small>수익률</small><b class="num ${cls(roi)}">${pctTxt(roi)}</b></div><div><small>공격 전적</small><b class="num">${won_}승 ${lost_}패</b></div></div>
    ${(() => { const why = duelWhy(p.id), B = bountyOf(p); return (B ? `<div class="rv-bounty">👑 1등 현상금 <b class="num">${krw(B)}</b> · 공격 성공하면 같이 받아요</div>` : '') + (why ? `<button type="button" class="cta duelgo${why === 'ok' ? '' : ' off'}" data-duel="${p.id}" ${why === 'ok' ? '' : 'disabled'}>⚔️ 결투 신청 <small>${why === 'ok' ? '5분 수익률 승부 · 판돈 총자산 3% · 하루 1번' : esc(why)}</small></button>` : ''); })()}
    ${S.me && revengeOn(p.id) ? `<div class="rv-rev">🔥 이 사람이 방금 나를 공격했어요 · 10분 동안 <b>반값 복수</b></div>` : ''}
    <div class="sec"><div class="sec-h"><h2>가진 것</h2><button type="button" class="atk-how" id="atkHelp">❓ 약탈·사냥이 뭐예요?</button><small>${myAtkWait() ? `· ⏳ ${Math.ceil(myAtkWait() / 6e4)}분 뒤 공격 가능` : ''}</small></div>
      <div class="slist">${rows.map(r => r.html).join('') || '<div class="empty">가진 게 없어요.</div>'}
      ${stk.map(x => `<div class="rvrow"><span class="logo-b bb" style="background:var(--krw)">${BOND[x.sym].i + 1}</span><span class="sname"><b>${x.sym}${(stop[x.sym] || {}).id === p.id ? ' 👑' : ''} <span class="postag spot">지분</span></b><small class="num">${x.q}%</small></span><span class="sprice"><div class="p num">${krw(x.value)}</div></span><span class="atkb off"><small>공격 불가</small></span></div>`).join('')}</div></div>`;
}
