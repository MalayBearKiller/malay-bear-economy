'use strict';
/* ═════════ 프로필: 내 프로필 탭(하단 맨 오른쪽)과 친구 프로필이 같은 모양 ═════════
   위: 사진·이름·레벨·순위·구청장 + 총자산 · 수익률 · 현금 + 자산 구성 막대
   아래: 가진 것 전부 한 목록 (코인·선물·주식·구채). 내 프로필이면 맨 아래 설정 한 줄. */
function allHoldings(p) {
  const out = [];
  kPositions(p).forEach(x => { const c = KC[x.sym]; out.push({ ...x, badge: kBadge(c), name: c.n, tag: x.kind === 'fut' ? x.label : '코인', tagc: x.kind === 'fut' ? (x.d > 0 ? 'long' : 'short') : 'spot', sub: `${kQty(x.q)} ${c.a}`, open: `data-kcoin="${x.sym}"` }); });
  uPositions(p).forEach(x => { const c = UC[x.sym], fut = x.kind === 'fut'; out.push({ ...x, badge: uBadge(c), name: c.n, tag: fut ? x.label : { us: '주식', cm: '현물', fx: '외화' }[c.m], tagc: fut ? (x.d > 0 ? 'long' : 'short') : 'spot', sub: fut ? `증거금 ${krw(x.principal)}` : uQty(x.q, x.sym) + (c.m !== 'fx' ? ` · ${usd(uUsdOf(x.sym, x.q))}` : ''), open: `data-us="${x.sym}"` }); });
  const top = guChief();
  Object.entries(p.bonds || {}).forEach(([g, n]) => { if (!BOND[g] || !n) return; const value = bondSellGet(g, n), principal = n * ((p.bCost || {})[g] || 0);
    out.push({ sym: g, kind: 'bond', badge: `<span class="logo-b bb" style="background:${chiefColor(p.id)}">${BOND[g].i + 1}</span>`, name: g + (top[g] && top[g].id === p.id ? ' 👑' : ''), tag: '구채', tagc: 'spot', sub: `${n}장`, value, principal, pnl: value - principal, pct: principal ? value / principal - 1 : 0, open: `data-bond="${g}"` }); });
  return out.sort((a, b) => b.value - a.value);
}
function profileBody(p, isMe) {
  const w = worth(p, S.tick), roi = roiOf(p, w), rk = ranking(S.tick).findIndex(x => x.id === p.id) + 1, lord = lordOf(p.id);
  const H0 = allHoldings(p);
  const sum = f => H0.filter(f).reduce((a, x) => a + x.value, 0);
  const parts = [['현금', p.cash || 0, '#16b27e'], ['코인', sum(x => x.kind === 'spot' && KC[x.sym]), '#f08c00'], ['선물', sum(x => x.kind === 'fut'), '#f2414f'],
    ['주식', sum(x => x.kind === 'us'), '#2b2745'], ['구채', sum(x => x.kind === 'bond'), '#1450d2']].filter(x => x[1] > 0);
  const tot = parts.reduce((a, x) => a + x[1], 0) || 1;
  const bn = okPhoto(p.banner) ? ` style="--bn:url(${p.banner})"` : '';
  let h = `<div class="phero${bn ? ' bn' : ''}"${bn}>
      <div class="ph-id">${isMe ? `<button type="button" class="ph-ava" id="photoBtn" aria-label="사진 바꾸기">${ava(p, true)}<i>📷</i></button>` : ava(p, true)}
        <div class="ph-nm"><b>${esc(p.name)} <span class="lvtag">LV.${lvOf(p)}</span></b><small>${rk ? rk + '위' : ''}${lord ? ` · 👑 ${lord}` : ''}</small></div></div>
      ${(() => { const u = uPositions(p).filter(x => x.kind === 'us').reduce((a, x) => a + uUsdOf(x.sym, x.q), 0); return u ? `<div class="ph-usd">💵 달러 자산 <b class="num">${usd(u)}</b> <small>(${krw(u * FX.p)})</small></div>` : ''; })()}<div class="ph-w"><small>총자산</small><b class="num" data-roll="ph-${p.id}" data-v="${w}">${won(w)}</b><span class="num"><b class="${cls(roi)}">${pctTxt(roi)}</b> · 현금 ${won(p.cash || 0)}</span></div>
      <div class="ws-bar">${parts.map(x => `<i style="width:${(x[1] / tot * 100).toFixed(2)}%;background:${x[2]}"></i>`).join('')}</div>
      <div class="ph-leg">${parts.map(x => `<span><i style="background:${x[2]}"></i>${x[0]} <b class="num">${(x[1] / tot * 100).toFixed(0)}%</b></span>`).join('')}</div>
    </div>
    <div class="sec"><div class="sec-h"><h2>가진 것</h2><small>${H0.length}개 · 평가금액 순</small></div><div class="slist">`;
  h += H0.map(x => `<button type="button" class="pos" ${x.open}>${x.badge}<span class="sname"><b>${esc(x.name)} <span class="postag ${x.tagc}">${esc(x.tag)}</span></b><small class="dim num">${x.sub}${x.dist != null ? ` · 청산까지 ${(x.dist * 100).toFixed(1)}%` : ''}</small></span>
      <span class="r num"><b>${won(x.value)}</b><br><small class="${cls(x.pnl)}">${signWon(x.pnl)} (${pctTxt(x.pct)})</small></span></button>`).join('') || `<div class="empty">${isMe ? '아직 아무것도 없어요. 거래소에서 시작해 보세요.' : '가진 게 없어요.'}</div>`;
  h += `</div></div>`;
  if (isMe) h += `<div class="ph-set">${[['photoBtn2', '📸 사진 바꾸기', 1], ['photoDel', '사진 지우기', !!p.photo], ['bannerDel', '배경 지우기', !!p.banner], ['bannerPick', `🖼️ 배경 바꾸기 · ${won(BANNER_COST)}`, 1], ['renameOpen', `✏️ 닉네임 · ${won(RENAME_COST)}`, 1], ['logoutBtn', '로그아웃', !!S.fb && S.mode === 'live']]
      .filter(x => x[2]).map(([id, l]) => `<button type="button" id="${id}">${l}</button>`).join('')}</div>`;
  return h;
}
function renderMe() {
  const el = $('#tab-wallet'); if (!el) return;
  if (!S.me) { el.innerHTML = `<div class="empty">${S.readOnly ? '관전 중에는 프로필이 없어요.' : '참가하면 50억원으로 시작해요.'}</div>${S.readOnly ? '' : '<button class="cta" type="button" data-join>참가하기</button>'}`; return; }
  el.innerHTML = profileBody({ id: S.uid, ...S.me }, true);
}
function renderFriendProfile() {
  const d = $('#profile'); const id = S.profile; if (!id || !d) return;
  const p0 = S.players[id]; if (!p0) { closeProfile(); return; }
  const st0 = d.scrollTop;
  d.innerHTML = `<div class="in"><div class="dtop"><button class="back" type="button" id="profBack" aria-label="뒤로"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><b>프로필</b></div>${id === S.uid ? profileBody({ id, ...p0 }, true) : rivalHTML({ id, ...p0 })}</div>`;
  d.classList.remove('bnpage'); d.scrollTop = st0;
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
  const bonds = Object.entries(p.bonds || {}).filter(([g, n]) => BOND[g] && n > 0);
  const top = guChief();
  return `<div class="rv-hero${bn ? ' bn' : ''}"${bn} style="--c:${col}${bn ? `;--bn:url(${p.banner})` : ''}">
      <div class="rv-ava${on ? ' on' : ''}">${ava(p, true)}</div>
      <h2>${esc(p.name)} <span class="lvtag">LV.${lvOf(p)}</span></h2>
      <div class="rv-badges">${rk ? `<span class="rk${rk <= 3 ? ' t' + rk : ''}">🏆 ${rk}위</span>` : ''}${lord ? `<span>👑 ${esc(lord)}</span>` : ''}<span class="${on ? 'live' : ''}">${on ? '● 접속 중' : seenAgo(p) || '오프라인'}</span></div>
    </div>
    <div class="rv-stats"><div><small>총자산</small><b class="num">${won(w)}</b></div><div><small>수익률</small><b class="num ${cls(roi)}">${pctTxt(roi)}</b></div><div><small>공격 전적</small><b class="num">${won_}승 ${lost_}패</b></div></div>
    ${S.me && revengeOn(p.id) ? `<div class="rv-rev">🔥 이 사람이 방금 나를 공격했어요 · 10분 동안 <b>반값 복수</b></div>` : ''}
    <div class="sec"><div class="sec-h"><h2>가진 것</h2><button type="button" class="atk-how" id="atkHelp">❓ 약탈·사냥이 뭐예요?</button><small>${myAtkWait() ? `· ⏳ ${Math.ceil(myAtkWait() / 6e4)}분 뒤 공격 가능` : ''}</small></div>
      <div class="slist">${rows.map(r => r.html).join('') || '<div class="empty">가진 게 없어요.</div>'}
      ${bonds.map(([g, n]) => `<div class="rvrow"><span class="logo-b bb" style="background:var(--krw)">${BOND[g].i + 1}</span><span class="sname"><b>${g}${(top[g] || {}).id === p.id ? ' 👑' : ''} <span class="postag spot">구채</span></b><small class="num">${n}장</small></span><span class="sprice"><div class="p num">${krw(bondSellGet(g, n))}</div></span><span class="atkb off"><small>공격 불가</small></span></div>`).join('')}</div></div>`;
}
