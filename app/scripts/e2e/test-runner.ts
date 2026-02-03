/**
 * E2E Test Runner
 *
 * Runs test scenarios using Playwright
 */

import { chromium, Browser, Page } from 'playwright';
import { config } from './config';
import { allScenarios, TestResult, TestScenario } from './test-scenarios';

export interface TestRunResult {
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  passed: number;
  failed: number;
  results: TestResult[];
  prophetsTestedWith: string[];
}

/**
 * Get random prophets for testing
 */
function getRandomProphets(count: number): string[] {
  const shuffled = [...config.prophetsToTest].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Run a single test scenario
 */
async function runScenario(
  page: Page,
  scenario: TestScenario,
  prophetId?: string
): Promise<TestResult> {
  console.log(`  Running: ${scenario.name}${prophetId ? ` (${prophetId})` : ''}`);

  try {
    const result = await scenario.run(page, prophetId);

    if (result.passed) {
      console.log(`  ✓ ${scenario.name} passed (${result.duration}ms)`);
    } else {
      console.log(`  ✗ ${scenario.name} failed: ${result.error}`);
    }

    return result;
  } catch (error) {
    console.log(`  ✗ ${scenario.name} crashed: ${error}`);
    return {
      scenario: scenario.name,
      passed: false,
      duration: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run all test scenarios
 */
export async function runAllTests(
  options: {
    headless?: boolean;
    prophets?: string[];
    scenariosToRun?: string[];
  } = {}
): Promise<TestRunResult> {
  const {
    headless = true,
    prophets = getRandomProphets(config.prophetsPerRun),
    scenariosToRun,
  } = options;

  const startTime = new Date();
  const results: TestResult[] = [];

  console.log('\n=== E2E Test Run ===');
  console.log(`Start time: ${startTime.toISOString()}`);
  console.log(`Testing prophets: ${prophets.join(', ')}`);
  console.log(`Headless: ${headless}\n`);

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    // Filter scenarios if specified
    const scenarios = scenariosToRun
      ? allScenarios.filter((s) => scenariosToRun.includes(s.name))
      : allScenarios;

    // Run theme selection first (doesn't need prophet)
    const themeScenario = scenarios.find((s) => s.name === 'theme-selection');
    if (themeScenario) {
      const page = await context.newPage();
      const result = await runScenario(page, themeScenario);
      results.push(result);
      await page.close();
    }

    // Run prophet-dependent scenarios for each prophet
    const prophetScenarios = scenarios.filter((s) => s.name !== 'theme-selection');

    for (const prophetId of prophets) {
      console.log(`\nTesting with prophet: ${prophetId}`);

      for (const scenario of prophetScenarios) {
        const page = await context.newPage();
        const result = await runScenario(page, scenario, prophetId);
        results.push({
          ...result,
          scenario: `${result.scenario}-${prophetId}`,
        });
        await page.close();
      }
    }

    await context.close();
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  const endTime = new Date();
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n=== Test Summary ===');
  console.log(`Duration: ${endTime.getTime() - startTime.getTime()}ms`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${results.length}\n`);

  return {
    startTime,
    endTime,
    totalDuration: endTime.getTime() - startTime.getTime(),
    passed,
    failed,
    results,
    prophetsTestedWith: prophets,
  };
}

/**
 * Check if dev server is running
 */
export async function isDevServerRunning(): Promise<boolean> {
  try {
    const response = await fetch(config.baseUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}
