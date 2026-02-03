/**
 * E2E Test Configuration
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

export const config = {
  // Base URL for the app
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3000',

  // Timeouts
  timeouts: {
    navigation: 30000,
    generation: 60000,
    element: 10000,
  },

  // Prophets to test (subset for daily runs)
  prophetsToTest: ['ADAM', 'MUSA', 'YUSUF', 'IBRAHIM', 'NUH'],

  // How many random prophets to test per run
  prophetsPerRun: 3,

  // GitHub configuration
  github: {
    repo: process.env.GITHUB_REPO || 'josh/crosswords',
    labels: ['bug', 'e2e-failure', 'automated'],
  },

  // Output directories
  paths: {
    screenshots: path.join(__dirname, '../../e2e-results/screenshots'),
    logs: path.join(__dirname, '../../e2e-results/logs'),
    results: path.join(__dirname, '../../e2e-results'),
  },

  // Validation thresholds
  thresholds: {
    minIslamicPercentage: 25,
    minGridFill: 100,
    minThemeWords: 1,
  },
};

export type Config = typeof config;
