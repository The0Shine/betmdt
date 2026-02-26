// Jest global setup
// This file runs before each test file

import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRETS_AT = 'test-access-token-secret';
process.env.JWT_SECRETS_RT = 'test-refresh-token-secret';
process.env.ACCESS_TOKEN_EXPIRATION = '3600';
process.env.REFRESH_TOKEN_EXPIRATION = '86400';

// Silence console.log during tests (optional)
// Uncomment if you want cleaner test output
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
// };

// Increase timeout for async tests
jest.setTimeout(10000);
