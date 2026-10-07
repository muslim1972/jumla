import http from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".js": "text/javascript" };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const file = join(root, decodeURIComponent(url.pathname));
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("not found");
  }
}).listen(4173, () => console.log("mockups server on http://localhost:4173"));
