import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, isNull, isNotNull, sql, or, ilike, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  assets,
  assetFiles,
  categories,
  users,
  adminActions,
  transactions,
  transactionItems,
  paymentConfirmations,
  revenueLedger,
} from '../db/schema.js';
import { authMiddleware, requireRole } from '../middleware/index.js';
import { hashPassword } from '../lib/index.js';
import { handleError } from '../lib/errors.js';
import { toAbsoluteUrl, formatAssetUrls } from '../utils/url.js';
import { rejectionReasonSchema, validationErrorResponse } from '../lib/validation.js';

export const adminRoutes = new Hono();

// Apply admin privilege check across all admin routes
adminRoutes.use('*', authMiddleware, requireRole('admin', 'superadmin'));

/**
 * GET /admin/assets/pending
 * Retrieve queue of assets awaiting moderation review
 */
adminRoutes.get('/assets/pending', async (c) => {
  try {
    const pendingList = await db
      .select({
        id: assets.id,
        title: assets.title,
        slug: assets.slug,
        shortDescription: assets.shortDescription,
        description: assets.description,
        assetType: assets.assetType,
        status: assets.status,
        price: assets.price,
        discountPrice: assets.discountPrice,
        currency: assets.currency,
        thumbnailUrl: assets.thumbnailUrl,
        demoUrl: assets.demoUrl,
        tags: assets.tags,
        createdAt: assets.createdAt,
        seller: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
          isVerifiedSeller: users.isVerifiedSeller,
        },
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(assets)
      .leftJoin(users, eq(assets.sellerId, users.id))
      .leftJoin(categories, eq(assets.categoryId, categories.id))
      .where(and(eq(assets.status, 'pending'), isNull(assets.deletedAt)))
      .orderBy(desc(assets.createdAt));

    // Fetch file details for each pending asset
    const resultsWithFiles = await Promise.all(
      pendingList.map(async (item) => {
        const files = await db
          .select({
            id: assetFiles.id,
            fileName: assetFiles.fileName,
            fileSizeBytes: assetFiles.fileSizeBytes,
            mimeType: assetFiles.mimeType,
            fileExtension: assetFiles.fileExtension,
            version: assetFiles.version,
          })
          .from(assetFiles)
          .where(and(eq(assetFiles.assetId, item.id), isNull(assetFiles.deletedAt)));

        return {
          ...formatAssetUrls(item),
          files,
        };
      })
    );

    return c.json({
      success: true,
      data: {
        pendingAssets: resultsWithFiles,
        count: resultsWithFiles.length,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Admin/pending-assets');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * POST /admin/assets/:id/approve
 * Approve asset publication and log action to audit trail
 */
adminRoutes.post('/assets/:id/approve', async (c) => {
  try {
    const assetId = c.req.param('id');
    const adminUser = c.get('user');

    const [existing] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, assetId), isNull(assets.deletedAt)))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, message: 'Asset not found' }, 404);
    }

    if (existing.status === 'approved') {
      return c.json({ success: false, message: 'Asset is already approved' }, 400);
    }

    const previousStatus = existing.status;

    // Update Asset Status to approved
    const [updatedAsset] = await db
      .update(assets)
      .set({
        status: 'approved',
        reviewedBy: adminUser.userId,
        reviewedAt: new Date(),
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, assetId))
      .returning();

    if (!updatedAsset) {
      throw new Error('Failed to update asset in database');
    }

    // Log action to immutable audit trail
    await db.insert(adminActions).values({
      adminId: adminUser.userId,
      action: 'ASSET_APPROVE',
      targetEntity: 'assets',
      targetId: assetId,
      oldValues: { status: previousStatus },
      newValues: { status: 'approved' },
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      userAgent: c.req.header('user-agent') || 'Unknown',
      notes: `Asset "${existing.title}" approved by admin.`,
    });

    return c.json({
      success: true,
      message: 'Asset successfully approved and published to the marketplace',
      data: {
        asset: formatAssetUrls(updatedAsset),
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Admin/approve-asset');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * POST /admin/assets/:id/reject
 * Reject asset publication with required rejection reason and audit logging
 */
adminRoutes.post('/assets/:id/reject', async (c) => {
  try {
    const assetId = c.req.param('id');
    const adminUser = c.get('user');
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ success: false, message: 'Invalid JSON request body', code: 'MALFORMED_JSON' }, 400);
    }

    const validated = rejectionReasonSchema.safeParse(body);
    if (!validated.success) {
      return validationErrorResponse(c, validated.error);
    }

    const { rejectionReason } = validated.data;

    const [existing] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, assetId), isNull(assets.deletedAt)))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, message: 'Asset not found' }, 404);
    }

    const previousStatus = existing.status;

    // Update Asset Status to rejected
    const [updatedAsset] = await db
      .update(assets)
      .set({
        status: 'rejected',
        reviewedBy: adminUser.userId,
        reviewedAt: new Date(),
        rejectionReason,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, assetId))
      .returning();

    if (!updatedAsset) {
      throw new Error('Failed to update asset in database');
    }

    // Log action to immutable audit trail
    await db.insert(adminActions).values({
      adminId: adminUser.userId,
      action: 'ASSET_REJECT',
      targetEntity: 'assets',
      targetId: assetId,
      oldValues: { status: previousStatus },
      newValues: { status: 'rejected', rejectionReason },
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      userAgent: c.req.header('user-agent') || 'Unknown',
      notes: `Asset "${existing.title}" rejected: ${rejectionReason}`,
    });

    return c.json({
      success: true,
      message: 'Asset rejected with reason recorded for seller',
      data: {
        asset: formatAssetUrls(updatedAsset),
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Admin/reject-asset');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

// =========================================================================
// MANUAL PAYMENT VERIFICATION QUEUE & 60/40 REVENUE SETTLEMENT
// =========================================================================

/**
 * GET /admin/payments/pending
 * Retrieve list of pending bank transfer payment confirmations needing admin verification
 */
adminRoutes.get('/payments/pending', async (c) => {
  try {
    const pendingConfirmations = await db
      .select({
        id: paymentConfirmations.id,
        transactionId: paymentConfirmations.transactionId,
        senderBank: paymentConfirmations.senderBank,
        senderAccountNumber: paymentConfirmations.senderAccountNumber,
        senderAccountName: paymentConfirmations.senderAccountName,
        destinationBank: paymentConfirmations.destinationBank,
        transferAmount: paymentConfirmations.transferAmount,
        transferDate: paymentConfirmations.transferDate,
        proofImageUrl: paymentConfirmations.proofImageUrl,
        status: paymentConfirmations.status,
        submittedAt: paymentConfirmations.createdAt,
        buyer: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
        transaction: {
          id: transactions.id,
          invoiceNumber: transactions.invoiceNumber,
          subtotal: transactions.subtotal,
          totalAmount: transactions.totalAmount,
          status: transactions.status,
          createdAt: transactions.createdAt,
          expiresAt: transactions.expiresAt,
        },
      })
      .from(paymentConfirmations)
      .innerJoin(transactions, eq(paymentConfirmations.transactionId, transactions.id))
      .innerJoin(users, eq(paymentConfirmations.userId, users.id))
      .where(eq(paymentConfirmations.status, 'pending'))
      .orderBy(desc(paymentConfirmations.createdAt));

    // Fetch ordered items summary for each pending confirmation
    const resultsWithItems = await Promise.all(
      pendingConfirmations.map(async (conf) => {
        const items = await db
          .select({
            id: transactionItems.id,
            price: transactionItems.price,
            sellerRatePercent: transactionItems.sellerRatePercent,
            sellerAmount: transactionItems.sellerAmount,
            platformAmount: transactionItems.platformAmount,
            asset: {
              id: assets.id,
              title: assets.title,
              slug: assets.slug,
              thumbnailUrl: assets.thumbnailUrl,
              assetType: assets.assetType,
            },
            seller: {
              id: users.id,
              name: users.name,
            },
          })
          .from(transactionItems)
          .innerJoin(assets, eq(transactionItems.assetId, assets.id))
          .innerJoin(users, eq(transactionItems.sellerId, users.id))
          .where(eq(transactionItems.transactionId, conf.transactionId));

        return {
          ...conf,
          proofImageUrl: toAbsoluteUrl(conf.proofImageUrl),
          transferAmount: Number(conf.transferAmount),
          transaction: {
            ...conf.transaction,
            subtotal: Number(conf.transaction.subtotal),
            totalAmount: Number(conf.transaction.totalAmount),
          },
          items: items.map((i) => ({
            ...i,
            price: Number(i.price),
            sellerAmount: Number(i.sellerAmount),
            platformAmount: Number(i.platformAmount),
            asset: formatAssetUrls(i.asset),
          })),
        };
      })
    );

    return c.json({
      success: true,
      data: {
        pendingPayments: resultsWithItems,
        count: resultsWithItems.length,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Admin/pending-payments');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * POST /admin/payments/:id/verify
 * Verify payment proof, mark transaction 'paid' (unlocking assets for buyer),
 * and record double-entry accounting revenue ledger with 60% creator share & 40% platform share.
 */
adminRoutes.post('/payments/:id/verify', async (c) => {
  try {
    const confirmationId = c.req.param('id');
    const adminUser = c.get('user');

    // Retrieve confirmation
    const [conf] = await db
      .select()
      .from(paymentConfirmations)
      .where(eq(paymentConfirmations.id, confirmationId))
      .limit(1);

    if (!conf) {
      return c.json({ success: false, message: 'Payment confirmation record not found' }, 404);
    }

    if (conf.status === 'verified') {
      return c.json({ success: false, message: 'This payment has already been verified' }, 400);
    }

    // Retrieve associated transaction
    const [tx] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, conf.transactionId))
      .limit(1);

    if (!tx) {
      return c.json({ success: false, message: 'Transaction associated with this confirmation was not found' }, 404);
    }

    const previousTxStatus = tx.status;
    const verifiedAt = new Date();

    // 1. Atomically update Payment Confirmation status
    const [updatedConf] = await db
      .update(paymentConfirmations)
      .set({
        status: 'verified',
        rejectionReason: null,
        verifiedBy: adminUser.userId,
        verifiedAt,
        updatedAt: verifiedAt,
      })
      .where(and(eq(paymentConfirmations.id, confirmationId), eq(paymentConfirmations.status, 'pending')))
      .returning();

    if (!updatedConf) {
      return c.json(
        {
          success: false,
          message: 'Payment confirmation is no longer pending or has already been verified/rejected.',
          code: 'PAYMENT_STATE_CONFLICT',
        },
        409
      );
    }

    // 2. Atomically update Transaction status to 'paid'
    const [updatedTx] = await db
      .update(transactions)
      .set({
        status: 'paid',
        paidAt: verifiedAt,
        updatedAt: verifiedAt,
      })
      .where(and(eq(transactions.id, tx.id), or(eq(transactions.status, 'pending'), eq(transactions.status, 'processing'))))
      .returning();

    if (!updatedTx) {
      return c.json(
        {
          success: false,
          message: 'Transaction is already settled or no longer eligible for payment verification.',
          code: 'TRANSACTION_STATE_CONFLICT',
        },
        409
      );
    }

    // 3. Process Revenue Share (60/40 Split Model) & Double-Entry Ledger Recording
    const items = await db
      .select({
        id: transactionItems.id,
        assetId: transactionItems.assetId,
        sellerId: transactionItems.sellerId,
        price: transactionItems.price,
        sellerAmount: transactionItems.sellerAmount,
        platformAmount: transactionItems.platformAmount,
        assetTitle: assets.title,
      })
      .from(transactionItems)
      .innerJoin(assets, eq(transactionItems.assetId, assets.id))
      .where(eq(transactionItems.transactionId, tx.id));

    for (const item of items) {
      const grossAmount = Number(item.price);
      const sellerNet = Number(item.sellerAmount); // 60%
      const platformFee = Number(item.platformAmount); // 40%

      // Retrieve previous balance for this creator from revenue ledger
      const [lastLedgerEntry] = await db
        .select({ balanceAfter: revenueLedger.balanceAfter })
        .from(revenueLedger)
        .where(eq(revenueLedger.userId, item.sellerId))
        .orderBy(desc(revenueLedger.createdAt))
        .limit(1);

      const previousBalance = lastLedgerEntry ? Number(lastLedgerEntry.balanceAfter) : 0;
      const newBalance = Number((previousBalance + sellerNet).toFixed(2));

      // Append immutable credit ledger entry for seller
      await db.insert(revenueLedger).values({
        userId: item.sellerId,
        transactionId: tx.id,
        transactionItemId: item.id,
        entryType: 'sale_earning',
        grossAmount: grossAmount.toFixed(2),
        platformFee: platformFee.toFixed(2),
        netAmount: sellerNet.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        description: `Bagi hasil penjualan aset (60% kreator): "${item.assetTitle}" (Invoice #${tx.invoiceNumber})`,
      });

      // Increment asset's downloadCount & stats
      await db
        .update(assets)
        .set({
          downloadCount: sql`${assets.downloadCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(assets.id, item.assetId));
    }

    // 4. Record Action in Admin Audit Trail
    await db.insert(adminActions).values({
      adminId: adminUser.userId,
      action: 'PAYMENT_VERIFY',
      targetEntity: 'payment_confirmations',
      targetId: confirmationId,
      oldValues: {
        confirmationStatus: conf.status,
        transactionStatus: previousTxStatus,
      },
      newValues: {
        confirmationStatus: 'verified',
        transactionStatus: 'paid',
        revenueSettled: true,
      },
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      userAgent: c.req.header('user-agent') || 'Unknown',
      notes: `Verified bank payment for invoice ${tx.invoiceNumber} (Total: Rp ${Number(tx.totalAmount).toLocaleString('id-ID')}). Assets released to buyer and 60/40 revenue split settled.`,
    });

    return c.json({
      success: true,
      message: 'Pembayaran berhasil diverifikasi. Aset telah aktif di koleksi pembeli dan pendapatan 60/40 telah dikreditkan ke kreator.',
      data: {
        invoiceNumber: tx.invoiceNumber,
        transactionStatus: 'paid',
        itemsCount: items.length,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Admin/verify-payment');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * POST /admin/payments/:id/reject
 * Reject payment proof with reason and allow buyer to resubmit
 */
adminRoutes.post('/payments/:id/reject', async (c) => {
  try {
    const confirmationId = c.req.param('id');
    const adminUser = c.get('user');
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ success: false, message: 'Invalid JSON request body', code: 'MALFORMED_JSON' }, 400);
    }

    const validated = rejectionReasonSchema.safeParse(body);
    if (!validated.success) {
      return validationErrorResponse(c, validated.error);
    }

    const { rejectionReason } = validated.data;

    // Retrieve confirmation
    const [conf] = await db
      .select()
      .from(paymentConfirmations)
      .where(eq(paymentConfirmations.id, confirmationId))
      .limit(1);

    if (!conf) {
      return c.json({ success: false, message: 'Payment confirmation record not found' }, 404);
    }

    // Retrieve associated transaction
    const [tx] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, conf.transactionId))
      .limit(1);

    const verifiedAt = new Date();

    // 1. Atomically update Payment Confirmation status to rejected
    const [updatedConf] = await db
      .update(paymentConfirmations)
      .set({
        status: 'rejected',
        rejectionReason,
        verifiedBy: adminUser.userId,
        verifiedAt,
        updatedAt: verifiedAt,
      })
      .where(and(eq(paymentConfirmations.id, confirmationId), eq(paymentConfirmations.status, 'pending')))
      .returning();

    if (!updatedConf) {
      return c.json(
        {
          success: false,
          message: 'Payment confirmation is no longer pending review or has already been processed.',
          code: 'PAYMENT_STATE_CONFLICT',
        },
        409
      );
    }

    // 2. Set Transaction back to 'pending' so user can review and re-upload valid proof
    if (tx) {
      await db
        .update(transactions)
        .set({
          status: 'pending',
          updatedAt: verifiedAt,
        })
        .where(eq(transactions.id, tx.id));
    }

    // 3. Record in Admin Audit Trail
    await db.insert(adminActions).values({
      adminId: adminUser.userId,
      action: 'PAYMENT_REJECT',
      targetEntity: 'payment_confirmations',
      targetId: confirmationId,
      oldValues: { confirmationStatus: conf.status },
      newValues: { confirmationStatus: 'rejected', rejectionReason },
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      userAgent: c.req.header('user-agent') || 'Unknown',
      notes: `Rejected payment confirmation for invoice ${tx?.invoiceNumber || conf.transactionId}. Reason: ${rejectionReason}`,
    });

    return c.json({
      success: true,
      message: 'Bukti pembayaran ditolak. Alasan penolakan telah dicatat untuk pembeli.',
      data: {
        confirmationId,
        rejectionReason,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Admin/reject-payment');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * GET /admin/dashboard
 * Summary of admin metrics: pending assets, total users, total transactions, 60/40 platform revenue
 */
adminRoutes.get('/dashboard', async (c) => {
  try {
    // 1. Pending Assets Count
    const [pendingAssetsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assets)
      .where(and(eq(assets.status, 'pending'), isNull(assets.deletedAt)));
    const pendingAssetsCount = pendingAssetsResult?.count || 0;

    // 2. Pending Payment Confirmations Count
    const [pendingPaymentsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(paymentConfirmations)
      .where(eq(paymentConfirmations.status, 'pending'));
    const pendingPaymentsCount = pendingPaymentsResult?.count || 0;

    // 3. Total Users (and breakdown)
    const allUsers = await db
      .select({
        id: users.id,
        role: users.role,
        isVerifiedSeller: users.isVerifiedSeller,
        deletedAt: users.deletedAt,
      })
      .from(users);

    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter((u) => !u.deletedAt).length;
    const inactiveUsers = allUsers.filter((u) => !!u.deletedAt).length;
    const sellersCount = allUsers.filter((u) => u.isVerifiedSeller && !u.deletedAt).length;
    const adminCount = allUsers.filter((u) => (u.role === 'admin' || u.role === 'superadmin') && !u.deletedAt).length;

    // 4. Total Transactions (and breakdown)
    const allTransactions = await db
      .select({
        id: transactions.id,
        status: transactions.status,
        totalAmount: transactions.totalAmount,
      })
      .from(transactions)
      .where(isNull(transactions.deletedAt));

    const totalTransactions = allTransactions.length;
    const paidTransactions = allTransactions.filter((t) => t.status === 'paid');
    const processingTransactions = allTransactions.filter((t) => t.status === 'processing');
    const pendingTransactions = allTransactions.filter((t) => t.status === 'pending');
    const rejectedTransactions = allTransactions.filter((t) => t.status === 'failed' || t.status === 'cancelled');

    // 5. Financial & Revenue Calculation (60/40 Split)
    const paidItems = await db
      .select({
        price: transactionItems.price,
        sellerAmount: transactionItems.sellerAmount,
        platformAmount: transactionItems.platformAmount,
      })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .where(and(eq(transactions.status, 'paid'), isNull(transactions.deletedAt)));

    const grossVolume = paidItems.reduce((acc, item) => acc + Number(item.price || 0), 0);
    const creatorPayouts = paidItems.reduce(
      (acc, item) => acc + (item.sellerAmount ? Number(item.sellerAmount) : Math.round(Number(item.price) * 0.6)),
      0
    );
    const platformRevenue = grossVolume - creatorPayouts; // 40%

    // 6. Recent Transactions (last 6)
    const recentTransactions = await db
      .select({
        id: transactions.id,
        invoiceNumber: transactions.invoiceNumber,
        totalAmount: transactions.totalAmount,
        status: transactions.status,
        createdAt: transactions.createdAt,
        buyer: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.buyerId, users.id))
      .where(isNull(transactions.deletedAt))
      .orderBy(desc(transactions.createdAt))
      .limit(6);

    // 7. Recent Registered Users (last 5)
    const recentUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isVerifiedSeller: users.isVerifiedSeller,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5);

    // 8. Recent Audit Logs (last 5)
    const recentAuditLogs = await db
      .select({
        id: adminActions.id,
        action: adminActions.action,
        targetEntity: adminActions.targetEntity,
        targetId: adminActions.targetId,
        notes: adminActions.notes,
        createdAt: adminActions.createdAt,
        adminName: users.name,
      })
      .from(adminActions)
      .leftJoin(users, eq(adminActions.adminId, users.id))
      .orderBy(desc(adminActions.createdAt))
      .limit(5);

    return c.json({
      success: true,
      data: {
        stats: {
          pendingAssetsCount,
          pendingPaymentsCount,
          totalUsers,
          activeUsers,
          inactiveUsers,
          sellersCount,
          adminCount,
          totalTransactions,
          paidTransactionsCount: paidTransactions.length,
          processingTransactionsCount: processingTransactions.length,
          pendingTransactionsCount: pendingTransactions.length,
          rejectedTransactionsCount: rejectedTransactions.length,
          revenue: {
            grossVolume,
            platformRevenue, // 40%
            creatorPayouts,  // 60%
          },
        },
        recentTransactions,
        recentUsers,
        recentAuditLogs,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Admin/dashboard');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * GET /admin/users
 * Paginated list of users with search, role, and active status filters
 */
adminRoutes.get('/users', async (c) => {
  try {
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')));
    const offset = (page - 1) * limit;
    const roleFilter = c.req.query('role');
    const statusFilter = c.req.query('status');
    const search = (c.req.query('search') || '').trim();

    const conditions: any[] = [];

    if (roleFilter && roleFilter !== 'all') {
      conditions.push(eq(users.role, roleFilter as any));
    }

    if (statusFilter === 'active') {
      conditions.push(isNull(users.deletedAt));
    } else if (statusFilter === 'inactive') {
      conditions.push(isNotNull(users.deletedAt));
    }

    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total Count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause);
    const total = countResult?.count || 0;

    // Paginated users
    const userList = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isVerifiedSeller: users.isVerifiedSeller,
        avatarUrl: users.avatarUrl,
        phone: users.phone,
        bio: users.bio,
        bankName: users.bankName,
        bankAccountNumber: users.bankAccountNumber,
        bankAccountHolder: users.bankAccountHolder,
        createdAt: users.createdAt,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // Fetch user stats (uploaded assets count, purchases count, sales count & total earnings)
    const usersWithStats = await Promise.all(
      userList.map(async (u) => {
        const [assetCountResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(assets)
          .where(and(eq(assets.sellerId, u.id), isNull(assets.deletedAt)));

        const [purchaseCountResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(transactions)
          .where(and(eq(transactions.buyerId, u.id), eq(transactions.status, 'paid')));

        const soldItems = await db
          .select({
            price: transactionItems.price,
            sellerAmount: transactionItems.sellerAmount,
          })
          .from(transactionItems)
          .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
          .where(and(eq(transactionItems.sellerId, u.id), eq(transactions.status, 'paid')));

        const totalEarned = soldItems.reduce(
          (sum, item) => sum + (item.sellerAmount ? Number(item.sellerAmount) : Math.round(Number(item.price) * 0.6)),
          0
        );

        return {
          ...u,
          isActive: !u.deletedAt,
          stats: {
            assetsCount: assetCountResult?.count || 0,
            purchasesCount: purchaseCountResult?.count || 0,
            salesCount: soldItems.length,
            totalEarned,
          },
        };
      })
    );

    return c.json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Admin/list-users');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * GET /admin/users/:id
 * Retrieve detailed user profile, uploaded assets, transactions, and revenue history
 */
adminRoutes.get('/users/:id', async (c) => {
  try {
    const userId = c.req.param('id');

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRecord) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    // Assets uploaded
    const userAssetsRaw = await db
      .select({
        id: assets.id,
        title: assets.title,
        slug: assets.slug,
        status: assets.status,
        price: assets.price,
        assetType: assets.assetType,
        downloadCount: assets.downloadCount,
        thumbnailUrl: assets.thumbnailUrl,
        createdAt: assets.createdAt,
      })
      .from(assets)
      .where(and(eq(assets.sellerId, userId), isNull(assets.deletedAt)))
      .orderBy(desc(assets.createdAt));
    const userAssets = userAssetsRaw.map(formatAssetUrls);

    // Transactions as buyer
    const buyerTxs = await db
      .select({
        id: transactions.id,
        invoiceNumber: transactions.invoiceNumber,
        totalAmount: transactions.totalAmount,
        status: transactions.status,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(eq(transactions.buyerId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(10);

    // Sales items
    const sellerItems = await db
      .select({
        id: transactionItems.id,
        price: transactionItems.price,
        sellerAmount: transactionItems.sellerAmount,
        platformAmount: transactionItems.platformAmount,
        invoiceNumber: transactions.invoiceNumber,
        status: transactions.status,
        createdAt: transactions.createdAt,
        assetTitle: assets.title,
      })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .innerJoin(assets, eq(transactionItems.assetId, assets.id))
      .where(eq(transactionItems.sellerId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(10);

    // Revenue Ledger
    const ledger = await db
      .select()
      .from(revenueLedger)
      .where(eq(revenueLedger.userId, userId))
      .orderBy(desc(revenueLedger.createdAt))
      .limit(10);

    const grossSales = sellerItems
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + Number(i.price), 0);
    const creatorEarnings = sellerItems
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + (i.sellerAmount ? Number(i.sellerAmount) : Math.round(Number(i.price) * 0.6)), 0);

    const firstLedger = ledger[0];
    const availableBalance = firstLedger ? Number(firstLedger.balanceAfter) : creatorEarnings;

    return c.json({
      success: true,
      data: {
        user: {
          id: userRecord.id,
          name: userRecord.name,
          email: userRecord.email,
          role: userRecord.role,
          isVerifiedSeller: userRecord.isVerifiedSeller,
          avatarUrl: userRecord.avatarUrl,
          phone: userRecord.phone,
          bio: userRecord.bio,
          bankName: userRecord.bankName,
          bankAccountNumber: userRecord.bankAccountNumber,
          bankAccountHolder: userRecord.bankAccountHolder,
          bankBranch: userRecord.bankBranch,
          bankSwiftOrCode: userRecord.bankSwiftOrCode,
          createdAt: userRecord.createdAt,
          updatedAt: userRecord.updatedAt,
          deletedAt: userRecord.deletedAt,
          isActive: !userRecord.deletedAt,
        },
        financialSummary: {
          grossSales,
          creatorEarnings,
          availableBalance,
        },
        assets: userAssets,
        buyerTransactions: buyerTxs,
        sellerItems,
        ledgerEntries: ledger,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Admin/user-detail');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * PUT /admin/users/:id
 * Edit user information (name, role, verification status, bank details)
 */
adminRoutes.put('/users/:id', async (c) => {
  try {
    const targetUserId = c.req.param('id');
    const adminUser = c.get('user');
    const body = await c.req.json();

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    const editSchema = z.object({
      name: z.string().min(2).max(100).optional(),
      email: z.string().email().optional(),
      role: z.enum(['user', 'admin', 'superadmin']).optional(),
      isVerifiedSeller: z.boolean().optional(),
      phone: z.string().max(30).optional().nullable(),
      bio: z.string().max(500).optional().nullable(),
      bankName: z.string().max(100).optional().nullable(),
      bankAccountNumber: z.string().max(50).optional().nullable(),
      bankAccountHolder: z.string().max(150).optional().nullable(),
    });

    const parsed = editSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid input data' }, 400);
    }

    // Role safety: Only superadmin can assign role superadmin or modify another admin/superadmin
    if (parsed.data.role && parsed.data.role !== existing.role) {
      if (adminUser.role !== 'superadmin' && (parsed.data.role === 'superadmin' || existing.role === 'superadmin')) {
        return c.json({ success: false, message: 'Only Superadmin can modify superadmin roles' }, 403);
      }
    }

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name.trim();
    if (parsed.data.email !== undefined) updatePayload.email = parsed.data.email.trim().toLowerCase();
    if (parsed.data.role !== undefined) updatePayload.role = parsed.data.role;
    if (parsed.data.isVerifiedSeller !== undefined) updatePayload.isVerifiedSeller = parsed.data.isVerifiedSeller;
    if (parsed.data.phone !== undefined) updatePayload.phone = parsed.data.phone ? parsed.data.phone.trim() : null;
    if (parsed.data.bio !== undefined) updatePayload.bio = parsed.data.bio ? parsed.data.bio.trim() : null;
    if (parsed.data.bankName !== undefined) updatePayload.bankName = parsed.data.bankName ? parsed.data.bankName.trim() : null;
    if (parsed.data.bankAccountNumber !== undefined) updatePayload.bankAccountNumber = parsed.data.bankAccountNumber ? parsed.data.bankAccountNumber.trim() : null;
    if (parsed.data.bankAccountHolder !== undefined) updatePayload.bankAccountHolder = parsed.data.bankAccountHolder ? parsed.data.bankAccountHolder.trim() : null;

    const [updated] = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, targetUserId))
      .returning();

    // Log admin action
    await db.insert(adminActions).values({
      adminId: adminUser.userId,
      action: 'USER_EDIT',
      targetEntity: 'users',
      targetId: targetUserId,
      oldValues: { name: existing.name, role: existing.role, isVerifiedSeller: existing.isVerifiedSeller },
      newValues: updatePayload,
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      userAgent: c.req.header('user-agent') || 'Unknown',
      notes: `Admin ${adminUser.email} edited user ${existing.email}`,
    });

    return c.json({
      success: true,
      message: 'Data pengguna berhasil diperbarui.',
      data: updated,
    });
  } catch (error: any) {
    const appError = handleError(error, 'Admin/update-user');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * POST /admin/users/:id/toggle-status
 * Toggle user active status (deactivate or reactivate)
 */
adminRoutes.post('/users/:id/toggle-status', async (c) => {
  try {
    const targetUserId = c.req.param('id');
    const adminUser = c.get('user');

    if (targetUserId === adminUser.userId) {
      return c.json({ success: false, message: 'Anda tidak dapat menonaktifkan akun Anda sendiri' }, 400);
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    if (existing.role === 'superadmin' && adminUser.role !== 'superadmin') {
      return c.json({ success: false, message: 'Hanya Superadmin yang dapat menonaktifkan akun Superadmin' }, 403);
    }

    const isCurrentlyActive = !existing.deletedAt;
    const newDeletedAt = isCurrentlyActive ? new Date() : null;

    const [updated] = await db
      .update(users)
      .set({
        deletedAt: newDeletedAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUserId))
      .returning();

    // Log admin action
    await db.insert(adminActions).values({
      adminId: adminUser.userId,
      action: isCurrentlyActive ? 'USER_DEACTIVATE' : 'USER_REACTIVATE',
      targetEntity: 'users',
      targetId: targetUserId,
      oldValues: { deletedAt: existing.deletedAt },
      newValues: { deletedAt: newDeletedAt },
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      userAgent: c.req.header('user-agent') || 'Unknown',
      notes: `${isCurrentlyActive ? 'Deactivated' : 'Reactivated'} user ${existing.email}`,
    });

    return c.json({
      success: true,
      message: isCurrentlyActive ? 'Akun pengguna berhasil dinonaktifkan.' : 'Akun pengguna berhasil diaktifkan kembali.',
      data: {
        id: updated?.id || targetUserId,
        isActive: !newDeletedAt,
        deletedAt: newDeletedAt,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Admin/toggle-user-status');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * GET /admin/revenue/users
 * Retrieve revenue breakdown per user for sellers (60% creator, 40% platform)
 */
adminRoutes.get('/revenue/users', async (c) => {
  try {
    const search = (c.req.query('search') || '').trim();

    const sellerUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isVerifiedSeller: users.isVerifiedSeller,
        avatarUrl: users.avatarUrl,
        bankName: users.bankName,
        bankAccountNumber: users.bankAccountNumber,
        bankAccountHolder: users.bankAccountHolder,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        search
          ? or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))
          : undefined
      )
      .orderBy(desc(users.createdAt));

    const usersRevenue = await Promise.all(
      sellerUsers.map(async (u) => {
        const soldItems = await db
          .select({
            price: transactionItems.price,
            sellerAmount: transactionItems.sellerAmount,
            platformAmount: transactionItems.platformAmount,
            status: transactions.status,
          })
          .from(transactionItems)
          .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
          .where(and(eq(transactionItems.sellerId, u.id), eq(transactions.status, 'paid')));

        const grossSales = soldItems.reduce((acc, i) => acc + Number(i.price || 0), 0);
        const creatorEarnings = soldItems.reduce(
          (acc, i) => acc + (i.sellerAmount ? Number(i.sellerAmount) : Math.round(Number(i.price) * 0.6)),
          0
        );
        const platformShareGenerated = grossSales - creatorEarnings;

        const ledger = await db
          .select()
          .from(revenueLedger)
          .where(eq(revenueLedger.userId, u.id))
          .orderBy(desc(revenueLedger.createdAt));

        const totalWithdrawn = ledger
          .filter((e) => e.entryType === 'withdrawal')
          .reduce((sum, e) => sum + Math.abs(Number(e.netAmount)), 0);

        const firstLedger = ledger[0];
        const availableBalance =
          firstLedger ? Math.max(0, Number(firstLedger.balanceAfter)) : creatorEarnings;

        const [assetCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(assets)
          .where(and(eq(assets.sellerId, u.id), isNull(assets.deletedAt)));

        return {
          user: u,
          assetsCount: assetCount?.count || 0,
          totalSalesCount: soldItems.length,
          grossSales,
          creatorEarnings,
          platformShareGenerated,
          totalWithdrawn,
          availableBalance,
          bankConfigured: Boolean(u.bankName && u.bankAccountNumber),
        };
      })
    );

    const relevantUsers = usersRevenue.filter(
      (r) =>
        search ||
        r.user.isVerifiedSeller ||
        r.assetsCount > 0 ||
        r.grossSales > 0 ||
        r.user.role === 'admin'
    );

    const totalPlatformRevenue = relevantUsers.reduce((s, r) => s + r.platformShareGenerated, 0);
    const totalCreatorEarnings = relevantUsers.reduce((s, r) => s + r.creatorEarnings, 0);
    const totalGrossSales = relevantUsers.reduce((s, r) => s + r.grossSales, 0);
    const totalWithdrawnAll = relevantUsers.reduce((s, r) => s + r.totalWithdrawn, 0);

    return c.json({
      success: true,
      data: {
        summary: {
          totalPlatformRevenue,
          totalCreatorEarnings,
          totalGrossSales,
          totalWithdrawnAll,
          sellersCount: relevantUsers.length,
        },
        sellers: relevantUsers,
        users: relevantUsers,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Admin/revenue-per-user');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * GET /admin/revenue/users/:id
 * Retrieve individual seller revenue breakdown and sales history
 */
adminRoutes.get('/revenue/users/:id', async (c) => {
  try {
    const userId = c.req.param('id');

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRecord) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    const soldItems = await db
      .select({
        id: transactionItems.id,
        price: transactionItems.price,
        sellerAmount: transactionItems.sellerAmount,
        platformAmount: transactionItems.platformAmount,
        invoiceNumber: transactions.invoiceNumber,
        status: transactions.status,
        createdAt: transactions.createdAt,
        assetTitle: assets.title,
        assetType: assets.assetType,
      })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .innerJoin(assets, eq(transactionItems.assetId, assets.id))
      .where(and(eq(transactionItems.sellerId, userId), eq(transactions.status, 'paid')))
      .orderBy(desc(transactions.createdAt));

    const grossSales = soldItems.reduce((acc, i) => acc + Number(i.price || 0), 0);
    const creatorEarnings = soldItems.reduce(
      (acc, i) => acc + (i.sellerAmount ? Number(i.sellerAmount) : Math.round(Number(i.price) * 0.6)),
      0
    );
    const platformShareGenerated = grossSales - creatorEarnings;

    const ledger = await db
      .select()
      .from(revenueLedger)
      .where(eq(revenueLedger.userId, userId))
      .orderBy(desc(revenueLedger.createdAt));

    const totalWithdrawn = ledger
      .filter((e) => e.entryType === 'withdrawal')
      .reduce((sum, e) => sum + Math.abs(Number(e.netAmount)), 0);

    const firstLedger = ledger[0];
    const availableBalance =
      firstLedger ? Math.max(0, Number(firstLedger.balanceAfter)) : creatorEarnings;
    return c.json({
      success: true,
      data: {
        user: {
          id: userRecord.id,
          name: userRecord.name,
          email: userRecord.email,
          role: userRecord.role,
          isVerifiedSeller: userRecord.isVerifiedSeller,
          bankName: userRecord.bankName,
          bankAccountNumber: userRecord.bankAccountNumber,
          bankAccountHolder: userRecord.bankAccountHolder,
        },
        financials: {
          grossSales,
          creatorEarnings,
          platformShareGenerated,
          totalWithdrawn,
          availableBalance,
        },
        sales: soldItems,
        ledgerEntries: ledger,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Admin/user-revenue-detail');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * =========================================================================
 * SUPERADMIN ONLY: MANAGE ADMINS (CRUD)
 * Strictly restricted to role: 'superadmin'
 * =========================================================================
 */

/**
 * GET /admin/admins
 * List all users with role 'admin' or 'superadmin'
 */
adminRoutes.get('/admins', async (c) => {
  try {
    const currentSuperAdmin = c.get('user');
    if (currentSuperAdmin?.role !== 'superadmin') {
      return c.json({ success: false, message: 'Forbidden: Requires superadmin role' }, 403);
    }

    const adminList = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isVerifiedSeller: users.isVerifiedSeller,
        avatarUrl: users.avatarUrl,
        phone: users.phone,
        bio: users.bio,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(inArray(users.role, ['admin', 'superadmin']))
      .orderBy(desc(users.createdAt));

    // Get audit action counts for each admin
    const adminsWithStats = await Promise.all(
      adminList.map(async (adm) => {
        const [actionCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(adminActions)
          .where(eq(adminActions.adminId, adm.id));

        return {
          ...adm,
          isActive: !adm.deletedAt,
          actionsCount: actionCount?.count || 0,
        };
      })
    );

    return c.json({
      success: true,
      data: {
        admins: adminsWithStats,
        count: adminsWithStats.length,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Admin/list-admins');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * POST /admin/admins
 * Create a new Admin or Superadmin
 */
adminRoutes.post('/admins', async (c) => {
  try {
    const currentSuperAdmin = c.get('user');
    if (currentSuperAdmin?.role !== 'superadmin') {
      return c.json({ success: false, message: 'Forbidden: Requires superadmin role' }, 403);
    }
    const body = await c.req.json();

    const createAdminSchema = z.object({
      name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100),
      email: z.string().trim().toLowerCase().email('Alamat email tidak valid').max(255),
      password: z.string().min(8, 'Password minimal 8 karakter').max(100),
      role: z.enum(['admin', 'superadmin']).default('admin'),
      phone: z.string().max(30).optional().nullable(),
      bio: z.string().max(500).optional().nullable(),
    });

    const parsed = createAdminSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || 'Data admin tidak valid',
          errors: parsed.error.format(),
        },
        400
      );
    }

    const { name, email, password, role, phone, bio } = parsed.data;

    // Check if email already registered
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return c.json({ success: false, message: 'Alamat email sudah terdaftar dalam sistem.' }, 400);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert new admin
    const [newAdmin] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        role,
        isVerifiedSeller: false,
        phone: phone || null,
        bio: bio || null,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phone: users.phone,
        bio: users.bio,
        createdAt: users.createdAt,
      });

    if (!newAdmin) {
      return c.json({ success: false, message: 'Gagal membuat akun admin' }, 500);
    }

    // Record Audit Log
    await db.insert(adminActions).values({
      adminId: currentSuperAdmin.userId,
      action: 'ADMIN_CREATE',
      targetEntity: 'users',
      targetId: newAdmin.id,
      oldValues: null,
      newValues: { name, email, role, phone },
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      userAgent: c.req.header('user-agent') || 'Unknown',
      notes: `Superadmin ${currentSuperAdmin.email} created new ${role} account: ${email}`,
    });

    return c.json(
      {
        success: true,
        message: `Akun ${role === 'superadmin' ? 'Superadmin' : 'Admin'} ${name} berhasil dibuat.`,
        data: newAdmin,
      },
      201
    );
  } catch (error: any) {
    const appError = handleError(error, 'Admin/create-admin');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * GET /admin/admins/:id
 * Retrieve single admin details and audit history
 */
adminRoutes.get('/admins/:id', async (c) => {
  try {
    const currentSuperAdmin = c.get('user');
    if (currentSuperAdmin?.role !== 'superadmin') {
      return c.json({ success: false, message: 'Forbidden: Requires superadmin role' }, 403);
    }
    const adminId = c.req.param('id');

    const [adminUser] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isVerifiedSeller: users.isVerifiedSeller,
        avatarUrl: users.avatarUrl,
        phone: users.phone,
        bio: users.bio,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(and(eq(users.id, adminId), inArray(users.role, ['admin', 'superadmin'])))
      .limit(1);

    if (!adminUser) {
      return c.json({ success: false, message: 'Admin tidak ditemukan' }, 404);
    }

    // Fetch actions logged by this admin
    const recentActions = await db
      .select({
        id: adminActions.id,
        action: adminActions.action,
        targetEntity: adminActions.targetEntity,
        targetId: adminActions.targetId,
        notes: adminActions.notes,
        createdAt: adminActions.createdAt,
      })
      .from(adminActions)
      .where(eq(adminActions.adminId, adminId))
      .orderBy(desc(adminActions.createdAt))
      .limit(15);

    return c.json({
      success: true,
      data: {
        admin: {
          ...adminUser,
          isActive: !adminUser.deletedAt,
        },
        actions: recentActions,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Admin/admin-detail');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * PUT /admin/admins/:id
 * Edit admin profile, role, and optional password
 */
adminRoutes.put('/admins/:id', async (c) => {
  try {
    const currentSuperAdmin = c.get('user');
    if (currentSuperAdmin?.role !== 'superadmin') {
      return c.json({ success: false, message: 'Forbidden: Requires superadmin role' }, 403);
    }
    const targetAdminId = c.req.param('id');
    const body = await c.req.json();

    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, targetAdminId), inArray(users.role, ['admin', 'superadmin'])))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, message: 'Akun admin tidak ditemukan' }, 404);
    }

    const updateAdminSchema = z.object({
      name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100).optional(),
      email: z.string().trim().toLowerCase().email('Alamat email tidak valid').max(255).optional(),
      password: z.string().min(8, 'Password minimal 8 karakter').max(100).optional().nullable(),
      role: z.enum(['admin', 'superadmin']).optional(),
      phone: z.string().max(30).optional().nullable(),
      bio: z.string().max(500).optional().nullable(),
    });

    const parsed = updateAdminSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || 'Data tidak valid',
          errors: parsed.error.format(),
        },
        400
      );
    }

    // SAFETY CHECK: Superadmin cannot demote themselves
    if (targetAdminId === currentSuperAdmin.userId && parsed.data.role && parsed.data.role !== 'superadmin') {
      return c.json(
        {
          success: false,
          message: 'Anda tidak dapat menurunkan peran Superadmin Anda sendiri demi integritas sistem.',
        },
        400
      );
    }

    // Check if new email is taken by someone else
    if (parsed.data.email && parsed.data.email !== existing.email) {
      const [emailConflict] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, parsed.data.email))
        .limit(1);

      if (emailConflict) {
        return c.json({ success: false, message: 'Alamat email sudah digunakan oleh akun lain.' }, 400);
      }
    }

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name;
    if (parsed.data.email !== undefined) updatePayload.email = parsed.data.email;
    if (parsed.data.role !== undefined) updatePayload.role = parsed.data.role;
    if (parsed.data.phone !== undefined) updatePayload.phone = parsed.data.phone ? parsed.data.phone.trim() : null;
    if (parsed.data.bio !== undefined) updatePayload.bio = parsed.data.bio ? parsed.data.bio.trim() : null;

    if (parsed.data.password && parsed.data.password.trim().length >= 8) {
      updatePayload.passwordHash = await hashPassword(parsed.data.password.trim());
    }

    const [updated] = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, targetAdminId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phone: users.phone,
        bio: users.bio,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    // Record Audit Log
    await db.insert(adminActions).values({
      adminId: currentSuperAdmin.userId,
      action: 'ADMIN_UPDATE',
      targetEntity: 'users',
      targetId: targetAdminId,
      oldValues: { name: existing.name, email: existing.email, role: existing.role },
      newValues: {
        name: updated?.name,
        email: updated?.email,
        role: updated?.role,
        passwordChanged: Boolean(parsed.data.password),
      },
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      userAgent: c.req.header('user-agent') || 'Unknown',
      notes: `Superadmin ${currentSuperAdmin.email} updated admin ${existing.email}`,
    });

    return c.json({
      success: true,
      message: `Data admin ${updated?.name || existing.name} berhasil diperbarui.`,
      data: updated,
    });
  } catch (error: any) {
    const appError = handleError(error, 'Admin/update-admin');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * DELETE /admin/admins/:id
 * Soft delete / deactivate admin account.
 * CRUCIAL VALIDATION: Superadmin cannot delete themselves!
 */
adminRoutes.delete('/admins/:id', async (c) => {
  try {
    const currentSuperAdmin = c.get('user');
    if (currentSuperAdmin?.role !== 'superadmin') {
      return c.json({ success: false, message: 'Forbidden: Requires superadmin role' }, 403);
    }
    const targetAdminId = c.req.param('id');

    // 1. CRITICAL VALIDATION: Superadmin cannot delete themselves!
    if (targetAdminId === currentSuperAdmin.userId) {
      return c.json(
        {
          success: false,
          message: 'Superadmin tidak diizinkan untuk menghapus atau menonaktifkan akun sendiri demi keamanan sistem.',
        },
        400
      );
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, targetAdminId), inArray(users.role, ['admin', 'superadmin'])))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, message: 'Akun admin tidak ditemukan' }, 404);
    }

    // 2. SAFETY CHECK: Ensure at least one active superadmin remains
    if (existing.role === 'superadmin') {
      const allSuperAdmins = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, 'superadmin'), isNull(users.deletedAt)));

      if (allSuperAdmins.length <= 1) {
        return c.json(
          {
            success: false,
            message: 'Tidak dapat menonaktifkan satu-satunya Superadmin aktif yang tersisa dalam sistem.',
          },
          400
        );
      }
    }

    const deletedAt = new Date();

    await db
      .update(users)
      .set({
        deletedAt,
        updatedAt: deletedAt,
      })
      .where(eq(users.id, targetAdminId));

    // 3. Record Audit Log
    await db.insert(adminActions).values({
      adminId: currentSuperAdmin.userId,
      action: 'ADMIN_DELETE',
      targetEntity: 'users',
      targetId: targetAdminId,
      oldValues: { name: existing.name, email: existing.email, role: existing.role },
      newValues: { deletedAt },
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      userAgent: c.req.header('user-agent') || 'Unknown',
      notes: `Superadmin ${currentSuperAdmin.email} deactivated admin ${existing.name} (${existing.email})`,
    });

    return c.json({
      success: true,
      message: `Akun admin ${existing.name} (${existing.email}) berhasil dinonaktifkan dari sistem.`,
      data: {
        id: targetAdminId,
        isActive: false,
        deletedAt,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Admin/delete-admin');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * POST /admin/admins/:id/reactivate
 * Reactivate a deactivated admin
 */
adminRoutes.post('/admins/:id/reactivate', async (c) => {
  try {
    const currentSuperAdmin = c.get('user');
    if (currentSuperAdmin?.role !== 'superadmin') {
      return c.json({ success: false, message: 'Forbidden: Requires superadmin role' }, 403);
    }
    const targetAdminId = c.req.param('id');

    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, targetAdminId), inArray(users.role, ['admin', 'superadmin'])))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, message: 'Akun admin tidak ditemukan' }, 404);
    }

    await db
      .update(users)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetAdminId));

    // Audit Log
    await db.insert(adminActions).values({
      adminId: currentSuperAdmin.userId,
      action: 'ADMIN_REACTIVATE',
      targetEntity: 'users',
      targetId: targetAdminId,
      oldValues: { deletedAt: existing.deletedAt },
      newValues: { deletedAt: null },
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      userAgent: c.req.header('user-agent') || 'Unknown',
      notes: `Superadmin ${currentSuperAdmin.email} reactivated admin ${existing.email}`,
    });

    return c.json({
      success: true,
      message: `Akun admin ${existing.name} (${existing.email}) berhasil diaktifkan kembali.`,
      data: {
        id: targetAdminId,
        isActive: true,
        deletedAt: null,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Admin/reactivate-admin');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});


