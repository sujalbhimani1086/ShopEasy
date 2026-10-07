import { prisma } from "@/lib/prisma";
import { requireApprovedCustomer } from "@/lib/api-auth";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: Request,
    context: RouteContext
) {
    const auth = await requireApprovedCustomer(request);
    if (auth.response) return auth.response;
    const user = auth.user;

    try {
        const { id } = await context.params;
        const orderId = Number.parseInt(id, 10);

        if (Number.isNaN(orderId) || orderId <= 0) {
            return Response.json(
                { message: "Invalid order ID." },
                { status: 400 }
            );
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                price: true,
                                category: true,
                            },
                        },
                    },
                },
                coupon: {
                    select: {
                        id: true,
                        code: true,
                        discountType: true,
                        discountValue: true,
                        maxDiscount: true,
                    },
                },
            },
        });

        if (!order) {
            return Response.json(
                { message: "Order not found." },
                { status: 404 }
            );
        }

        // SECURITY CHECK: Customer can only access their own order. Admin can access any order.
        const userId = Number(user.id);
        const userEmail = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
        const isAdmin = user.role === "ADMIN";

        const isOwner =
            order.userId === userId ||
            (userEmail !== "" && order.email?.trim().toLowerCase() === userEmail);

        if (!isAdmin && !isOwner) {
            return Response.json(
                { message: "You are not authorized to view this order." },
                { status: 403 }
            );
        }

        const formattedOrder = {
            ...order,
            items: order.items.map((item) => ({
                ...item,
                product: item.product ?? {
                    id: item.productId ?? 0,
                    name: item.productName || "Archived Product",
                    image: item.productImage || "/images/placeholder.png",
                    price: item.price,
                },
            })),
        };

        return Response.json(
            { order: formattedOrder },
            {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                    Pragma: "no-cache",
                },
            }
        );
    } catch (error) {
        console.error("FETCH ORDER DETAIL ERROR:", error);
        return Response.json(
            { message: "Could not fetch order details." },
            { status: 500 }
        );
    }
}
