# Specification

## Task Goal
- Build a support triage console that helps a support lead manage new tickets, assign an owner, inspect ticket detail, and record internal notes.

## Business Context
- The support team currently triages tickets in spreadsheets and chat, which makes SLA risk and assignment ownership difficult to track.
- The product should reduce triage confusion without trying to solve every support workflow problem at once.

## Scope
### In Scope
- Inbox list for tickets
- Filter by status, priority, and SLA risk
- Ticket detail view with conversation summary and internal notes
- Assign ticket owner
- Update ticket status through a fixed workflow
### Out Of Scope
- Authentication and permissions beyond a single internal team
- Email ingestion or outbound notifications
- Reporting dashboards and analytics exports

## Inputs And Outputs
- Inputs: seeded ticket data, support agent list, ticket status rules, SLA target
- Outputs: triage UI, ticket APIs, data model, rule set, tests, verification evidence

## Acceptance Criteria
- A support lead can open the inbox and see all tickets sorted by newest first.
- A support lead can filter tickets by status, priority, and SLA risk.
- A support lead can open a ticket, assign an owner, change status, and add an internal note.
- SLA risk is visibly highlighted when the first-response due time is near.
- The system records a timestamped internal note history for each ticket.

## Completion Checklist
- [ ] Goal, scope, and acceptance criteria are explicit.
- [ ] Ticket lifecycle semantics are captured.
- [ ] Business context and non-goals are captured.
- [ ] The next department can consume the spec without asking for missing definitions.
