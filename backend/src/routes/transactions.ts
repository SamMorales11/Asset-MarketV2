import { Hono } from 'hono';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { Readable } from 'stream';
import { eq, and, desc, isNull, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  transactions,
  transactionItems,
  paymentConfirmations,
  assets,
  assetFiles,
  categories,
  users,
  carts,
  cartItems,
} from '../db/schema.js';
import { authMiddleware } from '../middleware/index.js';
import { Errors, handleError, logError } from '../lib/errors.js';
import { assetFileService } from '../services/assetFileService.js';
import { toAbsoluteUrl, formatAssetUrls } from '../utils/url.js';

export const transactionRoutes = new Hono();

// Apply auth middleware to transaction and checkout routes
transactionRoutes.use('/checkout', authMiddleware);
transactionRoutes.use('/transactions/*', authMiddleware);
transactionRoutes.use('/payments/*', authMiddleware);
transactionRoutes.use('/purchases/*', authMiddleware);

const ALLOWED_RECEIPT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];
const MAX_RECEIPT_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Standard Bank Accounts for Manual Transfer (Asset Market Escrow)
 */
const DESTINATION_BANK_ACCOUNTS = [
  {
    bank: 'BCA',
    bankName: 'Bank Central Asia',
    accountNumber: '8271992011',
    formattedAccountNumber: '8271-9920-11',
    accountHolder: 'PT ASSET MARKET INDONESIA',
    badge: 'Verifikasi Cepat',
    instructions: 'Gunakan fitur Transfer Antar Rekening BCA atau Realtime Online Transfer.',
  },
  {
    bank: 'Mandiri',
    bankName: 'Bank Mandiri',
    accountNumber: '1370098213321',
    formattedAccountNumber: '137-00-9821-3321',
    accountHolder: 'PT ASSET MARKET INDONESIA',
    badge: 'BI-FAST Ready',
    instructions: 'Pilih Transfer Antar Bank Mandiri atau transfer BI-FAST (Rp 2.500).',
  },
  {
    bank: 'BRI',
    bankName: 'Bank Rakyat Indonesia',
    accountNumber: '034101002931508',
    formattedAccountNumber: '0341-01-002931-50-8',
    accountHolder: 'PT ASSET MARKET INDONESIA',
    badge: 'BRIMO',
    instructions: 'Pilih Transfer Rekening BRI melalui BRIMO, ATM, atau Teller.',
  },
];

/**
 * Helper to generate human-readable invoice code
 * e.g. INV-20261001-K9X2A
 */
function generateInvoiceNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${dateStr}-${rand}`;
}

/**
 * POST /checkout
 * Initialize checkout process either from user's active Cart or direct "Buy Now"
 */
transactionRoutes.post('/checkout', async (c) => {
  try {
    const sessionUser = c.get('user');
    const body = await c.req.json();
    const source = (body.source as 'cart' | 'buy_now') || 'cart';
    const singleAssetId = body.assetId as string | undefined;

    interface CheckoutItem {
      assetId: string;
      sellerId: string;
      title: string;
      price: number;
    }

    const itemsToProcess: CheckoutItem[] = [];

    if (source === 'buy_now') {
      if (!singleAssetId) {
        return c.json({ success: false, message: 'Asset ID is required for direct Buy Now' }, 400);
      }

      const [asset] = await db
        .select()
        .from(assets)
        .where(and(eq(assets.id, singleAssetId), isNull(assets.deletedAt)))
        .limit(1);

      if (!asset) {
        return c.json({ success: false, message: 'Asset not found or no longer available' }, 404);
      }

      if (asset.status !== 'approved') {
        return c.json(
          { success: false, message: 'This asset is pending review and cannot be purchased' },
          400
        );
      }

      if (asset.sellerId === sessionUser.userId) {
        return c.json({ success: false, message: 'You cannot purchase your own asset' }, 400);
      }

      // Check if already purchased
      const [existingPurchase] = await db
        .select({ id: transactionItems.id })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
        .where(
          and(
            eq(transactions.buyerId, sessionUser.userId),
            eq(transactions.status, 'paid'),
            eq(transactionItems.assetId, asset.id)
          )
        )
        .limit(1);

      if (existingPurchase) {
        return c.json(
          {
            success: false,
            message: 'You have already purchased this asset. You can download it directly from My Assets.',
          },
          400
        );
      }

      const effectivePrice = asset.discountPrice ? Number(asset.discountPrice) : Number(asset.price);
      itemsToProcess.push({
        assetId: asset.id,
        sellerId: asset.sellerId,
        title: asset.title,
        price: effectivePrice,
      });
    } else {
      // Source: Cart
      const [cart] = await db
        .select()
        .from(carts)
        .where(eq(carts.userId, sessionUser.userId))
        .limit(1);

      if (!cart) {
        return c.json({ success: false, message: 'Cart is empty. Please add items before checkout.' }, 400);
      }

      const currentCartItems = await db
        .select({
          cartItemId: cartItems.id,
          asset: {
            id: assets.id,
            title: assets.title,
            price: assets.price,
            discountPrice: assets.discountPrice,
            sellerId: assets.sellerId,
            status: assets.status,
          },
        })
        .from(cartItems)
        .innerJoin(assets, eq(cartItems.assetId, assets.id))
        .where(and(eq(cartItems.cartId, cart.id), isNull(assets.deletedAt)));

      if (currentCartItems.length === 0) {
        return c.json({ success: false, message: 'Your cart is empty' }, 400);
      }

      for (const item of currentCartItems) {
        if (item.asset.sellerId === sessionUser.userId) {
          continue; // exclude own items
        }
        if (item.asset.status !== 'approved') {
          continue; // exclude non-approved
        }

        const effectivePrice = item.asset.discountPrice
          ? Number(item.asset.discountPrice)
          : Number(item.asset.price);

        itemsToProcess.push({
          assetId: item.asset.id,
          sellerId: item.asset.sellerId,
          title: item.asset.title,
          price: effectivePrice,
        });
      }

      if (itemsToProcess.length === 0) {
        return c.json(
          {
            success: false,
            message: 'No eligible items found in cart for checkout (items must be approved and cannot be created by yourself)',
          },
          400
        );
      }
    }

    // Financial Calculation
    const subtotal = itemsToProcess.reduce((sum, item) => sum + item.price, 0);
    const taxAmount = 0;
    const totalAmount = subtotal + taxAmount;

    // Expiration: 24 hours from creation
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const invoiceNumber = generateInvoiceNumber();

    // 1. Create Transaction Header
    const [newTx] = await db
      .insert(transactions)
      .values({
        invoiceNumber,
        buyerId: sessionUser.userId,
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        status: 'pending',
        paymentMethod: 'manual_transfer',
        expiresAt,
        notes: `Manual Bank Transfer Order (${itemsToProcess.length} item(s))`,
      })
      .returning();

    if (!newTx) {
      throw new Error('Failed to create transaction record');
    }

    // 2. Insert Transaction Items with strict 60/40 Revenue Share Split Model
    for (const item of itemsToProcess) {
      const sellerAmount = Number((item.price * 0.6).toFixed(2));
      const platformAmount = Number((item.price * 0.4).toFixed(2));

      await db.insert(transactionItems).values({
        transactionId: newTx.id,
        assetId: item.assetId,
        sellerId: item.sellerId,
        price: item.price.toFixed(2),
        sellerRatePercent: '60.00',
        platformRatePercent: '40.00',
        sellerAmount: sellerAmount.toFixed(2),
        platformAmount: platformAmount.toFixed(2),
        licenseType: 'standard',
      });
    }

    // 3. If checkout source was cart, empty the user's cart items
    if (source === 'cart') {
      const [userCart] = await db
        .select({ id: carts.id })
        .from(carts)
        .where(eq(carts.userId, sessionUser.userId))
        .limit(1);

      if (userCart) {
        await db.delete(cartItems).where(eq(cartItems.cartId, userCart.id));
      }
    }

    const tx = newTx;

    return c.json(
      {
        success: true,
        message: 'Order created successfully. Please complete the bank transfer within 24 hours.',
        data: {
          transactionId: tx.id,
          invoiceNumber: tx.invoiceNumber,
          subtotal: Number(tx.subtotal),
          taxAmount: Number(tx.taxAmount),
          totalAmount: Number(tx.totalAmount),
          status: tx.status,
          expiresAt: tx.expiresAt,
          destinationAccounts: DESTINATION_BANK_ACCOUNTS,
        },
      },
      201
    );
  } catch (error: any) {
    const appError = handleError(error, 'Checkout');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * GET /transactions
 * Retrieve transaction history for current authenticated user
 */
transactionRoutes.get('/transactions', async (c) => {
  try {
    const sessionUser = c.get('user');
    const userTxs = await db
      .select({
        id: transactions.id,
        invoiceNumber: transactions.invoiceNumber,
        totalAmount: transactions.totalAmount,
        status: transactions.status,
        createdAt: transactions.createdAt,
        paidAt: transactions.paidAt,
      })
      .from(transactions)
      .where(and(eq(transactions.buyerId, sessionUser.userId), isNull(transactions.deletedAt)))
      .orderBy(desc(transactions.createdAt));

    return c.json({
      success: true,
      data: {
        transactions: userTxs,
        totalCount: userTxs.length,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Transactions/list');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * GET /transactions/:invoiceNumber
 * Retrieve invoice status, items, expiration timer, destination bank accounts, and transfer instructions
 */
transactionRoutes.get('/transactions/:invoiceNumber', async (c) => {
  try {
    const sessionUser = c.get('user');
    const invoiceNumber = c.req.param('invoiceNumber');

    // Retrieve Transaction Header
    const [tx] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.invoiceNumber, invoiceNumber), isNull(transactions.deletedAt)))
      .limit(1);

    if (!tx) {
      return c.json({ success: false, message: 'Invoice not found' }, 404);
    }

    // Authorization: User must be buyer or admin
    if (tx.buyerId !== sessionUser.userId && sessionUser.role !== 'admin' && sessionUser.role !== 'superadmin') {
      return c.json({ success: false, message: 'Unauthorized access to this transaction' }, 403);
    }

    // Retrieve Transaction Items with Asset & Creator Details
    const items = await db
      .select({
        id: transactionItems.id,
        assetId: transactionItems.assetId,
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
          shortDescription: assets.shortDescription,
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

    // Retrieve Payment Confirmation (if submitted)
    const [latestConfirmation] = await db
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
          buyerId: tx.buyerId,
          subtotal: Number(tx.subtotal),
          taxAmount: Number(tx.taxAmount),
          totalAmount: Number(tx.totalAmount),
          status: tx.status,
          paymentMethod: tx.paymentMethod,
          paidAt: tx.paidAt,
          expiresAt: tx.expiresAt,
          notes: tx.notes,
          createdAt: tx.createdAt,
          isExpired: tx.expiresAt ? new Date(tx.expiresAt) < new Date() && tx.status === 'pending' : false,
        },
        items: items.map((i) => ({
          ...i,
          price: Number(i.price),
          sellerAmount: Number(i.sellerAmount),
          platformAmount: Number(i.platformAmount),
          asset: formatAssetUrls(i.asset),
        })),
        paymentConfirmation: latestConfirmation
          ? {
              id: latestConfirmation.id,
              senderBank: latestConfirmation.senderBank,
              senderAccountNumber: latestConfirmation.senderAccountNumber,
              senderAccountName: latestConfirmation.senderAccountName,
              destinationBank: latestConfirmation.destinationBank,
              transferAmount: Number(latestConfirmation.transferAmount),
              transferDate: latestConfirmation.transferDate,
              proofImageUrl: toAbsoluteUrl(latestConfirmation.proofImageUrl),
              status: latestConfirmation.status,
              rejectionReason: latestConfirmation.rejectionReason,
              verifiedAt: latestConfirmation.verifiedAt,
              createdAt: latestConfirmation.createdAt,
            }
          : null,
        destinationAccounts: DESTINATION_BANK_ACCOUNTS,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Transactions/detail');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * POST /payments/confirm
 * Submit payment confirmation with manual transfer receipt slip image
 */
transactionRoutes.post('/payments/confirm', async (c) => {
  let proofImageUrl: string | undefined;

  try {
    const sessionUser = c.get('user');
    const formData = await c.req.formData();

    const invoiceNumber = (formData.get('invoiceNumber') as string || '').trim();
    const senderBank = (formData.get('senderBank') as string || '').trim();
    const senderAccountNumber = (formData.get('senderAccountNumber') as string || '').trim();
    const senderAccountName = (formData.get('senderAccountName') as string || '').trim();
    const destinationBank = (formData.get('destinationBank') as string || '').trim();
    const transferAmountStr = (formData.get('transferAmount') as string || '').trim();
    const transferDateStr = (formData.get('transferDate') as string || '').trim();
    const proofFile = formData.get('proofImage') as unknown as File | null;

    if (!invoiceNumber) {
      return c.json({ success: false, message: 'Invoice number is required' }, 400);
    }
    if (!senderBank || !senderAccountNumber || !senderAccountName || !destinationBank) {
      return c.json(
        {
          success: false,
          message: 'Please provide all bank transfer details (bank name, account number, sender name, destination)',
        },
        400
      );
    }

    const transferAmount = parseFloat(transferAmountStr);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return c.json({ success: false, message: 'Please provide a valid transfer amount' }, 400);
    }

    if (!proofFile || !(proofFile instanceof File) || proofFile.size === 0) {
      return c.json({ success: false, message: 'A photo or screenshot of the transfer receipt is required' }, 400);
    }

    if (!ALLOWED_RECEIPT_TYPES.includes(proofFile.type)) {
      return c.json(
        {
          success: false,
          message: 'Invalid receipt file type. Allowed formats: JPG, PNG, WEBP, GIF, SVG',
        },
        400
      );
    }

    if (proofFile.size > MAX_RECEIPT_SIZE) {
      return c.json({ success: false, message: 'Receipt image exceeds maximum size of 10MB' }, 400);
    }

    // Lookup Transaction
    const [tx] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.invoiceNumber, invoiceNumber), isNull(transactions.deletedAt)))
      .limit(1);

    if (!tx) {
      return c.json({ success: false, message: 'Invoice not found' }, 404);
    }

    if (tx.buyerId !== sessionUser.userId) {
      return c.json({ success: false, message: 'You are not authorized to submit confirmation for this invoice' }, 403);
    }

    if (tx.status === 'paid') {
      return c.json({ success: false, message: 'This transaction has already been paid and verified' }, 400);
    }

    // Save proof image slip to disk
    const fileExt = path.extname(proofFile.name) || '.jpg';
    const proofFileName = `receipt-${crypto.randomUUID()}${fileExt}`;
    const proofUploadDir = path.resolve(process.cwd(), 'uploads/payments');
    await fs.mkdir(proofUploadDir, { recursive: true });

    const proofBuffer = Buffer.from(await proofFile.arrayBuffer());
    await fs.writeFile(path.join(proofUploadDir, proofFileName), proofBuffer);
    const proofImageUrl = `/uploads/payments/${proofFileName}`;

    const parsedTransferDate = transferDateStr ? new Date(transferDateStr) : new Date();

    // Insert payment confirmation
    const [confirmation] = await db
      .insert(paymentConfirmations)
      .values({
        transactionId: tx.id,
        userId: sessionUser.userId,
        senderBank,
        senderAccountNumber,
        senderAccountName,
        destinationBank,
        transferAmount: transferAmount.toFixed(2),
        transferDate: parsedTransferDate,
        proofImageUrl,
        status: 'pending',
      })
      .returning();

    if (!confirmation) {
      throw new Error('Failed to record payment confirmation');
    }

    // Update Transaction status to 'processing'
    await db
      .update(transactions)
      .set({
        status: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, tx.id));

    return c.json(
      {
        success: true,
        message: 'Payment confirmation submitted successfully! Admin will verify your transfer shortly.',
        data: {
          confirmationId: confirmation.id,
          invoiceNumber: tx.invoiceNumber,
          status: 'processing',
          proofImageUrl: toAbsoluteUrl(proofImageUrl),
        },
      },
      201
    );
  } catch (error: any) {
    // Cleanup uploaded receipt if confirmation fails
    if (proofImageUrl) {
      logError(`Cleanup orphan receipt: ${proofImageUrl}`, 'Payments/confirm');
    }
    const appError = handleError(error, 'Payments/confirm');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * GET /purchases/my
 * Retrieve all assets purchased by the buyer across all verified 'paid' transactions
 */
transactionRoutes.get('/purchases/my', async (c) => {
  try {
    const sessionUser = c.get('user');

    // Query paid transactions of current user
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

    // Fetch deliverable files for each purchased asset
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
          fileExtension: assetFiles.fileExtension,
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

    const formattedPurchases = paidItems.map((item) => ({
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
        purchases: formattedPurchases,
        totalPurchased: formattedPurchases.length,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Purchases/list');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * GET /purchases/download/:fileId
 * Securely stream and download binary asset deliverable by file ID (validates purchase ownership)
 */
transactionRoutes.get('/purchases/download/:fileId', async (c) => {
  try {
    const sessionUser = c.get('user');
    const fileId = c.req.param('fileId');

    const perm = await assetFileService.checkDownloadPermission(fileId, sessionUser);
    if (!perm.allowed || !perm.file || !perm.asset) {
      return c.json(
        {
          success: false,
          message: perm.reason || 'Akses ditolak: Anda belum membeli atau mengklaim aset ini.',
        },
        perm.statusCode as any
      );
    }

    const download = await assetFileService.streamDownload(perm.file, perm.asset);

    const headers: Record<string, string> = {
      'Content-Type': download.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${download.fileName.replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(download.fileName)}`,
      'Content-Length': download.fileSizeBytes.toString(),
      'Cache-Control': 'private, no-transform, no-store',
    };

    if (download.stream) {
      return c.body(Readable.toWeb(download.stream) as any, 200, headers);
    }
    return c.body(download.buffer as any, 200, headers);
  } catch (error: any) {
    logError(error, 'Purchases/download');
    const isNotFound = error?.message?.includes('File not found') || error?.message?.includes('tidak ditemukan');
    const appError = isNotFound
      ? Errors.notFound('File not found on storage server. Please contact support.')
      : Errors.internal('Failed to download asset file');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * GET /purchases/assets/:assetId/download
 * Securely stream and download main asset deliverable package by asset ID
 */
transactionRoutes.get('/purchases/assets/:assetId/download', async (c) => {
  try {
    const sessionUser = c.get('user');
    const assetId = c.req.param('assetId');

    const perm = await assetFileService.checkAssetDownloadPermission(assetId, sessionUser);
    if (!perm.allowed || !perm.file || !perm.asset) {
      return c.json(
        {
          success: false,
          message: perm.reason || 'Akses ditolak: Anda belum membeli atau mengklaim aset ini.',
        },
        perm.statusCode as any
      );
    }

    const download = await assetFileService.streamDownload(perm.file, perm.asset);

    const headers: Record<string, string> = {
      'Content-Type': download.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${download.fileName.replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(download.fileName)}`,
      'Content-Length': download.fileSizeBytes.toString(),
      'Cache-Control': 'private, no-transform, no-store',
    };

    if (download.stream) {
      return c.body(Readable.toWeb(download.stream) as any, 200, headers);
    }
    return c.body(download.buffer as any, 200, headers);
  } catch (error: any) {
    logError(error, 'Purchases/assets/download');
    const isNotFound = error?.message?.includes('File not found') || error?.message?.includes('tidak ditemukan');
    const appError = isNotFound
      ? Errors.notFound('File not found on storage server. Please contact support.')
      : Errors.internal('Failed to download asset package');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});

/**
 * POST /purchases/claim/:assetId
 * Explicitly claim a free digital asset into My Assets
 */
transactionRoutes.post('/purchases/claim/:assetId', async (c) => {
  try {
    const sessionUser = c.get('user');
    const assetId = c.req.param('assetId');

    const [asset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, assetId), isNull(assets.deletedAt)))
      .limit(1);

    if (!asset) {
      return c.json({ success: false, message: 'Aset tidak ditemukan' }, 404);
    }

    if (asset.status !== 'approved') {
      return c.json({ success: false, message: 'Aset belum disetujui untuk diklaim' }, 400);
    }

    if (asset.sellerId === sessionUser.userId) {
      return c.json({ success: false, message: 'Anda adalah pemilik aset ini' }, 400);
    }

    const effectivePrice = asset.discountPrice ? Number(asset.discountPrice) : Number(asset.price);
    if (effectivePrice > 0) {
      return c.json({ success: false, message: 'Aset ini berbayar dan harus dibeli melalui checkout' }, 400);
    }

    // Check if already claimed / purchased
    const [existing] = await db
      .select({ id: transactionItems.id, invoiceNumber: transactions.invoiceNumber })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.buyerId, sessionUser.userId),
          eq(transactions.status, 'paid'),
          eq(transactionItems.assetId, asset.id)
        )
      )
      .limit(1);

    if (existing) {
      return c.json({
        success: true,
        message: 'Aset sudah ada di perpustakaan My Assets Anda',
        data: { invoiceNumber: existing.invoiceNumber, assetId: asset.id },
      });
    }

    const invoiceNumber = `INV-FREE-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const [tx] = await db
      .insert(transactions)
      .values({
        invoiceNumber,
        buyerId: sessionUser.userId,
        subtotal: '0.00',
        taxAmount: '0.00',
        totalAmount: '0.00',
        status: 'paid',
        paidAt: new Date(),
        paymentMethod: 'manual_transfer',
        notes: 'Free Digital Asset Claim',
      })
      .returning();

    if (!tx) {
      throw new Error('Gagal mencatat transaksi klaim aset');
    }

    await db.insert(transactionItems).values({
      transactionId: tx.id,
      assetId: asset.id,
      sellerId: asset.sellerId,
      price: '0.00',
      sellerRatePercent: '60.00',
      platformRatePercent: '40.00',
      sellerAmount: '0.00',
      platformAmount: '0.00',
      licenseType: 'standard',
    });

    return c.json(
      {
        success: true,
        message: 'Aset gratis berhasil diklaim dan ditambahkan ke My Assets!',
        data: {
          invoiceNumber,
          asset: formatAssetUrls(asset),
        },
      },
      201
    );
  } catch (error: any) {
    const appError = handleError(error, 'Purchases/claim');
    return c.json(appError.toJSON(), appError.statusCode as any);
  }
});
