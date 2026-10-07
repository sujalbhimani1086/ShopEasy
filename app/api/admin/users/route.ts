import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    const errorResponse = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    try {
        const { searchParams } = new URL(request.url);
        const search = (searchParams.get("search") || "").trim();
        const role = searchParams.get("role") || "ALL";

        const where: Record<string, unknown> = {};

        if (role && role !== "ALL") {
            where.role = role;
        }

        if (search) {
            where.OR = [
                {
                    name: {
                        contains: search,
                    },
                },
                {
                    email: {
                        contains: search,
                    },
                },
            ];
        }

        const users = await prisma.user.findMany({
            where,
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
                cart: {
                    select: {
                        _count: {
                            select: {
                                items: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        const formatted = users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt.toISOString(),
            orderCount: u._count.orders,
            wishlistCount: u._count.wishlists,
            cartItemCount: u.cart?._count.items ?? 0,
        }));

        return Response.json(formatted);
    } catch (error) {
        console.error("GET ADMIN USERS ERROR:", error);

        return Response.json(
            { message: "Failed to fetch users" },
            { status: 500 }
        );
    }
}
