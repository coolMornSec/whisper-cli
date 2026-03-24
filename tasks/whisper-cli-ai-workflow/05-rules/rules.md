# Rules Catalog

## Enforced Rules

### RULE-001
- Source: architecture design
- Trigger: scaffold workspace
- Constraint: generate the complete MAS task structure
- Severity: high
- Check: workflow validation

### RULE-002
- Source: workflow policy
- Trigger: transition state
- Constraint: the target state must pass its entry gate before activation
- Severity: high
- Check: transition controller

## Completion Checklist
- [ ] Each rule names its source, trigger, and check.
- [ ] Rules cover both happy path and rollback path constraints.
- [ ] The next review stage can trace every gate to a rule.
