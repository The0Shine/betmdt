"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pagination_1 = require("../../../src/utils/pagination");
const mockRequest = (query = {}) => {
    return {
        query,
    };
};
describe('pagination utils', () => {
    describe('createPageOptions', () => {
        it('should return default values when no query params', () => {
            const req = mockRequest({});
            const result = (0, pagination_1.createPageOptions)(req);
            expect(result.page).toBe(1);
            expect(result.limit).toBe(0);
            expect(result.search).toBe('');
        });
        it('should parse page number correctly', () => {
            const req = mockRequest({ page: '3' });
            const result = (0, pagination_1.createPageOptions)(req);
            expect(result.page).toBe(3);
        });
        it('should default to page 1 for invalid page', () => {
            const req = mockRequest({ page: 'invalid' });
            const result = (0, pagination_1.createPageOptions)(req);
            expect(result.page).toBe(1);
        });
        it('should parse limit correctly', () => {
            const req = mockRequest({ limit: '20' });
            const result = (0, pagination_1.createPageOptions)(req);
            expect(result.limit).toBe(20);
        });
        it('should default to 10 for invalid limit when provided', () => {
            const req = mockRequest({ limit: 'invalid' });
            const result = (0, pagination_1.createPageOptions)(req);
            expect(result.limit).toBe(10);
        });
        it('should handle search parameter', () => {
            const req = mockRequest({ search: 'test query' });
            const result = (0, pagination_1.createPageOptions)(req);
            expect(result.search).toBe('test query');
        });
        it('should handle all parameters together', () => {
            const req = mockRequest({ page: '2', limit: '15', search: 'product' });
            const result = (0, pagination_1.createPageOptions)(req);
            expect(result.page).toBe(2);
            expect(result.limit).toBe(15);
            expect(result.search).toBe('product');
        });
    });
    describe('createSearchText', () => {
        it('should return undefined for empty search', () => {
            const result = (0, pagination_1.createSearchText)('');
            expect(result).toBeUndefined();
        });
        it('should return $text search object for valid search', () => {
            const result = (0, pagination_1.createSearchText)('test');
            expect(result).toEqual({ $text: { $search: 'test' } });
        });
        it('should escape special regex characters', () => {
            const result = (0, pagination_1.createSearchText)('test.query*');
            expect(result).toEqual({ $text: { $search: 'test\\.query\\*' } });
        });
        it('should handle parentheses in search', () => {
            const result = (0, pagination_1.createSearchText)('(test)');
            expect(result).toEqual({ $text: { $search: '\\(test\\)' } });
        });
    });
});
//# sourceMappingURL=pagination.test.js.map