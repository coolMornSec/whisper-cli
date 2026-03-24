# Rules Catalog

## Enforced Rules

### RULE-001
- Source: case specification
- Trigger: list tickets in inbox
- Constraint: inbox must show subject, requester, priority, status, owner, and SLA risk in a single row model
- Severity: high
- Check: UI review and verification

### RULE-002
- Source: support workflow
- Trigger: update ticket status
- Constraint: ticket status must follow `new -> investigating -> waiting_on_customer -> resolved -> closed`
- Severity: high
- Check: API review, tests, and audit

### RULE-003
- Source: support operations
- Trigger: add internal note
- Constraint: internal notes must not be mixed with customer-visible conversation content
- Severity: medium
- Check: prototype review and tests

## Completion Checklist
- [ ] Each rule names its source, trigger, and check.
- [ ] Rules cover both happy path and rollback path constraints.
- [ ] SLA and status semantics are covered.
- [ ] The next review stage can trace every gate to a rule.
