import { getUser, requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const errorResponse = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    try {
        const { id } = await params;
        const userId = Number.parseInt(id, 10);

        if (!Number.isFinite(userId) || userId <= 0) {
            return Response.json(
                { message: "Invalid user ID" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
                _count: {
                    select: {
                        orders: true,
                        wishlists: true,
                    },
                },
                orders: {
                    select: {
                        id: true,
                        total: true,
                        status: true,
                        createdAt: true,
                        _count: {
                            select: {
                                items: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 10,
                },
                wishlists: {
                    select: {
                        id: true,
                        product: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                image: true,
                                category: true,
                            },
                        },
                    },
                    take: 10,
                },
                cart: {
                    select: {
                        _count: {
                            select: {
                                items: true,
                            },
                        },
                        items: {
                            select: {
                                id: true,
                                quantity: true,
                                product: {
                                    select: {
                                        id: true,
                                        name: true,
                                        price: true,
                                        image: true,
                                    },
                                },
                            },
                            take: 10,
                        },
                    },
                },
            },
        });

        if (!user) {
            return Response.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        const formatted = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt.toISOString(),
            orderCount: user._count.orders,
            wishlistCount: user._count.wishlists,
            cartItemCount: user.cart?._count.items ?? 0,
            orders: user.orders.map((o) => ({
                id: o.id,
                total: o.total,
                status: o.status,
                createdAt: o.createdAt.toISOString(),
                itemCount: o._count.items,
            })),
            wishlists: user.wishlists.map((w) => ({
                id: w.id,
                product: w.product,
            })),
            cartItems: user.cart?.items.map((i) => ({
                id: i.id,
                quantity: i.quantity,
                product: i.product,
            })) ?? [],
        };

        return Response.json(formatted);
    } catch (error) {
        console.error("GET ADMIN USER BY ID ERROR:", error);
        return Response.json(
            { message: "Failed to fetch user details" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const errorResponse = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    try {
        const loggedInAdmin = await getUser(request);
        const { id } = await params;
        const userId = Number.parseInt(id, 10);

        if (!Number.isFinite(userId) || userId <= 0) {
            return Response.json(
                { message: "Invalid user ID" },
                { status: 400 }
            );
        }

        const body = await request.json();
        const role = typeof body.role === "string" ? body.role.trim().toUpperCase() : "";

        if (role !== "CUSTOMER" && role !== "ADMIN") {
            return Response.json(
                { message: "Role must be CUSTOMER or ADMIN" },
                { status: 400 }
            );
        }

        // Prevent admin from removing their own admin access
        if (Number(loggedInAdmin?.id) === userId && role !== "ADMIN") {
            return Response.json(
                { message: "You cannot revoke your own admin privileges." },
                { status: 400 }
            );
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: { role },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });

        return Response.json({
            success: true,
            message: "User role updated successfully.",
            user: {
                ...updated,
                createdAt: updated.createdAt.toISOString(),
            },
        });
    } catch (error) {
        console.error("UPDATE USER ROLE ERROR:", error);
        return Response.json(
            { message: "Failed to update user role" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const errorResponse = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    try {
        const loggedInAdmin = await getUser(request);
        const { id } = await params;
        const userId = Number.parseInt(id, 10);

        if (!Number.isFinite(userId) || userId <= 0) {
            return Response.json(
                { message: "Invalid user ID" },
                { status: 400 }
            );
        }

        // Prevent admin from deleting their own account
        if (Number(loggedInAdmin?.id) === userId) {
            return Response.json(
                { message: "You cannot delete your own admin account." },
                { status: 400 }
            );
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true },
        });

        if (!targetUser) {
            return Response.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        // Prevent deleting the last admin
        if (targetUser.role === "ADMIN") {
            const adminCount = await prisma.user.count({
                where: { role: "ADMIN" },
            });
            if (adminCount <= 1) {
                return Response.json(
                    { message: "Cannot delete the only remaining admin account." },
                    { status: 400 }
                );
            }
        }

        // Clean cascade deletion in transaction
        await prisma.$transaction(async (tx) => {
            // 1. Delete user's wishlists
            await tx.wishlist.deleteMany({
                where: { userId },
            });

            // 2. Delete user's cart items and cart
            const cart = await tx.cart.findUnique({
                where: { userId },
            });
            if (cart) {
                await tx.cartItem.deleteMany({
                    where: { cartId: cart.id },
                });
                await tx.cart.delete({
                    where: { id: cart.id },
                });
            }

            // 3. Delete user's order items and orders
            const orders = await tx.order.findMany({
                where: { userId },
                select: { id: true },
            });
            const orderIds = orders.map((o) => o.id);
            if (orderIds.length > 0) {
                await tx.orderItem.deleteMany({
                    where: { orderId: { in: orderIds } },
                });
                await tx.order.deleteMany({
                    where: { id: { in: orderIds } },
                });
            }

            // 4. Delete the user
            await tx.user.delete({
                where: { id: userId },
            });
        });

        return Response.json({
            success: true,
            message: "User and associated records deleted successfully.",
        });
    } catch (error) {
        console.error("DELETE USER ERROR:", error);
        return Response.json(
            { message: "Failed to delete user" },
            { status: 500 }
        );
    }
}
