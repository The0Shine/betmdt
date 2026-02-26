"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_1 = require("../../../src/utils/jwt");
describe('JWT utils', () => {
    const mockPayload = {
        _id: 'user123',
        role: 'admin',
    };
    describe('signAccessToken', () => {
        it('should return a valid JWT string', () => __awaiter(void 0, void 0, void 0, function* () {
            const token = yield (0, jwt_1.signAccessToken)(mockPayload);
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        }));
        it('should create different tokens for different payloads', () => __awaiter(void 0, void 0, void 0, function* () {
            const token1 = yield (0, jwt_1.signAccessToken)({ _id: 'user1', role: 'admin' });
            const token2 = yield (0, jwt_1.signAccessToken)({ _id: 'user2', role: 'user' });
            expect(token1).not.toBe(token2);
        }));
    });
    describe('signRefreshToken', () => {
        it('should return a valid JWT string', () => __awaiter(void 0, void 0, void 0, function* () {
            const token = yield (0, jwt_1.signRefreshToken)(mockPayload);
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        }));
        it('should accept custom expiration', () => __awaiter(void 0, void 0, void 0, function* () {
            const customExp = Math.floor(Date.now() / 1000) + 3600;
            const token = yield (0, jwt_1.signRefreshToken)(mockPayload, customExp);
            expect(typeof token).toBe('string');
        }));
    });
    describe('decodeAccessToken', () => {
        it('should decode a valid access token', () => __awaiter(void 0, void 0, void 0, function* () {
            const token = yield (0, jwt_1.signAccessToken)(mockPayload);
            const decoded = yield (0, jwt_1.decodeAccessToken)(token);
            expect(decoded._id).toBe(mockPayload._id);
            expect(decoded.role).toBe(mockPayload.role);
        }));
        it('should reject an invalid token', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect((0, jwt_1.decodeAccessToken)('invalid.token.here')).rejects.toThrow();
        }));
        it('should reject a token signed with wrong secret', () => __awaiter(void 0, void 0, void 0, function* () {
            const refreshToken = yield (0, jwt_1.signRefreshToken)(mockPayload);
            yield expect((0, jwt_1.decodeAccessToken)(refreshToken)).rejects.toThrow();
        }));
    });
    describe('decodeRefreshToken', () => {
        it('should decode a valid refresh token', () => __awaiter(void 0, void 0, void 0, function* () {
            const token = yield (0, jwt_1.signRefreshToken)(mockPayload);
            const decoded = yield (0, jwt_1.decodeRefreshToken)(token);
            expect(decoded._id).toBe(mockPayload._id);
            expect(decoded.role).toBe(mockPayload.role);
        }));
        it('should reject an invalid token', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect((0, jwt_1.decodeRefreshToken)('invalid.token.here')).rejects.toThrow();
        }));
        it('should reject an expired token', () => __awaiter(void 0, void 0, void 0, function* () {
            const expiredExp = Math.floor(Date.now() / 1000) - 3600;
            const token = yield (0, jwt_1.signRefreshToken)(mockPayload, expiredExp);
            yield expect((0, jwt_1.decodeRefreshToken)(token)).rejects.toThrow();
        }));
    });
});
//# sourceMappingURL=jwt.test.js.map