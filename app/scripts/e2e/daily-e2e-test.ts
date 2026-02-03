#!/usr/bin/env npx tsx
/**
 * Daily E2E Test Orchestrator
 *
 * Run with: npm run e2e
 * Or directly: npx tsx scripts/e2e/daily-e2e-test.ts
 *
 * Options:
 *   --headless=false    Run with visible browser
 *   --prophets=ADAM,MUSA Test specific prophets
 *   --scenarios=theme-selection,puzzle-generation  Run specific scenarios
 *   --no-github         Skip GitHub issue creation
 */

import { runAllTests, isDevServerRunning } from './test-runner';
import { createGitHubIssue, saveTestResults } from './github-reporter';
import { config } from './config';
import * as fs from 'fs/promises';

async function parseArgs(): Promise<{
  headless: boolean;
  prophets?: string[];
  scenarios?: string[];
  createGithubIssue: boolean;
}> {
  const args = process.argv.slice(2);
  const options = {
    headless: true,
    prophets: undefined as string[] | undefined,
    scenarios: undefined as string[] | undefined,
    createGithubIssue: true,
  };

  for (const arg of args) {
    if (arg === '--headless=false' || arg === '--no-headless') {
      options.headless = false;
    } else if (arg.startsWith('--prophets=')) {
      options.prophets = arg.replace('--prophets=', '').split(',');
    } else if (arg.startsWith('--scenarios=')) {
      options.scenarios = arg.replace('--scenarios=', '').split(',');
    } else if (arg === '--no-github') {
      options.createGithubIssue = false;
    }
  }

  return options;
}

async function ensureDirectories(): Promise<void> {
  await fs.mkdir(config.paths.screenshots, { recursive: true });
  await fs.mkdir(config.paths.logs, { recursive: true });
  await fs.mkdir(config.paths.results, { recursive: true });
}

async function writeLog(message: string): Promise<void> {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  const logFile = `${config.paths.logs}/e2e-${new Date().toISOString().split('T')[0]}.log`;
  await fs.appendFile(logFile, logLine).catch(() => {});
  console.log(message);
}

async function main(): Promise<void> {
  const options = await parseArgs();

  await ensureDirectories();
  await writeLog('=== Starting E2E Test Run ===');

  // Check if dev server is running
  const serverRunning = await isDevServerRunning();
  if (!serverRunning) {
    await writeLog(`ERROR: Dev server not running at ${config.baseUrl}`);
    await writeLog('Please start the dev server with: npm run dev');
    process.exit(1);
  }

  await writeLog(`Dev server is running at ${config.baseUrl}`);

  try {
    // Run tests
    const testRun = await runAllTests({
      headless: options.headless,
      prophets: options.prophets,
      scenariosToRun: options.scenarios,
    });

    // Save results
    await saveTestResults(testRun);

    // Create GitHub issue if there are failures
    if (testRun.failed > 0 && options.createGithubIssue) {
      await writeLog(`${testRun.failed} test(s) failed. Creating GitHub issue...`);
      const issueUrl = await createGitHubIssue(testRun);
      if (issueUrl) {
        await writeLog(`GitHub issue created: ${issueUrl}`);
      }
    } else if (testRun.failed > 0) {
      await writeLog(`${testRun.failed} test(s) failed. GitHub issue creation skipped.`);
    } else {
      await writeLog('All tests passed!');
    }

    await writeLog('=== E2E Test Run Complete ===');

    // Exit with appropriate code
    process.exit(testRun.failed > 0 ? 1 : 0);
  } catch (error) {
    await writeLog(`FATAL ERROR: ${error}`);
    process.exit(1);
  }
}

main();
