/**
 * Purpose: Native HTTP Adapter for the Web HUD (web_cockpit seam).
 * Hardened: Zero-dependency, SSE-driven, Path-Jailed.
 */
import http from "http";
import fs from "fs/promises";
import path from "path";
import { PathGuard } from "../helpers/path_guard.js";
import { createRevisionStream } from "../helpers/revision_stream.js";
import { IStore } from "../../../contracts/store.contract.js";
import type { IWebCockpit } from "../../../contracts/web_cockpit.contract.js";

export class WebCockpitAdapter implements IWebCockpit {
  private server: http.Server;
  private readonly staticDir: string;

  constructor(
    private readonly store: IStore,
    private readonly pathGuard: PathGuard,
    private readonly port: number = 3000
  ) {
    this.staticDir = this.pathGuard.join("src/tui/web"); // Jail to web root
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.error(`[WebHUD] Listening on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => (err ? reject(err) : resolve()));
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");

    if (req.url === "/api/events") {
      this.handleSSE(req, res);
      return;
    }

    if (req.url === "/api/state") {
      this.handleState(res);
      return;
    }

    // Static Files (Fallback)
    this.handleStatic(req, res);
  }

  private async handleState(res: http.ServerResponse) {
    try {
      const state = await this.store.load();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(state));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: "State load failed" }));
    }
  }

  private async handleSSE(req: http.IncomingMessage, res: http.ServerResponse) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    const stream = createRevisionStream(this.store);
    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 15000);

    req.on("close", () => {
      clearInterval(heartbeat);
    });

    try {
      for await (const revision of stream) {
        res.write(`data: ${JSON.stringify({ revision })}\n\n`);
      }
    } catch (err) {
      console.error("[WebHUD] SSE Stream Error:", err);
      res.end();
    }
  }

  private async handleStatic(req: http.IncomingMessage, res: http.ServerResponse) {
    let filePath = req.url === "/" ? "index.html" : req.url || "index.html";
    // Sanitize
    filePath = filePath.replace(/^(\.\.[/\\])+/, ""); 
    
    try {
      const fullPath = path.join(this.staticDir, filePath);
      await this.pathGuard.validate(fullPath); // Check Jail
      
      const content = await fs.readFile(fullPath);
      const ext = path.extname(fullPath);
      const contentType = this.getContentType(ext);
      
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Not Found");
    }
  }

  private getContentType(ext: string): string {
    const map: Record<string, string> = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".svg": "image/svg+xml",
    };
    return map[ext] || "text/plain";
  }
}