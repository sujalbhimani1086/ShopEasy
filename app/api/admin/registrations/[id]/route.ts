import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
    params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/registrations/[id]
 * Approves or declines a customer registration request.
 * Expected JSON payload: { "status": "APPROVED" | "DECLINED" }
 */
export async function PATCH(request: Request, { params }: RouteContext) {
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

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return Response.json(
                { message: "Invalid JSON body" },
                { status: 400 }
            );
        }

        if (typeof body !== "object" || body === null || Array.isArray(body)) {
            return Response.json(
                { message: "Request body must be an object" },
                { status: 400 }
            );
        }

        const input = body as Record<string, unknown>;
        const requestedStatus = typeof input.status === "string" ? input.status.trim().toUpperCase() : "";

        if (requestedStatus !== "APPROVED" && requestedStatus !== "DECLINED") {
            return Response.json(
                { message: "Status must be either APPROVED or DECLINED." },
                { status: 400 }
            );
        }

        // Verify user exists and is a CUSTOMER
        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
            },
        });

        if (!existingUser) {
            return Response.json(
                { message: "User registration not found." },
                { status: 404 }
            );
        }

        if (existingUser.role !== "CUSTOMER") {
            return Response.json(
                { message: "Only customer registration statuses can be managed." },
                { status: 400 }
            );
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                status: requestedStatus,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
            },
        });

        const feedbackMessage =
            requestedStatus === "APPROVED"
                ? "Customer registration approved."
                : "Customer registration declined.";

        return Response.json({
            success: true,
            message: feedbackMessage,
            user: updatedUser,
        });
    } catch (error) {
        console.error("ADMIN UPDATE REGISTRATION ERROR:", error);
        return Response.json(
            { message: "Failed to update registration status." },
            { status: 500 }
        );
    }
}

/**
 * PUT alias for PATCH
 */
export async function PUT(request: Request, context: RouteContext) {
    return PATCH(request, context);
}
