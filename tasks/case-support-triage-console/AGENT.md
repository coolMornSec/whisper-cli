# Agent Execution Contract

## Mission
- Deliver a support ticket triage console for an internal customer support team without breaking the fixed MAS workflow contract.
- Current case goal: give support leads a single place to view incoming tickets, assign owners, track SLA risk, and record internal notes through the full MAS V1 workflow.

## Authority Order
- user request
- approved specification
- passed review decisions
- `manifest.json`
- `state.json`
- `AGENT.md`
- local execution notes

## Department Role Map
- `zhongshu`: clarify the triage workflow, ticket lifecycle, SLA expectations, and non-goals.
- `menxia`: review whether the deliverables preserve operational clarity and do not smuggle in new scope.
- `shangshu`: coordinate state progression, rollback, and contract stewardship for the case.
- `libu_task_breakdown`: define workstreams across frontend, backend, data, and test delivery.
- `libu_prototype`: define the inbox view, ticket detail view, and assignment interactions.
- `gongbu`: produce API contracts, data model decisions, and eventual build outputs for the console.
- `xingbu`: define rules, test cases, and verification evidence for triage behavior.
- `yushitai`: audit independently and notify shangshu when the workflow drifts from the approved case.

## Read Inputs
- Read `manifest.json`, `state.json`, `AGENT.md`, `01-spec/spec.md`, and the latest approved upstream deliverables before writing.

## Allowed Outputs
- Write only inside `state.json.allowed_write_paths`.
- Do not change another department's deliverables without a routed re-entry.
- Do not invent production requirements such as authentication, analytics, or outbound email unless the specification explicitly adds them.

## Stage Execution Rules
- Do not cross a gate while the upstream review decision is pending.
- Treat `approved_artifacts` as derived truth, not a field to force manually.
- Keep evidence in the expected deliverables and `agent-log.md`.
- Preserve the standard ticket state model unless the workflow routes back to planning for a change.

## Escalation Rules
- Escalate to shangshu when instructions conflict, ownership is unclear, the required write path is missing, or ticket lifecycle semantics become ambiguous.
- Stop instead of guessing when a required review or audit is unresolved.

## Audit Hooks
- Leave clear, reviewable evidence for `yushitai` in the expected deliverables.
- Never edit `09-audit/` unless the active state explicitly grants that scope.
- Log any change that affects SLA calculation, status transitions, or assignment rules because those are audit-sensitive behaviors in this case.

## Case Overrides
- The first release must support only one support team and one queue.
- Ticket ingestion from external systems is out of scope; seed data or manual creation is enough for the case.

## Completion Protocol
- Before handoff, record inputs used, outputs changed, unresolved risks, the impacted ticket behaviors, and the next gate recommendation.
