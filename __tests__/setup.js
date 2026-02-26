"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
process.env.NODE_ENV = 'test';
process.env.JWT_SECRETS_AT = 'test-access-token-secret';
process.env.JWT_SECRETS_RT = 'test-refresh-token-secret';
process.env.ACCESS_TOKEN_EXPIRATION = '3600';
process.env.REFRESH_TOKEN_EXPIRATION = '86400';
globals_1.jest.setTimeout(10000);
//# sourceMappingURL=setup.js.map