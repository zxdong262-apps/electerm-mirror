/**
 * mirror.electerm.org - GitHub file mirror for electerm
 *
 * Put a GitHub URL after the host and the mirror answers it as itself:
 *
 *   /https://codeload.github.com/owner/repo/tar.gz/HEAD
 *       -> the archive, streamed back from the edge
 *   /https://api.github.com/repos/owner/repo
 *       -> the API answer, streamed back
 *   /https://github.com/owner/repo/releases/download/v1/x.dmg
 *       -> 302 to a public proxy (see PROXIES)
 *
 * The release assets are still a redirect on purpose: they are hundreds of
 * megabytes, a public proxy already streams those well, and the desktop
 * updater that asks for them has been following that redirect for years.
 * Everything else is proxied for real, because those answers are small (a
 * widget tarball is a few KB) and the client should not have to depend on a
 * second service being alive to get them.
 *
 * Only ALLOWED_HOSTS are fetched: without that allowlist this would be an open
 * proxy and would be abused within a week.
 */

// Public GitHub proxies, tried in order. Used as the redirect target for
// release assets and as this Worker's own fallback when github.com refuses.
const PROXIES = [
  'https://gh-proxy.org',
  'https://gh-proxy.com',
  'https://ghfast.top',
];

// Hosts a client may ask this mirror to fetch.
const ALLOWED_HOSTS = new Set([
  'github.com',
  'codeload.github.com',
  'api.github.com',
  'raw.githubusercontent.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'gist.githubusercontent.com',
  'atomgit.com',
  'raw.atomgit.com',
]);

// /owner/repo/releases/download/... on github.com
const RELEASE_PATH = /^\/[^/]+\/[^/]+\/releases\/download\//;

// Headers worth carrying through: range (resumable downloads), the conditional
// pair (revalidation) and accept (api media types, raw file types).
const FORWARD_HEADERS = [
  'accept',
  'range',
  'if-none-match',
  'if-modified-since',
  'user-agent',
];

/**
 * Read the target out of /https://host/path?query
 *
 * The target is the whole URL, query included, so the outer query belongs to
 * it. Returns null when the path is not an allowed https URL.
 */
function parseTarget(url) {
  const raw = url.pathname.replace(/^\/+/, '');
  if (!/^https?:\/\//i.test(raw)) {
    return null;
  }
  let target;
  try {
    target = new URL(raw + url.search);
  } catch {
    return null;
  }
  if (target.protocol !== 'https:') {
    return null;
  }
  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return null;
  }
  return target;
}

function copyRequestHeaders(request) {
  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }
  // ask for the bytes as they are: the response is passed through untouched,
  // so a content-encoding the edge would not keep would break content-length
  headers.set('accept-encoding', 'identity');
  return headers;
}

/**
 * Fetch the target, directly first and through the proxies after that.
 *
 * A 404 comes back as-is: the repository or file does not exist, and asking
 * another proxy the same question would only cost a timeout. Everything else
 * (429 rate limits, edge blocks, connection resets) is worth a second try
 * from another address.
 */
async function fetchTarget(target, request) {
  const init = {
    method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: copyRequestHeaders(request),
    redirect: 'follow',
  };
  const attempts = [target.href, ...PROXIES.map((base) => `${base}/${target.href}`)];
  let lastError = null;
  for (const href of attempts) {
    try {
      const response = await fetch(href, init);
      if (response.ok || response.status === 304 || response.status === 404) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status} from ${new URL(href).hostname}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('cannot reach the target');
}

function proxyResponse(upstream) {
  // status, statusText and headers come along; the body is streamed, never
  // buffered, so a large file does not have to fit in memory
  const response = new Response(upstream.body, upstream);
  response.headers.set('access-control-allow-origin', '*');
  response.headers.set('x-electerm-mirror', '1');
  return response;
}

function textResponse(message, status = 400) {
  return new Response(message + '\n', {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'access-control-allow-origin': '*',
    },
  });
}

function getHomePageHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="mirror.electerm.org - a Cloudflare Worker that mirrors GitHub files for electerm: release assets, source archives and the GitHub API, for regions where github.com is hard to reach.">
  <meta name="keywords" content="electerm, github mirror, download proxy, github releases, ssh terminal">
  <meta name="robots" content="index, follow">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://mirror.electerm.org/">
  <meta property="og:title" content="mirror.electerm.org - GitHub mirror for electerm">
  <meta property="og:description" content="Mirrors GitHub release assets, source archives and the GitHub API for electerm.">
  <meta property="og:site_name" content="mirror.electerm.org">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🖥️</text></svg>">
  <title>mirror.electerm.org - GitHub mirror for electerm</title>
  <style>
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.65;
      max-width: 46rem;
      margin: 0 auto;
      padding: 3rem 1.5rem 5rem;
      color: #1c1c1e;
      background: #fff;
    }
    h1 { font-size: 1.6rem; margin: 0 0 .25rem; letter-spacing: -.01em; }
    .subtitle { color: #6b6b70; margin: 0 0 2.5rem; }
    h2 { font-size: 1rem; margin: 2.5rem 0 .75rem; }
    p { margin: 0 0 1rem; }
    pre {
      background: #f6f6f7;
      border: 1px solid #e6e6e9;
      border-radius: 6px;
      padding: .9rem 1rem;
      overflow-x: auto;
      font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
      font-size: .82rem;
      line-height: 1.5;
      margin: 0 0 1rem;
    }
    code { font-family: inherit; }
    .muted { color: #6b6b70; }
    ul { padding-left: 1.2rem; }
    li { margin-bottom: .35rem; }
    footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e6e6e9;
      font-size: .85rem;
      color: #6b6b70;
    }
    a { color: #0b62c4; }
    @media (prefers-color-scheme: dark) {
      body { color: #e8e8ea; background: #17171a; }
      .subtitle, .muted, footer { color: #a1a1a8; }
      pre { background: #1f1f23; border-color: #2e2e34; }
      footer { border-color: #2e2e34; }
      a { color: #7ab7ff; }
    }
  </style>
</head>
<body>
  <h1>mirror.electerm.org</h1>
  <p class="subtitle">GitHub mirror for electerm, for regions where github.com is hard to reach.</p>

  <p>Put a GitHub URL after the host and the mirror answers it as itself. Nothing else to configure, no scheme to learn. Any public repository works, not just electerm's own.</p>

  <h2>Release assets</h2>
  <pre><code>https://mirror.electerm.org/https://github.com/electerm/electerm/releases/download/v3.6.6/electerm-3.6.6-mac10-x64.dmg</code></pre>
  <p class="muted">Redirects to a public proxy: the file never passes through this Worker.</p>

  <h2>Source archives</h2>
  <pre><code>https://mirror.electerm.org/https://codeload.github.com/owner/repo/tar.gz/HEAD</code></pre>
  <p class="muted">Streamed back from the edge. This is what electerm uses to install a widget from a repository.</p>

  <h2>GitHub API and raw files</h2>
  <pre><code>https://mirror.electerm.org/https://api.github.com/repos/electerm/electerm
https://mirror.electerm.org/https://raw.githubusercontent.com/owner/repo/main/README.md</code></pre>

  <h2>Allowed hosts</h2>
  <ul>
    <li>github.com, codeload.github.com, api.github.com</li>
    <li>raw.githubusercontent.com, objects.githubusercontent.com, release-assets.githubusercontent.com, gist.githubusercontent.com</li>
    <li>atomgit.com, raw.atomgit.com</li>
  </ul>
  <p class="muted">Anything else is refused, so this cannot be used as an open proxy.</p>

  <h2>Fallbacks</h2>
  <p>When github.com refuses the Worker, the request is retried through a public proxy: ${PROXIES.map((p) => new URL(p).hostname).join(', ')}.</p>

  <footer>
    <p>Powered by <a href="https://workers.cloudflare.com/" target="_blank" rel="noopener">Cloudflare Workers</a> ·
    <a href="https://github.com/zxdong262-apps/electerm-mirror" target="_blank" rel="noopener">Source</a> ·
    <a href="https://electerm.org" target="_blank" rel="noopener">electerm</a></p>
  </footer>
</body>
</html>`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, HEAD, OPTIONS',
          'access-control-allow-headers': 'range, if-none-match, if-modified-since, accept',
        },
      });
    }

    if (path === '/' || path === '/index.html') {
      return new Response(getHomePageHTML(), {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, max-age=3600',
        },
      });
    }

    const target = parseTarget(url);
    if (!target) {
      return textResponse(
        'Give a full https URL after the host, e.g.\n' +
        '  https://mirror.electerm.org/https://codeload.github.com/owner/repo/tar.gz/HEAD\n' +
        'Allowed hosts: ' + [...ALLOWED_HOSTS].join(', ')
      );
    }

    // release assets stay a redirect (see the header of this file)
    if (RELEASE_PATH.test(target.pathname)) {
      return Response.redirect(`${PROXIES[0]}/${target.href}`, 302);
    }

    try {
      return proxyResponse(await fetchTarget(target, request));
    } catch (err) {
      return textResponse(
        `cannot reach ${target.hostname}: ${(err && err.message) || err}`,
        502
      );
    }
  },
};
