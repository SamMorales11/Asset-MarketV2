import { Hono } from 'hono';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { carts, cartItems, assets, categories, users, transactions, transactionItems } from '../db/schema.js';
import { authMiddleware } from '../middleware/index.js';
import { Errors, handleError } from '../lib/errors.js';
import { formatAssetUrls } from '../utils/url.js';

export const cartRoutes = new Hono();

// All cart actions require authenticated user
cartRoutes.use('*', authMiddleware);

/**
 * Helper to retrieve existing user cart or auto-create one
 */
async function getOrCreateCart(userId: string) {
  const [existingCart] = await db
    .select()
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);

  if (existingCart) {
    return existingCart;
  }

  const [newCart] = await db
    .insert(carts)
    .values({ userId })
    .returning();

  if (!newCart) {
    throw new Error('Failed to initialize cart for user');
  }

  return newCart;
}

/**
 * GET /cart
 * Retrieve current user's shopping cart with full item metadata & calculated totals
 */
cartRoutes.get('/', async (c) => {
  try {
    const sessionUser = c.get('user');
    const cart = await getOrCreateCart(sessionUser.userId);

    // Fetch all items currently in cart
    const items = await db
      .select({
        cartItemId: cartItems.id,
        priceAtAddition: cartItems.priceAtAddition,
        addedAt: cartItems.createdAt,
        asset: {
          id: assets.id,
          title: assets.title,
          slug: assets.slug,
          shortDescription: assets.shortDescription,
          assetType: assets.assetType,
          status: assets.status,
          price: assets.price,
          discountPrice: assets.discountPrice,
          currency: assets.currency,
          thumbnailUrl: assets.thumbnailUrl,
          sellerId: assets.sellerId,
        },
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
        seller: {
          id: users.id,
          name: users.name,
          isVerifiedSeller: users.isVerifiedSeller,
        },
      })
      .from(cartItems)
      .innerJoin(assets, eq(cartItems.assetId, assets.id))
      .innerJoin(categories, eq(assets.categoryId, categories.id))
      .innerJoin(users, eq(assets.sellerId, users.id))
      .where(and(eq(cartItems.cartId, cart.id), isNull(assets.deletedAt)));

    // Calculate subtotal from current prices (discountPrice prioritized)
    const formattedItems = items.map((item) => {
      const effectivePrice = item.asset.discountPrice
        ? Number(item.asset.discountPrice)
        : Number(item.asset.price);

      return {
        id: item.cartItemId,
        cartItemId: item.cartItemId,
        assetId: item.asset.id,
        effectivePrice,
        priceAtAddition: Number(item.priceAtAddition),
        addedAt: item.addedAt,
        asset: {
          ...formatAssetUrls(item.asset),
          price: Number(item.asset.price),
          discountPrice: item.asset.discountPrice ? Number(item.asset.discountPrice) : null,
          category: item.category,
          seller: item.seller,
        },
      };
    });

    const subtotal = formattedItems.reduce((acc, item) => acc + item.effectivePrice, 0);
    const platformFee = 0; // Free platform fee for buyers
    const totalAmount = subtotal + platformFee;

    return c.json({
      success: true,
      data: {
        cartId: cart.id,
        items: formattedItems,
        itemCount: formattedItems.length,
        subtotal,
        platformFee,
        totalAmount,
      },
    });
  } catch (error: any) {
    const appError = handleError(error, 'Cart/get');
    return c.json(appError.toJSON(), appError.statusCode);
  }
});

/**
 * Add an asset item to user's cart (supported on both POST /cart/items and POST /cart)
 */
const handleAddToCart = async (c: any) => {
  try {
    const sessionUser = c.get('user');
    const body = await c.req.json();
    const assetId = (body.assetId as string || '').trim();

    if (!assetId) {
      return c.json(
        {
          success: false,
          message: 'Asset ID is required',
        },
        400
      );
    }

    // Verify asset existence, active state, and approval status
    const [asset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, assetId), isNull(assets.deletedAt)))
      .limit(1);

    if (!asset) {
      return c.json(
        {
          success: false,
          message: 'Asset not found or no longer available',
        },
        404
      );
    }

    if (asset.status !== 'approved') {
      return c.json(
        {
          success: false,
          message: 'This asset is currently pending review and cannot be added to cart',
        },
        400
      );
    }

    // Business rule: User cannot purchase their own asset
    if (asset.sellerId === sessionUser.userId) {
      return c.json(
        {
          success: false,
          message: 'You cannot purchase an asset that you have published yourself',
        },
        400
      );
    }

    // Check if user has already purchased this asset in a paid transaction
    const [alreadyPurchased] = await db
      .select({ id: transactionItems.id })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.buyerId, sessionUser.userId),
          eq(transactions.status, 'paid'),
          eq(transactionItems.assetId, assetId)
        )
      )
      .limit(1);

    if (alreadyPurchased) {
      return c.json(
        {
          success: false,
          message: 'You have already purchased this asset. You can access it anytime in My Assets.',
        },
        400
      );
    }

    const cart = await getOrCreateCart(sessionUser.userId);

    // Check if already in cart
    const [existingItem] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.assetId, assetId)))
      .limit(1);

    if (existingItem) {
      return c.json(
        {
          success: true,
          message: 'Item is already in your cart',
          data: {
            cartItemId: existingItem.id,
            alreadyInCart: true,
          },
        },
        200
      );
    }

    const effectivePrice = asset.discountPrice ?? asset.price;

    const [newItem] = await db
      .insert(cartItems)
      .values({
        cartId: cart.id,
        assetId: asset.id,
        priceAtAddition: effectivePrice.toString(),
      })
      .returning();

    if (!newItem) {
      throw new Error('Failed to insert item into cart');
    }

    return c.json(
      {
        success: true,
        message: `"${asset.title}" added to your cart`,
        data: {
          cartItemId: newItem.id,
          assetId: newItem.assetId,
          priceAtAddition: Number(newItem.priceAtAddition),
        },
      },
      201
    );
  } catch (error: any) {
    const appError = handleError(error, 'Cart/add');
    return c.json(appError.toJSON(), appError.statusCode);
  }
};

cartRoutes.post('/', handleAddToCart);
cartRoutes.post('/items', handleAddToCart);

/**
 * DELETE /cart/items/:id
 * Remove item from user's cart (accepts either cartItemId or assetId)
 */
cartRoutes.delete('/items/:id', async (c) => {
  try {
    const sessionUser = c.get('user');
    const itemIdOrAssetId = c.req.param('id');
    const cart = await getOrCreateCart(sessionUser.userId);

    // Attempt removal by cart_item id or asset_id
    const deleted = await db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cart.id),
          eq(cartItems.id, itemIdOrAssetId)
        )
      )
      .returning();

    if (deleted.length === 0) {
      // Try deleting by assetId
      const deletedByAsset = await db
        .delete(cartItems)
        .where(
          and(
            eq(cartItems.cartId, cart.id),
            eq(cartItems.assetId, itemIdOrAssetId)
          )
        )
        .returning();

      if (deletedByAsset.length === 0) {
        return c.json(
          {
            success: false,
            message: 'Item not found in your cart',
          },
          404
        );
      }
    }

    return c.json({
      success: true,
      message: 'Item removed from your cart',
    });
  } catch (error: any) {
    const appError = handleError(error, 'Cart/remove');
    return c.json(appError.toJSON(), appError.statusCode);
  }
});

/**
 * DELETE /cart/clear
 * Remove all items from user's cart
 */
cartRoutes.delete('/clear', async (c) => {
  try {
    const sessionUser = c.get('user');
    const cart = await getOrCreateCart(sessionUser.userId);

    await db
      .delete(cartItems)
      .where(eq(cartItems.cartId, cart.id));

    return c.json({
      success: true,
      message: 'Cart cleared successfully',
    });
  } catch (error: any) {
    const appError = handleError(error, 'Cart/clear');
    return c.json(appError.toJSON(), appError.statusCode);
  }
});
