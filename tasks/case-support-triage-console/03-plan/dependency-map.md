# Dependency Map

## Critical Path
- Requirement review -> planning -> prototype -> UI review -> API design -> API review -> rules and tests -> build -> verify -> audit

## Parallelization Notes
- Frontend inbox and ticket detail implementation can parallelize with backend endpoints only after TEST_REVIEW passes.
- Database work can parallelize with backend implementation after the API contract and migration plan are frozen.
