# Test Cases

## Case List

### CASE-001
- Input: inbox page with seeded tickets
- Expected Output: tickets render with subject, requester, priority, status, owner, and SLA badge

### CASE-002
- Input: apply status filter and SLA risk filter together
- Expected Output: the list updates without page reload and only matching tickets remain visible

### CASE-003
- Input: assign a ticket owner in ticket detail
- Expected Output: owner is persisted and visible in inbox and detail

### CASE-004
- Input: move a ticket from `new` to `investigating` to `resolved`
- Expected Output: only legal transitions succeed and the audit trail remains intact

### CASE-005
- Input: add an internal note
- Expected Output: the note is timestamped, attributed, and shown only in the internal note timeline

## Coverage Map
- Covers inbox rendering, filtering, assignment, legal status transitions, note persistence, and workflow governance.
