# electerm-mirror

[English](./README.md) | 中文说明

GitHub electerm发布包下载镜像加速服务（Cloudflare Worker）。

## 工作原理

当你访问：
```
https://electerm-mirror.html5beta.com/https://github.com/electerm/electerm/releases/download/v3.6.6/electerm-3.6.6-mac10-x64.dmg.blockmap
```

它会重定向到：
```
https://gh-proxy.org/https://github.com/electerm/electerm/releases/download/v3.6.6/electerm-3.6.6-mac10-x64.dmg.blockmap
```

## 功能特点

- **自动代理健康检查**：定期检查代理可用性和响应速度
- **智能代理选择**：自动选择响应最快的可用代理
- **易于扩展**：可在配置中轻松添加更多代理

## 支持的代理

当前支持的代理：[gh-proxy.org](https://gh-proxy.org)

## 部署

### 前置要求

1. 安装 Wrangler CLI：
```bash
npm install -g wrangler
```

2. 登录 Cloudflare：
```bash
wrangler login
```

3. 配置 GitHub Secrets：
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

### 手动部署

```bash
wrangler deploy
```

### GitHub Action

推送到 `main` 分支即可触发自动部署。

## 项目结构

```
├── src/
│   └── worker.js      # 主要代码
├── wrangler.toml       # Wrangler 配置
├── .github/
│   └── workflows/
│       └── deploy.yml  # GitHub Action 部署脚本
└── README.md
```

## 许可证

MIT
