import { z } from 'zod';
import type { Context } from 'hono';

/**
 * Standardized Zod validation error formatting
 */
export interface FormattedValidationError {
  field: string;
  message: string;
}

export function formatZodIssues(error: z.ZodError): {
  errors: Record<string, string[]>;
  error: FormattedValidationError[];
  firstMessage: string;
} {
  const errors: Record<string, string[]> = {};
  const errorList: FormattedValidationError[] = [];

  for (const issue of error.issues) {
    const field = issue.path.length > 0 ? issue.path.join('.') : 'general';
    if (!errors[field]) {
      errors[field] = [];
    }
    errors[field].push(issue.message);
    errorList.push({ field, message: issue.message });
  }

  const firstMessage = errorList[0]?.message || 'Validation failed';

  return {
    errors,
    error: errorList,
    firstMessage,
  };
}

/**
 * Helper to return a uniform HTTP 400 Bad Request response on validation failure
 */
export function validationErrorResponse(c: Context, zodError: z.ZodError, customMessage?: string) {
  const { errors, error, firstMessage } = formatZodIssues(zodError);

  return c.json(
    {
      success: false,
      message: customMessage || firstMessage || 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors,
      error,
    },
    400
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMON ZOD SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * UUID or alphanumeric slug parameter
 */
export const idParamSchema = z.string().trim().min(1, 'ID parameter is required');

export const uuidSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Invalid UUID format'
  );

/**
 * Authentication Schemas
 */
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address')
    .max(255, 'Email cannot exceed 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password cannot exceed 100 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Asset Form & Filter Schemas
 */
export const assetTypeEnum = z.enum([
  'ui_template',
  'source_code',
  '3d_model',
  'graphic',
  'audio',
  'video',
  'dataset',
  'document',
  'other',
]);

export const createAssetMetadataSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(120, 'Title cannot exceed 120 characters'),
    shortDescription: z
      .string()
      .trim()
      .max(300, 'Short description cannot exceed 300 characters')
      .optional()
      .nullable(),
    description: z
      .string()
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(10000, 'Description cannot exceed 10,000 characters'),
    categoryId: z.string().trim().min(1, 'Please select a valid category'),
    assetType: assetTypeEnum.default('other'),
    price: z.coerce
      .number({ invalid_type_error: 'Price must be a valid number' })
      .min(0, 'Price must be non-negative')
      .max(100_000_000, 'Price exceeds maximum allowed limit'),
    discountPrice: z.coerce
      .number({ invalid_type_error: 'Discount price must be a valid number' })
      .min(0, 'Discount price must be non-negative')
      .optional()
      .nullable(),
    demoUrl: z
      .string()
      .trim()
      .url('Invalid preview/demo URL')
      .optional()
      .nullable()
      .or(z.literal('')),
    tags: z
      .array(z.string().trim().max(40, 'Tag name cannot exceed 40 characters'))
      .max(20, 'Maximum 20 tags allowed')
      .optional()
      .default([]),
  })
  .refine(
    (data) => {
      if (data.discountPrice !== null && data.discountPrice !== undefined) {
        return data.discountPrice < data.price;
      }
      return true;
    },
    {
      message: 'Discount price must be lower than original price',
      path: ['discountPrice'],
    }
  );

export const updateAssetMetadataSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(120, 'Title cannot exceed 120 characters')
      .optional(),
    shortDescription: z
      .string()
      .trim()
      .max(300, 'Short description cannot exceed 300 characters')
      .optional()
      .nullable(),
    description: z
      .string()
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(10000, 'Description cannot exceed 10,000 characters')
      .optional(),
    categoryId: z.string().trim().min(1, 'Please select a valid category').optional(),
    assetType: assetTypeEnum.optional(),
    price: z.coerce
      .number({ invalid_type_error: 'Price must be a valid number' })
      .min(0, 'Price must be non-negative')
      .max(100_000_000, 'Price exceeds maximum allowed limit')
      .optional(),
    discountPrice: z.coerce
      .number({ invalid_type_error: 'Discount price must be a valid number' })
      .min(0, 'Discount price must be non-negative')
      .optional()
      .nullable(),
    demoUrl: z
      .string()
      .trim()
      .url('Invalid preview/demo URL')
      .optional()
      .nullable()
      .or(z.literal('')),
    tags: z
      .array(z.string().trim().max(40, 'Tag name cannot exceed 40 characters'))
      .max(20, 'Maximum 20 tags allowed')
      .optional(),
  })
  .refine(
    (data) => {
      if (
        data.price !== undefined &&
        data.discountPrice !== null &&
        data.discountPrice !== undefined
      ) {
        return data.discountPrice < data.price;
      }
      return true;
    },
    {
      message: 'Discount price must be lower than original price',
      path: ['discountPrice'],
    }
  );

export const assetListQuerySchema = z
  .object({
    category: z.string().trim().optional(),
    type: z.string().trim().optional(),
    q: z.string().trim().optional(),
    search: z.string().trim().optional(),
    minPrice: z.coerce.number().min(0, 'minPrice must be non-negative').optional(),
    maxPrice: z.coerce.number().min(0, 'maxPrice must be non-negative').optional(),
    pricing: z.enum(['all', 'free', 'paid']).default('all').optional(),
    isFree: z.preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional()),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular', 'rating']).default('newest'),
    page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
    limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(12),
  })
  .refine(
    (data) => {
      if (data.minPrice !== undefined && data.maxPrice !== undefined) {
        return data.maxPrice >= data.minPrice;
      }
      return true;
    },
    {
      message: 'maxPrice must be greater than or equal to minPrice',
      path: ['maxPrice'],
    }
  );

/**
 * Cart & Checkout Schemas
 */
export const addToCartSchema = z.object({
  assetId: z.string().trim().min(1, 'Asset ID is required'),
});

export const checkoutSchema = z.object({
  source: z.enum(['cart', 'buy_now']).default('cart'),
  assetId: z.string().trim().optional().nullable(),
});

/**
 * Payment Confirmation Schema
 */
export const paymentConfirmationMetadataSchema = z.object({
  invoiceNumber: z
    .string()
    .trim()
    .min(5, 'Invoice number must be at least 5 characters')
    .max(100, 'Invoice number is too long'),
  senderBank: z
    .string()
    .trim()
    .min(2, 'Sender bank name is required')
    .max(100, 'Bank name cannot exceed 100 characters'),
  senderAccountNumber: z
    .string()
    .trim()
    .min(4, 'Account number must be at least 4 characters')
    .max(50, 'Account number cannot exceed 50 characters'),
  senderAccountName: z
    .string()
    .trim()
    .min(2, 'Account holder name must be at least 2 characters')
    .max(150, 'Account holder name cannot exceed 150 characters'),
  destinationBank: z
    .string()
    .trim()
    .min(2, 'Destination bank is required')
    .max(100, 'Destination bank cannot exceed 100 characters'),
  transferAmount: z.coerce
    .number({ invalid_type_error: 'Transfer amount must be a number' })
    .positive('Transfer amount must be greater than 0'),
  transferDate: z.string().trim().min(1, 'Transfer date is required'),
});

/**
 * Rejection Schema (Assets and Payments)
 */
export const rejectionReasonSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(5, 'Please provide a clear rejection reason (minimum 5 characters)')
    .max(1000, 'Rejection reason cannot exceed 1000 characters'),
});

/**
 * Profile & Settings Schemas
 */
export const userProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  bio: z.string().trim().max(500, 'Bio cannot exceed 500 characters').optional().nullable(),
  phone: z
    .string()
    .trim()
    .max(30, 'Phone number cannot exceed 30 characters')
    .regex(/^$|^[+0-9\s\-()]{6,30}$/, 'Invalid phone number format')
    .optional()
    .nullable(),
  avatarUrl: z
    .string()
    .trim()
    .max(1000, 'Avatar URL too long')
    .url('Invalid avatar URL')
    .optional()
    .nullable()
    .or(z.literal('')),
});

export const userPaymentSettingsSchema = z.object({
  bankName: z.string().trim().min(2, 'Bank name must be at least 2 characters').max(100),
  bankAccountNumber: z.string().trim().min(4, 'Account number must be at least 4 digits').max(50),
  bankAccountHolder: z.string().trim().min(2, 'Account holder name must be at least 2 characters').max(150),
  bankBranch: z.string().trim().max(100).optional().nullable(),
  bankSwiftOrCode: z.string().trim().max(50).optional().nullable(),
});
