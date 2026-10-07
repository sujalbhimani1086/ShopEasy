import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function DELETE(
    request: Request,
    context: RouteContext
) {
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

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

        await prisma.review.delete({
            where: { id: reviewId },
        });

        return Response.json({
            success: true,
            message: "Review deleted successfully by administrator.",
        });
    } catch (error) {
        console.error("ADMIN DELETE REVIEW ERROR:", error);
        return Response.json(
            { message: "Could not delete review." },
            { status: 500 }
        );
    }
}
