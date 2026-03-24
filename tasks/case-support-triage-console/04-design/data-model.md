# Data Model

## Entities
- `tickets`
  - id
  - subject
  - requester_name
  - priority
  - status
  - sla_due_at
  - assigned_agent_id
  - created_at
  - updated_at
- `ticket_notes`
  - id
  - ticket_id
  - author_id
  - body
  - visibility
  - created_at
- `agents`
  - id
  - name
  - is_active

## State Records
- Status flow: `new -> investigating -> waiting_on_customer -> resolved -> closed`
- `agent-log.md` stores stage-level execution evidence and handoff context.
- Audit-sensitive fields: `status`, `assigned_agent_id`, `sla_due_at`
