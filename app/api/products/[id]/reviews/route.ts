import { prisma } from "@/lib/prisma";
import { getUser, requireApprovedCustomer } from "@/lib/api-auth";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: Request,
    context: RouteContext
) {
    try {
        const { id } = await context.params;
        const productId = Number.parseInt(id, 10);

        if (Number.isNaN(productId) || productId <= 0) {
            return Response.json(
                { message: "Invalid product ID." },
                { status: 400 }
            );
        }

        const reviews = await prisma.review.findMany({
            where: { productId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Compute rating stats
        const totalReviews = reviews.length;
        const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let ratingSum = 0;

        for (const review of reviews) {
            const r = Math.min(5, Math.max(1, review.rating)) as 1 | 2 | 3 | 4 | 5;
            ratingBreakdown[r] = (ratingBreakdown[r] || 0) + 1;
            ratingSum += review.rating;
        }

        const averageRating = totalReviews > 0 ? Number((ratingSum / totalReviews).toFixed(1)) : 0;

        // Check verification for each reviewer
        const userIds = Array.from(new Set(reviews.map((r) => r.userId)));
        const verifiedOrders = await prisma.order.findMany({
            where: {
                userId: { in: userIds },
                status: {
                    in: ["DELIVERED", "COMPLETED", "CONFIRMED", "PACKED", "SHIPPED", "PENDING"],
                },
                items: {
                    some: { productId },
                },
            },
            select: { userId: true },
        });

        const verifiedUserSet = new Set(verifiedOrders.map((o) => o.userId));

        const formattedReviews = reviews.map((r) => ({
            id: r.id,
            userId: r.userId,
            userName: r.user.name || "Customer",
            productId: r.productId,
            rating: r.rating,
            comment: r.comment,
            isVerifiedBuyer: verifiedUserSet.has(r.userId),
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
        }));

        // Check current requesting user eligibility & existing review
        let isEligibleToReview = false;
        let userReview = null;

        const currentUser = await getUser(request);
        if (currentUser?.id) {
            const currentUserId = Number(currentUser.id);
            const userOrder = await prisma.order.findFirst({
                where: {
                    userId: currentUserId,
                    status: {
                        in: ["DELIVERED", "COMPLETED", "CONFIRMED", "PACKED", "SHIPPED"],
                    },
                    items: {
                        some: { productId },
                    },
                },
                select: { id: true },
            });

            isEligibleToReview = Boolean(userOrder);

            const existing = formattedReviews.find((r) => r.userId === currentUserId);
            if (existing) {
                userReview = existing;
            }
        }

        return Response.json({
            reviews: formattedReviews,
            stats: {
                averageRating,
                totalReviews,
                ratingBreakdown,
                isEligibleToReview,
                userReview,
            },
        });
    } catch (error) {
        console.error("GET PRODUCT REVIEWS ERROR:", error);
        return Response.json(
            { message: "Could not fetch reviews." },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    context: RouteContext
) {
    const auth = await requireApprovedCustomer(request);
    if (auth.response) return auth.response;
    const user = auth.user;

    try {
        const { id } = await context.params;
        const productId = Number.parseInt(id, 10);

        if (Number.isNaN(productId) || productId <= 0) {
            return Response.json(
                { message: "Invalid product ID." },
                { status: 400 }
            );
        }

        const body = await request.json();
        const rating = Number.parseInt(body.rating, 10);
        const comment = (body.comment || "").trim();

        if (Number.isNaN(rating) || rating < 1 || rating > 5) {
            return Response.json(
                { message: "Please provide a valid rating between 1 and 5 stars." },
                { status: 400 }
            );
        }

        if (!comment || comment.length < 3) {
            return Response.json(
                { message: "Review comment must be at least 3 characters long." },
                { status: 400 }
            );
        }

        if (comment.length > 1000) {
            return Response.json(
                { message: "Review comment cannot exceed 1000 characters." },
                { status: 400 }
            );
        }

        // Verify product exists
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { id: true, name: true },
        });

        if (!product) {
            return Response.json(
                { message: "Product not found." },
                { status: 404 }
            );
        }

        // VERIFIED BUYER RULE: Customer must have purchased this product
        const purchaseRecord = await prisma.order.findFirst({
            where: {
                userId: Number(user.id),
                status: {
                    in: ["DELIVERED", "COMPLETED", "CONFIRMED", "PACKED", "SHIPPED"],
                },
                items: {
                    some: { productId },
                },
            },
            select: { id: true },
        });

        if (!purchaseRecord && user.role !== "ADMIN") {
            return Response.json(
                {
                    message:
                        "Only verified buyers who have purchased and received this product can submit a review.",
                },
                { status: 403 }
            );
        }

        // Check if customer already reviewed this product
        const existingReview = await prisma.review.findUnique({
            where: {
                userId_productId: {
                    userId: Number(user.id),
                    productId,
                },
            },
        });

        if (existingReview) {
            return Response.json(
                {
                    message:
                        "You have already reviewed this product. You can edit your existing review instead.",
                },
                { status: 409 }
            );
        }

        const review = await prisma.review.create({
            data: {
                userId: Number(user.id),
                productId,
                rating,
                comment,
            },
            include: {
                user: {
                    select: { name: true },
                },
            },
        });

        return Response.json(
            {
                success: true,
                message: "Review submitted successfully.",
                review: {
                    id: review.id,
                    userId: review.userId,
                    userName: review.user.name,
                    productId: review.productId,
                    rating: review.rating,
                    comment: review.comment,
                    isVerifiedBuyer: true,
                    createdAt: review.createdAt.toISOString(),
                    updatedAt: review.updatedAt.toISOString(),
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("POST PRODUCT REVIEW ERROR:", error);
        return Response.json(
            { message: "Could not submit review." },
            { status: 500 }
        );
    }
}
