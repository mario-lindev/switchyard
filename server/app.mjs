import express from "express";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { createAdapter, FLAG_KEYS } from "./adapter.mjs";
export function createApp(config, adapterOverride) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "8kb" }));
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    const origin = req.get("origin");
    const allowedOrigins = new Set(
      [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        config.appOrigin,
      ].filter(Boolean),
    );
    if (origin && !allowedOrigins.has(origin))
      return res
        .status(403)
        .json({
          error: "This adapter only accepts requests from its local lab UI.",
        });
    if (
      !["localhost", "127.0.0.1", "::1"].includes(req.hostname) &&
      !config.appOrigin?.includes(req.hostname)
    )
      return res.status(403).json({ error: "Unexpected Host header." });
    next();
  });
  const configured = Boolean(config.environmentKey);
  const adapter = configured
    ? (adapterOverride ?? createAdapter(config))
    : null;
  const requireAdapter = (_req, res, next) =>
    adapter
      ? next()
      : res
          .status(503)
          .json({
            error:
              "Flagsmith is not configured. Add the server-side environment key to .env and restart the adapter.",
          });
  app.get("/api/health", (_req, res) =>
    res.json({ ok: true, service: "switchyard", version: "1.0.0", configured }),
  );
  app.get("/api/connection", async (_req, res, next) => {
    try {
      if (!adapter)
        return res.json({
          mode: "sandbox",
          configured: false,
          message:
            "The sandbox is ready. Configure server-side Flagsmith credentials to connect your own lab.",
        });
      const flags = await adapter.flags();
      res.json({
        mode: "flagsmith",
        configured: true,
        environment: config.environmentLabel ?? "Dedicated lab environment",
        endpoint: config.apiUrl,
        flags,
        mutationsEnabled: config.allowMutations,
        message: config.allowMutations
          ? "SDK evaluation and management writes are connected. Only use this adapter with a dedicated lab environment."
          : "Read-only connection. Set ALLOW_FLAG_MUTATIONS=true to enable flag changes and rollbacks.",
      });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/flags", requireAdapter, async (_req, res, next) => {
    try {
      res.json({ flags: await adapter.flags(), source: "flagsmith" });
    } catch (e) {
      next(e);
    }
  });
  app.patch("/api/flags/:key", requireAdapter, async (req, res, next) => {
    try {
      if (
        !FLAG_KEYS.includes(req.params.key) ||
        typeof req.body.enabled !== "boolean"
      )
        return res
          .status(400)
          .json({
            error: "Provide a supported lab flag and a boolean enabled value.",
          });
      res.json(await adapter.setFlag(req.params.key, req.body.enabled));
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/evaluate", requireAdapter, async (req, res, next) => {
    try {
      if (req.body.count !== undefined && req.body.count !== 100)
        return res
          .status(400)
          .json({
            error:
              "The lab evaluates exactly 100 reusable synthetic identities.",
          });
      res.json(await adapter.evaluate(100));
    } catch (e) {
      next(e);
    }
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Unknown Switchyard API endpoint." }),
  );
  const dist = resolve(import.meta.dirname, "../dist");
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(resolve(dist, "index.html")),
    );
  }
  app.use((error, _req, res, _next) => {
    const safeMessage =
      error instanceof SyntaxError
        ? "Invalid JSON request body."
        : String(error.message ?? "The Flagsmith adapter failed.");
    const secrets = [config.environmentKey, config.managementToken].filter(
      Boolean,
    );
    let message = safeMessage;
    for (const secret of secrets)
      message = message.replaceAll(secret, "[redacted]");
    res
      .status(error instanceof SyntaxError ? 400 : 502)
      .json({ error: message });
  });
  return app;
}
