# electerm-mirror

[中文说明](./README_CN.md) | English

A Cloudflare Worker service that redirects electerm GitHub release download requests to a working proxy.

## How It Works

When you access:
```
https://electerm-mirror.html5ebta.com/https://github.com/electerm/electerm/releases/download/v3.6.6/electerm-3.6.6-mac10-x64.dmg.blockmap
```

It redirects to:
```
https://gh-proxy.org/https://github.com/electerm/electerm/releases/download/v3.6.6/electerm-3.6.6-mac10-x64.dmg.blockmap```

## Features

- **Automatic Proxy Health Check**: Periodically checks proxy availability and response time
- **Smart Proxy Selection**: Automatically selects the fastest available proxy
- **Easy to Extend**: Add more proxies in the configuration

## Supported Proxies

Currently supported proxy: [gh-proxy.org](https://gh-proxy.org)

## Deployment

### Prerequisites

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Set up GitHub Secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

### Manual Deploy

```bash
wrangler deploy
```

### GitHub Action

Push to `main` branch to trigger automatic deployment.

## Project Structure

```
├── src/
│   └── worker.js      # Main worker code
├── wrangler.toml       # Wrangler configuration
├── .github/
│   └── workflows/
│       └── deploy.yml  # GitHub Action deployment
└── README.md
```

## License

MIT
