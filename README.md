# MYSKME 远征录 · 笼中剑（Web 前端 · GitHub Pages）

线上：**https://myskme.github.io/myskme-expedition-web/**

学院动作肉鸽 × 经营。2026-07-12 从 Netlify 搬来 GitHub Pages（git push 即上线，免额度）。
后端（排行榜/云存档/名片）走 Cloudflare Worker（`myskme-game-api`），前端只是静态 PWA。

- 这是**公开的前端仓库**（纯静态，无任何密钥；HMAC 混淆值本就在客户端可见、非真鉴权）。
- 正典源码 + 历史在私库 `myskme/myskme-expedition`；本仓库是发布出的前端快照。
- 发布：改私库的 `MYSKME-热血远征.html` 等 → 拼装 → push 本仓库。

## Claude / Codex 协作

两台电脑或两个 AI 工具开始工作前都先读 [`AI-COLLABORATION.md`](AI-COLLABORATION.md)，从 GitHub 最新 `main` 开始；结束时记录基线 SHA、修改文件、资产目录和自测结果。禁止强推、删除旧资产或用旧版页面整体覆盖另一方的新提交。
