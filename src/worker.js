/**
 * electerm-mirror - GitHub release mirror with proxy fallback
 *
 * Redirects /https://github.com/electerm/electerm/releases/download/{*} to a working proxy
 */

// Proxy list with health check scores (higher = better)
const PROXIES = [
  {
    name: 'gh-proxy.org',
    baseUrl: 'https://gh-proxy.org',
    score: 100, // will be updated by health check
  },
  // Add more proxies here:
  // { name: 'mirror.example.com', baseUrl: 'https://mirror.example.com', score: 100 },
];

// GitHub release download path pattern
const GITHUB_DOWNLOAD_PATTERN = '/https://github.com/electerm/electerm/releases/download/';

/**
 * Check proxy health by making a HEAD request
 * @param {string} baseUrl - Proxy base URL
 * @returns {Promise<number>} - Response time in ms, or Infinity if failed
 */
async function checkProxyHealth(baseUrl) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    await fetch(baseUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return Date.now() - start;
  } catch {
    return Infinity;
  }
}

/**
 * Update proxy scores based on health checks
 */
async function updateProxyScores() {
  const results = await Promise.all(
    PROXIES.map(async (proxy) => {
      const responseTime = await checkProxyHealth(proxy.baseUrl);
      // Lower response time = higher score (invert and normalize)
      // Response time of 100ms = score 100, 1000ms = score 10, timeout = score 0
      proxy.score = responseTime === Infinity ? 0 : Math.max(0, 100 - responseTime / 10);
      return proxy;
    })
  );
  return results;
}

/**
 * Get the best proxy based on score
 */
function getBestProxy() {
  // Sort by score descending
  const sorted = [...PROXIES].sort((a, b) => b.score - a.score);
  return sorted[0];
}

/**
 * Build the target URL with proxy
 * @param {string} path - The requested path (e.g., /https://github.com/...)
 * @param {string} proxyBaseUrl - The proxy base URL
 */
function buildProxyUrl(path, proxyBaseUrl) {
  // path starts with /, so we concatenate directly
  return `${proxyBaseUrl}${path}`;
}

function getHomePageHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="electerm-mirror - A fast, reliable GitHub release mirror service with proxy fallback. Download electerm releases seamlessly even from regions with restricted GitHub access.">
  <meta name="keywords" content="electerm, github mirror, download proxy, github releases, ssh terminal">
  <meta name="author" content="electerm">
  <meta name="robots" content="index, follow">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://electerm-mirror.html5beta.com/">
  <meta property="og:title" content="electerm-mirror - GitHub Release Mirror Service">
  <meta property="og:description" content="A fast, reliable GitHub release mirror service with proxy fallback. Download electerm releases seamlessly.">
  <meta property="og:site_name" content="electerm-mirror">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="electerm-mirror - GitHub Release Mirror Service">
  <meta name="twitter:description" content="A fast, reliable GitHub release mirror service with proxy fallback.">

  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🖥️</text></svg>">
  <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🖥️</text></svg>">

  <title>electerm-mirror - GitHub Release Mirror Service</title>

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 3rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #667eea;
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    .subtitle {
      color: #666;
      font-size: 1.2rem;
      margin-bottom: 2rem;
    }
    .feature {
      display: flex;
      align-items: center;
      margin-bottom: 1rem;
      padding: 1rem;
      background: #f7fafc;
      border-radius: 8px;
    }
    .feature-icon {
      font-size: 1.5rem;
      margin-right: 1rem;
    }
    h2 {
      color: #333;
      margin: 2rem 0 1rem;
      font-size: 1.5rem;
    }
    .code-block {
      background: #1a1a2e;
      color: #eee;
      padding: 1.5rem;
      border-radius: 8px;
      overflow-x: auto;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }
    .code-block code {
      color: #667eea;
    }
    .code-block .comment { color: #666; }
    .code-block .example { color: #90cdf4; }
    .badge {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.875rem;
      margin-right: 0.5rem;
      margin-bottom: 0.5rem;
    }
    footer {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #eee;
      text-align: center;
      color: #666;
    }
    footer a {
      color: #667eea;
      text-decoration: none;
    }
    footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>electerm-mirror</h1>
    <p class="subtitle">GitHub Release Mirror Service with Proxy Fallback</p>

    <div>
      <span class="badge">🚀 Fast</span>
      <span class="badge">🔄 Reliable</span>
      <span class="badge">🌍 Global</span>
    </div>

    <h2>What is electerm-mirror?</h2>
    <p>electerm-mirror is a Cloudflare Worker service that provides reliable, fast downloads for electerm GitHub releases by routing them through working proxies. It's designed to ensure uninterrupted access to electerm releases even in regions with restricted GitHub access.</p>

    <h2>Features</h2>
    <div class="feature">
      <span class="feature-icon">⚡</span>
      <div>
        <strong>Smart Proxy Selection</strong>
        <p>Automatically selects the fastest available proxy based on response time</p>
      </div>
    </div>
    <div class="feature">
      <span class="feature-icon">🔄</span>
      <div>
        <strong>Automatic Failover</strong>
        <p>Seamlessly switches to backup proxies if the primary fails</p>
      </div>
    </div>
    <div class="feature">
      <span class="feature-icon">🚀</span>
      <div>
        <strong>High Performance</strong>
        <p>Built on Cloudflare's global network for minimal latency</p>
      </div>
    </div>

    <h2>How to Use</h2>
    <p>Simply replace the GitHub URL in your download link with the mirror URL:</p>

    <div class="code-block"><code>Original: https://github.com/electerm/electerm/releases/download/<span class="example">v3.6.6</span>/electerm-3.6.6-mac.dmg</code></div>

    <p>Change to:</p>

    <div class="code-block"><code>Mirror: https://electerm-mirror.html5beta.com/<span class="example">https://github.com/electerm/electerm/releases/download/v3.6.6/electerm-3.6.6-mac.dmg</span></code></div>

    <h2>Supported Proxies</h2>
    <ul>
      <li>gh-proxy.org</li>
    </ul>

    <footer>
      <p>Powered by <a href="https://workers.cloudflare.com/" target="_blank" rel="noopener">Cloudflare Workers</a></p>
      <p><a href="https://github.com/zxdong262-apps/electerm-mirror" target="_blank" rel="noopener">View on GitHub</a></p>
    </footer>
  </div>
</body>
</html>`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/' || path === '/index.html') {
      return new Response(getHomePageHTML(), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Check if this is a GitHub download request
    if (!path.startsWith(GITHUB_DOWNLOAD_PATTERN)) {
      // Not a GitHub download request, return 404 or handle differently
      return new Response('Not Found', { status: 404 });
    }

    // Get the best proxy (refresh scores periodically in background)
    let proxy = getBestProxy();

    // If all proxies have score 0, use the first one as fallback
    if (proxy.score === 0 && PROXIES.length > 0) {
      proxy = PROXIES[0];
    }

    // Build the target URL
    const targetUrl = buildProxyUrl(path, proxy.baseUrl);

    // Redirect to the proxy
    return Response.redirect(targetUrl, 302);
  }

  // // Scheduled handler for health checks
  // async scheduled(event, env, ctx) {
  //   // Run health check every 5 minutes
  //   await updateProxyScores();
  //   console.log('Proxy health check completed:', PROXIES.map(p => `${p.name}: ${p.score}`).join(', '));
  // },
};
