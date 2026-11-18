import { writeFile } from "node:fs/promises";
import { evidence, runHeadless } from "../src/engine.ts";
import type { ScenarioId } from "../src/engine.ts";
const args = process.argv.slice(2);
const value = (name: string) =>
  args
    .find((a) => a.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
const seed = Number(value("seed") ?? 4271);
if (!Number.isSafeInteger(seed) || seed < 0) {
  console.error("--seed must be a non-negative safe integer.");
  process.exit(2);
}
const scenarios = [
  "checkout-regression",
  "payment-outage",
  "cache-stampede",
  "healthy-release",
];
const scenario = value("scenario") ?? "checkout-regression";
if (!scenarios.includes(scenario)) {
  console.error(`Unknown scenario. Choose ${scenarios.join(", ")}.`);
  process.exit(2);
}
const result = runHeadless({
  seed,
  scenario: scenario as ScenarioId,
  autoRollback: !args.includes("--no-rollback"),
});
const report = evidence(result);
const out = value("out");
if (out) await writeFile(out, JSON.stringify(report, null, 2) + "\n");
console.log(`Switchyard · seed ${seed} · synthetic traffic`);
console.log(
  `${report.requests} requests · ${report.errors} errors · ${report.errorRate.toFixed(2)}% error rate`,
);
console.log(
  `Rollback: ${report.rollbackAt === null ? "not triggered" : `${report.rollbackAt}s`} · p95: ${report.p95Ms}ms`,
);
const unsafe = result.events.some(
  (e) => e.title === "Guardrail threshold crossed",
);
if (args.includes("--assert-safe") && unsafe) {
  console.error(
    "Release safety gate failed: a guardrail was breached during this rehearsal.",
  );
  process.exitCode = 1;
}
if (out) console.log(`Evidence written to ${out}`);
