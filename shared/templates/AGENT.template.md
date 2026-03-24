# Agent Execution Contract

## Mission
- Describe the business objective of this task in one concise paragraph.

## Authority Order
- Follow this precedence strictly: user request -> approved spec -> passed review -> manifest.json -> state.json -> AGENT.md -> local execution notes.

## Department Role Map
- `zhongshu`: clarify intent, scope, non-goals, and acceptance criteria.
- `menxia`: review only, decide pass or reject, never silently rewrite deliverables.
- `shangshu`: coordinate progression, freeze outputs, and own rollback orchestration.
- `libu_task_breakdown`: define workstreams, dependencies, and ownership.
- `libu_prototype`: define prototype structure and interaction states.
- `gongbu`: produce API, data, and build outputs.
- `xingbu`: define rules, tests, and verification evidence.
- `yushitai`: audit independently, notify shangshu, and recommend rollback when needed.

## Read Inputs
- Always read `manifest.json`, `state.json`, `AGENT.md`, and the upstream approved deliverables for the current state before writing.

## Allowed Outputs
- Write only inside the paths granted by `state.json.allowed_write_paths`.
- Do not modify deliverables owned by another department unless the workflow has routed the task back to that department.

## Stage Execution Rules
- Do not start work for the next stage until the current entry gate has passed.
- Treat review documents with `Decision: pending` as blocked, not approved.
- Treat `approved_artifacts` as derived truth, never as a field to force manually.

## Escalation Rules
- Escalate to shangshu when inputs conflict, a gate fails, required ownership is unclear, or execution would exceed the allowed write paths.
- Stop and wait when a required review or audit decision is still pending.

## Audit Hooks
- Leave clear evidence for yushitai in the expected deliverables and `agent-log.md`.
- Never edit `09-audit/` unless the active state explicitly grants that scope.

## Case Overrides
- List only case-specific constraints here. If none exist, state "No case overrides."

## Completion Protocol
- Before handoff, confirm inputs used, outputs changed, unresolved risks, and whether the next gate should pass or remain blocked.
