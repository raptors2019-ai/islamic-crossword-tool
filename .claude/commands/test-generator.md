# Test Generator

Run the puzzle generator tests and verify output quality.

## Steps

1. Run the Jest test suite for generator-related files:
   ```bash
   cd /Users/josh/code/crosswords/app && npm test -- --testPathPattern="(generator|csp-filler|puzzle-helpers)" --verbose
   ```

2. If tests pass, run a quick functional verification:
   - Generate a test puzzle using the auto-generator
   - Verify it produces a valid 5x5 grid
   - Check Islamic word percentage is >= 50%

3. Report results:
   - Number of tests passed/failed
   - Any specific failures with file:line references
   - Suggestions for fixes if tests fail

4. If there were test failures that reveal a bug pattern, suggest adding it to the Learnings section of CLAUDE.md.
