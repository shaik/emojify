// Tiny zero-dependency dev server. Serves a directory (default: src/) with the
// right MIME types for ES modules and workers. Not for production — GitHub Pages
// serves the built dist/.
//
// Usage: node serve.mjs [dir] [port]

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, extname } from "node:path";

const dir = process.argv[2] || "src";
const port = Number(process.argv[3]) || 5173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path.endsWith("/")) path += "index.html";
    // Prevent path traversal.
    const full = normalize(join(process.cwd(), dir, path));
    const base = normalize(join(process.cwd(), dir));
    if (!full.startsWith(base)) { res.writeHead(403).end("Forbidden"); return; }

    const info = await stat(full).catch(() => null);
    const target = info?.isDirectory() ? join(full, "index.html") : full;
    const body = await readFile(target);
    res.writeHead(200, { "content-type": TYPES[extname(target)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
  }
}).listen(port, () => {
  console.log(`Dev server: http://localhost:${port}  (serving ${dir}/)`);
});
