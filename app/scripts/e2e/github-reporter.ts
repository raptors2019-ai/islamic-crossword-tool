/**
 * GitHub Issue Reporter
 *
 * Creates GitHub issues for E2E test failures using gh CLI
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import { config } from './config';
import { TestRunResult } from './test-runner';
import { TestResult } from './test-scenarios';

const execAsync = promisify(exec);

export interface GitHubIssue {
  title: string;
  body: string;
  labels: string[];
}

/**
 * Check if gh CLI is available and authenticated
 */
export async function isGhCliAvailable(): Promise<boolean> {
  try {
    await execAsync('gh auth status');
    return true;
  } catch {
    return false;
  }
}

/**
 * Format a test result for the issue body
 */
function formatTestResult(result: TestResult): string {
  const status = result.passed ? '✅ PASSED' : '❌ FAILED';
  let text = `### ${result.scenario}\n**Status:** ${status}\n**Duration:** ${result.duration}ms\n`;

  if (result.error) {
    text += `**Error:** \`${result.error}\`\n`;
  }

  if (result.screenshot) {
    text += `**Screenshot:** \`${result.screenshot}\`\n`;
  }

  if (result.details) {
    text += '**Details:**\n```json\n' + JSON.stringify(result.details, null, 2) + '\n```\n';
  }

  return text;
}

/**
 * Generate issue body from test results
 */
function generateIssueBody(testRun: TestRunResult): string {
  const failedTests = testRun.results.filter((r) => !r.passed);

  let body = `## E2E Test Failure Report

**Run Time:** ${testRun.startTime.toISOString()}
**Duration:** ${testRun.totalDuration}ms
**Prophets Tested:** ${testRun.prophetsTestedWith.join(', ')}

### Summary
- ✅ Passed: ${testRun.passed}
- ❌ Failed: ${testRun.failed}
- Total: ${testRun.results.length}

## Failed Tests

`;

  for (const result of failedTests) {
    body += formatTestResult(result) + '\n---\n\n';
  }

  body += `## Environment

- Base URL: ${config.baseUrl}
- Node.js: ${process.version}
- Platform: ${process.platform}

## Reproduction Steps

1. Navigate to ${config.baseUrl}
2. Select "Prophet Stories" theme
3. Select a prophet from: ${testRun.prophetsTestedWith.join(', ')}
4. Observe the failure

---
*This issue was automatically created by the E2E test runner.*
`;

  return body;
}

/**
 * Create a GitHub issue for test failures
 */
export async function createGitHubIssue(testRun: TestRunResult): Promise<string | null> {
  const failedTests = testRun.results.filter((r) => !r.passed);

  if (failedTests.length === 0) {
    console.log('No failures to report.');
    return null;
  }

  // Check if gh is available
  const ghAvailable = await isGhCliAvailable();
  if (!ghAvailable) {
    console.error('gh CLI not available or not authenticated. Skipping GitHub issue creation.');
    return null;
  }

  const date = new Date().toISOString().split('T')[0];
  const failedScenarios = failedTests.map((t) => t.scenario.split('-')[0]);
  const uniqueScenarios = Array.from(new Set(failedScenarios));

  const issue: GitHubIssue = {
    title: `[E2E] Daily test failure (${date}): ${uniqueScenarios.join(', ')}`,
    body: generateIssueBody(testRun),
    labels: config.github.labels,
  };

  try {
    // Write body to temp file to handle special characters
    const bodyFile = `${config.paths.logs}/issue-body-${Date.now()}.md`;
    await fs.writeFile(bodyFile, issue.body, 'utf-8');

    // Create issue using gh CLI
    const labelsArg = issue.labels.map((l) => `--label "${l}"`).join(' ');
    const cmd = `gh issue create --repo ${config.github.repo} --title "${issue.title}" --body-file "${bodyFile}" ${labelsArg}`;

    console.log('Creating GitHub issue...');
    const { stdout } = await execAsync(cmd);
    const issueUrl = stdout.trim();

    console.log(`Issue created: ${issueUrl}`);

    // Clean up temp file
    await fs.unlink(bodyFile).catch(() => {});

    return issueUrl;
  } catch (error) {
    console.error('Failed to create GitHub issue:', error);
    return null;
  }
}

/**
 * Save test results to a JSON file
 */
export async function saveTestResults(testRun: TestRunResult): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `test-results-${timestamp}.json`;
  const filepath = `${config.paths.results}/${filename}`;

  await fs.writeFile(filepath, JSON.stringify(testRun, null, 2), 'utf-8');
  console.log(`Results saved to: ${filepath}`);

  return filepath;
}
