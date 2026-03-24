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
