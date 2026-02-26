import { hashPassword, comparePassword } from '../../../src/utils/crypto';

describe('crypto utils', () => {
  describe('hashPassword', () => {
    it('should return a hex string of 64 characters (SHA-256)', () => {
      const hash = hashPassword('testPassword');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should return consistent hash for same input', () => {
      const password = 'mySecurePassword123';
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);
      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different inputs', () => {
      const hash1 = hashPassword('password1');
      const hash2 = hashPassword('password2');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string input', () => {
      const hash = hashPassword('');
      expect(hash).toHaveLength(64);
    });

    it('should handle special characters', () => {
      const hash = hashPassword('pässwörd!@#$%^&*()');
      expect(hash).toHaveLength(64);
    });

    it('should handle unicode characters', () => {
      const hash = hashPassword('密码测试');
      expect(hash).toHaveLength(64);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', () => {
      const password = 'correctPassword123';
      const hash = hashPassword(password);
      expect(comparePassword(password, hash)).toBe(true);
    });

    it('should return false for non-matching password', () => {
      const hash = hashPassword('correctPassword');
      expect(comparePassword('wrongPassword', hash)).toBe(false);
    });

    it('should return false for similar but different passwords', () => {
      const hash = hashPassword('Password123');
      expect(comparePassword('password123', hash)).toBe(false); // case sensitive
    });

    it('should return true for empty password if hash matches', () => {
      const hash = hashPassword('');
      expect(comparePassword('', hash)).toBe(true);
    });
  });
});
