import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, isNull, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  users,
  assets,
  assetFiles,
  categories,
  transactions,
  transactionItems,
  paymentConfirmations,
  revenueLedger,
} from '../db/schema.js';
import { authMiddleware } from '../middleware/index.js';
import { toAbsoluteUrl, formatAssetUrls } from '../utils/url.js';

export const userRoutes = new Hono();

// All /users/* endpoints require authentication
userRoutes.use('*', authMiddleware);

/**
 * GET /users/me
 * Retrieve currently authenticated user profile
 */
userRoutes.get('/me', async (c) => {
  try {
    const sessionUser = c.get('user');

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        avatarUrl: users.avatarUrl,
        phone: users.phone,
        bio: users.bio,
        isVerifiedSeller: users.isVerifiedSeller,
        bankName: users.bankName,
        bankAccountNumber: users.bankAccountNumber,
        bankAccountHolder: users.bankAccountHolder,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.id, sessionUser.userId), isNull(users.deletedAt)))
      .limit(1);

    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    return c.json({
      success: true,
      data: { user },
    });
  } catch (error: any) {
    console.error('Get /users/me Error:', error);
    return c.json({ success: false, message: 'Failed to retrieve profile', error: error?.message }, 500);
  }
});

/**
 * GET /users/me/assets
 * Retrieve all digital assets purchased by current user (with deliverables download links)
 */
userRoutes.get('/me/assets', async (c) => {
  try {
    const sessionUser = c.get('user');

    const paidItems = await db
      .select({
        transactionId: transactions.id,
        invoiceNumber: transactions.invoiceNumber,
        paidAt: transactions.paidAt,
        purchaseDate: transactions.createdAt,
        pricePaid: transactionItems.price,
        licenseType: transactionItems.licenseType,
        asset: {
          id: assets.id,
          title: assets.title,
          slug: assets.slug,
          shortDescription: assets.shortDescription,
          description: assets.description,
          assetType: assets.assetType,
          thumbnailUrl: assets.thumbnailUrl,
          demoUrl: assets.demoUrl,
          downloadCount: assets.downloadCount,
        },
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
        seller: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
          isVerifiedSeller: users.isVerifiedSeller,
        },
      })
      .from(transactions)
      .innerJoin(transactionItems, eq(transactions.id, transactionItems.transactionId))
      .innerJoin(assets, eq(transactionItems.assetId, assets.id))
      .leftJoin(categories, eq(assets.categoryId, categories.id))
      .leftJoin(users, eq(assets.sellerId, users.id))
      .where(
        and(
          eq(transactions.buyerId, sessionUser.userId),
          eq(transactions.status, 'paid'),
          isNull(assets.deletedAt)
        )
      )
      .orderBy(desc(transactions.paidAt), desc(transactions.createdAt));

    // Fetch deliverable package files for each asset
    const assetIds = Array.from(new Set(paidItems.map((item) => item.asset.id)));
    let filesMap = new Map<string, Array<any>>();

    if (assetIds.length > 0) {
      const filesList = await db
        .select({
          id: assetFiles.id,
          assetId: assetFiles.assetId,
          fileName: assetFiles.fileName,
          fileSizeBytes: assetFiles.fileSizeBytes,
          mimeType: assetFiles.mimeType,
          version: assetFiles.version,
          isMain: assetFiles.isMain,
        })
        .from(assetFiles)
        .where(and(inArray(assetFiles.assetId, assetIds), isNull(assetFiles.deletedAt)));

      for (const f of filesList) {
        const arr = filesMap.get(f.assetId) || [];
        arr.push({
          ...f,
          downloadUrl: `/api/purchases/download/${f.id}`,
        });
        filesMap.set(f.assetId, arr);
      }
    }

    const formattedAssets = paidItems.map((item) => ({
      transactionId: item.transactionId,
      invoiceNumber: item.invoiceNumber,
      paidAt: item.paidAt,
      purchaseDate: item.purchaseDate,
      pricePaid: Number(item.pricePaid),
      licenseType: item.licenseType,
      asset: {
        ...formatAssetUrls(item.asset),
        category: item.category,
        seller: item.seller,
        files: filesMap.get(item.asset.id) || [],
      },
    }));

    return c.json({
      success: true,
      data: {
        assets: formattedAssets,
        totalCount: formattedAssets.length,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /users/me/assets:', error);
    return c.json(
      {
        success: false,
        message: 'Gagal mengambil daftar aset yang Anda miliki',
        error: error?.message,
      },
      500
    );
  }
});

/**
 * GET /users/me/transactions
 * Retrieve unified transaction history (both purchases as buyer and sales as creator/seller)
 */
userRoutes.get('/me/transactions', async (c) => {
  try {
    const sessionUser = c.get('user');
    const roleFilter = (c.req.query('role') || 'all').toLowerCase(); // 'all' | 'buyer' | 'seller'
    const statusFilter = c.req.query('status'); // optional status filter

    interface UnifiedTxItem {
      id: string;
      transactionId: string;
      invoiceNumber: string;
      role: 'buyer' | 'seller';
      type: 'purchase' | 'sale';
      status: string;
      assetTitle: string;
      assetThumbnail: string;
      assetType: string;
      assetSlug: string;
      grossAmount: number;
      netAmount: number; // what you paid (if buyer) or what you earned 60% (if seller)
      platformFee: number;
      counterpartyName: string; // seller name if buyer, buyer name if seller
      paymentMethod: string;
      createdAt: Date;
      paidAt: Date | null;
      itemsCount: number;
    }

    const unifiedList: UnifiedTxItem[] = [];

    // 1. Fetch Purchases (as Buyer)
    if (roleFilter === 'all' || roleFilter === 'buyer') {
      const buyerTxs = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.buyerId, sessionUser.userId),
            statusFilter ? eq(transactions.status, statusFilter as any) : undefined,
            isNull(transactions.deletedAt)
          )
        )
        .orderBy(desc(transactions.createdAt));

      for (const tx of buyerTxs) {
        const items = await db
          .select({
            id: transactionItems.id,
            price: transactionItems.price,
            assetTitle: assets.title,
            assetThumbnail: assets.thumbnailUrl,
            assetType: assets.assetType,
            assetSlug: assets.slug,
            sellerName: users.name,
          })
          .from(transactionItems)
          .innerJoin(assets, eq(transactionItems.assetId, assets.id))
          .innerJoin(users, eq(transactionItems.sellerId, users.id))
          .where(eq(transactionItems.transactionId, tx.id));

        const mainItem = items[0] || {
          assetTitle: 'Digital Asset Package',
          assetThumbnail: '',
          assetType: 'other',
          assetSlug: '',
          sellerName: 'Marketplace Seller',
        };

        unifiedList.push({
          id: `buy-${tx.id}`,
          transactionId: tx.id,
          invoiceNumber: tx.invoiceNumber,
          role: 'buyer',
          type: 'purchase',
          status: tx.status,
          assetTitle: items.length > 1 ? `${mainItem.assetTitle} (+${items.length - 1} item lainnya)` : mainItem.assetTitle,
          assetThumbnail: mainItem.assetThumbnail,
          assetType: mainItem.assetType,
          assetSlug: mainItem.assetSlug,
          grossAmount: Number(tx.totalAmount),
          netAmount: Number(tx.totalAmount),
          platformFee: 0,
          counterpartyName: mainItem.sellerName,
          paymentMethod: tx.paymentMethod,
          createdAt: tx.createdAt,
          paidAt: tx.paidAt,
          itemsCount: items.length,
        });
      }
    }

    // 2. Fetch Sales (as Creator / Seller)
    if (roleFilter === 'all' || roleFilter === 'seller') {
      const sellerItems = await db
        .select({
          itemId: transactionItems.id,
          price: transactionItems.price,
          sellerAmount: transactionItems.sellerAmount,
          platformAmount: transactionItems.platformAmount,
          assetTitle: assets.title,
          assetThumbnail: assets.thumbnailUrl,
          assetType: assets.assetType,
          assetSlug: assets.slug,
          transactionId: transactions.id,
          invoiceNumber: transactions.invoiceNumber,
          status: transactions.status,
          paymentMethod: transactions.paymentMethod,
          createdAt: transactions.createdAt,
          paidAt: transactions.paidAt,
          buyerName: users.name,
        })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
        .innerJoin(assets, eq(transactionItems.assetId, assets.id))
        .innerJoin(users, eq(transactions.buyerId, users.id))
        .where(
          and(
            eq(transactionItems.sellerId, sessionUser.userId),
            statusFilter ? eq(transactions.status, statusFilter as any) : undefined,
            isNull(transactions.deletedAt)
          )
        )
        .orderBy(desc(transactions.createdAt));

      for (const item of sellerItems) {
        unifiedList.push({
          id: `sale-${item.itemId}`,
          transactionId: item.transactionId,
          invoiceNumber: item.invoiceNumber,
          role: 'seller',
          type: 'sale',
          status: item.status,
          assetTitle: item.assetTitle,
          assetThumbnail: item.assetThumbnail,
          assetType: item.assetType,
          assetSlug: item.assetSlug,
          grossAmount: Number(item.price),
          netAmount: Number(item.sellerAmount), // 60%
          platformFee: Number(item.platformAmount), // 40%
          counterpartyName: item.buyerName,
          paymentMethod: item.paymentMethod,
          createdAt: item.createdAt,
          paidAt: item.paidAt,
          itemsCount: 1,
        });
      }
    }

    // Sort combined list descending by date
    unifiedList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate Summary Stats
    const totalSpent = unifiedList
      .filter((i) => i.role === 'buyer' && i.status === 'paid')
      .reduce((sum, i) => sum + i.grossAmount, 0);

    const totalEarned = unifiedList
      .filter((i) => i.role === 'seller' && i.status === 'paid')
      .reduce((sum, i) => sum + i.netAmount, 0);

    return c.json({
      success: true,
      data: {
        transactions: unifiedList,
        totalCount: unifiedList.length,
        summary: {
          totalPurchasesCount: unifiedList.filter((i) => i.role === 'buyer').length,
          totalSalesCount: unifiedList.filter((i) => i.role === 'seller').length,
          totalSpent,
          totalEarned,
        },
      },
    });
  } catch (error: any) {
    console.error('Error in GET /users/me/transactions:', error);
    return c.json(
      {
        success: false,
        message: 'Gagal mengambil riwayat transaksi',
        error: error?.message,
      },
      500
    );
  }
});

/**
 * GET /users/me/transactions/:id
 * Retrieve full transaction detail (by UUID or invoiceNumber)
 */
userRoutes.get('/me/transactions/:id', async (c) => {
  try {
    const sessionUser = c.get('user');
    const paramId = c.req.param('id');

    // Query by ID or invoiceNumber
    const [tx] = await db
      .select()
      .from(transactions)
      .where(
        and(
          sql`(${transactions.id}::text = ${paramId} OR ${transactions.invoiceNumber} = ${paramId})`,
          isNull(transactions.deletedAt)
        )
      )
      .limit(1);

    if (!tx) {
      return c.json({ success: false, message: 'Transaksi tidak ditemukan' }, 404);
    }

    // Fetch buyer info
    const [buyer] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, tx.buyerId))
      .limit(1);

    // Fetch items
    const items = await db
      .select({
        id: transactionItems.id,
        assetId: transactionItems.assetId,
        sellerId: transactionItems.sellerId,
        price: transactionItems.price,
        sellerRatePercent: transactionItems.sellerRatePercent,
        platformRatePercent: transactionItems.platformRatePercent,
        sellerAmount: transactionItems.sellerAmount,
        platformAmount: transactionItems.platformAmount,
        licenseType: transactionItems.licenseType,
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
      .where(eq(transactionItems.transactionId, tx.id));

    // Permission check: User must be buyer, or seller of at least one item, or admin
    const isBuyer = tx.buyerId === sessionUser.userId;
    const isSeller = items.some((i) => i.sellerId === sessionUser.userId);
    const isAdmin = sessionUser.role === 'admin' || sessionUser.role === 'superadmin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return c.json({ success: false, message: 'Akses transaksi ditolak' }, 403);
    }

    // Latest payment confirmation
    const [confirmation] = await db
      .select()
      .from(paymentConfirmations)
      .where(eq(paymentConfirmations.transactionId, tx.id))
      .orderBy(desc(paymentConfirmations.createdAt))
      .limit(1);

    return c.json({
      success: true,
      data: {
        transaction: {
          id: tx.id,
          invoiceNumber: tx.invoiceNumber,
          status: tx.status,
          subtotal: Number(tx.subtotal),
          taxAmount: Number(tx.taxAmount),
          totalAmount: Number(tx.totalAmount),
          paymentMethod: tx.paymentMethod,
          paidAt: tx.paidAt,
          expiresAt: tx.expiresAt,
          createdAt: tx.createdAt,
          notes: tx.notes,
        },
        buyer,
        isBuyer,
        isSeller,
        items: items.map((i) => ({
          ...i,
          price: Number(i.price),
          sellerAmount: Number(i.sellerAmount),
          platformAmount: Number(i.platformAmount),
          asset: formatAssetUrls(i.asset),
        })),
        paymentConfirmation: confirmation
          ? {
              id: confirmation.id,
              senderBank: confirmation.senderBank,
              senderAccountNumber: confirmation.senderAccountNumber,
              senderAccountName: confirmation.senderAccountName,
              destinationBank: confirmation.destinationBank,
              transferAmount: Number(confirmation.transferAmount),
              transferDate: confirmation.transferDate,
              proofImageUrl: toAbsoluteUrl(confirmation.proofImageUrl),
              status: confirmation.status,
              rejectionReason: confirmation.rejectionReason,
              verifiedAt: confirmation.verifiedAt,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /users/me/transactions/:id:', error);
    return c.json(
      {
        success: false,
        message: 'Gagal mengambil rincian transaksi',
        error: error?.message,
      },
      500
    );
  }
});

/**
 * GET /users/me/revenue
 * Retrieve Creator Revenue Dashboard, 60/40 breakdown, available balance, and ledger mutation history
 */
userRoutes.get('/me/revenue', async (c) => {
  try {
    const sessionUser = c.get('user');

    // 1. Fetch user bank account info
    const [userProfile] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        bankName: users.bankName,
        bankAccountNumber: users.bankAccountNumber,
        bankAccountHolder: users.bankAccountHolder,
        bankBranch: users.bankBranch,
        isVerifiedSeller: users.isVerifiedSeller,
      })
      .from(users)
      .where(eq(users.id, sessionUser.userId))
      .limit(1);

    // 2. Fetch all sales items belonging to this creator
    const creatorSales = await db
      .select({
        price: transactionItems.price,
        sellerAmount: transactionItems.sellerAmount,
        platformAmount: transactionItems.platformAmount,
        txStatus: transactions.status,
      })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .where(
        and(
          eq(transactionItems.sellerId, sessionUser.userId),
          isNull(transactions.deletedAt)
        )
      );

    // Paid sales
    const paidSales = creatorSales.filter((s) => s.txStatus === 'paid');
    const grossSales = paidSales.reduce((acc, s) => acc + Number(s.price), 0);
    const creatorEarnings = paidSales.reduce((acc, s) => acc + Number(s.sellerAmount), 0); // 60%
    const platformFees = paidSales.reduce((acc, s) => acc + Number(s.platformAmount), 0); // 40%

    // Pending sales (awaiting transfer or admin verification)
    const pendingSales = creatorSales.filter((s) => s.txStatus === 'pending' || s.txStatus === 'processing');
    const pendingEarnings = pendingSales.reduce((acc, s) => acc + Number(s.sellerAmount), 0);

    // 3. Fetch latest balance from append-only revenue ledger
    const [lastLedgerEntry] = await db
      .select({ balanceAfter: revenueLedger.balanceAfter })
      .from(revenueLedger)
      .where(eq(revenueLedger.userId, sessionUser.userId))
      .orderBy(desc(revenueLedger.createdAt))
      .limit(1);

    const availableBalance = lastLedgerEntry ? Number(lastLedgerEntry.balanceAfter) : 0;

    // 4. Fetch mutation history from revenue ledger
    const ledgerHistory = await db
      .select({
        id: revenueLedger.id,
        entryType: revenueLedger.entryType,
        grossAmount: revenueLedger.grossAmount,
        platformFee: revenueLedger.platformFee,
        netAmount: revenueLedger.netAmount,
        balanceAfter: revenueLedger.balanceAfter,
        description: revenueLedger.description,
        createdAt: revenueLedger.createdAt,
        transactionId: revenueLedger.transactionId,
      })
      .from(revenueLedger)
      .where(eq(revenueLedger.userId, sessionUser.userId))
      .orderBy(desc(revenueLedger.createdAt))
      .limit(50);

    // Calculate total withdrawn
    const withdrawnTotal = ledgerHistory
      .filter((e) => e.entryType === 'withdrawal')
      .reduce((acc, e) => acc + Number(e.netAmount), 0);

    // Payout settings
    const minWithdrawal = 50000;
    const canWithdraw = availableBalance >= minWithdrawal && !!userProfile?.bankAccountNumber;

    return c.json({
      success: true,
      data: {
        summary: {
          grossSales,
          creatorEarnings, // 60% Net Share
          platformFees, // 40% Platform Commission
          pendingEarnings,
          availableBalance,
          withdrawnTotal,
          totalSalesVolume: paidSales.length,
        },
        bankAccount: {
          bankName: userProfile?.bankName || null,
          bankAccountNumber: userProfile?.bankAccountNumber || null,
          bankAccountHolder: userProfile?.bankAccountHolder || null,
          bankBranch: userProfile?.bankBranch || null,
          isVerifiedSeller: userProfile?.isVerifiedSeller || false,
        },
        payoutInfo: {
          minimumWithdrawal: minWithdrawal,
          canWithdraw,
          processingTime: '1–2 Hari Kerja',
          payoutSchedule: 'Setiap Hari Kerja (Senin–Jumat)',
        },
        ledgerEntries: ledgerHistory.map((item) => ({
          ...item,
          grossAmount: Number(item.grossAmount),
          platformFee: Number(item.platformFee),
          netAmount: Number(item.netAmount),
          balanceAfter: Number(item.balanceAfter),
        })),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /users/me/revenue:', error);
    return c.json(
      {
        success: false,
        message: 'Gagal mengambil rincian pendapatan revenue',
        error: error?.message,
      },
      500
    );
  }
});

/**
 * POST /users/me/payout/request
 * Request payout / withdrawal of creator balance to registered bank account
 */
userRoutes.post('/me/payout/request', async (c) => {
  try {
    const sessionUser = c.get('user');
    const body = await c.req.json();
    const amount = parseFloat(body.amount);

    if (isNaN(amount) || amount < 50000) {
      return c.json(
        {
          success: false,
          message: 'Nominal penarikan minimal Rp 50.000',
        },
        400
      );
    }

    const [userProfile] = await db
      .select()
      .from(users)
      .where(eq(users.id, sessionUser.userId))
      .limit(1);

    if (!userProfile?.bankAccountNumber || !userProfile?.bankName) {
      return c.json(
        {
          success: false,
          message: 'Harap daftarkan nomor rekening bank Anda terlebih dahulu sebelum menarik dana.',
        },
        400
      );
    }

    // Get current balance
    const [lastLedgerEntry] = await db
      .select({ balanceAfter: revenueLedger.balanceAfter })
      .from(revenueLedger)
      .where(eq(revenueLedger.userId, sessionUser.userId))
      .orderBy(desc(revenueLedger.createdAt))
      .limit(1);

    const currentBalance = lastLedgerEntry ? Number(lastLedgerEntry.balanceAfter) : 0;

    if (amount > currentBalance) {
      return c.json(
        {
          success: false,
          message: `Saldo tidak mencukupi. Saldo tersedia saat ini: Rp ${currentBalance.toLocaleString('id-ID')}`,
        },
        400
      );
    }

    const newBalance = Number((currentBalance - amount).toFixed(2));

    // Record withdrawal entry in revenue ledger
    const [newEntry] = await db
      .insert(revenueLedger)
      .values({
        userId: sessionUser.userId,
        entryType: 'withdrawal',
        grossAmount: amount.toFixed(2),
        platformFee: '0.00',
        netAmount: amount.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        description: `Penarikan saldo ke ${userProfile.bankName} (${userProfile.bankAccountNumber} a.n. ${userProfile.bankAccountHolder})`,
      })
      .returning();

    return c.json({
      success: true,
      message: `Permintaan penarikan dana sebesar Rp ${amount.toLocaleString('id-ID')} berhasil diajukan. Dana akan ditransfer dalam 1–2 hari kerja.`,
      data: {
        withdrawalId: newEntry?.id,
        amountWithdrawn: amount,
        balanceAfter: newBalance,
      },
    });
  } catch (error: any) {
    console.error('Error requesting payout:', error);
    return c.json(
      {
        success: false,
        message: 'Gagal memproses penarikan saldo',
        error: error?.message,
      },
      500
    );
  }
});

/**
 * PUT /users/me/bank-account
 * Save or update seller's bank account payout destination
 */
userRoutes.put('/me/bank-account', async (c) => {
  try {
    const sessionUser = c.get('user');
    const body = await c.req.json();

    const bankName = (body.bankName as string || '').trim();
    const bankAccountNumber = (body.bankAccountNumber as string || '').trim();
    const bankAccountHolder = (body.bankAccountHolder as string || '').trim();
    const bankBranch = (body.bankBranch as string || '').trim();

    if (!bankName || !bankAccountNumber || !bankAccountHolder) {
      return c.json(
        {
          success: false,
          message: 'Nama bank, nomor rekening, dan nama pemilik rekening wajib diisi.',
        },
        400
      );
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        bankName,
        bankAccountNumber,
        bankAccountHolder,
        bankBranch: bankBranch || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, sessionUser.userId))
      .returning({
        id: users.id,
        bankName: users.bankName,
        bankAccountNumber: users.bankAccountNumber,
        bankAccountHolder: users.bankAccountHolder,
      });

    return c.json({
      success: true,
      message: 'Rekening bank berhasil disimpan untuk pencairan saldo.',
      data: updatedUser,
    });
  } catch (error: any) {
    console.error('Error updating bank account:', error);
    return c.json(
      {
        success: false,
        message: 'Gagal memperbarui rekening bank',
        error: error?.message,
      },
      500
    );
  }
});

/**
 * GET /users/me/dashboard
 * Aggregated dashboard summary for creator and buyer:
 * - Counts: total assets (listings), approved, pending, rejected, purchasedAssets
 * - Revenue: grossSales, creatorEarnings (60%), platformFees (40%), availableBalance, withdrawnAmount
 * - Recent transactions (last 5 combined purchases and sales)
 * - Recent listings (last 4 created assets)
 * - Profile and bank status
 */
userRoutes.get('/me/dashboard', async (c) => {
  try {
    const sessionUser = c.get('user');

    // 1. Fetch user profile
    const [userRecord] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        phone: users.phone,
        role: users.role,
        isVerifiedSeller: users.isVerifiedSeller,
        bankName: users.bankName,
        bankAccountNumber: users.bankAccountNumber,
        bankAccountHolder: users.bankAccountHolder,
        bankBranch: users.bankBranch,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.id, sessionUser.userId), isNull(users.deletedAt)));

    if (!userRecord) {
      return c.json({ success: false, message: 'User tidak ditemukan' }, 404);
    }

    // 2. Fetch my assets count (listings uploaded by user)
    const myListings = await db
      .select({
        id: assets.id,
        title: assets.title,
        slug: assets.slug,
        status: assets.status,
        price: assets.price,
        assetType: assets.assetType,
        thumbnailUrl: assets.thumbnailUrl,
        downloadCount: assets.downloadCount,
        createdAt: assets.createdAt,
      })
      .from(assets)
      .where(and(eq(assets.sellerId, sessionUser.userId), isNull(assets.deletedAt)))
      .orderBy(desc(assets.createdAt));

    const totalListings = myListings.length;
    const approvedListings = myListings.filter((a) => a.status === 'approved').length;
    const pendingListings = myListings.filter((a) => a.status === 'pending').length;
    const rejectedListings = myListings.filter((a) => a.status === 'rejected').length;

    // 3. Fetch purchased assets count (paid transactions where buyer is user)
    const buyerTransactions = await db
      .select({
        id: transactions.id,
        invoiceNumber: transactions.invoiceNumber,
        totalAmount: transactions.totalAmount,
        status: transactions.status,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(and(eq(transactions.buyerId, sessionUser.userId), isNull(transactions.deletedAt)))
      .orderBy(desc(transactions.createdAt));

    const paidPurchases = buyerTransactions.filter((t) => t.status === 'paid');
    const totalPurchasedAssetsCount = paidPurchases.length;
    const totalSpent = paidPurchases.reduce((acc, t) => acc + Number(t.totalAmount || 0), 0);

    // 4. Fetch seller sales and 60% revenue calculation
    const soldItems = await db
      .select({
        itemId: transactionItems.id,
        price: transactionItems.price,
        sellerAmount: transactionItems.sellerAmount,
        platformAmount: transactionItems.platformAmount,
        transactionId: transactions.id,
        invoiceNumber: transactions.invoiceNumber,
        transactionStatus: transactions.status,
        createdAt: transactions.createdAt,
        assetTitle: assets.title,
        assetType: assets.assetType,
      })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .innerJoin(assets, eq(transactionItems.assetId, assets.id))
      .where(and(eq(transactionItems.sellerId, sessionUser.userId), isNull(transactions.deletedAt)))
      .orderBy(desc(transactions.createdAt));

    const paidSales = soldItems.filter((i) => i.transactionStatus === 'paid');
    const grossSales = paidSales.reduce((acc, i) => acc + Number(i.price || 0), 0);
    const creatorEarnings = paidSales.reduce(
      (acc, i) => acc + (i.sellerAmount ? Number(i.sellerAmount) : Math.round(Number(i.price) * 0.6)),
      0
    );
    const platformFees = grossSales - creatorEarnings;

    // 5. Fetch ledger for payouts & available balance
    const ledgerEntries = await db
      .select()
      .from(revenueLedger)
      .where(eq(revenueLedger.userId, sessionUser.userId))
      .orderBy(desc(revenueLedger.createdAt));

    const withdrawnAmount = ledgerEntries
      .filter((e) => e.entryType === 'withdrawal')
      .reduce((sum, e) => sum + Math.abs(Number(e.netAmount)), 0);

    const pendingWithdrawal = 0;

    const firstLedger = ledgerEntries[0];
    const availableBalance = firstLedger
      ? Math.max(0, Number(firstLedger.balanceAfter))
      : creatorEarnings;

    // 6. Recent activities (combined purchases & sales, top 6)
    const recentActivities: any[] = [];

    // Map buyer transactions
    for (const bt of buyerTransactions.slice(0, 10)) {
      recentActivities.push({
        id: bt.id,
        invoiceNumber: bt.invoiceNumber,
        role: 'buyer',
        title: 'Pembelian Aset Digital',
        amount: Number(bt.totalAmount),
        status: bt.status,
        createdAt: bt.createdAt,
      });
    }

    // Map seller items
    for (const st of paidSales.slice(0, 10)) {
      recentActivities.push({
        id: st.itemId,
        invoiceNumber: st.invoiceNumber,
        role: 'seller',
        title: st.assetTitle,
        assetType: st.assetType,
        amount: st.sellerAmount ? Number(st.sellerAmount) : Math.round(Number(st.price) * 0.6),
        status: 'paid',
        createdAt: st.createdAt,
      });
    }

    recentActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const topRecentTransactions = recentActivities.slice(0, 5);

    return c.json({
      success: true,
      data: {
        profile: userRecord,
        counts: {
          myListings: {
            total: totalListings,
            approved: approvedListings,
            pending: pendingListings,
            rejected: rejectedListings,
          },
          purchasedAssetsCount: totalPurchasedAssetsCount,
          totalSalesCount: paidSales.length,
        },
        revenue: {
          grossSales,
          creatorEarnings,
          platformFees,
          withdrawnAmount,
          pendingWithdrawal,
          availableBalance,
          totalSpent,
        },
        bankAccountConfigured: Boolean(userRecord.bankAccountNumber && userRecord.bankName),
        recentTransactions: topRecentTransactions,
        recentListings: myListings.slice(0, 4),
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard summary:', error);
    return c.json(
      { success: false, message: 'Gagal memuat dashboard summary', error: error?.message },
      500
    );
  }
});

/**
 * GET /users/me/payment-settings
 * Retrieve seller payment and bank account settings
 */
userRoutes.get('/me/payment-settings', async (c) => {
  try {
    const sessionUser = c.get('user');

    const [userRecord] = await db
      .select({
        id: users.id,
        name: users.name,
        bankName: users.bankName,
        bankAccountNumber: users.bankAccountNumber,
        bankAccountHolder: users.bankAccountHolder,
        bankBranch: users.bankBranch,
        bankSwiftOrCode: users.bankSwiftOrCode,
        isVerifiedSeller: users.isVerifiedSeller,
      })
      .from(users)
      .where(and(eq(users.id, sessionUser.userId), isNull(users.deletedAt)));

    if (!userRecord) {
      return c.json({ success: false, message: 'User tidak ditemukan' }, 404);
    }

    return c.json({
      success: true,
      data: {
        bankName: userRecord.bankName || null,
        bankAccountNumber: userRecord.bankAccountNumber || null,
        bankAccountHolder: userRecord.bankAccountHolder || null,
        bankBranch: userRecord.bankBranch || null,
        bankSwiftOrCode: userRecord.bankSwiftOrCode || null,
        isConfigured: Boolean(userRecord.bankName && userRecord.bankAccountNumber),
        isVerifiedSeller: userRecord.isVerifiedSeller,
      },
    });
  } catch (error: any) {
    console.error('Error fetching payment settings:', error);
    return c.json(
      { success: false, message: 'Gagal memuat pengaturan pembayaran', error: error?.message },
      500
    );
  }
});

/**
 * PUT & POST /users/me/payment-settings
 * Save or update seller's bank account payout destination
 */
const savePaymentSettingsHandler = async (c: any) => {
  try {
    const sessionUser = c.get('user');
    const body = await c.req.json();

    const paymentSettingsSchema = z.object({
      bankName: z.string().min(2, 'Nama bank minimal 2 karakter').max(100),
      bankAccountNumber: z.string().min(4, 'Nomor rekening minimal 4 digit').max(50),
      bankAccountHolder: z.string().min(2, 'Nama pemilik rekening minimal 2 karakter').max(150),
      bankBranch: z.string().max(100).optional().nullable(),
      bankSwiftOrCode: z.string().max(50).optional().nullable(),
    });

    const parsed = paymentSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || 'Data rekening tidak valid',
          errors: parsed.error.format(),
        },
        400
      );
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        bankName: parsed.data.bankName.trim(),
        bankAccountNumber: parsed.data.bankAccountNumber.trim(),
        bankAccountHolder: parsed.data.bankAccountHolder.trim(),
        bankBranch: parsed.data.bankBranch?.trim() || null,
        bankSwiftOrCode: parsed.data.bankSwiftOrCode?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, sessionUser.userId))
      .returning({
        id: users.id,
        bankName: users.bankName,
        bankAccountNumber: users.bankAccountNumber,
        bankAccountHolder: users.bankAccountHolder,
        bankBranch: users.bankBranch,
        bankSwiftOrCode: users.bankSwiftOrCode,
        isVerifiedSeller: users.isVerifiedSeller,
      });

    return c.json({
      success: true,
      message: 'Informasi rekening pembayaran berhasil disimpan.',
      data: {
        ...updatedUser,
        isConfigured: true,
      },
    });
  } catch (error: any) {
    console.error('Error saving payment settings:', error);
    return c.json(
      { success: false, message: 'Gagal menyimpan pengaturan pembayaran', error: error?.message },
      500
    );
  }
};

userRoutes.put('/me/payment-settings', savePaymentSettingsHandler);
userRoutes.post('/me/payment-settings', savePaymentSettingsHandler);

/**
 * DELETE /users/me/payment-settings
 * Unlink / delete bank account payout destination
 */
userRoutes.delete('/me/payment-settings', async (c) => {
  try {
    const sessionUser = c.get('user');

    await db
      .update(users)
      .set({
        bankName: null,
        bankAccountNumber: null,
        bankAccountHolder: null,
        bankBranch: null,
        bankSwiftOrCode: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, sessionUser.userId));

    return c.json({
      success: true,
      message: 'Informasi rekening pembayaran berhasil dihapus.',
      data: {
        bankName: null,
        bankAccountNumber: null,
        bankAccountHolder: null,
        bankBranch: null,
        bankSwiftOrCode: null,
        isConfigured: false,
      },
    });
  } catch (error: any) {
    console.error('Error deleting payment settings:', error);
    return c.json(
      { success: false, message: 'Gagal menghapus rekening pembayaran', error: error?.message },
      500
    );
  }
});

/**
 * GET /users/me/profile
 * Retrieve current user profile details
 */
userRoutes.get('/me/profile', async (c) => {
  try {
    const sessionUser = c.get('user');

    const [userRecord] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        phone: users.phone,
        role: users.role,
        isVerifiedSeller: users.isVerifiedSeller,
        bankName: users.bankName,
        bankAccountNumber: users.bankAccountNumber,
        bankAccountHolder: users.bankAccountHolder,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.id, sessionUser.userId), isNull(users.deletedAt)));

    if (!userRecord) {
      return c.json({ success: false, message: 'User tidak ditemukan' }, 404);
    }

    return c.json({
      success: true,
      data: userRecord,
    });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return c.json(
      { success: false, message: 'Gagal memuat profil', error: error?.message },
      500
    );
  }
});

/**
 * PUT /users/me/profile
 * Update user profile (name, bio, phone, avatarUrl)
 */
userRoutes.put('/me/profile', async (c) => {
  try {
    const sessionUser = c.get('user');
    const body = await c.req.json();

    const profileSchema = z.object({
      name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
      bio: z.string().max(500, 'Bio maksimal 500 karakter').optional().nullable(),
      phone: z.string().max(30, 'Nomor telepon maksimal 30 karakter').optional().nullable(),
      avatarUrl: z.string().max(1000, 'URL Avatar terlalu panjang').optional().nullable(),
    });

    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || 'Data profil tidak valid',
          errors: parsed.error.format(),
        },
        400
      );
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        name: parsed.data.name.trim(),
        bio: parsed.data.bio !== undefined ? parsed.data.bio?.trim() || null : undefined,
        phone: parsed.data.phone !== undefined ? parsed.data.phone?.trim() || null : undefined,
        avatarUrl: parsed.data.avatarUrl !== undefined ? parsed.data.avatarUrl?.trim() || null : undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, sessionUser.userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        phone: users.phone,
        role: users.role,
        isVerifiedSeller: users.isVerifiedSeller,
        bankName: users.bankName,
        bankAccountNumber: users.bankAccountNumber,
        bankAccountHolder: users.bankAccountHolder,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return c.json({
      success: true,
      message: 'Profil berhasil diperbarui.',
      data: updatedUser,
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return c.json(
      { success: false, message: 'Gagal memperbarui profil', error: error?.message },
      500
    );
  }
});

