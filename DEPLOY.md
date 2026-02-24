# Heki 文档站部署指南

## 概述

- 文档站地址: https://hekicore.github.io/heki-docs/#/
- GitHub 仓库: https://github.com/hekicore/heki-docs (独立仓库，非 heki 主仓库)
- 技术栈: [Docsify](https://docsify.js.org/) 纯静态站，GitHub Pages 自动部署
- 部署方式: push 到 `main` 分支后 GitHub Pages 自动更新，无需构建

## 仓库关系

```
gitee.com/andrew66/hekinew          ← heki 主仓库 (origin)
  └── heki-docs/                    ← 文档源文件目录（随主仓库开发）

github.com/hekicore/heki            ← heki GitHub 公开仓库 (github remote)
github.com/hekicore/heki-docs       ← 文档站独立仓库 (GitHub Pages 部署)
```

文档在主仓库 `heki-docs/` 目录下编辑，需要手动同步到 `hekicore/heki-docs` 仓库发布。

## 目录结构

```
heki-docs/
├── index.html              # Docsify 入口（配置搜索、侧边栏、主题）
├── README.md               # 首页内容（功能介绍）
├── _sidebar.md             # 侧边栏导航（新增页面必须在这里注册）
├── .nojekyll               # GitHub Pages 必需（禁用 Jekyll 处理）
├── serve.js                # 本地预览服务器
├── heki/
│   └── heki-config.md      # 配置详解
├── buy/                    # 购买相关
├── docker/                 # Docker 教程
├── other/                  # 通用教程（限速、审计、DNS、TLS 等）
├── v2ray/                  # VMess 对接教程
├── vless/                  # VLESS 对接教程
├── trojan/                 # Trojan 对接教程
├── ss/                     # Shadowsocks 对接教程
├── ssr/                    # ShadowsocksR 对接教程
├── hysteria/               # Hysteria2 对接教程
├── anytls/                 # AnyTLS 对接教程
├── naive/                  # Naive 对接教程
└── mieru/                  # Mieru 对接教程
```

## 更新部署步骤

### 1. 在主仓库编辑文档

在 `heki-docs/` 目录下编辑 markdown 文件。

### 2. 新增协议/页面时的必要操作

a) 创建文档文件，命名规则: `{协议名}/{面板类型}-{协议名}.md`

```
例: naive/xboard-naive.md
例: mieru/xboard-mieru.md
```

b) 在 `_sidebar.md` 中注册导航入口:

```markdown
* heki-naive 教程
    * [xboard 对接 naive](naive/xboard-naive.md)
```

c) 如果涉及新配置项，更新 `heki/heki-config.md`

### 3. 本地预览（可选）

```bash
cd heki-docs
node serve.js
# 浏览器打开 http://localhost:3000
```

### 4. 同步到 GitHub 并发布

```bash
# 克隆文档仓库到临时目录
git clone https://github.com/hekicore/heki-docs.git /tmp/heki-docs-repo

# 同步文件（保留 .git 和 .nojekyll）
rsync -av --delete --exclude='.git' --exclude='.nojekyll' heki-docs/ /tmp/heki-docs-repo/

# 确保 .nojekyll 存在（GitHub Pages 必需）
touch /tmp/heki-docs-repo/.nojekyll

# 提交并推送
cd /tmp/heki-docs-repo
git add -A
git commit -m "docs: 更新说明"
git push origin main

# 清理
rm -rf /tmp/heki-docs-repo
```

推送后 GitHub Pages 会在 1-2 分钟内自动更新。

### 5. 一键部署脚本

也可以用下面的脚本一步完成:

```bash
#!/bin/bash
# deploy-docs.sh - 一键部署 heki-docs 到 GitHub Pages
set -e

MSG="${1:-docs: update}"
REPO="https://github.com/hekicore/heki-docs.git"
TMP="/tmp/heki-docs-deploy"

rm -rf "$TMP"
git clone "$REPO" "$TMP"
rsync -av --delete --exclude='.git' --exclude='.nojekyll' heki-docs/ "$TMP/"
touch "$TMP/.nojekyll"

git -C "$TMP" add -A
if git -C "$TMP" diff --cached --quiet; then
  echo "没有变更，无需部署"
else
  git -C "$TMP" commit -m "$MSG"
  git -C "$TMP" push origin main
  echo "部署完成: https://hekicore.github.io/heki-docs/"
fi

rm -rf "$TMP"
```

用法:

```bash
bash deploy-docs.sh "docs: 新增 Naive/Mieru 文档"
```

## Docsify 配置说明

配置在 `index.html` 的 `window.$docsify` 对象中:

| 配置项 | 当前值 | 说明 |
|--------|--------|------|
| loadSidebar | true | 使用 `_sidebar.md` 自定义侧边栏 |
| auto2top | true | 切换页面自动滚动到顶部 |
| subMaxLevel | 2 | 侧边栏显示到 h2 级别 |
| search | 启用 | 全文搜索，深度 6 级 |

## 注意事项

- `.nojekyll` 文件不能删除，否则 GitHub Pages 会用 Jekyll 处理导致 `_sidebar.md` 等下划线开头的文件被忽略
- Docsify 是纯前端渲染，所有 `.md` 文件直接被浏览器拉取解析，不需要构建步骤
- 文档仓库的 git 用户信息: `heki <heki@heki.dev>`
- 如果 push 到 GitHub 超时，重试即可（网络问题）
