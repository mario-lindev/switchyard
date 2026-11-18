import { Flagsmith } from "@flagsmith/nodejs";
function percentage(value, fallback) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim())
        ? Number(value)
        : NaN;
  return Number.isFinite(number)
    ? Math.max(0, Math.min(100, number))
    : fallback;
}
export const FLAG_KEYS = ["checkout_v2", "smart_cache", "payment_retry"];
export function bucketForIdentity(identifier) {
  let hash = 2166136261;
  for (const ch of identifier) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}
export async function mapLimited(items, limit, fn) {
  const output = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        output[index] = await fn(items[index], index);
      }
    }),
  );
  return output;
}
export function createAdapter(config, dependencies = {}) {
  const apiUrl = config.apiUrl.endsWith("/")
    ? config.apiUrl
    : `${config.apiUrl}/`;
  const sdk =
    dependencies.sdk ??
    new Flagsmith({
      environmentKey: config.environmentKey,
      apiUrl,
      enableAnalytics: false,
      enableLocalEvaluation: false,
      requestTimeoutSeconds: 5,
      retries: 0,
    });
  const request = dependencies.fetch ?? fetch;
  const featureStates = new Map();
  const unwrap = (data) => (Array.isArray(data) ? data : (data.results ?? []));
  async function management(path, options = {}) {
    if (!config.managementToken)
      throw new Error("Set FLAGSMITH_MANAGEMENT_TOKEN on the server.");
    const res = await request(new URL(path, apiUrl), {
      ...options,
      headers: {
        Authorization: `Api-Key ${config.managementToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok)
      throw new Error(
        `Flagsmith management API returned ${res.status}. Check the lab environment and token permissions.`,
      );
    return res.status === 204 ? null : res.json();
  }
  function normalizeFlags(flags) {
    const result = {};
    for (const key of FLAG_KEYS) {
      const flag = flags.getFlag(key);
      if (!flag || flag.isDefault)
        throw new Error(
          `Missing required flag ${key}. Run npm run flagsmith:seed.`,
        );
      result[key] = flags.isFeatureEnabled(key);
    }
    return result;
  }
  async function flags() {
    return normalizeFlags(await sdk.getEnvironmentFlags());
  }
  async function states() {
    let path = `environments/${encodeURIComponent(config.environmentId)}/featurestates/`;
    let pages = 0;
    const rows = [];
    while (path && pages++ < 20) {
      const data = await management(path);
      rows.push(...unwrap(data));
      if (data.next) {
        const next = new URL(data.next, apiUrl);
        if (next.origin !== new URL(apiUrl).origin)
          throw new Error("Unexpected cross-origin Flagsmith pagination URL.");
        path = next.href;
      } else path = null;
    }
    const evaluated = await sdk.getEnvironmentFlags();
    featureStates.clear();
    for (const row of rows) {
      if (row.feature && typeof row.feature === "object") {
        featureStates.set(row.feature.name, row.id);
      } else {
        const key = FLAG_KEYS.find(
          (name) => evaluated.getFlag(name)?.featureId === row.feature,
        );
        if (key) featureStates.set(key, row.id);
      }
    }
    return rows;
  }
  async function setFlag(key, enabled) {
    if (!FLAG_KEYS.includes(key))
      throw new Error("Only the three Switchyard lab flags can be changed.");
    if (!config.allowMutations)
      throw new Error(
        "Flag mutations are disabled. Set ALLOW_FLAG_MUTATIONS=true for a dedicated lab environment.",
      );
    if (!config.environmentId)
      throw new Error(
        "Set FLAGSMITH_ENVIRONMENT_ID to the lab environment API key.",
      );
    await states();
    const id = featureStates.get(key);
    if (!id)
      throw new Error(
        `Could not find ${key} in the configured lab environment. Seed the project first.`,
      );
    const updated = await management(
      `environments/${encodeURIComponent(config.environmentId)}/featurestates/${id}/`,
      { method: "PATCH", body: JSON.stringify({ enabled }) },
    );
    if (updated?.enabled !== enabled)
      throw new Error(
        "Flagsmith did not acknowledge the requested feature state.",
      );
    const confirmed = await flags();
    if (confirmed[key] !== enabled)
      throw new Error("SDK read-back does not match the requested flag state.");
    if (key === "checkout_v2" && !enabled) {
      const identities = await evaluate(100);
      if (Object.values(identities.assignments).some(Boolean))
        throw new Error(
          "An identity override still enables checkout_v2. Remove the override in your lab environment before declaring recovery.",
        );
    }
    return { key, enabled, confirmed: true, flags: confirmed };
  }
  async function evaluate(count = 100) {
    const environmentFlags = await sdk.getEnvironmentFlags();
    const normalized = normalizeFlags(environmentFlags);
    const baseValue = environmentFlags.getFeatureValue("checkout_v2");
    const rollout = percentage(baseValue, 25);
    const evaluations = await mapLimited(
      Array.from({ length: count }, (_, i) => i),
      8,
      async (i) => {
        const identifier = `visitor-${i}`;
        const flags = await sdk.getIdentityFlags(
          identifier,
          {
            device: i % 4 === 0 || i % 4 === 2 ? "mobile" : "desktop",
            region: i % 4 === 0 || i % 4 === 3 ? "eu" : "us",
            rollout_bucket: bucketForIdentity(identifier),
            switchyard_lab: true,
          },
          true,
        );
        const value = flags.getFeatureValue("checkout_v2");
        const exposure = percentage(value, 100);
        return [
          identifier,
          flags.isFeatureEnabled("checkout_v2") &&
            bucketForIdentity(identifier) < exposure,
        ];
      },
    );
    return {
      flags: normalized,
      rollout,
      assignments: Object.fromEntries(evaluations),
      evaluatedIdentities: count,
      synthetic: true,
      source: "flagsmith",
    };
  }
  return { flags, setFlag, evaluate, management };
}
