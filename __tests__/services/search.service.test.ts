import { SearchService } from '../../src/services/search.service';
import esClient, { PRODUCT_INDEX } from '../../src/config/elasticsearch';
import Product from '../../src/models/product.model';
import { logger } from '../../src/utils/logger';

// Mock dependencies
jest.mock('../../src/config/elasticsearch', () => ({
  __esModule: true,
  default: {
    index: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
    indices: {
      exists: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    bulk: jest.fn(),
    ping: jest.fn(),
  },
  PRODUCT_INDEX: 'products',
  isElasticsearchAvailable: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/models/product.model');
jest.mock('../../src/utils/logger');

describe('SearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('indexProduct', () => {
    it('should index a product successfully', async () => {
      const mockProduct = {
        _id: 'product123',
        name: 'Test Product',
        description: 'Description',
        price: 100,
        category: { _id: 'cat123', name: 'Category' },
        tags: ['tag1'],
        status: 'in-stock',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await SearchService.indexProduct(mockProduct);

      expect(esClient.index).toHaveBeenCalledWith({
        index: PRODUCT_INDEX,
        id: 'product123',
        document: expect.objectContaining({
          name: 'Test Product',
          price: 100,
        }),
        refresh: true,
      });
    });

    it('should handle errors during indexing', async () => {
      const mockProduct = { _id: 'product123' };
      (esClient.index as jest.Mock).mockRejectedValue(new Error('Index error'));

      await SearchService.indexProduct(mockProduct);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error indexing product'));
    });
  });

  describe('searchProducts', () => {
    it('should search products with query', async () => {
      const mockHits = [
        { _id: '1', _source: { name: 'Product 1' }, _score: 1.5 },
      ];
      (esClient.search as jest.Mock).mockResolvedValue({
        hits: {
          hits: mockHits,
          total: { value: 1 },
        },
        aggregations: {},
      });

      const result = await SearchService.searchProducts('query');

      expect(esClient.search).toHaveBeenCalledWith(expect.objectContaining({
        index: PRODUCT_INDEX,
        query: expect.any(Object),
      }));
      expect(result.products).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should fallback to MongoDB if ES fails', async () => {
      (esClient.search as jest.Mock).mockRejectedValue(new Error('Search failed'));
      // Mock MongoDB find
      (Product.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ name: 'Mongo Product' }]),
      });
      (Product.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await SearchService.searchProducts('query');

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Elasticsearch search error'));
      expect(Product.find).toHaveBeenCalled();
      expect(result.products).toHaveLength(1);
    });
  });

  describe('autocomplete', () => {
    it('should return suggestions', async () => {
      const mockHits = [
        { _id: '1', _source: { name: 'Suggestion 1' } },
      ];
      (esClient.search as jest.Mock).mockResolvedValue({
        hits: {
          hits: mockHits,
        },
      });

      const result = await SearchService.autocomplete('sugg');
      
      expect(esClient.search).toHaveBeenCalledWith(expect.objectContaining({
        index: PRODUCT_INDEX,
        query: expect.any(Object),
        size: 5
      }));

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Suggestion 1');
    });

    it('should return empty array on error', async () => {
      (esClient.search as jest.Mock).mockRejectedValue(new Error('Autocomplete error'));

      const result = await SearchService.autocomplete('sugg');

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
