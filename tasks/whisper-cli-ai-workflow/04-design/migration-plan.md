# Migration Plan

## Migration Steps
- Replace the old document-only scaffold with a complete tasks/<task-id>/ workspace.
- Validate the repository against a default sample task.
- Add a transition controller so state cannot be advanced by ad hoc edits.

## Rollback Notes
- If a migration breaks policy validation, revert the workspace to the last validated task state before continuing.
