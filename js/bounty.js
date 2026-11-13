'use strict';
/* ═════════ 📜 현상수배 게시판 (sb2_bounties + 원자적 트랜잭션) ═════════
   - 누구에게나(본인 제외) 현상금을 걸거나 이미 열린 수배에 돈을 더 얹을 수 있어요 (한 줄 사유 40자).
   - 최소 금액: max(2억원, 접속·참가자 중앙값 총자산의 4%), 1억원 단위 반올림 (최대 최소선 100억원).
   - 수배 기간: 기본 24시간 + 표적의 전체 보호막(집중포화 6시간·왕좌 저격 30분) 가동 시간만큼 자동 연장 (최대 +12시간).
   - 사냥꾼 수령: 돈을 얹지 않은 제3자가 약탈·마진 사냥·결투 승리로 표적을 잡으면 수령!
       단, 양학 페널티(고레벨 부자가 약자 공격) 비율만큼 현상금도 깎이고, 깎인 몫은 의뢰인들에게 지분대로 환불돼요.
   - 역관광(방어 3회): 표적이 수배 기간 중 제3자의 공격(비용 5,000만원 이상, 의뢰인 공격 제외)을 3번 막아내면
       표적이 현상금의 50%를 역수령하고 나머지 50%는 의뢰인들에게 환불돼요.
   - 만료: 기간 안에 아무도 못 잡으면 의뢰인들에게 100% 환불돼요.
   - 모든 수령·전환·환불은 Firestore runTransaction(runWalletTx)으로 처리해 동시 수령·이중 환불 돈 복사를 원천 차단해요. */

const BTY = { MIN_FLOOR: 2e8, MIN_CAP: 100e8, MED_PCT: 0.04, UNIT: 1e8, DUR: D, EXT_CAP: 12 * H, DEF_N: 3, DEF_MIN_COST: 50_000_000 };

// 중앙값 총자산 기준 최소 현상금 (1억원 단위)
function bountyMin() {
  const ws = ranking().filter(p => !p.bot || S.mode === 'demo').map(p => p.w).filter(w => w > 0).sort((a, b) => a - b);
  if (!ws.length) return BTY.MIN_FLOOR;
  const mid = ws.length % 2 ? ws[(ws.length - 1) >> 1] : (ws[(ws.length >> 1) - 1] + ws[ws.length >> 1]) / 2;
  const raw = Math.round(mid * BTY.MED_PCT / BTY.UNIT) * BTY.UNIT;
  return Math.max(BTY.MIN_FLOOR, Math.min(BTY.MIN_CAP, raw));
}

// 표적의 전체 보호막 구간과 겹치는 시간만큼 수배 만료 연장 (최대 +12시간)
function bountyShieldExt(b) {
  if (!b || !b.ts || typeof globalShieldSpans !== 'function') return 0;
  const spans = globalShieldSpans(b.target);
  let ext = 0;
  for (let pass = 0; pass < 2; pass++) {
    const end = b.ts + BTY.DUR + ext;
    let sum = 0;
    for (const [s0, s1] of spans) {
      const a = Math.max(b.ts, s0), z = Math.min(end, s1);
      if (z > a) sum += z - a;
    }
    ext = Math.min(BTY.EXT_CAP, sum);
  }
  return ext;
}
const bountyEndAt = b => (b ? (b.ts || 0) + BTY.DUR + bountyShieldExt(b) : 0);
const isBountyOpen = b => !!(b && b.status === 'open' && now() < bountyEndAt(b));
const openBounties = () => (S.bounties || []).filter(isBountyOpen).sort((a, b) => (b.total || 0) - (a.total || 0));
const openBountyOf = tid => (S.bounties || []).find(b => b && b.target === tid && isBountyOpen(b)) || null;

// 파산 지원금 판정용: 내가 아직 열린 수배에 걸어 둔 돈 + 닫힌 수배에서 아직 안 찾아간 내 환불 몫
function openBountyStakeOf(uid) {
  if (!uid) return 0;
  let v = 0;
  (S.bounties || []).forEach(b => {
    if (!b || !b.contributors || !(b.contributors[uid] > 0)) return;
    if (b.status === 'open') { v += b.contributors[uid]; return; }
    if ((b.refundPool || 0) > 0 && !(b.refunded && b.refunded[uid] != null)) {
      v += Math.floor(b.refundPool * b.contributors[uid] / Math.max(1, b.total || 1));
    }
  });
  return v;
}

// 표적의 유효 방어 횟수 (의뢰인이 직접 때린 공격·5,000만원 미만 짤짤이 공격 제외)
function bountyDefHits(b) {
  if (!b) return [];
  const end = bountyEndAt(b), cons = b.contributors || {};
  return atkEvents().filter(f =>
    f.target === b.target && !f.ok && f.ts >= b.ts && f.ts <= end
    && (f.cost || 0) >= BTY.DEF_MIN_COST && f.uid !== b.target && !cons[f.uid]
  );
}

/* ───────── 1) 현상금 걸기 / 추가 적립 (원자적 트랜잭션) ───────── */
async function bountyPost(tid, amt, reason) {
  if (!S.me || S.saving || S.readOnly) return false;
  if (S.btyNoRule && S.mode === 'live') { toast('방장이 Firestore 규칙을 아직 업데이트하지 않았어요'); return false; }
  if (!tid || tid === S.uid || !S.players[tid]) { toast('올바른 대상을 골라 주세요'); return false; }
  amt = Math.floor((+amt || 0) / BTY.UNIT) * BTY.UNIT;
  const cur = openBountyOf(tid), minAmt = cur ? BTY.UNIT : bountyMin();
  if (amt < minAmt) { toast(`최소 ${krw(minAmt)}부터 걸 수 있어요`); return false; }
  if (S.me.cash < amt) { toast(`현금이 ${krw(amt - S.me.cash)} 부족해요`); return false; }
  const cleanReason = String(reason || '').trim().slice(0, 40);
  const existingId = cur ? cur.id : null;
  const freshId = 'b_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);

  let out = null;
  try {
    out = await runWalletTx(async tx => {
      const mePath = COL_P + '/' + S.uid;
      const meDoc = await tx.get(mePath);
      const bDoc = existingId ? await tx.get(COL_B + '/' + existingId) : null;
      if (!meDoc || (meDoc.cash || 0) < amt) return null;
      const canTopUp = bDoc && bDoc.status === 'open' && bDoc.target === tid && now() < bountyEndAt(bDoc);
      if (!canTopUp && amt < bountyMin()) return null;

      const nextMe = { ...meDoc, cash: Math.round((meDoc.cash || 0) - amt) };
      if (canTopUp) {
        const cons = { ...(bDoc.contributors || {}) };
        cons[S.uid] = Math.round((cons[S.uid] || 0) + amt);
        const nextB = {
          ...bDoc,
          total: Math.round((bDoc.total || 0) + amt),
          contributors: cons,
          updatedAt: now(),
        };
        if (cleanReason) { nextB.reason = cleanReason; nextB.reasonBy = S.uid; }
        tx.set(mePath, nextMe);
        tx.set(COL_B + '/' + existingId, nextB);
        return { mode: 'add', total: nextB.total, reason: nextB.reason || '' };
      }
      const nextB = {
        status: 'open',
        target: tid,
        poster: S.uid,
        total: Math.round(amt),
        contributors: { [S.uid]: Math.round(amt) },
        refunded: {},
        ts: now(),
        updatedAt: now(),
      };
      if (cleanReason) { nextB.reason = cleanReason; nextB.reasonBy = S.uid; }
      tx.set(mePath, nextMe);
      tx.set(COL_B + '/' + freshId, nextB);
      return { mode: 'new', total: nextB.total, reason: cleanReason };
    });
  } catch {
    toast('현상수배 등록에 실패했어요. 잠시 후 다시 시도해 주세요.');
    return false;
  }
  if (!out) { toast('현상금을 걸지 못했어요 (현금 또는 최소 금액을 확인해 주세요)'); return false; }
  addFeed({ kind: 'k_bty_add', target: tid, amt, total: out.total, add: out.mode === 'add', reason: out.reason || undefined });
  toast(`📜 ${nameOf(tid)}님에게 현상금 ${krw(amt)} ${out.mode === 'add' ? '추가!' : '등록!'} (총 ${krw(out.total)})`);
  buzz(50); closeSheetRaw(); renderAll();
  return true;
}

/* ───────── 2) 사냥꾼 현상금 수령 (공격·결투 성공 직후 호출) ───────── */
async function bountyClaim(tid, bullyPen = 0, how = 'atk') {
  if (!S.me || S.readOnly || !tid || tid === S.uid) return 0;
  const b0 = openBountyOf(tid);
  if (!b0 || (b0.contributors && b0.contributors[S.uid])) return 0;
  const pen = Math.max(0, Math.min(0.6, +bullyPen || 0));
  let res = null;
  try {
    res = await runWalletTx(async tx => {
      const mePath = COL_P + '/' + S.uid, bPath = COL_B + '/' + b0.id;
      const [meDoc, bDoc] = await Promise.all([tx.get(mePath), tx.get(bPath)]);
      if (!meDoc || !bDoc || bDoc.status !== 'open') return null;
      if (bDoc.target === S.uid || (bDoc.contributors && bDoc.contributors[S.uid])) return null;
      if (now() >= bountyEndAt(bDoc)) return null;
      const payout = Math.round((bDoc.total || 0) * (1 - pen));
      const refundPool = Math.max(0, Math.round((bDoc.total || 0) - payout));
      const nextMe = { ...meDoc, cash: Math.round((meDoc.cash || 0) + payout) };
      const nextB = {
        ...bDoc,
        status: 'claimed',
        claimedBy: S.uid,
        claimedAt: now(),
        how,
        payout,
        bullyPen: +pen.toFixed(3),
        refundPool,
        refunded: bDoc.refunded || {},
      };
      tx.set(mePath, nextMe);
      tx.set(bPath, nextB);
      return { payout, refundPool, total: bDoc.total, pen };
    });
  } catch { return 0; }
  if (!res) return 0;
  addFeed({ kind: 'k_bty_claim', target: tid, amt: res.payout, total: res.total, pen: res.pen ? +res.pen.toFixed(2) : undefined, how });
  setTimeout(() => {
    bigWin(res.payout, `📜 현상금 ${krw(res.payout)} 수령!${res.pen ? ` (양학 -${Math.round(res.pen * 100)}% 차감분 의뢰인 환불)` : ''}`);
    confetti();
  }, 900);
  renderAll();
  return res.payout;
}

/* ───────── 3) 자동 정산 루프: 방어 3회 역수령 · 만료 전환 · 의뢰인 지분 환불 ───────── */
let btyBusy = false, btyLast = 0;
async function bountyTick() {
  if (!S.me || S.readOnly || S.saving || btyBusy || Date.now() - btyLast < 3000) return;
  btyLast = Date.now();
  const list = S.bounties || [];
  if (!list.length) return;

  // ① 내게 걸린 수배에서 방어 3회 달성 시 역수령 (표적 본인만 실행)
  const myDef = list.find(b => b && b.status === 'open' && b.target === S.uid && now() < bountyEndAt(b) && bountyDefHits(b).length >= BTY.DEF_N);
  if (myDef) {
    btyBusy = true;
    try {
      const r = await runWalletTx(async tx => {
        const mePath = COL_P + '/' + S.uid, bPath = COL_B + '/' + myDef.id;
        const [meDoc, bDoc] = await Promise.all([tx.get(mePath), tx.get(bPath)]);
        if (!meDoc || !bDoc || bDoc.status !== 'open' || bDoc.target !== S.uid) return null;
        if (bountyDefHits(bDoc).length < BTY.DEF_N) return null;
        const reward = Math.floor((bDoc.total || 0) * 0.5);
        const refundPool = Math.max(0, Math.round((bDoc.total || 0) - reward));
        tx.set(mePath, { ...meDoc, cash: Math.round((meDoc.cash || 0) + reward) });
        tx.set(bPath, { ...bDoc, status: 'defended', defendedAt: now(), payout: reward, refundPool, refunded: bDoc.refunded || {} });
        return { reward, total: bDoc.total };
      });
      if (r) {
        addFeed({ kind: 'k_bty_def', target: S.uid, amt: r.reward, total: r.total });
        bigWin(r.reward, `🛡️ 수배 방어 3회 성공! 현상금 절반 ${krw(r.reward)} 역수령`);
        renderAll();
      }
    } catch {} finally { btyBusy = false; }
    return;
  }

  // ② 만료된 open 수배 → expired 전환 (의뢰인이 먼저 처리, 1분 넘으면 접속자 누구나 전환 도와줌)
  const exp = list.find(b => {
    if (!b || b.status !== 'open') return false;
    const over = now() - bountyEndAt(b);
    return over >= 0 && ((b.contributors && b.contributors[S.uid]) || over >= 60e3);
  });
  if (exp) {
    btyBusy = true;
    try {
      await runWalletTx(async tx => {
        const bPath = COL_B + '/' + exp.id;
        const bDoc = await tx.get(bPath);
        if (!bDoc || bDoc.status !== 'open' || now() < bountyEndAt(bDoc)) return null;
        tx.set(bPath, { ...bDoc, status: 'expired', expiredAt: now(), refundPool: bDoc.total, refunded: bDoc.refunded || {} });
        return true;
      });
    } catch {} finally { btyBusy = false; }
    return;
  }

  // ③ 닫힌 수배(claimed·defended·expired)에서 내 환불 몫 회수 (트랜잭션으로 1회만)
  const refB = list.find(b =>
    b && (b.status === 'claimed' || b.status === 'defended' || b.status === 'expired')
    && (b.refundPool || 0) > 0 && b.contributors && b.contributors[S.uid] > 0
    && !(b.refunded && b.refunded[S.uid] != null)
  );
  if (refB) {
    btyBusy = true;
    try {
      const got = await runWalletTx(async tx => {
        const mePath = COL_P + '/' + S.uid, bPath = COL_B + '/' + refB.id;
        const [meDoc, bDoc] = await Promise.all([tx.get(mePath), tx.get(bPath)]);
        if (!meDoc || !bDoc || !['claimed', 'defended', 'expired'].includes(bDoc.status)) return null;
        const myStake = (bDoc.contributors || {})[S.uid] || 0;
        if (!(myStake > 0) || (bDoc.refunded && bDoc.refunded[S.uid] != null)) return null;
        const share = Math.floor((bDoc.refundPool || 0) * myStake / Math.max(1, bDoc.total || 1));
        const nextRef = { ...(bDoc.refunded || {}), [S.uid]: share };
        tx.set(mePath, { ...meDoc, cash: Math.round((meDoc.cash || 0) + share) });
        tx.set(bPath, { ...bDoc, refunded: nextRef });
        return { share, status: bDoc.status, target: bDoc.target };
      });
      if (got && got.share > 0) {
        const why = got.status === 'expired' ? '수배 만료로' : got.status === 'defended' ? '표적 방어 성공으로 남은 절반' : '양학 감액 차액';
        toast(`📜 ${nameOf(got.target)}님 ${why} ${krw(got.share)} 환불받았어요`);
        renderAll();
      }
    } catch {} finally { btyBusy = false; }
  }
}

/* ───────── 화면: 홈 현상수배 게시판 · 프로필 배지 · 수배 시트 ───────── */
function bountyBoardHTML() {
  if (!S.me) return '';
  const list = openBounties(), open = S.btyOpen ?? LS.get('btyOpen', list.length > 0);
  const myWanted = openBountyOf(S.uid);
  const sub = myWanted
    ? `🚨 내 몸값 ${krwUnits(myWanted.total)}원! 3번 막으면 절반 역수령 (${bountyDefHits(myWanted).length}/${BTY.DEF_N})`
    : list.length ? `${list.length}명 수배 중 · 잡으면 현상금 즉시 지급` : '얄미운 친구에게 현상금을 걸어 사냥꾼을 부르세요';
  let h = `<div class="card btyboard${open ? '' : ' closed'}${myWanted ? ' wanted-me' : ''}">
    <div class="bty-top"><button type="button" class="bty-h" id="btyToggle"><span><b>📜 현상수배 게시판${list.length ? ` <i>${list.length}</i>` : ''}</b><small>${sub}</small></span><i class="th-arrow">${open ? '▲' : '▼'}</i></button>
      <button type="button" class="bty-new" data-btyopen="">+ 수배하기</button></div>`;
  if (open) {
    if (!list.length) {
      h += `<div class="bty-empty">지금 걸린 현상수배가 없어요 · 최소 <b class="num">${krwUnits(bountyMin())}원</b>부터 걸 수 있어요</div>`;
    } else {
      h += list.slice(0, 6).map(b => {
        const p = S.players[b.target] ? { id: b.target, ...S.players[b.target] } : { id: b.target, name: nameOf(b.target) };
        const isMe = b.target === S.uid, isCon = !!(b.contributors && b.contributors[S.uid]);
        const defs = bountyDefHits(b).length, leftMs = Math.max(0, bountyEndAt(b) - now());
        const nCon = Object.keys(b.contributors || {}).length, shOn = typeof globalShieldEnd === 'function' ? globalShieldEnd(b.target) : 0;
        return `<div class="bty-row${isMe ? ' me' : ''}"><button type="button" class="bty-who" data-player="${esc(b.target)}">${ava(p)}<span>
            <b>${esc(isMe ? '나 (수배 중)' : p.name)} <em class="num">💰 ${krwUnits(b.total)}원</em></b>
            ${b.reason ? `<q class="bty-q">“${esc(b.reason)}”</q>` : ''}
            <small class="num">의뢰 ${nCon}명 · 방어 ${defs}/${BTY.DEF_N} · ${hms(leftMs).slice(0, 5)} 남음${shOn ? ' · 🛡️연장중' : ''}</small>
          </span></button>
          <span class="bty-act">${isMe ? `<span class="bty-tag me">방어 ${defs}/3</span>`
            : `<button type="button" class="bty-add" data-btyopen="${esc(b.target)}">+얹기</button>${isCon ? '<span class="bty-tag con">의뢰인</span>' : `<button type="button" class="bty-hunt" data-player="${esc(b.target)}">사냥</button>`}`}</span></div>`;
      }).join('');
    }
  }
  return h + `</div>`;
}

function rivalBountyHTML(p) {
  if (!S.me || !p || p.id === S.uid) return '';
  const b = openBountyOf(p.id), isCon = !!(b && b.contributors && b.contributors[S.uid]);
  if (!b) {
    return `<button type="button" class="cta soft bty-prof-btn" data-btyopen="${esc(p.id)}">📜 현상수배 걸기 · 최소 ${krwUnits(bountyMin())}원</button>`;
  }
  const defs = bountyDefHits(b).length, leftMs = Math.max(0, bountyEndAt(b) - now());
  const pen = typeof bullyPen === 'function' ? bullyPen(S.me, p) : 0;
  const estGet = Math.round(b.total * (1 - pen));
  return `<div class="rv-btycard">
    <div class="rvb-h"><span>📜 수배 중 · <b class="num">${krw(b.total)}</b></span><small class="num">방어 ${defs}/${BTY.DEF_N} · ${hms(leftMs).slice(0, 5)}</small></div>
    ${b.reason ? `<p class="rvb-q">“${esc(b.reason)}”</p>` : ''}
    <div class="rvb-sub">${isCon ? '내가 돈을 얹은 수배라 직접 현상금을 받을 순 없어요 (제3자 사냥꾼 전용)' : `약탈·사냥·결투로 이기면 <b class="num">+${krw(estGet)}</b> 즉시 수령!${pen ? ` <small>(양학 -${Math.round(pen * 100)}% 적용)</small>` : ''}`}</div>
    <button type="button" class="bty-topup" data-btyopen="${esc(p.id)}">💰 현상금 더 얹기 (+1억~)</button>
  </div>`;
}

function renderBountySheet(b, sh) {
  const me = S.me; if (!me) { b.innerHTML = ''; return; }
  const others = ranking().filter(p => p.id !== S.uid && (!p.bot || S.mode === 'demo'));
  if (!sh.tid || !S.players[sh.tid] || sh.tid === S.uid) sh.tid = others[0] ? others[0].id : '';
  const cur = sh.tid ? openBountyOf(sh.tid) : null;
  const minAmt = cur ? BTY.UNIT : bountyMin();
  if (!sh.amt || +sh.amt < minAmt) sh.amt = minAmt;
  const amt = Math.floor((+sh.amt || 0) / BTY.UNIT) * BTY.UNIT;
  const can = !!sh.tid && amt >= minAmt && me.cash >= amt && !S.saving && !S.readOnly;
  const presets = cur ? [1e8, 3e8, 5e8, 10e8] : [minAmt, Math.max(minAmt + 2e8, 5e8), Math.max(minAmt + 8e8, 10e8), Math.max(minAmt * 2, 20e8)];

  b.innerHTML = `<div class="atk-h"><span class="atk-k bty">📜 ${cur ? '현상금 추가 적립' : '현상수배 걸기'}</span></div>
    ${others.length ? `<div class="field"><label class="dim" style="font-size:12.5px;font-weight:700">표적 선택</label>
      <select id="btyTarget" class="bty-sel">${others.map(p => {
        const ob = openBountyOf(p.id);
        return `<option value="${esc(p.id)}"${p.id === sh.tid ? ' selected' : ''}>${esc(p.name)} (LV.${lvOf(p)} · ${krwUnits(p.w)}원)${ob ? ` — 수배 ${krwUnits(ob.total)}` : ''}</option>`;
      }).join('')}</select></div>` : '<p class="atk-why">수배할 다른 참가자가 아직 없어요</p>'}
    ${cur ? `<div class="bty-cur">현재 현상금 <b class="num">${krw(cur.total)}</b> · 의뢰 ${Object.keys(cur.contributors || {}).length}명 · 방어 ${bountyDefHits(cur).length}/${BTY.DEF_N}</div>` : ''}
    <div class="field"><label class="dim" style="font-size:12.5px;font-weight:700">현상금 (${cur ? '1억원 이상 추가' : `최소 ${krw(minAmt)}`}) · 내 현금 ${krw(me.cash)}</label>
      <input id="btyAmt" type="number" inputmode="numeric" step="100000000" min="${minAmt}" value="${amt}">
      <div class="bty-chips">${[...new Set(presets)].map(v => `<button type="button" data-btyamt="${v}" aria-pressed="${amt === v}">${krwUnits(v)}원</button>`).join('')}</div></div>
    <div class="field"><label class="dim" style="font-size:12.5px;font-weight:700">한 줄 수배 사유 (선택, 40자)</label>
      <input id="btyReason" maxlength="40" placeholder="예: 내 비트코인 털어간 원수 잡아주세요" value="${esc(sh.reason || '')}"></div>
    <ul class="bty-rules">
      <li>돈을 얹지 않은 <b>제3자 사냥꾼</b>이 약탈·마진 사냥·결투로 잡으면 수령해요 (의뢰인 본인 수령 불가).</li>
      <li>고레벨 부자가 약자를 잡으면 <b>양학 페널티만큼 차감</b>되고, 차감분은 의뢰인에게 돌려줘요.</li>
      <li>표적이 제3자의 공격(비용 5,000만원 이상)을 <b>3번 막으면 절반을 역수령</b>하고 절반은 환불돼요.</li>
      <li>기본 24시간(보호막 시간만큼 자동 연장) 안에 안 잡히면 <b>100% 환불</b>돼요.</li>
    </ul>
    <button type="button" class="cta bty-go" id="btySubmit" ${can ? '' : 'disabled'}>📜 ${krw(amt)} ${cur ? '더 얹기' : '현상수배 걸기'}</button>`;
}
KSHEETS.bounty = renderBountySheet;

document.addEventListener('click', e => {
  const tg = e.target.closest && e.target.closest('#btyToggle');
  if (tg) { const cur = S.btyOpen ?? LS.get('btyOpen', (openBounties().length > 0)); S.btyOpen = !cur; LS.set('btyOpen', S.btyOpen); renderHome(); return; }
  const op = e.target.closest && e.target.closest('[data-btyopen]');
  if (op) { e.stopPropagation(); if (!S.me) { openSheet('join'); return; } const tid = op.dataset.btyopen || ''; if (S.sheet) closeSheetRaw(); openSheet('bounty', { tid }); $('#sheetWrap').classList.add('center'); return; }
  const chip = e.target.closest && e.target.closest('[data-btyamt]');
  if (chip && S.sheet && S.sheet.type === 'bounty') { S.sheet.amt = +chip.dataset.btyamt; const r = $('#btyReason'); if (r) S.sheet.reason = r.value; renderSheet(); return; }
  const go = e.target.closest && e.target.closest('#btySubmit');
  if (go && S.sheet && S.sheet.type === 'bounty') {
    const a = $('#btyAmt'), r = $('#btyReason');
    bountyPost(S.sheet.tid, a ? +a.value : S.sheet.amt, r ? r.value : S.sheet.reason);
  }
}, true);
document.addEventListener('change', e => {
  if (e.target && e.target.id === 'btyTarget' && S.sheet && S.sheet.type === 'bounty') {
    const r = $('#btyReason'); if (r) S.sheet.reason = r.value;
    S.sheet.tid = e.target.value; S.sheet.amt = 0; renderSheet();
  }
});
document.addEventListener('input', e => {
  if (!S.sheet || S.sheet.type !== 'bounty') return;
  if (e.target.id === 'btyReason') S.sheet.reason = e.target.value;
  if (e.target.id === 'btyAmt') {
    S.sheet.amt = +e.target.value || 0;
    const cur = S.sheet.tid ? openBountyOf(S.sheet.tid) : null, minAmt = cur ? BTY.UNIT : bountyMin();
    const amt = Math.floor(S.sheet.amt / BTY.UNIT) * BTY.UNIT;
    const btn = $('#btySubmit');
    if (btn) {
      btn.disabled = !S.sheet.tid || amt < minAmt || !S.me || S.me.cash < amt || S.saving || S.readOnly;
      btn.textContent = `📜 ${krw(Math.max(minAmt, amt))} ${cur ? '더 얹기' : '현상수배 걸기'}`;
    }
  }
});
