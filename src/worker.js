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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

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
