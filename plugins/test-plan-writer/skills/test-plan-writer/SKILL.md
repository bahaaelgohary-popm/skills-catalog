---
name: test-plan-writer
description: Write a focused test plan for a feature or change, covering risks, test cases by level, test data and what is out of scope. Use when a feature is about to be built or released and someone asks how to test it.
---

# Test plan writer

Write a test plan for the feature or change in `$ARGUMENTS`, the user's message, or the files they point to. If they point to code or a spec, read it first.

## 1. Find the risks first

List what could go wrong for users, ranked by impact × likelihood. Testing effort follows risk, not feature size. Typical risk sources: money or data loss, permissions, external integrations, concurrency, migrations, anything that changed recently.

## 2. Plan the tests

```markdown
# Test plan: <feature>

## Scope
In scope: ...
Out of scope (and why): ...

## Risks
| # | Risk | Impact | Likelihood | Covered by |
|---|---|---|---|---|

## Test cases
| ID | Level | Scenario | Steps / input | Expected result | Risk # |
|---|---|---|---|---|---|

## Test data
What data is needed, where it comes from, and how it is reset.

## Environments and tools

## Exit criteria
What must be true to call testing done.
```

Levels: **Unit**, **Integration**, **End-to-end**, **Manual/exploratory**. Put each case at the lowest level that can catch the problem.

## Rules

- Cover the happy path once; spend the rest on boundaries, invalid input, empty states, permissions, failures of dependencies, and retries.
- Every high-impact risk maps to at least one test case.
- Expected results are concrete ("shows 'Card declined' and keeps the cart"), never "works correctly".
- Mark cases that should be automated in CI.
- Keep it to what a tester can run; if the plan exceeds about 30 cases, group the rest as "Later" with a reason.
