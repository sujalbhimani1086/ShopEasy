import { prisma } from "@/lib/prisma";
import { requireApprovedCustomer } from "@/lib/api-auth";
import { calculateFinalPrice } from "@/lib/utils";

// ==========================================
// GET MY ORDERS
// ==========================================

export async function GET(request: Request) {
    const auth = await requireApprovedCustomer(request);
    if (auth.response) return auth.response;
    const user = auth.user;

    try {
        const orders =
            await prisma.order.findMany({
                where: {
                    userId: Number(user.id),
                },

                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    image: true,
                                },
                            },
                        },
                    },
                },

                orderBy: {
                    createdAt: "desc",
                },
            });

        const formattedOrders = orders.map((order) => ({
            ...order,
            items: order.items.map((item) => ({
                ...item,
                product: item.product ?? {
                    id: item.productId ?? 0,
                    name: item.productName || "Archived Product",
                    image: item.productImage || "/images/placeholder.png",
                },
            })),
        }));

        return Response.json(formattedOrders, {
            headers: {
                "Cache-Control":
                    "no-store, no-cache, must-revalidate",
                Pragma: "no-cache",
            },
        });
    } catch (error) {
        console.error(
            "FETCH ORDERS ERROR:",
            error
        );

        return Response.json(
            {
                message:
                    "Could not fetch orders.",
            },
            {
                status: 500,
            }
        );
    }
}

// ==========================================
// PLACE ORDER
// ==========================================

export async function POST(request: Request) {
    const auth = await requireApprovedCustomer(request);
    if (auth.response) return auth.response;
    const user = auth.user;

    try {
        const body =
            await request.json();

        const {
            name,
            email,
            address,
            city,
            pincode,
            items,
        } = body;

        // ==========================================
        // VALIDATE CUSTOMER DETAILS
        // ==========================================

        if (
            !name?.trim() ||
            !email?.trim() ||
            !address?.trim() ||
            !city?.trim() ||
            !pincode?.trim()
        ) {
            return Response.json(
                {
                    message:
                        "Please provide all delivery details.",
                },
                {
                    status: 400,
                }
            );
        }

        // ==========================================
        // VALIDATE CART
        // ==========================================

        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {
            return Response.json(
                {
                    message:
                        "Cart is empty.",
                },
                {
                    status: 400,
                }
            );
        }

        // ==========================================
        // CREATE ORDER + UPDATE STOCK
        // ==========================================

        const order =
            await prisma.$transaction(
                async (tx) => {
                    let total = 0;

                    const orderItems: {
                        productId: number;
                        productName?: string;
                        productImage?: string;
                        quantity: number;
                        price: number;
                    }[] = [];

                    // ==================================
                    // CHECK EVERY PRODUCT
                    // ==================================

                    for (const item of items) {
                        const productId =
                            Number(
                                item.productId
                            );

                        const quantity =
                            Number(
                                item.quantity
                            );

                        // Validate values
                        if (
                            !Number.isInteger(
                                productId
                            ) ||
                            !Number.isInteger(
                                quantity
                            ) ||
                            quantity <= 0
                        ) {
                            throw new Error(
                                "Invalid cart item."
                            );
                        }

                        // Find product
                        const product =
                            await tx.product.findUnique(
                                {
                                    where: {
                                        id: productId,
                                    },
                                }
                            );

                        if (!product) {
                            throw new Error(
                                "Product is no longer available."
                            );
                        }

                        // ==================================
                        // CHECK STOCK
                        // ==================================

                        if (product.stock <= 0) {
                            throw new Error(
                                `${product.name} is out of stock.`
                            );
                        }

                        if (product.stock < quantity) {
                            throw new Error(
                                `Only ${product.stock} item${product.stock === 1 ? "" : "s"} available.`
                            );
                        }

                        // ==================================
                        // CALCULATE FINAL PRICE
                        // ==================================

                        const finalPrice =
                            calculateFinalPrice(
                                product.price,
                                product.discount
                            );

                        total +=
                            finalPrice *
                            quantity;

                        // Save order item
                        orderItems.push({
                            productId:
                                product.id,
                            productName:
                                product.name,
                            productImage:
                                product.image,
                            quantity,
                            price:
                                finalPrice,
                        });

                        // ==================================
                        // DECREASE STOCK
                        // ==================================

                        const updated =
                            await tx.product.updateMany(
                                {
                                    where: {
                                        id: product.id,

                                        stock: {
                                            gte: quantity,
                                        },
                                    },

                                    data: {
                                        stock: {
                                            decrement:
                                                quantity,
                                        },
                                    },
                                }
                            );

                        if (
                            updated.count !== 1
                        ) {
                            throw new Error(
                                `${product.name} does not have enough stock.`
                            );
                        }
                    }

                    // ==================================
                    // CLEAR USER DATABASE CART
                    // ==================================

                    const userCart = await tx.cart.findUnique({
                        where: { userId: Number(user.id) },
                    });

                    if (userCart) {
                        await tx.cartItem.deleteMany({
                            where: { cartId: userCart.id },
                        });
                    }

                    // ==================================
                    // CREATE ORDER
                    // ==================================

                    return await tx.order.create(
                        {
                            data: {
                                userId:
                                    Number(
                                        user.id
                                    ),

                                name:
                                    name.trim(),

                                email:
                                    email.trim(),

                                address:
                                    address.trim(),

                                city:
                                    city.trim(),

                                pincode:
                                    pincode.trim(),

                                total,

                                status:
                                    "PENDING",

                                items: {
                                    create:
                                        orderItems,
                                },
                            },

                            include: {
                                items: true,
                            },
                        }
                    );
                }
            );

        // ==========================================
        // SUCCESS
        // ==========================================

        return Response.json(
            {
                success: true,

                message:
                    "Order placed successfully.",

                order,
            },
            {
                status: 201,

                headers: {
                    "Cache-Control":
                        "no-store",
                },
            }
        );
    } catch (error) {
        console.error(
            "CREATE ORDER ERROR:",
            error
        );

        return Response.json(
            {
                message:
                    error instanceof Error
                        ? error.message
                        : "Could not place order.",
            },
            {
                status: 400,
            }
        );
    }
}