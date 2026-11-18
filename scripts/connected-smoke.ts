import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import {
  initialState,
  startRun,
  step,
  completeRollback,
  evidence,
} from "../src/engine.ts";
const base = process.env.SWITCHYARD_URL ?? "http://127.0.0.1:3001";
async function request(path: string, body?: unknown, method = "GET") {
  const res = await fetch(`${base}/api/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  const result = await res.json();
  assert.ok(
    res.ok,
    `Adapter ${path} returned ${res.status}: ${result.error ?? "Unknown error"}`,
  );
  return result;
}
const connection = await request("connection");
assert.equal(connection.mode, "flagsmith");
const evaluations = await request("evaluate", { count: 100 }, "POST");
assert.equal(evaluations.evaluatedIdentities, 100);
assert.ok(Object.values(evaluations.assignments).some(Boolean));
assert.ok(Object.values(evaluations.assignments).some((v) => v === false));
let state = startRun({
  ...initialState(),
  flagSource: "flagsmith",
  flags: evaluations.flags,
  cohortAssignments: evaluations.assignments,
  rollout: evaluations.rollout,
});
while (state.phase === "running") {
  state = step(state);
  if (state.rollbackPending) {
    const change = await request(
      "flags/checkout_v2",
      { enabled: false },
      "PATCH",
    );
    assert.equal(change.confirmed, true);
    assert.equal(change.enabled, false);
    state = completeRollback(state);
  }
}
assert.notEqual(state.rollbackAt, null);
assert.equal(state.flags.checkout_v2, false);
assert.equal(state.totalRequests, 7200);
const flags = await request("flags");
assert.equal(flags.flags.checkout_v2, false);
await writeFile(
  "connected-evidence.json",
  JSON.stringify(evidence(state), null, 2),
);
console.log(
  `Connected self-hosted rehearsal passed: ${state.totalRequests} synthetic requests, real Flagsmith rollback at ${state.rollbackAt}s, ${state.totalErrors} observed errors.`,
);
