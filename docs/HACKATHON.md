# Track fit and submission preparation

Source: [Toggle Wars official hackathon page](https://www.wemakedevs.org/hackathons/flagsmith), reviewed November 18, 2026.

The **PS5 + GTA 6 bundle** belongs to Track 03, **Build on Open Source Flagsmith**. Its stated focus is self-hosted Flagsmith, integrations and plugins, developer tools, and easy reuse. All projects are judged on Flagsmith use, impact, creativity, and clarity of their demo video.

## Why this project fits

| Criterion                        | Concrete evidence to show                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Self-hosted Flagsmith            | Official-image Compose stack, actual SDK evaluation, management API writes; show it running during the demo    |
| Integrations and developer tools | Reusable adapter, deterministic simulation engine, CLI, CI workflow                                            |
| Easy reuse                       | MIT license, documented sandbox path, complete stack setup, idempotent seed command, injectable adapter        |
| Flagsmith as a core component    | Candidate assignments and kill switch alter request execution; remote rollback is acknowledged and checked     |
| Impact                           | Rehearse the failure-and-rollback workflow and uncover segment-specific regressions                            |
| Creativity                       | Reproducible counterfactual comparison plus visible failure propagation and exported evidence                  |
| Demo clarity                     | A checkout breaks for one cohort, a guardrail catches it, a real flag disables the candidate, requests recover |

## Dates and eligibility

The page lists **November 26–29, 2026**, with hacking starting at **8 AM IST on November 26** and submissions closing at **8 PM IST on November 29**. It allows solo work, teams, and AI coding tools, while requiring participants to understand and explain what they built.

This repository was prepared before the published start date. The page does not explicitly settle whether prebuilt work is eligible. Confirm the treatment of pre-event preparation with the organizers before submitting; do not imply that repository creation during the hacking window has already occurred.

## Submission package

- Public repository and MIT license.
- A connected self-hosted demo video using the sequence in DEMO.md.
- A concise problem/solution description with the Flagsmith integration explained.
- Docker instructions and a clean-machine setup check.
- A sample evidence JSON and CI artifact.
- Honest verification status and limitations: synthetic traffic, application-side rollout bucketing, sampled identity assignments, and the Docker smoke test still required in the authoring environment.

No application can guarantee a judging outcome. The strongest submission is the one whose core workflow can be shown working and reproduced by another developer.
