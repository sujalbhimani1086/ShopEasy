import { prisma } from "@/lib/prisma";
import { requireApprovedCustomer } from "@/lib/api-auth";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function PUT(
    request: Request,
    context: RouteContext
) {
    const auth = await requireApprovedCustomer(request);
    if (auth.response) return auth.response;
    const user = auth.user;

    try {
        const { id } = await context.params;
        const reviewId = Number.parseInt(id, 10);

        if (Number.isNaN(reviewId) || reviewId <= 0) {
            return Response.json(
                { message: "Invalid review ID." },
                { status: 400 }
            );
        }

        const review = await prisma.review.findUnique({
            where: { id: reviewId },
        });

        if (!review) {
            return Response.json(
                { message: "Review not found." },
                { status: 404 }
            );
        }

        // Only owner or admin can edit
        if (review.userId !== Number(user.id) && user.role !== "ADMIN") {
            return Response.json(
                { message: "You are not authorized to edit this review." },
                { status: 403 }
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

        const updated = await prisma.review.update({
            where: { id: reviewId },
            data: {
                rating,
                comment,
            },
            include: {
                user: { select: { name: true } },
            },
        });

        return Response.json({
            success: true,
            message: "Review updated successfully.",
            review: {
                id: updated.id,
                userId: updated.userId,
                userName: updated.user.name,
                productId: updated.productId,
                rating: updated.rating,
                comment: updated.comment,
                isVerifiedBuyer: true,
                createdAt: updated.createdAt.toISOString(),
                updatedAt: updated.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        console.error("UPDATE REVIEW ERROR:", error);
        return Response.json(
            { message: "Could not update review." },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    context: RouteContext
) {
    const auth = await requireApprovedCustomer(request);
    if (auth.response) return auth.response;
    const user = auth.user;

    try {
        const { id } = await context.params;
        const reviewId = Number.parseInt(id, 10);

        if (Number.isNaN(reviewId) || reviewId <= 0) {
            return Response.json(
                { message: "Invalid review ID." },
                { status: 400 }
            );
        }

        const review = await prisma.review.findUnique({
            where: { id: reviewId },
        });

        if (!review) {
            return Response.json(
                { message: "Review not found." },
                { status: 404 }
            );
        }

        if (review.userId !== Number(user.id) && user.role !== "ADMIN") {
            return Response.json(
                { message: "You are not authorized to delete this review." },
                { status: 403 }
            );
        }

        await prisma.review.delete({
            where: { id: reviewId },
        });

        return Response.json({
            success: true,
            message: "Review deleted successfully.",
        });
    } catch (error) {
        console.error("DELETE REVIEW ERROR:", error);
        return Response.json(
            { message: "Could not delete review." },
            { status: 500 }
        );
    }
}
