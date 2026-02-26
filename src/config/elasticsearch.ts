import { Client } from "@elastic/elasticsearch";
import { logger } from "../utils/logger";

const ELASTICSEARCH_URL =
  process.env.ELASTICSEARCH_URL || "http://localhost:9200";

const esClient = new Client({
  node: ELASTICSEARCH_URL,
});

// Product index name
export const PRODUCT_INDEX = "products";

// Product index mapping
export const PRODUCT_MAPPING = {
  mappings: {
    properties: {
      name: {
        type: "text" as const,
        fields: {
          keyword: { type: "keyword" as const },
          suggest: {
            type: "completion" as const,
          },
        },
      },
      description: { type: "text" as const },
      price: { type: "long" as const },
      oldPrice: { type: "long" as const },
      category: { type: "keyword" as const },
      categoryName: { type: "keyword" as const },
      subcategory: { type: "keyword" as const },
      tags: { type: "keyword" as const },
      status: { type: "keyword" as const },
      rating: { type: "float" as const },
      reviews: { type: "integer" as const },
      quantity: { type: "integer" as const },
      published: { type: "boolean" as const },
      image: { type: "keyword" as const, index: false },
      createdAt: { type: "date" as const },
      updatedAt: { type: "date" as const },
    },
  },
  settings: {
    analysis: {
      analyzer: {
        vietnamese_analyzer: {
          type: "custom",
          tokenizer: "standard",
          filter: ["lowercase", "asciifolding"],
        },
      },
    },
    number_of_shards: 1,
    number_of_replicas: 0,
  },
};

/**
 * Initialize Elasticsearch index
 * Creates the product index with mapping if it doesn't exist
 */
export const initElasticsearch = async (): Promise<void> => {
  try {
    const exists = await esClient.indices.exists({ index: PRODUCT_INDEX });

    if (!exists) {
      await esClient.indices.create({
        index: PRODUCT_INDEX,
        ...(PRODUCT_MAPPING as any),
      });
      logger.info(`Elasticsearch index "${PRODUCT_INDEX}" created`);
    } else {
      logger.info(`Elasticsearch index "${PRODUCT_INDEX}" already exists`);
    }
  } catch (error: any) {
    // If ES is not available, log warning but don't crash the app
    logger.warn(
      `Elasticsearch not available: ${error.message}. Search features will be disabled.`
    );
  }
};

/**
 * Check if Elasticsearch is available
 */
export const isElasticsearchAvailable = async (): Promise<boolean> => {
  try {
    await esClient.ping();
    return true;
  } catch {
    return false;
  }
};

export default esClient;
