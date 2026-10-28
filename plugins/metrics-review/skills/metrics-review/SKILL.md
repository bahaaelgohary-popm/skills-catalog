---
name: metrics-review
description: Review a single product metric for definition quality and gaming risk, then propose paired guardrail metrics. Use when someone proposes a KPI, a north-star metric, an OKR key result or a team target and wants it stress-tested.
---

# Metrics review

Review the metric in `$ARGUMENTS` (or the user's last message). If the user gives only a name ("activation rate"), ask for the exact definition only if two reasonable definitions would lead to opposite conclusions; otherwise state the definition you assume and continue.

## Step 1 — Pin down the definition

Fill in this card. Mark anything missing as `Unclear` rather than guessing.

| Field | Value |
|---|---|
| Name | |
| Formula | numerator / denominator, or exact count |
| Unit and population | per user, per account, per session; who is included and excluded |
| Time window | daily, rolling 7-day, cohort-based |
| Source | which event or table, and whether it is client- or server-side |
| Direction | higher is better / lower is better |
| Owner | team accountable for moving it |

## Step 2 — Score it

Rate each from 1 (weak) to 3 (strong) with one line of reason:

- **Clarity** — two people would compute the same number.
- **Sensitivity** — it moves within weeks when the product changes.
- **Causality** — the team can actually influence it.
- **Value link** — when it goes up, users or the business are genuinely better off.
- **Gaming resistance** — hard to improve without improving the real outcome.

## Step 3 — Show how it could be gamed

List 3–5 concrete ways a team under pressure could move the number without creating value. Be specific to this metric. Typical patterns to check:

- Changing the denominator (excluding hard cases, redefining "active").
- Shifting timing (pulling activity forward, delaying churn recognition).
- Trading quality for volume (more, smaller, worse units).
- Pushing cost somewhere unmeasured (support load, other teams, later periods).
- Nudging or dark patterns that inflate clicks but not intent.

## Step 4 — Pair it with guardrails

For each gaming risk, propose a guardrail metric that would visibly worsen if the gaming happened.

| Gaming risk | Guardrail metric | Definition | Alert threshold |
|---|---|---|---|

Rules for guardrails:
- 2–4 guardrails total; more than that gets ignored.
- At least one measures quality or satisfaction, and one measures a downstream outcome (retention, revenue, repeat use).
- Each must be computable from data that plausibly exists; flag any that need new instrumentation.

## Step 5 — Verdict

End with:
- **Verdict:** Adopt as is / Adopt with changes / Replace.
- **Top change:** the one edit to the definition that most improves it.
- **Review cadence:** how often to revisit the metric and its guardrails.

Keep the whole review under one screen where possible. Do not fabricate baselines; ask for them or mark them `TBD`.
