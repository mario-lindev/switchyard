export type FlagKey = "checkout_v2" | "smart_cache" | "payment_retry";
export type FlagSet = Record<FlagKey, boolean>;
export type ScenarioId =
  | "checkout-regression"
  | "payment-outage"
  | "cache-stampede"
  | "healthy-release";
export type Phase = "ready" | "running" | "paused" | "completed";
export interface RequestEvent {
  id: number;
  cohort: string;
  variant: "control" | "candidate";
  latency: number;
  failed: boolean;
  service: string;
  second: number;
}
export interface Point {
  second: number;
  requests: number;
  errors: number;
  errorRate: number;
  p95: number;
  candidateErrors: number;
  candidateRequests: number;
}
export interface LabEvent {
  id: number;
  second: number;
  kind: "info" | "danger" | "success" | "flag" | "warning";
  title: string;
  detail: string;
}
export interface Guardrails {
  autoRollback: boolean;
  errorRate: number;
  p95: number;
  cohortErrorRate: number;
  consecutive: number;
}
export interface Cohort {
  name: string;
  requests: number;
  errors: number;
  rate: number;
  candidateRequests: number;
}
export interface LabState {
  seed: number;
  rng: number;
  phase: Phase;
  scenario: ScenarioId;
  elapsed: number;
  duration: number;
  flags: FlagSet;
  rollout: number;
  chaos: boolean;
  faultAt: number | null;
  rollbackAt: number | null;
  rollbackPending: boolean;
  breachStreak: number;
  points: Point[];
  events: LabEvent[];
  requests: RequestEvent[];
  totalRequests: number;
  totalErrors: number;
  guardrails: Guardrails;
  cohortAssignments?: Record<string, boolean>;
  flagSource: "sandbox" | "flagsmith";
  startedAt: string | null;
}
export const SCENARIOS: {
  id: ScenarioId;
  name: string;
  description: string;
  service: string;
  color: string;
}[] = [
  {
    id: "checkout-regression",
    name: "Checkout regression",
    description:
      "A checkout v2 regression hits mobile customers. Aggregate metrics hide the cohort failure.",
    service: "Checkout",
    color: "orange",
  },
  {
    id: "payment-outage",
    name: "Payment timeout",
    description:
      "The payment provider gets slow. See how retry logic changes error rates and latency.",
    service: "Payments",
    color: "red",
  },
  {
    id: "cache-stampede",
    name: "Cache stampede",
    description:
      "A cold cache overwhelms the database. Smart caching absorbs the pressure.",
    service: "Database",
    color: "purple",
  },
  {
    id: "healthy-release",
    name: "Healthy release",
    description:
      "Run a clean control scenario to compare against the same seeded request stream.",
    service: "All services",
    color: "green",
  },
];
export const DEFAULT_GUARDRAILS: Guardrails = {
  autoRollback: true,
  errorRate: 3,
  p95: 500,
  cohortErrorRate: 8,
  consecutive: 3,
};
export const COHORTS = [
  "Mobile · EU",
  "Desktop · US",
  "Mobile · US",
  "Desktop · EU",
];
export function initialState(seed = 4271): LabState {
  return {
    seed,
    rng: seed >>> 0,
    phase: "ready",
    scenario: "checkout-regression",
    elapsed: 0,
    duration: 60,
    flags: { checkout_v2: true, smart_cache: true, payment_retry: true },
    rollout: 25,
    chaos: false,
    faultAt: null,
    rollbackAt: null,
    rollbackPending: false,
    breachStreak: 0,
    points: [],
    events: [
      {
        id: 0,
        second: 0,
        kind: "info",
        title: "Lab ready",
        detail: "Synthetic traffic only. Your production is out of reach.",
      },
    ],
    requests: [],
    totalRequests: 0,
    totalErrors: 0,
    guardrails: { ...DEFAULT_GUARDRAILS },
    flagSource: "sandbox",
    startedAt: null,
  };
}
function random(s: LabState) {
  s.rng = (Math.imul(1664525, s.rng) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
export function addEvent(
  s: LabState,
  kind: LabEvent["kind"],
  title: string,
  detail: string,
): LabState {
  return {
    ...s,
    events: [
      ...s.events,
      { id: s.events.length, second: s.elapsed, kind, title, detail },
    ],
  };
}
export function startRun(s: LabState): LabState {
  const next = {
    ...s,
    phase: "running" as Phase,
    startedAt: s.startedAt ?? new Date().toISOString(),
  };
  return addEvent(
    next,
    "info",
    s.elapsed ? "Rehearsal resumed" : "Rehearsal started",
    `Seed ${s.seed} · ${s.rollout}% candidate exposure · ${s.flagSource === "flagsmith" ? "Flagsmith identity evaluations" : "sandbox evaluation"}`,
  );
}
export function injectFailure(s: LabState): LabState {
  if (s.chaos || s.scenario === "healthy-release") return s;
  return addEvent(
    { ...s, chaos: true, faultAt: s.elapsed },
    "danger",
    `${SCENARIOS.find((x) => x.id === s.scenario)!.name} injected`,
    "The fault affects synthetic requests only. Watching the guardrails.",
  );
}
export function setFlag(s: LabState, key: FlagKey, enabled: boolean): LabState {
  if (s.flags[key] === enabled) return s;
  return addEvent(
    { ...s, flags: { ...s.flags, [key]: enabled } },
    "flag",
    `${key} ${enabled ? "enabled" : "disabled"}`,
    s.flagSource === "flagsmith"
      ? "Confirmed by the self-hosted Flagsmith API."
      : "Updated in this sandbox.",
  );
}
export function completeRollback(s: LabState): LabState {
  const next = setFlag(s, "checkout_v2", false);
  return addEvent(
    { ...next, rollbackAt: s.elapsed, rollbackPending: false, breachStreak: 0 },
    "success",
    "Rollback confirmed",
    "checkout_v2 is off. New requests use the control path; the injected fault remains active.",
  );
}
export function failRollback(s: LabState, message: string): LabState {
  return addEvent(
    { ...s, rollbackPending: false, phase: "paused" },
    "danger",
    "Rollback failed · rehearsal paused",
    message,
  );
}
export function quantile(values: number[], q: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
}
export function step(previous: LabState): LabState {
  if (previous.phase !== "running") return previous;
  let s: LabState = {
    ...previous,
    elapsed: previous.elapsed + 1,
    requests: [...previous.requests],
    events: [...previous.events],
    points: [...previous.points],
  };
  if (s.elapsed === 10 && s.faultAt === null) s = injectFailure(s);
  const batch: RequestEvent[] = [];
  for (let i = 0; i < 120; i++) {
    const identity = s.totalRequests + i;
    random(s); // Preserve the same RNG stream for every counterfactual.
    const cohortIndex = identity % 4;
    const cohort = COHORTS[cohortIndex];
    const exposed = random(s) * 100 < s.rollout;
    const assigned = s.cohortAssignments
      ? s.cohortAssignments[`visitor-${identity % 100}`] === true
      : exposed;
    const candidate = s.flags.checkout_v2 && assigned;
    let latency = 90 + random(s) * 60 + (candidate ? -15 : 0);
    let failureProbability = 0.002;
    let service = "Gateway";
    const failureDraw = random(s);
    const faultJitter = random(s);
    if (
      s.chaos &&
      s.scenario === "checkout-regression" &&
      candidate &&
      cohortIndex === 0
    ) {
      latency += 500 + faultJitter * 500;
      failureProbability = 0.7;
      service = "Checkout";
    }
    if (s.chaos && s.scenario === "payment-outage") {
      latency += s.flags.payment_retry
        ? 230 + faultJitter * 150
        : 500 + faultJitter * 600;
      failureProbability = s.flags.payment_retry ? 0.015 : 0.38;
      service = "Payments";
    }
    if (s.chaos && s.scenario === "cache-stampede") {
      latency += s.flags.smart_cache
        ? 35 + faultJitter * 50
        : 600 + faultJitter * 1100;
      failureProbability = s.flags.smart_cache ? 0.005 : 0.23;
      service = "Database";
    }
    batch.push({
      id: identity,
      cohort,
      variant: candidate ? "candidate" : "control",
      latency: Math.round(latency),
      failed: failureDraw < failureProbability,
      service,
      second: s.elapsed,
    });
  }
  const errors = batch.filter((r) => r.failed).length;
  const candidates = batch.filter((r) => r.variant === "candidate");
  const point: Point = {
    second: s.elapsed,
    requests: batch.length,
    errors,
    errorRate: (errors / batch.length) * 100,
    p95: quantile(
      batch.map((r) => r.latency),
      0.95,
    ),
    candidateErrors: candidates.filter((r) => r.failed).length,
    candidateRequests: candidates.length,
  };
  s.requests.push(...batch);
  s.points.push(point);
  s.totalRequests += batch.length;
  s.totalErrors += errors;
  const window = s.requests.filter((r) => r.second > s.elapsed - 3);
  const cohorts = summarizeCohorts(window);
  const unhealthyCohort = cohorts.find(
    (c) => c.requests >= 20 && c.rate > s.guardrails.cohortErrorRate,
  );
  const breach =
    point.errorRate > s.guardrails.errorRate ||
    point.p95 > s.guardrails.p95 ||
    !!unhealthyCohort;
  s.breachStreak = breach ? s.breachStreak + 1 : 0;
  if (s.breachStreak === 1)
    s = addEvent(
      s,
      "warning",
      "Guardrail threshold crossed",
      unhealthyCohort
        ? `${unhealthyCohort.name}: ${unhealthyCohort.rate.toFixed(1)}% errors in the last 3s.`
        : `Error ${point.errorRate.toFixed(1)}% · p95 ${point.p95}ms.`,
    );
  if (
    s.guardrails.autoRollback &&
    s.flags.checkout_v2 &&
    s.scenario === "checkout-regression" &&
    s.breachStreak >= s.guardrails.consecutive &&
    !s.rollbackPending
  ) {
    s = addEvent(
      { ...s, rollbackPending: true },
      "warning",
      "Automatic rollback requested",
      `Guardrail breached for ${s.guardrails.consecutive} consecutive seconds. Disabling checkout_v2.`,
    );
  }
  if (s.elapsed >= s.duration)
    s = addEvent(
      { ...s, phase: "completed" },
      "success",
      "Rehearsal complete",
      `${s.totalRequests.toLocaleString()} synthetic requests processed. Export the evidence or replay with the same seed.`,
    );
  return s;
}
export function summarizeCohorts(requests: RequestEvent[]): Cohort[] {
  return COHORTS.map((name) => {
    const rows = requests.filter((r) => r.cohort === name);
    const errors = rows.filter((r) => r.failed).length;
    return {
      name,
      requests: rows.length,
      errors,
      rate: rows.length ? (errors / rows.length) * 100 : 0,
      candidateRequests: rows.filter((r) => r.variant === "candidate").length,
    };
  });
}
export function evidence(s: LabState) {
  return {
    schemaVersion: 1,
    product: "Switchyard",
    synthetic: true,
    source: s.flagSource,
    seed: s.seed,
    scenario: s.scenario,
    startedAt: s.startedAt,
    durationSeconds: s.elapsed,
    rolloutPercent: s.rollout,
    flags: { ...s.flags },
    guardrails: { ...s.guardrails },
    remoteAssignments: s.cohortAssignments ?? null,
    faultAt: s.faultAt,
    rollbackAt: s.rollbackAt,
    requests: s.totalRequests,
    errors: s.totalErrors,
    errorRate: s.totalRequests ? (s.totalErrors / s.totalRequests) * 100 : 0,
    p95Ms: quantile(
      s.requests.map((r) => r.latency),
      0.95,
    ),
    cohorts: summarizeCohorts(s.requests),
    timeline: s.events,
    timeseries: s.points,
    note: "This report contains synthetic request outcomes, not production telemetry. Flagsmith identity assignments are real only when source is flagsmith.",
  };
}
export function runHeadless(
  options: {
    seed?: number;
    scenario?: ScenarioId;
    autoRollback?: boolean;
    flags?: Partial<FlagSet>;
    rollout?: number;
  } = {},
) {
  let s = startRun({
    ...initialState(options.seed),
    scenario: options.scenario ?? "checkout-regression",
    flags: { ...initialState().flags, ...options.flags },
    rollout: options.rollout ?? 25,
    guardrails: {
      ...DEFAULT_GUARDRAILS,
      autoRollback: options.autoRollback ?? true,
    },
  });
  while (s.phase === "running") {
    s = step(s);
    if (s.rollbackPending) s = completeRollback(s);
  }
  return s;
}
