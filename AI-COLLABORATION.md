# 远征录 · Claude / Codex 协作约定

本文件是《MYSKME 远征录》发布仓库的双方交接入口。开始修改前先读本文件和 GitHub 最新提交；结束时只追加新记录，不删除或改写另一方的历史条目。

## 防冲突规则

1. 每次工作从 GitHub `main` 最新提交开始；提交前再次 `fetch`，远端前进时先 rebase 或人工合并。
2. Claude 优先负责玩法、数值、存档、排行榜和常规接线；Codex 优先负责 Image 2 高阶美术、正典一致性和跨设备视觉验收。
3. 新美术放进独立版本目录；不覆盖旧原图、不删除旧资产。加载失败必须保留旧角色卡或程序化占位回退。
4. 不强推、不重写历史、不整页覆盖 `index.html`。双方改到同一区段时必须人工合并意图。
5. 每条成果记录至少包含：日期、操作者、基线 SHA、改动文件、资产目录、自测结果、交接注意事项。

## 更新记录

### 2026-07-13 · Codex · 慧与音头目正典立绘补全

- 基线：最初从 GitHub `main` SHA `3c249f612ec09dd68497684d51b4d5e933fbb998` 制作；提交阶段两次发现 Claude 继续推进，先人工合并 `1c388577797dadd992f2194b2dabdd6e23a3974d` 的安卓固定步长、`touch-action` 与防地址栏抖动优化，再合并 `5035557b12218f8b7555d6adb67e40317f971f97` 的 DPR 恒满分辨率和省电文案调整，最终以 `5035557` 为发布父节点。
- 承接现状：叶王、璇、鹦鹉教授、航四位透明立绘已上线；慧与音仍回退 `assets/cards/<id>-full.jpg`。
- 新资产目录：`assets/hub/expedition-boss-art-20260713/web/`。
- 新资产：`boss-hui.webp`、`boss-yin.webp`，均为 512×768 透明 WebP。
- 接线：将原四人数组改为六人 `BOSS_ART` 映射；新图失败仍回退原角色卡 JPG。`BUILD` 更新为 `20260713c`，Service Worker 缓存更新为 `myskme-v12`。
- 并发合并：Claude `BUILD=20260713a` 的安卓移动优化和 `BUILD=20260713b` 的清晰度优化完整保留；Codex 只将最终构建号顺延为 `20260713c`。
- 正典：慧保持橙金西伯利亚虎、黑色虎纹、暗红斗篷和冲撞姿态；音保持灰银狼耳、紫瞳、左右深蓝/暗紫双声斗篷与双色声波。
- 自测：`index.html`、`pet.html`、`sw.js` JavaScript 语法通过；慧/音两张 WebP 均为 512×768、带 Alpha，浏览器真实解码成功。768×1024 iPad 与 390×844 手机页面均无横向溢出、控制台零 error/warning；新图在 390px 视口解码显示无溢出。公开发布快照未包含独立 `#selftest`，本轮采用语法、HTTP、图片解码和响应式烟测。
- 交接：请勿把映射退回只含四人的 `BOSS_ART_IDS`，也不要把新图复制进 20260712 旧目录。

### 2026-07-13 · Codex · 瑾正典性别纠错

- 基线：`d91690102e01b99a2314bfa077738aa3d0e7b7eb`。
- 用户明确确认：狐狸瑾为赤狐少女。原编年史资料中的“赤狐少年 / 他自己编的”属于冲突错误文本。
- 改动文件：仅 `index.html` 的 `CHAR_META.jin.lore`、`BUILD=20260713d` 与本协作记录；改为“赤狐少女、橙红长发与白色发梢”及女性代词，玩法、数值、存档、美术路径全部不动。
- 跨项目一致性：自鸣棋本轮新角色立绘同步以赤狐少女为正式版；误生的少年版仅本地归档、从未上线。
- 自测：内联 JavaScript 语法通过；文本检索已无“赤狐少年”。Claude 后续不得用旧编年史片段覆盖本条用户确认的最高正典。

### 2026-07-16 · Claude · 榜单顺畅三件套（玩家反馈"榜没了"根治）

- 基线：`17ba3f0` → 发布 `1aa4056`，`BUILD=20260716a`。改动仅 `index.html` 排行榜客户端区（约 5200-5300 行）与 `endRunCommon`；美术/正典/玩法数值零触碰。
- 背景：玩家报"之前的榜没有了"。排查结论=数据零丢失——①月度赛季 7/4 惰性翻篇，六月榜完整归档在 `?season=2026-06`；②0712 Netlify→GitHub Pages 跨 origin 迁移，老玩家 localStorage（昵称/lbId）搁浅旧域，无昵称则 lbSubmit 永不提交。王老师定调：内测老玩家不救，保证现在和以后顺畅。
- 前端四改：①`lbOpen` 赛季翻篇醒目公告（`META.lbSeasonSeen` 跨赛季检测，META 新增字段、旧档 undefined 安全）；②`lbHistory(sel)` 历史赛季 24 期全可翻（chips 切换，原来只能看最近一季）；③`endRunCommon` 结算顺手 `lbSubmit()`（有昵称才发、9 秒自限频，不再只靠玩家开榜才提交）；④提交返回 `stale`（设备时钟差>90s）时在 `#lbSubMsg` 给可见提示（原空 catch 静默）。
- 后端同日（myskme-game-api `e345f8e`）：赛季翻篇改「归档写成功才清榜」；CORS 未知 origin 回落值换 `myskme.github.io`；kvput 覆写 `leaderboard/boards` 须 `force:true`。run_diff 91/91 + itest 14/14（新增 T12-T15）。
- 自测：单 script 块 node --check 通过；localhost stub 验证公告/chips/stale 提示/榜面渲染 5/5；线上真实域名验证 BUILD/公告/七月榜/六月归档回顾 8/8。
- 交接（给 Codex）：请保留 `META.lbSeasonSeen` 字段、`#lbSubMsg` 容器、`lbHistory(sel)` 参数签名与 `endRunCommon` 里的 `lbSubmit()` 行；排行榜视觉若要美化随意，这四个逻辑挂点别断。源文件 `new code/MYSKME-热血远征.html` 已回灌至 20260716a（源=Pages）。
