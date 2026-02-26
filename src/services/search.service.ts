import esClient, {
  PRODUCT_INDEX,
  isElasticsearchAvailable,
} from "../config/elasticsearch";
import Product from "../models/product.model";
import { logger } from "../utils/logger";

interface SearchFilters {
  categories?: string[];
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  rating?: number;
}

interface SearchOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

interface SearchResult {
  products: any[];
  total: number;
  aggregations?: any;
  page: number;
  limit: number;
  totalPages: number;
}

export class SearchService {
  /**
   * Index a single product into Elasticsearch
   */
  static async indexProduct(product: any): Promise<void> {
    if (!(await isElasticsearchAvailable())) return;

    try {
      const doc = {
        name: product.name,
        description: product.description,
        price: product.price,
        oldPrice: product.oldPrice,
        category: product.category?._id?.toString() || product.category,
        categoryName: product.category?.name || "",
        subcategory: product.subcategory,
        tags: product.tags || [],
        status: product.status,
        rating: product.rating || 0,
        reviews: product.reviews || 0,
        quantity: product.quantity,
        published: product.published,
        image: product.image,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };

      await esClient.index({
        index: PRODUCT_INDEX,
        id: product._id.toString(),
        document: doc,
        refresh: true,
      });
    } catch (error: any) {
      logger.error(`Error indexing product ${product._id}: ${error.message}`);
    }
  }

  /**
   * Remove a product from Elasticsearch
   */
  static async removeProduct(productId: string): Promise<void> {
    if (!(await isElasticsearchAvailable())) return;

    try {
      await esClient.delete({
        index: PRODUCT_INDEX,
        id: productId,
        refresh: true,
      });
    } catch (error: any) {
      // Ignore 404 (product not in index)
      if (error.meta?.statusCode !== 404 && error.statusCode !== 404) {
        logger.error(
          `Error removing product ${productId}: ${error.message}`
        );
      }
    }
  }

  /**
   * Full-text search with filters, pagination, sorting, and facets
   */
  static async searchProducts(
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    const { page = 1, limit = 12, sort = "_score", order = "desc" } = options;
    const from = (page - 1) * limit;

    // Build must queries
    const must: any[] = [];

    if (query && query.trim()) {
      const q = query.trim();
      // Unified search: combine phrase_prefix + best_fields for all query lengths
      must.push({
        bool: {
          should: [
            // phrase_prefix — matches partial words (e.g. "tai" → "tai nghe")
            // Only works on text fields, NOT keyword fields
            {
              multi_match: {
                query: q,
                fields: ["name^3", "description"],
                type: "phrase_prefix",
              },
            },
            // best_fields — standard term matching with controlled fuzziness
            {
              multi_match: {
                query: q,
                fields: ["name^3", "description", "categoryName^2", "tags^2"],
                type: "best_fields",
                fuzziness: q.length <= 3 ? "0" : "AUTO",
                prefix_length: 2,
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    } else {
      must.push({ match_all: {} });
    }

    // Build filter queries (non-category filters go here)
    const filter: any[] = [{ term: { published: true } }];

    // Category filter goes into post_filter so aggregations show ALL categories
    let postFilter: any = undefined;
    if (filters.categories && filters.categories.length > 0) {
      postFilter = { terms: { categoryName: filters.categories } };
    }

    if (filters.tags && filters.tags.length > 0) {
      filter.push({ terms: { tags: filters.tags } });
    }

    if (filters.status) {
      filter.push({ term: { status: filters.status } });
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const range: any = {};
      if (filters.minPrice !== undefined) range.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) range.lte = filters.maxPrice;
      filter.push({ range: { price: range } });
    }

    if (filters.rating !== undefined) {
      filter.push({ range: { rating: { gte: filters.rating } } });
    }

    // Build sort
    const sortConfig: any[] = [];
    if (sort === "_score" && query && query.trim()) {
      sortConfig.push({ _score: { order: "desc" } });
    }
    if (sort === "price") {
      sortConfig.push({ price: { order } });
    } else if (sort === "rating") {
      sortConfig.push({ rating: { order } });
    } else if (sort === "createdAt") {
      sortConfig.push({ createdAt: { order } });
    } else if (sort === "name") {
      sortConfig.push({ "name.keyword": { order } });
    }
    // Always add a tiebreaker
    sortConfig.push({ createdAt: { order: "desc" } });

    try {
      const result = await esClient.search({
        index: PRODUCT_INDEX,
        from,
        size: limit,
        query: {
          bool: {
            must,
            filter,
          },
        },
        // post_filter: category filter applied AFTER aggregations
        // This ensures aggregations always show all categories
        ...(postFilter ? { post_filter: postFilter } : {}),
        sort: sortConfig,
        // Aggregations for faceted search
        aggregations: {
          categories: {
            terms: { field: "categoryName", size: 20 },
          },
          tags: {
            terms: { field: "tags", size: 20 },
          },
          price_range: {
            stats: { field: "price" },
          },
          avg_rating: {
            avg: { field: "rating" },
          },
        },
        highlight: {
          fields: {
            name: { pre_tags: ["<mark>"], post_tags: ["</mark>"] },
            description: {
              pre_tags: ["<mark>"],
              post_tags: ["</mark>"],
              fragment_size: 150,
            },
          },
        },
      });

      const hits = result.hits.hits;
      const total =
        typeof result.hits.total === "number"
          ? result.hits.total
          : (result.hits.total as any)?.value || 0;

      const products = hits.map((hit: any) => ({
        _id: hit._id,
        ...hit._source,
        _score: hit._score,
        _highlight: hit.highlight,
      }));

      return {
        products,
        total,
        aggregations: result.aggregations,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      logger.error(`Elasticsearch search error: ${error.message}`);
      // Fallback to MongoDB search
      return SearchService.fallbackSearch(query, filters, options);
    }
  }

  /**
   * Autocomplete suggestions
   */
  static async autocomplete(query: string, limit: number = 5): Promise<any[]> {
    if (!(await isElasticsearchAvailable()) || !query || !query.trim()) {
      return [];
    }

    try {
      const result = await esClient.search({
        index: PRODUCT_INDEX,
        size: limit,
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: query.trim(),
                  fields: ["name^3", "description"],
                  type: "phrase_prefix",
                },
              },
            ],
            filter: [{ term: { published: true } }],
          },
        },
        _source: ["name", "price", "image", "category", "categoryName"],
      });

      return result.hits.hits.map((hit: any) => ({
        _id: hit._id,
        ...hit._source,
      }));
    } catch (error: any) {
      logger.error(`Autocomplete error: ${error.message}`);
      return [];
    }
  }

  /**
   * Bulk index all products from MongoDB into Elasticsearch
   */
  static async reindexAll(): Promise<{ indexed: number; errors: number }> {
    if (!(await isElasticsearchAvailable())) {
      throw new Error("Elasticsearch is not available");
    }

    let indexed = 0;
    let errors = 0;
    const batchSize = 100;
    let skip = 0;

    // Delete existing index and recreate
    try {
      const exists = await esClient.indices.exists({ index: PRODUCT_INDEX });
      if (exists) {
        await esClient.indices.delete({ index: PRODUCT_INDEX });
      }
      const { PRODUCT_MAPPING } = await import("../config/elasticsearch");
      // Use mappings directly instead of body
      await esClient.indices.create({
        index: PRODUCT_INDEX,
        ...(PRODUCT_MAPPING as any), 
      });
    } catch (error: any) {
      logger.error(`Error recreating index: ${error.message}`);
      throw error;
    }

    // Batch index products
    while (true) {
      const products = await Product.find()
        .populate("category", "_id name")
        .skip(skip)
        .limit(batchSize)
        .lean();

      if (products.length === 0) break;

      const operations = products.flatMap((product: any) => [
        { index: { _index: PRODUCT_INDEX, _id: product._id.toString() } },
        {
          name: product.name,
          description: product.description,
          price: product.price,
          oldPrice: product.oldPrice,
          category: product.category?._id?.toString() || product.category,
          categoryName: product.category?.name || "",
          subcategory: product.subcategory,
          tags: product.tags || [],
          status: product.status,
          rating: product.rating || 0,
          reviews: product.reviews || 0,
          quantity: product.quantity,
          published: product.published,
          image: product.image,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        },
      ]);

      try {
        const bulkResult = await esClient.bulk({
          operations, // v8 uses operations instead of body for bulk
          refresh: true,
        });

        if (bulkResult.errors) {
          const errorItems = bulkResult.items.filter(
            (item: any) => item.index?.error
          );
          errors += errorItems.length;
          indexed += products.length - errorItems.length;
        } else {
          indexed += products.length;
        }
      } catch (error: any) {
        logger.error(`Bulk index error at skip=${skip}: ${error.message}`);
        errors += products.length;
      }

      skip += batchSize;
    }

    logger.info(
      `Reindex complete: ${indexed} indexed, ${errors} errors`
    );
    return { indexed, errors };
  }

  /**
   * Fallback to MongoDB when Elasticsearch is unavailable
   */
  private static async fallbackSearch(
    query: string,
    filters: SearchFilters,
    options: SearchOptions
  ): Promise<SearchResult> {
    const { page = 1, limit = 12, sort = "createdAt", order = "desc" } = options;
    const skip = (page - 1) * limit;

    const mongoFilter: any = { published: true };

    if (query && query.trim()) {
      mongoFilter.$or = [
        { name: new RegExp(query.trim(), "i") },
        { description: new RegExp(query.trim(), "i") },
      ];
    }

    if (filters.categories && filters.categories.length > 0) {
      mongoFilter.categoryName = { $in: filters.categories };
    }
    if (filters.tags && filters.tags.length > 0) {
      mongoFilter.tags = { $in: filters.tags };
    }
    if (filters.status) mongoFilter.status = filters.status;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      mongoFilter.price = {};
      if (filters.minPrice !== undefined)
        mongoFilter.price.$gte = filters.minPrice;
      if (filters.maxPrice !== undefined)
        mongoFilter.price.$lte = filters.maxPrice;
    }

    const sortConfig: any = {};
    sortConfig[sort === "_score" ? "createdAt" : sort] =
      order === "asc" ? 1 : -1;

    const [products, total] = await Promise.all([
      Product.find(mongoFilter)
        .select("-costPrice")
        .populate("category", "_id name")
        .sort(sortConfig)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(mongoFilter),
    ]);

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
