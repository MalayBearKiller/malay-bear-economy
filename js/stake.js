'use strict';
/* ═════════ 🏛️ 서울 지분 (예전 '구채'를 이름만 바꿔 다시 넣었어요, 2026-11-12) ═════════
   구마다 지분 100%(1%씩 100개). 가장 많이 가진 사람이 구청장. 많이 팔릴수록 1%값이 비싸지고(최대 2.5배), 시간 따라 시세도 출렁여요.
   매시간 정각에 배당(강남 0.03% ~ 도봉 0.08%/시간)이 원화로 들어와요. 팔 때 수수료 1%.
   지갑 칸 이름은 예전 그대로(bonds·bCost·bAt·cpH) — 1개 = 1%.
   ⚠️ 가격 시드('bond1:')와 BOND 기본값·개수는 바꾸면 안 돼요(AGENTS.md 6번). */
const GU_RANK = ['강남구', '서초구', '송파구', '용산구', '성동구', '마포구', '영등포구', '종로구', '중구', '강동구', '광진구', '양천구', '동작구',
  '강서구', '서대문구', '성북구', '동대문구', '은평구', '관악구', '구로구', '노원구', '금천구', '중랑구', '강북구', '도봉구'];
const BOND_N = 100, BOND_SELL = 0.01, BOND_CURVE = 1.5;
const BOND = {};
GU_RANK.forEach((g, i) => { BOND[g] = { gu: g, i, base: Math.round(1e8 * Math.pow(0.05, i / 24) / 1e5) * 1e5, cp: (3 + 5 * i / 24) / 1e4 }; });
const DISTRICTS = [{"n":"강동구","d":"M710,397L718,398L723,391L729,387L752,376L779,368L790,363L814,348L821,349L832,348L838,345L835,354L836,362L840,367L842,375L843,383L848,395L847,416L851,419L850,428L851,434L847,435L842,431L835,435L829,434L817,437L811,435L791,463L791,475L783,484L780,493L776,493L774,500L773,506L771,505L722,478L725,472L731,452L721,446L703,439L708,429L712,414L712,401L710,397Z","c":[778,420]},{"n":"송파구","d":"M618,486L630,489L639,489L653,487L669,481L682,479L690,463L703,439L721,446L731,452L725,472L722,478L771,505L773,506L773,510L769,513L766,518L764,527L766,535L775,540L780,541L784,538L788,541L802,545L807,548L804,557L804,563L801,573L798,577L788,580L783,599L783,603L777,608L768,608L762,616L753,612L746,611L746,620L755,626L750,630L742,630L735,626L735,632L729,637L729,631L725,624L708,593L709,590L702,578L696,571L689,565L678,559L641,547L633,545L624,536L619,499L617,496L618,486Z","c":[715,536]},{"n":"강남구","d":"M597,476L618,486L617,496L619,499L624,536L633,545L641,547L678,559L689,565L696,571L702,578L709,590L708,593L725,624L729,631L729,637L719,644L718,653L711,650L708,646L697,643L691,651L681,653L677,646L674,640L661,629L653,617L653,611L641,612L632,617L630,612L625,611L623,615L609,617L607,627L598,628L592,628L574,606L567,585L552,588L547,575L525,517L521,497L518,491L508,479L526,460L534,454L544,451L576,467L578,463L582,467L597,476Z","c":[610,556]},{"n":"서초구","d":"M508,479L518,491L521,497L525,517L547,575L552,588L567,585L574,606L592,628L598,628L607,627L609,617L623,615L625,611L630,612L632,617L641,612L653,611L653,617L661,629L674,640L677,646L673,653L674,658L672,659L669,666L666,668L661,677L661,686L652,690L649,697L634,694L628,696L628,700L633,703L632,707L627,710L625,720L627,723L618,725L616,728L606,725L600,725L588,729L584,725L579,723L577,717L564,704L556,702L555,697L561,688L559,684L560,676L557,671L558,663L558,658L554,654L551,646L554,640L547,635L536,653L525,659L517,661L506,661L502,656L497,644L495,643L491,631L480,631L477,633L479,640L478,644L471,646L461,654L459,649L461,636L458,630L453,625L449,617L447,608L450,558L454,549L446,543L445,539L444,518L449,515L459,514L463,517L480,507L492,499L496,494L500,486L508,479Z","c":[546,615]},{"n":"관악구","d":"M447,608L449,617L453,625L458,630L461,636L459,649L461,654L450,658L446,667L437,674L432,681L426,681L413,686L412,695L410,697L403,698L401,701L391,701L375,706L369,706L363,710L361,707L361,699L355,692L346,686L346,680L342,674L331,664L329,658L318,655L314,655L313,646L310,640L312,636L307,633L301,618L306,615L308,607L303,604L304,597L286,601L283,598L291,587L296,587L311,581L318,576L333,574L337,564L340,561L347,566L353,566L357,569L367,569L378,564L388,568L392,572L398,570L407,566L406,572L409,581L407,590L425,611L438,608L447,608Z","c":[376,631]},{"n":"동작구","d":"M444,518L445,539L446,543L454,549L450,558L447,608L438,608L425,611L407,590L409,581L406,572L407,566L398,570L392,572L388,568L378,564L367,569L357,569L353,566L347,566L340,561L337,564L333,574L318,576L311,581L296,587L291,587L309,558L324,555L326,544L335,517L338,516L336,508L349,509L368,505L385,498L391,505L399,510L413,517L444,518Z","c":[389,550]},{"n":"영등포구","d":"M264,422L286,438L297,443L343,456L354,458L371,475L378,481L380,489L385,498L368,505L349,509L336,508L338,516L335,517L326,544L324,555L309,558L291,587L285,585L277,576L272,557L271,541L272,530L265,520L243,507L244,493L245,485L248,483L258,477L261,471L264,472L267,465L267,459L259,439L257,439L255,432L264,422Z","c":[304,498]},{"n":"금천구","d":"M283,598L286,601L304,597L303,604L308,607L306,615L301,618L307,633L312,636L310,640L313,646L314,655L318,655L329,658L331,664L342,674L331,683L326,690L324,697L320,700L313,700L307,706L302,716L290,715L290,710L283,705L282,702L282,692L281,688L275,686L276,679L272,668L269,670L263,668L262,662L257,659L257,651L261,643L244,617L237,605L231,588L234,586L242,583L245,584L256,593L262,600L274,603L282,602L283,598Z","c":[287,648]},{"n":"구로구","d":"M134,528L142,528L148,536L157,543L165,539L164,535L174,535L175,529L182,527L184,523L190,522L195,526L200,524L204,532L209,532L211,536L216,535L222,537L229,535L231,527L241,513L243,507L265,520L272,530L271,541L272,557L277,576L285,585L291,587L283,598L282,602L274,603L262,600L256,593L245,584L242,583L234,586L239,579L236,576L230,578L230,574L220,565L214,571L207,575L200,584L194,586L192,592L188,595L178,594L176,597L175,614L163,610L155,611L148,605L143,609L133,608L128,610L124,604L124,595L123,589L124,585L131,580L130,574L120,570L113,566L110,559L110,554L115,555L122,552L124,546L127,544L130,534L129,529L134,528Z","c":[198,563]},{"n":"강서구","d":"M200,361L199,370L201,373L217,383L240,403L264,422L255,432L257,439L254,439L246,428L232,431L226,429L213,419L209,437L212,446L211,457L212,474L182,479L165,482L153,457L154,454L150,443L145,444L144,437L140,434L138,443L128,446L113,446L105,444L103,440L91,441L84,447L82,454L74,459L72,449L74,444L68,443L68,438L62,437L58,432L44,432L35,426L26,426L20,414L14,409L21,408L23,405L38,393L38,387L33,379L40,380L45,377L49,372L48,368L50,363L63,353L71,354L70,346L72,340L76,339L82,327L86,325L83,319L83,315L79,308L78,301L81,294L84,293L85,286L88,285L95,288L116,311L125,320L138,326L186,358L200,361Z","c":[133,395]},{"n":"양천구","d":"M128,446L138,443L140,434L144,437L145,444L150,443L154,454L153,457L165,482L182,479L212,474L211,457L212,446L209,437L213,419L226,429L232,431L246,428L254,439L257,439L259,439L267,459L267,465L264,472L261,471L258,477L248,483L245,485L244,493L243,507L241,513L231,527L229,535L222,537L216,535L211,536L209,532L204,532L200,524L195,526L190,522L184,523L182,527L175,529L174,535L164,535L165,539L157,543L148,536L142,528L134,528L132,522L133,516L131,508L135,499L135,491L141,482L139,474L135,474L128,461L128,446Z","c":[197,486]},{"n":"마포구","d":"M290,355L287,359L294,364L324,381L336,384L341,389L338,395L337,401L358,410L366,407L398,404L402,406L407,401L410,407L408,409L409,419L412,424L408,426L405,432L401,434L399,444L387,457L374,461L371,475L354,458L343,456L297,443L286,438L264,422L240,403L217,383L201,373L199,370L200,361L200,358L208,358L211,356L215,359L220,354L226,353L236,348L238,341L238,337L242,331L245,323L249,320L263,335L271,342L275,344L280,352L287,358L290,355Z","c":[304,402]},{"n":"서대문구","d":"M385,277L390,280L391,285L390,296L392,300L398,301L397,309L401,318L401,322L398,335L404,341L396,345L391,350L417,383L423,393L418,394L411,399L407,401L402,406L398,404L366,407L358,410L337,401L338,395L341,389L336,384L324,381L294,364L287,359L290,355L309,332L317,333L316,339L329,337L332,329L336,329L340,326L340,321L342,315L352,306L366,300L367,289L369,285L374,285L378,277L385,277Z","c":[362,354]},{"n":"은평구","d":"M428,215L423,221L403,225L398,233L389,234L388,242L386,249L383,252L385,256L386,266L384,275L385,277L378,277L374,285L369,285L367,289L366,300L352,306L342,315L340,321L340,326L336,329L332,329L329,337L316,339L317,333L309,332L290,355L287,358L280,352L275,344L271,342L263,335L249,320L254,312L259,313L255,319L259,326L267,326L271,324L278,326L284,322L282,315L288,309L286,304L287,298L285,289L288,287L288,272L286,265L291,249L294,248L299,242L297,236L302,231L302,225L297,215L306,206L305,199L308,193L309,185L299,180L301,177L312,184L327,182L335,177L342,171L353,169L358,166L365,154L371,150L379,148L380,152L387,158L393,158L398,164L399,173L404,175L408,187L413,188L422,199L422,205L428,215Z","c":[342,247]},{"n":"노원구","d":"M696,244L687,247L684,251L677,254L663,247L656,246L647,249L627,257L620,258L615,261L608,261L593,246L584,235L580,229L567,218L572,213L574,204L585,184L594,194L596,181L593,168L592,156L587,144L587,136L582,123L582,113L585,102L588,83L586,78L593,72L598,71L607,73L614,70L623,59L630,59L639,54L648,54L653,60L657,69L674,72L677,81L670,91L668,97L671,104L673,112L675,113L676,120L672,130L677,141L676,147L657,157L670,159L672,164L669,171L674,182L680,183L685,182L700,184L708,195L709,208L706,220L695,229L695,233L691,239L696,244Z","c":[635,165]},{"n":"도봉구","d":"M586,78L588,83L585,102L582,113L582,123L587,136L587,144L592,156L593,168L596,181L594,194L585,184L574,204L572,213L567,218L561,211L558,204L553,201L550,192L539,183L533,177L525,173L515,173L511,170L509,165L512,148L515,142L516,129L521,121L517,114L512,107L508,97L501,96L501,83L502,77L500,72L502,58L508,49L513,49L516,42L523,41L528,46L534,46L540,43L543,47L544,54L547,63L549,66L556,64L568,57L570,61L575,64L582,60L586,78Z","c":[549,123]},{"n":"강북구","d":"M501,83L501,96L508,97L512,107L517,114L521,121L516,129L515,142L512,148L509,165L511,170L515,173L525,173L533,177L539,183L550,192L553,201L558,204L561,211L567,218L580,229L584,235L578,240L572,250L564,257L558,265L545,274L545,266L537,265L529,268L523,262L514,258L506,255L501,250L499,244L500,237L484,232L477,224L472,221L471,216L467,216L455,208L453,205L457,196L451,187L454,181L452,171L447,165L443,159L444,154L454,147L461,136L470,133L472,126L472,115L470,101L468,97L472,94L480,86L491,82L501,83Z","c":[506,187]},{"n":"성북구","d":"M434,218L439,212L447,209L453,205L455,208L467,216L471,216L472,221L477,224L484,232L500,237L499,244L501,250L506,255L514,258L523,262L529,268L537,265L545,266L545,274L558,265L564,257L572,250L578,240L584,235L593,246L608,261L615,261L620,258L627,257L628,280L625,273L621,273L622,280L615,283L608,284L603,294L599,293L588,297L585,294L580,306L572,306L565,309L562,319L557,322L542,341L531,352L528,350L521,351L517,343L514,342L502,346L498,342L498,334L496,330L489,324L486,316L475,316L473,319L467,319L457,316L452,312L448,307L447,299L454,298L460,294L456,279L458,270L458,260L450,255L446,239L443,235L443,223L438,224L434,218Z","c":[520,282]},{"n":"중랑구","d":"M627,257L647,249L656,246L663,247L677,254L684,251L687,247L696,244L707,245L718,252L718,256L719,267L718,274L721,278L720,285L712,297L712,299L721,309L720,312L711,314L705,324L703,335L687,338L690,343L690,352L686,358L686,363L683,366L667,374L651,369L641,368L641,352L638,344L627,325L623,306L624,301L629,294L630,290L628,280L627,257Z","c":[670,302]},{"n":"동대문구","d":"M531,352L542,341L557,322L562,319L565,309L572,306L580,306L585,294L588,297L599,293L603,294L608,284L615,283L622,280L621,273L625,273L628,280L630,290L629,294L624,301L623,306L627,325L638,344L641,352L641,368L628,398L626,396L603,392L601,391L580,372L569,365L560,365L550,372L544,373L531,368L531,352Z","c":[595,342]},{"n":"광진구","d":"M641,368L651,369L667,374L683,366L686,363L693,370L691,373L688,392L687,398L705,398L710,397L712,401L712,414L708,429L703,439L690,463L682,479L669,481L653,487L639,489L630,489L618,486L597,476L618,430L632,399L628,398L641,368Z","c":[658,431]},{"n":"성동구","d":"M531,368L544,373L550,372L560,365L569,365L580,372L601,391L603,392L626,396L628,398L632,399L618,430L597,476L582,467L578,463L576,467L544,451L534,454L526,460L514,451L503,449L501,443L501,438L503,428L508,427L518,414L519,408L523,404L530,403L532,395L537,390L538,385L531,385L531,368Z","c":[567,420]},{"n":"용산구","d":"M501,438L501,443L503,449L514,451L526,460L508,479L500,486L496,494L492,499L480,507L463,517L459,514L449,515L444,518L413,517L399,510L391,505L385,498L380,489L378,481L371,475L374,461L387,457L399,444L401,434L405,432L408,426L412,424L409,419L416,412L429,413L437,415L439,410L445,414L452,415L455,413L460,419L465,419L475,430L481,423L490,424L493,422L494,432L499,438L501,438Z","c":[445,467]},{"n":"중구","d":"M531,368L531,385L538,385L537,390L532,395L530,403L523,404L519,408L518,414L508,427L503,428L501,438L499,438L494,432L493,422L490,424L481,423L475,430L465,419L460,419L455,413L452,415L445,414L439,410L437,415L429,413L416,412L409,419L408,409L410,407L407,401L411,399L418,394L423,393L417,383L422,377L430,374L440,374L462,377L478,376L487,373L516,373L525,368L531,368Z","c":[476,397]},{"n":"종로구","d":"M428,215L434,218L438,224L443,223L443,235L446,239L450,255L458,260L458,270L456,279L460,294L454,298L447,299L448,307L452,312L457,316L467,319L473,319L475,316L486,316L489,324L496,330L498,334L498,342L502,346L514,342L517,343L521,351L528,350L531,352L531,368L525,368L516,373L487,373L478,376L462,377L440,374L430,374L422,377L417,383L391,350L396,345L404,341L398,335L401,322L401,318L397,309L398,301L392,300L390,296L391,285L390,280L385,277L384,275L386,266L385,256L383,252L386,249L388,242L389,234L398,233L403,225L423,221L428,215Z","c":[440,311]}];
function bondSold(gu) { let n = 0; for (const p of Object.values(S.players)) if (p && p.name) n += (p.bonds || {})[gu] || 0; return n; }
const bondDrift = (gu, t) => { const k = 'bond1:' + gu + ':'; return 0.09 * vnoise(k + 'a', t / (6 * H)) + 0.035 * vnoise(k + 'b', t / 18e5) + 0.012 * vnoise(k + 'c', t / 12e4); };
// i번째 1%(0부터)의 가격. 다음에 살 1% = bondUnit(gu, 팔린 수)
const bondUnit = (gu, i, t = now()) => Math.round(BOND[gu].base * (1 + BOND_CURVE * Math.pow(Math.max(0, i) / BOND_N, 1.3)) * Math.exp(bondDrift(gu, t)) / 1000) * 1000;
function bondBuyCost(gu, n, sold = bondSold(gu)) { let s = 0; for (let j = 0; j < n; j++) s += bondUnit(gu, sold + j); return s; }
function bondSellGet(gu, n, sold = bondSold(gu)) { let s = 0; for (let j = 1; j <= n; j++) s += bondUnit(gu, sold - j); return Math.floor(s * (1 - BOND_SELL)); }
function bondWorth(p) { let v = 0; for (const [g, n] of Object.entries((p && p.bonds) || {})) if (BOND[g] && n > 0) v += bondSellGet(g, n); return v; }
const bondChg = gu => Math.exp(bondDrift(gu, now()) - bondDrift(gu, now() - D)) - 1;
// 구청장: 그 구 지분을 가장 많이 가진 사람. 같으면 먼저 산 사람
function guChief() {
  const top = {};
  for (const g of GU_RANK) { let best = null;
    for (const [id, p] of Object.entries(S.players)) { if (!p || !p.name) continue; const n = (p.bonds || {})[g] || 0; if (!n) continue;
      const at = (p.bAt || {})[g] || 0; if (!best || n > best.n || (n === best.n && at < best.at)) best = { id, n, at }; }
    if (best) top[g] = best; }
  return top;
}
function bondHourly(p) { let v = 0; for (const [g, n] of Object.entries((p || {}).bonds || {})) if (BOND[g] && n > 0) v += n * bondUnit(g, bondSold(g) - 1) * BOND[g].cp; return v; }
// 💰 배당: 매시간 정각 (앱을 꺼 둬도 최대 7일치)
async function kCoupon() {
  const m0 = S.me; if (!m0 || S.saving || S.readOnly) return;
  const h = Math.floor(now() / H);
  if (m0.cpH == null) { const me = clone(m0); me.cpH = h; await kSave(me, m0); return; }
  if (h <= m0.cpH) return;
  const hrs = Math.min(168, h - m0.cpH), amt = Math.round(bondHourly(m0) * hrs);
  const me = clone(m0); me.cpH = h; me.cash += amt; me.cpTotal = (me.cpTotal || 0) + amt;
  if (await kSave(me, m0) && amt > 0) { toast(`🏛️ 지분 배당 ${hrs > 1 ? `${hrs}시간치 ` : ''}+${krw(amt)}`); renderAll(); }
}
async function bondTrade(gu, side, n) {
  if (!S.me || S.saving || S.readOnly || !BOND[gu] || !(n > 0)) return;
  const sold = bondSold(gu), held = (S.me.bonds || {})[gu] || 0;
  const before = S.me, me = kInit(clone(before));
  if (side === 'buy') {
    if (sold + n > BOND_N) { toast(`남은 지분이 ${BOND_N - sold}%뿐이에요`); return; }
    const cost = bondBuyCost(gu, n, sold); if (cost > me.cash) { toast(`원화가 ${krw(cost - me.cash)} 부족해요`); return; }
    me.bCost[gu] = ((me.bCost[gu] || 0) * held + cost) / (held + n); me.bonds[gu] = held + n; if (!held) me.bAt[gu] = now(); me.cash -= cost;
    if (me.cpH == null) me.cpH = Math.floor(now() / H);
    if (await kSave(me, before)) { addFeed({ kind: 'k_bond', gu, n, amt: cost }); const ch = guChief()[gu]; toast(ch && ch.id === S.uid ? `👑 ${gu}청장이 됐어요!` : `🏛️ ${gu} 지분 ${n}% 매수`); if (ch && ch.id === S.uid) confetti(); showMine('bond'); }
  } else {
    if (n > held) return; const get = bondSellGet(gu, n, sold);
    me.bonds[gu] = held - n; me.cash += get; if (!me.bonds[gu]) { delete me.bonds[gu]; delete me.bCost[gu]; delete me.bAt[gu]; }
    if (await kSave(me, before)) { addFeed({ kind: 'k_bsell', gu, n, amt: get }); toast(`🏛️ ${gu} 지분 ${n}% 매도 · ${krw(get)}`); renderAll(); renderSheet(); }
  }
}
/* ───────── 화면: 거래소 '지분' 탭 ───────── */
function bondMapSVG() {
  const top = guChief(), mine = new Set(Object.keys((S.me || {}).bonds || {}));
  const fills = DISTRICTS.map(d => { const ch = top[d.n], u = ch && ch.id;
    return `<path d="${d.d}" data-bgu="${d.n}" class="bgu${mine.has(d.n) ? ' mine' : ''}" fill="${!u ? '#ebeef4' : chiefColor(u)}" fill-opacity="${u ? (u === S.uid ? .55 : .38) : 1}" stroke="#fff" stroke-width="2.5"/>`; }).join('');
  const labels = DISTRICTS.map((d, i) => { const ch = top[d.n];
    return ch ? `<g transform="translate(${d.c[0]},${d.c[1]}) scale(1.6)" pointer-events="none">${stampInner(ch.id, 'bst' + i)}</g>` : `<text x="${d.c[0]}" y="${d.c[1] + 5}" class="bgn" pointer-events="none">${d.n.replace(/구$/, '')}</text>`; }).join('');
  return `<svg viewBox="0 30 866 715" class="bmap" role="img" aria-label="구청장 지도">${fills}${labels}</svg>`;
}
function stakesHTML() {
  const me = S.me, top = guChief();
  const myN = Object.values((me || {}).bonds || {}).reduce((a, n) => a + n, 0), myV = me ? bondWorth(me) : 0;
  const myCost = me ? Object.entries(me.bonds || {}).reduce((a, [g, n]) => a + n * ((me.bCost || {})[g] || 0), 0) : 0;
  const chiefOf = me ? GU_RANK.filter(g => top[g] && top[g].id === S.uid) : [];
  const nextH = (Math.floor(now() / H) + 1) * H;
  let h = `<div class="card bhero"><div class="bh-t"><span class="k">서울 지분 · 원화로 사요</span><h2>구청장 자리를 차지하세요</h2><small>구마다 지분이 100%뿐이에요. 가장 많이 가진 사람이 구청장이 되고, 팔릴수록 값이 올라요. 매시간 배당이 나와요.</small></div>
    ${me ? `<div class="bh-row"><div><small>내 지분</small><b class="num">${myN}%</b></div><div><small>평가액</small><b class="num">${krw(myV)}</b>${myCost ? `<span class="num ${cls(myV - myCost)}">${signKrw(myV - myCost)}</span>` : ''}</div><div><small>시간당 배당 <span class="num" id="cpCd">${mmss(nextH - now())}</span></small><b class="num up">+${krw(bondHourly(me))}</b></div></div>
    ${chiefOf.length ? `<div class="bh-chief">👑 ${chiefOf.join(' · ')}청장</div>` : ''}` : ''}</div>
    <div class="card bmapbox">${bondMapSVG()}</div>
    <div class="sec"><div class="sec-h"><h2>25개 구</h2><small>다음 1% 가격</small></div><div class="slist">`;
  GU_RANK.forEach((g, i) => {
    const sold = bondSold(g), p = bondUnit(g, sold), ch = top[g], mineN = ((me || {}).bonds || {})[g] || 0, chg = bondChg(g);
    const need = ch && ch.id !== S.uid ? ch.n - mineN + 1 : 0;
    h += `<button class="srow-main brow" type="button" data-bond="${g}"><span class="logo-b bb" style="background:${ch ? chiefColor(ch.id) : '#c9cfdb'}">${i + 1}</span>
      <span class="sname"><b>${g}${mineN ? ` <span class="mine">${mineN}%</span>` : ''}</b><small>${ch ? `👑 ${esc(ch.id === S.uid ? '나' : nameOf(ch.id))} ${ch.n}%${need > 0 && need <= BOND_N - sold ? ` · ${need}%면 역전` : ''}` : '구청장 없음 · 1%면 구청장'}</small>
      <span class="bbar"><i style="width:${sold}%"></i></span></span>
      <span class="sprice"><div class="p num">${krw(p)}</div><div class="c num ${cls(chg)}">${pctTxt(chg)} · ${sold}% 팔림</div></span></button>`;
  });
  h += `</div><p class="hint">1% 값 = 기본값 × 팔린 비율만큼 최대 2.5배 × 시세 출렁임. 매시간 정각에 배당이 원화로 들어와요(강남 0.03% ~ 도봉 0.08%). 팔 때 1% 수수료.</p></div>`;
  return h;
}
function renderBondSheet(b, sh) {
  const g = sh.gu, bd = BOND[g], sold = bondSold(g), me = S.me, held = ((me || {}).bonds || {})[g] || 0, ch = guChief()[g];
  if (!sh.n) sh.n = 1; sh.side ||= 'buy';
  const maxBuy = BOND_N - sold, n = Math.max(1, Math.min(sh.n, sh.side === 'buy' ? Math.max(1, maxBuy) : Math.max(1, held)));
  sh.n = n;
  const cost = sh.side === 'buy' ? bondBuyCost(g, n, sold) : bondSellGet(g, n, sold);
  const avg = held ? me.bCost[g] : 0, val = held ? bondSellGet(g, held, sold) : 0;
  const holders = activePlayers().filter(p => ((p.bonds || {})[g] || 0) > 0).sort((a, c) => c.bonds[g] - a.bonds[g]);
  const ok = me && !S.readOnly && !S.saving && (sh.side === 'buy' ? n <= maxBuy && cost <= me.cash : n <= held);
  b.innerHTML = `<div class="shead"><span class="logo-b bb" style="background:${ch ? chiefColor(ch.id) : '#c9cfdb'}">${bd.i + 1}</span><div><h3>${g} 지분</h3><small>땅값 ${bd.i + 1}위 · 시간당 배당 ${(bd.cp * 100).toFixed(3)}%</small></div></div>
    <div class="bigp"><div class="p num" id="bLivePrice">${krw(bondUnit(g, sold))}</div><div class="c num"><span class="${cls(bondChg(g))}">24시간 ${pctTxt(bondChg(g))}</span> <span class="dim">· ${sold}% 팔림 · 1%당 가격</span></div></div>
    <div class="chartbox"><canvas class="chart" id="bChart" aria-label="24시간 지분 시세"></canvas><i class="cpulse"></i></div>
    <div class="info"><div>👑 구청장<b>${ch ? esc(ch.id === S.uid ? '나' : nameOf(ch.id)) + ` · ${ch.n}%` : '없음'}</b></div><div>내 지분<b class="num">${held ? held + '%' : '-'}</b></div>
      <div>평단(1%)<b class="num">${avg ? krw(avg) : '-'}</b></div><div>지금 팔면<b class="num ${held ? cls(val - avg * held) : ''}">${held ? krw(val) : '-'}</b></div></div>
    ${holders.length ? `<div class="bholders">${holders.slice(0, 5).map((p, i) => `<span>${i ? '' : '👑 '}${esc(p.id === S.uid ? '나' : p.name)} <b class="num">${p.bonds[g]}%</b></span>`).join('')}</div>` : ''}
    ${me && !S.readOnly ? `<div class="seg"><button type="button" data-bside="buy" aria-pressed="${sh.side === 'buy'}">매수</button><button type="button" data-bside="sell" aria-pressed="${sh.side === 'sell'}" ${held ? '' : 'disabled'}>매도</button></div>
    <div class="qtyrow"><button type="button" data-bstep="-1" aria-label="줄이기">−</button><input id="bQty" type="number" inputmode="numeric" min="1" value="${n}" aria-label="지분 %"><button type="button" data-bstep="1" aria-label="늘리기">+</button></div>
    <div class="quick">${(sh.side === 'buy' ? [1, 5, 10, 'max'] : [1, 5, 10, 'all']).map(v => `<button type="button" data-bset="${v}">${v === 'max' ? '최대' : v === 'all' ? '전부' : v + '%'}</button>`).join('')}</div>
    <div class="est"><span>${sh.side === 'buy' ? '필요 금액' : '받을 금액'} <b class="num">${krw(cost)}</b></span><span class="num">${sh.side === 'buy' ? `내 원화 ${krw(me.cash)}` : `보유 ${held}%`}</span></div>
    <button class="cta ${sh.side === 'buy' ? 'buy' : 'sell'}" id="bDo" type="button" ${ok ? '' : 'disabled'}>${sh.side === 'buy' ? `지분 ${n}% 매수하기` : `지분 ${n}% 매도하기`}</button>
    <p class="hint">${sh.side === 'buy' ? '1% 살 때마다 다음 1%가 조금씩 비싸져요. 먼저 산 사람이 유리해요.' : '팔면 다음 1% 값이 내려가요. 수수료 1%.'}</p>` : ''}`;
  requestAnimationFrame(() => { const cv = $('#bChart'); if (cv) drawTChart(cv, Array.from({ length: 97 }, (_, i) => { const t = now() - (96 - i) * 9e5; return [t, bondUnit(g, sold, t)]; }), { t0: now() - D, t1: now(), fmt: v => krwUnits(v), stepH: 6 }); });
}
function bondMaxBuy(g) { const sold = bondSold(g), me = S.me; let n = 0, s = 0; while (sold + n < BOND_N) { const u = bondUnit(g, sold + n); if (s + u > me.cash) break; s += u; n++; } return n; }
// 내 보유·프로필에 들어가는 지분 줄
function stakePositions(p) {
  return Object.entries((p && p.bonds) || {}).filter(([g, n]) => BOND[g] && n > 0).map(([g, n]) => { const value = bondSellGet(g, n), principal = n * ((p.bCost || {})[g] || 0);
    return { sym: g, kind: 'stake', q: n, value, principal, pnl: value - principal, pct: principal ? value / principal - 1 : 0 }; });
}
document.addEventListener('click', e => {
  const g = e.target.closest && e.target.closest('[data-bgu]'); if (g) { if (!S.me && !S.readOnly) { openSheet('join'); return; } openSheet('bond', { gu: g.dataset.bgu, side: 'buy', n: 1 }); return; }
  const t = e.target.closest && e.target.closest('button'); if (!t) return; const d = t.dataset;
  if (d.bond) { if (!S.me && !S.readOnly) { openSheet('join'); return; } if (S.sheet) closeSheetRaw(); openSheet('bond', { gu: d.bond, side: 'buy', n: 1 }); return; }
  if (d.bside) { S.sheet.side = d.bside; S.sheet.n = 1; renderSheet(); return; }
  if (d.bstep) { S.sheet.n = Math.max(1, (S.sheet.n || 1) + +d.bstep); renderSheet(); return; }
  if (d.bset) { const sh = S.sheet, gg = sh.gu; sh.n = d.bset === 'max' ? Math.max(1, bondMaxBuy(gg)) : d.bset === 'all' ? ((S.me.bonds || {})[gg] || 1) : +d.bset; renderSheet(); return; }
  if (t.id === 'bDo') bondTrade(S.sheet.gu, S.sheet.side, S.sheet.n);
});
document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-gbsub]'); if (t) { S.bondSub = t.dataset.gbsub; renderExchange(); } });
document.addEventListener('input', e => { if (e.target.id === 'bQty' && S.sheet) { S.sheet.n = Math.max(1, Math.floor(+e.target.value || 1)); clearTimeout(S.bqT); S.bqT = setTimeout(renderSheet, 500); } });
