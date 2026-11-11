'use strict';
/* ═════════ 🏛️ 서울 구채 (없어짐, 2026-11-12) — 환불용 최소 코드만 ═════════
   구채 화면·매입·이자·구청장은 legacy/seoul-bonds/ 로 옮겼어요.
   아직 접속 안 한 사람의 구채는 총자산에 그대로 잡히고, 다음 접속 때 gRefund(gbond.js)가 원화로 바꿔요.
   ⚠️ 가격 시드(bond1:)와 BOND 기본값·장수는 바꾸면 안 돼요(AGENTS.md 6번). 모두 환불받으면 이 파일도 legacy로 옮겨도 돼요. */
const GU_RANK = ['강남구', '서초구', '송파구', '용산구', '성동구', '마포구', '영등포구', '종로구', '중구', '강동구', '광진구', '양천구', '동작구',
  '강서구', '서대문구', '성북구', '동대문구', '은평구', '관악구', '구로구', '노원구', '금천구', '중랑구', '강북구', '도봉구'];
const BOND_N = 100, BOND_SELL = 0.01, BOND_CURVE = 1.5;
const BOND = {};
GU_RANK.forEach((g, i) => { BOND[g] = { gu: g, i, base: Math.round(1e8 * Math.pow(0.05, i / 24) / 1e5) * 1e5, cp: (3 + 5 * i / 24) / 1e4 }; });
// 팔린 장수: 아직 가진 것 + 이미 환불받은 것(bondsRef). 환불 순서와 상관없이 시세가 똑같아요
function bondSold(gu) { let n = 0; for (const p of Object.values(S.players)) if (p && p.name) n += ((p.bonds || {})[gu] || 0) + ((p.bondsRef || {})[gu] || 0); return n; }
const bondDrift = (gu, t) => { const k = 'bond1:' + gu + ':'; return 0.09 * vnoise(k + 'a', t / (6 * H)) + 0.035 * vnoise(k + 'b', t / 18e5) + 0.012 * vnoise(k + 'c', t / 12e4); };
const bondUnit = (gu, i, t = now()) => Math.round(BOND[gu].base * (1 + BOND_CURVE * Math.pow(Math.max(0, i) / BOND_N, 1.3)) * Math.exp(bondDrift(gu, t)) / 1000) * 1000;
// 가진 n장을 지금 다 팔 때 받는 돈(맨 위 장부터 한 장씩, 수수료 없음) = 환불액
function bondRefundOf(gu, n, sold = bondSold(gu)) { let s = 0; for (let j = 1; j <= n; j++) s += bondUnit(gu, sold - j); return s; }
function bondWorth(p) { let v = 0; for (const [g, n] of Object.entries((p && p.bonds) || {})) if (BOND[g] && n > 0) v += bondRefundOf(g, n); return v; }
const bondPending = p => Object.entries((p && p.bonds) || {}).reduce((a, [g, n]) => a + (BOND[g] && n > 0 ? n : 0), 0);
