# MYSKME 星灵远征 · 美术图标增强包 20260711

本包用于 `myskme-starling` 电子宠物项目的美术/UI 增强同步。

## 本次优化内容

- 新增分享预览封面 `og-cover.png`，使用现有星灵立绘合成，保持黑金星盘风格。
- 补充页面 Open Graph / Twitter Card 元信息，分享时显示正式作品封面。
- 主屏新增星盘底座、宠物窝光晕与更细致的轻量视觉层次。
- 签到、星尘餐、结晶餐、底部导航、关闭按钮补全统一线性图标。
- 远征地点卡升级为 5 张增强剪影插画：学院谷地、迷雾回廊、紫蛇森林、复读灰塔、断云云阶。
- 信件封印从纯文字升级为按类型区分的图标印章，并保留地点角标。
- 纪念品图标增加统一外环、高光和稀有度标签样式。
- 修正孵化仪式开场文字在小屏上的字距/行宽，避免移动端裁切。

## 文件结构

- `site/index.html`：新版单页站点。
- `site/og-cover.png`：新版分享封面。
- `assets/myskme/`：当前站点使用的角色与星灵美术资源副本。
- `preview/starling-og-cover-20260711.png`：封面预览。
- `patch/0001-feat-enrich-starling-art-and-icon-system.patch`：本次 Git 提交补丁。
- `同步到iCloud并推送.command`：一键同步资源包、合入 iCloud 仓库并尝试推送 GitHub。

## 同步目标

资源包会同步到新的 iCloud 子文件夹，避免和你原来的资料混在一起：

`$HOME/Library/Mobile Documents/com~apple~CloudDocs/new code/assets/starling/starling-expedition-art-ui-20260711`

站点文件会合入你的 iCloud 仓库：

`$HOME/Library/Mobile Documents/com~apple~CloudDocs/Documents/myskme-repos/myskme-starling`

## 提交信息

- 本地提交：`fca81916f67c2a8c0be763fa67cf97e9993eb168`
- 提交标题：`feat: enrich starling art and icon system`
- 注意：当前环境 DNS 暂时无法解析 `github.com`，所以还没有成功推送远端。运行同步脚本时会再次尝试 `git push origin main`。

## 验证记录

- `git diff --check` 通过。
- HTML 内联脚本解析通过。
- 29 个静态/形态资源引用检查通过，无缺失。
- 本地浏览器检查：移动端无破图、无横向溢出；主屏 3 个操作按钮和底部 5 个导航按钮均有图标。
