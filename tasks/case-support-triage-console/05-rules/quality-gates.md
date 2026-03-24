# Quality Gates

## Gate Matrix
- REQUIREMENT_REVIEW -> TASK_PLANNED
- UI_REVIEW -> API_DESIGNED
- API_REVIEW -> RULES_FROZEN
- TEST_REVIEW -> BUILD_IN_PROGRESS
- AUDIT_REVIEW -> DONE
- Additional case gate: no build work may start until the status model, assignment flow, and internal note behavior are all represented in tests.
