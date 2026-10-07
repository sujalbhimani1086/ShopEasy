import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/registrations
 * Returns customer registration requests with optional status filtering and search.
 * Only accessible by ADMIN users.
 * Never exposes passwords or password hashes.
 */
export async function GET(request: Request) {
    const errorResponse = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    try {
        const { searchParams } = new URL(request.url);
        const search = (searchParams.get("search") || "").trim();
        const statusParam = (searchParams.get("status") || "ALL").trim().toUpperCase();

        const where: Record<string, unknown> = {
            role: "CUSTOMER",
        };

        if (statusParam && statusParam !== "ALL") {
            where.status = statusParam;
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

        const [rawRegistrations, pendingCount] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    status: true,
                    createdAt: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
            }),
            prisma.user.count({
                where: {
                    role: "CUSTOMER",
                    status: "PENDING",
                },
            }),
        ]);

        // Prioritize PENDING requests at the top, then by createdAt desc
        const statusPriority: Record<string, number> = {
            PENDING: 1,
            APPROVED: 2,
            DECLINED: 3,
        };

        const registrations = [...rawRegistrations].sort((a, b) => {
            const priorityA = statusPriority[a.status] || 99;
            const priorityB = statusPriority[b.status] || 99;
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return Response.json({
            registrations,
            pendingCount,
            total: registrations.length,
        });
    } catch (error) {
        console.error("ADMIN GET REGISTRATIONS ERROR:", error);
        return Response.json(
            { message: "Failed to fetch registration requests." },
            { status: 500 }
        );
    }
}
