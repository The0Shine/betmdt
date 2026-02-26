import {
  signAccessToken,
  signRefreshToken,
  decodeAccessToken,
  decodeRefreshToken,
} from '../../../src/utils/jwt';

describe('JWT utils', () => {
  const mockPayload = {
    _id: 'user123',
    role: 'admin',
  };

  describe('signAccessToken', () => {
    it('should return a valid JWT string', async () => {
      const token = await signAccessToken(mockPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should create different tokens for different payloads', async () => {
      const token1 = await signAccessToken({ _id: 'user1', role: 'admin' });
      const token2 = await signAccessToken({ _id: 'user2', role: 'user' });
      expect(token1).not.toBe(token2);
    });
  });

  describe('signRefreshToken', () => {
    it('should return a valid JWT string', async () => {
      const token = await signRefreshToken(mockPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should accept custom expiration', async () => {
      const customExp = Math.floor(Date.now() / 1000) + 3600;
      const token = await signRefreshToken(mockPayload, customExp);
      expect(typeof token).toBe('string');
    });
  });

  describe('decodeAccessToken', () => {
    it('should decode a valid access token', async () => {
      const token = await signAccessToken(mockPayload);
      const decoded = await decodeAccessToken(token);
      
      expect(decoded._id).toBe(mockPayload._id);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it('should reject an invalid token', async () => {
      await expect(decodeAccessToken('invalid.token.here')).rejects.toThrow();
    });

    it('should reject a token signed with wrong secret', async () => {
      // Create a refresh token (different secret) and try to decode as access token
      const refreshToken = await signRefreshToken(mockPayload);
      await expect(decodeAccessToken(refreshToken)).rejects.toThrow();
    });
  });

  describe('decodeRefreshToken', () => {
    it('should decode a valid refresh token', async () => {
      const token = await signRefreshToken(mockPayload);
      const decoded = await decodeRefreshToken(token);
      
      expect(decoded._id).toBe(mockPayload._id);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it('should reject an invalid token', async () => {
      await expect(decodeRefreshToken('invalid.token.here')).rejects.toThrow();
    });

    it('should reject an expired token', async () => {
      // Create token that expired 1 hour ago
      const expiredExp = Math.floor(Date.now() / 1000) - 3600;
      const token = await signRefreshToken(mockPayload, expiredExp);
      await expect(decodeRefreshToken(token)).rejects.toThrow();
    });
  });
});
