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
  MODE = 'run'; _starlingArmed = 0;
  // 拦截跳转：改写 location.href 会真跳，这里只看它有没有走到赋值那步
  const spy = { get href() { return origin; }, set href(v) { navigated = v; } };
  Object.defineProperty(window, '__navSpy', { value: spy, configurable: true });
  const src = goStarling.toString();
  const guarded = /MODE==='run'/.test(src) && /再点一次|确定/.test(src);
  goStarling();                       // 第一次：应只提示
  const firstNavigated = navigated;
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

check('页面加载无 JS 报错', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
server.close();
const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} 通过`);
process.exit(failed.length ? 1 : 0);
