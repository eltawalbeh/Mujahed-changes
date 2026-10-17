/**
 * Optional domain-level OG gateway for chefmujahed.com product routes.
 * REQUIRES separately authorised DNS/Cloudflare zone configuration.
 * NOT deployed by GitHub merge or Figma Make Publish.
 *
 * Human traffic passes straight through to existing Figma Make origin.
 * Social crawlers receive public, server-generated product metadata.
 */
const DEFAULT_SHARE_API = 'https://hqvxhhhwzhefydvwlpje.supabase.co/functions/v1/product-share';
const CRAWLERS = /facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|telegrambot|discordbot|slackbot|pinterest|skypeuripreview|embedly|googlebot|bingbot/i;
const PRODUCT_PATH = /^\/(product|business\/product)\/([\p{L}\p{N}_-]+)\/?$/u;

function safeOgUrl(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(PRODUCT_PATH);
    if (!match || !['GET', 'HEAD'].includes(request.method) ||
      !CRAWLERS.test(request.headers.get('user-agent') || '')) {
      return fetch(request);
    }
    const slug = match[2];
    const channel = match[1] === 'product' ? 'B2C' : 'B2B';
    const endpoint = new URL(env?.PRODUCT_SHARE_API || DEFAULT_SHARE_API);
    endpoint.searchParams.set('slug', slug);
    endpoint.searchParams.set('channel', channel);
    try {
      const result = await fetch(endpoint.toString(), {
        method: 'GET',
        headers: { 'Accept': 'text/html', 'User-Agent': 'ChefMujahed-OG-Edge/1.0' },
      });
      if (!result.ok) {
        return new Response('Product preview unavailable', {
          status: result.status === 404 ? 404 : 503,
          headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
        });
      }
      let html = await result.text();
      const canonical = url.origin + url.pathname;
      // Canonical shared URL must be the product link the customer actually pasted.
      html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/?\s*>/i,
        '<meta property="og:url" content="' + safeOgUrl(canonical) + '"/>');
      // Never bounce bots to the SPA: they need the complete metadata in THIS response.
      html = html.replace(/<meta http-equiv="refresh"[^>]*>/gi, '');
      html = html.replace(/<script>\s*window\.location\.replace\([\s\S]*?<\/script>/gi, '');
      return new Response(request.method === 'HEAD' ? null : html, {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, max-age=120, s-maxage=300',
          'x-content-type-options': 'nosniff',
          'vary': 'User-Agent',
        },
      });
    } catch (error) {
      console.error('OG route error', error);
      return new Response('Product preview temporarily unavailable', {
        status: 503,
        headers: { 'cache-control': 'no-store', 'content-type': 'text/plain' },
      });
    }
  },
};
