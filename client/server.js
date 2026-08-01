// ============================================
// Sealos 前端 DevBox 静态服务 + /api 反代
// - 静态文件：dist/（含 SPA fallback）
// - /api/* 反代到 backend DevBox 内部地址
// - /healthz 健康检查（NLB 探针专用，不走文件 IO）
//
// 用法：
//   PORT=8080 node server.js
//
// 环境变量：
//   PORT       监听端口（默认 8080）
//   BACKEND_URL  后端地址（默认 http://library-backend.ns-vx7bk1kv.svc:3000）
// ============================================
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = '0.0.0.0';
const DIST_DIR = path.join(__dirname, 'dist');
const BACKEND = process.env.BACKEND_URL || 'http://library-backend.ns-vx7bk1kv.svc:3000';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.txt':  'text/plain; charset=utf-8',
};

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

// —— 收请求体到 Buffer ——
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// —— /api/* 反代到 backend ——
async function proxyApi(req, res) {
  const target = BACKEND + req.url;
  try {
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers['content-length'];
    delete headers['accept-encoding'];

    const method = req.method.toUpperCase();
    const hasBody = !['GET','HEAD'].includes(method);
    const bodyBuf = hasBody ? await readBody(req) : undefined;

    const init = {
      method,
      headers,
      redirect: 'manual',
    };
    if (hasBody) {
      init.body = bodyBuf;
      init.duplex = 'half';
    }
    const upstream = await fetch(target, init);
    const buf = Buffer.from(await upstream.arrayBuffer());
    const respHeaders = {};
    for (const [k, v] of upstream.headers.entries()) {
      if (['content-encoding','transfer-encoding','connection'].includes(k.toLowerCase())) continue;
      respHeaders[k] = v;
    }
    respHeaders['access-control-allow-origin'] = '*';
    send(res, upstream.status, respHeaders, buf);
  } catch (e) {
    console.error('[proxy]', req.method, req.url, '→', e.message);
    send(res, 502, { 'content-type': 'application/json; charset=utf-8' },
      JSON.stringify({ success: false, error: { code: 'PROXY_ERROR', message: String(e.message || e) } }));
  }
}

// —— 静态文件 / SPA fallback ——
function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(DIST_DIR, urlPath);
  if (!filePath.startsWith(DIST_DIR)) {
    return send(res, 400, { 'content-type': 'text/plain' }, 'Bad request');
  }
  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'content-type': MIME[ext] || 'application/octet-stream',
        'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      fs.readFile(path.join(DIST_DIR, 'index.html'), (e2, data) => {
        if (e2) return send(res, 500, { 'content-type': 'text/plain' }, 'Missing index.html');
        send(res, 200, { 'content-type': MIME['.html'], 'cache-control': 'no-cache' }, data);
      });
    }
  });
}

const server = http.createServer((req, res) => {
  // ★ 健康检查端点 — Sealos NLB / K8s probe 约定路径
  //   不读文件、不走 SPA fallback，纯字符串返回（纳秒级响应）
  //   'no-store' 防止被任何中间层缓存：避免 server 真挂时探针拿到旧 OK
  //   同时兼容 /healthz（K8s 约定）和 /health（部分平台默认）
  if (req.url === '/healthz' || req.url === '/health') {
    return send(res, 200, {
      'content-type': 'text/plain',
      'cache-control': 'no-store',
    }, 'OK');
  }

  if (req.url.startsWith('/api/')) return proxyApi(req, res);
  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`);
  console.log(`[server] /api/* -> ${BACKEND}`);
});