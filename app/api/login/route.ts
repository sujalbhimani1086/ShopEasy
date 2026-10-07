import { prisma } from "@/lib/prisma";
import { createToken, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
    if (
        !request.headers
            .get("content-type")
            ?.toLowerCase()
            .includes("application/json")
    ) {
        return Response.json(
            { message: "Use application/json" },
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

    if (
        typeof body !== "object" ||
        body === null ||
        Array.isArray(body)
    ) {
        return Response.json(
            { message: "JSON body must be an object" },
            { status: 400 }
        );
    }

    const input = body as Record<string, unknown>;

    const email =
        typeof input.email === "string"
            ? input.email.trim().toLowerCase()
            : "";

    const password =
        typeof input.password === "string"
            ? input.password
            : "";

    if (!email || !password) {
        return Response.json(
            { message: "Email and password are required" },
            { status: 400 }
        );
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        const isPasswordValid =
            user && (await verifyPassword(password, user.password));

        if (!user || !isPasswordValid) {
            return Response.json(
                { message: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Account status verification for non-admin accounts
        if (user.role !== "ADMIN") {
            if (user.status === "PENDING") {
                return Response.json(
                    {
                        message: "Your registration is waiting for admin approval.",
                        status: "PENDING",
                        email: user.email,
                    },
                    { status: 403 }
                );
            }

            if (user.status === "DECLINED") {
                return Response.json(
                    {
                        message: "Your registration request was declined.",
                        status: "DECLINED",
                        email: user.email,
                    },
                    { status: 403 }
                );
            }

            if (user.status !== "APPROVED") {
                return Response.json(
                    {
                        message: "Your account is not approved to sign in.",
                        status: user.status,
                        email: user.email,
                    },
                    { status: 403 }
                );
            }
        }

        const token = await createToken({
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
        });

        const response = Response.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
            },
        });

        response.headers.set(
            "Set-Cookie",
            `token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${
                process.env.NODE_ENV === "production"
                    ? "; Secure"
                    : ""
            }`
        );

        return response;
    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return Response.json(
            { message: "Login failed" },
            { status: 500 }
        );
    }
}