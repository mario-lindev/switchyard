import { createAdapter } from "../server/adapter.mjs";
const project = process.env.FLAGSMITH_PROJECT_ID;
if (!project || !process.env.FLAGSMITH_MANAGEMENT_TOKEN) {
  console.error(
    "Set FLAGSMITH_PROJECT_ID and FLAGSMITH_MANAGEMENT_TOKEN in .env.",
  );
  process.exit(1);
}
const adapter = createAdapter({
  apiUrl: process.env.FLAGSMITH_API_URL ?? "http://localhost:8000/api/v1/",
  environmentKey: process.env.FLAGSMITH_ENVIRONMENT_KEY,
  managementToken: process.env.FLAGSMITH_MANAGEMENT_TOKEN,
});
const path = `projects/${encodeURIComponent(project)}/features/`;
let data = await adapter.management(path);
let existing = Array.isArray(data) ? data : (data.results ?? []);
while (data.next) {
  const next = new URL(data.next);
  const origin = new URL(
    process.env.FLAGSMITH_API_URL ?? "http://localhost:8000/api/v1/",
  ).origin;
  if (next.origin !== origin)
    throw new Error("Cross-origin pagination is not allowed.");
  data = await adapter.management(next.href);
  existing.push(...(Array.isArray(data) ? data : (data.results ?? [])));
}
for (const feature of [
  {
    name: "checkout_v2",
    description:
      "Switchyard candidate checkout. Numeric remote config controls candidate exposure percentage.",
    initial_value: "25",
  },
  {
    name: "smart_cache",
    description:
      "Switchyard resilience: smart cache protects the synthetic database.",
  },
  {
    name: "payment_retry",
    description:
      "Switchyard resilience: retries protect synthetic payment requests.",
  },
]) {
  if (existing.some((f) => f.name === feature.name)) {
    console.log(`Kept existing flag: ${feature.name}`);
    continue;
  }
  await adapter.management(path, {
    method: "POST",
    body: JSON.stringify({
      ...feature,
      type: "STANDARD",
      default_enabled: true,
    }),
  });
  console.log(`Created: ${feature.name}`);
}
console.log(
  "Seed complete. Existing flags were not overwritten. Verify all three flags are enabled in your dedicated lab environment.",
);
