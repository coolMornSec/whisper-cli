# Task Workspace Template

## Directory Contract
- Every task must live under `tasks/<task-id>/`.
- Stage outputs must be stored in the fixed `00` to `09` directories.
- `state.json` records runtime execution state and `manifest.json` records static task policy.
- `AGENT.md` defines the case-level execution contract for all participating agents.

## Core Deliverables
- `AGENT.md`
- `01-spec/spec.md`
- `04-design/prototype.md`
- `04-design/api-contract.yaml`
- `05-rules/rules.md`
- `06-tests/test-cases.md`
- `09-audit/review.md`
