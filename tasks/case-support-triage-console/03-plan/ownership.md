# Ownership

## Department Ownership
- zhongshu: business framing for support lead workflow and ticket lifecycle
- menxia: requirement, UI, API, and test gate decisions
- shangshu: state control, AGENT stewardship, and rollback coordination
- libu_task_breakdown: workstream split across inbox, detail, API, and data
- libu_prototype: triage inbox and ticket detail interactions
- gongbu: APIs, persistence model, migration plan, and build outputs
- xingbu: rules, tests, verification evidence
- yushitai: independent audit and escalation

## Handover Rules
- The receiving department must confirm upstream completion before changing the task state.
- Rework must return to the owning production department, not be corrected inside review or audit.
- Any change to ticket status semantics or SLA logic must be called out explicitly at handoff.
