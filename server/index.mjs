import { createApp } from "./app.mjs";
const config = {
  apiUrl: process.env.FLAGSMITH_API_URL ?? "http://localhost:8000/api/v1/",
  environmentKey: process.env.FLAGSMITH_ENVIRONMENT_KEY,
  environmentId: process.env.FLAGSMITH_ENVIRONMENT_ID,
  managementToken: process.env.FLAGSMITH_MANAGEMENT_TOKEN,
  allowMutations: process.env.ALLOW_FLAG_MUTATIONS === "true",
  environmentLabel: process.env.FLAGSMITH_ENVIRONMENT_LABEL,
  appOrigin: process.env.APP_ORIGIN,
};
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";
const server = createApp(config).listen(port, host, () =>
  console.log(
    `Switchyard adapter: http://${host}:${port} · ${config.environmentKey ? "Flagsmith configured" : "sandbox mode"}`,
  ),
);
process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
