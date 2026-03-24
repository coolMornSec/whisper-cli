# Agent Document Standard

## Purpose
- `AGENT.md` is the case-level execution contract that binds all participating agents to the same authority order, stage rules, escalation rules, and audit hooks.

## Ownership
- Default owner: `shangshu`
- Review contributors: all departments may propose updates through the routed workflow, but direct edits must stay inside the currently allowed write paths.

## Required Structure
- The document must contain the fixed sections defined in `shared/templates/AGENT.template.md`.
- The document must explicitly mention all eight departments, `state.json`, `manifest.json`, and `AGENT.md`.

## Enforcement Rules
- A task workspace is invalid if `AGENT.md` is missing, missing required sections, or omits department role mapping and escalation behavior.
- Case-specific exceptions belong only in `## Case Overrides`; they must not silently change workflow order or department write scopes.

## Usage Rules
- Every agent must read `AGENT.md` before starting work on a case.
- If `AGENT.md` conflicts with `manifest.json` or `state.json`, the agent must escalate to shangshu instead of choosing locally.
