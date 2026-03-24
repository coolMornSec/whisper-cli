# Test Cases

## Case List

### CASE-001
- Input: scaffold workspace
- Expected Output: every required task artifact exists

### CASE-002
- Input: transition to a review state with incomplete inputs
- Expected Output: the controller blocks the transition

### CASE-003
- Input: rejected review decision
- Expected Output: the controller routes to the matching rejected state
