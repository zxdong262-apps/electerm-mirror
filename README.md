# electerm-mirror

[中文说明](./README_CN.md) | English

A Cloudflare Worker that mirrors GitHub files for [electerm](https://electerm.org), for regions where `github.com` is hard to reach.

Live at **https://mirror.electerm.org**.

## How It Works

Put a GitHub URL after the host; the mirror answers it as itself.

Release assets (redirected to a public proxy, so the big file never passes through the Worker):

```
https://mirror.electerm.org/https://github.com/electerm/electerm/releases/download/v3.6.6/electerm-3.6.6-mac10-x64.dmg
```

Source archives, the GitHub API and raw files (streamed back from the edge):

```
https://mirror.electerm.org/https://codeload.github.com/owner/repo/tar.gz/HEAD
https://mirror.electerm.org/https://api.github.com/repos/electerm/electerm
https://mirror.electerm.org/https://raw.githubusercontent.com/owner/repo/main/README.md
```

The query string belongs to the target, so `.../contents?ref=dev` reaches GitHub with `?ref=dev`.

Any repository works, not just `electerm/electerm`: every repo under the `electerm` organization, and any other public repo, since the mirror does not care whose repository it is.

## Allowed Hosts

`github.com`, `codeload.github.com`, `api.github.com`, `raw.githubusercontent.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com`, `gist.githubusercontent.com`, `atomgit.com`, `raw.atomgit.com`.

Anything else is refused with a 400, so this cannot be used as an open proxy.

## Fallbacks

- **Proxied requests** (archives, API, raw): GitHub directly first, then `gh-proxy.org`, `gh-proxy.com`, `ghfast.top`. A 404 is returned as-is — the repository does not exist, and asking another proxy would only cost a timeout.
- **Release assets**: 302 to the first proxy in the list. Change `PROXIES` in `src/worker.js` to reorder or add one.

## Used By

`electerm` itself, when GitHub is unreachable:

- **Widget install from a repository** — `src/app/widgets/widget-source.js` tries `codeload.github.com` directly, then this mirror, then `cdn.jsdelivr.net`.
- **App update download** — the `gh-proxy` mirror option in Settings.

## Deployment

```bash
npx wrangler deploy
```

Pushing to `main` also deploys (`.github/workflows/deploy.yml`, needs the `CLOUDFLARE_API_TOKEN` secret). The custom domain `mirror.electerm.org` is attached to the Worker in the Cloudflare dashboard.

## Project Structure

```
├── src/
│   └── worker.js       # the whole Worker
├── wrangler.toml       # Wrangler configuration
├── .github/
│   └── workflows/
│       └── deploy.yml  # GitHub Action deployment
└── README.md
```

## License

MIT
