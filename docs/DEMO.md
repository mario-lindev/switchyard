# Three-minute demo

## The opening

“An overall error rate can hide a broken release for one customer segment. Switchyard is a release rehearsal lab for self-hosted Flagsmith. We can break the release here, find who is affected, and prove the kill switch works.”

## 0:00–0:35 · Establish the integration

Show the self-hosted Flagsmith dashboard at localhost:8000 with the three lab flags. Show Switchyard Connections reporting Self-hosted. Explain that traffic and services are synthetic, while flag evaluations and management writes use the real instance and official SDK. Keep the Flagsmith dashboard visible beside the app.

## 0:35–1:20 · Let the failure reveal itself

Start the default checkout rehearsal at 1× speed. Select Checkout to inspect the service. At simulated second 10 the candidate release begins failing for Mobile · EU. Point to the cohort health table, then the aggregate metric. The guardrail requests rollback after three sustained breaches. Watch checkout_v2 disable in the actual Flagsmith dashboard.

“The fault is still injected. What changed is the flag. New traffic is taking the stable path.”

## 1:20–2:00 · Show the counterfactual

Open Replays and Compare guardrails. Explain that both runs use the same seed and random draws; only the automatic rollback differs. Show the observed failure counts, not a claimed monetary saving. Export the comparison JSON. Explain that this counterfactual is a sandbox rerun of default configuration, not replay of live segment overrides.

## 2:00–2:40 · Prove reuse

Show the isolated engine module and run:

```sh
npm test
npm run rehearse -- --seed=4271 --out=report.json
npm run rehearse -- --no-rollback --assert-safe
```

Show the nonzero exit from the unsafe safety gate and the GitHub Actions artifact. Show compose.yaml: Flagsmith, Postgres, migrations, task processor, Switchyard.

## 2:40–3:00 · Close

“This is a reusable open-source developer tool: one stack for self-hosting, a separate adapter, a pure deterministic engine, a visual lab, and a headless CI runner. Flagsmith is the switch that changes the behavior, not a logo attached to the demo.”

## Before recording a connected demo

- Run Docker Compose and complete a real self-hosted setup.
- Verify the dedicated lab environment, numeric checkout rollout value, and all three enabled flags.
- Confirm ALLOW_FLAG_MUTATIONS=true only for the lab environment.
- Run one rehearsal and inspect both the management change and the exported timeline.
- Reset and reenable checkout_v2 before recording another rehearsal.
- Avoid showing API keys or management tokens on video.
- Use the sandbox honestly if the instance cannot be connected; do not present sandbox flags as self-hosted proof.
