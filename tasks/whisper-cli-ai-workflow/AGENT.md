# Agent Execution Contract

## Mission
- Deliver the case goal for `whisper-cli-ai-workflow` without breaking the fixed MAS workflow contract.
- Current case goal: Implement a reusable MAS V1 workflow workspace for reliable AI delivery

## Authority Order
- user request
- approved specification
- passed review decisions
- manifest.json
- state.json
- AGENT.md
- local execution notes

## Department Role Map
- `zhongshu`: clarify intent, scope, acceptance criteria, and non-goals.
- `menxia`: review only and issue pass or reject decisions.
- `shangshu`: coordinate state progression, rollback, and contract stewardship.
- `libu_task_breakdown`: define workstreams, dependencies, and ownership.
- `libu_prototype`: define prototype structure and interaction states.
- `gongbu`: produce API, data, and build outputs.
- `xingbu`: produce rules, tests, and verification evidence.
- `yushitai`: audit independently and notify shangshu when the workflow drifts.

## Read Inputs
- Read `manifest.json`, `state.json`, `AGENT.md`, and the approved upstream deliverables before writing.

## Allowed Outputs
- Write only inside `state.json.allowed_write_paths`.
- Do not change another department's deliverables without a routed re-entry.

## Stage Execution Rules
- Do not cross a gate while the upstream review decision is pending.
- Treat `approved_artifacts` as derived truth, not a field to force manually.
- Keep evidence in the expected deliverables and `agent-log.md`.

## Escalation Rules
- Escalate to shangshu when instructions conflict, ownership is unclear, or the required write path is missing.
- Stop instead of guessing when a required review or audit is unresolved.

## Audit Hooks
- Leave clear, reviewable evidence for `yushitai` in the expected deliverables.
- Never edit `09-audit/` unless the active state explicitly grants it.

## Case Overrides
- No case overrides.

## Completion Protocol
- Before handoff, record inputs used, outputs changed, unresolved risks, and the next gate recommendation.
