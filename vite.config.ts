import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import http from 'node:http';
import https from 'node:https';

function localCorsProxyPlugin(): Plugin {
  return {
    name: 'local-cors-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy', (req, res) => {
        // Handle preflight OPTIONS
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.statusCode = 204;
          res.end();
          return;
        }

        const reqUrl = new URL(req.url || '', 'http://localhost');
        const urlParam = reqUrl.searchParams.get('url');
        const customReferer = reqUrl.searchParams.get('referrer') || (req.headers['x-proxy-referer'] as string | undefined);

        if (!urlParam) {
          res.statusCode = 400;
          res.end('Missing url parameter');
          return;
        }

        function fetchWithRedirects(targetStr: string, redirectCount = 0) {
          if (redirectCount > 5) {
            res.statusCode = 508;
            res.end('Too Many Redirects');
            return;
          }

          let targetUrl: URL;
          try {
            targetUrl = new URL(targetStr);
          } catch {
            res.statusCode = 400;
            res.end('Invalid target URL');
            return;
          }

          const client = targetUrl.protocol === 'https:' ? https : http;
          const headers: Record<string, string> = {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: '*/*',
            'Accept-Encoding': 'identity',
            Referer: customReferer || targetUrl.origin,
          };

          const proxyReq = client.request(
            targetUrl,
            {
              method: req.method || 'GET',
              headers,
            },
            (proxyRes) => {
              // Handle Redirects
              if (
                proxyRes.statusCode &&
                [301, 302, 303, 307, 308].includes(proxyRes.statusCode) &&
                proxyRes.headers.location
              ) {
                const redirectedUrl = new URL(proxyRes.headers.location, targetUrl).href;
                fetchWithRedirects(redirectedUrl, redirectCount + 1);
                return;
              }

              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', '*');

              const contentType = proxyRes.headers['content-type'] || '';
              if (contentType) {
                res.setHeader('Content-Type', contentType);
              }
              res.statusCode = proxyRes.statusCode || 200;

              // If it's an M3U8 manifest, rewrite relative segment paths so HLS.js can resolve them through proxy
              const isManifest =
                contentType.includes('mpegurl') ||
                contentType.includes('application/x-mpegurl') ||
                contentType.includes('application/vnd.apple.mpegurl') ||
                targetUrl.pathname.endsWith('.m3u8') ||
                targetUrl.search.includes('.m3u8');

              if (res.statusCode === 200 && isManifest) {
                const chunks: Buffer[] = [];
                proxyRes.on('data', (c) => chunks.push(c));
                proxyRes.on('end', () => {
                  const text = Buffer.concat(chunks).toString('utf-8');
                  if (text.includes('#EXTM3U')) {
                    const lines = text.split(/\r?\n/);
                    const rewrittenLines = lines.map((line) => {
                      const trimmed = line.trim();
                      if (!trimmed) return line;

                      // Rewrite URI="something" attributes (keys, sub-manifests)
                      if (trimmed.startsWith('#')) {
                        return line.replace(/URI="([^"]+)"/g, (_, uri) => {
                          try {
                            const abs = new URL(uri, targetUrl).href;
                            const refParam = customReferer ? `&referrer=${encodeURIComponent(customReferer)}` : '';
                            return `URI="/api/proxy?url=${encodeURIComponent(abs)}${refParam}"`;
                          } catch {
                            return `URI="${uri}"`;
                          }
                        });
                      }

                      // Rewrite relative/absolute segment and sub-playlist URLs
                      try {
                        const abs = new URL(trimmed, targetUrl).href;
                        const refParam = customReferer ? `&referrer=${encodeURIComponent(customReferer)}` : '';
                        return `/api/proxy?url=${encodeURIComponent(abs)}${refParam}`;
                      } catch {
                        return line;
                      }
                    });

                    const result = rewrittenLines.join('\n');
                    res.setHeader('Content-Length', Buffer.byteLength(result));
                    res.end(result);
                  } else {
                    res.end(Buffer.concat(chunks));
                  }
                });
              } else {
                // Direct streaming for video segments (.ts, .m4s, etc.)
                proxyRes.pipe(res);
              }
            }
          );

          proxyReq.on('error', (err) => {
            console.error('Local proxy error:', err);
            if (!res.headersSent) {
              res.statusCode = 502;
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end('Bad Gateway: ' + err.message);
            }
          });

          req.pipe(proxyReq);
        }

        try {
          fetchWithRedirects(urlParam);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Server Error';
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(msg);
          }
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localCorsProxyPlugin()],
});
