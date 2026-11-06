# electerm-mirror

[English](./README.md) | 中文说明

基于 Cloudflare Worker 的 GitHub 文件镜像，为 [electerm](https://electerm.org) 服务，主要给访问 `github.com` 困难的地区用。

线上地址：**https://mirror.electerm.org**

## 工作原理

把 GitHub 的 URL 直接拼在域名后面，镜像就按原样取回来。

发布包（302 到公共代理，大文件不经过 Worker）：

```
https://mirror.electerm.org/https://github.com/electerm/electerm/releases/download/v3.6.6/electerm-3.6.6-mac10-x64.dmg
```

源码归档、GitHub API、raw 文件（由边缘节点流式回传）：

```
https://mirror.electerm.org/https://codeload.github.com/owner/repo/tar.gz/HEAD
https://mirror.electerm.org/https://api.github.com/repos/electerm/electerm
https://mirror.electerm.org/https://raw.githubusercontent.com/owner/repo/main/README.md
```

查询串属于目标 URL，`.../contents?ref=dev` 会把 `?ref=dev` 原样带给 GitHub。

不限于 `electerm/electerm`：`electerm` 组织下任何仓库、以及任何其它公开仓库都能用，镜像不关心仓库属于谁。

## 允许的域名

`github.com`、`codeload.github.com`、`api.github.com`、`raw.githubusercontent.com`、`objects.githubusercontent.com`、`release-assets.githubusercontent.com`、`gist.githubusercontent.com`、`atomgit.com`、`raw.atomgit.com`。

其它域名一律 400 拒绝，避免变成公开代理。

## 回退策略

- **代理类请求**（归档、API、raw）：先直连 GitHub，失败后依次走 `gh-proxy.org`、`gh-proxy.com`、`ghfast.top`。404 直接返回——仓库或文件不存在，再换代理只是白等一次超时。
- **发布包**：302 到列表里的第一个代理。改 `src/worker.js` 的 `PROXIES` 即可调整顺序或新增。

## 谁在用

`electerm` 在 GitHub 不可达时用它：

- **从仓库安装 widget** —— `src/app/widgets/widget-source.js` 依次尝试 `codeload.github.com` 直连、本镜像、`cdn.jsdelivr.net`。
- **应用更新下载** —— 设置里的 `gh-proxy` 镜像选项。

## 部署

```bash
npx wrangler deploy
```

推送到 `main` 也会自动部署（`.github/workflows/deploy.yml`，需要 `CLOUDFLARE_API_TOKEN`）。自定义域名 `mirror.electerm.org` 在 Cloudflare 面板里绑定到这个 Worker。

## 项目结构

```
├── src/
│   └── worker.js       # 全部逻辑
├── wrangler.toml       # Wrangler 配置
├── .github/
│   └── workflows/
│       └── deploy.yml  # GitHub Action 部署脚本
└── README.md
```

## 许可证

MIT
