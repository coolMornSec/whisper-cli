# Migration Plan

## Migration Steps
- Create `tickets`, `ticket_notes`, and `agents` tables.
- Seed a small ticket dataset for local testing.
- Add backend endpoints for list, detail, assign, status update, and note append.
- Add frontend inbox and ticket detail surfaces against the API contract.

## Rollback Notes
- If schema or status semantics break the contract, revert to the last approved API design and rebuild from there.
