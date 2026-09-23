// Serves a web export the way Firebase Hosting does: a file that exists wins,
// anything else gets index.html. Used by the end-to-end tests.
//
//   node scripts/serve-dist.cjs <folder> <port>

const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(process.argv[2] || "dist");
const port = Number(process.argv[3] || 8099);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".wav": "audio/wav",
  ".svg": "image/svg+xml",
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    const candidates = [path.join(root, url), path.join(root, url + ".html"), path.join(root, url, "index.html"), path.join(root, "index.html")];
    const file = candidates.find((f) => f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isFile());
    if (!file) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, "127.0.0.1", () => console.log(`serving ${root} on http://127.0.0.1:${port}`));
