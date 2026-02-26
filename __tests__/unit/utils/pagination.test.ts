import { Request } from 'express';
import { createPageOptions, createSearchText } from '../../../src/utils/pagination';

// Mock Request object helper
const mockRequest = (query: Record<string, any> = {}): Request => {
  return {
    query,
  } as Request;
};

describe('pagination utils', () => {
  describe('createPageOptions', () => {
    it('should return default values when no query params', () => {
      const req = mockRequest({});
      const result = createPageOptions(req);
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(0); // 0 = no limit
      expect(result.search).toBe('');
    });

    it('should parse page number correctly', () => {
      const req = mockRequest({ page: '3' });
      const result = createPageOptions(req);
      expect(result.page).toBe(3);
    });

    it('should default to page 1 for invalid page', () => {
      const req = mockRequest({ page: 'invalid' });
      const result = createPageOptions(req);
      expect(result.page).toBe(1);
    });

    it('should parse limit correctly', () => {
      const req = mockRequest({ limit: '20' });
      const result = createPageOptions(req);
      expect(result.limit).toBe(20);
    });

    it('should default to 10 for invalid limit when provided', () => {
      const req = mockRequest({ limit: 'invalid' });
      const result = createPageOptions(req);
      expect(result.limit).toBe(10);
    });

    it('should handle search parameter', () => {
      const req = mockRequest({ search: 'test query' });
      const result = createPageOptions(req);
      expect(result.search).toBe('test query');
    });

    it('should handle all parameters together', () => {
      const req = mockRequest({ page: '2', limit: '15', search: 'product' });
      const result = createPageOptions(req);
      
      expect(result.page).toBe(2);
      expect(result.limit).toBe(15);
      expect(result.search).toBe('product');
    });
  });

  describe('createSearchText', () => {
    it('should return undefined for empty search', () => {
      const result = createSearchText('');
      expect(result).toBeUndefined();
    });

    it('should return $text search object for valid search', () => {
      const result = createSearchText('test');
      expect(result).toEqual({ $text: { $search: 'test' } });
    });

    it('should escape special regex characters', () => {
      const result = createSearchText('test.query*');
      expect(result).toEqual({ $text: { $search: 'test\\.query\\*' } });
    });

    it('should handle parentheses in search', () => {
      const result = createSearchText('(test)');
      expect(result).toEqual({ $text: { $search: '\\(test\\)' } });
    });
  });
});
