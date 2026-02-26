/**
 * Order status constants
 * Centralized definition to avoid magic strings scattered in codebase
 */
export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  REFUND_REQUESTED: 'refund_requested',
} as const;

export type OrderStatusType = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS);

/**
 * Payment method constants
 */
export const PAYMENT_METHOD = {
  COD: 'cod',
  VNPAY: 'vnpay',
  BANK_TRANSFER: 'bank_transfer',
  OTHER: 'other',
} as const;

export type PaymentMethodType = typeof PAYMENT_METHOD[keyof typeof PAYMENT_METHOD];

/**
 * Stock voucher types
 */
export const VOUCHER_TYPE = {
  IMPORT: 'import',
  EXPORT: 'export',
} as const;

export type VoucherTypeType = typeof VOUCHER_TYPE[keyof typeof VOUCHER_TYPE];

/**
 * Transaction types
 */
export const TRANSACTION_TYPE = {
  INCOME: 'income',
  EXPENSE: 'expense',
} as const;

export type TransactionTypeType = typeof TRANSACTION_TYPE[keyof typeof TRANSACTION_TYPE];

/**
 * Product status constants
 */
export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OUT_OF_STOCK: 'out_of_stock',
} as const;

export type ProductStatusType = typeof PRODUCT_STATUS[keyof typeof PRODUCT_STATUS];
