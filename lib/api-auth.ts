/**
 * Shared server-side authentication helpers for API routes.
 * Extracts the JWT token from cookies and verifies it.
 *
 * Provides centralized authentication and authorization guards
 * for both customer and admin endpoints.
 */

import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { JWTPayload } from "jose";

/**
 * Extracts and verifies the JWT token from the request cookies.
 * Returns the decoded user payload, or null if unauthenticated.
 */
export async function getUser(request: Request): Promise<JWTPayload | null> {
    const cookie = request.headers.get("cookie") ?? "";

    const token = cookie
        .split(";")
        .map((item) => item.trim())
        .find((item) => item.startsWith("token="))
        ?.slice("token=".length);

    if (!token) return null;

    return await verifyToken(token);
}

/**
 * Extracts and verifies the JWT token, returning the payload
 * only if the user has the ADMIN role.
 */
export async function getAdmin(request: Request): Promise<JWTPayload | null> {
    const user = await getUser(request);
    return user?.role === "ADMIN" ? user : null;
}

/**
 * Standard 401 Unauthorized JSON response.
 */
export function unauthorizedResponse(message = "Login required") {
    return Response.json(
        { message },
        { status: 401 }
    );
}

/**
 * Standard 403 Forbidden JSON response for admin-only routes.
 */
export function forbiddenResponse(message = "Admin access required") {
    return Response.json(
        { message },
        { status: 403 }
    );
}

/**
 * Unified server-side admin guard.
 * Returns null if the request is from an authenticated admin.
 * Returns a 401 Response if unauthenticated, or a 403 Response if unauthorized.
 */
export async function requireAdmin(request: Request): Promise<Response | null> {
    const user = await getUser(request);

    if (!user?.id) {
        return unauthorizedResponse();
    }

    if (user.role !== "ADMIN") {
        return forbiddenResponse();
    }

    return null;
}

/**
 * Standard 403 Forbidden JSON response for pending approval accounts.
 */
export function pendingApprovalResponse(message = "Your registration is waiting for admin approval.") {
    return Response.json(
        { message, status: "PENDING" },
        { status: 403 }
    );
}

/**
 * Standard 403 Forbidden JSON response for declined accounts.
 */
export function declinedResponse(message = "Your registration request was declined.") {
    return Response.json(
        { message, status: "DECLINED" },
        { status: 403 }
    );
}

/**
 * Unified server-side customer authentication & approval guard.
 * Verifies authentication AND ensures the user account is APPROVED (or ADMIN).
 * Returns { user } if valid and active, or { response } error response (401 or 403).
 */
export async function requireApprovedCustomer(
    request: Request
): Promise<{ user: JWTPayload; response?: never } | { user?: never; response: Response }> {
    const user = await getUser(request);

    if (!user?.id) {
        return { response: unauthorizedResponse() };
    }

    if (user.role === "ADMIN") {
        return { user };
    }

    // Server-side database status verification to prevent stale status
    try {
        const dbUser = await prisma.user.findUnique({
            where: { id: Number(user.id) },
            select: { id: true, role: true, status: true },
        });

        if (!dbUser) {
            return { response: unauthorizedResponse("Account not found") };
        }

        if (dbUser.role === "ADMIN") {
            return { user };
        }

        if (dbUser.status === "PENDING") {
            return { response: pendingApprovalResponse() };
        }

        if (dbUser.status === "DECLINED") {
            return { response: declinedResponse() };
        }

        if (dbUser.status !== "APPROVED") {
            return {
                response: Response.json(
                    { message: "Account not approved", status: dbUser.status },
                    { status: 403 }
                ),
            };
        }

        return { user: { ...user, status: dbUser.status } };
    } catch (error) {
        console.error("AUTH GUARD ERROR:", error);
        return {
            response: Response.json(
                { message: "Internal server error during authorization" },
                { status: 500 }
            ),
        };
    }
}

/**
 * Unified server-side customer authentication guard.
 * Returns decoded JWTPayload if authenticated, or returns a 401 Response error.
 */
export async function requireAuth(
    request: Request
): Promise<{ user: JWTPayload; response?: never } | { user?: never; response: Response }> {
    return requireApprovedCustomer(request);
}
