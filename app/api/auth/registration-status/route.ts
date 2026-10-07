import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/api-auth";

/**
 * GET /api/auth/registration-status?email=...
 * Safely checks the registration/approval status of a user.
 * Supports both query-by-email (for unauthenticated users on the pending page)
 * and session-based check (if a token cookie exists).
 * Never exposes sensitive details (passwords, hashes, JWTs).
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        let email = (searchParams.get("email") || "").trim().toLowerCase();

        // If no email query param, check if caller has an auth token
        if (!email) {
            const session = await getUser(request);
            if (session?.email && typeof session.email === "string") {
                email = session.email.toLowerCase().trim();
            }
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return Response.json(
                { message: "A valid email parameter is required to check registration status." },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
            },
        });

        if (!user) {
            return Response.json(
                { message: "No registration request found for this email address." },
                { status: 404 }
            );
        }

        return Response.json({
            success: true,
            status: user.status,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
        });
    } catch (error) {
        console.error("REGISTRATION STATUS CHECK ERROR:", error);
        return Response.json(
            { message: "Could not retrieve registration status." },
            { status: 500 }
        );
    }
}
