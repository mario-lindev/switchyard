import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createAdapter, bucketForIdentity } from "../server/adapter.mjs";
import { createApp } from "../server/app.mjs";
const flags = { checkout_v2: true, smart_cache: true, payment_retry: true };
function fakeSdk(state = { ...flags }) {
  return {
    getEnvironmentFlags: async () => ({
      isFeatureEnabled: (key) => state[key],
      getFeatureValue: () => 25,
      getFlag: (key) => ({ enabled: state[key], isDefault: false }),
    }),
    getIdentityFlags: async () => ({
      isFeatureEnabled: (key) => state[key],
      getFeatureValue: () => 25,
    }),
  };
}
const config = {
  apiUrl: "http://localhost:8000/api/v1/",
  environmentKey: "test-server-sdk",
  environmentId: "lab-env",
  managementToken: "test-admin-token",
  allowMutations: true,
};
function fakeFetch(state, seen = []) {
  return async (url, options) => {
    seen.push({ url: String(url), options });
    if (options.method === "PATCH") {
      state.checkout_v2 = JSON.parse(options.body).enabled;
      return Response.json({ id: 11, enabled: state.checkout_v2 });
    }
    return Response.json({
      results: [{ id: 11, feature: { name: "checkout_v2" } }],
      next: null,
    });
  };
}
test("management mutation requires opt-in and cannot mutate arbitrary flags", async () => {
  const a = createAdapter(
    { ...config, allowMutations: false },
    { sdk: fakeSdk() },
  );
  await assert.rejects(() => a.setFlag("checkout_v2", false), /disabled/);
  await assert.rejects(
    () => a.setFlag("secret_admin_flag", true),
    /three Switchyard/,
  );
});
test("rollback is acknowledged by management, SDK read-back, and identity checks", async () => {
  const state = { ...flags };
  const seen = [];
  const a = createAdapter(config, {
    sdk: fakeSdk(state),
    fetch: fakeFetch(state, seen),
  });
  const result = await a.setFlag("checkout_v2", false);
  assert.equal(result.confirmed, true);
  assert.equal(result.enabled, false);
  assert.ok(
    seen.some((x) => x.url.endsWith("/environments/lab-env/featurestates/11/")),
  );
  assert.equal(
    seen[0].options.headers.Authorization,
    "Api-Key test-admin-token",
  );
});
test("identity overrides cannot falsely produce a successful global rollback", async () => {
  const state = { ...flags };
  const sdk = fakeSdk(state);
  sdk.getIdentityFlags = async () => ({
    isFeatureEnabled: () => true,
    getFeatureValue: () => 100,
  });
  const a = createAdapter(config, { sdk, fetch: fakeFetch(state) });
  await assert.rejects(
    () => a.setFlag("checkout_v2", false),
    /identity override/,
  );
});
test("evaluation uses remote config and passes consistent traits to the SDK", async () => {
  const sdk = fakeSdk();
  const calls = [];
  const orig = sdk.getIdentityFlags;
  sdk.getIdentityFlags = async (...args) => {
    calls.push(args);
    return orig(...args);
  };
  const a = createAdapter(config, { sdk });
  const data = await a.evaluate();
  assert.equal(Object.keys(data.assignments).length, 100);
  assert.equal(data.rollout, 25);
  assert.ok(Object.values(data.assignments).some(Boolean));
  assert.ok(Object.values(data.assignments).some((v) => !v));
  assert.deepEqual(calls.find((x) => x[0] === "visitor-0")[1], {
    device: "mobile",
    region: "eu",
    rollout_bucket: bucketForIdentity("visitor-0"),
    switchyard_lab: true,
  });
  assert.equal(calls[0][2], true);
});
test("official Flagsmith SDK interoperates with a contract-level HTTP server", async () => {
  const requests = [];
  const api = createServer((req, res) => {
    requests.push({ url: req.url, key: req.headers["x-environment-key"] });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify(
        Object.entries(flags).map(([name, enabled], i) => ({
          id: i + 1,
          feature: { id: i + 1, name, type: "STANDARD" },
          enabled,
          feature_state_value: name === "checkout_v2" ? 25 : null,
        })),
      ),
    );
  });
  await new Promise((r) => api.listen(0, "127.0.0.1", r));
  try {
    const port = api.address().port;
    const a = createAdapter({
      ...config,
      apiUrl: `http://127.0.0.1:${port}/api/v1/`,
    });
    assert.deepEqual(await a.flags(), flags);
    assert.equal(requests[0].key, config.environmentKey);
    assert.equal(requests[0].url, "/api/v1/flags/");
  } finally {
    await new Promise((r) => api.close(r));
  }
});
test("local adapter distinguishes sandbox, validates inputs, and blocks foreign origins", async () => {
  const server = createApp({ ...config, environmentKey: undefined }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const conn = await fetch(`${base}/api/connection`).then((r) => r.json());
    assert.equal(conn.mode, "sandbox");
    assert.equal((await fetch(`${base}/api/flags`)).status, 503);
    assert.equal(
      (
        await fetch(`${base}/api/health`, {
          headers: { Origin: "https://untrusted.example" },
        })
      ).status,
      403,
    );
    const json = JSON.stringify(conn);
    assert.ok(!json.includes("test-admin-token"));
    assert.ok(!json.includes("test-server-sdk"));
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});
test("adapter redacts secrets in errors returned to the browser", async () => {
  const server = createApp(config, {
    flags: async () => {
      throw new Error(
        `Rejected ${config.managementToken} and ${config.environmentKey}`,
      );
    },
  }).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  try {
    const res = await fetch(
      `http://127.0.0.1:${server.address().port}/api/connection`,
    );
    assert.equal(res.status, 502);
    const body = await res.text();
    assert.ok(!body.includes(config.managementToken));
    assert.ok(!body.includes(config.environmentKey));
    assert.match(body, /redacted/);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});

test("numeric feature IDs from self-hosted management responses resolve through the official SDK", async () => {
  const state = { ...flags };
  const sdk = fakeSdk(state);
  const original = sdk.getEnvironmentFlags;
  sdk.getEnvironmentFlags = async () => {
    const result = await original();
    result.getFlag = (key) => ({
      enabled: state[key],
      isDefault: false,
      featureId: key === "checkout_v2" ? 71 : 72,
    });
    return result;
  };
  const requests = [];
  const adapter = createAdapter(config, {
    sdk,
    fetch: async (url, options) => {
      requests.push(String(url));
      if (options.method === "PATCH") {
        state.checkout_v2 = false;
        return Response.json({ enabled: false });
      }
      return Response.json([{ id: 91, feature: 71, enabled: true }]);
    },
  });
  const result = await adapter.setFlag("checkout_v2", false);
  assert.equal(result.confirmed, true);
  assert.ok(requests.some((url) => url.endsWith("/featurestates/91/")));
});
