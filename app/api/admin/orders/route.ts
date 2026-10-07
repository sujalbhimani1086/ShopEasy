import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { ADMIN_ORDER_STATUSES } from "@/lib/types";

// ==========================================
// CHECK ADMIN
// ==========================================

const checkAdmin = requireAdmin;

// ==========================================
// GET ALL ORDERS
// ==========================================

export async function GET(request: Request) {
    const authError = await checkAdmin(request);

    if (authError) return authError;

    try {
        const orders =
            await prisma.order.findMany({
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },

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
            },
        });
    } catch (error) {
        console.error(
            "ADMIN FETCH ORDERS ERROR:",
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
// UPDATE ORDER STATUS
// ==========================================

export async function PUT(request: Request) {
    const authError = await checkAdmin(request);

    if (authError) return authError;

    try {
        const body =
            await request.json();

        const orderId = Number(
            body.orderId
        );

        const status = String(
            body.status || ""
        )
            .trim()
            .toUpperCase();

        // Validate order ID
        if (
            !Number.isInteger(orderId) ||
            orderId <= 0
        ) {
            return Response.json(
                {
                    message:
                        "Invalid order ID.",
                },
                {
                    status: 400,
                }
            );
        }

        // Validate status
        if (
            !ADMIN_ORDER_STATUSES.some(
                (allowedStatus) => allowedStatus === status
            )
        ) {
            return Response.json(
                {
                    message:
                        "Invalid order status.",
                },
                {
                    status: 400,
                }
            );
        }

        // Check order exists
        const existingOrder =
            await prisma.order.findUnique({
                where: {
                    id: orderId,
                },
            });

        if (!existingOrder) {
            return Response.json(
                {
                    message:
                        "Order not found.",
                },
                {
                    status: 404,
                }
            );
        }

        // Update status
        const order =
            await prisma.order.update({
                where: {
                    id: orderId,
                },

                data: {
                    status,
                },
            });

        return Response.json(
            {
                success: true,

                message:
                    "Order status updated.",

                order,
            },
            {
                headers: {
                    "Cache-Control":
                        "no-store",
                },
            }
        );
    } catch (error) {
        console.error(
            "ADMIN UPDATE ORDER ERROR:",
            error
        );

        return Response.json(
            {
                message:
                    "Could not update order.",
            },
            {
                status: 500,
            }
        );
    }
}

// ==========================================
// DELETE ORDER
// ==========================================

export async function DELETE(
    request: Request
) {
    const authError = await checkAdmin(request);

    if (authError) return authError;

    try {
        const body =
            await request.json();

        const orderId = Number(
            body.orderId
        );

        if (
            !Number.isInteger(orderId) ||
            orderId <= 0
        ) {
            return Response.json(
                {
                    message:
                        "Invalid order ID.",
                },
                {
                    status: 400,
                }
            );
        }

        // Check order exists
        const existingOrder =
            await prisma.order.findUnique({
                where: {
                    id: orderId,
                },
            });

        if (!existingOrder) {
            return Response.json(
                {
                    message:
                        "Order not found.",
                },
                {
                    status: 404,
                }
            );
        }

        await prisma.$transaction(
            async (tx) => {
                // Delete order items first
                await tx.orderItem.deleteMany(
                    {
                        where: {
                            orderId,
                        },
                    }
                );

                // Delete order
                await tx.order.delete({
                    where: {
                        id: orderId,
                    },
                });
            }
        );

        return Response.json(
            {
                success: true,

                message:
                    "Order deleted successfully.",
            },
            {
                headers: {
                    "Cache-Control":
                        "no-store",
                },
            }
        );
    } catch (error) {
        console.error(
            "ADMIN DELETE ORDER ERROR:",
            error
        );

        return Response.json(
            {
                message:
                    "Could not delete order.",
            },
            {
                status: 500,
            }
        );
    }
}
