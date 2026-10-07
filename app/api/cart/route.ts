import { prisma } from "@/lib/prisma";
import { requireApprovedCustomer } from "@/lib/api-auth";

/**
 * GET /api/cart
 * Returns the current authenticated user's cart items from the database.
 */
export async function GET(request: Request) {
    const auth = await requireApprovedCustomer(request);
    if (auth.response) return auth.response;
    const user = auth.user;

    try {
        const userId = Number(user.id);

        const cart = await prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                    orderBy: {
                        id: "asc",
                    },
                },
            },
        });

        if (!cart) {
            return Response.json({
                items: [],
            });
        }

        const formattedItems = cart.items.map((item) => ({
            id: item.product.id,
            productId: item.productId,
            name: item.product.name,
            price: item.product.price,
            discount: item.product.discount,
            category: item.product.category,
            image: item.product.image,
            stock: item.product.stock,
            quantity: item.quantity,
        }));

        return Response.json({
            id: cart.id,
            items: formattedItems,
        });
    } catch (error) {
        console.error("GET CART ERROR:", error);
        return Response.json(
            { message: "Failed to fetch cart" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/cart
 * Synchronizes the user's cart items into the database.
 * Accepts: { items: { productId: number, quantity: number }[] }
 */
export async function PUT(request: Request) {
    const auth = await requireApprovedCustomer(request);
    if (auth.response) return auth.response;
    const user = auth.user;

    try {
        const userId = Number(user.id);
        const body = await request.json();
        const rawItems = Array.isArray(body.items) ? body.items : [];

        // Validate and sanitize items
        const sanitizedItems: { productId: number; quantity: number }[] = [];
        for (const item of rawItems) {
            const productId = Number(item.productId ?? item.id);
            const quantity = Math.max(1, Number(item.quantity) || 1);
            if (Number.isInteger(productId) && productId > 0) {
                sanitizedItems.push({ productId, quantity });
            }
        }

        // Verify products exist
        let validItems: { productId: number; quantity: number }[] = [];
        if (sanitizedItems.length > 0) {
            const productIds = sanitizedItems.map((i) => i.productId);
            const existingProducts = await prisma.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, stock: true },
            });
            const validIdMap = new Map(existingProducts.map((p) => [p.id, p.stock]));

            validItems = sanitizedItems
                .filter((i) => validIdMap.has(i.productId))
                .map((i) => {
                    const maxStock = validIdMap.get(i.productId) ?? 999;
                    return {
                        productId: i.productId,
                        quantity: Math.min(i.quantity, Math.max(1, maxStock)),
                    };
                });
        }

        // Upsert cart and replace items in transaction
        await prisma.$transaction(async (tx) => {
            const cart = await tx.cart.upsert({
                where: { userId },
                create: { userId },
                update: {},
            });

            // Remove existing cart items
            await tx.cartItem.deleteMany({
                where: { cartId: cart.id },
            });

            // Insert new cart items
            if (validItems.length > 0) {
                // Ensure unique productId per cart
                const uniqueMap = new Map<number, number>();
                for (const item of validItems) {
                    uniqueMap.set(item.productId, (uniqueMap.get(item.productId) ?? 0) + item.quantity);
                }

                await tx.cartItem.createMany({
                    data: Array.from(uniqueMap.entries()).map(([productId, quantity]) => ({
                        cartId: cart.id,
                        productId,
                        quantity,
                    })),
                });
            }
        });

        return Response.json({
            success: true,
            message: "Cart synchronized successfully",
            count: validItems.length,
        });
    } catch (error) {
        console.error("SYNC CART ERROR:", error);
        return Response.json(
            { message: "Failed to synchronize cart" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/cart
 * Clears all cart items for the logged-in user.
 */
export async function DELETE(request: Request) {
    const auth = await requireApprovedCustomer(request);
    if (auth.response) return auth.response;
    const user = auth.user;

    try {
        const userId = Number(user.id);
        const cart = await prisma.cart.findUnique({
            where: { userId },
        });

        if (cart) {
            await prisma.cartItem.deleteMany({
                where: { cartId: cart.id },
            });
        }

        return Response.json({
            success: true,
            message: "Cart cleared successfully",
        });
    } catch (error) {
        console.error("CLEAR CART ERROR:", error);
        return Response.json(
            { message: "Failed to clear cart" },
            { status: 500 }
        );
    }
}
