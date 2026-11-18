# Contributing

Use Node.js 24+. Run `npm ci`, `npm run dev`, `npm test`, and `npm run build`.

Keep the engine deterministic. Changing a scenario must not change how many random draws are consumed per request, or guarded-versus-unguarded comparisons stop being comparable. Add behavioral tests for new failure modes and flag effects.

Keep traffic and telemetry explicitly synthetic. Never expose server-side keys in browser code, exported reports, logs, or screenshots. Do not claim a live Flagsmith connection without a successful SDK evaluation. Guardrail recovery must follow confirmed flag mutation rather than an animation timer.

Use a dedicated local Flagsmith project when testing writes. Follow the MIT license and preserve dependency notices.
