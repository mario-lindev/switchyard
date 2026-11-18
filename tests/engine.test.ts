import test from "node:test";
import assert from "node:assert/strict";
import {
  completeRollback,
  evidence,
  failRollback,
  initialState,
  runHeadless,
  setFlag,
  startRun,
  step,
  summarizeCohorts,
} from "../src/engine.ts";
import type { LabState } from "../src/engine.ts";
const until = (s: LabState, n: number) => {
  while (s.elapsed < n) s = step(s);
  return s;
};
test("same seed and policy reproduce exactly the same request outcomes", () => {
  const a = runHeadless({ seed: 4271 });
  const b = runHeadless({ seed: 4271 });
  assert.deepEqual(a.requests, b.requests);
  assert.deepEqual(a.points, b.points);
  assert.equal(a.rollbackAt, b.rollbackAt);
  assert.notDeepEqual(a.requests, runHeadless({ seed: 999 }).requests);
});
test("guardrails contain a sustained checkout regression with fewer observed failures", () => {
  const guarded = runHeadless({ autoRollback: true });
  const unguarded = runHeadless({ autoRollback: false });
  assert.notEqual(guarded.rollbackAt, null);
  assert.equal(guarded.flags.checkout_v2, false);
  assert.equal(unguarded.flags.checkout_v2, true);
  assert.ok(guarded.totalErrors < unguarded.totalErrors / 3);
  assert.equal(
    guarded.chaos,
    true,
    "The injected fault must remain active after rollback",
  );
  assert.equal(guarded.totalRequests, 7200);
  assert.equal(unguarded.totalRequests, 7200);
});
test("no recovery is claimed while a remote rollback is pending", () => {
  let s = until(startRun(initialState()), 20);
  assert.equal(s.rollbackPending, true);
  assert.equal(s.flags.checkout_v2, true);
  assert.equal(s.rollbackAt, null);
  assert.ok(s.requests.some((r) => r.second === 20 && r.failed));
  s = completeRollback(s);
  assert.equal(s.flags.checkout_v2, false);
  assert.equal(s.rollbackAt, 20);
  s = step(s);
  assert.ok(
    s.requests
      .filter((r) => r.second === 21)
      .every((r) => r.variant === "control"),
  );
});
test("failed remote rollback pauses the run and records the failure", () => {
  const s = failRollback(
    until(startRun(initialState()), 16),
    "403: mutation rejected",
  );
  assert.equal(s.phase, "paused");
  assert.equal(s.flags.checkout_v2, true);
  assert.equal(s.rollbackAt, null);
  assert.match(s.events.at(-1)!.detail, /403/);
  assert.equal(step(s).elapsed, s.elapsed);
});
test("cohort guardrail catches a failure below deliberately permissive aggregate thresholds", () => {
  const start = initialState();
  start.guardrails = {
    ...start.guardrails,
    errorRate: 99,
    p95: 10000,
    cohortErrorRate: 8,
  };
  const s = until(startRun(start), 16);
  assert.ok(s.rollbackPending);
  assert.ok(s.events.some((e) => e.detail.includes("Mobile · EU")));
});
test("a healthy control release never injects a fault or triggers a rollback", () => {
  const s = runHeadless({ scenario: "healthy-release" });
  assert.equal(s.chaos, false);
  assert.equal(s.rollbackAt, null);
  assert.equal(s.rollbackPending, false);
  assert.ok(s.totalErrors < 40);
});
test("resilience flags materially alter payment and cache failure outcomes", () => {
  const paymentProtected = runHeadless({
    scenario: "payment-outage",
    flags: { payment_retry: true },
  });
  const paymentUnprotected = runHeadless({
    scenario: "payment-outage",
    flags: { payment_retry: false },
  });
  assert.ok(paymentProtected.totalErrors < paymentUnprotected.totalErrors / 5);
  const cacheProtected = runHeadless({
    scenario: "cache-stampede",
    flags: { smart_cache: true },
  });
  const cacheUnprotected = runHeadless({
    scenario: "cache-stampede",
    flags: { smart_cache: false },
  });
  assert.ok(cacheProtected.totalErrors < cacheUnprotected.totalErrors / 5);
  assert.equal(
    cacheUnprotected.rollbackAt,
    null,
    "Checkout rollback cannot repair a database fault",
  );
});
test("disabled candidate flag prevents the injected candidate regression", () => {
  const s = runHeadless({ flags: { checkout_v2: false } });
  assert.ok(s.requests.every((r) => r.variant === "control"));
  assert.ok(s.totalErrors < 40);
  assert.equal(s.rollbackAt, null);
});
test("connected assignments are respected and cohort traits agree with identity indices", () => {
  let s = startRun({
    ...initialState(),
    flagSource: "flagsmith" as const,
    cohortAssignments: { "visitor-0": true },
  });
  s = step(s);
  assert.equal(s.requests.filter((r) => r.variant === "candidate").length, 2);
  assert.ok(
    s.requests
      .filter((r) => r.variant === "candidate")
      .every((r) => r.cohort === "Mobile · EU"),
  );
});
test("exported evidence reconciles totals, cohort counts, and timeline", () => {
  const s = runHeadless();
  const report = evidence(s);
  assert.equal(report.synthetic, true);
  assert.equal(
    report.requests,
    report.timeseries.reduce((a, p) => a + p.requests, 0),
  );
  assert.equal(
    report.errors,
    report.cohorts.reduce((a, c) => a + c.errors, 0),
  );
  assert.equal(
    report.requests,
    report.cohorts.reduce((a, c) => a + c.requests, 0),
  );
  assert.equal(report.rollbackAt, s.rollbackAt);
  assert.ok(report.timeline.some((e) => e.title === "Rollback confirmed"));
  assert.equal(summarizeCohorts([]).length, 4);
});
test("lower candidate exposure lowers unguarded regression impact with identical RNG draw count", () => {
  const small = runHeadless({ autoRollback: false, rollout: 5 });
  const large = runHeadless({ autoRollback: false, rollout: 100 });
  assert.ok(small.totalErrors < large.totalErrors / 3);
  assert.equal(small.rng, large.rng);
});
test("flag changes are immutable and no-op writes do not fabricate events", () => {
  const s = initialState();
  const n = setFlag(s, "checkout_v2", false);
  assert.equal(s.flags.checkout_v2, true);
  assert.equal(n.flags.checkout_v2, false);
  assert.equal(setFlag(n, "checkout_v2", false), n);
});
