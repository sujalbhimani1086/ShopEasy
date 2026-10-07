import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(request: Request) {
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    try {
        const { searchParams } = new URL(request.url);
        const search = (searchParams.get("search") || "").trim();
        const ratingFilter = searchParams.get("rating");
        const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
        const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("limit") || "10", 10) || 10));
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};

        if (ratingFilter && ratingFilter !== "ALL") {
            const parsedRating = Number.parseInt(ratingFilter, 10);
            if (!Number.isNaN(parsedRating) && parsedRating >= 1 && parsedRating <= 5) {
                where.rating = parsedRating;
            }
        }

        if (search) {
            where.OR = [
                { comment: { contains: search } },
                { user: { name: { contains: search } } },
                { user: { email: { contains: search } } },
                { product: { name: { contains: search } } },
            ];
        }

        const [total, reviews] = await Promise.all([
            prisma.review.count({ where }),
            prisma.review.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    product: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
        ]);

        // Check verified buyer status for each
        const verifiedOrders = await prisma.order.findMany({
            where: {
                userId: { in: reviews.map((r) => r.userId) },
                status: {
                    in: ["DELIVERED", "COMPLETED", "CONFIRMED", "PACKED", "SHIPPED", "PENDING"],
                },
                items: {
                    some: {
                        productId: { in: reviews.map((r) => r.productId) },
                    },
                },
            },
            select: {
                userId: true,
                items: { select: { productId: true } },
            },
        });

        const verifiedSet = new Set(
            verifiedOrders.flatMap((o) =>
                o.items.map((it) => `${o.userId}-${it.productId}`)
            )
        );

        const formatted = reviews.map((r) => ({
            id: r.id,
            userId: r.userId,
            userName: r.user.name || "Customer",
            userEmail: r.user.email,
            productId: r.productId,
            productName: r.product.name,
            productImage: r.product.image,
            rating: r.rating,
            comment: r.comment,
            isVerifiedBuyer: verifiedSet.has(`${r.userId}-${r.productId}`),
            createdAt: r.createdAt.toISOString(),
        }));

        return Response.json({
            reviews: formatted,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("ADMIN GET REVIEWS ERROR:", error);
        return Response.json(
            { message: "Could not fetch reviews." },
            { status: 500 }
        );
    }
}
