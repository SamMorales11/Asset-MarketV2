import { relations } from 'drizzle-orm';
import {
    pgTable,
    pgEnum,
    uuid,
    text,
    varchar,
    numeric,
    integer,
    bigint,
    boolean,
    timestamp,
    jsonb,
    index,
    uniqueIndex,
} from 'drizzle-orm/pg-core';

// ==========================================
// 1. ENUMS
// ==========================================

export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'superadmin']);

export const assetStatusEnum = pgEnum('asset_status', ['pending', 'approved', 'rejected']);

export const assetTypeEnum = pgEnum('asset_type', [
    'source_code',
    'ui_template',
    '3d_model',
    'graphic',
    'audio',
    'video',
    'document',
    'other',
]);

export const transactionStatusEnum = pgEnum('transaction_status', [
    'pending',
    'processing',
    'paid',
    'failed',
    'cancelled',
    'refunded',
    'expired',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
    'bank_transfer',
    'qris',
    'credit_card',
    'e_wallet',
    'manual_transfer',
]);

export const paymentConfirmationStatusEnum = pgEnum('payment_confirmation_status', [
    'pending',
    'verified',
    'rejected',
]);

export const ledgerTypeEnum = pgEnum('ledger_type', [
    'sale_earning',
    'platform_commission',
    'withdrawal',
    'refund',
    'adjustment',
]);

// ==========================================
// 2. TABLES
// ==========================================

/**
 * Tabel: users
 * Menyimpan data pengguna, pembeli, penjual (kreator), dan admin.
 * Memuat informasi rekening penjual untuk penarikan dana (payout).
 */
export const users = pgTable(
    'users',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        email: varchar('email', { length: 255 }).notNull().unique(),
        name: varchar('name', { length: 255 }).notNull(),
        passwordHash: text('password_hash').notNull(),
        avatarUrl: text('avatar_url'),
        phone: varchar('phone', { length: 30 }),
        bio: text('bio'),
        role: userRoleEnum('role').default('user').notNull(),
        isVerifiedSeller: boolean('is_verified_seller').default(false).notNull(),

        // Informasi Rekening Penjual (Seller Bank Account)
        bankName: varchar('bank_name', { length: 100 }),
        bankAccountNumber: varchar('bank_account_number', { length: 50 }),
        bankAccountHolder: varchar('bank_account_holder', { length: 150 }),
        bankBranch: varchar('bank_branch', { length: 100 }),
        bankSwiftOrCode: varchar('bank_swift_or_code', { length: 50 }),

        // Soft Delete & Timestamps
        deletedAt: timestamp('deleted_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index('users_email_idx').on(table.email),
        index('users_role_idx').on(table.role),
        index('users_deleted_at_idx').on(table.deletedAt),
    ]
);

/**
 * Tabel: categories
 * Kategori aset digital dengan dukungan struktur hierarki (parent-child).
 */
export const categories = pgTable(
    'categories',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        name: varchar('name', { length: 100 }).notNull(),
        slug: varchar('slug', { length: 120 }).notNull().unique(),
        description: text('description'),
        iconUrl: text('icon_url'),
        parentId: uuid('parent_id'),
        isActive: boolean('is_active').default(true).notNull(),
        sortOrder: integer('sort_order').default(0).notNull(),

        // Soft Delete & Timestamps
        deletedAt: timestamp('deleted_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index('categories_slug_idx').on(table.slug),
        index('categories_parent_id_idx').on(table.parentId),
        index('categories_is_active_idx').on(table.isActive),
        index('categories_deleted_at_idx').on(table.deletedAt),
    ]
);

/**
 * Tabel: assets
 * Katalog produk/aset digital yang diunggah oleh penjual.
 */
export const assets = pgTable(
    'assets',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        sellerId: uuid('seller_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        categoryId: uuid('category_id')
            .notNull()
            .references(() => categories.id, { onDelete: 'restrict' }),
        title: varchar('title', { length: 255 }).notNull(),
        slug: varchar('slug', { length: 280 }).notNull().unique(),
        shortDescription: text('short_description'),
        description: text('description').notNull(),
        assetType: assetTypeEnum('asset_type').notNull(),
        status: assetStatusEnum('status').default('pending').notNull(),

        // Moderasi Admin
        rejectionReason: text('rejection_reason'),
        reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
        reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

        // Harga & Finansial
        price: numeric('price', { precision: 12, scale: 2 }).notNull(),
        discountPrice: numeric('discount_price', { precision: 12, scale: 2 }),
        currency: varchar('currency', { length: 10 }).default('IDR').notNull(),

        // Media & Visual
        thumbnailUrl: text('thumbnail_url').notNull(),
        previewImages: jsonb('preview_images').$type<string[]>().default([]).notNull(),
        demoUrl: text('demo_url'),
        tags: jsonb('tags').$type<string[]>().default([]).notNull(),

        // Statistik
        downloadCount: integer('download_count').default(0).notNull(),
        viewCount: integer('view_count').default(0).notNull(),
        ratingAvg: numeric('rating_avg', { precision: 3, scale: 2 }).default('0.00').notNull(),
        ratingCount: integer('rating_count').default(0).notNull(),

        // Soft Delete & Timestamps
        deletedAt: timestamp('deleted_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index('assets_seller_id_idx').on(table.sellerId),
        index('assets_category_id_idx').on(table.categoryId),
        index('assets_slug_idx').on(table.slug),
        index('assets_status_idx').on(table.status),
        index('assets_type_idx').on(table.assetType),
        index('assets_price_idx').on(table.price),
        index('assets_created_at_idx').on(table.createdAt),
        index('assets_deleted_at_idx').on(table.deletedAt),
    ]
);

/**
 * Tabel: asset_files
 * File biner unduhan aset digital yang tersimpan di cloud storage (S3/R2).
 */
export const assetFiles = pgTable(
    'asset_files',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        assetId: uuid('asset_id')
            .notNull()
            .references(() => assets.id, { onDelete: 'cascade' }),
        fileName: varchar('file_name', { length: 255 }).notNull(),
        fileKey: text('file_key').notNull(),
        fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(),
        mimeType: varchar('mime_type', { length: 100 }).notNull(),
        fileExtension: varchar('file_extension', { length: 20 }).notNull(),
        version: varchar('version', { length: 20 }).default('1.0.0').notNull(),
        checksumSha256: varchar('checksum_sha256', { length: 64 }),
        isMain: boolean('is_main').default(true).notNull(),

        // Soft Delete & Timestamps
        deletedAt: timestamp('deleted_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index('asset_files_asset_id_idx').on(table.assetId),
        index('asset_files_deleted_at_idx').on(table.deletedAt),
    ]
);

/**
 * Tabel: carts
 * Keranjang belanja aktif per pengguna.
 */
export const carts = pgTable(
    'carts',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .unique()
            .references(() => users.id, { onDelete: 'cascade' }),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [index('carts_user_id_idx').on(table.userId)]
);

/**
 * Tabel: cart_items
 * Item spesifik di dalam keranjang belanja.
 */
export const cartItems = pgTable(
    'cart_items',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        cartId: uuid('cart_id')
            .notNull()
            .references(() => carts.id, { onDelete: 'cascade' }),
        assetId: uuid('asset_id')
            .notNull()
            .references(() => assets.id, { onDelete: 'cascade' }),
        priceAtAddition: numeric('price_at_addition', { precision: 12, scale: 2 }).notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex('cart_items_cart_asset_unique').on(table.cartId, table.assetId),
        index('cart_items_cart_id_idx').on(table.cartId),
        index('cart_items_asset_id_idx').on(table.assetId),
    ]
);

/**
 * Tabel: transactions
 * Header transaksi pembelian aset digital.
 */
export const transactions = pgTable(
    'transactions',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        invoiceNumber: varchar('invoice_number', { length: 60 }).notNull().unique(),
        buyerId: uuid('buyer_id')
            .notNull()
            .references(() => users.id, { onDelete: 'restrict' }),
        subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
        taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
        totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
        status: transactionStatusEnum('status').default('pending').notNull(),
        paymentMethod: paymentMethodEnum('payment_method').default('manual_transfer').notNull(),
        paymentGatewayRef: varchar('payment_gateway_ref', { length: 100 }),
        paidAt: timestamp('paid_at', { withTimezone: true }),
        expiresAt: timestamp('expires_at', { withTimezone: true }),
        notes: text('notes'),

        // Soft Delete & Timestamps
        deletedAt: timestamp('deleted_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index('transactions_invoice_idx').on(table.invoiceNumber),
        index('transactions_buyer_id_idx').on(table.buyerId),
        index('transactions_status_idx').on(table.status),
        index('transactions_created_at_idx').on(table.createdAt),
        index('transactions_deleted_at_idx').on(table.deletedAt),
    ]
);

/**
 * Tabel: transaction_items
 * Rincian setiap item dalam transaksi beserta pembagian bagi hasil (revenue share 60/40):
 * - Seller Earning: 60%
 * - Platform Commission: 40%
 */
export const transactionItems = pgTable(
    'transaction_items',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        transactionId: uuid('transaction_id')
            .notNull()
            .references(() => transactions.id, { onDelete: 'cascade' }),
        assetId: uuid('asset_id')
            .notNull()
            .references(() => assets.id, { onDelete: 'restrict' }),
        sellerId: uuid('seller_id')
            .notNull()
            .references(() => users.id, { onDelete: 'restrict' }),
        price: numeric('price', { precision: 12, scale: 2 }).notNull(),

        // Revenue Share Breakdown (60/40 Split Model)
        sellerRatePercent: numeric('seller_rate_percent', { precision: 5, scale: 2 })
            .default('60.00')
            .notNull(),
        platformRatePercent: numeric('platform_rate_percent', { precision: 5, scale: 2 })
            .default('40.00')
            .notNull(),
        sellerAmount: numeric('seller_amount', { precision: 12, scale: 2 }).notNull(),
        platformAmount: numeric('platform_amount', { precision: 12, scale: 2 }).notNull(),

        licenseType: varchar('license_type', { length: 50 }).default('standard').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index('transaction_items_transaction_id_idx').on(table.transactionId),
        index('transaction_items_asset_id_idx').on(table.assetId),
        index('transaction_items_seller_id_idx').on(table.sellerId),
    ]
);

/**
 * Tabel: payment_confirmations
 * Bukti transfer pembayaran manual yang dikirimkan oleh pembeli untuk diverifikasi admin.
 */
export const paymentConfirmations = pgTable(
    'payment_confirmations',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        transactionId: uuid('transaction_id')
            .notNull()
            .references(() => transactions.id, { onDelete: 'cascade' }),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        senderBank: varchar('sender_bank', { length: 100 }).notNull(),
        senderAccountNumber: varchar('sender_account_number', { length: 50 }).notNull(),
        senderAccountName: varchar('sender_account_name', { length: 150 }).notNull(),
        destinationBank: varchar('destination_bank', { length: 100 }).notNull(),
        transferAmount: numeric('transfer_amount', { precision: 12, scale: 2 }).notNull(),
        transferDate: timestamp('transfer_date', { withTimezone: true }).notNull(),
        proofImageUrl: text('proof_image_url').notNull(),
        status: paymentConfirmationStatusEnum('status').default('pending').notNull(),
        rejectionReason: text('rejection_reason'),
        verifiedBy: uuid('verified_by').references(() => users.id, { onDelete: 'set null' }),
        verifiedAt: timestamp('verified_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index('payment_confirmations_tx_id_idx').on(table.transactionId),
        index('payment_confirmations_user_id_idx').on(table.userId),
        index('payment_confirmations_status_idx').on(table.status),
        index('payment_confirmations_created_at_idx').on(table.createdAt),
    ]
);

/**
 * Tabel: revenue_ledger
 * Buku besar keuangan append-only untuk pencatatan mutasi saldo kreator/penjual
 * dan pemisahan komisi platform 60/40.
 */
export const revenueLedger = pgTable(
    'revenue_ledger',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'restrict' }),
        transactionId: uuid('transaction_id').references(() => transactions.id, {
            onDelete: 'set null',
        }),
        transactionItemId: uuid('transaction_item_id').references(() => transactionItems.id, {
            onDelete: 'set null',
        }),
        entryType: ledgerTypeEnum('entry_type').notNull(),
        grossAmount: numeric('gross_amount', { precision: 12, scale: 2 }).notNull(),
        platformFee: numeric('platform_fee', { precision: 12, scale: 2 }).default('0.00').notNull(),
        netAmount: numeric('net_amount', { precision: 12, scale: 2 }).notNull(),
        balanceAfter: numeric('balance_after', { precision: 12, scale: 2 }).notNull(),
        description: text('description').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index('revenue_ledger_user_id_idx').on(table.userId),
        index('revenue_ledger_transaction_id_idx').on(table.transactionId),
        index('revenue_ledger_entry_type_idx').on(table.entryType),
        index('revenue_ledger_created_at_idx').on(table.createdAt),
    ]
);

/**
 * Tabel: admin_actions
 * Audit trail log aktivitas administrator/superadmin (bersifat immutable append-only).
 */
export const adminActions = pgTable(
    'admin_actions',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        adminId: uuid('admin_id')
            .notNull()
            .references(() => users.id, { onDelete: 'restrict' }),
        action: varchar('action', { length: 100 }).notNull(),
        targetEntity: varchar('target_entity', { length: 80 }).notNull(),
        targetId: varchar('target_id', { length: 100 }).notNull(),
        oldValues: jsonb('old_values'),
        newValues: jsonb('new_values'),
        ipAddress: varchar('ip_address', { length: 50 }),
        userAgent: text('user_agent'),
        notes: text('notes'),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index('admin_actions_admin_id_idx').on(table.adminId),
        index('admin_actions_action_idx').on(table.action),
        index('admin_actions_target_entity_idx').on(table.targetEntity),
        index('admin_actions_created_at_idx').on(table.createdAt),
    ]
);

// ==========================================
// 3. RELATIONS (DRIZZLE ORM)
// ==========================================

export const usersRelations = relations(users, ({ many, one }) => ({
    assets: many(assets, { relationName: 'sellerAssets' }),
    reviewedAssets: many(assets, { relationName: 'reviewedAssets' }),
    cart: one(carts, {
        fields: [users.id],
        references: [carts.userId],
    }),
    transactions: many(transactions),
    transactionItems: many(transactionItems),
    paymentConfirmations: many(paymentConfirmations, { relationName: 'userConfirmations' }),
    verifiedConfirmations: many(paymentConfirmations, { relationName: 'verifiedConfirmations' }),
    revenueLedgerEntries: many(revenueLedger),
    adminActions: many(adminActions),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
    parent: one(categories, {
        fields: [categories.parentId],
        references: [categories.id],
        relationName: 'categoryHierarchy',
    }),
    subcategories: many(categories, { relationName: 'categoryHierarchy' }),
    assets: many(assets),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
    seller: one(users, {
        fields: [assets.sellerId],
        references: [users.id],
        relationName: 'sellerAssets',
    }),
    reviewer: one(users, {
        fields: [assets.reviewedBy],
        references: [users.id],
        relationName: 'reviewedAssets',
    }),
    category: one(categories, {
        fields: [assets.categoryId],
        references: [categories.id],
    }),
    files: many(assetFiles),
    cartItems: many(cartItems),
    transactionItems: many(transactionItems),
}));

export const assetFilesRelations = relations(assetFiles, ({ one }) => ({
    asset: one(assets, {
        fields: [assetFiles.assetId],
        references: [assets.id],
    }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
    user: one(users, {
        fields: [carts.userId],
        references: [users.id],
    }),
    items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
    cart: one(carts, {
        fields: [cartItems.cartId],
        references: [carts.id],
    }),
    asset: one(assets, {
        fields: [cartItems.assetId],
        references: [assets.id],
    }),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
    buyer: one(users, {
        fields: [transactions.buyerId],
        references: [users.id],
    }),
    items: many(transactionItems),
    paymentConfirmations: many(paymentConfirmations),
    ledgerEntries: many(revenueLedger),
}));

export const transactionItemsRelations = relations(transactionItems, ({ one, many }) => ({
    transaction: one(transactions, {
        fields: [transactionItems.transactionId],
        references: [transactions.id],
    }),
    asset: one(assets, {
        fields: [transactionItems.assetId],
        references: [assets.id],
    }),
    seller: one(users, {
        fields: [transactionItems.sellerId],
        references: [users.id],
    }),
    ledgerEntries: many(revenueLedger),
}));

export const paymentConfirmationsRelations = relations(paymentConfirmations, ({ one }) => ({
    transaction: one(transactions, {
        fields: [paymentConfirmations.transactionId],
        references: [transactions.id],
    }),
    user: one(users, {
        fields: [paymentConfirmations.userId],
        references: [users.id],
        relationName: 'userConfirmations',
    }),
    verifiedByAdmin: one(users, {
        fields: [paymentConfirmations.verifiedBy],
        references: [users.id],
        relationName: 'verifiedConfirmations',
    }),
}));

export const revenueLedgerRelations = relations(revenueLedger, ({ one }) => ({
    user: one(users, {
        fields: [revenueLedger.userId],
        references: [users.id],
    }),
    transaction: one(transactions, {
        fields: [revenueLedger.transactionId],
        references: [transactions.id],
    }),
    transactionItem: one(transactionItems, {
        fields: [revenueLedger.transactionItemId],
        references: [transactionItems.id],
    }),
}));

export const adminActionsRelations = relations(adminActions, ({ one }) => ({
    admin: one(users, {
        fields: [adminActions.adminId],
        references: [users.id],
    }),
}));

// ==========================================
// 4. INFERRED TYPES
// ==========================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

export type AssetFile = typeof assetFiles.$inferSelect;
export type NewAssetFile = typeof assetFiles.$inferInsert;

export type Cart = typeof carts.$inferSelect;
export type NewCart = typeof carts.$inferInsert;

export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type TransactionItem = typeof transactionItems.$inferSelect;
export type NewTransactionItem = typeof transactionItems.$inferInsert;

export type PaymentConfirmation = typeof paymentConfirmations.$inferSelect;
export type NewPaymentConfirmation = typeof paymentConfirmations.$inferInsert;

export type RevenueLedgerEntry = typeof revenueLedger.$inferSelect;
export type NewRevenueLedgerEntry = typeof revenueLedger.$inferInsert;

export type AdminAction = typeof adminActions.$inferSelect;
export type NewAdminAction = typeof adminActions.$inferInsert;
