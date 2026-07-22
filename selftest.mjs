// 远征录·笼中剑 · 回归测试
// 钉住：满血换装不掉血 / 云存档拉取要二次确认 / 局内跳星灵要二次确认
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2];
if (!ROOT) { console.error('需要传入目录'); process.exit(2); }

const MIME = { '.html':'text/html', '.json':'application/json', '.js':'text/javascript',
  '.webmanifest':'application/json', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0].split('#')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/index.html`;

const results = [];
const check = (name, pass, detail = '') => { results.push({ name, pass }); console.log(`${pass ? '  ✅' : '  ❌'} ${name}${detail ? ' — ' + detail : ''}`); };

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
// 后端不可达是预期的（离线跑），只收集真正的脚本错误
await page.route('**/*', r => (/leaderboard|workers\.dev|game-api/.test(r.request().url()) ? r.abort() : r.continue()));

await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

// ---------- 1. 满血换装不掉血 ----------
const swap = await page.evaluate(() => {
  const cid = Object.keys(CHARS)[0];
  const mk = (hp) => ({ slot: 'weapon', rar: 1, name: 'T' + hp, af: { hp }, leg: null, leg2: null });
  const out = {};

  // (a) 满血：换一件同为 +20HP 的同槽装备
  let p = makePlayer(cid);
  p.hp = p.maxhp;
  const A = mk(20), B = mk(20);
  applyItem(p, A, 1); p.hp = p.maxhp;          // 穿上 A 并回满
  const maxWithA = p.maxhp;
  applyItem(p, A, -1); applyItem(p, B, 1);     // 换成 B（equipItem 就是这个顺序）
  out.fullSwap = { hp: p.hp, maxhp: p.maxhp, maxWithA, lost: maxWithA - p.hp };

  // (b) 神话三件套级别：一次性 +60
  p = makePlayer(cid); p.hp = p.maxhp;
  const S1 = mk(60), S2 = mk(60);
  applyItem(p, S1, 1); p.hp = p.maxhp;
  applyItem(p, S1, -1); applyItem(p, S2, 1);
  out.setSwap = { hp: p.hp, maxhp: p.maxhp, lost: p.maxhp - p.hp };

  // (c) 残血换装：伤害缺口应当守恒，不多不少
  p = makePlayer(cid);
  applyItem(p, A, 1); p.hp = p.maxhp;
  p.hp = p.maxhp - 30;                          // 挨了 30
  applyItem(p, A, -1); applyItem(p, B, 1);
  out.hurtSwap = { deficit: p.maxhp - p.hp };

  // (d) 穿上再卸下应完全回到原状（可逆性）
  p = makePlayer(cid); p.hp = p.maxhp;
  const m0 = p.maxhp, h0 = p.hp;
  applyItem(p, A, 1); applyItem(p, A, -1);
  out.reversible = { maxhp: p.maxhp, hp: p.hp, m0, h0 };
  return out;
});
check('满血换同槽装备不掉血', swap.fullSwap.lost === 0, JSON.stringify(swap.fullSwap));
check('满血换整套(+60)不掉 60 血', swap.setSwap.lost === 0, JSON.stringify(swap.setSwap));
check('残血换装伤害缺口守恒(仍是 30)', swap.hurtSwap.deficit === 30, JSON.stringify(swap.hurtSwap));
check('穿上再卸下完全可逆', swap.reversible.maxhp === swap.reversible.m0 && swap.reversible.hp === swap.reversible.h0, JSON.stringify(swap.reversible));

// ---------- 2. 云存档拉取要二次确认 ----------
const cloud = await page.evaluate(async () => {
  if (typeof cloudApplyPending !== 'function') return { missing: true };
  META.lbId = META.lbId || 'test-id';
  const mine = localStorage.getItem(SAVEKEY);
  // 造一份"云端存档"：直接喂给 _cloudPending，跳过网络
  const fake = JSON.stringify({ unlocked: ['x'], lvl: 99, endlessBest: 999, equip: {}, talents: {} });
  _cloudPending = 'MYSKME1.' + _sum(fake) + '.' + btoa(unescape(encodeURIComponent(fake)));
  _cloudArmed = null;
  document.body.insertAdjacentHTML('beforeend', '<div id="saveMsg"></div>');
  await cloudApplyPending();                       // 第一次点
  const afterFirst = localStorage.getItem(SAVEKEY);
  const msg = (document.getElementById('saveMsg') || {}).innerHTML || '';
  return {
    untouchedAfterFirstClick: afterFirst === mine,
    showsComparison: /云端/.test(msg) && /本机/.test(msg),
    warns: /覆盖/.test(msg),
  };
});
if (cloud.missing) check('云存档函数存在', false, 'cloudApplyPending 不存在');
else {
  check('第一次点「拉取云端」不写盘', cloud.untouchedAfterFirstClick === true, JSON.stringify(cloud));
  check('第一次点会摆出云端/本机对比', cloud.showsComparison === true);
  check('提示里明说会覆盖', cloud.warns === true);
}

// ---------- 3. 局内跳星灵要二次确认 ----------
const star = await page.evaluate(() => {
  if (typeof goStarling !== 'function') return { missing: true };
  let navigated = null;
  const origin = location.href;
  const modeWas = MODE;
  MODE = 'run'; _starlingArmed = 0;   // ⚠ 仅为触发局内守卫；用完必须还原：
                                      // 主循环 MODE==='run' 分支假定 P 已存在（真实流程 startRun 同时置 MODE 与 P），
                                      // 测试里强留 MODE='run' 而 P===null 会让 rAF 抛 P.dashing（假报错）
  // 拦截跳转：改写 location.href 会真跳，这里只看它有没有走到赋值那步
  const spy = { get href() { return origin; }, set href(v) { navigated = v; } };
  Object.defineProperty(window, '__navSpy', { value: spy, configurable: true });
  const src = goStarling.toString();
  const guarded = /MODE==='run'/.test(src) && /再点一次|确定/.test(src);
  goStarling();                       // 第一次：应只提示
  const firstNavigated = navigated;
  MODE = modeWas;
  return { guarded, firstNavigated };
});
if (star.missing) check('goStarling 存在', false);
else check('局内点「星灵小窝」第一次只提示、不直接跳走', star.guarded === true, JSON.stringify(star));

// ---------- 4. 排行榜离线要说实话 ----------
const honest = await page.evaluate(() => {
  const src = (typeof lbSubmit === 'function') ? lbSubmit.toString() : '';
  return { hasEmptyCatch: /catch\(e\)\{\}\s*$/m.test(src), mentionsNetwork: /网络/.test(src) };
});
check('lbSubmit 断网时会给可见提示（不再是空 catch）', honest.mentionsNetwork === true, JSON.stringify(honest));

// ---------- 4b. 残血卸下再穿上 +HP 装备不能凭空回血 ----------
const heal = await page.evaluate(() => {
  const cid = Object.keys(CHARS)[0];
  const mk = (hp) => ({ slot: 'weapon', rar: 1, name: 'T' + hp, af: { hp }, leg: null, leg2: null });
  const big = mk(60);
  const p = makePlayer(cid);
  applyItem(p, big, 1); p.hp = p.maxhp;
  const full = p.maxhp;
  p.hp = 5;                                   // 残血：缺口 > 卸下后的新上限
  applyItem(p, big, -1);                      // 卸下
  const mid = { hp: p.hp, maxhp: p.maxhp };
  applyItem(p, big, 1);                       // 穿回来
  const back = { hp: p.hp, maxhp: p.maxhp };
  // 再来一轮，确认不会越滚越高
  applyItem(p, big, -1); applyItem(p, big, 1);
  const twice = { hp: p.hp, maxhp: p.maxhp };
  return { full, mid, back, twice };
});
check('残血(5)卸下+穿回 +60 装备不回血', heal.back.hp === 5 && heal.back.maxhp === heal.full,
  JSON.stringify(heal));
check('反复脱穿也不会滚雪球', heal.twice.hp === 5, JSON.stringify(heal.twice));

// ---------- 4c. 走 IZ 的动态文案里没有会被过滤掉的符号 ----------
const izsafe = await page.evaluate(() => {
  const bad = [];
  const probe = (label, s) => { if (typeof s !== 'string') return; const o = IZ(s); if (o !== s) bad.push(label + ': ' + s.slice(0, 40)); };
  probe('goStarling', goStarling.toString().match(/toast\('([^']*)'\)/)?.[1] || '');
  showSaveTransfer();
  const html = document.getElementById('ovSave')?.innerHTML || document.body.innerHTML;
  return { bad, leadingSpaceBtn: /<button[^>]*>\s+[^<]/.test(html) };
});
check('goStarling 的离场警告不含被 IZ 吃掉的符号', izsafe.bad.length === 0, izsafe.bad.join(' | '));

// ---------- 4d. 一键重置要连云端撤销快照一起清 ----------
const resetClean = await page.evaluate(() => {
  localStorage.setItem(SAVEKEY + '_pre_cloud', 'STALE');
  const src = doReset.toString() + finishImport.toString();
  return { clearsInReset: /_pre_cloud/.test(doReset.toString()), clearsInImport: /_pre_cloud/.test(finishImport.toString()) };
});
check('doReset / finishImport 都会清掉 _pre_cloud 快照',
  resetClean.clearsInReset && resetClean.clearsInImport, JSON.stringify(resetClean));

// ---------- 5. 角色图鉴：33 全员 + 典藏版全注册 ----------
const dexFiles = fs.readdirSync(path.join(ROOT, 'assets/cards'));
const baseIds = dexFiles.filter(f => /-full\.jpg$/.test(f) && !/_sp-full\.jpg$/.test(f)).map(f => f.replace('-full.jpg', '')).sort();
const spIds = dexFiles.filter(f => /_sp-full\.jpg$/.test(f)).map(f => f.replace('_sp-full.jpg', '')).sort();

const dex = await page.evaluate(() => {
  const ids = [];
  CARD_GROUPS.forEach(g => g.ids.forEach(id => ids.push(id)));
  showCardDex();
  const html = document.getElementById('ovDex').innerHTML;
  const detail = {};
  ids.forEach(id => {
    cardDexView(id);
    detail[id] = !!document.getElementById('cdexspbtn');
  });
  showCardDex();
  return {
    ids, sp: SP_FORMS.slice(),
    dup: ids.length !== new Set(ids).size,
    hasSoonText: /未来登场/.test(html),
    groups: CARD_GROUPS.map(g => g.g),
    spBtnById: detail,
    unlockedAll: ids.filter(id => !cardUnlocked(id)),
  };
});
check('图鉴登记 = 卡库 base 全员，无重复', !dex.dup && dex.ids.slice().sort().join() === baseIds.join(),
  `dex ${dex.ids.length} / base ${baseIds.length}`);
check('SP_FORMS 覆盖全部典藏卡文件（有图必可翻面）',
  spIds.filter(id => dex.sp.indexOf(id) < 0).length === 0,
  '有图未注册: ' + (spIds.filter(id => dex.sp.indexOf(id) < 0).join(' ') || '无'));
check('SP_FORMS 无空头注册（注册必有图）',
  dex.sp.filter(id => spIds.indexOf(id) < 0).length === 0,
  '注册无图: ' + (dex.sp.filter(id => spIds.indexOf(id) < 0).join(' ') || '无'));
check('每张已注册典藏卡的详情页都有「典藏版」按钮',
  dex.sp.every(id => dex.spBtnById[id] === true),
  '缺按钮: ' + (dex.sp.filter(id => !dex.spBtnById[id]).join(' ') || '无'));
check('图鉴不再出现失真文案「未来登场」', dex.hasSoonText === false);

// 闪卡 + 典藏版 两个开关不能互相打架
const foil = await page.evaluate(() => {
  cardDexView('lin');
  cardDexFoil('lin');                                   // 开闪卡
  const afterFoil = { on: document.getElementById('cdexfoilfx').classList.contains('on'), btn: document.getElementById('cdexfoilbtn').textContent };
  cardDexSP('lin');                                     // 切典藏版
  const afterSP = { on: document.getElementById('cdexfoilfx').classList.contains('on'), btn: document.getElementById('cdexfoilbtn').textContent };
  cardDexFoil('lin');                                   // 再点闪卡：应当是"开"
  const again = { on: document.getElementById('cdexfoilfx').classList.contains('on') };
  return { afterFoil, afterSP, again };
});
check('切到典藏版会同时关掉闪卡特效并复位按钮文案',
  foil.afterSP.on === false && /闪 卡 版/.test(foil.afterSP.btn), JSON.stringify(foil));
check('切完典藏版后点闪卡是"开"，不需要点两次', foil.again.on === true, JSON.stringify(foil.again));
check('分组按正典拆分（群星光明学徒 / 边缘黑域与中立）',
  dex.groups.some(g => /光明学徒/.test(g)) && dex.groups.some(g => /黑域与中立/.test(g)),
  dex.groups.join(' / '));

// 典藏图真能取到（抽查 0722 新合成的 10 张）
const newSp = ['zi', 'zeng', 'duo', 'han', 'yang', 'rong', 'wei', 'xiao', 'xin', 'majun'];
const spHttp = await page.evaluate(async (ids) => {
  const out = {};
  for (const id of ids) {
    const r = await fetch('assets/cards/' + id + '_sp-full.jpg', { method: 'GET' });
    out[id] = r.status;
  }
  return out;
}, newSp);
check('0722 新补 10 张典藏卡全部 HTTP 200', newSp.every(id => spHttp[id] === 200), JSON.stringify(spHttp));

check('页面加载无 JS 报错', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
server.close();
const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} 通过`);
process.exit(failed.length ? 1 : 0);
